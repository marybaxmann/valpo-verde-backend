-- =====================================================================
-- Migración 012 — Roles, catálogo de especies y proyectos
-- Diseño Fase 3 §3.1, §3.2, §7 paso 2; CC-039; CC-042; D-247, D-257 a
-- D-267. Issue #38.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Roles nuevos (CC-032; D-250)
-- ---------------------------------------------------------------------
INSERT INTO roles (nombre, descripcion) VALUES
  ('inspector', 'Inspector técnico: inspecciones, evaluaciones, versiones de datos del árbol, ajustes, anulación, catálogo de especies, revisión de mantenimiento (CC-026, CC-032).'),
  ('encargado_mantencion', 'Encargado de mantención: registra la ejecución de las órdenes de trabajo de mantenimiento y su evidencia (CC-026, CC-032).')
ON CONFLICT (nombre) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. user_profiles.codigo_usuario (D-247; CC-041)
-- ---------------------------------------------------------------------
CREATE SEQUENCE user_profiles_codigo_seq START 1;

ALTER TABLE user_profiles
  ADD COLUMN codigo_usuario TEXT;

-- Backfill de las filas existentes, en orden de alta. LPAD con
-- GREATEST(3, length(...)) para no truncar más allá de 999.
UPDATE user_profiles up
SET codigo_usuario = 'USR-' || LPAD(sub.rn::text, GREATEST(3, length(sub.rn::text)), '0')
FROM (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn
  FROM user_profiles
) sub
WHERE up.id = sub.id;

-- Función auxiliar: un solo nextval() por fila (evitar llamarlo dos
-- veces en la misma expresión DEFAULT, que saltaría dos valores).
CREATE FUNCTION fn_next_codigo_usuario() RETURNS TEXT AS $$
DECLARE
  v BIGINT := nextval('user_profiles_codigo_seq');
BEGIN
  RETURN 'USR-' || LPAD(v::text, GREATEST(3, length(v::text)), '0');
END;
$$ LANGUAGE plpgsql;

ALTER TABLE user_profiles
  ALTER COLUMN codigo_usuario SET DEFAULT fn_next_codigo_usuario(),
  ALTER COLUMN codigo_usuario SET NOT NULL,
  ADD CONSTRAINT user_profiles_codigo_usuario_key UNIQUE (codigo_usuario);

-- La secuencia sigue desde donde quedó el backfill; is_called = false
-- cuando la tabla está vacía, para que el primer nextval() devuelva 1.
SELECT setval(
  'user_profiles_codigo_seq',
  GREATEST((SELECT count(*) FROM user_profiles), 1),
  (SELECT count(*) FROM user_profiles) > 0
);

-- ---------------------------------------------------------------------
-- 3. species -> catálogo de especies (CATALOGO_ESPECIES; CC-039; D-257
--    a D-262). Se adapta en el lugar: la tabla quedó vacía en el paso 1.
-- ---------------------------------------------------------------------
ALTER TABLE species
  RENAME COLUMN nombre_cientifico TO especie_cientifica;

ALTER TABLE species
  DROP CONSTRAINT species_nombre_cientifico_key;

ALTER TABLE species
  DROP COLUMN nombre_comun,  -- CC-028 P2: es un dato del árbol (D-14), no del catálogo
  ADD COLUMN genero TEXT,
  ADD COLUMN familia TEXT,
  ADD COLUMN origen_biogeografico TEXT
    CHECK (origen_biogeografico IS NULL OR origen_biogeografico IN ('nativa', 'endemica', 'introducida')),
  ADD COLUMN persistencia_follaje TEXT
    CHECK (persistencia_follaje IS NULL OR persistencia_follaje IN ('perennifolia', 'caducifolia', 'semicaducifolia')),
  ADD COLUMN tipo_hoja TEXT
    CHECK (tipo_hoja IS NULL OR tipo_hoja IN ('latifoliada', 'acicular', 'escuamiforme', 'palmera')),
  ADD COLUMN created_by UUID REFERENCES user_profiles(id),
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- No admite "Género sp." ni "No determinado" (D-257).
ALTER TABLE species
  ADD CONSTRAINT chk_species_especie_cientifica_valida
    CHECK (especie_cientifica !~* '\ssp\.?$' AND lower(trim(especie_cientifica)) <> 'no determinado');

-- UNIQUE sobre la forma normalizada (minúsculas, espacios simples).
CREATE UNIQUE INDEX uq_species_especie_cientifica_norm
  ON species (lower(regexp_replace(trim(especie_cientifica), '\s+', ' ', 'g')));

CREATE TRIGGER trg_species_updated_at
  BEFORE UPDATE ON species
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 4. projects: name -> nombre_proyecto (D-264) y status -> estado_proyecto
--    (D-265; RG fila 27; CC-042). Mismos códigos de estado_proyecto
--    ('activo', 'cerrado'); el CHECK existente sigue aplicando al
--    renombrar.
-- ---------------------------------------------------------------------
ALTER TABLE projects
  RENAME COLUMN name TO nombre_proyecto;
ALTER TABLE projects
  RENAME COLUMN status TO estado_proyecto;
