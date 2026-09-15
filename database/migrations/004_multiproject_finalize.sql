-- =====================================================================
-- VALPO VERDE — migrations/004_multiproject_finalize.sql
--
-- Cuarta migración: finaliza estructuralmente el modelo multiproyecto
-- introducido en 002_multiproject_structure.sql y poblado por
-- 003_multiproject_backfill.sql. Se aplica sobre 001 + 002 + 003.
--
-- Reglas de referencia (todas vigentes):
--   PR-005 v3.0 (docs/project-rules.md)
--   ADR-005 v2.0 (docs/architecture-decisions.md)
--
-- PRECONDICIÓN NO NEGOCIABLE:
--   Esta migración asume que 003 ya se ejecutó y que NO quedan filas con
--   project_id NULL en public_spaces, trees ni incidents. Lo verifica por
--   sí misma (Sección 1) y aborta si no es así — no confía ciegamente en
--   que 003 haya corrido antes.
--
-- ESTA MIGRACIÓN NO HACE (por diseño, no negociable):
--   - NO modifica species (catálogo global, sin relación con
--     project_id).
--   - NO modifica project_members (representa pertenencia de usuarios,
--     no de árboles/incidencias/espacios; sin cambios aquí).
--   - NO crea ni modifica ninguna política RLS. RLS sigue diferida
--     (ADR-005 v2.0) — fuera de alcance de esta migración.
--   - NO modifica ninguna regla de negocio (PR-*/ADR-*).
--   - NO toca 001_init.sql, 002_multiproject_structure.sql ni
--     003_multiproject_backfill.sql.
--   - NO actualiza database/schema.sql — se actualiza en un paso
--     posterior y separado, una vez que esta migración se valide en el
--     entorno correspondiente (mismo patrón que 002 y 003).
--
-- QUÉ HACE:
--   1) SET NOT NULL en public_spaces.project_id, trees.project_id,
--      incidents.project_id (en ese orden).
--   2) DROP de las FK simples transitorias
--      (trees_public_space_id_fkey_transitoria,
--      incidents_tree_id_fkey_transitoria) — ÚNICAMENTE esas dos.
--   Las FK compuestas MATCH SIMPLE (trees_project_public_space_fkey,
--   incidents_tree_project_fkey) NO se tocan: siguen existiendo tal
--   cual, ahora como única fuente de la garantía de coherencia de
--   proyecto + existencia del referente.
--
-- POR QUÉ EL ORDEN IMPORTA (SET NOT NULL antes que el DROP):
--   Mientras project_id era NULLABLE, la FK compuesta MATCH SIMPLE no
--   exigía nada en las filas con project_id NULL — en esa ventana, la
--   FK simple transitoria era la única garantía de que public_space_id/
--   tree_id (cuando tenían valor) apuntaran a un referente existente.
--   Una vez que project_id es NOT NULL, toda fila donde public_space_id/
--   tree_id tenga valor tiene la tupla completa, así que la FK compuesta
--   pasa a exigir incondicionalmente existencia + coherencia de
--   proyecto — una garantía estrictamente más fuerte que la de la FK
--   simple, que queda subsumida. Por eso el SET NOT NULL debe completarse
--   antes de retirar la FK transitoria correspondiente, nunca después:
--   no se retira una red de seguridad hasta confirmar que la nueva ya
--   está en pie.
--
-- SUPUESTOS TÉCNICOS DEPENDIENTES DE POSTGRESQL:
--   - ALTER TABLE ... ALTER COLUMN ... SET NOT NULL escanea la tabla
--     completa para verificar ausencia de NULL; en PostgreSQL 12+ esto
--     puede aprovechar un CHECK (... IS NOT NULL) NOT VALID ya validado
--     para evitar el escaneo, pero aquí no existe tal CHECK previo, así
--     que el escaneo ocurre igual. Es una operación bloqueante (ACCESS
--     EXCLUSIVE LOCK) sobre la tabla mientras se ejecuta.
--   - DROP CONSTRAINT de una FK no requiere que la tabla no tenga datos;
--     es una operación de catálogo, también bajo ACCESS EXCLUSIVE LOCK
--     breve.
--   - Esta migración incluye BEGIN/COMMIT explícitos y debe ejecutarse
--     como una única unidad atómica, de principio a fin, en una sola
--     sesión/ejecución (mismo criterio que 003).
--
-- REEJECUCIÓN:
--   Esta migración NO está diseñada para reejecutarse después de un
--   COMMIT exitoso: una vez aplicada, las FK transitorias ya no existen,
--   así que un segundo intento de DROP CONSTRAINT sobre ellas (Sección 3)
--   fallará. Es intencional: no se usa DROP CONSTRAINT IF EXISTS para que
--   una ausencia inesperada de esas FK antes de ejecutar 004 (por
--   ejemplo, si ya se aplicó parcialmente por otra vía) siga siendo
--   detectable como un error explícito, en vez de quedar silenciosamente
--   oculta.
-- =====================================================================


