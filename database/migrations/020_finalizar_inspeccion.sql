-- =====================================================================
-- Migración 020 — Finalizar una inspección (#59/#72; D-13, D-27, D-204;
-- CC-040, CC-044, CC-045, CC-048, CC-053)
-- =====================================================================
--
-- PROPUESTA — NO APLICAR SIN APROBACIÓN DE LA RESPONSABLE.
--
-- Alcance decidido por la responsable (2026-10-25): finalizar en DOS
-- pasos. `POST .../calcular` (sin esta migración, 100% TS: lee
-- v_tree_current_inputs + trees + esta inspección, corre el motor en
-- memoria, devuelve resultados/fechas sugeridas/campos faltantes, NO
-- escribe nada) y `POST .../finalizar`, que invoca la función de abajo
-- UNA SOLA VEZ cuando ya se verificó que todo está completo (alcance
-- por tipo/CC-040, D-13, las 4 vistas de D-27) — si falta algo, el
-- service ni siquiera llama a esta función: la inspección sigue
-- Preguardado y no se toca `species` (CC-053, "si falta algo no se
-- toca el catálogo").
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
-- (anotado en HANDOFF, decisión de la responsable): entre esa lectura y
-- esta escritura, otra OT del mismo árbol podría completarse — bajo
-- volumen, riesgo aceptado, no se bloquea con una transacción explícita.
--
-- SQLSTATE nuevo `SV064` (uno por función/alcance, igual que el resto).

-- ---------------------------------------------------------------------
-- 1. evaluations_resultado_input — forma de `p_resultado` (jsonb)
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
-- 2. fn_finalizar_inspeccion
-- ---------------------------------------------------------------------
-- `p_ajustes`: array jsonb de objetos
--   {"campo", "valor_calculado", "valor_ajustado", "justificacion_ajuste_clasificacion"}
-- (CC-044). `campo` restringido por el CHECK físico de
-- `classification_adjustments` (clasificacion_riesgo/infraestructura/
-- prioridad) — no se repite aquí. El TS ya validó con
-- `resolverValorEfectivo` que cada ajuste es válido (nunca
-- no_determinado/no_aplica como valor AJUSTADO) y que no quedó
-- descartado por un borrador obsoleto (comparando `variables_calculo`
-- fresco contra el que el Inspector vio en /calcular) — esta función no
-- repite esa comparación, solo persiste lo ya decidido.
--
-- Fechas: `p_fecha_proxima_inspeccion`/`p_fecha_proximo_monitoreo` ya
-- vienen resueltas por el TS (ajustadas por el Inspector, o iguales a
-- las sugeridas si no ajustó — D-202/D-203 obligatorias). El CHECK
-- físico `chk_inspections_justificacion_ajuste_fecha` (migración 014)
-- ya rechaza una fecha distinta de la sugerida sin
-- `justificacion_ajuste_fecha` (D-204) — no se repite aquí tampoco.

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
BEGIN
  SELECT i.tree_id, i.work_order_id, i.estado_registro, wo.estado_ot, wo.tipo_ot, wo.responsable_accion_id
  INTO v_tree_id, v_work_order_id, v_estado_registro, v_estado_ot, v_tipo_ot, v_responsable_accion_id
  FROM public.inspections i
  JOIN public.work_orders wo ON wo.id = i.work_order_id
  WHERE i.id = p_inspection_id;

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

  v_resultado := jsonb_populate_record(null::evaluations_resultado_input, p_resultado);

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
  WHERE inspection_id = p_inspection_id
  RETURNING id INTO v_evaluation_id;

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

  UPDATE public.inspections SET
    fecha_proxima_inspeccion_sugerida = p_fecha_proxima_inspeccion_sugerida,
    fecha_proximo_monitoreo_sugerida = p_fecha_proximo_monitoreo_sugerida,
    fecha_proxima_inspeccion = p_fecha_proxima_inspeccion,
    fecha_proximo_monitoreo = p_fecha_proximo_monitoreo,
    justificacion_ajuste_fecha = p_justificacion_ajuste_fecha,
    ajuste_fecha_por = CASE WHEN p_justificacion_ajuste_fecha IS NOT NULL THEN p_usuario ELSE NULL END,
    fecha_ajuste_fecha = CASE WHEN p_justificacion_ajuste_fecha IS NOT NULL THEN now() ELSE NULL END,
    estado_registro = 'finalizado',
    finalizada_at = now()
  WHERE id = p_inspection_id;

  RETURN jsonb_build_object(
    'inspection_id', p_inspection_id,
    'evaluation_id', v_evaluation_id,
    'estado_registro', 'finalizado',
    'species_id', v_species_id
  );
END;
$$;

REVOKE ALL ON FUNCTION fn_finalizar_inspeccion(uuid, uuid, jsonb, jsonb, date, date, date, date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION fn_finalizar_inspeccion(uuid, uuid, jsonb, jsonb, date, date, date, date, text) TO service_role;
