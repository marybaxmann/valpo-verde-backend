-- =====================================================================
-- VALPO VERDE — migrations/002_multiproject_structure.sql
--
-- Segunda migración: introduce la estructura multiproyecto aprobada.
-- Se aplica sobre 001_init.sql. schema.sql se actualiza en la misma
-- aprobación para reflejar el estado posterior a esta migración.
--
-- Reglas de referencia (todas vigentes):
--   PR-005 v3.0, PR-003 v4.0, PR-004 v4.0, PR-006 v5.0  (docs/project-rules.md)
--   ADR-005 v2.0                                         (docs/architecture-decisions.md)
--
-- ALCANCE (SOLO ESTRUCTURA):
--   1. Tablas nuevas: projects, project_members.
--   2. Columnas de scope NULLABLE: trees.project_id, public_spaces.project_id,
--      incidents.project_id. Se agregan SIN default, SIN backfill y SIN
--      SET NOT NULL. El objetivo final NOT NULL se alcanza en 004, previo
--      mapeo/backfill explícito de la autora en 003.
--   3. public_spaces pasa a estar acotado por proyecto:
--      UNIQUE(nombre) -> UNIQUE(project_id, nombre).
--   4. Coherencia "mismo proyecto" entre árbol/espacio público y
--      árbol/incidencia, forzada por claves foráneas COMPUESTAS con
--      MATCH SIMPLE: solo exigen coherencia cuando todas las columnas de
--      la tupla tienen valor; las filas legacy con project_id NULL quedan
--      exentas hasta 003/004.
--   5. Durante la ventana 002 -> 004 COEXISTEN, en trees y en incidents,
--      la FK simple heredada de 001 (re-creada con ON DELETE RESTRICT) y
--      la FK compuesta MATCH SIMPLE. La FK simple garantiza la existencia
--      del referente (public_space_id / tree_id) aunque project_id sea
--      NULL; la compuesta añade la pertenencia al mismo proyecto cuando la
--      tupla está completa. Las FK simples *_transitoria se retiran en 004.
--
-- MIGRACIÓN SEGURA CON DATOS PREEXISTENTES:
--   - los tres project_id quedan NULLABLE;
--   - no se crea proyecto legacy ni se hace backfill;
--   - ningún constraint nuevo rechaza filas existentes (las FK compuestas
--     MATCH SIMPLE no se evalúan mientras project_id sea NULL).
--
-- SIN RLS: la autorización se aplica primero en backend
-- (rol global en user_profiles + pertenencia en project_members);
-- RLS es posterior a 004 (ADR-005 v2.0).
--
-- NOTA SOBRE DROP CONSTRAINT (verificación de nombres):
--   Las constraints creadas inline en 001_init.sql no llevan nombre
--   explícito, por lo que PostgreSQL les asignó su nombre convencional
--   (<tabla>_<columna>_<sufijo>). No hay acceso a una BD real para
--   confirmar esos nombres, así que en vez de un DROP CONSTRAINT por
--   nombre fijo se usan bloques DO $$ que DESCUBREN el constraint por
--   introspección (pg_constraint + pg_attribute, filtrando por tabla +
--   columna + tabla referenciada + tipo). Así la migración funciona
--   aunque el nombre real difiera de la convención, y es tolerante si el
--   constraint ya no existe. El nombre convencional esperado se documenta
--   junto a cada bloque para referencia.
--
--   Se DROPean 3 constraints heredadas de 001:
--     * public_spaces UNIQUE(nombre) global  -> se sustituye por
--       UNIQUE(project_id, nombre); no se re-crea la versión global.
--     * trees.public_space_id -> public_spaces(id)   (sin ON DELETE => NO ACTION)
--     * incidents.tree_id     -> trees(id)           (sin ON DELETE => NO ACTION)
--   Las dos FK simples NO se eliminan del modelo: se RE-CREAN de inmediato
--   con nombre explícito *_transitoria y ON DELETE RESTRICT, y conviven con
--   la FK compuesta. El DROP+recreación es necesario únicamente para pasar
--   de NO ACTION a un ON DELETE RESTRICT explícito bajo un nombre estable
--   que 004 pueda referenciar para retirarlas.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. PROJECTS
-- ---------------------------------------------------------------------
-- Un proyecto = una gestión/inventario de arbolado de una institución
-- (PR-005 v3.0 / ADR-005 v2.0).
-- Sin eliminación física como flujo normal: el cierre se representa con
-- status = 'cerrado'. Sin UNIQUE en name ni en (institution_name, name).

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


