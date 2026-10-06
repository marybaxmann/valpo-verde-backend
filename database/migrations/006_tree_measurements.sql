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
-- DECISIONES CERRADAS EN INV-1A Y CORRECCIONES AUDITORÍA INV-1B:
--   1. Migración legacy (Alternativa A): Cero backfill automático desde
--      columnas dimensionales de trees. tree_measurements nace limpia.
--      Las columnas dimensionales de trees se deprecian para nuevas escrituras.
--   2. Empate de fecha_medicion: NO se crea UNIQUE(tree_id, fecha_medicion).
--      Se permite almacenar múltiples mediciones el mismo día. La ambigüedad
--      en la fecha máxima se detecta y reporta en lectura en backend.
--   3. Bloqueo de UPDATE y DELETE: Ni admin ni usuario_municipal tienen
--      permisos de UPDATE o DELETE sobre tree_measurements. Cero borrado o
--      modificación física de mediciones.
--   4. Bloqueo de INSERT directo / Mediciones posteriores diferidas:
--      tree_measurements NO tiene policy de INSERT para authenticated.
--      La inserción de la medición inicial está autorizada EXCLUSIVAMENTE
--      a través de la función RPC transaccional fn_create_tree_with_measurement
--      (SECURITY DEFINER con verificación estricta de auth.uid() y membresía).
--      No existe bypass para crear mediciones posteriores directamente.
--   5. Restricciones de diámetros: dap_cm > 0 si existe; cada elemento de
--      dap_fustes_cm > 0 si existe; numero_fustes >= 2 exige dap_fustes_cm.
--      No se fuerza XOR ni se calculan DAPs equivalentes (pendiente metodológico).
--   6. Dominio clase_edad: Joven / Semimaduro / Tempranamente maduro / Maduro / Sobremaduro.
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
  numero_fustes           INTEGER,
  dap_fustes_cm           NUMERIC(6,2)[],
  dap_cm                  NUMERIC(6,2),

  -- Dimensiones métricas obligatorias en la medición inicial (CC-020 / DICCIONARIO_CAMPOS)
  altura_total_m          NUMERIC(6,2) NOT NULL CHECK (altura_total_m >= 0),
  diametro_copa_m         NUMERIC(6,2) NOT NULL CHECK (diametro_copa_m >= 0),
  altura_primera_rama_m   NUMERIC(6,2) NOT NULL CHECK (altura_primera_rama_m >= 0),

  -- Estimación opcional (DICCIONARIO_CAMPOS fila 26)
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

  -- Restricción estricta de dap_cm (cuando exista debe ser estrictamente positivo)
  CONSTRAINT chk_tree_measurements_dap_cm
    CHECK (dap_cm IS NULL OR dap_cm > 0),

  -- Restricciones de fustes y diámetros individuales
  CONSTRAINT chk_tree_measurements_fustes
    CHECK (
      (numero_fustes IS NULL OR (numero_fustes >= 2 AND dap_fustes_cm IS NOT NULL))
      AND
      (dap_fustes_cm IS NULL OR (
        array_length(dap_fustes_cm, 1) >= 2
        AND array_position(dap_fustes_cm, NULL) IS NULL
        AND NOT (0 >= ANY(dap_fustes_cm))
        AND (numero_fustes IS NULL OR array_length(dap_fustes_cm, 1) = numero_fustes)
      ))
    ),

  -- Dominio aprobado clase_edad (DICCIONARIO_CAMPOS)
  CONSTRAINT chk_tree_measurements_clase_edad
    CHECK (clase_edad IS NULL OR clase_edad IN (
      'Joven',
      'Semimaduro',
      'Tempranamente maduro',
      'Maduro',
      'Sobremaduro'
    )),

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
-- SECCIÓN 3 — FUNCIÓN RPC TRANSACCIONAL (ALTA ATÓMICA ÁRBOL + MEDICIÓN INICIAL)
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
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_uid uuid := auth.uid();
  v_tree_id uuid;
  v_tree_code text;
  v_measurement_id uuid;
  v_fustes_array numeric[];
  v_created_at timestamptz := now();
  v_fecha_medicion date;
