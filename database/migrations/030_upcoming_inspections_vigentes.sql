-- =====================================================================
-- Migración 030 — v_upcoming_inspections solo con fechas vigentes (AM-18;
-- B5; CC-037; CC-055; REGLAS_GENERALES filas 12 y 25)
-- =====================================================================
--
-- Autorizada por la responsable el 2026-11-01 (AM-18).
--
-- La vista de la 016 tomaba las fechas de la última inspección
-- Finalizada aunque su OT no estuviera Completada (AM-18: error de
-- implementación; REGLAS_GENERALES fila 12 exige que los valores rijan
-- al completar la OT). Nadie la usaba todavía en el backend.
--
-- Se reconstruye sobre v_tree_fechas_vigentes (020; CC-055): cada fecha
-- sale de la inspección Finalizada de OT Completada que la registró. Una
-- fila por árbol y por tipo de recordatorio:
--   tipo             'inspeccion' (D-202) o 'monitoreo' (D-203)
--   fecha            la vigente (ajustada si existe; si no, la sugerida)
--   ajustada         la fecha difiere de la sugerida (ajuste del Inspector)
--   inspection_id    inspección de origen de esa fecha
--   fecha_inspeccion de la inspección de origen
--   nivel_riesgo     riesgo efectivo de esa inspección (D-200: el
--                    ajustado si existe; si no, el calculado)
-- El término del rango lo calcula el backend con la tabla de plazos del
-- motor (CC-037: «Impacto en BD: ninguno adicional»).
--
-- Cambia las columnas, así que va con DROP + CREATE (ningún objeto
-- depende de la vista). Conserva security_invoker y los permisos de la
-- 017 (SELECT solo para authenticated).
-- =====================================================================

DROP VIEW public.v_upcoming_inspections;

CREATE VIEW public.v_upcoming_inspections WITH (security_invoker = true) AS
WITH origen AS (
  SELECT f.tree_id, 'inspeccion'::text AS tipo, f.fecha_proxima_inspeccion AS fecha, f.origen_fecha_proxima_inspeccion AS inspection_id
  FROM public.v_tree_fechas_vigentes f
  WHERE f.fecha_proxima_inspeccion IS NOT NULL
  UNION ALL
  SELECT f.tree_id, 'monitoreo'::text, f.fecha_proximo_monitoreo, f.origen_fecha_proximo_monitoreo
  FROM public.v_tree_fechas_vigentes f
  WHERE f.fecha_proximo_monitoreo IS NOT NULL
)
SELECT
  t.project_id,
  o.tree_id,
  o.tipo,
  o.fecha,
  CASE o.tipo
    WHEN 'inspeccion' THEN i.fecha_proxima_inspeccion IS NOT NULL AND i.fecha_proxima_inspeccion IS DISTINCT FROM i.fecha_proxima_inspeccion_sugerida
    ELSE i.fecha_proximo_monitoreo IS NOT NULL AND i.fecha_proximo_monitoreo IS DISTINCT FROM i.fecha_proximo_monitoreo_sugerida
  END AS ajustada,
  o.inspection_id,
  i.fecha_inspeccion,
  COALESCE(e.clasificacion_riesgo_ajustada, e.clasificacion_riesgo_calculada) AS nivel_riesgo
FROM origen o
JOIN public.trees t ON t.id = o.tree_id
JOIN public.inspections i ON i.id = o.inspection_id
LEFT JOIN public.evaluations e ON e.inspection_id = o.inspection_id;

REVOKE ALL ON public.v_upcoming_inspections FROM PUBLIC, anon;
GRANT SELECT ON public.v_upcoming_inspections TO authenticated;
