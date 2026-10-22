-- =====================================================================
-- VALPO VERDE — Gestión del Arbolado Urbano de Valparaíso
-- schema.sql — Estado consolidado del modelo de datos
--   (revisión 13 — posterior a la migración 018a (Fase 6, planificación:
--   trees.qr_token, token aleatorio no adivinable para el QR público de
--   incidencias, PR-022 — nunca tree_code, que es correlativo); antes
--   revisión 12, posterior a la migración 017 (Fase 4: RLS por rol
--   CC-033 en las 21 tablas de datos — solo políticas SELECT, ninguna de
--   escritura, en ningún rol —; bloqueo de proyecto cerrado con trigger,
--   RG fila 27/CC-042, incluida la propia fila de projects;
--   security_invoker = true en las 6 vistas de la 016; has_project_role
--   nueva. Las políticas RLS y los GRANT/REVOKE de la 017 NO están en
--   este archivo, solo sus funciones y triggers — ver la nota de RLS al
--   final); antes revisión 11, posterior a la migración 016 (Fase 4:
--   vistas v_tree_presence, v_inspections, v_tree_current_inputs,
--   v_tree_current_assessment, v_species_traits, v_upcoming_inspections);
--   antes revisión 10, posterior a la migración 015 (Fase 4: incidents
--   adaptada con estado_incidencia/tipo_incidencia, incident_reporters,
--   photos adaptada con vista y origen único); antes revisión 9,
--   posterior a la migración 014 (Fase 4: work_orders,
--   inspections reutilizada con estado_registro/anulación, evaluations,
--   classification_adjustments, tree_assessments, maintenance_records,
--   fn_refresh_tree_current); antes revisión 8, posterior a la migración
--   013 (Fase 4: sectors, trees.sector_id/valores vigentes aditivos,
--   tree_data_versions); antes revisión 7, posterior a la migración 012 (Fase 4, paquete 2.1.0:
--   roles nuevos, catálogo de especies, projects.estado_proyecto);
--   antes revisión 6, posterior a la migración 011 (CC-022, Administrador
--   solo lectura); revisión 5, posterior a la migración 010: incluye
--   005–006 (RLS base, tree_measurements + RPC de alta), 007 (evaluación
--   de riesgo), 008 (infraestructura, mantención), 009 (códigos OT/INC) y
--   010 (RLS en tablas expuestas). Sincronizado el 2026-10-21.
--
--   Corrección de la responsable sobre 012–014 (2026-10-21), antes de
--   abrir PR: projects.name -> nombre_proyecto (D-264, faltaba);
--   clase_edad y probabilidad_falla_* en snake_case (PR-021), con
--   no_determinado (CC-024); FK/triggers de coherencia proyecto-sector,
--   inspección-OT, evaluación-inspección y mantenimiento-OT; CHECK de
--   fustes, copa, "No presenta", primera rama ≤ altura total,
--   fecha_accion_programada y observaciones de work_orders; huso/datum
--   NOT NULL con DEFAULT; fn_refresh_tree_current con CASE WHEN EXISTS
--   (no COALESCE) y search_path fijo.
--
--   **Aplicado solo en `valpo-verde-conecta-pruebas`** (012 en adelante;
--   diseño Fase 3 §7). `valpo-verde-conecta` sigue en la revisión 6 hasta
--   que la Fase 8 autorice aplicar 012–017 ahí (issue #45). Este archivo
--   describe la base de pruebas, no la de desarrollo/demo actual.)
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
  nombre      TEXT UNIQUE NOT NULL,          -- 'admin', 'usuario_municipal', 'inspector',
                                              -- 'encargado_mantencion' (CC-032, migración 012)
  descripcion TEXT
);

-- Secuencia y función de codigo_usuario (D-247; CC-041; migración 012):
-- un solo nextval() por fila para no saltar valores en el DEFAULT.
CREATE SEQUENCE user_profiles_codigo_seq START 1;

CREATE FUNCTION fn_next_codigo_usuario() RETURNS TEXT AS $$
DECLARE
  v BIGINT := nextval('user_profiles_codigo_seq');
