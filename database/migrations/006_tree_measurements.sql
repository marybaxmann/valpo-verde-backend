-- =====================================================================
-- VALPO VERDE — migrations/006_tree_measurements.sql
--
-- Sexta migración: implementa el desacoplamiento físico del modelo
-- ARBOLES 1:N MEDICIONES_DENDROMETRICAS (INV-1A / CC-020 / ADR-016 v1.0).
--
-- Reglas de referencia (todas vigentes):
--   PR-006 v7.0, PR-003 v5.0, PR-004 v4.0, PR-005 v3.0 (docs/project-rules.md)
--   ADR-016 v1.0, ADR-010 v2.0, ADR-012, ADR-014 (docs/architecture-decisions.md)
--   DICCIONARIO_CAMPOS (filas MEDICIONES_DENDROMETRICAS)
--
-- DECISIONES CERRADAS EN INV-1A:
--   1. Migración legacy (Alternativa A): Cero backfill automático desde
--      columnas dimensionales de trees. tree_measurements nace limpia.
--      Las columnas dimensionales de trees se deprecian para nuevas escrituras.
--   2. Empate de fecha_medicion: NO se crea UNIQUE(tree_id, fecha_medicion).
--      Se permite almacenar múltiples mediciones el mismo día. La ambigüedad
--      en la fecha máxima se detecta y reporta en lectura en backend.
--   3. Corrección y anulación: Permisos pendientes de gobernanza. RLS deniega
--      por defecto UPDATE y DELETE a usuarios autenticados.
--   4. Atomicidad del alta: Función RPC fn_create_tree_with_measurement
--      ejecuta árbol + medición inicial en una sola transacción PostgreSQL.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- SECCIÓN 1 — TABLA tree_measurements
-- ---------------------------------------------------------------------

CREATE TABLE public.tree_measurements (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id                 UUID NOT NULL REFERENCES public.trees(id) ON DELETE RESTRICT,

  -- Fecha en terreno de la medición
  fecha_medicion          DATE NOT NULL,

  -- Configuración de fustes y dimensiones primarias
  -- Dominio funcional PENDIENTE (CC-020): se mantiene TEXT sin ENUM estático
  configuracion_fustes    TEXT NOT NULL,
  numero_fustes           INTEGER CHECK (numero_fustes IS NULL OR numero_fustes >= 2),
  dap_fustes_cm           NUMERIC(6,2)[] CHECK (
                            dap_fustes_cm IS NULL OR (
                              array_length(dap_fustes_cm, 1) >= 2
                              AND (numero_fustes IS NULL OR array_length(dap_fustes_cm, 1) = numero_fustes)
                            )
                          ),
  dap_cm                  NUMERIC(6,2) CHECK (dap_cm IS NULL OR dap_cm > 0),

  -- Dimensiones métricas obligatorias en la medición inicial (CC-020 / DICCIONARIO_CAMPOS)
  altura_total_m          NUMERIC(6,2) NOT NULL CHECK (altura_total_m >= 0),
  diametro_copa_m         NUMERIC(6,2) NOT NULL CHECK (diametro_copa_m >= 0),
  altura_primera_rama_m   NUMERIC(6,2) NOT NULL CHECK (altura_primera_rama_m >= 0),

  -- Estimación opcional
  clase_edad              TEXT,

  -- Control de validez y anulación lógica (H-3 / ADR-016)
  estado_medicion         TEXT NOT NULL DEFAULT 'valida'
                            CHECK (estado_medicion IN ('valida', 'anulada')),
  motivo_anulacion        TEXT,
  anulado_por             UUID REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  fecha_anulacion         TIMESTAMPTZ,

  -- Trazabilidad administrativa de registro
  created_by              UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Coherencia física: primera rama no puede superar la altura total
  CONSTRAINT chk_tree_measurements_altura_rama
    CHECK (altura_primera_rama_m <= altura_total_m),

  -- Coherencia de anulación lógica
  CONSTRAINT chk_tree_measurements_anulacion
    CHECK (
      (estado_medicion = 'valida' AND motivo_anulacion IS NULL AND anulado_por IS NULL AND fecha_anulacion IS NULL)
      OR
      (estado_medicion = 'anulada' AND motivo_anulacion IS NOT NULL AND anulado_por IS NOT NULL AND fecha_anulacion IS NOT NULL)
    )
);

CREATE TRIGGER trg_tree_measurements_updated_at
  BEFORE UPDATE ON public.tree_measurements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- SECCIÓN 2 — ÍNDICES
-- ---------------------------------------------------------------------

-- Acceso rápido por árbol para historial y FK lookups
CREATE INDEX idx_tree_measurements_tree_id
  ON public.tree_measurements (tree_id);

-- Índice parcial para resolución eficiente de mediciones válidas y fecha máxima
CREATE INDEX idx_tree_measurements_tree_fecha
  ON public.tree_measurements (tree_id, fecha_medicion DESC)
  WHERE (estado_medicion = 'valida');


