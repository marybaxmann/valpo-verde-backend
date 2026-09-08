-- =====================================================================
-- VALPO VERDE — migrations/001_init.sql
-- Primera migración: crea el esquema completo aprobado en Etapa 3.
-- Corresponde exactamente al estado de database/schema.sql al momento
-- de esta migración. Migraciones futuras (002_..., 003_...) se aplican
-- sobre esta base y schema.sql se actualiza en cada aprobación.
-- =====================================================================

-- contra una base de datos con historial de migraciones ya corrido.
--
-- PRINCIPIOS QUE GOBIERNAN ESTE ESQUEMA (no modificar sin aprobación):
--   1. El árbol nunca se sobrescribe: retirado != eliminado, las
--      inspecciones completadas son inmutables.
--   2. Separación estricta: dato observado -> dato calculado -> decisión de gestión.
--   3. No se inventa metodología: toda columna cuya regla de cálculo aún
--      no fue definida por el cliente queda NULLABLE y sin lógica asociada,
--      marcada explícitamente con un comentario "-- PENDIENTE:".
--   4. RLS: fuera de este archivo hasta definir permisos exactos de
--      admin/usuario (se implementará en una migración separada).
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
  nombre      TEXT UNIQUE NOT NULL,          -- 'admin', 'usuario', extensible
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
  nombre     TEXT UNIQUE NOT NULL,             -- 'Parque Italia', 'Plaza Victoria', ...
  tipo       TEXT,                             -- 'plaza', 'parque', ... (texto libre, no ENUM: extensible)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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

  public_space_id        UUID REFERENCES public_spaces(id),   -- catálogo estructurado de plaza/parque
  direccion              TEXT,
  comuna                  TEXT,
  lugar_referencia          TEXT,                                -- texto descriptivo libre, NO representa la plaza/parque
  ubicacion                  geography(Point, 4326),                -- PENDIENTE: sin poblar hasta recibir geolocalización

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
  updated_at                                        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trees_species ON trees (species_id);
CREATE INDEX idx_trees_public_space ON trees (public_space_id);
CREATE INDEX idx_trees_ubicacion ON trees USING GIST (ubicacion);
CREATE INDEX idx_trees_estado_ciclo_vida ON trees (estado_ciclo_vida);

CREATE TRIGGER trg_trees_updated_at
  BEFORE UPDATE ON trees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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

-- ---------------------------------------------------------------------
-- INCIDENCIAS
-- ---------------------------------------------------------------------

CREATE TABLE incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id          UUID REFERENCES trees(id),   -- nullable: puede reportarse sin árbol identificado aún
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
  updated_at                              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_tree ON incidents (tree_id);
CREATE INDEX idx_incidents_estado ON incidents (estado);

CREATE TRIGGER trg_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- MANTENIMIENTO / INTERVENCIONES
-- ---------------------------------------------------------------------

CREATE TABLE maintenance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
--   - trees.ubicacion: sin poblar (geolocalización por entregar)
--   - RLS: políticas a definir en una migración separada
--   - Inmutabilidad de inspections.estado='completada': enforzada en
--     services/, no todavía mediante trigger de base de datos
--   - origen_reporte de incidents: catálogo de valores aún no cerrado,
--     se valida en Zod (backend) mientras tanto
-- =====================================================================
