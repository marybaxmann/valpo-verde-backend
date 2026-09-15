-- =====================================================================
-- VALPO VERDE — migrations/003_multiproject_backfill.sql
--
-- Tercera migración: backfill del modelo multiproyecto introducido en
-- 002_multiproject_structure.sql. Se aplica sobre 001_init.sql + 002.
--
-- Reglas de referencia (todas vigentes):
--   PR-005 v3.0 (docs/project-rules.md)
--   ADR-005 v2.0 (docs/architecture-decisions.md)
--
-- ALCANCE (SOLO BACKFILL — NADA DE ESTRUCTURA):
--   Esta migración únicamente puede escribir valores en columnas que ya
--   existen desde 002 (trees.project_id, public_spaces.project_id,
--   incidents.project_id). No crea columnas, no crea ni modifica
--   constraints, no crea tablas persistentes nuevas.
--
-- ESTA MIGRACIÓN NO HACE (por diseño, no negociable):
--   - NO crea ningún "proyecto legacy" automático ni ningún proyecto en
--     absoluto. La Sección 2 valida que todo project_id usado en el
--     mapeo exista ya en `projects`; no es posible, ni por error, crear
--     un proyecto nuevo desde esta migración.
--   - NO infiere ni asume ningún mapeo fila -> proyecto. El mapeo es una
--     decisión explícita de la autora del proyecto, específica de cada
--     entorno, y se declara editando manualmente la Sección 1 antes de
--     ejecutar esta migración en ese entorno.
--   - NO hace SET NOT NULL en ninguna de las tres columnas project_id.
--     Ese es el objetivo de la migración 004, posterior y bloqueada por
--     esta.
--   - NO elimina las FK simples *_transitoria
--     (trees_public_space_id_fkey_transitoria,
--     incidents_tree_id_fkey_transitoria). Su retiro también es de 004.
--   - NO toca RLS de ninguna forma (diferido hasta después de 004,
--     ADR-005 v2.0).
--
-- NOTA SOBRE LAS TABLAS DE MAPEO (corrección de compatibilidad PostgreSQL):
--   Las 3 tablas TEMP de la Sección 1 NO llevan REFERENCES hacia tablas
--   permanentes. PostgreSQL no permite foreign keys en tablas temporales
--   que apunten a tablas permanentes ("constraints on temporary tables
--   may reference only temporary tables"); un intento anterior de este
--   diseño usaba REFERENCES public_spaces(id)/trees(id)/incidents(id)/
--   projects(id) y fue reproducido y descartado por incompatible. En su
--   lugar, la Sección 2 valida explícitamente por consulta (DO $$ ...
--   RAISE EXCEPTION ... $$) que cada id y cada project_id del mapeo
--   exista realmente antes de usarlo en los UPDATE de la Sección 4.
--
-- ESTADO EN ESTE ENTORNO (Supabase de pruebas, diagnóstico ya ejecutado):
--   public_spaces: 0 filas totales (0 con project_id NULL).
--   trees:         0 filas totales (0 con project_id NULL).
--   incidents:     0 filas totales (0 con project_id NULL).
--   Las 4 verificaciones de integridad relacional (coherencia de proyecto
--   entre trees/public_spaces, entre incidents/trees, y referencias
--   huérfanas) devolvieron 0 filas cada una.
--   En consecuencia, las 3 secciones de mapeo de este archivo quedan
--   VACÍAS para este entorno: no hay ninguna fila legacy que requiera
--   mapeo. Esto es específico de este Supabase de pruebas y NO se asume
--   igual para el entorno objetivo/producción: antes de aplicar este
--   mismo archivo ahí, debe repetirse el diagnóstico y, si aparecen filas
--   con project_id NULL, completarse la Sección 1 correspondiente con el
--   mapeo que entregue la autora.
--
-- ORDEN DE LOS UPDATE (Sección 4) Y POR QUÉ:
--   1) public_spaces  — sin dependencias.
--   2) trees          — depende de que public_spaces ya esté mapeada:
--      trees_project_public_space_fkey (MATCH SIMPLE) exige que árbol y
--      espacio público compartan project_id cuando ambas columnas
--      (project_id, public_space_id) tienen valor.
--   3) incidents       — depende de que trees ya esté mapeada:
--      incidents_tree_project_fkey (MATCH SIMPLE) exige que incidencia y
--      árbol compartan project_id cuando tree_id y project_id tienen
--      ambos valor.
--   Si el mapeo de una incidencia fuera inconsistente con el project_id
--   ya asignado a su árbol, el UPDATE de incidents fallará por violación
--   de esta FK compuesta (ya existente desde 002) — una segunda capa de
--   defensa que esta migración no reimplementa, solo respeta con el
--   orden anterior.
--
-- MECANISMO DE BLOQUEO (dos capas, ambas ANTES de cualquier UPDATE):
--   Sección 2 — validación de EXISTENCIA: todo id y todo project_id
--     usado dentro de las tablas de mapeo debe existir realmente en
--     public_spaces/trees/incidents/projects. Sin esto, no tiene sentido
--     validar cobertura (Sección 3) contra un mapeo que podría apuntar a
--     filas o proyectos inexistentes.
--   Sección 3 — validación de COBERTURA: toda fila real con
--     project_id IS NULL debe tener una entrada correspondiente en su
--     tabla de mapeo.
--   Cualquiera de los dos niveles que falle aborta la migración completa
--   (nada se actualiza, ni siquiera en las otras tablas) con un mensaje
--   que nombra la tabla y el conteo exacto de filas/ids en problema. No
--   hay forma de continuar con un mapeo inválido o con cobertura parcial.
--
-- TRANSACCIÓN EXPLÍCITA (BEGIN/COMMIT):
--   Todo el script está envuelto en BEGIN; ... COMMIT; para que
--   ON COMMIT DROP de las tablas TEMP tenga un límite de transacción
--   explícito y predecible, y para dejar constancia de que el archivo es
--   una única unidad atómica: cualquier RAISE EXCEPTION en cualquier
--   sección aborta TODO (incluida la creación de las tablas TEMP y
--   cualquier UPDATE ya ejecutado), sin dejar cambios parciales.
--   Este archivo incluye BEGIN/COMMIT explícitos y debe ejecutarse
--   como una única unidad atómica, de principio a fin, en una sola
--   sesión/ejecución.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- SECCIÓN 1 — DECLARACIÓN DE MAPEO (editar manualmente por entorno)
-- ---------------------------------------------------------------------
-- Tablas de staging transaccionales, SIN foreign keys hacia tablas
-- permanentes (PostgreSQL no lo permite en tablas TEMP; ver nota de
-- compatibilidad más arriba). ON COMMIT DROP las autolimpia exactamente
-- en el COMMIT explícito del final de este script, sin dejar objetos
-- residuales en el esquema en ningún caso (éxito o abort).
--
-- La integridad de estos valores (que id/project_id realmente existan)
-- la garantiza la validación explícita de la Sección 2, no una FK.
--
-- Cada tabla se completa (o se deja vacía) con el mapeo fila -> proyecto
-- que entregue la autora para ESTE entorno concreto, antes de ejecutar
-- este script. Un mapeo parcial (que no cubra el 100% de las filas con
-- project_id NULL de la tabla correspondiente) hace abortar la migración
-- en la Sección 3.

