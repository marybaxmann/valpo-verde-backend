-- =====================================================================
-- Migración 016 — Vistas de valores derivados
-- Diseño Fase 3 §4, §7 paso 6. Issue #42.
-- =====================================================================

-- ---------------------------------------------------------------------
-- v_tree_presence: estado_presencia y fecha_cambio_estado_presencia
-- (D-28, D-29; PR-020 v1.1). Talado/Retirado solo con OT completada +
-- mantenimiento aprobado de Tala o Retiro_tocón (requiere_revision_
-- inspector es siempre true ahí, vía trigger de 014: nunca hay camino
-- sin revisión para estos dos subtipos).
-- ---------------------------------------------------------------------
CREATE VIEW v_tree_presence AS
WITH cierre AS (
  SELECT
    wo.tree_id,
    wo.subtipo_accion,
    mr.fecha_revision,
    ROW_NUMBER() OVER (PARTITION BY wo.tree_id ORDER BY mr.fecha_revision DESC) AS rn
  FROM work_orders wo
  JOIN maintenance_records mr ON mr.work_order_id = wo.id
  WHERE wo.estado_ot = 'completada'
    AND wo.subtipo_accion IN ('tala', 'retiro_tocon')
    AND mr.estado_revision = 'aprobado'
)
SELECT
  t.id AS tree_id,
  CASE
    WHEN c.subtipo_accion = 'tala' THEN 'talado'
    WHEN c.subtipo_accion = 'retiro_tocon' THEN 'retirado'
    ELSE 'presente'
  END AS estado_presencia,
  COALESCE(c.fecha_revision::date, t.fecha_registro) AS fecha_cambio_estado_presencia
FROM trees t
LEFT JOIN cierre c ON c.tree_id = t.id AND c.rn = 1;

-- ---------------------------------------------------------------------
-- v_inspections: inspección + nivel_riesgo (riesgo efectivo: ajustado
-- si existe, si no, calculado). D-200.
-- ---------------------------------------------------------------------
CREATE VIEW v_inspections AS
SELECT
  i.*,
  COALESCE(e.clasificacion_riesgo_ajustada, e.clasificacion_riesgo_calculada) AS nivel_riesgo
FROM inspections i
LEFT JOIN evaluations e ON e.inspection_id = i.id;

-- ---------------------------------------------------------------------
-- v_tree_current_inputs: entradas vigentes de REGISTRO_EVALUACION,
-- compuestas campo por campo desde `evaluations.variables` (CC-040; RG
-- "Historial y vigencia"). `entradas_vigentes` trae el valor más
-- reciente de cada clave; `origen_por_campo` la inspección que lo
-- aportó.
-- ---------------------------------------------------------------------
CREATE VIEW v_tree_current_inputs AS
WITH validas AS (
  SELECT
    e.tree_id,
    e.inspection_id,
    wo.fecha_completada_ot,
    kv.key,
    kv.value
  FROM evaluations e
  JOIN inspections i ON i.id = e.inspection_id
  JOIN work_orders wo ON wo.id = i.work_order_id
  CROSS JOIN LATERAL jsonb_each(e.variables) AS kv(key, value)
  WHERE i.estado_registro <> 'anulado'
    AND wo.estado_ot = 'completada'
),
ranked AS (
  SELECT
    tree_id, key, value, inspection_id,
    ROW_NUMBER() OVER (PARTITION BY tree_id, key ORDER BY fecha_completada_ot DESC) AS rn
  FROM validas
)
SELECT
  tree_id,
  jsonb_object_agg(key, value) AS entradas_vigentes,
  jsonb_object_agg(key, to_jsonb(inspection_id)) AS origen_por_campo
FROM ranked
WHERE rn = 1
GROUP BY tree_id;

-- ---------------------------------------------------------------------
-- v_tree_current_assessment: evaluación vigente del árbol = la fila más
-- reciente de tree_assessments (D-242 L; CC-031; CC-040). Sin filas:
-- "Evaluación pendiente" (ausencia del árbol en esta vista; lo
-- interpreta el backend/frontend, no hay fila "vacía" aquí).
-- ---------------------------------------------------------------------
CREATE VIEW v_tree_current_assessment AS
SELECT DISTINCT ON (tree_id) *
FROM tree_assessments
ORDER BY tree_id, created_at DESC;

-- ---------------------------------------------------------------------
-- v_species_traits: árbol + rasgos del catálogo por especie_cientifica
-- normalizada (D-257 a D-262; CC-039). "no_determinado" si no hay
-- especie en el catálogo.
-- ---------------------------------------------------------------------
CREATE VIEW v_species_traits AS
SELECT
  t.id AS tree_id,
  COALESCE(s.origen_biogeografico, 'no_determinado') AS origen_biogeografico,
  s.persistencia_follaje,
  s.tipo_hoja,
  s.genero,
  s.familia
FROM trees t
LEFT JOIN species s
  ON lower(regexp_replace(trim(t.especie_cientifica), '\s+', ' ', 'g'))
   = lower(regexp_replace(trim(s.especie_cientifica), '\s+', ' ', 'g'));

-- ---------------------------------------------------------------------
-- v_upcoming_inspections: por proyecto, próxima inspección y monitoreo
-- de cada árbol, con la fecha ajustada si existe (D-202, D-203; CC-037).
-- El rango (inicio/término) lo calcula el backend desde nivel_riesgo con
-- su tabla de plazos — no hay columnas de rango en la base ("Impacto en
-- BD: ninguno adicional", CC-037).
-- ---------------------------------------------------------------------
CREATE VIEW v_upcoming_inspections AS
SELECT DISTINCT ON (t.id)
  t.project_id,
  t.id AS tree_id,
  i.id AS inspection_id,
  COALESCE(i.fecha_proxima_inspeccion, i.fecha_proxima_inspeccion_sugerida) AS fecha_proxima_inspeccion,
  COALESCE(i.fecha_proximo_monitoreo, i.fecha_proximo_monitoreo_sugerida) AS fecha_proximo_monitoreo,
  COALESCE(e.clasificacion_riesgo_ajustada, e.clasificacion_riesgo_calculada) AS nivel_riesgo
FROM trees t
JOIN inspections i ON i.tree_id = t.id AND i.estado_registro = 'finalizado'
LEFT JOIN evaluations e ON e.inspection_id = i.id
ORDER BY t.id, i.fecha_inspeccion DESC, i.created_at DESC;