BEGIN
  RETURN 'USR-' || LPAD(v::text, GREATEST(3, length(v::text)), '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE user_profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id        UUID NOT NULL REFERENCES roles(id),
  nombre         TEXT,
  activo         BOOLEAN NOT NULL DEFAULT true,
  codigo_usuario TEXT UNIQUE NOT NULL DEFAULT fn_next_codigo_usuario(),  -- D-247 (migración 012)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
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
  nombre_proyecto           TEXT NOT NULL,                                 -- renombrado desde `name` (D-264; migración 012)
  institution_name          TEXT NOT NULL,
  responsible_professional  TEXT,                                       -- nullable por ahora
  created_by                UUID REFERENCES user_profiles(id) ON DELETE SET NULL,  -- auditoría nullable
  estado_proyecto           TEXT NOT NULL DEFAULT 'activo'               -- renombrado desde `status` (D-265; CC-042; migración 012)
                              CHECK (estado_proyecto IN ('activo', 'cerrado')),
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
-- SECTORES (migración 013; D-252 a D-256; AMD-32; CC-041)
-- ---------------------------------------------------------------------
-- Un sector por proyecto (se crea junto con el proyecto, en la misma
-- transacción, a cargo del backend — Fase 6). La delimitación territorial
-- (polígono o multipolígono, importable desde KML/KMZ).

CREATE TABLE sectors (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL UNIQUE
                          REFERENCES projects(id) ON DELETE RESTRICT,
  nombre_sector         TEXT NOT NULL,
  geometria_sector      geography(MultiPolygon, 4326) NOT NULL,
  superficie_sector_m2  NUMERIC GENERATED ALWAYS AS (ST_Area(geometria_sector)) STORED,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Destino de la FK compuesta (project_id, sector_id) de trees.
  CONSTRAINT sectors_project_id_id_key UNIQUE (project_id, id)
);

CREATE INDEX idx_sectors_geometria ON sectors USING GIST (geometria_sector);

CREATE TRIGGER trg_sectors_updated_at
  BEFORE UPDATE ON sectors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- CATÁLOGO DE ESPECIES
-- ---------------------------------------------------------------------

-- Catálogo de especies (CATALOGO_ESPECIES; CC-039; migración 012).
-- `nombre_comun` se retiró: es un dato del árbol (CC-028 P2; D-14), no
-- del catálogo.
CREATE TABLE species (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  especie_cientifica    TEXT NOT NULL,                 -- renombrado desde `nombre_cientifico`; UNIQUE sobre la forma normalizada (índice abajo)
  genero                TEXT,
  familia               TEXT,
  origen_biogeografico  TEXT
    CHECK (origen_biogeografico IS NULL OR origen_biogeografico IN ('nativa', 'endemica', 'introducida')),
  persistencia_follaje  TEXT
    CHECK (persistencia_follaje IS NULL OR persistencia_follaje IN ('perennifolia', 'caducifolia', 'semicaducifolia')),
  tipo_hoja             TEXT
    CHECK (tipo_hoja IS NULL OR tipo_hoja IN ('latifoliada', 'acicular', 'escuamiforme', 'palmera')),
  created_by            UUID REFERENCES user_profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- No admite "Género sp." ni "No determinado" (D-257).
  CONSTRAINT chk_species_especie_cientifica_valida
    CHECK (especie_cientifica !~* '\ssp\.?$' AND lower(trim(especie_cientifica)) <> 'no determinado')
);

-- UNIQUE sobre la forma normalizada (minúsculas, espacios simples).
CREATE UNIQUE INDEX uq_species_especie_cientifica_norm
  ON species (lower(regexp_replace(trim(especie_cientifica), '\s+', ' ', 'g')));

CREATE TRIGGER trg_species_updated_at
  BEFORE UPDATE ON species
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
  qr_token              UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(), -- migración 018a; QR público (PR-022); NUNCA tree_code (correlativo, enumerable)
  legacy_id             TEXT UNIQUE,           -- ID del catastro/Informe Técnico 2026 (Anexo 2), si aplica
                                                 -- UNIQUE simple: Postgres permite múltiples NULL de forma nativa

  species_id            UUID REFERENCES species(id),

  project_id            UUID NOT NULL,                        -- multiproyecto (002/004): NOT NULL final desde 004

  public_space_id        UUID,                                -- catálogo estructurado de plaza/parque; ver FK compuesta al pie de la tabla
  direccion              TEXT,
  comuna                  TEXT,
  lugar_referencia          TEXT,                                -- texto descriptivo libre, NO representa la plaza/parque

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

  -- -------------------------------------------------------------------
  -- Identidad + valores vigentes (migración 013; §3.5; D-6 a D-29).
  -- Los valores vigentes solo los escribe fn_refresh_tree_current
  -- (§5.1, migración 014); el historial completo vive en
  -- tree_data_versions.
  -- -------------------------------------------------------------------
  sector_id                     UUID NOT NULL REFERENCES sectors(id),            -- D-6; asignado por el sistema
  fecha_registro                DATE NOT NULL,                                   -- D-4; hora de Chile
  registrado_por                UUID NOT NULL REFERENCES user_profiles(id),      -- D-5; explícito (CC-033)
  sector                        TEXT,                                           -- D-7 (valor vigente; distinto de sector_id)
  ubicacion_descriptiva         TEXT,                                           -- D-8
  utm_este                      NUMERIC(10,2),                                  -- D-9; coordenada canónica (CC-028 P1)
  utm_norte                     NUMERIC(10,2),                                  -- D-10
  huso                          TEXT NOT NULL DEFAULT '19S' CHECK (huso = '19S'),       -- D-11
  datum                         TEXT NOT NULL DEFAULT 'WGS84' CHECK (datum = 'WGS84'),   -- D-12
  ubicacion                     geography(Point, 4326)                          -- ADR-010 v3.0: generada desde UTM (ya no manual)
                                   GENERATED ALWAYS AS (
                                     ST_Transform(ST_SetSRID(ST_MakePoint(utm_este, utm_norte), 32719), 4326)
                                   ) STORED,
  especie_cientifica            TEXT,                                           -- D-13
  nombre_comun                  TEXT,                                           -- D-14
  multifustal                   BOOLEAN,                                       -- D-15
  numero_fustes                 INTEGER CHECK (numero_fustes IS NULL OR numero_fustes >= 2),  -- D-16
  dap_fustes_cm                 NUMERIC(6,2)[],                                 -- D-17
  dap_cm                        NUMERIC(6,2) CHECK (dap_cm IS NULL OR dap_cm > 0),  -- D-18
  altura_total_m                NUMERIC(6,2) CHECK (altura_total_m IS NULL OR altura_total_m > 0),  -- D-19; AMD-13
  diametro_copa_ns_m            NUMERIC(6,2) CHECK (diametro_copa_ns_m IS NULL OR diametro_copa_ns_m >= 0),  -- D-20
  diametro_copa_eo_m            NUMERIC(6,2) CHECK (diametro_copa_eo_m IS NULL OR diametro_copa_eo_m >= 0),  -- D-21
  copa_no_presenta              BOOLEAN,                                       -- RG "Ausencia"
  diametro_copa_m               NUMERIC(6,2)                                    -- D-22; generada, promedio si ambas existen
                                   GENERATED ALWAYS AS ((diametro_copa_ns_m + diametro_copa_eo_m) / 2) STORED,
  altura_primera_rama_m         NUMERIC(6,2),                                   -- D-23
  altura_primera_rama_no_presenta BOOLEAN,
  altura_base_copa_viva_m       NUMERIC(6,2),                                   -- D-24
  altura_base_copa_viva_no_presenta BOOLEAN,
  clase_edad                    TEXT CHECK (clase_edad IS NULL OR clase_edad IN (  -- D-25; códigos snake_case (PR-021)
    'joven', 'semimaduro', 'tempranamente_maduro', 'maduro', 'sobremaduro'
  )),
  rango_edad_estimada_anios     TEXT CHECK (rango_edad_estimada_anios IS NULL OR rango_edad_estimada_anios IN (  -- D-26; CC-039; opcional
    '0_5', '6_10', '11_15', '16_20', '21_25', '26_30', '31_35', '36_40',
    '41_45', '46_50', '51_55', '56_60', '61_65', '66_70', '71_75',
    '76_80', '81_85', '86_90', '91_95', '96_100', 'mas_de_100'
  )),
  vigente_desde_inspection_id    UUID REFERENCES inspections(id),                -- última inspección que aportó algún valor vigente

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
    REFERENCES public_spaces (project_id, id) MATCH SIMPLE ON DELETE RESTRICT,
  -- Al menos especie_cientifica o nombre_comun en el alta (RG "Preguardado"; migración 013).
  CONSTRAINT chk_trees_especie_o_comun
    CHECK (especie_cientifica IS NOT NULL OR nombre_comun IS NOT NULL),
  -- Coherencia: el sector de un árbol debe ser del mismo proyecto (AMD-32; CC-041).
  CONSTRAINT trees_project_sector_fkey
    FOREIGN KEY (project_id, sector_id) REFERENCES sectors (project_id, id),
  -- Largo de dap_fustes_cm = numero_fustes y cada valor > 0 (D-17).
  CONSTRAINT chk_trees_dap_fustes
    CHECK (
      dap_fustes_cm IS NULL
      OR (
        numero_fustes IS NOT NULL
        AND array_length(dap_fustes_cm, 1) = numero_fustes
        AND array_position(dap_fustes_cm, NULL) IS NULL
        AND NOT (0 >= ANY (dap_fustes_cm))
      )
    ),
  -- "No presenta" desactiva el número (RG "Ausencia").
  CONSTRAINT chk_trees_copa_no_presenta
    CHECK (copa_no_presenta IS NOT TRUE OR (diametro_copa_ns_m IS NULL AND diametro_copa_eo_m IS NULL)),
  CONSTRAINT chk_trees_primera_rama_no_presenta
    CHECK (altura_primera_rama_no_presenta IS NOT TRUE OR altura_primera_rama_m IS NULL),
  CONSTRAINT chk_trees_base_copa_viva_no_presenta
    CHECK (altura_base_copa_viva_no_presenta IS NOT TRUE OR altura_base_copa_viva_m IS NULL),
  -- Primera rama ≤ altura total.
  CONSTRAINT chk_trees_primera_rama_le_altura
    CHECK (altura_primera_rama_m IS NULL OR altura_total_m IS NULL OR altura_primera_rama_m <= altura_total_m)
);

CREATE INDEX idx_trees_species ON trees (species_id);
-- Variante compuesta (002): "árboles de una plaza dentro de un proyecto"
-- y respaldo del RESTRICT al borrar un public_space. El scoping de trees
-- por project_id lo cubre trees_project_id_id_key (columna líder).
CREATE INDEX idx_trees_public_space ON trees (project_id, public_space_id);
CREATE INDEX idx_trees_ubicacion ON trees USING GIST (ubicacion);
CREATE INDEX idx_trees_estado_ciclo_vida ON trees (estado_ciclo_vida);
CREATE INDEX idx_trees_sector_id ON trees (sector_id);  -- migración 013

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
-- VERSIONES DE DATOS DEL ÁRBOL POR INSPECCIÓN (migración 013; §3.6)
-- ---------------------------------------------------------------------
-- Una fila por alta (sin inspección) y una por cada inspección que
-- registra o confirma datos del árbol (D-26 "conservar el historial").
-- Inspecciones parciales (CC-040): cada versión guarda solo los campos
-- que registró (`campos_registrados`); fn_refresh_tree_current (§5.1,
-- migración 014) compone los valores vigentes de `trees` a partir de
-- estas filas.

