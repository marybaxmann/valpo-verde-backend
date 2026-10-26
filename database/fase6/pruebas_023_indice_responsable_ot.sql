-- =====================================================================
-- Pruebas de la migración 023 — índice de work_orders por responsable
-- (CC-065 punto 8)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, DESPUÉS de aplicar la 023.
-- Solo lectura del catálogo, dentro de BEGIN … ROLLBACK.
--
-- I1: el índice existe, sobre (responsable_accion_id, estado_ot), btree.
-- I2: es el único índice de work_orders que empieza por responsable_accion_id.

BEGIN;

CREATE TEMP TABLE test_log (id serial PRIMARY KEY, msg text);

DO $$
DECLARE
  v_def text;
  v_n int;
BEGIN
  SELECT indexdef INTO v_def FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'work_orders' AND indexname = 'idx_work_orders_responsable';
  IF v_def IS DISTINCT FROM 'CREATE INDEX idx_work_orders_responsable ON public.work_orders USING btree (responsable_accion_id, estado_ot)' THEN
    RAISE EXCEPTION 'I1 FALLA: %', v_def;
  END IF;
  INSERT INTO test_log (msg) VALUES ('I1 OK: ' || v_def);

  SELECT count(*) INTO v_n FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'work_orders' AND indexdef LIKE '%(responsable_accion_id%';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'I2 FALLA: % índices empiezan por responsable_accion_id', v_n;
  END IF;
  INSERT INTO test_log (msg) VALUES ('I2 OK');
END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
