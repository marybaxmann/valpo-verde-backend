-- =====================================================================
-- Migración 020 — Finalizar una inspección (#59/#72; D-13, D-27, D-202,
-- D-203, D-204; CC-040, CC-044, CC-045, CC-048, CC-053, CC-054, CC-055)
-- =====================================================================
--
-- PROPUESTA — NO APLICAR SIN APROBACIÓN DE LA RESPONSABLE.
--
-- Alcance decidido por la responsable (2026-10-25; CC-054): finalizar en
-- DOS pasos. `POST .../calcular` (sin esta migración, 100% TS: lee
-- v_tree_current_inputs + trees + v_tree_fechas_vigentes + esta
-- inspección, corre el motor en memoria, devuelve resultados/fechas
-- sugeridas/campos faltantes, NO escribe nada) y `POST .../finalizar`,
-- que invoca la función de abajo UNA SOLA VEZ cuando ya se verificó que
-- todo está completo (alcance por tipo/CC-040, D-13, las 4 vistas de
-- D-27) — si falta algo, el service ni siquiera llama a esta función:
-- la inspección sigue Preguardado y no se toca `species` (CC-053, "si
-- falta algo no se toca el catálogo").
--
-- Completar la OT (`fn_refresh_tree_current` + `ensamblarResultadoVigente`
-- + `tree_assessments`), anular una inspección y el rol de Postgres de
-- ADR-017 NO son parte de este bloque — van al bloque de estados
-- restantes de la OT (acordado con la responsable). Esta función NUNCA
-- toca `trees`, `work_orders` ni `tree_assessments`.
--
-- No necesita `node-postgres` (ADR-017): la lectura de los valores
-- vigentes (`v_tree_current_inputs`/`trees`) termina ANTES de llamar al
-- motor (TS, en memoria); la escritura completa es UNA sola invocación
-- de esta función `SECURITY DEFINER` — mismo patrón que
-- `fn_save_inspection_draft`/`fn_create_tree_alta`. Riesgo aceptado
-- (CC-054, decisión de la responsable): entre esa lectura y esta
-- escritura, otra OT del mismo árbol podría completarse — bajo volumen,
-- riesgo aceptado, no se bloquea con una transacción explícita. Distinto
-- de eso, la inspección y su OT SÍ se bloquean aquí (`FOR UPDATE`):
-- dos finalizaciones simultáneas, o una finalización junto con un
-- cambio de responsable, se serializan.
--
-- SQLSTATE nuevo `SV064` (uno por función/alcance, igual que el resto).
--
-- El criterio de «la última» inspección de `v_tree_fechas_vigentes`
-- (CC-055) es el mismo que la migración 021 lleva a
-- `fn_refresh_tree_current` y `v_tree_current_inputs`; las dos
-- migraciones son independientes y se revierten por separado.

-- ---------------------------------------------------------------------
-- 1. v_tree_fechas_vigentes — fecha vigente de próxima inspección y de
--    próximo monitoreo por árbol (CC-055)
-- ---------------------------------------------------------------------
-- Definición única de la «fecha vigente»: la de la última inspección
-- Finalizada de una OT Completada que la registró (REGLAS_GENERALES
-- fila 12: los valores nuevos rigen solo al completar la OT). Una
-- inspección Preguardada, Anulada o de una OT abierta no cuenta. «La
-- última» (CC-055, REGLAS_GENERALES fila 13): `fecha_completada_ot`
-- DESC, luego `fecha_inspeccion` DESC, luego `created_at` DESC. Cada
-- fecha se toma de la inspección que la registró (por eso dos
-- DISTINCT ON, uno por fecha); el valor es el ajustado si existe, si no
-- el sugerido, igual que `v_upcoming_inspections`.
--
-- Por ahora la usa solo el cierre de la inspección (/calcular y
-- /finalizar, y la validación de Monitoreo de abajo).
-- `v_upcoming_inspections` y los recordatorios quedan intactos hasta el
-- #63 (AM-18). Árbol sin ninguna inspección vigente = sin fila.

CREATE VIEW v_tree_fechas_vigentes WITH (security_invoker = true) AS
WITH candidatas AS (
  SELECT
    i.tree_id,
    i.id AS inspection_id,
    wo.fecha_completada_ot,
    i.fecha_inspeccion,
    i.created_at,
    COALESCE(i.fecha_proxima_inspeccion, i.fecha_proxima_inspeccion_sugerida) AS fecha_proxima_inspeccion,
    COALESCE(i.fecha_proximo_monitoreo, i.fecha_proximo_monitoreo_sugerida) AS fecha_proximo_monitoreo
  FROM inspections i
  JOIN work_orders wo ON wo.id = i.work_order_id
  WHERE i.estado_registro = 'finalizado'
    AND wo.estado_ot = 'completada'
),
ultima_inspeccion AS (
  SELECT DISTINCT ON (tree_id) tree_id, inspection_id, fecha_proxima_inspeccion
  FROM candidatas
  WHERE fecha_proxima_inspeccion IS NOT NULL
  ORDER BY tree_id, fecha_completada_ot DESC, fecha_inspeccion DESC, created_at DESC
),
ultimo_monitoreo AS (
  SELECT DISTINCT ON (tree_id) tree_id, inspection_id, fecha_proximo_monitoreo
  FROM candidatas
  WHERE fecha_proximo_monitoreo IS NOT NULL
  ORDER BY tree_id, fecha_completada_ot DESC, fecha_inspeccion DESC, created_at DESC
)
SELECT
  tree_id,
  ui.fecha_proxima_inspeccion,
  ui.inspection_id AS origen_fecha_proxima_inspeccion,
  um.fecha_proximo_monitoreo,
  um.inspection_id AS origen_fecha_proximo_monitoreo
FROM ultima_inspeccion ui
FULL JOIN ultimo_monitoreo um USING (tree_id);

-- Mismo esquema de permisos que las vistas de la 016 tras la 017/017b:
-- nada para anon, solo SELECT para authenticated (el default de
-- Supabase da ALL a anon/authenticated sobre objetos nuevos de public).
REVOKE ALL ON v_tree_fechas_vigentes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON v_tree_fechas_vigentes TO authenticated;

-- ---------------------------------------------------------------------
-- 2. evaluations_resultado_input — forma de `p_resultado` (jsonb)
-- ---------------------------------------------------------------------
-- Mismo patrón que `tree_data_versions_arbol_input` (018e/f): un tipo
-- compuesto para que `jsonb_populate_record` valide los tipos de cada
-- columna de `evaluations` al desempaquetar, en vez de 23 parámetros
-- escalares sueltos. Los nombres coinciden exactamente con las columnas
-- de `evaluations` que llena `ensamblarResultadoEvaluacion` (ver su
-- `ResultadoEvaluacion`) — nunca incluye `variables` (eso ya está
-- guardado desde el borrador, esta función no lo toca).

CREATE TYPE evaluations_resultado_input AS (
  variables_calculo                        jsonb,
  calculados                               jsonb,
  indicadores                              jsonb,
  puntaje_raices_cuello                    integer,
  probabilidad_falla_raices_cuello         text,
  puntaje_tronco                           integer,
  probabilidad_falla_tronco                text,
  puntaje_copa_ramas                       integer,
  probabilidad_falla_copa_ramas            text,
  probabilidad_impacto                     text,
  clasificacion_raices_cuello              text,
  clasificacion_tronco                     text,
  clasificacion_copa_ramas                 text,
  clasificacion_riesgo_calculada           text,
  puntaje_infraestructura                  numeric,
  pct_infraestructura                      numeric,
  clasificacion_infraestructura_calculada  text,
  clasificacion_prioridad_calculada        text,
  clasificacion_riesgo_ajustada             text,
  clasificacion_infraestructura_ajustada   text,
  clasificacion_prioridad_ajustada         text,
  rule_version                             text,
  motor_commit                             text
);

-- ---------------------------------------------------------------------
-- 3. fn_finalizar_inspeccion
-- ---------------------------------------------------------------------
-- `p_ajustes`: array jsonb de objetos
--   {"campo", "valor_calculado", "valor_ajustado", "justificacion_ajuste_clasificacion"}
-- (CC-044). El TS ya resolvió con `resolverValorEfectivo` qué ajustes
-- se mantienen y ya descartó el borrador obsoleto (comparando
-- `variables_calculo` fresco contra el que el Inspector vio en
-- /calcular) — esta función no repite esa comparación. Sí verifica que
-- lo que recibe sea coherente consigo mismo (punto c): ningún valor
-- ajustado `no_determinado`/`no_aplica`; `valor_calculado` igual a la
-- `*_calculada` de `p_resultado`; cada `*_ajustada` de `p_resultado`
-- igual al `valor_ajustado` de su ajuste, y sin `*_ajustada` cuando no
-- hay ajuste; a lo más un ajuste por campo.
--
-- Fechas: `p_fecha_proxima_inspeccion`/`p_fecha_proximo_monitoreo` ya
-- vienen resueltas por el TS (ajustadas por el Inspector, o iguales a
-- las sugeridas si no ajustó). Las cuatro son obligatorias (D-202/D-203).
-- D-202: `fecha_proxima_inspeccion` posterior a `fecha_inspeccion`;
-- D-203: `fecha_proximo_monitoreo` igual o posterior (CC-055). El CHECK
-- físico `chk_inspections_justificacion_ajuste_fecha` (migración 014)
-- ya rechaza una fecha distinta de la sugerida sin
-- `justificacion_ajuste_fecha` (D-204) — no se repite aquí.
-- `ajuste_fecha_por`/`fecha_ajuste_fecha` se registran solo si alguna
-- fecha difiere de su sugerida (punto e).
--
-- Monitoreo (CC-055): la `fecha_proxima_inspeccion_sugerida` nunca
-- puede atrasar la vigente del árbol (`v_tree_fechas_vigentes`): como
-- máximo la vigente, o el día siguiente a `fecha_inspeccion` si la
-- vigente ya pasó. Defensa en profundidad del cálculo del motor (que
-- elige el valor exacto); el Inspector igual puede ajustar la fecha
-- final con justificación (D-204).

CREATE FUNCTION fn_finalizar_inspeccion(
  p_inspection_id uuid,
  p_usuario uuid,
  p_resultado jsonb,
  p_ajustes jsonb,
  p_fecha_proxima_inspeccion_sugerida date,
  p_fecha_proximo_monitoreo_sugerida date,
  p_fecha_proxima_inspeccion date,
  p_fecha_proximo_monitoreo date,
  p_justificacion_ajuste_fecha text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tree_id uuid;
  v_work_order_id uuid;
  v_estado_registro text;
  v_tipo_inspeccion_realizada text;
  v_fecha_inspeccion date;
  v_estado_ot text;
  v_tipo_ot text;
  v_responsable_accion_id uuid;
  v_rol text;
  v_activo boolean;
  v_resultado evaluations_resultado_input;
  v_evaluation_id uuid;
  v_tdv_id uuid;
  v_tdv_especie text;
  v_tdv_species_id uuid;
  v_species_id uuid;
  v_ajuste jsonb;
  v_campo text;
  v_campos_ajustados text[] := ARRAY[]::text[];
  v_calculada text;
  v_ajustada text;
  v_fecha_vigente date;
  v_fecha_ajustada boolean;
BEGIN
  -- (b) Bloquea la inspección y su OT hasta el final de la transacción.
  SELECT i.tree_id, i.work_order_id, i.estado_registro, i.tipo_inspeccion_realizada, i.fecha_inspeccion,
         wo.estado_ot, wo.tipo_ot, wo.responsable_accion_id
  INTO v_tree_id, v_work_order_id, v_estado_registro, v_tipo_inspeccion_realizada, v_fecha_inspeccion,
       v_estado_ot, v_tipo_ot, v_responsable_accion_id
  FROM public.inspections i
  JOIN public.work_orders wo ON wo.id = i.work_order_id
  WHERE i.id = p_inspection_id
  FOR UPDATE OF i, wo;

  IF v_tree_id IS NULL THEN
    RAISE EXCEPTION 'La inspección % no existe', p_inspection_id USING ERRCODE = 'SV064';
  END IF;
  IF v_tipo_ot <> 'inspeccion' THEN
    RAISE EXCEPTION 'Esta función no finaliza inspecciones de OT de Mantenimiento' USING ERRCODE = 'SV064';
  END IF;
  IF v_responsable_accion_id IS NULL OR v_responsable_accion_id <> p_usuario THEN
    RAISE EXCEPTION 'El usuario % no es el responsable asignado de la orden de trabajo % (responsable actual: %)',
      p_usuario, v_work_order_id, v_responsable_accion_id
      USING ERRCODE = 'SV064';
  END IF;

  SELECT r.nombre, up.activo INTO v_rol, v_activo
  FROM public.user_profiles up JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = p_usuario;

  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'El usuario % no existe', p_usuario USING ERRCODE = 'SV064';
  END IF;
  IF v_rol <> 'inspector' THEN
    RAISE EXCEPTION 'El usuario % no tiene el rol Inspector (rol actual: %)', p_usuario, v_rol USING ERRCODE = 'SV064';
  END IF;
  IF NOT v_activo THEN
    RAISE EXCEPTION 'El usuario % no está activo', p_usuario USING ERRCODE = 'SV064';
  END IF;

  IF v_estado_ot <> 'en_ejecucion' THEN
    RAISE EXCEPTION 'La orden de trabajo % no está En ejecución (estado actual: %)', v_work_order_id, v_estado_ot
      USING ERRCODE = 'SV064';
  END IF;
  IF v_estado_registro <> 'preguardado' THEN
    RAISE EXCEPTION 'La inspección % no está en Preguardado (estado actual: %) — no se puede finalizar de nuevo', p_inspection_id, v_estado_registro
      USING ERRCODE = 'SV064';
  END IF;

  -- (a) Sin fila en `evaluations` no hay borrador que finalizar.
  SELECT id INTO v_evaluation_id
  FROM public.evaluations WHERE inspection_id = p_inspection_id
  FOR UPDATE;

  IF v_evaluation_id IS NULL THEN
    RAISE EXCEPTION 'La inspección % no tiene registro de evaluación (borrador) — no se puede finalizar', p_inspection_id
      USING ERRCODE = 'SV064';
  END IF;

  -- (d) Fechas obligatorias (D-202/D-203) y su relación con fecha_inspeccion (CC-055).
  IF p_fecha_proxima_inspeccion_sugerida IS NULL OR p_fecha_proximo_monitoreo_sugerida IS NULL
     OR p_fecha_proxima_inspeccion IS NULL OR p_fecha_proximo_monitoreo IS NULL THEN
    RAISE EXCEPTION 'Las fechas de próxima inspección y de próximo monitoreo (sugeridas y finales) son obligatorias (D-202, D-203)'
      USING ERRCODE = 'SV064';
  END IF;
  IF p_fecha_proxima_inspeccion <= v_fecha_inspeccion THEN
    RAISE EXCEPTION 'fecha_proxima_inspeccion (%) debe ser posterior a fecha_inspeccion (%) (D-202)',
      p_fecha_proxima_inspeccion, v_fecha_inspeccion
      USING ERRCODE = 'SV064';
  END IF;
  IF p_fecha_proximo_monitoreo < v_fecha_inspeccion THEN
    RAISE EXCEPTION 'fecha_proximo_monitoreo (%) debe ser igual o posterior a fecha_inspeccion (%) (D-203)',
      p_fecha_proximo_monitoreo, v_fecha_inspeccion
      USING ERRCODE = 'SV064';
  END IF;

  -- CC-055: un Monitoreo no atrasa la reinspección vigente.
  IF v_tipo_inspeccion_realizada = 'monitoreo' THEN
    SELECT fv.fecha_proxima_inspeccion INTO v_fecha_vigente
    FROM public.v_tree_fechas_vigentes fv WHERE fv.tree_id = v_tree_id;

    IF v_fecha_vigente IS NOT NULL
       AND p_fecha_proxima_inspeccion_sugerida > GREATEST(v_fecha_vigente, v_fecha_inspeccion + 1) THEN
      RAISE EXCEPTION 'En un Monitoreo, fecha_proxima_inspeccion_sugerida (%) no puede atrasar la vigente del árbol (%; como máximo %) (CC-055)',
        p_fecha_proxima_inspeccion_sugerida, v_fecha_vigente, GREATEST(v_fecha_vigente, v_fecha_inspeccion + 1)
        USING ERRCODE = 'SV064';
    END IF;
  END IF;

  v_resultado := jsonb_populate_record(null::evaluations_resultado_input, p_resultado);

  -- (c) Coherencia de los ajustes con `p_resultado`.
  IF p_ajustes IS NOT NULL AND jsonb_typeof(p_ajustes) <> 'array' THEN
    RAISE EXCEPTION 'p_ajustes debe ser un arreglo jsonb' USING ERRCODE = 'SV064';
  END IF;

  FOR v_ajuste IN SELECT * FROM jsonb_array_elements(COALESCE(p_ajustes, '[]'::jsonb))
  LOOP
    v_campo := v_ajuste->>'campo';
    IF v_campo IS NULL OR v_campo NOT IN ('clasificacion_riesgo', 'clasificacion_infraestructura', 'clasificacion_prioridad') THEN
      RAISE EXCEPTION 'Ajuste con un campo no ajustable: %', v_campo USING ERRCODE = 'SV064';
    END IF;
    IF v_campo = ANY(v_campos_ajustados) THEN
      RAISE EXCEPTION 'Más de un ajuste para %', v_campo USING ERRCODE = 'SV064';
    END IF;
    v_campos_ajustados := v_campos_ajustados || v_campo;

    IF (v_ajuste->>'valor_ajustado') IS NULL OR (v_ajuste->>'valor_ajustado') IN ('no_determinado', 'no_aplica') THEN
      RAISE EXCEPTION 'El valor ajustado de % no puede ser %: un ajuste resuelve siempre a una categoría determinada (CC-044)',
        v_campo, COALESCE(v_ajuste->>'valor_ajustado', 'vacío')
        USING ERRCODE = 'SV064';
    END IF;

    v_calculada := CASE v_campo
      WHEN 'clasificacion_riesgo' THEN v_resultado.clasificacion_riesgo_calculada
      WHEN 'clasificacion_infraestructura' THEN v_resultado.clasificacion_infraestructura_calculada
      WHEN 'clasificacion_prioridad' THEN v_resultado.clasificacion_prioridad_calculada
    END;
    v_ajustada := CASE v_campo
      WHEN 'clasificacion_riesgo' THEN v_resultado.clasificacion_riesgo_ajustada
      WHEN 'clasificacion_infraestructura' THEN v_resultado.clasificacion_infraestructura_ajustada
      WHEN 'clasificacion_prioridad' THEN v_resultado.clasificacion_prioridad_ajustada
    END;

    IF (v_ajuste->>'valor_calculado') IS DISTINCT FROM v_calculada THEN
      RAISE EXCEPTION 'Ajuste de %: valor_calculado (%) distinto del calculado en el resultado (%)',
        v_campo, v_ajuste->>'valor_calculado', v_calculada
        USING ERRCODE = 'SV064';
    END IF;
    IF (v_ajuste->>'valor_ajustado') IS DISTINCT FROM v_ajustada THEN
      RAISE EXCEPTION 'Ajuste de %: valor_ajustado (%) distinto de %_ajustada en el resultado (%)',
        v_campo, v_ajuste->>'valor_ajustado', v_campo, v_ajustada
        USING ERRCODE = 'SV064';
    END IF;
  END LOOP;

  IF (v_resultado.clasificacion_riesgo_ajustada IS NOT NULL AND NOT 'clasificacion_riesgo' = ANY(v_campos_ajustados))
     OR (v_resultado.clasificacion_infraestructura_ajustada IS NOT NULL AND NOT 'clasificacion_infraestructura' = ANY(v_campos_ajustados))
     OR (v_resultado.clasificacion_prioridad_ajustada IS NOT NULL AND NOT 'clasificacion_prioridad' = ANY(v_campos_ajustados)) THEN
    RAISE EXCEPTION 'El resultado trae una clasificación ajustada sin su ajuste en p_ajustes' USING ERRCODE = 'SV064';
  END IF;

  -- CC-053 punto 3: si esta inspección registró una especie como texto
  -- y todavía no tiene species_id, se incorpora o resuelve al catálogo
  -- AHORA, como parte de la misma finalización (nunca si falta algo —
  -- el llamador no invoca esta función hasta que todo esté completo).
  SELECT id, especie_cientifica, species_id INTO v_tdv_id, v_tdv_especie, v_tdv_species_id
  FROM public.tree_data_versions WHERE inspection_id = p_inspection_id;

  IF v_tdv_id IS NOT NULL AND v_tdv_especie IS NOT NULL AND v_tdv_species_id IS NULL THEN
    v_species_id := fn_resolve_or_create_species(p_especie_cientifica => v_tdv_especie, p_created_by => p_usuario);
    UPDATE public.tree_data_versions SET species_id = v_species_id WHERE id = v_tdv_id;
  END IF;

  UPDATE public.evaluations SET
    variables_calculo = v_resultado.variables_calculo,
    calculados = v_resultado.calculados,
    indicadores = v_resultado.indicadores,
    puntaje_raices_cuello = v_resultado.puntaje_raices_cuello,
    probabilidad_falla_raices_cuello = v_resultado.probabilidad_falla_raices_cuello,
    puntaje_tronco = v_resultado.puntaje_tronco,
    probabilidad_falla_tronco = v_resultado.probabilidad_falla_tronco,
    puntaje_copa_ramas = v_resultado.puntaje_copa_ramas,
    probabilidad_falla_copa_ramas = v_resultado.probabilidad_falla_copa_ramas,
    probabilidad_impacto = v_resultado.probabilidad_impacto,
    clasificacion_raices_cuello = v_resultado.clasificacion_raices_cuello,
    clasificacion_tronco = v_resultado.clasificacion_tronco,
    clasificacion_copa_ramas = v_resultado.clasificacion_copa_ramas,
    clasificacion_riesgo_calculada = v_resultado.clasificacion_riesgo_calculada,
    puntaje_infraestructura = v_resultado.puntaje_infraestructura,
    pct_infraestructura = v_resultado.pct_infraestructura,
    clasificacion_infraestructura_calculada = v_resultado.clasificacion_infraestructura_calculada,
    clasificacion_prioridad_calculada = v_resultado.clasificacion_prioridad_calculada,
    clasificacion_riesgo_ajustada = v_resultado.clasificacion_riesgo_ajustada,
    clasificacion_infraestructura_ajustada = v_resultado.clasificacion_infraestructura_ajustada,
    clasificacion_prioridad_ajustada = v_resultado.clasificacion_prioridad_ajustada,
    rule_version = v_resultado.rule_version,
    motor_commit = v_resultado.motor_commit,
    calculado_at = now()
  WHERE id = v_evaluation_id;

  FOR v_ajuste IN SELECT * FROM jsonb_array_elements(COALESCE(p_ajustes, '[]'::jsonb))
  LOOP
    INSERT INTO public.classification_adjustments (
      evaluation_id, campo, valor_calculado, valor_ajustado, justificacion_ajuste_clasificacion, ajustado_por, rule_version
    ) VALUES (
      v_evaluation_id,
      v_ajuste->>'campo',
      v_ajuste->>'valor_calculado',
      v_ajuste->>'valor_ajustado',
      v_ajuste->>'justificacion_ajuste_clasificacion',
      p_usuario,
      v_resultado.rule_version
    );
  END LOOP;

  -- (e) Quién y cuándo ajustó una fecha: solo si alguna difiere de su sugerida.
  v_fecha_ajustada := p_fecha_proxima_inspeccion <> p_fecha_proxima_inspeccion_sugerida
                   OR p_fecha_proximo_monitoreo <> p_fecha_proximo_monitoreo_sugerida;

  UPDATE public.inspections SET
    fecha_proxima_inspeccion_sugerida = p_fecha_proxima_inspeccion_sugerida,
    fecha_proximo_monitoreo_sugerida = p_fecha_proximo_monitoreo_sugerida,
    fecha_proxima_inspeccion = p_fecha_proxima_inspeccion,
    fecha_proximo_monitoreo = p_fecha_proximo_monitoreo,
    justificacion_ajuste_fecha = p_justificacion_ajuste_fecha,
    ajuste_fecha_por = CASE WHEN v_fecha_ajustada THEN p_usuario ELSE NULL END,
    fecha_ajuste_fecha = CASE WHEN v_fecha_ajustada THEN now() ELSE NULL END,
    estado_registro = 'finalizado',
    finalizada_at = now()
  WHERE id = p_inspection_id;

  RETURN jsonb_build_object(
    'inspection_id', p_inspection_id,
    'evaluation_id', v_evaluation_id,
    'estado_registro', 'finalizado',
    'species_id', COALESCE(v_species_id, v_tdv_species_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION fn_finalizar_inspeccion(uuid, uuid, jsonb, jsonb, date, date, date, date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION fn_finalizar_inspeccion(uuid, uuid, jsonb, jsonb, date, date, date, date, text) TO service_role;