-- ---------------------------------------------------------------------
-- SECCIÓN 3 — FUNCIÓN RPC TRANSACCIONAL (ALTA ATÓMICA ÁRBOL + MEDICIÓN)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_create_tree_with_measurement(
  p_project_id uuid,
  p_species_id uuid,
  p_public_space_id uuid,
  p_direccion text,
  p_comuna text,
  p_lugar_referencia text,
  p_lon double precision,
  p_lat double precision,
  p_medicion jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tree_id uuid;
  v_tree_code text;
  v_measurement_id uuid;
  v_fustes_array numeric[];
  v_created_at timestamptz := now();
  v_auth_uid uuid := auth.uid();
BEGIN
  -- 1. Insertar el Árbol con ubicación canónica WGS84
  INSERT INTO public.trees (
    project_id,
    species_id,
    public_space_id,
    direccion,
    comuna,
    lugar_referencia,
    ubicacion,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    p_project_id,
    p_species_id,
    p_public_space_id,
    p_direccion,
    p_comuna,
    p_lugar_referencia,
    ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
    v_auth_uid,
    v_created_at,
    v_created_at
  )
  RETURNING id, tree_code INTO v_tree_id, v_tree_code;

  -- 2. Procesar diámetros por fuste si existen
  IF p_medicion ? 'dap_fustes_cm' AND jsonb_typeof(p_medicion->'dap_fustes_cm') = 'array' THEN
    SELECT ARRAY(SELECT jsonb_array_elements_text(p_medicion->'dap_fustes_cm')::numeric)
    INTO v_fustes_array;
  ELSE
    v_fustes_array := NULL;
  END IF;

  -- 3. Insertar la Medición Inicial en tree_measurements
  INSERT INTO public.tree_measurements (
    tree_id,
    fecha_medicion,
    configuracion_fustes,
    numero_fustes,
    dap_fustes_cm,
    dap_cm,
    altura_total_m,
    diametro_copa_m,
    altura_primera_rama_m,
    clase_edad,
    estado_medicion,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    v_tree_id,
    (p_medicion->>'fecha_medicion')::date,
    p_medicion->>'configuracion_fustes',
    (p_medicion->>'numero_fustes')::integer,
    v_fustes_array,
    (p_medicion->>'dap_cm')::numeric,
    (p_medicion->>'altura_total_m')::numeric,
    (p_medicion->>'diametro_copa_m')::numeric,
    (p_medicion->>'altura_primera_rama_m')::numeric,
    p_medicion->>'clase_edad',
    'valida',
    v_auth_uid,
    v_created_at,
    v_created_at
  )
  RETURNING id INTO v_measurement_id;

  RETURN jsonb_build_object(
    'tree_id', v_tree_id,
    'tree_code', v_tree_code,
    'measurement_id', v_measurement_id
  );
END;
$$;

ALTER FUNCTION public.fn_create_tree_with_measurement(uuid, uuid, uuid, text, text, text, double precision, double precision, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_create_tree_with_measurement(uuid, uuid, uuid, text, text, text, double precision, double precision, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_tree_with_measurement(uuid, uuid, uuid, text, text, text, double precision, double precision, jsonb) TO authenticated;


-- ---------------------------------------------------------------------
-- SECCIÓN 4 — ROW LEVEL SECURITY (ADR-014)
-- ---------------------------------------------------------------------

ALTER TABLE public.tree_measurements ENABLE ROW LEVEL SECURITY;

-- 1. Admin: acceso total
CREATE POLICY tree_measurements_all_admin
  ON public.tree_measurements FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. Usuario municipal: lectura de mediciones en proyectos asignados
CREATE POLICY tree_measurements_select_municipal
  ON public.tree_measurements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trees t
      WHERE t.id = tree_measurements.tree_id
        AND public.is_municipal_member(t.project_id)
    )
  );

-- 3. Usuario municipal: inserción de mediciones en proyectos asignados
CREATE POLICY tree_measurements_insert_municipal
  ON public.tree_measurements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trees t
      WHERE t.id = tree_measurements.tree_id
        AND public.is_municipal_member(t.project_id)
    )
  );

-- NOTA: Políticas de UPDATE y DELETE no se crean. Quedan denegadas por omisión
-- en cumplimiento de la decisión de mantener permisos de anulación/corrección PENDIENTES.


-- ---------------------------------------------------------------------
-- SECCIÓN 5 — VERIFICACIÓN POSTERIOR DEFENSIVA
-- ---------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'tree_measurements'
  ) THEN
    RAISE EXCEPTION 'Migración 006 abortada: tabla tree_measurements no existe.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'fn_create_tree_with_measurement'
  ) THEN
    RAISE EXCEPTION 'Migración 006 abortada: función fn_create_tree_with_measurement no existe.';
  END IF;
END $$;

COMMIT;
