-- =====================================================================
-- VALPO VERDE — Gestión del Arbolado Urbano de Valparaíso
-- schema.sql — Estado consolidado del modelo de datos
--   (revisión 6 — posterior a la migración 011 (CC-022, Administrador solo
--   lectura); antes revisión 5, posterior a la migración 010: incluye 005–006 (RLS base,
--   tree_measurements + RPC de alta), 007 (evaluación de riesgo), 008
--   (infraestructura, mantención), 009 (códigos OT/INC) y 010 (RLS en
--   tablas expuestas). Sincronizado el 2026-10-09.)
--
-- Este archivo es la referencia consolidada del esquema completo.
-- El historial versionado de cambios vive en database/migrations/
-- (001_init.sql, 002_multiproject_structure.sql y sucesivos). Este archivo
-- se actualiza cada vez que se aprueba una nueva migración, pero nunca se
-- aplica directamente contra una base de datos con historial de migraciones
-- ya corrido.
--
-- PRINCIPIOS QUE GOBIERNAN ESTE ESQUEMA (no modificar sin aprobación):
--   1. El árbol nunca se sobrescribe: retirado != eliminado, las
--      inspecciones completadas son inmutables.
--   2. Separación estricta: dato observado -> dato calculado -> decisión de gestión.
--   3. No se inventa metodología: toda columna cuya regla de cálculo aún
--      no fue definida por el cliente queda NULLABLE y sin lógica asociada,
--      marcada explícitamente con un comentario "-- PENDIENTE:".
--   4. RLS: fuera de este archivo. Las políticas viven en las migraciones
--      005 (base), 006, 007, 008 y 010; este archivo describe solo la
--      estructura (tablas, columnas, índices, funciones).
--   5. Multiproyecto (migraciones 002-004, completo): trees / incidents /
--      public_spaces se agrupan por project_id, NOT NULL en las tres
--      (alcanzado en 004, previo backfill 003). La coherencia "mismo
--      proyecto" entre árbol, espacio público e incidencia la fuerzan las
--      FK compuestas con MATCH SIMPLE (trees_project_public_space_fkey,
--      incidents_tree_project_fkey), ahora la única fuente de esa garantía.
--      Las FK simples *_transitoria que coexistieron durante la ventana
--      002 -> 004 (mientras project_id todavía podía ser NULL) ya fueron
--      retiradas en 004.
-- =====================================================================

-- ---------------------------------------------------------------------
-- EXTENSIONES
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "postgis";    -- geolocalización (columna preparada, sin poblar aún)

-- ---------------------------------------------------------------------
-- FUNCIÓN AUXILIAR: actualización automática de updated_at
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------

CREATE TYPE severidad_defecto AS ENUM ('despreciable', 'leve', 'moderada', 'severa');

CREATE TYPE probabilidad_falla AS ENUM ('improbable', 'posible', 'probable', 'inminente');

CREATE TYPE componente_estructural AS ENUM ('raices_base', 'tronco', 'copa_ramas');

-- Las seis categorías terminales aparecen explícitamente en el diagrama
-- de vitalidad entregado: SIN VITALIDAD/MUERTO, CLASE 0-3, y
-- REQUIERE REVISIÓN/NO CLASIFICABLE. Ninguna fue agregada por conveniencia.
CREATE TYPE clase_vitalidad AS ENUM (
  'sin_vitalidad',       -- Árbol muerto (única fuente de verdad de este estado; no se
                          -- duplica con una columna booleana aparte)
  'clase_0',              -- Exploración / Óptima
  'clase_1',              -- Degeneración / Declive leve
  'clase_2',              -- Estancamiento / Crecimiento reducido
  'clase_3',              -- Resignación / Decaimiento
  'no_clasificable'        -- Requiere revisión — no cumple ningún criterio del diagrama
);

-- Estados operativos de incidencias/mantenimiento: TEXT (no ENUM)
-- deliberadamente, ya que son vocabularios que probablemente evolucionen
-- con el uso real de la plataforma. La validación de valores permitidos
-- se hace en la capa Zod del backend, no aquí.

-- ---------------------------------------------------------------------
-- ROLES Y PERFILES DE USUARIO
-- ---------------------------------------------------------------------

CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT UNIQUE NOT NULL,          -- 'admin', 'usuario_municipal', extensible
  descripcion TEXT
);

CREATE TABLE user_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id    UUID NOT NULL REFERENCES roles(id),
  nombre     TEXT,
  activo     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- PROYECTOS Y MEMBRESÍAS (modelo multiproyecto — migración 002)
-- ---------------------------------------------------------------------
-- Un proyecto = una gestión/inventario de arbolado de una institución
-- (PR-005 v3.0 / ADR-005 v2.0). Sin eliminación física como flujo normal:
-- el cierre se representa con status = 'cerrado'. Sin UNIQUE en name ni en
-- (institution_name, name) por ahora.
--
-- project_members representa SOLO pertenencia (no rol). El rol
-- (admin / usuario_municipal) sigue siendo global y vive en user_profiles.
-- La autorización combina rol global + pertenencia y se aplica en backend
-- en esta fase; RLS es posterior.

