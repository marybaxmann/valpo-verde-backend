-- Reversión de la 030: vuelve la v_upcoming_inspections de la 016 (con
-- security_invoker y los permisos de la 017), incluido el error de AM-18.
DROP VIEW public.v_upcoming_inspections;

CREATE VIEW public.v_upcoming_inspections WITH (security_invoker = true) AS
SELECT DISTINCT ON (t.id)
  t.project_id,
  t.id AS tree_id,
  i.id AS inspection_id,
  COALESCE(i.fecha_proxima_inspeccion, i.fecha_proxima_inspeccion_sugerida) AS fecha_proxima_inspeccion,
  COALESCE(i.fecha_proximo_monitoreo, i.fecha_proximo_monitoreo_sugerida) AS fecha_proximo_monitoreo,
  COALESCE(e.clasificacion_riesgo_ajustada, e.clasificacion_riesgo_calculada) AS nivel_riesgo
FROM public.trees t
JOIN public.inspections i ON i.tree_id = t.id AND i.estado_registro = 'finalizado'
LEFT JOIN public.evaluations e ON e.inspection_id = i.id
ORDER BY t.id, i.fecha_inspeccion DESC, i.created_at DESC;

REVOKE ALL ON public.v_upcoming_inspections FROM PUBLIC, anon;
GRANT SELECT ON public.v_upcoming_inspections TO authenticated;
