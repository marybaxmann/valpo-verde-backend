-- =====================================================================
-- Pruebas de la migración 020 — fn_finalizar_inspeccion (#59/#72)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, DESPUÉS de aplicar la 020.
-- Todo corre dentro de BEGIN … ROLLBACK. Usuario de prueba temporal en
-- auth.users, mismo patrón autorizado por la responsable que en
-- pruebas_018e_inspection_draft.sql.
--
-- Esta función solo persiste lo que el TS ya decidió calcular/validar
-- (no hay función SQL que revise alcance por tipo, D-13 ni las 4
-- vistas: eso vive en el service, antes de llamar aquí). Por eso, de
-- los 8 casos pedidos por la responsable, SOLO 5 son pruebas de ESTA
-- migración (F1-F9 abajo). Los otros 3 son pruebas del service en TS
-- (Jest), todavía sin construir — se anotan para no perderlos:
--   - "calcular sin escribir nada": /calcular nunca llama a esta
--     función; no hay nada que probar aquí.
--   - "finalizar con algo faltante (queda Preguardado, catálogo sin
--     cambios)": el service decide NO llamar a esta función si falta
--     algo — no es un comportamiento de la función, es la ausencia de
--     la llamada.
--   - "borrador cambiado entre calcular y finalizar (rechazo)": el
--     service compara `variables_calculo` fresco contra el que el
--     Inspector vio en /calcular, antes de llamar aquí.
--
-- F1: finalizar con todo completo — evaluations y inspections quedan
--     escritas correctamente, estado_registro = finalizado.
-- F2 (CC-044): ajuste sobre una clasificación calculada como
--     no_determinado — se persiste en classification_adjustments y en
--     evaluations.clasificacion_riesgo_ajustada.
-- F3 (D-204): fecha ajustada SIN justificación — rechazada por el
--     CHECK físico chk_inspections_justificacion_ajuste_fecha (23514),
--     nada se modifica.
-- F4 (D-204): fecha ajustada CON justificación — aceptada,
--     ajuste_fecha_por/fecha_ajuste_fecha quedan registrados.
-- F5 (CC-053): especie nueva que entra al catálogo SOLO al finalizar
--     — no existe antes, existe después, con species_id vinculado.
-- F6 (D-13, defensa en profundidad): una especie "Género sp." que de
--     todas formas llegara hasta aquí (el service ya la rechazaría
--     antes) choca con el CHECK físico de `species` (23514) — y TODA
--     la finalización se revierte (atomicidad de la función).
-- F7: otro Inspector (no el responsable de la OT) — rechazado, SV064.
-- F8: OT no En ejecución — rechazada, SV064.
-- F9: inspección ya Finalizada (doble finalización) — rechazada, SV064.

BEGIN;

CREATE FUNCTION pg_temp.geom_sector() RETURNS geography LANGUAGE sql AS $$
  SELECT ST_Multi(ST_Transform(ST_SetSRID(ST_GeomFromText(
    'POLYGON((255000 6340000, 257000 6340000, 257000 6342000, 255000 6342000, 255000 6340000))'
  ), 32719), 4326))::geography;
$$;

CREATE FUNCTION pg_temp.crear_usuario_prueba(p_email text, p_rol text, p_nombre text) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM public.roles WHERE nombre = p_rol;
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Rol % no existe', p_rol;
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email, now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    false, false
  );
  INSERT INTO public.user_profiles (id, role_id, nombre, activo) VALUES (v_id, v_role_id, p_nombre, true);

  RETURN v_id;
END;
$$;