CREATE TABLE projects (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL,
  institution_name          TEXT NOT NULL,
  responsible_professional  TEXT,                                       -- nullable por ahora
  created_by                UUID REFERENCES user_profiles(id) ON DELETE SET NULL,  -- auditoría nullable
  status                    TEXT NOT NULL DEFAULT 'activo'
                              CHECK (status IN ('activo', 'cerrado')),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE project_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL,
  user_id     UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by    UUID,

  CONSTRAINT project_members_project_user_key UNIQUE (project_id, user_id),
  CONSTRAINT project_members_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  CONSTRAINT project_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT project_members_added_by_fkey
    FOREIGN KEY (added_by) REFERENCES user_profiles(id) ON DELETE SET NULL
);

-- El acceso por project_id ya lo cubre la columna líder de
-- project_members_project_user_key. Falta el acceso inverso
-- "proyectos de un usuario" (consulta central de autorización de
-- usuario_municipal; respalda además el RESTRICT al borrar un user_profile):
CREATE INDEX idx_project_members_user ON project_members (user_id);

-- ---------------------------------------------------------------------
-- CATÁLOGO DE ESPECIES
-- ---------------------------------------------------------------------

CREATE TABLE species (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_cientifico  TEXT UNIQUE NOT NULL,
  nombre_comun       TEXT,                    -- único lugar donde vive este dato (no se duplica en trees)
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- CATÁLOGO DE ESPACIOS PÚBLICOS (plazas, parques)
-- ---------------------------------------------------------------------
-- Permite filtrar y generar indicadores por Parque Italia, Plaza Victoria,
-- Plaza O'Higgins, Plaza El Gomero, etc. No reemplaza a lugar_referencia,
-- que sigue siendo un texto descriptivo libre y adicional en trees.

CREATE TABLE public_spaces (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,                    -- multiproyecto (002/004): NOT NULL final desde 004
  nombre     TEXT NOT NULL,                    -- 'Parque Italia', 'Plaza Victoria', ...
  tipo       TEXT,                             -- 'plaza', 'parque', ... (texto libre, no ENUM: extensible)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT public_spaces_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  -- El nombre de espacio es único DENTRO de cada proyecto; la misma plaza
  -- puede existir en proyectos distintos (PR-005 v3.0). Reemplaza al
  -- UNIQUE(nombre) global de 001.
  CONSTRAINT public_spaces_project_id_nombre_key UNIQUE (project_id, nombre),
  -- id ya es único por sí solo; esta UNIQUE existe SOLO como destino de la
  -- FK compuesta (project_id, public_space_id) de trees.
  CONSTRAINT public_spaces_project_id_id_key UNIQUE (project_id, id)
);

-- ---------------------------------------------------------------------
-- ÁRBOLES
-- ---------------------------------------------------------------------

CREATE SEQUENCE tree_code_seq START 1;

CREATE TABLE trees (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tree_code             TEXT UNIQUE NOT NULL
                          DEFAULT ('A-' || LPAD(nextval('tree_code_seq')::text, 6, '0')),
  legacy_id             TEXT UNIQUE,           -- ID del catastro/Informe Técnico 2026 (Anexo 2), si aplica
                                                 -- UNIQUE simple: Postgres permite múltiples NULL de forma nativa

  species_id            UUID REFERENCES species(id),

  project_id            UUID NOT NULL,                        -- multiproyecto (002/004): NOT NULL final desde 004

  public_space_id        UUID,                                -- catálogo estructurado de plaza/parque; ver FK compuesta al pie de la tabla
  direccion              TEXT,
  comuna                  TEXT,
  lugar_referencia          TEXT,                                -- texto descriptivo libre, NO representa la plaza/parque
  ubicacion                  geography(Point, 4326),                -- PENDIENTE: sin poblar hasta recibir geolocalización

  -- DEPRECADO por ADR-016 (INV-1A): las dimensiones dendrométricas se registran en tree_measurements.
  -- Se conservan por compatibilidad legacy; no se usan para nuevas escrituras.
  dap                          NUMERIC(6,2) CHECK (dap >= 0),                       -- cm
  altura_total                    NUMERIC(6,2) CHECK (altura_total >= 0),             -- m
  diametro_copa                      NUMERIC(6,2) CHECK (diametro_copa >= 0),           -- m
  altura_primera_rama                    NUMERIC(6,2) CHECK (altura_primera_rama >= 0),     -- m

  -- Ciclo de vida: el árbol nunca se elimina, solo cambia de estado.
  -- Catálogo mínimo intencional (no se define uno complejo sin metodología
  -- aprobada). 'tocon' se agrega porque los datos a importar (Anexo 2 del
  -- Informe Técnico 2026) distinguen explícitamente tocones de árboles
  -- retirados por completo — son estados distintos, no el mismo evento.
  estado_ciclo_vida                          TEXT NOT NULL DEFAULT 'activo'
                                                CHECK (estado_ciclo_vida IN ('activo', 'retirado', 'tocon')),

  created_by                                    UUID REFERENCES user_profiles(id),
  created_at                                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                                        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Modelo multiproyecto (migraciones 002/004). project_id NOT NULL final
  -- desde 004.
  CONSTRAINT trees_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  -- Destino de FK compuestas scoped (p. ej. incidents.(tree_id, project_id)
  -- -> trees(id, project_id)). project_id como columna líder: sirve además
  -- de índice de scoping de trees por proyecto (no hay idx_trees_project).
  CONSTRAINT trees_project_id_id_key UNIQUE (project_id, id),
  -- FK COMPUESTA (permanente): fuerza que árbol y espacio público sean del
  -- mismo proyecto cuando project_id y public_space_id tienen ambos valor
  -- (project_id siempre lo tiene desde 004; public_space_id sigue nullable
  -- por sí mismo). MATCH SIMPLE => sin exigencia si public_space_id es NULL.
  -- Única fuente de esta garantía desde 004: la FK simple transitoria que
  -- coexistió durante la ventana 002 -> 004
  -- (trees_public_space_id_fkey_transitoria) ya fue retirada en 004.
  CONSTRAINT trees_project_public_space_fkey
    FOREIGN KEY (project_id, public_space_id)
    REFERENCES public_spaces (project_id, id) MATCH SIMPLE ON DELETE RESTRICT
);

CREATE INDEX idx_trees_species ON trees (species_id);
-- Variante compuesta (002): "árboles de una plaza dentro de un proyecto"
-- y respaldo del RESTRICT al borrar un public_space. El scoping de trees
-- por project_id lo cubre trees_project_id_id_key (columna líder).
CREATE INDEX idx_trees_public_space ON trees (project_id, public_space_id);
CREATE INDEX idx_trees_ubicacion ON trees USING GIST (ubicacion);
CREATE INDEX idx_trees_estado_ciclo_vida ON trees (estado_ciclo_vida);

CREATE TRIGGER trg_trees_updated_at
  BEFORE UPDATE ON trees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- MEDICIONES DENDROMÉTRICAS (INV-1A / CC-020 / ADR-016 v1.0)
-- ---------------------------------------------------------------------

CREATE TABLE tree_measurements (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id                 UUID NOT NULL REFERENCES trees(id) ON DELETE RESTRICT,

  fecha_medicion          DATE NOT NULL,
  configuracion_fustes    TEXT NOT NULL,
  numero_fustes           INTEGER,
  dap_fustes_cm           NUMERIC(6,2)[],
  dap_cm                  NUMERIC(6,2),

  altura_total_m          NUMERIC(6,2) NOT NULL CHECK (altura_total_m >= 0),
  diametro_copa_m         NUMERIC(6,2) NOT NULL CHECK (diametro_copa_m >= 0),
  altura_primera_rama_m   NUMERIC(6,2) NOT NULL CHECK (altura_primera_rama_m >= 0),

  clase_edad              TEXT,

  estado_medicion         TEXT NOT NULL DEFAULT 'valida'
                            CHECK (estado_medicion IN ('valida', 'anulada')),
  motivo_anulacion        TEXT,
  anulado_por             UUID REFERENCES user_profiles(id) ON DELETE RESTRICT,
  fecha_anulacion         TIMESTAMPTZ,

  created_by              UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_tree_measurements_dap_cm
    CHECK (dap_cm IS NULL OR dap_cm > 0),

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

  CONSTRAINT chk_tree_measurements_clase_edad
    CHECK (clase_edad IS NULL OR clase_edad IN (
      'Joven',
      'Semimaduro',
      'Tempranamente maduro',
      'Maduro',
      'Sobremaduro'
    )),

  CONSTRAINT chk_tree_measurements_anulacion
    CHECK (
      (estado_medicion = 'valida' AND motivo_anulacion IS NULL AND anulado_por IS NULL AND fecha_anulacion IS NULL)
      OR
      (estado_medicion = 'anulada' AND motivo_anulacion IS NOT NULL AND anulado_por IS NOT NULL AND fecha_anulacion IS NOT NULL)
    )
);

CREATE INDEX idx_tree_measurements_tree_id
  ON tree_measurements (tree_id);

CREATE INDEX idx_tree_measurements_tree_fecha
  ON tree_measurements (tree_id, fecha_medicion DESC)
  WHERE (estado_medicion = 'valida');

CREATE TRIGGER trg_tree_measurements_updated_at
  BEFORE UPDATE ON tree_measurements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Función RPC transaccional para alta atómica (árbol + medición inicial)
CREATE OR REPLACE FUNCTION fn_create_tree_with_measurement(
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
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = v_auth_uid AND activo = true
  ) THEN
    RAISE EXCEPTION 'Usuario inactivo o sin perfil válido';
  END IF;

  IF NOT public.is_municipal_member(p_project_id) THEN  -- CC-022 (011): el Administrador es solo lectura
    RAISE EXCEPTION 'No tiene acceso a este proyecto';
  END IF;

  -- 4. Validar existencia del proyecto (PR-005: la spec vigente no prohíbe alta en proyecto cerrado aún)
  IF NOT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id
  ) THEN
    RAISE EXCEPTION 'Proyecto no encontrado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.species
    WHERE id = p_species_id
  ) THEN
    RAISE EXCEPTION 'Especie no encontrada';
  END IF;

  IF p_public_space_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.public_spaces
    WHERE id = p_public_space_id AND project_id = p_project_id
  ) THEN
    RAISE EXCEPTION 'Espacio público no encontrado en el proyecto';
  END IF;

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

  IF NOT (p_medicion ? 'configuracion_fustes') OR TRIM(p_medicion->>'configuracion_fustes') = '' THEN
    RAISE EXCEPTION 'configuracion_fustes es obligatoria';
  END IF;

  -- 8b. H-1: Validar obligatoriedad de diámetro en medición inicial (dap_cm o dap_fustes_cm)
  IF (NOT (p_medicion ? 'dap_cm') OR p_medicion->>'dap_cm' IS NULL)
     AND (NOT (p_medicion ? 'dap_fustes_cm') OR p_medicion->>'dap_fustes_cm' IS NULL OR jsonb_array_length(p_medicion->'dap_fustes_cm') = 0) THEN
    RAISE EXCEPTION 'La medición inicial requiere al menos un diámetro registrado (dap_cm o dap_fustes_cm)';
  END IF;

  INSERT INTO trees (
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

  IF p_medicion ? 'dap_fustes_cm' AND jsonb_typeof(p_medicion->'dap_fustes_cm') = 'array' THEN
    SELECT ARRAY(SELECT jsonb_array_elements_text(p_medicion->'dap_fustes_cm')::numeric)
    INTO v_fustes_array;
  ELSE
    v_fustes_array := NULL;
  END IF;

  INSERT INTO tree_measurements (
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

-- ---------------------------------------------------------------------
-- EVALUACIÓN TÉCNICA Y RIESGO (migración 007)
-- ---------------------------------------------------------------------
-- 1:N con trees: una evaluación es un evento fechado que nunca sobrescribe
-- a otra. Persiste las variables observadas (JSONB) y los resultados
-- calculados por el backend (services/rules/treeRisk.ts: R01–R04,
-- M01–M03). M04 y M05 fuera de este corte. RLS: migración 007.

CREATE TABLE tree_risk_assessments (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id                       UUID NOT NULL REFERENCES trees(id),

  fecha_evaluacion              DATE NOT NULL,

  -- Todas las variables observadas por el inspector (R01/R02/R03, M01,
  -- consecuencias por componente). Estructura mínima de demo, no los
  -- 100+ campos finales del Excel — ver services/rules/treeRisk.ts para
  -- el contrato exacto de claves.
  variables                     JSONB NOT NULL,

  -- Resultados R01/R02/R03 (NULL = "No determinado": al menos un
  -- indicador parcial quedó sin puntaje — CHEQUEO_PUNTAJES N13, pendiente
  -- metodológico; nunca se sustituye por 0).
  puntaje_raices_cuello         INTEGER,
  probabilidad_falla_raices_cuello TEXT,
  puntaje_tronco                INTEGER,
  probabilidad_falla_tronco     TEXT,
  puntaje_copa_ramas            INTEGER,
  probabilidad_falla_copa_ramas TEXT,

  -- M01 (siempre calculable: zona_objetivo y tasa_ocupacion_objetivo son
  -- obligatorias).
  probabilidad_impacto          TEXT NOT NULL,

  -- M02+M03 por componente, y R04 (NULL si algún componente es "No
  -- determinado").
  clasificacion_raices_cuello   TEXT,
  clasificacion_tronco          TEXT,
  clasificacion_copa_ramas      TEXT,
  clasificacion_riesgo          TEXT,

  -- Trazabilidad de qué versión de reglas produjo este resultado. No hay
  -- `rule_version` publicada todavía (paquete 2.0.0 en preparación): se
  -- usa un identificador fijo de la fuente borrador utilizada.
  rule_version                  TEXT NOT NULL DEFAULT 'borrador_reglas_diagramas_v3',

  created_by                    UUID REFERENCES user_profiles(id),
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_tree_risk_probabilidad_impacto
    CHECK (probabilidad_impacto IN ('Muy baja', 'Baja', 'Media', 'Alta')),
  CONSTRAINT chk_tree_risk_prob_falla_rc
    CHECK (probabilidad_falla_raices_cuello IS NULL OR probabilidad_falla_raices_cuello IN ('Improbable', 'Posible', 'Probable', 'Inminente')),
  CONSTRAINT chk_tree_risk_prob_falla_tr
    CHECK (probabilidad_falla_tronco IS NULL OR probabilidad_falla_tronco IN ('Improbable', 'Posible', 'Probable', 'Inminente')),
  CONSTRAINT chk_tree_risk_prob_falla_cr
    CHECK (probabilidad_falla_copa_ramas IS NULL OR probabilidad_falla_copa_ramas IN ('Improbable', 'Posible', 'Probable', 'Inminente')),
  CONSTRAINT chk_tree_risk_clasificacion_rc
    CHECK (clasificacion_raices_cuello IS NULL OR clasificacion_raices_cuello IN ('Bajo', 'Moderado', 'Alto', 'Extremo')),
  CONSTRAINT chk_tree_risk_clasificacion_tr
    CHECK (clasificacion_tronco IS NULL OR clasificacion_tronco IN ('Bajo', 'Moderado', 'Alto', 'Extremo')),
  CONSTRAINT chk_tree_risk_clasificacion_cr
    CHECK (clasificacion_copa_ramas IS NULL OR clasificacion_copa_ramas IN ('Bajo', 'Moderado', 'Alto', 'Extremo')),
  CONSTRAINT chk_tree_risk_clasificacion_riesgo
    CHECK (clasificacion_riesgo IS NULL OR clasificacion_riesgo IN ('Bajo', 'Moderado', 'Alto', 'Extremo')),
  CONSTRAINT chk_tree_risk_puntaje_rc CHECK (puntaje_raices_cuello IS NULL OR (puntaje_raices_cuello >= 0 AND puntaje_raices_cuello <= 9)),
  CONSTRAINT chk_tree_risk_puntaje_tr CHECK (puntaje_tronco IS NULL OR (puntaje_tronco >= 0 AND puntaje_tronco <= 14)),
  CONSTRAINT chk_tree_risk_puntaje_cr CHECK (puntaje_copa_ramas IS NULL OR (puntaje_copa_ramas >= 0 AND puntaje_copa_ramas <= 5))
);

CREATE INDEX idx_tree_risk_assessments_tree_id ON tree_risk_assessments (tree_id, fecha_evaluacion DESC);

-- ---------------------------------------------------------------------
-- AUDITORÍA GENERAL
-- ---------------------------------------------------------------------

CREATE TABLE audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    TEXT NOT NULL,                 -- 'tree', 'incident', 'maintenance', ...
  entity_id      UUID NOT NULL,
  accion         TEXT NOT NULL,                 -- 'create', 'update', 'status_change', ...
  valor_anterior JSONB,
  valor_nuevo    JSONB,
  changed_by     UUID REFERENCES user_profiles(id),
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_entity ON audit_log (entity_type, entity_id);

-- ---------------------------------------------------------------------
-- INSPECCIONES
-- ---------------------------------------------------------------------
-- Flujo de autosave por sección:
--   borrador -> autosave raíces -> autosave tronco -> autosave copa
--            -> autosave vitalidad -> finalizar -> completada (inmutable)
--
-- estado='borrador'   : la inspección admite UPSERT de observaciones.
-- estado='completada'  : inmutable desde ese momento; el backend debe
--                        rechazar cualquier escritura posterior sobre
--                        defect_observations/resultados de esta inspección.
--                        (Enforzado en la capa de servicio, no mediante
--                        trigger de base de datos en esta versión.)
--
-- Esta distinción es exclusivamente de flujo de captura en terreno;
-- NO corresponde a revisión ni aprobación administrativa.
--
-- Nota sobre ON DELETE: toda la cadena inspections -> defect_observations
-- -> defect_results / component_assessments / vitality_assessments /
-- risk_evaluations usa ON DELETE RESTRICT (no CASCADE). Una inspección
-- completada, y todo lo calculado a partir de ella, es un registro
-- histórico permanente: no debe poder desaparecer como efecto colateral
-- de borrar la fila padre. Si alguna vez se necesita depurar una
-- inspección en estado 'borrador' abandonada, la eliminación debe
-- hacerse explícitamente en orden (hijos primero), nunca por cascada
-- automática.

CREATE TABLE inspections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id        UUID NOT NULL REFERENCES trees(id),
  inspector_id    UUID REFERENCES user_profiles(id),
  fecha            DATE NOT NULL DEFAULT CURRENT_DATE,
  estado             TEXT NOT NULL DEFAULT 'borrador'
                        CHECK (estado IN ('borrador', 'completada')),
  rule_version          TEXT NOT NULL,             -- ej. '1.0' — fija para siempre en esta fila
  completed_at            TIMESTAMPTZ,                -- NULL mientras estado = 'borrador'
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (
    (estado = 'borrador'   AND completed_at IS NULL)
    OR
    (estado = 'completada' AND completed_at IS NOT NULL)
  )
);

CREATE INDEX idx_inspections_tree ON inspections (tree_id, fecha DESC);
CREATE INDEX idx_inspections_estado ON inspections (estado);

-- ---------------------------------------------------------------------
-- CAPA 1 — OBSERVACIONES (lo que el inspector registra en terreno)
-- ---------------------------------------------------------------------
-- UNIQUE (inspection_id, componente, defect_code): cada criterio se
-- evalúa una sola vez por inspección. Permite implementar el autosave
-- por sección mediante UPSERT (ON CONFLICT ... DO UPDATE) mientras la
-- inspección esté en estado 'borrador'.

CREATE TABLE defect_observations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id   UUID NOT NULL REFERENCES inspections(id) ON DELETE RESTRICT,
  componente       componente_estructural NOT NULL,
  defect_code       TEXT NOT NULL,             -- ej. 'raices_expuestas', 'cavidad_pudricion_basal',
                                                 -- 'grietas_tronco', 'ramas_secas', 'defoliacion', ...
                                                 -- TEXT libre (no ENUM): el catálogo de defectos vive en
                                                 -- services/rules/ y es extensible sin migración.
  presente          BOOLEAN NOT NULL,
  parametros         JSONB,                     -- valores crudos específicos del defecto:
                                                 -- {"inclinacion_grados": 22}
                                                 -- {"diametro_cavidad_cm": 12, "diametro_tronco_cm": 40, ...}
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (inspection_id, componente, defect_code)
);

CREATE INDEX idx_defect_observations_inspection ON defect_observations (inspection_id);

CREATE TRIGGER trg_defect_observations_updated_at
  BEFORE UPDATE ON defect_observations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- CAPA 2 — RESULTADOS CALCULADOS
-- ---------------------------------------------------------------------

CREATE TABLE defect_results (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_observation_id   UUID NOT NULL UNIQUE REFERENCES defect_observations(id) ON DELETE RESTRICT,
  severidad                severidad_defecto NOT NULL,
  puntaje                    SMALLINT NOT NULL CHECK (puntaje BETWEEN 0 AND 3),  -- rango definido en los diagramas
  regla_aplicada               TEXT,                    -- trazabilidad: qué rama del árbol de decisión se usó
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE component_assessments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id   UUID NOT NULL REFERENCES inspections(id) ON DELETE RESTRICT,
  componente       componente_estructural NOT NULL,
  puntaje_total     SMALLINT NOT NULL CHECK (puntaje_total >= 0),
  probabilidad_falla probabilidad_falla NOT NULL,   -- ÚNICA fuente de verdad de la probabilidad de falla
  rule_version         TEXT NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (inspection_id, componente)                 -- un resultado agregado por componente e inspección
);

CREATE INDEX idx_component_assessments_inspection ON component_assessments (inspection_id);

-- Tabla ÚNICA de conversión puntaje -> probabilidad de falla, compartida
-- entre raíces/base, tronco y copa/ramas (según instrucción explícita:
-- no crear tablas de umbrales distintas por componente).
-- PENDIENTE: rangos numéricos (puntaje_min/puntaje_max) a entregar por el cliente.
CREATE TABLE probability_thresholds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria      probabilidad_falla NOT NULL,
  puntaje_min     SMALLINT NOT NULL CHECK (puntaje_min >= 0),
  puntaje_max      SMALLINT CHECK (puntaje_max IS NULL OR puntaje_max >= puntaje_min),  -- NULL = sin techo
  rule_version      TEXT NOT NULL,

  UNIQUE (categoria, rule_version)
);