CREATE TABLE tree_data_versions (
  id                                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id                             UUID NOT NULL REFERENCES trees(id) ON DELETE RESTRICT,
  inspection_id                       UUID UNIQUE REFERENCES inspections(id),  -- NULL solo en la versión del alta
  campos_registrados                  TEXT[] NOT NULL,
  sector                              TEXT,
  ubicacion_descriptiva               TEXT,
  utm_este                            NUMERIC(10,2),
  utm_norte                           NUMERIC(10,2),
  especie_cientifica                  TEXT,
  nombre_comun                        TEXT,
  multifustal                         BOOLEAN,
  numero_fustes                       INTEGER CHECK (numero_fustes IS NULL OR numero_fustes >= 2),
  dap_fustes_cm                       NUMERIC(6,2)[],
  dap_cm                              NUMERIC(6,2) CHECK (dap_cm IS NULL OR dap_cm > 0),
  altura_total_m                      NUMERIC(6,2) CHECK (altura_total_m IS NULL OR altura_total_m > 0),
  diametro_copa_ns_m                  NUMERIC(6,2) CHECK (diametro_copa_ns_m IS NULL OR diametro_copa_ns_m >= 0),
  diametro_copa_eo_m                  NUMERIC(6,2) CHECK (diametro_copa_eo_m IS NULL OR diametro_copa_eo_m >= 0),
  copa_no_presenta                    BOOLEAN,
  diametro_copa_m                     NUMERIC(6,2)
                                        GENERATED ALWAYS AS ((diametro_copa_ns_m + diametro_copa_eo_m) / 2) STORED,
  altura_primera_rama_m               NUMERIC(6,2),
  altura_primera_rama_no_presenta     BOOLEAN,
  altura_base_copa_viva_m             NUMERIC(6,2),
  altura_base_copa_viva_no_presenta   BOOLEAN,
  clase_edad                          TEXT CHECK (clase_edad IS NULL OR clase_edad IN (
    'joven', 'semimaduro', 'tempranamente_maduro', 'maduro', 'sobremaduro'
  )),
  rango_edad_estimada_anios           TEXT CHECK (rango_edad_estimada_anios IS NULL OR rango_edad_estimada_anios IN (
    '0_5', '6_10', '11_15', '16_20', '21_25', '26_30', '31_35', '36_40',
    '41_45', '46_50', '51_55', '56_60', '61_65', '66_70', '71_75',
    '76_80', '81_85', '86_90', '91_95', '96_100', 'mas_de_100'
  )),
  created_by                          UUID NOT NULL REFERENCES user_profiles(id),
  created_at                          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_tdv_dap_fustes
    CHECK (
      dap_fustes_cm IS NULL
      OR (
        numero_fustes IS NOT NULL
        AND array_length(dap_fustes_cm, 1) = numero_fustes
        AND array_position(dap_fustes_cm, NULL) IS NULL
        AND NOT (0 >= ANY (dap_fustes_cm))
      )
    ),
  CONSTRAINT chk_tdv_copa_no_presenta
    CHECK (copa_no_presenta IS NOT TRUE OR (diametro_copa_ns_m IS NULL AND diametro_copa_eo_m IS NULL)),
  CONSTRAINT chk_tdv_primera_rama_no_presenta
    CHECK (altura_primera_rama_no_presenta IS NOT TRUE OR altura_primera_rama_m IS NULL),
  CONSTRAINT chk_tdv_base_copa_viva_no_presenta
    CHECK (altura_base_copa_viva_no_presenta IS NOT TRUE OR altura_base_copa_viva_m IS NULL),
  CONSTRAINT chk_tdv_primera_rama_le_altura
    CHECK (altura_primera_rama_m IS NULL OR altura_total_m IS NULL OR altura_primera_rama_m <= altura_total_m)
);

CREATE INDEX idx_tree_data_versions_tree ON tree_data_versions (tree_id, created_at DESC);

-- Las versiones no se modifican después de finalizar la inspección (PR-009 v5.0).

