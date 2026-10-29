-- Reversión de la 027: borra fn_anular_inspeccion (CC-067). Las
-- inspecciones ya anuladas y sus filas de tree_assessments quedan como
-- historial: la reversión no las restaura.
DROP FUNCTION IF EXISTS public.fn_anular_inspeccion(UUID, UUID, TEXT, JSONB);