-- ---------------------------------------------------------------------
-- VITALIDAD (Escala de Roloff) — separada de las evaluaciones estructurales
-- ---------------------------------------------------------------------

CREATE TABLE vitality_assessments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id        UUID NOT NULL UNIQUE REFERENCES inspections(id) ON DELETE RESTRICT,
  clase                    clase_vitalidad NOT NULL,   -- incluye 'sin_vitalidad' (árbol muerto) como valor propio
  criterios_observados       JSONB,                    -- qué respuestas llevaron a esa clase (trazabilidad)
  rule_version                TEXT NOT NULL,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- CAPA 3 — RIESGO (estructura preparada, sin lógica de cálculo)
-- ---------------------------------------------------------------------
-- PENDIENTE en su totalidad: diagramas de probabilidad de impacto y
-- consecuencias de la falla aún no entregados. Esta tabla no debe
-- alimentarse automáticamente hasta recibir esa metodología.
-- No se duplica probabilidad_falla aquí: component_assessments es la
-- única fuente de verdad; parte_evaluada solo indica cuál componente
-- resultará determinante una vez que exista la regla de selección.
CREATE TABLE risk_evaluations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id             UUID NOT NULL UNIQUE REFERENCES inspections(id) ON DELETE RESTRICT,
  parte_evaluada              componente_estructural,     -- PENDIENTE: regla de selección no definida
  probabilidad_impacto          TEXT,                        -- PENDIENTE: diagrama no entregado
  consecuencias_falla             TEXT,                        -- PENDIENTE: diagrama no entregado
  nivel_riesgo_resultante           TEXT,                        -- PENDIENTE: matriz final no definida
  created_at                         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- INFRAESTRUCTURA