CREATE TEMP TABLE _003_mapping_public_spaces (
  id         UUID PRIMARY KEY,
  project_id UUID NOT NULL
) ON COMMIT DROP;

-- >>> COMPLETAR AQUÍ ANTES DE EJECUTAR EN ESTE ENTORNO <<<
-- INSERT INTO _003_mapping_public_spaces (id, project_id) VALUES
--   ('<id-fila-legacy>', '<id-proyecto-destino>');
-- (vacío por defecto — este entorno de pruebas no requiere filas aquí,
--  según el diagnóstico previo: 0 filas de public_spaces con
--  project_id NULL)


CREATE TEMP TABLE _003_mapping_trees (
  id         UUID PRIMARY KEY,
  project_id UUID NOT NULL
) ON COMMIT DROP;

-- >>> COMPLETAR AQUÍ ANTES DE EJECUTAR EN ESTE ENTORNO <<<
-- INSERT INTO _003_mapping_trees (id, project_id) VALUES
--   ('<id-fila-legacy>', '<id-proyecto-destino>');
-- (vacío por defecto — este entorno de pruebas no requiere filas aquí,
--  según el diagnóstico previo: 0 filas de trees con project_id NULL)


CREATE TEMP TABLE _003_mapping_incidents (
  id         UUID PRIMARY KEY,
  project_id UUID NOT NULL
) ON COMMIT DROP;

-- >>> COMPLETAR AQUÍ ANTES DE EJECUTAR EN ESTE ENTORNO <<<
-- INSERT INTO _003_mapping_incidents (id, project_id) VALUES
--   ('<id-fila-legacy>', '<id-proyecto-destino>');
-- (vacío por defecto — este entorno de pruebas no requiere filas aquí,
--  según el diagnóstico previo: 0 filas de incidents con
--  project_id NULL)


-- ---------------------------------------------------------------------
-- SECCIÓN 2 — VALIDACIÓN DE EXISTENCIA DEL MAPEO (aborta si el mapeo
-- en sí mismo es inválido)
-- ---------------------------------------------------------------------
-- Corre DESPUÉS de crear las tablas de mapeo (y de que el operador las
-- haya completado, si corresponde) y ANTES de cualquier otra validación
-- o UPDATE. Sustituye la protección que antes daban las FK de las
-- tablas TEMP hacia tablas permanentes (no permitidas por PostgreSQL).