-- ---------------------------------------------------------------------
-- 2. PROJECT_MEMBERS
-- ---------------------------------------------------------------------
-- Representa SOLO pertenencia de un usuario a un proyecto. NO lleva rol
-- propio: el rol (admin / usuario_municipal) sigue siendo global y vive
-- en user_profiles (PR-003 v4.0, PR-004 v4.0, ADR-005 v2.0).
--
-- ON DELETE RESTRICT en project_id y user_id: el offboarding de un
-- usuario debe eliminar primero sus membresías; no hay CASCADE automático.
-- added_by es auditoría nullable -> ON DELETE SET NULL.

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
-- "proyectos de un usuario", que es la consulta central de autorización
-- de usuario_municipal (y respalda el RESTRICT al borrar un user_profile):
CREATE INDEX idx_project_members_user ON project_members (user_id);


-- ---------------------------------------------------------------------
-- 3. PUBLIC_SPACES — pasa a estar acotado por proyecto
-- ---------------------------------------------------------------------

ALTER TABLE public_spaces
  ADD COLUMN project_id UUID;   -- NULLABLE hasta backfill (003) y SET NOT NULL (004)

ALTER TABLE public_spaces
  ADD CONSTRAINT public_spaces_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT;

-- Quitar el UNIQUE(nombre) GLOBAL creado inline en 001.
-- Nombre convencional esperado: public_spaces_nombre_key
DO $$
DECLARE
  v_attnum  smallint;
  v_conname text;
BEGIN
  SELECT a.attnum INTO v_attnum
  FROM pg_attribute a
  WHERE a.attrelid = 'public_spaces'::regclass
    AND a.attname = 'nombre'
    AND NOT a.attisdropped;

  SELECT c.conname INTO v_conname
  FROM pg_constraint c
  WHERE c.conrelid = 'public_spaces'::regclass
    AND c.contype = 'u'
    AND c.conkey = ARRAY[v_attnum];

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public_spaces DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

-- Nuevo alcance: el nombre de espacio es único DENTRO de cada proyecto;
-- la misma plaza/nombre puede existir en proyectos distintos (PR-005 v3.0).
ALTER TABLE public_spaces
  ADD CONSTRAINT public_spaces_project_id_nombre_key UNIQUE (project_id, nombre);

-- id ya es único por sí solo; esta UNIQUE(project_id, id) existe SOLO como
-- destino de la FK compuesta (project_id, public_space_id) de trees.
ALTER TABLE public_spaces
  ADD CONSTRAINT public_spaces_project_id_id_key UNIQUE (project_id, id);


-- ---------------------------------------------------------------------
-- 4. TREES — columna de proyecto + coherencia con public_spaces
-- ---------------------------------------------------------------------

ALTER TABLE trees
  ADD COLUMN project_id UUID;   -- NULLABLE hasta backfill (003) y SET NOT NULL (004)

-- FK simple al proyecto (preservación de historial: RESTRICT).
ALTER TABLE trees
  ADD CONSTRAINT trees_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT;

-- UNIQUE(project_id, id): destino de FK compuestas scoped
-- (incidents.(tree_id, project_id) -> trees(id, project_id)).
-- project_id como columna líder => sirve además de índice de scoping de
-- trees por proyecto, por lo que NO se crea un idx_trees_project aparte.
ALTER TABLE trees
  ADD CONSTRAINT trees_project_id_id_key UNIQUE (project_id, id);