-- ---------------------------------------------------------------------

CREATE TABLE infrastructure_conflicts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id          UUID NOT NULL REFERENCES trees(id),
  componente        TEXT NOT NULL,             -- 'acera', 'pavimento', 'cableado', 'alcorque', ...
  tipo_conflicto      TEXT,                      -- 'levantamiento', 'interferencia', ...
  severidad             TEXT,                      -- 'alta', 'media', 'baja'
  extension_m2            NUMERIC(6,2) CHECK (extension_m2 >= 0),
  distancia_m               NUMERIC(6,2) CHECK (distancia_m >= 0),
  estado                       TEXT NOT NULL DEFAULT 'pendiente',
  observaciones                  TEXT,
  created_by                       UUID REFERENCES user_profiles(id),
  created_at                         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_infra_conflicts_tree ON infrastructure_conflicts (tree_id);

CREATE TRIGGER trg_infra_conflicts_updated_at
  BEFORE UPDATE ON infrastructure_conflicts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Evaluación de infraestructura por árbol (migración 008): respuestas
-- observadas por componente con las claves de DICCIONARIO_CAMPOS
-- (REGISTRO_EVALUACION). Sin severidades ni nivel global: M04 pendiente
-- ("Clasificación global pendiente"). null en una compuerta = "No
-- determinado". No reutiliza infrastructure_conflicts porque esa tabla
-- exige `severidad` (resultado de M04). RLS: migración 008.
CREATE TABLE tree_infrastructure_assessments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id           UUID NOT NULL REFERENCES trees(id),
  fecha_evaluacion  DATE NOT NULL,
  variables         JSONB NOT NULL,
  observaciones     TEXT,
  created_by        UUID REFERENCES user_profiles(id) DEFAULT auth.uid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tree_infra_assessments_tree_id
  ON tree_infrastructure_assessments (tree_id, fecha_evaluacion DESC);