-- 2a. Todo id en _003_mapping_public_spaces debe existir en public_spaces.
DO $$
DECLARE
  v_missing_count integer;
BEGIN
  SELECT COUNT(*) INTO v_missing_count
  FROM _003_mapping_public_spaces m
  WHERE NOT EXISTS (
    SELECT 1 FROM public_spaces ps WHERE ps.id = m.id
  );

  IF v_missing_count > 0 THEN
    RAISE EXCEPTION
      'Migración 003 abortada: % id(s) en _003_mapping_public_spaces no existen en public_spaces. Revisar el mapeo (posible id copiado incorrectamente) antes de reintentar.',
      v_missing_count;
  END IF;
END $$;

-- 2b. Todo id en _003_mapping_trees debe existir en trees.
DO $$
DECLARE
  v_missing_count integer;
BEGIN
  SELECT COUNT(*) INTO v_missing_count
  FROM _003_mapping_trees m
  WHERE NOT EXISTS (
    SELECT 1 FROM trees t WHERE t.id = m.id
  );

  IF v_missing_count > 0 THEN
    RAISE EXCEPTION
      'Migración 003 abortada: % id(s) en _003_mapping_trees no existen en trees. Revisar el mapeo (posible id copiado incorrectamente) antes de reintentar.',
      v_missing_count;
  END IF;
END $$;

-- 2c. Todo id en _003_mapping_incidents debe existir en incidents.
DO $$
DECLARE
  v_missing_count integer;
BEGIN
  SELECT COUNT(*) INTO v_missing_count
  FROM _003_mapping_incidents m
  WHERE NOT EXISTS (
    SELECT 1 FROM incidents i WHERE i.id = m.id
  );

  IF v_missing_count > 0 THEN
    RAISE EXCEPTION
      'Migración 003 abortada: % id(s) en _003_mapping_incidents no existen en incidents. Revisar el mapeo (posible id copiado incorrectamente) antes de reintentar.',
      v_missing_count;
  END IF;
END $$;

-- 2d. Todo project_id usado en las 3 tablas de mapeo debe existir en
-- projects. Validación única combinada (UNION ALL) que cubre las tres
-- tablas de mapeo a la vez; no queda ningún hueco sin cubrir.
DO $$
DECLARE
  v_missing_count integer;
BEGIN
  SELECT COUNT(*) INTO v_missing_count
  FROM (
    SELECT 'public_spaces' AS origen, project_id FROM _003_mapping_public_spaces
    UNION ALL
    SELECT 'trees', project_id FROM _003_mapping_trees
    UNION ALL
    SELECT 'incidents', project_id FROM _003_mapping_incidents
  ) mapeos
  WHERE NOT EXISTS (
    SELECT 1 FROM projects p WHERE p.id = mapeos.project_id
  );

  IF v_missing_count > 0 THEN
    RAISE EXCEPTION
      'Migración 003 abortada: % entrada(s) de mapeo (entre _003_mapping_public_spaces, _003_mapping_trees e _003_mapping_incidents) referencian un project_id que no existe en projects. Revisar el mapeo antes de reintentar.',
      v_missing_count;
  END IF;
END $$;


-- ---------------------------------------------------------------------
-- SECCIÓN 3 — VALIDACIÓN DE COBERTURA (aborta si falta mapeo)
-- ---------------------------------------------------------------------
-- Corre DESPUÉS de la Sección 2: no tiene sentido validar cobertura
-- contra un mapeo que podría estar apuntando a filas/proyectos
-- inexistentes. Los 3 bloques corren ANTES de cualquier UPDATE, para no
-- dejar ninguna tabla parcialmente actualizada incluso dentro de la
-- misma transacción.

DO $$
DECLARE
  v_unmapped_count integer;
BEGIN
  SELECT COUNT(*) INTO v_unmapped_count
  FROM public_spaces ps
  WHERE ps.project_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM _003_mapping_public_spaces m WHERE m.id = ps.id
    );

  IF v_unmapped_count > 0 THEN
    RAISE EXCEPTION
      'Migración 003 abortada: % fila(s) de public_spaces con project_id NULL sin mapeo explícito en _003_mapping_public_spaces. Completar el mapeo (PR-005 v3.0 / ADR-005 v2.0: no se permite backfill automático ni proyecto legacy) antes de reintentar.',
      v_unmapped_count;
  END IF;
END $$;

DO $$
DECLARE
  v_unmapped_count integer;
