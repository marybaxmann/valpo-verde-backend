-- =====================================================================
-- Reversión de 012_roles_catalogo_proyectos.sql
-- =====================================================================

ALTER TABLE projects
  RENAME COLUMN estado_proyecto TO status;

DROP TRIGGER IF EXISTS trg_species_updated_at ON species;
DROP INDEX IF EXISTS uq_species_especie_cientifica_norm;

ALTER TABLE species
  DROP CONSTRAINT IF EXISTS chk_species_especie_cientifica_valida,
  DROP COLUMN updated_at,
  DROP COLUMN created_by,
  DROP COLUMN tipo_hoja,
  DROP COLUMN persistencia_follaje,
  DROP COLUMN origen_biogeografico,
  DROP COLUMN familia,
  DROP COLUMN genero,
  ADD COLUMN nombre_comun TEXT;

ALTER TABLE species
  RENAME COLUMN especie_cientifica TO nombre_cientifico;

ALTER TABLE species
  ADD CONSTRAINT species_nombre_cientifico_key UNIQUE (nombre_cientifico);

ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_codigo_usuario_key,
  DROP COLUMN codigo_usuario;

DROP FUNCTION IF EXISTS fn_next_codigo_usuario();
DROP SEQUENCE IF EXISTS user_profiles_codigo_seq;

DELETE FROM roles WHERE nombre IN ('inspector', 'encargado_mantencion');