-- fn_refresh_tree_current (§5.1; migración 014): única vía de escritura
-- de los valores vigentes de trees. Depende de work_orders e
-- inspections.estado_registro/fecha_completada_ot (definidas más abajo),
-- por eso el cuerpo se agrega recién en esa migración aunque se describe
-- aquí junto a tree_data_versions.
--
-- Por cada campo: si existe una versión válida (OT completada, inspección
-- no anulada) que lo haya registrado, se usa el valor de la MÁS RECIENTE
-- de esas versiones — incluso si ese valor es NULL (p. ej. "No presenta").
-- Solo si NINGUNA versión válida registró el campo se usa el valor del
-- alta. Por eso es CASE WHEN EXISTS (...), no COALESCE: COALESCE seguiría
-- buscando hacia atrás ante un NULL legítimo, perdiendo la actualización.
CREATE FUNCTION fn_refresh_tree_current(p_tree_id UUID) RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  WITH validas AS (
    SELECT tdv.*, wo.fecha_completada_ot AS ot_fecha_completada
    FROM tree_data_versions tdv
    JOIN inspections i ON i.id = tdv.inspection_id
    JOIN work_orders wo ON wo.id = i.work_order_id
    WHERE tdv.tree_id = p_tree_id
      AND i.estado_registro <> 'anulado'
      AND wo.estado_ot = 'completada'
  ),
  alta AS (
    SELECT * FROM tree_data_versions WHERE tree_id = p_tree_id AND inspection_id IS NULL
  )
  UPDATE trees t SET
    sector = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'sector' = ANY(v.campos_registrados))
      THEN (SELECT v.sector FROM validas v WHERE 'sector' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.sector FROM alta a) END,
    ubicacion_descriptiva = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'ubicacion_descriptiva' = ANY(v.campos_registrados))
      THEN (SELECT v.ubicacion_descriptiva FROM validas v WHERE 'ubicacion_descriptiva' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.ubicacion_descriptiva FROM alta a) END,
    utm_este = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'utm_este' = ANY(v.campos_registrados))
      THEN (SELECT v.utm_este FROM validas v WHERE 'utm_este' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.utm_este FROM alta a) END,
    utm_norte = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'utm_norte' = ANY(v.campos_registrados))
      THEN (SELECT v.utm_norte FROM validas v WHERE 'utm_norte' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.utm_norte FROM alta a) END,
    especie_cientifica = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'especie_cientifica' = ANY(v.campos_registrados))
      THEN (SELECT v.especie_cientifica FROM validas v WHERE 'especie_cientifica' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.especie_cientifica FROM alta a) END,
    nombre_comun = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'nombre_comun' = ANY(v.campos_registrados))
      THEN (SELECT v.nombre_comun FROM validas v WHERE 'nombre_comun' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.nombre_comun FROM alta a) END,
    multifustal = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'multifustal' = ANY(v.campos_registrados))
      THEN (SELECT v.multifustal FROM validas v WHERE 'multifustal' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.multifustal FROM alta a) END,
    numero_fustes = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'numero_fustes' = ANY(v.campos_registrados))
      THEN (SELECT v.numero_fustes FROM validas v WHERE 'numero_fustes' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.numero_fustes FROM alta a) END,
    dap_fustes_cm = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'dap_fustes_cm' = ANY(v.campos_registrados))
      THEN (SELECT v.dap_fustes_cm FROM validas v WHERE 'dap_fustes_cm' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.dap_fustes_cm FROM alta a) END,
    dap_cm = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'dap_cm' = ANY(v.campos_registrados))
      THEN (SELECT v.dap_cm FROM validas v WHERE 'dap_cm' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.dap_cm FROM alta a) END,
    altura_total_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_total_m' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_total_m FROM validas v WHERE 'altura_total_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_total_m FROM alta a) END,
    diametro_copa_ns_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'diametro_copa_ns_m' = ANY(v.campos_registrados))
      THEN (SELECT v.diametro_copa_ns_m FROM validas v WHERE 'diametro_copa_ns_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.diametro_copa_ns_m FROM alta a) END,
    diametro_copa_eo_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'diametro_copa_eo_m' = ANY(v.campos_registrados))
      THEN (SELECT v.diametro_copa_eo_m FROM validas v WHERE 'diametro_copa_eo_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.diametro_copa_eo_m FROM alta a) END,
    copa_no_presenta = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'copa_no_presenta' = ANY(v.campos_registrados))
      THEN (SELECT v.copa_no_presenta FROM validas v WHERE 'copa_no_presenta' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.copa_no_presenta FROM alta a) END,
    altura_primera_rama_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_primera_rama_m' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_primera_rama_m FROM validas v WHERE 'altura_primera_rama_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_primera_rama_m FROM alta a) END,
    altura_primera_rama_no_presenta = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_primera_rama_no_presenta' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_primera_rama_no_presenta FROM validas v WHERE 'altura_primera_rama_no_presenta' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_primera_rama_no_presenta FROM alta a) END,
    altura_base_copa_viva_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_base_copa_viva_m' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_base_copa_viva_m FROM validas v WHERE 'altura_base_copa_viva_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_base_copa_viva_m FROM alta a) END,
    altura_base_copa_viva_no_presenta = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_base_copa_viva_no_presenta' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_base_copa_viva_no_presenta FROM validas v WHERE 'altura_base_copa_viva_no_presenta' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_base_copa_viva_no_presenta FROM alta a) END,
    clase_edad = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'clase_edad' = ANY(v.campos_registrados))
      THEN (SELECT v.clase_edad FROM validas v WHERE 'clase_edad' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.clase_edad FROM alta a) END,
    rango_edad_estimada_anios = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'rango_edad_estimada_anios' = ANY(v.campos_registrados))
      THEN (SELECT v.rango_edad_estimada_anios FROM validas v WHERE 'rango_edad_estimada_anios' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.rango_edad_estimada_anios FROM alta a) END,
    vigente_desde_inspection_id = (SELECT v.inspection_id FROM validas v ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
  WHERE t.id = p_tree_id;
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
-- ÓRDENES DE TRABAJO (migración 014; §3.7; D-231 a D-246)
-- ---------------------------------------------------------------------

CREATE SEQUENCE work_orders_codigo_i_seq START 1;
CREATE SEQUENCE work_orders_codigo_m_seq START 1;

CREATE TABLE work_orders (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_ot                     TEXT UNIQUE,  -- OT-I-000000 / OT-M-000000; lo asigna el trigger según tipo_ot
  project_id                    UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  tree_id                       UUID REFERENCES trees(id),  -- NULL solo si accion_solicitada = levantamiento
  incident_id                   UUID REFERENCES incidents(id),
  tipo_ot                       TEXT NOT NULL CHECK (tipo_ot IN ('inspeccion', 'mantenimiento')),
  accion_solicitada             TEXT NOT NULL,
  subtipo_accion                TEXT,
  motivo                        TEXT,
  prioridad                     TEXT CHECK (prioridad IS NULL OR prioridad IN ('critica', 'alta', 'media', 'baja')),
  estado_ot                     TEXT NOT NULL DEFAULT 'pendiente'
                                   CHECK (estado_ot IN ('pendiente', 'programada', 'en_ejecucion', 'completada', 'cancelada')),
  fecha_creacion_ot             DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_accion_programada       DATE,
  fecha_completada_ot           DATE,
  ot_creado_por                 UUID REFERENCES user_profiles(id),
  responsable_accion_id         UUID REFERENCES user_profiles(id),
  requiere_revision_inspector   BOOLEAN,  -- solo Mantenimiento; el trigger lo fija en Tala/Retiro_tocón
  observaciones                 TEXT,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_work_orders_tree_levantamiento
    CHECK ((tree_id IS NULL) = (accion_solicitada = 'levantamiento')),
  CONSTRAINT chk_work_orders_completada_fecha
    CHECK ((estado_ot = 'completada') = (fecha_completada_ot IS NOT NULL)),
  -- fecha_accion_programada obligatoria desde programada (D-241).
  CONSTRAINT chk_work_orders_fecha_programada
    CHECK (estado_ot = 'pendiente' OR fecha_accion_programada IS NOT NULL),
  -- observaciones obligatoria en Levantamiento y Otra/Otra_Intervención (D-246).
  CONSTRAINT chk_work_orders_observaciones
    CHECK (accion_solicitada NOT IN ('levantamiento', 'otra', 'otra_intervencion') OR observaciones IS NOT NULL),
  -- Destino de la FK compuesta de maintenance_records (coherencia con tipo_ot).
  CONSTRAINT work_orders_id_tipo_ot_key UNIQUE (id, tipo_ot)
);

CREATE INDEX idx_work_orders_project ON work_orders (project_id);
CREATE INDEX idx_work_orders_tree ON work_orders (tree_id);
CREATE INDEX idx_work_orders_estado ON work_orders (estado_ot);

CREATE TRIGGER trg_work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE FUNCTION fn_set_work_order_codigo() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.codigo_ot IS NULL THEN
    IF NEW.tipo_ot = 'inspeccion' THEN
      NEW.codigo_ot := 'OT-I-' || LPAD(nextval('work_orders_codigo_i_seq')::text, 6, '0');
    ELSE
      NEW.codigo_ot := 'OT-M-' || LPAD(nextval('work_orders_codigo_m_seq')::text, 6, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_orders_codigo
  BEFORE INSERT ON work_orders
  FOR EACH ROW EXECUTE FUNCTION fn_set_work_order_codigo();

CREATE FUNCTION fn_fix_requiere_revision_inspector() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.subtipo_accion IN ('tala', 'retiro_tocon') THEN
    NEW.requiere_revision_inspector := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_orders_revision_inspector
  BEFORE INSERT OR UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION fn_fix_requiere_revision_inspector();

-- ---------------------------------------------------------------------
-- INSPECCIONES (reutilizada en la migración 014; §3.8; D-191 a D-212)
-- ---------------------------------------------------------------------
-- `estado_registro`: preguardado / finalizado / anulado (CC-031; D-209;
-- renombrada desde `estado`, antes borrador/completada). anulado solo
-- desde finalizado (trigger). `rule_version` con formato MAJOR.MINOR.
--
-- Nota sobre ON DELETE: toda la cadena inspections -> defect_observations
-- -> defect_results / component_assessments / vitality_assessments /
-- risk_evaluations usa ON DELETE RESTRICT (no CASCADE); esas tablas son
-- del modelo anterior (001) y se retiran en la migración 018.

CREATE TABLE inspections (
  id                                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id                           UUID NOT NULL REFERENCES trees(id),
  inspector                         UUID REFERENCES user_profiles(id),             -- renombrado desde inspector_id
  fecha_inspeccion                  DATE NOT NULL DEFAULT CURRENT_DATE,            -- renombrado desde fecha
  codigo_inspeccion                 TEXT UNIQUE DEFAULT ('INS-' || LPAD(nextval('inspections_codigo_seq')::text, 6, '0')),
  work_order_id                     UUID NOT NULL REFERENCES work_orders(id),
  tipo_inspeccion_realizada         TEXT,
  subtipo_inspeccion                TEXT,
  metodo_instrumental               TEXT,
  resultado_general                 TEXT,
  requiere_mantenimiento            BOOLEAN,
  fecha_proxima_inspeccion_sugerida DATE,
  fecha_proxima_inspeccion          DATE,
  fecha_proximo_monitoreo_sugerida  DATE,
  fecha_proximo_monitoreo           DATE,
  justificacion_ajuste_fecha        TEXT,
  ajuste_fecha_por                  UUID REFERENCES user_profiles(id),
  fecha_ajuste_fecha                TIMESTAMPTZ,
  observaciones                     TEXT,
  registrado_por                    UUID REFERENCES user_profiles(id),
  fecha_registro                    DATE,
  estado_registro                   TEXT NOT NULL DEFAULT 'preguardado'            -- renombrado desde estado
                                       CHECK (estado_registro IN ('preguardado', 'finalizado', 'anulado')),
  motivo_anulacion                  TEXT,
  anulado_por                       UUID REFERENCES user_profiles(id),
  fecha_anulacion                   TIMESTAMPTZ,
  rule_version                      TEXT NOT NULL CHECK (rule_version ~ '^[0-9]+\.[0-9]+$'),
  finalizada_at                     TIMESTAMPTZ,                                   -- renombrado desde completed_at
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_inspections_finalizada_at
    CHECK ((estado_registro = 'finalizado') = (finalizada_at IS NOT NULL) OR estado_registro = 'anulado'),
  CONSTRAINT chk_inspections_anulacion
    CHECK (
      (estado_registro = 'anulado' AND motivo_anulacion IS NOT NULL AND anulado_por IS NOT NULL AND fecha_anulacion IS NOT NULL)
      OR
      (estado_registro <> 'anulado' AND motivo_anulacion IS NULL AND anulado_por IS NULL AND fecha_anulacion IS NULL)
    ),
  CONSTRAINT chk_inspections_justificacion_ajuste_fecha
    CHECK (
      justificacion_ajuste_fecha IS NOT NULL
      OR (fecha_proxima_inspeccion IS NULL OR fecha_proxima_inspeccion_sugerida IS NULL OR fecha_proxima_inspeccion = fecha_proxima_inspeccion_sugerida)
      AND (fecha_proximo_monitoreo IS NULL OR fecha_proximo_monitoreo_sugerida IS NULL OR fecha_proximo_monitoreo = fecha_proximo_monitoreo_sugerida)
    ),
  -- Destino de la FK compuesta de evaluations (coherencia tree_id).
  CONSTRAINT inspections_id_tree_id_key UNIQUE (id, tree_id)
);

CREATE SEQUENCE inspections_codigo_seq START 1;

CREATE INDEX idx_inspections_tree ON inspections (tree_id, fecha_inspeccion DESC);
CREATE INDEX idx_inspections_estado_registro ON inspections (estado_registro);
CREATE INDEX idx_inspections_work_order ON inspections (work_order_id);

-- anulado solo desde finalizado (CC-031).
CREATE FUNCTION fn_check_inspection_anulacion() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.estado_registro = 'anulado' AND OLD.estado_registro <> 'finalizado' THEN
    RAISE EXCEPTION 'Una inspección solo puede anularse desde finalizado (actual: %)', OLD.estado_registro;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inspections_anulacion
  BEFORE UPDATE ON inspections
  FOR EACH ROW
  WHEN (NEW.estado_registro = 'anulado' AND OLD.estado_registro IS DISTINCT FROM NEW.estado_registro)
  EXECUTE FUNCTION fn_check_inspection_anulacion();

-- Coherencia: inspections.tree_id debe ser el de su OT, salvo
-- Levantamiento (la OT no tiene árbol todavía).
CREATE FUNCTION fn_check_inspection_tree_coherente() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_wo_tree_id UUID;
BEGIN
  SELECT tree_id INTO v_wo_tree_id FROM work_orders WHERE id = NEW.work_order_id;
  IF v_wo_tree_id IS NOT NULL AND v_wo_tree_id <> NEW.tree_id THEN
    RAISE EXCEPTION 'La inspección % no coincide con el árbol de su OT', NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inspections_tree_coherente
  BEFORE INSERT OR UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION fn_check_inspection_tree_coherente();

-- OT no completada con inspecciones preguardadas (§5.2; D-239).
CREATE FUNCTION fn_check_ot_completada() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.estado_ot = 'completada' AND EXISTS (
    SELECT 1 FROM inspections WHERE work_order_id = NEW.id AND estado_registro = 'preguardado'
  ) THEN
    RAISE EXCEPTION 'La OT % tiene inspecciones en preguardado: no puede completarse', NEW.codigo_ot;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_orders_completada
  BEFORE UPDATE ON work_orders
  FOR EACH ROW
  WHEN (NEW.estado_ot = 'completada' AND OLD.estado_ot IS DISTINCT FROM NEW.estado_ot)
  EXECUTE FUNCTION fn_check_ot_completada();

-- ---------------------------------------------------------------------
-- EVALUACIONES, AJUSTES Y EVALUACIÓN VIGENTE (migración 014; §3.9–§3.10 bis)
-- ---------------------------------------------------------------------

CREATE TABLE evaluations (
  id                                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id                            UUID NOT NULL UNIQUE REFERENCES inspections(id) ON DELETE RESTRICT,
  tree_id                                  UUID NOT NULL REFERENCES trees(id) ON DELETE RESTRICT,
  variables                                JSONB NOT NULL,              -- lo registrado en esta inspección (según su alcance, CC-040)
  variables_calculo                        JSONB NOT NULL,              -- lo registrado + valores vigentes del árbol para el resto
  calculados                               JSONB,
  indicadores                              JSONB,
  puntaje_raices_cuello                    INTEGER CHECK (puntaje_raices_cuello IS NULL OR (puntaje_raices_cuello >= 0 AND puntaje_raices_cuello <= 9)),
  probabilidad_falla_raices_cuello         TEXT CHECK (probabilidad_falla_raices_cuello IS NULL OR probabilidad_falla_raices_cuello IN ('improbable', 'posible', 'probable', 'inminente', 'no_determinado')),
  puntaje_tronco                           INTEGER CHECK (puntaje_tronco IS NULL OR (puntaje_tronco >= 0 AND puntaje_tronco <= 14)),
  probabilidad_falla_tronco                TEXT CHECK (probabilidad_falla_tronco IS NULL OR probabilidad_falla_tronco IN ('improbable', 'posible', 'probable', 'inminente', 'no_determinado')),
  puntaje_copa_ramas                       INTEGER CHECK (puntaje_copa_ramas IS NULL OR (puntaje_copa_ramas >= 0 AND puntaje_copa_ramas <= 8)),  -- R03 con defoliación (CC-027)
  probabilidad_falla_copa_ramas            TEXT CHECK (probabilidad_falla_copa_ramas IS NULL OR probabilidad_falla_copa_ramas IN ('improbable', 'posible', 'probable', 'inminente', 'no_determinado')),
  probabilidad_impacto                     TEXT,
  clasificacion_raices_cuello              TEXT,
  clasificacion_tronco                     TEXT,
  clasificacion_copa_ramas                 TEXT,
  clasificacion_riesgo_calculada           TEXT,
  puntaje_infraestructura                  NUMERIC,
  pct_infraestructura                      NUMERIC,
  clasificacion_infraestructura_calculada  TEXT,
  clasificacion_prioridad_calculada        TEXT,
  clasificacion_riesgo_ajustada            TEXT,
  clasificacion_infraestructura_ajustada   TEXT,
  clasificacion_prioridad_ajustada         TEXT,
  rule_version                             TEXT NOT NULL CHECK (rule_version ~ '^[0-9]+\.[0-9]+$'),
  motor_commit                             TEXT NOT NULL,
  calculado_at                             TIMESTAMPTZ,
  created_at                               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                                TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Coherencia: la evaluación es del mismo árbol que su inspección.
  CONSTRAINT evaluations_inspection_tree_fkey
    FOREIGN KEY (inspection_id, tree_id) REFERENCES inspections (id, tree_id)
);

CREATE INDEX idx_evaluations_tree ON evaluations (tree_id, created_at DESC);

CREATE TRIGGER trg_evaluations_updated_at
  BEFORE UPDATE ON evaluations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Historial de ajustes del Inspector (§3.10). Solo mientras la
-- inspección está preguardado (PR-009 v5.0, enforzado en backend).
CREATE TABLE classification_adjustments (
  id                                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id                       UUID NOT NULL REFERENCES evaluations(id) ON DELETE RESTRICT,
  campo                               TEXT NOT NULL CHECK (campo IN ('clasificacion_riesgo', 'clasificacion_infraestructura', 'clasificacion_prioridad')),
  valor_calculado                     TEXT,
  valor_ajustado                      TEXT NOT NULL,
  justificacion_ajuste_clasificacion  TEXT NOT NULL,
  ajustado_por                        UUID NOT NULL REFERENCES user_profiles(id),
  fecha_ajuste                        TIMESTAMPTZ NOT NULL DEFAULT now(),
  rule_version                        TEXT CHECK (rule_version IS NULL OR rule_version ~ '^[0-9]+\.[0-9]+$')
);

CREATE INDEX idx_classification_adjustments_evaluation ON classification_adjustments (evaluation_id);

-- Evaluación vigente del árbol, recalculada campo por campo (§3.10 bis).
-- Solo se agregan filas; la más reciente por árbol es la vigente.
-- Momento y orquestación: backend, no esta tabla (§3.10 bis, §5.3).
CREATE TABLE tree_assessments (
  id                                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id                                  UUID NOT NULL REFERENCES trees(id) ON DELETE RESTRICT,
  evento                                   TEXT NOT NULL CHECK (evento IN ('ot_completada', 'inspeccion_anulada')),
  work_order_id                            UUID REFERENCES work_orders(id),
  inspection_id                            UUID REFERENCES inspections(id),
  entradas_vigentes                        JSONB NOT NULL,              -- composición campo por campo (v_tree_current_inputs)
  calculados                               JSONB,
  indicadores                              JSONB,
  puntaje_raices_cuello                    INTEGER,
  probabilidad_falla_raices_cuello         TEXT CHECK (probabilidad_falla_raices_cuello IS NULL OR probabilidad_falla_raices_cuello IN ('improbable', 'posible', 'probable', 'inminente', 'no_determinado')),
  puntaje_tronco                           INTEGER,
  probabilidad_falla_tronco                TEXT CHECK (probabilidad_falla_tronco IS NULL OR probabilidad_falla_tronco IN ('improbable', 'posible', 'probable', 'inminente', 'no_determinado')),
  puntaje_copa_ramas                       INTEGER,
  probabilidad_falla_copa_ramas            TEXT CHECK (probabilidad_falla_copa_ramas IS NULL OR probabilidad_falla_copa_ramas IN ('improbable', 'posible', 'probable', 'inminente', 'no_determinado')),
  probabilidad_impacto                     TEXT,
  clasificacion_raices_cuello              TEXT,
  clasificacion_tronco                     TEXT,
  clasificacion_copa_ramas                 TEXT,
  clasificacion_riesgo_calculada           TEXT,
  puntaje_infraestructura                  NUMERIC,
  pct_infraestructura                      NUMERIC,
  clasificacion_infraestructura_calculada  TEXT,
  clasificacion_prioridad_calculada        TEXT,
  clasificacion_riesgo_ajustada             TEXT,
  clasificacion_infraestructura_ajustada   TEXT,
  clasificacion_prioridad_ajustada         TEXT,
  adjustment_ids                           UUID[],                      -- ajustes que siguen vigentes
  ajustes_descartados                      JSONB,                       -- CC-040 (d)
  requiere_revision_ajuste                 BOOLEAN NOT NULL DEFAULT false,
  rule_version                             TEXT NOT NULL CHECK (rule_version ~ '^[0-9]+\.[0-9]+$'),
  motor_commit                             TEXT NOT NULL,
  created_at                               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tree_assessments_tree ON tree_assessments (tree_id, created_at DESC);

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

-- Adaptada en la migración 015 (§3.12; D-174 a D-190; CC-036). Columnas
-- antiguas que el diseño retira (reportado_por_user_id, observacion,
-- actualizado_por, prioridad) NO se eliminan aquí: eso es la migración
-- 018.
CREATE TABLE incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_incidencia TEXT DEFAULT ('INC-' || lpad(nextval('incidents_codigo_seq')::text, 6, '0')),
  tree_id          UUID NOT NULL,               -- entrada siempre por QR (D-175; AMD-34; migración 015)
  project_id        UUID NOT NULL,                -- multiproyecto (002/004): DIRECTO (tree_id es nullable). NOT NULL final desde 004
  tipo_incidencia   TEXT NOT NULL,               -- renombrado desde `tipo` (D-180; migración 015)
  descripcion         TEXT,
  estado_incidencia     TEXT NOT NULL DEFAULT 'ingresada'  -- renombrado desde `estado` (D-184; migración 015)
                          CHECK (estado_incidencia IN ('ingresada', 'en_revision', 'derivada', 'resuelta', 'descartada')),
  prioridad               TEXT,
  origen_reporte              TEXT                   -- D-177; migración 015: tighten a los 4 códigos del Excel
                                CHECK (origen_reporte IS NULL OR origen_reporte IN ('comunidad', 'municipalidad', 'bomberos', 'otro_organismo')),
  reportado_por_user_id         UUID REFERENCES user_profiles(id),  -- nullable: solo si el reporte
                                                                     -- viene de un usuario identificado del sistema
  observacion                     TEXT,                   -- bitácora de lo realizado (rol usuario)
  actualizado_por                 UUID REFERENCES user_profiles(id),
  fecha_actualizacion_estado         TIMESTAMPTZ,            -- renombrado desde `fecha_actualizacion` (D-190; migración 015)
  fecha_reporte                        DATE,                    -- D-176; migración 015
  ubicacion                              TEXT,                    -- D-182: copia de ubicacion_descriptiva del árbol al reportar
  fecha_revision                           TIMESTAMPTZ,
  revisado_por                               UUID REFERENCES user_profiles(id),
  resultado_revision                           TEXT CHECK (resultado_revision IS NULL OR resultado_revision IN ('validada', 'descartada', 'requiere_antecedentes')),
  observaciones_revision                         TEXT,
  prioridad_municipal                               TEXT CHECK (prioridad_municipal IS NULL OR prioridad_municipal IN ('critica', 'alta', 'media', 'baja')),
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
CREATE INDEX idx_incidents_estado ON incidents (estado_incidencia);
CREATE UNIQUE INDEX uq_incidents_codigo ON incidents (codigo_incidencia);

CREATE TRIGGER trg_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- incident_reporters (nueva, migración 015): datos personales del
-- reportante (PR-022), separados para que la RLS los muestre solo al
-- Usuario municipal del proyecto (§6).
CREATE TABLE incident_reporters (
  incident_id       UUID PRIMARY KEY REFERENCES incidents(id) ON DELETE CASCADE,
  nombre_reportante TEXT NOT NULL CHECK (char_length(nombre_reportante) <= 100),
  -- Formato (NN...N-D o NN...N-K); el dígito verificador se valida en
  -- el backend (Zod), no aquí.
  rut_reportante    TEXT NOT NULL CHECK (rut_reportante ~ '^[0-9]{1,8}-[0-9kK]$')
);

-- Al validar o descartar, se borra la fila (nombre y RUT). Con
-- "requiere_antecedentes" se conserva.
CREATE FUNCTION fn_clear_incident_reporter() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.resultado_revision IN ('validada', 'descartada') THEN
    DELETE FROM incident_reporters WHERE incident_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_incidents_clear_reporter
  AFTER UPDATE ON incidents
  FOR EACH ROW
  WHEN (NEW.resultado_revision IS DISTINCT FROM OLD.resultado_revision)
  EXECUTE FUNCTION fn_clear_incident_reporter();

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

-- MANTENIMIENTO (migración 014; §3.11; D-213 a D-230) — reemplaza a
-- `maintenance` (que se retira en la migración 018).
CREATE SEQUENCE maintenance_records_codigo_seq START 1;

CREATE TABLE maintenance_records (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_mantenimiento      TEXT UNIQUE DEFAULT ('MAN-' || LPAD(nextval('maintenance_records_codigo_seq')::text, 6, '0')),
  work_order_id             UUID NOT NULL REFERENCES work_orders(id),
  tree_id                   UUID NOT NULL REFERENCES trees(id),
  fecha_ejecucion           DATE NOT NULL,
  ejecutado_por             UUID REFERENCES user_profiles(id),
  accion_ejecutada          TEXT NOT NULL,
  subtipo_ejecutado         TEXT,
  resultado                 TEXT NOT NULL CHECK (resultado IN ('ejecutado_completamente', 'ejecutado_parcialmente', 'no_ejecutado')),
  observaciones             TEXT,
  requiere_seguimiento      BOOLEAN,
  fecha_seguimiento         DATE,
  estado_revision           TEXT CHECK (estado_revision IS NULL OR estado_revision IN ('pendiente_revision', 'aprobado', 'rechazado')),
  revisado_por              UUID REFERENCES user_profiles(id),
  fecha_revision            TIMESTAMPTZ,
  observaciones_revision    TEXT,
  requiere_correccion       BOOLEAN,
  fecha_limite_correccion   DATE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_maintenance_records_work_order ON maintenance_records (work_order_id);
CREATE INDEX idx_maintenance_records_tree ON maintenance_records (tree_id);

-- Coherencia: la OT debe ser de tipo mantenimiento y del mismo árbol.
CREATE FUNCTION fn_check_maintenance_record_ot() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_wo_tipo_ot TEXT;
  v_wo_tree_id UUID;
BEGIN
  SELECT tipo_ot, tree_id INTO v_wo_tipo_ot, v_wo_tree_id FROM work_orders WHERE id = NEW.work_order_id;
  IF v_wo_tipo_ot IS DISTINCT FROM 'mantenimiento' THEN
    RAISE EXCEPTION 'maintenance_records.work_order_id debe ser una OT de tipo mantenimiento';
  END IF;
  IF v_wo_tree_id IS DISTINCT FROM NEW.tree_id THEN
    RAISE EXCEPTION 'maintenance_records.tree_id debe coincidir con el árbol de su OT';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_maintenance_records_ot
  BEFORE INSERT OR UPDATE ON maintenance_records
  FOR EACH ROW EXECUTE FUNCTION fn_check_maintenance_record_ot();

-- Cierre automático de la OT (RG "Revisión de mantenimiento") y demás
-- orquestación: backend, no trigger de base (§5.3).

-- ---------------------------------------------------------------------
-- FOTOGRAFÍAS
-- ---------------------------------------------------------------------
-- Relación directa Tree -> Photo (no por inspección/incidencia/intervención
-- salvo que se defina posteriormente). Límite de 20 por árbol validado en
-- frontend y backend, NO como CHECK constraint (el conteo depende de filas
-- relacionadas, no de un valor propio de la fila). Si más adelante se
-- requiere garantía a nivel de base de datos, se añade un trigger
-- BEFORE INSERT — no implementado en esta versión.

-- Adaptada en la migración 015 (§3.13; D-27, D-183, D-206, D-224).
-- photo_type / description no están en el Excel; el diseño no las lista
-- para retiro explícito, se dejan para una decisión aparte.
CREATE TABLE photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id       UUID NOT NULL REFERENCES trees(id) ON DELETE RESTRICT,
  storage_path   TEXT NOT NULL,               -- ruta en Supabase Storage
  photo_type       TEXT,
  description        TEXT,
  uploaded_by          UUID REFERENCES user_profiles(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  inspection_id            UUID REFERENCES inspections(id),
  maintenance_record_id     UUID REFERENCES maintenance_records(id),
  incident_id                UUID REFERENCES incidents(id),
  vista                         TEXT CHECK (vista IS NULL OR vista IN ('arbol_completo', 'base', 'tronco', 'copa')),

  -- A lo más un origen (inspección, mantención o incidencia).
  CONSTRAINT chk_photos_un_solo_origen
    CHECK (
      (CASE WHEN inspection_id IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN maintenance_record_id IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN incident_id IS NOT NULL THEN 1 ELSE 0 END)
      <= 1
    )
);

CREATE INDEX idx_photos_tree ON photos (tree_id);
CREATE INDEX idx_photos_inspection ON photos (inspection_id);
CREATE INDEX idx_photos_maintenance_record ON photos (maintenance_record_id);
CREATE INDEX idx_photos_incident ON photos (incident_id);

-- Coherencia: si la foto se vincula a una inspección, mantención o
-- incidencia, debe ser del mismo árbol.
CREATE FUNCTION fn_check_photo_tree_coherente() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ref_tree_id UUID;
BEGIN
  IF NEW.inspection_id IS NOT NULL THEN
    SELECT tree_id INTO v_ref_tree_id FROM inspections WHERE id = NEW.inspection_id;
  ELSIF NEW.maintenance_record_id IS NOT NULL THEN
    SELECT tree_id INTO v_ref_tree_id FROM maintenance_records WHERE id = NEW.maintenance_record_id;
  ELSIF NEW.incident_id IS NOT NULL THEN
    SELECT tree_id INTO v_ref_tree_id FROM incidents WHERE id = NEW.incident_id;
  ELSE
    RETURN NEW;
  END IF;
  IF v_ref_tree_id IS DISTINCT FROM NEW.tree_id THEN
    RAISE EXCEPTION 'photos.tree_id debe coincidir con el árbol de la inspección, mantención o incidencia vinculada';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_photos_tree_coherente
  BEFORE INSERT OR UPDATE ON photos
  FOR EACH ROW EXECUTE FUNCTION fn_check_photo_tree_coherente();

-- ---------------------------------------------------------------------
-- VISTAS DE VALORES DERIVADOS (migración 016; §4)
-- ---------------------------------------------------------------------

-- estado_presencia y fecha_cambio_estado_presencia (D-28, D-29;
-- PR-020 v1.1). Talado/Retirado solo con OT completada + mantenimiento
-- aprobado de Tala o Retiro_tocón.
CREATE VIEW v_tree_presence WITH (security_invoker = true) AS
WITH cierre AS (
  SELECT
    wo.tree_id,
    wo.subtipo_accion,
    mr.fecha_revision,
    ROW_NUMBER() OVER (PARTITION BY wo.tree_id ORDER BY mr.fecha_revision DESC) AS rn
  FROM work_orders wo
  JOIN maintenance_records mr ON mr.work_order_id = wo.id
  WHERE wo.estado_ot = 'completada'
    AND wo.subtipo_accion IN ('tala', 'retiro_tocon')
    AND mr.estado_revision = 'aprobado'
)
SELECT
  t.id AS tree_id,
  CASE
    WHEN c.subtipo_accion = 'tala' THEN 'talado'
    WHEN c.subtipo_accion = 'retiro_tocon' THEN 'retirado'
    ELSE 'presente'
  END AS estado_presencia,
  COALESCE(c.fecha_revision::date, t.fecha_registro) AS fecha_cambio_estado_presencia
FROM trees t
LEFT JOIN cierre c ON c.tree_id = t.id AND c.rn = 1;

-- Inspección + nivel_riesgo (riesgo efectivo: ajustado si existe, si no,
-- calculado). D-200.
CREATE VIEW v_inspections WITH (security_invoker = true) AS
SELECT
  i.*,
  COALESCE(e.clasificacion_riesgo_ajustada, e.clasificacion_riesgo_calculada) AS nivel_riesgo
FROM inspections i
LEFT JOIN evaluations e ON e.inspection_id = i.id;

-- Entradas vigentes de REGISTRO_EVALUACION, compuestas campo por campo
-- desde evaluations.variables (CC-040; RG "Historial y vigencia").
-- entradas_vigentes: el valor más reciente de cada clave;
-- origen_por_campo: la inspección que lo aportó.
CREATE VIEW v_tree_current_inputs WITH (security_invoker = true) AS
WITH validas AS (
  SELECT
    e.tree_id,
    e.inspection_id,
    wo.fecha_completada_ot,
    kv.key,
    kv.value
  FROM evaluations e
  JOIN inspections i ON i.id = e.inspection_id
  JOIN work_orders wo ON wo.id = i.work_order_id
  CROSS JOIN LATERAL jsonb_each(e.variables) AS kv(key, value)
  WHERE i.estado_registro <> 'anulado'
    AND wo.estado_ot = 'completada'
),
ranked AS (
  SELECT
    tree_id, key, value, inspection_id,
    ROW_NUMBER() OVER (PARTITION BY tree_id, key ORDER BY fecha_completada_ot DESC) AS rn
  FROM validas
)
SELECT
  tree_id,
  jsonb_object_agg(key, value) AS entradas_vigentes,
  jsonb_object_agg(key, to_jsonb(inspection_id)) AS origen_por_campo
FROM ranked
WHERE rn = 1
GROUP BY tree_id;

-- Evaluación vigente del árbol = la fila más reciente de
-- tree_assessments (D-242 L; CC-031; CC-040). Sin filas: "Evaluación
-- pendiente" (lo interpreta la aplicación; no hay fila vacía aquí).
CREATE VIEW v_tree_current_assessment WITH (security_invoker = true) AS
SELECT DISTINCT ON (tree_id) *
FROM tree_assessments
ORDER BY tree_id, created_at DESC;

-- Árbol + rasgos del catálogo por especie_cientifica normalizada
-- (D-257 a D-262; CC-039). "no_determinado" si no hay especie en el
-- catálogo.
CREATE VIEW v_species_traits WITH (security_invoker = true) AS
SELECT
  t.id AS tree_id,
  COALESCE(s.origen_biogeografico, 'no_determinado') AS origen_biogeografico,
  s.persistencia_follaje,
  s.tipo_hoja,
  s.genero,
  s.familia
FROM trees t
LEFT JOIN species s
  ON lower(regexp_replace(trim(t.especie_cientifica), '\s+', ' ', 'g'))
   = lower(regexp_replace(trim(s.especie_cientifica), '\s+', ' ', 'g'));

-- Por proyecto: próxima inspección y monitoreo de cada árbol, con la
-- fecha ajustada si existe (D-202, D-203; CC-037). El rango
-- (inicio/término) lo calcula el backend desde nivel_riesgo con su
-- tabla de plazos — "Impacto en BD: ninguno adicional" (CC-037).
CREATE VIEW v_upcoming_inspections WITH (security_invoker = true) AS
SELECT DISTINCT ON (t.id)
  t.project_id,
  t.id AS tree_id,
  i.id AS inspection_id,
  COALESCE(i.fecha_proxima_inspeccion, i.fecha_proxima_inspeccion_sugerida) AS fecha_proxima_inspeccion,
  COALESCE(i.fecha_proximo_monitoreo, i.fecha_proximo_monitoreo_sugerida) AS fecha_proximo_monitoreo,
  COALESCE(e.clasificacion_riesgo_ajustada, e.clasificacion_riesgo_calculada) AS nivel_riesgo
FROM trees t
JOIN inspections i ON i.tree_id = t.id AND i.estado_registro = 'finalizado'
LEFT JOIN evaluations e ON e.inspection_id = i.id
ORDER BY t.id, i.fecha_inspeccion DESC, i.created_at DESC;

-- ---------------------------------------------------------------------
-- FUNCIONES Y TRIGGERS DE BLOQUEO DE PROYECTO CERRADO (migración 017;
-- RG fila 27; CC-042). Las políticas RLS y los GRANT/REVOKE de la 017
-- (CC-033) NO están en este archivo — por convención (ver nota de RLS
-- más abajo), viven solo en la migración.
-- ---------------------------------------------------------------------

CREATE FUNCTION public.has_project_role(p_project_id uuid, p_roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.get_user_role() = ANY(p_roles)
     AND public.is_project_member(p_project_id);
$$;

-- Resuelve el project_id de una fila (OLD o NEW, como jsonb) según cómo
-- la tabla protegida llega a él.
CREATE FUNCTION public.fn_resolve_project_id(p_row jsonb, p_mode text)
RETURNS uuid LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result uuid;
BEGIN
  IF p_row IS NULL THEN
    RETURN NULL;
  END IF;
  CASE p_mode
    WHEN 'direct' THEN
      v_result := (p_row->>'project_id')::uuid;
    WHEN 'via_tree' THEN
      SELECT project_id INTO v_result FROM trees WHERE id = (p_row->>'tree_id')::uuid;
    WHEN 'via_evaluation' THEN
      SELECT t.project_id INTO v_result
        FROM evaluations e JOIN trees t ON t.id = e.tree_id
        WHERE e.id = (p_row->>'evaluation_id')::uuid;
    WHEN 'via_incident' THEN
      SELECT project_id INTO v_result FROM incidents WHERE id = (p_row->>'incident_id')::uuid;
  END CASE;
  RETURN v_result;
END;
$$;

-- Bloquea INSERT/UPDATE/DELETE en las tablas de un proyecto cerrado.
-- Revisa el proyecto de OLD y de NEW (no se puede sacar ni meter una
-- fila de un proyecto cerrado cambiando tree_id/project_id). Se aplica
-- igual con service_role: BYPASSRLS omite las políticas, nunca los
-- triggers — por eso este control es un trigger y no una policy.
CREATE FUNCTION public.fn_check_proyecto_no_cerrado() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_mode text := TG_ARGV[0];
  v_project_old uuid;
  v_project_new uuid;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_project_old := public.fn_resolve_project_id(to_jsonb(OLD), v_mode);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_project_new := public.fn_resolve_project_id(to_jsonb(NEW), v_mode);
  END IF;

  IF v_project_old IS NOT NULL AND EXISTS (
    SELECT 1 FROM projects WHERE id = v_project_old AND estado_proyecto = 'cerrado'
  ) THEN
    RAISE EXCEPTION 'El proyecto % está cerrado: solo consulta (RG fila 27; CC-042)', v_project_old;
  END IF;

  IF v_project_new IS NOT NULL AND v_project_new IS DISTINCT FROM v_project_old AND EXISTS (
    SELECT 1 FROM projects WHERE id = v_project_new AND estado_proyecto = 'cerrado'
  ) THEN
    RAISE EXCEPTION 'El proyecto % está cerrado: solo consulta (RG fila 27; CC-042)', v_project_new;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Aplicado (modo entre paréntesis) en: trees, sectors, work_orders,
-- incidents ('direct'); tree_data_versions, inspections, evaluations,
-- tree_assessments, maintenance_records, photos ('via_tree');
-- classification_adjustments ('via_evaluation'); incident_reporters
-- ('via_incident'). Sin trigger en project_members (el Administrador
-- sigue gestionando miembros con el proyecto cerrado).
CREATE TRIGGER trg_trees_proyecto_cerrado BEFORE INSERT OR UPDATE OR DELETE ON trees FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('direct');
CREATE TRIGGER trg_sectors_proyecto_cerrado BEFORE INSERT OR UPDATE OR DELETE ON sectors FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('direct');
CREATE TRIGGER trg_work_orders_proyecto_cerrado BEFORE INSERT OR UPDATE OR DELETE ON work_orders FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('direct');
CREATE TRIGGER trg_incidents_proyecto_cerrado BEFORE INSERT OR UPDATE OR DELETE ON incidents FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('direct');
CREATE TRIGGER trg_tree_data_versions_proyecto_cerrado BEFORE INSERT OR UPDATE OR DELETE ON tree_data_versions FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('via_tree');
CREATE TRIGGER trg_inspections_proyecto_cerrado BEFORE INSERT OR UPDATE OR DELETE ON inspections FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('via_tree');
CREATE TRIGGER trg_evaluations_proyecto_cerrado BEFORE INSERT OR UPDATE OR DELETE ON evaluations FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('via_tree');
CREATE TRIGGER trg_tree_assessments_proyecto_cerrado BEFORE INSERT OR UPDATE OR DELETE ON tree_assessments FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('via_tree');
CREATE TRIGGER trg_maintenance_records_proyecto_cerrado BEFORE INSERT OR UPDATE OR DELETE ON maintenance_records FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('via_tree');
CREATE TRIGGER trg_photos_proyecto_cerrado BEFORE INSERT OR UPDATE OR DELETE ON photos FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('via_tree');
CREATE TRIGGER trg_classification_adjustments_proyecto_cerrado BEFORE INSERT OR UPDATE OR DELETE ON classification_adjustments FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('via_evaluation');
CREATE TRIGGER trg_incident_reporters_proyecto_cerrado BEFORE INSERT OR UPDATE OR DELETE ON incident_reporters FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('via_incident');

-- La propia fila de projects: decisión de la responsable (2026-10-21)
-- — "solo consulta" (RG fila 27) incluye la propia fila del proyecto:
-- con el proyecto cerrado se bloquea cualquier cambio salvo la
-- transición de estado_proyecto (cerrar/reabrir).
CREATE FUNCTION public.fn_check_project_self_closed() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.estado_proyecto = 'cerrado'
     AND NEW.estado_proyecto = 'cerrado'
     AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'El proyecto % está cerrado: solo puede reabrirse, no editarse (RG fila 27; CC-042)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_projects_self_closed
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION fn_check_project_self_closed();

-- =====================================================================
-- FIN schema.sql
--
-- Pendientes explícitos que este esquema NO resuelve (por diseño):
--   - probability_thresholds: sin filas (rangos numéricos por entregar)
--   - risk_evaluations: sin lógica de cálculo (impacto/consecuencias/matriz)
--   - RLS: definida en migraciones (005, 006, 007, 008, 010, 011, 017), no
--     aquí. 017 (CC-033) deja todas las tablas solo con políticas SELECT
--     por rol; las políticas y los GRANT/REVOKE viven solo en la
--     migración. spatial_ref_sys (PostGIS) conserva privilegios de
--     escritura para los roles de la API: la tabla pertenece a
--     supabase_admin (issue #9).
--   - Storage (fotos): sin bucket ni políticas todavía — AM-14 (roadmap).
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