-- Crea proyecto + sector + árbol + OT (en_ejecucion) + inspección
-- (preguardado) + evaluations (solo variables, sin calcular) listos
-- para finalizar. Devuelve el inspection_id.
CREATE FUNCTION pg_temp.preparar_inspeccion(
  p_inspector uuid, p_municipal uuid, p_especie text DEFAULT 'Robinia pseudoacacia'
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  v_project_id uuid;
  v_sector_id uuid;
  v_tree_res jsonb;
  v_tree_id uuid;
  v_wo_id uuid;
  v_inspection_id uuid;
BEGIN
  INSERT INTO projects (nombre_proyecto) VALUES ('020 prueba ' || gen_random_uuid()) RETURNING id INTO v_project_id;
  INSERT INTO sectors (project_id, nombre_sector, geometria_sector)
    VALUES (v_project_id, 'Sector de prueba', pg_temp.geom_sector()) RETURNING id INTO v_sector_id;

  v_tree_res := fn_create_tree_alta(
    p_project_id => v_project_id, p_sector_id => v_sector_id,
    p_sector => 'Barrio Puerto', p_ubicacion_descriptiva => 'Frente a la plaza',
    p_utm_este => 256000, p_utm_norte => 6341000,
    p_especie_cientifica => p_especie, p_nombre_comun => 'Falsa acacia',
    p_fecha_registro => current_date, p_registrado_por => p_municipal
  );
  v_tree_id := (v_tree_res->>'id')::uuid;

  INSERT INTO work_orders (
    project_id, tree_id, tipo_ot, accion_solicitada, estado_ot,
    fecha_accion_programada, ot_creado_por, responsable_accion_id
  ) VALUES (
    v_project_id, v_tree_id, 'inspeccion', 'evaluacion_inicial', 'en_ejecucion',
    current_date, p_municipal, p_inspector
  ) RETURNING id INTO v_wo_id;

  INSERT INTO inspections (
    tree_id, inspector, work_order_id, estado_registro,
    tipo_inspeccion_realizada, rule_version, fecha_inspeccion, fecha_registro, registrado_por
  ) VALUES (
    v_tree_id, p_inspector, v_wo_id, 'preguardado',
    'evaluacion_inicial', '2.1', current_date, current_date, p_inspector
  ) RETURNING id INTO v_inspection_id;

  INSERT INTO evaluations (inspection_id, tree_id, variables)
  VALUES (v_inspection_id, v_tree_id, '{"raices_expuestas": true}'::jsonb);

  INSERT INTO tree_data_versions (tree_id, inspection_id, campos_registrados, especie_cientifica, created_by)
  VALUES (v_tree_id, v_inspection_id, ARRAY['especie_cientifica'], p_especie, p_inspector);

  RETURN v_inspection_id;
END;
$$;

CREATE TEMP TABLE test_log (id serial PRIMARY KEY, msg text);

DO $$
DECLARE
  v_inspector uuid;
  v_otro_inspector uuid;
  v_municipal uuid;
  v_inspection_id uuid;
  v_wo_id uuid;
  v_res jsonb;
  v_eval record;
  v_insp record;
  v_resultado_base jsonb;
  v_count integer;
  v_species_id uuid;
BEGIN
  v_inspector := pg_temp.crear_usuario_prueba(
    p_email => 'inspector-020@sivu.example.test', p_rol => 'inspector', p_nombre => 'Inspector de prueba (020)'
  );
  v_otro_inspector := pg_temp.crear_usuario_prueba(
    p_email => 'otro-inspector-020@sivu.example.test', p_rol => 'inspector', p_nombre => 'Otro inspector de prueba (020)'
  );
  v_municipal := pg_temp.crear_usuario_prueba(
    p_email => 'municipal-020@sivu.example.test', p_rol => 'usuario_municipal', p_nombre => 'Usuario municipal de prueba (020)'
  );

  v_resultado_base := '{
    "variables_calculo": {"raices_expuestas": true},
    "calculados": {},
    "indicadores": {},
    "puntaje_raices_cuello": 2,
    "probabilidad_falla_raices_cuello": "posible",
    "puntaje_tronco": 0,
    "probabilidad_falla_tronco": "improbable",
    "puntaje_copa_ramas": 0,
    "probabilidad_falla_copa_ramas": "improbable",
    "probabilidad_impacto": "baja",
    "clasificacion_raices_cuello": "bajo",
    "clasificacion_tronco": "bajo",
    "clasificacion_copa_ramas": "bajo",
    "clasificacion_riesgo_calculada": "bajo",
    "puntaje_infraestructura": 0,
    "pct_infraestructura": 0,
    "clasificacion_infraestructura_calculada": "no_aplica",
    "clasificacion_prioridad_calculada": "baja",
    "clasificacion_riesgo_ajustada": null,
    "clasificacion_infraestructura_ajustada": null,
    "clasificacion_prioridad_ajustada": null,
    "rule_version": "2.1",
    "motor_commit": "test-commit-020"
  }'::jsonb;

  -- ------------------------------------------------------------------
  -- F1 — finalizar con todo completo.
  -- ------------------------------------------------------------------
  v_inspection_id := pg_temp.preparar_inspeccion(p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F1');

  v_res := fn_finalizar_inspeccion(
    p_inspection_id => v_inspection_id, p_usuario => v_inspector,
    p_resultado => v_resultado_base, p_ajustes => '[]'::jsonb,
    p_fecha_proxima_inspeccion_sugerida => current_date + 730, p_fecha_proximo_monitoreo_sugerida => current_date + 365,
    p_fecha_proxima_inspeccion => current_date + 730, p_fecha_proximo_monitoreo => current_date + 365,
    p_justificacion_ajuste_fecha => NULL
  );
  IF (v_res->>'estado_registro') <> 'finalizado' THEN
    RAISE EXCEPTION 'F1 FALLA: respuesta no informa finalizado: %', v_res;
  END IF;

  SELECT * INTO v_eval FROM evaluations WHERE inspection_id = v_inspection_id;
  IF v_eval.calculado_at IS NULL OR v_eval.rule_version <> '2.1' OR v_eval.motor_commit <> 'test-commit-020'
     OR v_eval.clasificacion_riesgo_calculada <> 'bajo' THEN
    RAISE EXCEPTION 'F1 FALLA: evaluations no quedó como se esperaba: %', row_to_json(v_eval);
  END IF;
  SELECT * INTO v_insp FROM inspections WHERE id = v_inspection_id;
  IF v_insp.estado_registro <> 'finalizado' OR v_insp.finalizada_at IS NULL THEN
    RAISE EXCEPTION 'F1 FALLA: inspections no quedó Finalizado: %', row_to_json(v_insp);
  END IF;
  INSERT INTO test_log (msg) VALUES ('F1 OK');

  -- ------------------------------------------------------------------
  -- F2 (CC-044) — ajuste sobre clasificacion_riesgo = no_determinado.
  -- ------------------------------------------------------------------
  v_inspection_id := pg_temp.preparar_inspeccion(p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F2');

  v_res := fn_finalizar_inspeccion(
    p_inspection_id => v_inspection_id, p_usuario => v_inspector,
    p_resultado => jsonb_set(v_resultado_base, '{clasificacion_riesgo_calculada}', '"no_determinado"'),
    p_ajustes => jsonb_build_array(jsonb_build_object(
      'campo', 'clasificacion_riesgo', 'valor_calculado', 'no_determinado',
      'valor_ajustado', 'alto', 'justificacion_ajuste_clasificacion', 'Criterio profesional del Inspector en terreno'
    )),
    p_fecha_proxima_inspeccion_sugerida => current_date + 30, p_fecha_proximo_monitoreo_sugerida => current_date + 14,
    p_fecha_proxima_inspeccion => current_date + 30, p_fecha_proximo_monitoreo => current_date + 14,
    p_justificacion_ajuste_fecha => NULL
  );

  IF NOT EXISTS (
    SELECT 1 FROM classification_adjustments ca
    JOIN evaluations e ON e.id = ca.evaluation_id
    WHERE e.inspection_id = v_inspection_id AND ca.campo = 'clasificacion_riesgo'
      AND ca.valor_calculado = 'no_determinado' AND ca.valor_ajustado = 'alto'
  ) THEN
    RAISE EXCEPTION 'F2 FALLA: no quedó el ajuste esperado en classification_adjustments';
  END IF;
  SELECT * INTO v_eval FROM evaluations WHERE inspection_id = v_inspection_id;
  IF v_eval.clasificacion_riesgo_calculada <> 'no_determinado' THEN
    RAISE EXCEPTION 'F2 FALLA: clasificacion_riesgo_calculada no quedó no_determinado: %', v_eval.clasificacion_riesgo_calculada;
  END IF;
  INSERT INTO test_log (msg) VALUES ('F2 OK');

  -- ------------------------------------------------------------------
  -- F3 (D-204) — fecha ajustada SIN justificación: rechazada (23514).
  -- ------------------------------------------------------------------
  v_inspection_id := pg_temp.preparar_inspeccion(p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F3');

  BEGIN
    PERFORM fn_finalizar_inspeccion(
      p_inspection_id => v_inspection_id, p_usuario => v_inspector,
      p_resultado => v_resultado_base, p_ajustes => '[]'::jsonb,
      p_fecha_proxima_inspeccion_sugerida => current_date + 730, p_fecha_proximo_monitoreo_sugerida => current_date + 365,
      p_fecha_proxima_inspeccion => current_date + 14, -- distinta de la sugerida
      p_fecha_proximo_monitoreo => current_date + 365,
      p_justificacion_ajuste_fecha => NULL -- sin justificación
    );
    RAISE EXCEPTION 'F3 FALLA: se aceptó una fecha ajustada sin justificación';
  EXCEPTION WHEN SQLSTATE '23514' THEN
    NULL;
  END;
  IF EXISTS (SELECT 1 FROM inspections WHERE id = v_inspection_id AND estado_registro <> 'preguardado') THEN
    RAISE EXCEPTION 'F3 FALLA: la inspección cambió de estado a pesar del rechazo';
  END IF;
  IF EXISTS (SELECT 1 FROM evaluations WHERE inspection_id = v_inspection_id AND calculado_at IS NOT NULL) THEN
    RAISE EXCEPTION 'F3 FALLA: evaluations quedó calculada a pesar del rechazo (la función no fue atómica)';
  END IF;
  INSERT INTO test_log (msg) VALUES ('F3 OK');

  -- ------------------------------------------------------------------
  -- F4 (D-204) — fecha ajustada CON justificación: aceptada.
  -- ------------------------------------------------------------------
  v_inspection_id := pg_temp.preparar_inspeccion(p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F4');

  v_res := fn_finalizar_inspeccion(
    p_inspection_id => v_inspection_id, p_usuario => v_inspector,
    p_resultado => v_resultado_base, p_ajustes => '[]'::jsonb,
    p_fecha_proxima_inspeccion_sugerida => current_date + 730, p_fecha_proximo_monitoreo_sugerida => current_date + 365,
    p_fecha_proxima_inspeccion => current_date + 14,
    p_fecha_proximo_monitoreo => current_date + 365,
    p_justificacion_ajuste_fecha => 'El árbol muestra signos que requieren seguimiento antes del plazo sugerido'
  );
  SELECT * INTO v_insp FROM inspections WHERE id = v_inspection_id;
  IF v_insp.ajuste_fecha_por <> v_inspector OR v_insp.fecha_ajuste_fecha IS NULL
     OR v_insp.fecha_proxima_inspeccion <> current_date + 14 THEN
    RAISE EXCEPTION 'F4 FALLA: el ajuste de fecha no quedó registrado: %', row_to_json(v_insp);
  END IF;
  INSERT INTO test_log (msg) VALUES ('F4 OK');

  -- ------------------------------------------------------------------
  -- F5 (CC-053) — especie nueva entra al catálogo SOLO al finalizar.
  -- ------------------------------------------------------------------
  SELECT count(*) INTO v_count FROM species WHERE especie_cientifica = 'Especie nueva solo al finalizar F5';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'F5 FALLA: la especie ya existía antes de preparar la inspección';
  END IF;

  v_inspection_id := pg_temp.preparar_inspeccion(p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Especie nueva solo al finalizar F5');

  -- Todavía Preguardado: el catálogo no debe tener la especie.
  IF EXISTS (SELECT 1 FROM species WHERE especie_cientifica = 'Especie nueva solo al finalizar F5') THEN
    RAISE EXCEPTION 'F5 FALLA: la especie se incorporó antes de finalizar (durante Preguardado)';
  END IF;

  v_res := fn_finalizar_inspeccion(
    p_inspection_id => v_inspection_id, p_usuario => v_inspector,
    p_resultado => v_resultado_base, p_ajustes => '[]'::jsonb,
    p_fecha_proxima_inspeccion_sugerida => current_date + 730, p_fecha_proximo_monitoreo_sugerida => current_date + 365,
    p_fecha_proxima_inspeccion => current_date + 730, p_fecha_proximo_monitoreo => current_date + 365,
    p_justificacion_ajuste_fecha => NULL
  );

  SELECT id INTO v_species_id FROM species WHERE especie_cientifica = 'Especie nueva solo al finalizar F5';
  IF v_species_id IS NULL THEN
    RAISE EXCEPTION 'F5 FALLA: la especie no se incorporó al finalizar';
  END IF;
  IF (v_res->>'species_id')::uuid <> v_species_id THEN
    RAISE EXCEPTION 'F5 FALLA: la respuesta no informa el species_id resuelto';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM tree_data_versions WHERE inspection_id = v_inspection_id AND species_id = v_species_id
  ) THEN
    RAISE EXCEPTION 'F5 FALLA: tree_data_versions no quedó vinculada a la especie nueva';
  END IF;
  INSERT INTO test_log (msg) VALUES ('F5 OK');

  -- ------------------------------------------------------------------
  -- F6 (defensa en profundidad) — "Género sp." choca con el CHECK
  -- físico de species; TODA la finalización se revierte.
  -- ------------------------------------------------------------------
  v_inspection_id := pg_temp.preparar_inspeccion(p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Rosa sp.');

  BEGIN
    PERFORM fn_finalizar_inspeccion(
      p_inspection_id => v_inspection_id, p_usuario => v_inspector,
      p_resultado => v_resultado_base, p_ajustes => '[]'::jsonb,
      p_fecha_proxima_inspeccion_sugerida => current_date + 730, p_fecha_proximo_monitoreo_sugerida => current_date + 365,
      p_fecha_proxima_inspeccion => current_date + 730, p_fecha_proximo_monitoreo => current_date + 365,
      p_justificacion_ajuste_fecha => NULL
    );
    RAISE EXCEPTION 'F6 FALLA: se aceptó incorporar "Rosa sp." al catálogo';
  EXCEPTION WHEN SQLSTATE '23514' THEN
    NULL;
  END;
  IF EXISTS (SELECT 1 FROM inspections WHERE id = v_inspection_id AND estado_registro <> 'preguardado') THEN
    RAISE EXCEPTION 'F6 FALLA: la inspección quedó finalizada a pesar del rechazo (no fue atómico)';
  END IF;
  IF EXISTS (SELECT 1 FROM evaluations WHERE inspection_id = v_inspection_id AND calculado_at IS NOT NULL) THEN
    RAISE EXCEPTION 'F6 FALLA: evaluations quedó calculada a pesar del rechazo';
  END IF;
  INSERT INTO test_log (msg) VALUES ('F6 OK');

  -- ------------------------------------------------------------------
  -- F7 — otro Inspector (no el responsable de la OT): rechazado.
  -- ------------------------------------------------------------------
  v_inspection_id := pg_temp.preparar_inspeccion(p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F7');

  BEGIN
    PERFORM fn_finalizar_inspeccion(
      p_inspection_id => v_inspection_id, p_usuario => v_otro_inspector,
      p_resultado => v_resultado_base, p_ajustes => '[]'::jsonb,
      p_fecha_proxima_inspeccion_sugerida => current_date + 730, p_fecha_proximo_monitoreo_sugerida => current_date + 365,
      p_fecha_proxima_inspeccion => current_date + 730, p_fecha_proximo_monitoreo => current_date + 365,
      p_justificacion_ajuste_fecha => NULL
    );
    RAISE EXCEPTION 'F7 FALLA: otro Inspector pudo finalizar sin ser el responsable';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('F7 OK');

  -- ------------------------------------------------------------------
  -- F8 — OT no En ejecución: rechazada.
  -- ------------------------------------------------------------------
  v_inspection_id := pg_temp.preparar_inspeccion(p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F8');
  SELECT work_order_id INTO v_wo_id FROM inspections WHERE id = v_inspection_id;
  UPDATE work_orders SET estado_ot = 'programada', fecha_accion_programada = current_date WHERE id = v_wo_id;

  BEGIN
    PERFORM fn_finalizar_inspeccion(
      p_inspection_id => v_inspection_id, p_usuario => v_inspector,
      p_resultado => v_resultado_base, p_ajustes => '[]'::jsonb,
      p_fecha_proxima_inspeccion_sugerida => current_date + 730, p_fecha_proximo_monitoreo_sugerida => current_date + 365,
      p_fecha_proxima_inspeccion => current_date + 730, p_fecha_proximo_monitoreo => current_date + 365,
      p_justificacion_ajuste_fecha => NULL
    );
    RAISE EXCEPTION 'F8 FALLA: se aceptó finalizar con la OT no En ejecución';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('F8 OK');

  -- ------------------------------------------------------------------
  -- F9 — inspección ya Finalizada (doble finalización): rechazada.
  -- ------------------------------------------------------------------
  v_inspection_id := pg_temp.preparar_inspeccion(p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F9');

  v_res := fn_finalizar_inspeccion(
    p_inspection_id => v_inspection_id, p_usuario => v_inspector,
    p_resultado => v_resultado_base, p_ajustes => '[]'::jsonb,
    p_fecha_proxima_inspeccion_sugerida => current_date + 730, p_fecha_proximo_monitoreo_sugerida => current_date + 365,
    p_fecha_proxima_inspeccion => current_date + 730, p_fecha_proximo_monitoreo => current_date + 365,
    p_justificacion_ajuste_fecha => NULL
  );

  BEGIN
    PERFORM fn_finalizar_inspeccion(
      p_inspection_id => v_inspection_id, p_usuario => v_inspector,
      p_resultado => v_resultado_base, p_ajustes => '[]'::jsonb,
      p_fecha_proxima_inspeccion_sugerida => current_date + 730, p_fecha_proximo_monitoreo_sugerida => current_date + 365,
      p_fecha_proxima_inspeccion => current_date + 730, p_fecha_proximo_monitoreo => current_date + 365,
      p_justificacion_ajuste_fecha => NULL
    );
    RAISE EXCEPTION 'F9 FALLA: se aceptó finalizar dos veces la misma inspección';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('F9 OK');
END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
