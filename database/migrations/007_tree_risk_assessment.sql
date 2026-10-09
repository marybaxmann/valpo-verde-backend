-- ============================================================================
-- Migración 007 — EVALUACIÓN TÉCNICA Y RIESGO (corte vertical mínimo)
-- ============================================================================
--
-- Fuente de las reglas implementadas: borrador_reglas_diagramas_v3.xlsx
-- (hojas REGLAS_INDICADORES y CHEQUEO_PUNTAJES) y Base de Datos Valpo
-- Verde.xlsx (hojas MATRICES_CALCULO, DICCIONARIO_CAMPOS, LISTAS),
-- verificadas celda por celda el 2026-10-06. Estos Excel son más recientes
-- que docs/methodology/*.md y project-rules.md, que todavía no están
-- sincronizados — deuda documental registrada, no resuelta aquí.
--
-- R01/R02/R03/R04 + M01 (probabilidad de impacto) + M02/M03 (clasificación
-- de riesgo por componente) quedan implementados. M04 (infraestructura) y
-- M05 (prioridad) quedan explícitamente fuera de este corte.
--
-- El cálculo (R01–R04, M01–M03) se ejecuta en el backend (TypeScript,
-- services/rules/treeRisk.ts), no en esta migración: esta tabla solo
-- persiste las variables observadas y los resultados ya calculados.
-- El motivo: la lógica de clasificación tiene ramas "No determinado" que
-- son más mantenibles y testeables como código de aplicación que como
-- función PL/pgSQL. La autorización de la escritura sigue viviendo en
-- RLS, igual que en `trees` (ADR-014): el backend calcula, Postgres decide
-- si esa fila puede existir para ese usuario.
--
-- ÁRBOL vs EVALUACIÓN: esta tabla es 1:N respecto de `trees`, igual que
-- `tree_measurements` (ADR-016, modelo-arbol-medicion.md) — una evaluación
-- es un evento fechado, nunca sobrescribe una evaluación anterior. El
-- riesgo pertenece a la evaluación, no al árbol.
-- ============================================================================

CREATE TABLE tree_risk_assessments (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id                       UUID NOT NULL REFERENCES trees(id),

  fecha_evaluacion              DATE NOT NULL,

  -- Todas las variables observadas por el inspector (R01/R02/R03, M01,
  -- consecuencias por componente). Estructura mínima de demo, no los
  -- 100+ campos finales del Excel — ver services/rules/treeRisk.ts para
  -- el contrato exacto de claves.
  variables                     JSONB NOT NULL,

  -- Resultados R01/R02/R03 (NULL = "No determinado": al menos un
  -- indicador parcial quedó sin puntaje — CHEQUEO_PUNTAJES N13, pendiente
  -- metodológico; nunca se sustituye por 0).
  puntaje_raices_cuello         INTEGER,
  probabilidad_falla_raices_cuello TEXT,
  puntaje_tronco                INTEGER,
  probabilidad_falla_tronco     TEXT,
  puntaje_copa_ramas            INTEGER,
  probabilidad_falla_copa_ramas TEXT,

  -- M01 (siempre calculable: zona_objetivo y tasa_ocupacion_objetivo son
  -- obligatorias).
  probabilidad_impacto          TEXT NOT NULL,

  -- M02+M03 por componente, y R04 (NULL si algún componente es "No
  -- determinado").
  clasificacion_raices_cuello   TEXT,
  clasificacion_tronco          TEXT,
  clasificacion_copa_ramas      TEXT,
  clasificacion_riesgo          TEXT,

  -- Trazabilidad de qué versión de reglas produjo este resultado. No hay
  -- `rule_version` publicada todavía (paquete 2.0.0 en preparación): se
  -- usa un identificador fijo de la fuente borrador utilizada.
  rule_version                  TEXT NOT NULL DEFAULT 'borrador_reglas_diagramas_v3',

  created_by                    UUID REFERENCES user_profiles(id),
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_tree_risk_probabilidad_impacto
    CHECK (probabilidad_impacto IN ('Muy baja', 'Baja', 'Media', 'Alta')),
  CONSTRAINT chk_tree_risk_prob_falla_rc
    CHECK (probabilidad_falla_raices_cuello IS NULL OR probabilidad_falla_raices_cuello IN ('Improbable', 'Posible', 'Probable', 'Inminente')),
  CONSTRAINT chk_tree_risk_prob_falla_tr
    CHECK (probabilidad_falla_tronco IS NULL OR probabilidad_falla_tronco IN ('Improbable', 'Posible', 'Probable', 'Inminente')),
  CONSTRAINT chk_tree_risk_prob_falla_cr
    CHECK (probabilidad_falla_copa_ramas IS NULL OR probabilidad_falla_copa_ramas IN ('Improbable', 'Posible', 'Probable', 'Inminente')),
  CONSTRAINT chk_tree_risk_clasificacion_rc
    CHECK (clasificacion_raices_cuello IS NULL OR clasificacion_raices_cuello IN ('Bajo', 'Moderado', 'Alto', 'Extremo')),
  CONSTRAINT chk_tree_risk_clasificacion_tr
    CHECK (clasificacion_tronco IS NULL OR clasificacion_tronco IN ('Bajo', 'Moderado', 'Alto', 'Extremo')),
  CONSTRAINT chk_tree_risk_clasificacion_cr
    CHECK (clasificacion_copa_ramas IS NULL OR clasificacion_copa_ramas IN ('Bajo', 'Moderado', 'Alto', 'Extremo')),
  CONSTRAINT chk_tree_risk_clasificacion_riesgo
    CHECK (clasificacion_riesgo IS NULL OR clasificacion_riesgo IN ('Bajo', 'Moderado', 'Alto', 'Extremo')),
  CONSTRAINT chk_tree_risk_puntaje_rc CHECK (puntaje_raices_cuello IS NULL OR (puntaje_raices_cuello >= 0 AND puntaje_raices_cuello <= 9)),
  CONSTRAINT chk_tree_risk_puntaje_tr CHECK (puntaje_tronco IS NULL OR (puntaje_tronco >= 0 AND puntaje_tronco <= 14)),
  CONSTRAINT chk_tree_risk_puntaje_cr CHECK (puntaje_copa_ramas IS NULL OR (puntaje_copa_ramas >= 0 AND puntaje_copa_ramas <= 5))
);

CREATE INDEX idx_tree_risk_assessments_tree_id ON tree_risk_assessments (tree_id, fecha_evaluacion DESC);

-- ---------------------------------------------------------------------
-- RLS — mismo modelo que `trees` (migración 005): admin acceso total;
-- usuario_municipal según membresía del proyecto del árbol evaluado.
-- Sin UPDATE/DELETE para usuario_municipal: una evaluación registrada no
-- se corrige ni se anula en este corte (fuera de alcance — "no
-- implementes todavía edición histórica compleja").
-- ---------------------------------------------------------------------

ALTER TABLE tree_risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tree_risk_assessments_all_admin
  ON tree_risk_assessments FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY tree_risk_assessments_select_municipal
  ON tree_risk_assessments FOR SELECT
  TO authenticated
  USING (
    public.is_municipal_member((SELECT t.project_id FROM public.trees t WHERE t.id = tree_id))
  );

CREATE POLICY tree_risk_assessments_insert_municipal
  ON tree_risk_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_municipal_member((SELECT t.project_id FROM public.trees t WHERE t.id = tree_id))
  );