BEGIN
  SELECT COUNT(*) INTO v_unmapped_count
  FROM trees t
  WHERE t.project_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM _003_mapping_trees m WHERE m.id = t.id
    );

  IF v_unmapped_count > 0 THEN
    RAISE EXCEPTION
      'Migración 003 abortada: % fila(s) de trees con project_id NULL sin mapeo explícito en _003_mapping_trees. Completar el mapeo (PR-005 v3.0 / ADR-005 v2.0: no se permite backfill automático ni proyecto legacy) antes de reintentar.',
      v_unmapped_count;
  END IF;
END $$;

DO $$
DECLARE
  v_unmapped_count integer;
BEGIN
  SELECT COUNT(*) INTO v_unmapped_count
  FROM incidents i
  WHERE i.project_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM _003_mapping_incidents m WHERE m.id = i.id
    );

  IF v_unmapped_count > 0 THEN
    RAISE EXCEPTION
      'Migración 003 abortada: % fila(s) de incidents con project_id NULL sin mapeo explícito en _003_mapping_incidents. Completar el mapeo (PR-005 v3.0 / ADR-005 v2.0: no se permite backfill automático ni proyecto legacy) antes de reintentar.',
      v_unmapped_count;
  END IF;
END $$;


-- ---------------------------------------------------------------------
-- SECCIÓN 4 — UPDATEs CONDICIONADOS (orden: public_spaces -> trees -> incidents)
-- ---------------------------------------------------------------------
-- Cada UPDATE es idempotente: no toca filas que ya tengan project_id, y
-- no hace nada si la tabla de mapeo correspondiente está vacía (como en
-- este entorno de pruebas, donde las 3 quedan sin filas).

-- 4a. public_spaces (sin dependencias)
UPDATE public_spaces ps
SET project_id = m.project_id
FROM _003_mapping_public_spaces m
WHERE ps.id = m.id
  AND ps.project_id IS NULL;

-- 4b. trees (depende de que public_spaces ya esté mapeada:
--     trees_project_public_space_fkey exige coherencia de proyecto
--     cuando project_id y public_space_id tienen ambos valor)
UPDATE trees t
SET project_id = m.project_id
FROM _003_mapping_trees m
WHERE t.id = m.id
  AND t.project_id IS NULL;

-- 4c. incidents (depende de que trees ya esté mapeada:
--     incidents_tree_project_fkey exige coherencia de proyecto cuando
--     tree_id y project_id tienen ambos valor)
UPDATE incidents i
SET project_id = m.project_id
FROM _003_mapping_incidents m
WHERE i.id = m.id
  AND i.project_id IS NULL;


-- ---------------------------------------------------------------------
-- SECCIÓN 5 — VERIFICACIÓN POSTERIOR (defensiva)
-- ---------------------------------------------------------------------
-- No debería poder dispararse si las Secciones 2 y 3 son correctas, pero
-- cubre bugs sutiles. Red de seguridad adicional de bajo costo.

DO $$
DECLARE
  v_remaining_public_spaces integer;
  v_remaining_trees         integer;
  v_remaining_incidents     integer;
BEGIN
  SELECT COUNT(*) INTO v_remaining_public_spaces
  FROM public_spaces WHERE project_id IS NULL;

  SELECT COUNT(*) INTO v_remaining_trees
  FROM trees WHERE project_id IS NULL;

  SELECT COUNT(*) INTO v_remaining_incidents
  FROM incidents WHERE project_id IS NULL;

  IF v_remaining_public_spaces > 0
     OR v_remaining_trees > 0
     OR v_remaining_incidents > 0
  THEN
    RAISE EXCEPTION
      'Migración 003 abortada tras el backfill: quedan filas con project_id NULL sin explicar (public_spaces=%, trees=%, incidents=%). Esto no debería ocurrir si las Secciones 2 y 3 validaron correctamente; revisar el mapeo antes de reintentar.',
      v_remaining_public_spaces, v_remaining_trees, v_remaining_incidents;
  END IF;
END $$;

COMMIT;

-- =====================================================================
-- FIN 003_multiproject_backfill.sql
--
-- Las 3 tablas de mapeo (_003_mapping_public_spaces, _003_mapping_trees,
-- _003_mapping_incidents) se autolimpian por ON COMMIT DROP en el COMMIT
-- de arriba: tras aplicar esta migración no queda ningún objeto nuevo en
-- el esquema.
--
-- Pendientes que esta migración NO resuelve (por diseño, quedan para 004):
--   - SET NOT NULL en trees.project_id, public_spaces.project_id,
--     incidents.project_id.
--   - DROP de las FK simples *_transitoria
--     (trees_public_space_id_fkey_transitoria,
--     incidents_tree_id_fkey_transitoria).
--   - RLS: diferida hasta después de 004 (ADR-005 v2.0).
-- =====================================================================
