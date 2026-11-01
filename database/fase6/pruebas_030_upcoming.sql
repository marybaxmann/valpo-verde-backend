-- =====================================================================
-- Pruebas de la migración 030 (AM-18; B5). Base de pruebas, solo
-- lecturas o BEGIN…ROLLBACK. Resultado 2026-11-01: todas OK, antes y
-- después de revertir y reaplicar.
-- =====================================================================
-- U1: una fila por árbol y tipo con fecha vigente (inspección y
--     monitoreo), con ajustada, origen, fecha de inspección y riesgo.
--     Con los datos del 2026-11-01: 10 filas (5 árboles × 2 tipos).
SELECT t.tree_code, u.tipo, u.fecha, u.ajustada, u.nivel_riesgo, u.fecha_inspeccion
FROM v_upcoming_inspections u JOIN trees t ON t.id = u.tree_id
ORDER BY t.tree_code, u.tipo;

-- U2: security_invoker y permisos (anon sin SELECT; authenticated con SELECT).
SELECT (SELECT reloptions FROM pg_class WHERE relname = 'v_upcoming_inspections') AS opciones,
       has_table_privilege('anon', 'public.v_upcoming_inspections', 'SELECT') AS anon,
       has_table_privilege('authenticated', 'public.v_upcoming_inspections', 'SELECT') AS authenticated;

-- U3 (AM-18): si la OT de origen deja de estar completada, sus fechas
-- salen de la lista (esperado: 0 filas del árbol; el total baja en 2).
BEGIN;
ALTER TABLE work_orders DISABLE TRIGGER USER;
UPDATE work_orders SET estado_ot = 'en_ejecucion', fecha_completada_ot = NULL
WHERE id = (SELECT i.work_order_id FROM inspections i JOIN trees t ON t.id = i.tree_id
            WHERE t.tree_code = 'A-000423' AND i.estado_registro = 'finalizado' LIMIT 1);
SELECT (SELECT count(*) FROM v_upcoming_inspections u JOIN trees t ON t.id = u.tree_id WHERE t.tree_code = 'A-000423') AS filas_arbol,
       (SELECT count(*) FROM v_upcoming_inspections) AS total;
ROLLBACK;

-- U4: RLS con el JWT del usuario: un usuario sin proyectos no ve filas (esperado: 0).
BEGIN;
INSERT INTO auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES ('00000000-0000-0000-0000-000000000000', '0000aaaa-0000-4000-8000-000000000030', 'authenticated', 'authenticated',
        'sin-proyecto-030@sivu.example.test', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false);
INSERT INTO user_profiles (id, role_id, nombre, activo)
VALUES ('0000aaaa-0000-4000-8000-000000000030', (SELECT id FROM roles WHERE nombre = 'usuario_municipal'), 'Sin proyecto 030', true);
SELECT set_config('request.jwt.claims', '{"sub":"0000aaaa-0000-4000-8000-000000000030","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT count(*) AS filas_visibles FROM v_upcoming_inspections;
ROLLBACK;