BEGIN;

-- ---------------------------------------------------------------------
-- SECCIÓN 1 — PRECONDICIÓN (aborta si queda algún project_id NULL)
-- ---------------------------------------------------------------------
-- Mismo patrón que 003: un bloque DO $$ ... RAISE EXCEPTION ... $$ por
-- tabla, ANTES de cualquier ALTER TABLE. Si 003 no se ejecutó, o se
-- ejecutó con un mapeo incompleto, esto lo detiene aquí.

DO $$
DECLARE
  v_null_count integer;
BEGIN
  SELECT COUNT(*) INTO v_null_count
  FROM public_spaces
  WHERE project_id IS NULL;

  IF v_null_count > 0 THEN
    RAISE EXCEPTION
      'Migración 004 abortada: % fila(s) de public_spaces con project_id NULL. Ejecutar/completar 003_multiproject_backfill.sql para esta tabla antes de reintentar.',
      v_null_count;
  END IF;
END $$;

DO $$
DECLARE
  v_null_count integer;
BEGIN
  SELECT COUNT(*) INTO v_null_count
  FROM trees
  WHERE project_id IS NULL;

  IF v_null_count > 0 THEN
    RAISE EXCEPTION
      'Migración 004 abortada: % fila(s) de trees con project_id NULL. Ejecutar/completar 003_multiproject_backfill.sql para esta tabla antes de reintentar.',
      v_null_count;
  END IF;
END $$;

DO $$
DECLARE
  v_null_count integer;
BEGIN
  SELECT COUNT(*) INTO v_null_count
  FROM incidents
  WHERE project_id IS NULL;

  IF v_null_count > 0 THEN
    RAISE EXCEPTION
      'Migración 004 abortada: % fila(s) de incidents con project_id NULL. Ejecutar/completar 003_multiproject_backfill.sql para esta tabla antes de reintentar.',
      v_null_count;
  END IF;
END $$;


-- ---------------------------------------------------------------------
-- SECCIÓN 2 — SET NOT NULL (orden: public_spaces -> trees -> incidents)
-- ---------------------------------------------------------------------
-- No hay dependencia estructural real entre las tres columnas (cada
-- ALTER es independiente); se mantiene este orden por consistencia con
-- el orden de backfill usado en 003.

ALTER TABLE public_spaces
  ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE trees
  ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE incidents
  ALTER COLUMN project_id SET NOT NULL;


-- ---------------------------------------------------------------------
-- SECCIÓN 3 — DROP de las FK simples transitorias (únicamente estas dos)
-- ---------------------------------------------------------------------
-- Va DESPUÉS de la Sección 2: no se retira la garantía vieja hasta
-- confirmar (en el mismo BEGIN/COMMIT) que la garantía nueva ya está en
-- pie. Las FK compuestas MATCH SIMPLE (trees_project_public_space_fkey,
-- incidents_tree_project_fkey) NO se tocan.

ALTER TABLE trees
  DROP CONSTRAINT trees_public_space_id_fkey_transitoria;

ALTER TABLE incidents
  DROP CONSTRAINT incidents_tree_id_fkey_transitoria;


-- ---------------------------------------------------------------------
-- SECCIÓN 4 — VERIFICACIÓN POSTERIOR (defensiva)
-- ---------------------------------------------------------------------
-- Confirma, por introspección de catálogo, que el estado final es
-- exactamente el esperado: las 3 columnas NOT NULL, las 2 FK compuestas
-- siguen existiendo, y las 2 FK transitorias ya no existen. No debería
-- poder dispararse si las Secciones 2 y 3 tuvieron éxito, pero cubre
-- bugs sutiles (p. ej. un DROP silenciosamente no aplicado).