-- Coherencia árbol/espacio público durante la ventana 002 -> 004:
--   (a) DROP de la FK simple heredada de 001 (public_space_id ->
--       public_spaces(id), NO ACTION) y RE-CREACIÓN inmediata como
--       trees_public_space_id_fkey_transitoria con ON DELETE RESTRICT.
--       Garantiza que public_space_id apunte a un espacio EXISTENTE aunque
--       project_id sea NULL. Se RETIRA en 004 tras backfill + SET NOT NULL.
--   (b) ADD de la FK COMPUESTA MATCH SIMPLE: cuando project_id y
--       public_space_id tienen ambos valor, fuerza además que árbol y
--       espacio público pertenezcan al mismo proyecto. No exige nada si
--       alguna de las dos columnas es NULL.
-- Nombre convencional esperado del FK heredado: trees_public_space_id_fkey
DO $$
DECLARE
  v_attnum  smallint;
  v_conname text;
BEGIN
  SELECT a.attnum INTO v_attnum
  FROM pg_attribute a
  WHERE a.attrelid = 'trees'::regclass
    AND a.attname = 'public_space_id'
    AND NOT a.attisdropped;

  SELECT c.conname INTO v_conname
  FROM pg_constraint c
  WHERE c.conrelid  = 'trees'::regclass
    AND c.contype   = 'f'
    AND c.confrelid = 'public_spaces'::regclass
    AND c.conkey    = ARRAY[v_attnum];

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE trees DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

-- (a) FK simple TRANSITORIA (se retira en 004).
ALTER TABLE trees
  ADD CONSTRAINT trees_public_space_id_fkey_transitoria
  FOREIGN KEY (public_space_id) REFERENCES public_spaces (id)
  ON DELETE RESTRICT;

-- (b) FK COMPUESTA (permanente).
ALTER TABLE trees
  ADD CONSTRAINT trees_project_public_space_fkey
  FOREIGN KEY (project_id, public_space_id)
  REFERENCES public_spaces (project_id, id) MATCH SIMPLE
  ON DELETE RESTRICT;

-- Índice: variante compuesta que SUSTITUYE a idx_trees_public_space.
-- Sirve el patrón real "árboles de una plaza dentro de un proyecto"
-- (WHERE project_id = ? AND public_space_id = ?) y respalda la
-- verificación RESTRICT al borrar un public_space vía la FK compuesta.
-- NOTA: la FK simple *_transitoria (public_space_id solo) no tiene un
-- índice con public_space_id como columna líder; el chequeo RESTRICT de su
-- lado hace scan de trees. Se asume aceptable: el borrado de public_spaces
-- no es un flujo normal (RESTRICT + preservación histórica) y la ventana
-- transitoria termina en 004. Ver "Pendientes / riesgos" al pie.
DROP INDEX IF EXISTS idx_trees_public_space;
CREATE INDEX idx_trees_public_space ON trees (project_id, public_space_id);


-- ---------------------------------------------------------------------
-- 5. INCIDENTS — project_id directo + coherencia con el árbol
-- ---------------------------------------------------------------------
-- incidents lleva project_id DIRECTO porque incidents.tree_id es NULLABLE
-- (una incidencia puede reportarse sin árbol identificado). Si tree_id
-- tiene valor, el árbol debe pertenecer al mismo project_id.

ALTER TABLE incidents
  ADD COLUMN project_id UUID;   -- NULLABLE hasta backfill (003) y SET NOT NULL (004)

ALTER TABLE incidents
  ADD CONSTRAINT incidents_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT;

-- Coherencia incidencia/árbol durante la ventana 002 -> 004:
--   (a) DROP de la FK simple heredada de 001 (tree_id -> trees(id),
--       NO ACTION) y RE-CREACIÓN inmediata como
--       incidents_tree_id_fkey_transitoria con ON DELETE RESTRICT.
--       Garantiza que tree_id (cuando no es NULL) apunte a un árbol
--       EXISTENTE aunque project_id sea NULL. Se RETIRA en 004.
--   (b) ADD de la FK COMPUESTA MATCH SIMPLE: con tree_id y project_id
--       ambos con valor, obliga a que (tree_id, project_id) exista en
--       trees(id, project_id) -> árbol e incidencia en el mismo proyecto.
--       No exige nada si tree_id es NULL (incidencia sin árbol) ni si
--       project_id es NULL (fila legacy previa a 003).
-- tree_id sigue siendo NULLABLE.
-- Nombre convencional esperado del FK heredado: incidents_tree_id_fkey
DO $$
DECLARE
  v_attnum  smallint;
  v_conname text;