-- ---------------------------------------------------------------------
-- INCIDENCIAS
-- ---------------------------------------------------------------------

-- Código oficial 'INC-000001' (formato INCIDENCIA.id_incidencia del Excel
-- maestro), migración 009.
CREATE SEQUENCE incidents_codigo_seq;

CREATE TABLE incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_incidencia TEXT DEFAULT ('INC-' || lpad(nextval('incidents_codigo_seq')::text, 6, '0')),
  tree_id          UUID,                        -- nullable: puede reportarse sin árbol identificado aún; ver FK compuesta al pie de la tabla
  project_id        UUID NOT NULL,                -- multiproyecto (002/004): DIRECTO (tree_id es nullable). NOT NULL final desde 004
  tipo              TEXT NOT NULL,               -- 'ramas_peligrosas', 'arbol_inclinado', ...
  descripcion         TEXT,
  estado                TEXT NOT NULL DEFAULT 'pendiente',
  prioridad               TEXT,
  origen_reporte              TEXT,                   -- 'ciudadania', 'inspeccion', 'usuario_plataforma', ...
                                                        -- texto libre (no ENUM): categoría de origen aún no cerrada
  reportado_por_user_id         UUID REFERENCES user_profiles(id),  -- nullable: solo si el reporte
                                                                     -- viene de un usuario identificado del sistema
  observacion                     TEXT,                   -- bitácora de lo realizado (rol usuario)
  actualizado_por                 UUID REFERENCES user_profiles(id),
  fecha_actualizacion                TIMESTAMPTZ,
  created_at                            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                              TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Modelo multiproyecto (migraciones 002/004). project_id NOT NULL final
  -- desde 004.
  CONSTRAINT incidents_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  -- FK COMPUESTA (permanente): con tree_id y project_id ambos con valor,
  -- obliga a que el árbol pertenezca al mismo proyecto que la incidencia
  -- (project_id siempre lo tiene desde 004; tree_id sigue nullable por sí
  -- mismo). MATCH SIMPLE => sin exigencia si tree_id es NULL. Única fuente
  -- de esta garantía desde 004: la FK simple transitoria que coexistió
  -- durante la ventana 002 -> 004 (incidents_tree_id_fkey_transitoria) ya
  -- fue retirada en 004.
  CONSTRAINT incidents_tree_project_fkey
    FOREIGN KEY (tree_id, project_id)
    REFERENCES trees (id, project_id) MATCH SIMPLE ON DELETE RESTRICT
);