DO $$
DECLARE
  v_public_spaces_notnull boolean;
  v_trees_notnull         boolean;
  v_incidents_notnull     boolean;
BEGIN
  SELECT attnotnull INTO v_public_spaces_notnull
  FROM pg_attribute
  WHERE attrelid = 'public_spaces'::regclass
    AND attname = 'project_id'
    AND NOT attisdropped;

  SELECT attnotnull INTO v_trees_notnull
  FROM pg_attribute
  WHERE attrelid = 'trees'::regclass
    AND attname = 'project_id'
    AND NOT attisdropped;

  SELECT attnotnull INTO v_incidents_notnull
  FROM pg_attribute
  WHERE attrelid = 'incidents'::regclass
    AND attname = 'project_id'
    AND NOT attisdropped;

  IF NOT COALESCE(v_public_spaces_notnull, false)
     OR NOT COALESCE(v_trees_notnull, false)
     OR NOT COALESCE(v_incidents_notnull, false)
  THEN
    RAISE EXCEPTION
      'Migración 004 abortada tras aplicar SET NOT NULL: el estado final no coincide con lo esperado (public_spaces.project_id NOT NULL=%, trees.project_id NOT NULL=%, incidents.project_id NOT NULL=%).',
      v_public_spaces_notnull, v_trees_notnull, v_incidents_notnull;
  END IF;
END $$;

DO $$
DECLARE
  v_composite_fk_count integer;
BEGIN
  -- Cada constraint se asocia a su tabla exacta vía conrelid, no solo por
  -- nombre: evita un falso positivo si algún día existiera un conname
  -- coincidente en una tabla distinta.
  SELECT COUNT(*) INTO v_composite_fk_count
  FROM pg_constraint
  WHERE contype = 'f'
    AND (
      (conname = 'trees_project_public_space_fkey' AND conrelid = 'public.trees'::regclass)
      OR (conname = 'incidents_tree_project_fkey' AND conrelid = 'public.incidents'::regclass)
    );

  IF v_composite_fk_count <> 2 THEN
    RAISE EXCEPTION
      'Migración 004 abortada: se esperaban 2 FK compuestas vigentes (trees_project_public_space_fkey, incidents_tree_project_fkey) y se encontraron %. No deben haberse modificado ni eliminado.',
      v_composite_fk_count;
  END IF;
END $$;

DO $$
DECLARE
  v_transitoria_fk_count integer;
BEGIN
  -- Igual criterio: asociar cada constraint a su tabla exacta vía
  -- conrelid, no solo por nombre.
  SELECT COUNT(*) INTO v_transitoria_fk_count
  FROM pg_constraint
  WHERE contype = 'f'
    AND (
      (conname = 'trees_public_space_id_fkey_transitoria' AND conrelid = 'public.trees'::regclass)
      OR (conname = 'incidents_tree_id_fkey_transitoria' AND conrelid = 'public.incidents'::regclass)
    );

  IF v_transitoria_fk_count <> 0 THEN
    RAISE EXCEPTION
      'Migración 004 abortada: todavía existen % FK transitoria(s) que deberían haberse eliminado en la Sección 3.',
      v_transitoria_fk_count;
  END IF;
END $$;

COMMIT;

-- =====================================================================
-- FIN 004_multiproject_finalize.sql
--
-- Estado resultante:
--   - public_spaces.project_id, trees.project_id, incidents.project_id:
--     NOT NULL.
--   - trees_public_space_id_fkey_transitoria,
--     incidents_tree_id_fkey_transitoria: eliminadas.
--   - trees_project_public_space_fkey, incidents_tree_project_fkey:
--     intactas, ahora única fuente de la garantía de coherencia de
--     proyecto + existencia del referente para estas dos relaciones.
--   - species, project_members: sin cambios.
--
-- Pendiente, fuera de alcance de esta migración:
--   - Actualizar database/schema.sql para reflejar NOT NULL en las tres
--     columnas y el retiro de las FK transitorias (paso separado,
--     posterior a validar esta migración en el entorno correspondiente).
--   - Diseñar e implementar RLS (ADR-005 v2.0, posterior a esta
--     migración).
-- =====================================================================
