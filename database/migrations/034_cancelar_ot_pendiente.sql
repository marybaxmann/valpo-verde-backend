-- =====================================================================
-- Migración 034 — Cancelar una OT Pendiente sin fecha programada (CC-050)
-- PROPUESTA: no aplicada. Requiere autorización de Valej y se aplica
-- solo en la base de pruebas (gmlbmyreoxgoqrolhyxo).
-- (032 sigue reservada para la propuesta de identificación de especie;
-- 033 es la de notificaciones.)
-- =====================================================================
--
-- Defecto (hallado el 2026-11-02 en un ensayo revertido):
--   chk_work_orders_fecha_programada (014) exige
--     estado_ot = 'pendiente' OR fecha_accion_programada IS NOT NULL.
--   fn_cancel_work_order (025) acepta cancelar desde Pendiente, Programada
--   o En ejecución (CC-050) y solo cambia estado y auditoría. Una OT
--   Pendiente no tiene fecha programada (D-241: se ingresa al pasar a
--   Programada), así que al quedar Cancelada viola el CHECK: la
--   cancelación desde Pendiente falla siempre, para Inspección y para
--   Mantenimiento (la misma función sirve a los dos tipos, 031).
--
-- Corrección: el CHECK admite también 'cancelada' sin fecha.
--   - Pendiente: sin cambios (fecha opcional).
--   - Programada, En ejecución, Completada: siguen exigiendo fecha.
--   - Cancelada: fecha opcional. Una OT cancelada desde Programada o En
--     ejecución conserva su fecha (fn_cancel_work_order no la toca); una
--     cancelada desde Pendiente queda sin fecha, porque nunca la tuvo.
--   No se borra ni se rellena ninguna fecha. No se cambia ninguna
--   función. Las demás restricciones (chk_work_orders_cancelada,
--   chk_work_orders_completada_fecha, etc.) quedan iguales.
--
-- Coherente con D-241 («obligatoria desde Programada»): una OT cancelada
-- desde Pendiente nunca llegó a Programada. No requiere cambio en el
-- Excel maestro.
--
-- Límite conocido: el CHECK no conoce el estado anterior, así que no
-- puede exigir que una OT cancelada desde Programada conserve la fecha.
-- Hoy ningún camino la borra (fn_cancel_work_order no la toca y ninguna
-- función modifica una OT cancelada); la prueba R3/R4 lo comprueba.
--
-- Mismo nombre de restricción: los mensajes de error y la documentación
-- siguen refiriéndose a chk_work_orders_fecha_programada.
-- =====================================================================

ALTER TABLE public.work_orders
  DROP CONSTRAINT chk_work_orders_fecha_programada;

-- fecha_accion_programada obligatoria desde Programada (D-241), salvo en
-- una OT cancelada desde Pendiente (CC-050).
ALTER TABLE public.work_orders
  ADD CONSTRAINT chk_work_orders_fecha_programada
    CHECK (estado_ot IN ('pendiente', 'cancelada') OR fecha_accion_programada IS NOT NULL);