-- Variante compuesta (002): mantiene el acceso por árbol (tree_id líder) y
-- respalda la FK compuesta / el RESTRICT al borrar un árbol.
CREATE INDEX idx_incidents_tree ON incidents (tree_id, project_id);
-- Scoping directo por proyecto (project_id no es líder de ningún otro
-- índice de incidents; respalda el RESTRICT al borrar un project).
CREATE INDEX idx_incidents_project ON incidents (project_id);
CREATE INDEX idx_incidents_estado ON incidents (estado);
CREATE UNIQUE INDEX uq_incidents_codigo ON incidents (codigo_incidencia);
-- Estados (validados en backend, no como CHECK): estado_incidencia del
-- Excel maestro — ingresada, en_revision, derivada, resuelta, descartada.
-- El backend registra las incidencias nuevas como 'ingresada'; el DEFAULT
-- 'pendiente' se conserva para filas históricas.

CREATE TRIGGER trg_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- MANTENIMIENTO / INTERVENCIONES
-- ---------------------------------------------------------------------

-- Código oficial 'OT-M-000001' (formato ORDENES DE TRABAJO.ID_OT del Excel
-- maestro), migración 009.
CREATE SEQUENCE maintenance_codigo_ot_seq;

CREATE TABLE maintenance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_ot          TEXT DEFAULT ('OT-M-' || lpad(nextval('maintenance_codigo_ot_seq')::text, 6, '0')),
  tree_id            UUID NOT NULL REFERENCES trees(id),
  tipo_intervencion    TEXT NOT NULL,             -- 'poda_reduccion', 'extraccion', ...
  prioridad              TEXT,
  fecha_programada         DATE,
  responsable                TEXT,                   -- cuadrilla/equipo (catálogo simple, sin login)
  estado                        TEXT NOT NULL DEFAULT 'pendiente',
  observacion                      TEXT,
  actualizado_por                     UUID REFERENCES user_profiles(id),
  fecha_actualizacion                    TIMESTAMPTZ,
  created_at                                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_maintenance_tree ON maintenance (tree_id);
