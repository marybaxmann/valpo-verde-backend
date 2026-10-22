-- =====================================================================
-- Migración 013 — Sectores y árboles
-- Diseño Fase 3 §3.3–§3.5, §7 paso 3; CC-028 P3; ADR-016; D-6 a D-29;
-- D-252 a D-256. Issue #39.
--
-- Aditiva: las columnas antiguas de `trees` (legacy_id, species_id, dap,
-- altura_total, diametro_copa, altura_primera_rama, direccion, comuna,
-- lugar_referencia, public_space_id, estado_ciclo_vida) NO se retiran
-- aquí — eso es la migración 018 (§7 paso 9, aparte, con autorización).
--
-- fn_refresh_tree_current (§5.1) necesita `work_orders` e
-- `inspections.estado_registro`/`fecha_completada_ot` (vía `work_orders`),
-- que llegan en la migración 014: se crea ahí, no en esta.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. sectors (nueva): D-252 a D-256; AMD-32; CC-041
-- ---------------------------------------------------------------------
CREATE TABLE sectors (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL UNIQUE
                          REFERENCES projects(id) ON DELETE RESTRICT,  -- un sector por proyecto (D-253)
  nombre_sector         TEXT NOT NULL,
  geometria_sector      geography(MultiPolygon, 4326) NOT NULL,
  superficie_sector_m2  NUMERIC GENERATED ALWAYS AS (ST_Area(geometria_sector)) STORED,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sectors_geometria ON sectors USING GIST (geometria_sector);

CREATE TRIGGER trg_sectors_updated_at
  BEFORE UPDATE ON sectors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 2. trees — columnas nuevas (identidad + valores vigentes, §3.5)
-- ---------------------------------------------------------------------
ALTER TABLE trees
  ADD COLUMN sector_id UUID REFERENCES sectors(id),  -- NOT NULL se fija más abajo (tabla vacía)
  ADD COLUMN fecha_registro DATE,
  ADD COLUMN registrado_por UUID REFERENCES user_profiles(id),
  ADD COLUMN sector TEXT,                        -- D-7 (valor vigente; distinto de sector_id)
  ADD COLUMN ubicacion_descriptiva TEXT,         -- D-8
  ADD COLUMN utm_este NUMERIC(10,2),
  ADD COLUMN utm_norte NUMERIC(10,2),
  ADD COLUMN huso TEXT CHECK (huso IS NULL OR huso = '19S'),
  ADD COLUMN datum TEXT CHECK (datum IS NULL OR datum = 'WGS84'),
  ADD COLUMN especie_cientifica TEXT,
  ADD COLUMN nombre_comun TEXT,
  ADD COLUMN multifustal BOOLEAN,
  ADD COLUMN numero_fustes INTEGER CHECK (numero_fustes IS NULL OR numero_fustes >= 2),
  ADD COLUMN dap_fustes_cm NUMERIC(6,2)[],
  ADD COLUMN dap_cm NUMERIC(6,2) CHECK (dap_cm IS NULL OR dap_cm > 0),
  ADD COLUMN altura_total_m NUMERIC(6,2) CHECK (altura_total_m IS NULL OR altura_total_m > 0),
  ADD COLUMN diametro_copa_ns_m NUMERIC(6,2),
  ADD COLUMN diametro_copa_eo_m NUMERIC(6,2),
  ADD COLUMN copa_no_presenta BOOLEAN,
  ADD COLUMN altura_primera_rama_m NUMERIC(6,2),
  ADD COLUMN altura_primera_rama_no_presenta BOOLEAN,
  ADD COLUMN altura_base_copa_viva_m NUMERIC(6,2),
  ADD COLUMN altura_base_copa_viva_no_presenta BOOLEAN,
  ADD COLUMN clase_edad TEXT CHECK (clase_edad IS NULL OR clase_edad IN (
    'Joven', 'Semimaduro', 'Tempranamente maduro', 'Maduro', 'Sobremaduro'
  )),
  ADD COLUMN rango_edad_estimada_anios TEXT CHECK (rango_edad_estimada_anios IS NULL OR rango_edad_estimada_anios IN (
    '0_5', '6_10', '11_15', '16_20', '21_25', '26_30', '31_35', '36_40',
    '41_45', '46_50', '51_55', '56_60', '61_65', '66_70', '71_75',
    '76_80', '81_85', '86_90', '91_95', '96_100', 'mas_de_100'
  )),
  ADD COLUMN vigente_desde_inspection_id UUID REFERENCES inspections(id);

-- diametro_copa_m: generada, promedio si ambas existen (NULL si falta
-- alguna — la aritmética con NULL ya propaga NULL).
ALTER TABLE trees
  ADD COLUMN diametro_copa_m NUMERIC(6,2)
    GENERATED ALWAYS AS ((diametro_copa_ns_m + diametro_copa_eo_m) / 2) STORED;

-- Al menos especie_cientifica o nombre_comun en el alta (RG "Preguardado").
ALTER TABLE trees
  ADD CONSTRAINT chk_trees_especie_o_comun
    CHECK (especie_cientifica IS NOT NULL OR nombre_comun IS NOT NULL);

-- Tabla vacía (paso 1): fijar NOT NULL en las columnas identidad ahora.
ALTER TABLE trees
  ALTER COLUMN sector_id SET NOT NULL,
  ALTER COLUMN fecha_registro SET NOT NULL,
  ALTER COLUMN registrado_por SET NOT NULL;

CREATE INDEX idx_trees_sector_id ON trees (sector_id);

-- `ubicacion` pasa de punto manual a generada desde UTM (ADR-010 v3.0).
-- Postgres no admite agregar GENERATED a una columna existente: se
-- recrea (tabla vacía).
DROP INDEX IF EXISTS idx_trees_ubicacion;
ALTER TABLE trees DROP COLUMN ubicacion;
ALTER TABLE trees
  ADD COLUMN ubicacion geography(Point, 4326)
    GENERATED ALWAYS AS (ST_Transform(ST_SetSRID(ST_MakePoint(utm_este, utm_norte), 32719), 4326)) STORED;
CREATE INDEX idx_trees_ubicacion ON trees USING GIST (ubicacion);

-- ---------------------------------------------------------------------
-- 3. tree_data_versions (nueva): datos del árbol por inspección (§3.6)
-- ---------------------------------------------------------------------
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
  diametro_copa_ns_m                  NUMERIC(6,2),
  diametro_copa_eo_m                  NUMERIC(6,2),
  copa_no_presenta                    BOOLEAN,
  altura_primera_rama_m               NUMERIC(6,2),
  altura_primera_rama_no_presenta     BOOLEAN,
  altura_base_copa_viva_m             NUMERIC(6,2),
  altura_base_copa_viva_no_presenta   BOOLEAN,
  clase_edad                          TEXT CHECK (clase_edad IS NULL OR clase_edad IN (
    'Joven', 'Semimaduro', 'Tempranamente maduro', 'Maduro', 'Sobremaduro'
  )),
  rango_edad_estimada_anios           TEXT CHECK (rango_edad_estimada_anios IS NULL OR rango_edad_estimada_anios IN (
    '0_5', '6_10', '11_15', '16_20', '21_25', '26_30', '31_35', '36_40',
    '41_45', '46_50', '51_55', '56_60', '61_65', '66_70', '71_75',
    '76_80', '81_85', '86_90', '91_95', '96_100', 'mas_de_100'
  )),
  created_by                          UUID NOT NULL REFERENCES user_profiles(id),
  created_at                          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tree_data_versions
  ADD COLUMN diametro_copa_m NUMERIC(6,2)
    GENERATED ALWAYS AS ((diametro_copa_ns_m + diametro_copa_eo_m) / 2) STORED;

CREATE INDEX idx_tree_data_versions_tree ON tree_data_versions (tree_id, created_at DESC);