BEGIN
  -- 1. Validar autenticación
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- 2. Validar que el usuario tenga perfil activo
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = v_auth_uid AND activo = true
  ) THEN
    RAISE EXCEPTION 'Usuario inactivo o sin perfil válido';
  END IF;

  -- 3. Validar autorización sobre el proyecto (admin transversal o miembro municipal)
  IF NOT (public.is_admin() OR public.is_municipal_member(p_project_id)) THEN
    RAISE EXCEPTION 'No tiene acceso a este proyecto';
  END IF;

  -- 4. Validar existencia del proyecto (PR-005: la spec vigente no prohíbe alta en proyecto cerrado aún)
  IF NOT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id
  ) THEN
    RAISE EXCEPTION 'Proyecto no encontrado';
  END IF;

  -- 5. Validar existencia de la especie
  IF NOT EXISTS (
    SELECT 1 FROM public.species
    WHERE id = p_species_id
  ) THEN
    RAISE EXCEPTION 'Especie no encontrada';
  END IF;

  -- 6. Validar espacio público si fue provisto
  IF p_public_space_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.public_spaces
    WHERE id = p_public_space_id AND project_id = p_project_id
  ) THEN
    RAISE EXCEPTION 'Espacio público no encontrado en el proyecto';
  END IF;

  -- 7. Validar fecha_medicion (no nula y no futura)
  IF NOT (p_medicion ? 'fecha_medicion') OR p_medicion->>'fecha_medicion' IS NULL THEN
    RAISE EXCEPTION 'fecha_medicion es obligatoria';
  END IF;

  BEGIN
    v_fecha_medicion := (p_medicion->>'fecha_medicion')::date;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Formato de fecha_medicion inválido';
  END;

  IF v_fecha_medicion > CURRENT_DATE THEN
    RAISE EXCEPTION 'fecha_medicion no puede ser una fecha futura';
  END IF;

  -- 8. Validar configuracion_fustes obligatoria
  IF NOT (p_medicion ? 'configuracion_fustes') OR TRIM(p_medicion->>'configuracion_fustes') = '' THEN
    RAISE EXCEPTION 'configuracion_fustes es obligatoria';
  END IF;

  -- 8b. H-1: Validar obligatoriedad de diámetro en medición inicial (dap_cm o dap_fustes_cm)
  IF (NOT (p_medicion ? 'dap_cm') OR p_medicion->>'dap_cm' IS NULL)
     AND (NOT (p_medicion ? 'dap_fustes_cm') OR p_medicion->>'dap_fustes_cm' IS NULL OR jsonb_array_length(p_medicion->'dap_fustes_cm') = 0) THEN
    RAISE EXCEPTION 'La medición inicial requiere al menos un diámetro registrado (dap_cm o dap_fustes_cm)';
  END IF;

  -- 9. Insertar el Árbol con ubicación canónica WGS84
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

  -- 10. Procesar array de fustes
  IF p_medicion ? 'dap_fustes_cm' AND jsonb_typeof(p_medicion->'dap_fustes_cm') = 'array' THEN
    SELECT ARRAY(SELECT jsonb_array_elements_text(p_medicion->'dap_fustes_cm')::numeric)
    INTO v_fustes_array;
  ELSE
    v_fustes_array := NULL;
  END IF;

  -- 11. Insertar la Medición Inicial en tree_measurements
  -- created_by forzado a auth.uid(), estado_medicion forzado a 'valida'
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
    motivo_anulacion,
    anulado_por,
    fecha_anulacion,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    v_tree_id,
    v_fecha_medicion,
    p_medicion->>'configuracion_fustes',
    (p_medicion->>'numero_fustes')::integer,
    v_fustes_array,
    (p_medicion->>'dap_cm')::numeric,
    (p_medicion->>'altura_total_m')::numeric,
    (p_medicion->>'diametro_copa_m')::numeric,
    (p_medicion->>'altura_primera_rama_m')::numeric,
    p_medicion->>'clase_edad',
    'valida',
    NULL,
    NULL,
    NULL,
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
-- SECCIÓN 4 — ROW LEVEL SECURITY (ADR-014 / INV-1A / INV-1B)
-- ---------------------------------------------------------------------

ALTER TABLE public.tree_measurements ENABLE ROW LEVEL SECURITY;

-- 1. Admin: SOLO lectura de mediciones
CREATE POLICY tree_measurements_select_admin
  ON public.tree_measurements FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 2. Usuario municipal: SOLO lectura de mediciones en proyectos asignados
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

-- NOTA CRÍTICA DE SEGURIDAD (CORRECCIÓN AUDITORÍA INV-1B):
-- - NO existen policies de UPDATE ni DELETE: denegados por omisión para todos los usuarios.
--   Cero modificación ni borrado físico de mediciones existentes.
-- - NO existe policy de INSERT para authenticated: la inserción directa vía PostgREST queda
--   completamente bloqueada. La ÚNICA vía autorizada de inserción en tree_measurements es la
--   función transaccional fn_create_tree_with_measurement, que opera exclusivamente al momento
--   del alta del árbol. No es posible crear mediciones posteriores por omisión o bypass.


-- ---------------------------------------------------------------------
-- SECCIÓN 5 — VERIFICACIÓN POSTERIOR DEFENSIVA
-- ---------------------------------------------------------------------

DO $$
DECLARE
  v_policy_count integer;
  v_invalid_policies integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'tree_measurements'
  ) THEN
    RAISE EXCEPTION 'Migración 006 abortada: tabla tree_measurements no existe.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'fn_create_tree_with_measurement' AND prosecdef = true
  ) THEN
    RAISE EXCEPTION 'Migración 006 abortada: función fn_create_tree_with_measurement SECURITY DEFINER no existe.';
  END IF;

  -- Verificar que solo existan exactamente 2 policies (ambas SELECT)
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'tree_measurements';

  IF v_policy_count <> 2 THEN
    RAISE EXCEPTION 'Migración 006 abortada: se esperaban exactamente 2 policies SELECT en tree_measurements, pero se encontraron %.', v_policy_count;
  END IF;

  -- Verificar que no haya policies de INSERT, UPDATE o DELETE
  SELECT COUNT(*) INTO v_invalid_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'tree_measurements'
    AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL');

  IF v_invalid_policies > 0 THEN
    RAISE EXCEPTION 'Migración 006 abortada: se detectaron policies prohibidas (INSERT/UPDATE/DELETE/ALL) en tree_measurements.';
  END IF;
END $$;

COMMIT;