CREATE INDEX idx_maintenance_estado ON maintenance (estado);
CREATE UNIQUE INDEX uq_maintenance_codigo_ot ON maintenance (codigo_ot);
-- Columnas agregadas en la migración 008 (nullable):
--   subtipo_accion: LISTAS:subtipo_accion (CC-004), según tipo_intervencion
--   (código de LISTAS:accion, tipo_ot = mantenimiento).
--   created_by: autor del registro, DEFAULT auth.uid().
ALTER TABLE maintenance ADD COLUMN subtipo_accion TEXT;
ALTER TABLE maintenance ADD COLUMN created_by UUID REFERENCES user_profiles(id) DEFAULT auth.uid();
-- Estados (validados en backend): estado_ot del Excel maestro — pendiente,
-- programada, en_ejecucion, completada, cancelada.

CREATE TRIGGER trg_maintenance_updated_at
  BEFORE UPDATE ON maintenance
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- FOTOGRAFÍAS
-- ---------------------------------------------------------------------
-- Relación directa Tree -> Photo (no por inspección/incidencia/intervención
-- salvo que se defina posteriormente). Límite de 20 por árbol validado en
-- frontend y backend, NO como CHECK constraint (el conteo depende de filas
-- relacionadas, no de un valor propio de la fila). Si más adelante se
-- requiere garantía a nivel de base de datos, se añade un trigger
-- BEFORE INSERT — no implementado en esta versión.