BEGIN
  SELECT a.attnum INTO v_attnum
  FROM pg_attribute a
  WHERE a.attrelid = 'incidents'::regclass
    AND a.attname = 'tree_id'
    AND NOT a.attisdropped;

  SELECT c.conname INTO v_conname
  FROM pg_constraint c
  WHERE c.conrelid  = 'incidents'::regclass
    AND c.contype   = 'f'
    AND c.confrelid = 'trees'::regclass
    AND c.conkey    = ARRAY[v_attnum];

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE incidents DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

-- (a) FK simple TRANSITORIA (se retira en 004).
ALTER TABLE incidents
  ADD CONSTRAINT incidents_tree_id_fkey_transitoria
  FOREIGN KEY (tree_id) REFERENCES trees (id)
  ON DELETE RESTRICT;

-- (b) FK COMPUESTA (permanente).
ALTER TABLE incidents
  ADD CONSTRAINT incidents_tree_project_fkey
  FOREIGN KEY (tree_id, project_id)
  REFERENCES trees (id, project_id) MATCH SIMPLE
  ON DELETE RESTRICT;

-- Scoping directo por proyecto: project_id no es columna líder de ningún
-- índice existente en incidents (también respalda el RESTRICT al borrar
-- un project).
CREATE INDEX idx_incidents_project ON incidents (project_id);

-- Variante compuesta que SUSTITUYE a idx_incidents_tree: mantiene el
-- acceso por árbol (tree_id como columna líder) y respalda la FK
-- compuesta / la verificación RESTRICT al borrar un árbol.
DROP INDEX IF EXISTS idx_incidents_tree;
CREATE INDEX idx_incidents_tree ON incidents (tree_id, project_id);


-- =====================================================================
-- FIN 002_multiproject_structure.sql
--
-- Pendientes explícitos que esta migración NO resuelve (por diseño):
--   - trees.project_id, public_spaces.project_id, incidents.project_id
--     quedan NULLABLE de forma TEMPORAL. Los resuelve:
--       * 003 -> backfill con el mapeo explícito de la autora (solo si
--         existen filas previas en trees / incidents / public_spaces);
--       * 004 -> SET NOT NULL de los tres project_id + DROP de las FK
--         simples *_transitoria (trees_public_space_id_fkey_transitoria,
--         incidents_tree_id_fkey_transitoria), quedando solo las FK
--         compuestas.
--     004 queda BLOQUEADA hasta que 003 exista y se aplique.
--   - Ventana 002 -> 004: por cada relación conviven una FK simple
--     *_transitoria (ON DELETE RESTRICT; garantiza existencia del referente
--     con project_id NULL) y una FK compuesta MATCH SIMPLE (añade
--     pertenencia al mismo proyecto cuando la tupla está completa).
--   - Riesgo menor de rendimiento: el chequeo RESTRICT de
--     trees_public_space_id_fkey_transitoria al borrar un public_spaces no
--     tiene índice con public_space_id como columna líder (idx_trees_public_space
--     pasó a (project_id, public_space_id)). Se asume aceptable: borrar un
--     public_spaces no es flujo normal y la FK simple se retira en 004.
--     incidents_tree_id_fkey_transitoria sí queda respaldada: tree_id es la
--     columna líder de idx_incidents_tree (tree_id, project_id).
--   - Unicidad temporal de public_spaces con project_id NULL: dos espacios
--     con el mismo nombre y project_id NULL serían admitidos hasta 003
--     (NULLs distintos en el índice único). NO se resuelve aquí.
--   - Autorización rol global + pertenencia (project_members): se aplica
--     en backend en esta fase; RLS es posterior (después de 004).
--   - No se agrega columna CRS/SRID a projects (ADR-010 sigue 'propuesta').
-- =====================================================================