CREATE TABLE photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id       UUID NOT NULL REFERENCES trees(id) ON DELETE RESTRICT,
  storage_path   TEXT NOT NULL,               -- ruta en Supabase Storage
  photo_type       TEXT,
  description        TEXT,
  uploaded_by          UUID REFERENCES user_profiles(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_photos_tree ON photos (tree_id);

-- =====================================================================
-- FIN schema.sql
--
-- Pendientes explícitos que este esquema NO resuelve (por diseño):
--   - probability_thresholds: sin filas (rangos numéricos por entregar)
--   - risk_evaluations: sin lógica de cálculo (impacto/consecuencias/matriz)
--   - RLS: definida en migraciones (005, 006, 007, 008, 010, 011), no aquí.
--     spatial_ref_sys (PostGIS) conserva privilegios de escritura para los
--     roles de la API: la tabla pertenece a supabase_admin (issue #9).
--   - M04 (clasificación global de infraestructura) y M05 (prioridad):
--     sin implementar; tree_infrastructure_assessments guarda datos crudos.
--   - Inmutabilidad de inspections.estado='completada': enforzada en
--     services/, no todavía mediante trigger de base de datos
--   - origen_reporte de incidents: catálogo de valores aún no cerrado,
--     se valida en Zod (backend) mientras tanto
--   - Multiproyecto (migraciones 002-004): completo. trees.project_id,
--     public_spaces.project_id e incidents.project_id son NOT NULL desde
--     004 (previo backfill 003 con el mapeo explícito de la autora). Las FK
--     simples transitorias (trees_public_space_id_fkey_transitoria,
--     incidents_tree_id_fkey_transitoria) fueron retiradas en 004; las FK
--     compuestas (trees_project_public_space_fkey,
--     incidents_tree_project_fkey) son ahora la única fuente de la garantía
--     de coherencia de proyecto + existencia del referente.
--   - Autorización rol global + pertenencia (project_members): se aplica en
--     backend (authorization.service.ts) y RLS como segunda capa (ADR-014).
--   - CRS/SRID por proyecto: sin columna en projects (ADR-010 'propuesta')
-- =====================================================================
