-- =====================================================================
-- Pruebas de la migración 020 — fn_finalizar_inspeccion (#59/#72) y
-- v_tree_fechas_vigentes (CC-055)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, DESPUÉS de aplicar la 020.
-- Todo corre dentro de BEGIN … ROLLBACK. Usuarios de prueba temporales
-- en auth.users, mismo patrón autorizado por la responsable que en
-- pruebas_018e_inspection_draft.sql. Llamadas con varios parámetros
-- siempre con notación con nombre (lección permanente del HANDOFF).
--
-- Esta función solo persiste lo que el TS ya decidió calcular/validar
-- (no hay función SQL que revise alcance por tipo, D-13 ni las 4
-- vistas: eso vive en el service, antes de llamar aquí). Tres casos son
-- pruebas del service en TS (Jest), todavía sin construir — se anotan
-- para no perderlos:
--   - "calcular sin escribir nada": /calcular nunca llama a esta
--     función; no hay nada que probar aquí.
--   - "finalizar con algo faltante (queda Preguardado, catálogo sin
--     cambios)": el service decide NO llamar a esta función si falta
--     algo — no es un comportamiento de la función, es la ausencia de
--     la llamada.
--   - "borrador cambiado entre calcular y finalizar (rechazo)": el
--     service compara `variables_calculo` fresco contra el que el
--     Inspector vio en /calcular, antes de llamar aquí.
-- El bloqueo FOR UPDATE (punto b) tampoco se prueba aquí: necesita dos
-- sesiones concurrentes, y este script corre en una sola transacción.
--
-- fn_finalizar_inspeccion
-- F1: finalizar con todo completo — evaluations e inspections quedan
--     escritas, estado_registro = finalizado, sin ajuste de fecha (e).
-- F2 (CC-044): ajuste sobre clasificacion_riesgo = no_determinado, con
--     p_resultado coherente (clasificacion_riesgo_ajustada = el ajuste).
-- F3 (D-204): fecha ajustada SIN justificación — 23514, nada cambia.
-- F4 (D-204): fecha ajustada CON justificación — aceptada,
--     ajuste_fecha_por/fecha_ajuste_fecha registrados.
-- F5 (CC-053): especie nueva entra al catálogo SOLO al finalizar.
-- F6 (D-13, defensa en profundidad): "Género sp." choca con el CHECK de
--     `species` (23514) y TODA la finalización se revierte.
-- F7: otro Inspector (no el responsable) — SV064.
-- F8: OT no En ejecución — SV064.
-- F9: doble finalización — SV064.
-- F10: Inspector responsable inactivo — SV064.
-- F11: responsable con un rol distinto de Inspector — SV064.
-- F12: inspección de una OT de Mantenimiento — SV064.
-- F13 (a): sin fila en evaluations — SV064, catálogo intacto.
-- F14 (c): valor ajustado no_determinado — SV064, nada escrito.
-- F15 (c): ajustes incoherentes — valor_calculado distinto del
--     calculado; ajuste sin su *_ajustada; *_ajustada sin ajuste; dos
--     ajustes del mismo campo — SV064 cada uno.
-- F16 (d): fecha_proxima_inspeccion igual a fecha_inspeccion — SV064;
--     fecha_proximo_monitoreo anterior — SV064; igual — aceptada;
--     fecha sin valor — SV064.
-- F17 (CC-053): especie con species_id ya puesto — no se crea ni se
--     cambia nada en el catálogo; la respuesta informa ese species_id.
-- F18 (e): justificación sin cambio de fecha — sin ajuste_fecha_por.
-- F19 (CC-055): Monitoreo que adelanta la reinspección — aceptado.
-- F20 (CC-055): Monitoreo que atrasaría la reinspección — SV064; igual
--     a la vigente — aceptado.
-- F21 (CC-055): reinspección atrasada — sugerida posterior al día
--     siguiente a fecha_inspeccion: SV064; el día siguiente, con fecha
--     final ajustada y justificada: aceptado.
--
-- v_tree_fechas_vigentes
-- V1: árbol sin fecha vigente — sin fila.
-- V2: inspección finalizada de una OT abierta — no cuenta.
-- V3: inspección anulada — no cuenta.
-- V4: dos OT completadas en fechas distintas — gana la más reciente
--     (en las dos fechas, con su inspección de origen).
-- V5: desempate del mismo día — gana la de fecha_inspeccion más
--     reciente, aunque se haya creado antes.
-- V6: mismo día y misma fecha_inspeccion — gana la de created_at más
--     reciente.

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

-- Crea (o reutiliza, con p_tree_id) el árbol, y una OT (en_ejecucion) +
-- inspección (preguardado) + evaluations (solo variables, sin calcular,
-- salvo p_con_evaluacion = false) listas para finalizar. Devuelve el
-- inspection_id.
CREATE FUNCTION pg_temp.preparar_inspeccion(
  p_inspector uuid,
  p_municipal uuid,
  p_especie text DEFAULT 'Robinia pseudoacacia',
  p_tree_id uuid DEFAULT NULL,
  p_tipo text DEFAULT 'evaluacion_inicial',
  p_subtipo text DEFAULT NULL,
  p_fecha_inspeccion date DEFAULT current_date,
  p_con_evaluacion boolean DEFAULT true
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  v_project_id uuid;
  v_sector_id uuid;
  v_tree_res jsonb;
  v_tree_id uuid;
  v_wo_id uuid;
  v_inspection_id uuid;
BEGIN
  IF p_tree_id IS NULL THEN
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
  ELSE
    v_tree_id := p_tree_id;
    SELECT project_id INTO v_project_id FROM trees WHERE id = p_tree_id;
  END IF;

  INSERT INTO work_orders (
    project_id, tree_id, tipo_ot, accion_solicitada, subtipo_accion, estado_ot,
    fecha_accion_programada, ot_creado_por, responsable_accion_id
  ) VALUES (
    v_project_id, v_tree_id, 'inspeccion', p_tipo, p_subtipo, 'en_ejecucion',
    current_date, p_municipal, p_inspector
  ) RETURNING id INTO v_wo_id;

  INSERT INTO inspections (
    tree_id, inspector, work_order_id, estado_registro,
    tipo_inspeccion_realizada, subtipo_inspeccion, rule_version, fecha_inspeccion, fecha_registro, registrado_por
  ) VALUES (
    v_tree_id, p_inspector, v_wo_id, 'preguardado',
    p_tipo, p_subtipo, '2.1', p_fecha_inspeccion, p_fecha_inspeccion, p_inspector
  ) RETURNING id INTO v_inspection_id;

  IF p_con_evaluacion THEN
    INSERT INTO evaluations (inspection_id, tree_id, variables)
    VALUES (v_inspection_id, v_tree_id, '{"raices_expuestas": true}'::jsonb);
  END IF;

  INSERT INTO tree_data_versions (tree_id, inspection_id, campos_registrados, especie_cientifica, created_by)
  VALUES (v_tree_id, v_inspection_id, ARRAY['especie_cientifica'], p_especie, p_inspector);

  RETURN v_inspection_id;
END;
$$;

CREATE FUNCTION pg_temp.resultado_base() RETURNS jsonb LANGUAGE sql AS $$
  SELECT '{
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
$$;

-- Finaliza sin ajustes, con las fechas finales iguales a las sugeridas.
CREATE FUNCTION pg_temp.finalizar_simple(
  p_inspection_id uuid, p_inspector uuid, p_fpi date, p_fpm date
) RETURNS jsonb LANGUAGE sql AS $$
  SELECT fn_finalizar_inspeccion(
    p_inspection_id => p_inspection_id, p_usuario => p_inspector,
    p_resultado => pg_temp.resultado_base(), p_ajustes => '[]'::jsonb,
    p_fecha_proxima_inspeccion_sugerida => p_fpi, p_fecha_proximo_monitoreo_sugerida => p_fpm,
    p_fecha_proxima_inspeccion => p_fpi, p_fecha_proximo_monitoreo => p_fpm,
    p_justificacion_ajuste_fecha => NULL
  );
$$;

-- Completa la OT de la inspección (no hay todavía una transición a
-- Completada; mismo atajo que pruebas_018i_catalogo_especies.sql).
CREATE FUNCTION pg_temp.completar_ot(p_inspection_id uuid, p_fecha date) RETURNS void LANGUAGE sql AS $$
  UPDATE work_orders SET estado_ot = 'completada', fecha_completada_ot = p_fecha
  WHERE id = (SELECT work_order_id FROM inspections WHERE id = p_inspection_id);
$$;

CREATE TEMP TABLE test_log (id serial PRIMARY KEY, msg text);

DO $$
DECLARE
  v_inspector uuid;
  v_otro_inspector uuid;
  v_inspector_inactivo uuid;
  v_inspector_cambia_rol uuid;
  v_municipal uuid;
  v_inspection_id uuid;
  v_inspection_a uuid;
  v_inspection_b uuid;
  v_tree_id uuid;
  v_wo_id uuid;
  v_res jsonb;
  v_eval record;
  v_insp record;
  v_fv record;
  v_resultado_base jsonb := pg_temp.resultado_base();
  v_count integer;
  v_species_id uuid;
  v_hoy date := current_date;
BEGIN
  v_inspector := pg_temp.crear_usuario_prueba(
    p_email => 'inspector-020@sivu.example.test', p_rol => 'inspector', p_nombre => 'Inspector de prueba (020)'
  );
  v_otro_inspector := pg_temp.crear_usuario_prueba(
    p_email => 'otro-inspector-020@sivu.example.test', p_rol => 'inspector', p_nombre => 'Otro inspector de prueba (020)'
  );
  v_inspector_inactivo := pg_temp.crear_usuario_prueba(
    p_email => 'inspector-inactivo-020@sivu.example.test', p_rol => 'inspector', p_nombre => 'Inspector inactivo de prueba (020)'
  );
  v_inspector_cambia_rol := pg_temp.crear_usuario_prueba(
    p_email => 'inspector-rol-020@sivu.example.test', p_rol => 'inspector', p_nombre => 'Inspector que cambia de rol (020)'
  );
  v_municipal := pg_temp.crear_usuario_prueba(
    p_email => 'municipal-020@sivu.example.test', p_rol => 'usuario_municipal', p_nombre => 'Usuario municipal de prueba (020)'
  );

  -- ------------------------------------------------------------------
  -- F1 — finalizar con todo completo.
  -- ------------------------------------------------------------------
  v_inspection_id := pg_temp.preparar_inspeccion(p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F1');

  v_res := pg_temp.finalizar_simple(
    p_inspection_id => v_inspection_id, p_inspector => v_inspector, p_fpi => v_hoy + 730, p_fpm => v_hoy + 365
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
  IF v_insp.ajuste_fecha_por IS NOT NULL OR v_insp.fecha_ajuste_fecha IS NOT NULL THEN
    RAISE EXCEPTION 'F1 FALLA: quedó un ajuste de fecha sin que ninguna fecha difiriera de la sugerida';
  END IF;
  INSERT INTO test_log (msg) VALUES ('F1 OK');

  -- ------------------------------------------------------------------
  -- F2 (CC-044) — ajuste sobre clasificacion_riesgo = no_determinado,
  -- con p_resultado coherente (corregida: antes el resultado traía
  -- clasificacion_riesgo_ajustada = null junto a un ajuste a "alto").
  -- ------------------------------------------------------------------
  v_inspection_id := pg_temp.preparar_inspeccion(p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F2');

  v_res := fn_finalizar_inspeccion(
    p_inspection_id => v_inspection_id, p_usuario => v_inspector,
    p_resultado => v_resultado_base
      || '{"clasificacion_riesgo_calculada": "no_determinado", "clasificacion_riesgo_ajustada": "alto"}'::jsonb,
    p_ajustes => jsonb_build_array(jsonb_build_object(
      'campo', 'clasificacion_riesgo', 'valor_calculado', 'no_determinado',
      'valor_ajustado', 'alto', 'justificacion_ajuste_clasificacion', 'Criterio profesional del Inspector en terreno'
    )),
    p_fecha_proxima_inspeccion_sugerida => v_hoy + 30, p_fecha_proximo_monitoreo_sugerida => v_hoy + 14,
    p_fecha_proxima_inspeccion => v_hoy + 30, p_fecha_proximo_monitoreo => v_hoy + 14,
    p_justificacion_ajuste_fecha => NULL
  );

  IF NOT EXISTS (
    SELECT 1 FROM classification_adjustments ca
    JOIN evaluations e ON e.id = ca.evaluation_id
    WHERE e.inspection_id = v_inspection_id AND ca.campo = 'clasificacion_riesgo'
      AND ca.valor_calculado = 'no_determinado' AND ca.valor_ajustado = 'alto'
      AND ca.ajustado_por = v_inspector
  ) THEN
    RAISE EXCEPTION 'F2 FALLA: no quedó el ajuste esperado en classification_adjustments';
  END IF;
  SELECT * INTO v_eval FROM evaluations WHERE inspection_id = v_inspection_id;
  IF v_eval.clasificacion_riesgo_calculada <> 'no_determinado' OR v_eval.clasificacion_riesgo_ajustada IS DISTINCT FROM 'alto' THEN
    RAISE EXCEPTION 'F2 FALLA: evaluations no quedó calculado no_determinado / ajustado alto: % / %',
      v_eval.clasificacion_riesgo_calculada, v_eval.clasificacion_riesgo_ajustada;
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
      p_fecha_proxima_inspeccion_sugerida => v_hoy + 730, p_fecha_proximo_monitoreo_sugerida => v_hoy + 365,
      p_fecha_proxima_inspeccion => v_hoy + 14, -- distinta de la sugerida
      p_fecha_proximo_monitoreo => v_hoy + 365,
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
    p_fecha_proxima_inspeccion_sugerida => v_hoy + 730, p_fecha_proximo_monitoreo_sugerida => v_hoy + 365,
    p_fecha_proxima_inspeccion => v_hoy + 14,
    p_fecha_proximo_monitoreo => v_hoy + 365,
    p_justificacion_ajuste_fecha => 'El árbol muestra signos que requieren seguimiento antes del plazo sugerido'
  );
  SELECT * INTO v_insp FROM inspections WHERE id = v_inspection_id;
  IF v_insp.ajuste_fecha_por IS DISTINCT FROM v_inspector OR v_insp.fecha_ajuste_fecha IS NULL
     OR v_insp.fecha_proxima_inspeccion <> v_hoy + 14 THEN
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

  v_res := pg_temp.finalizar_simple(
    p_inspection_id => v_inspection_id, p_inspector => v_inspector, p_fpi => v_hoy + 730, p_fpm => v_hoy + 365
  );

  SELECT id INTO v_species_id FROM species WHERE especie_cientifica = 'Especie nueva solo al finalizar F5';
  IF v_species_id IS NULL THEN
    RAISE EXCEPTION 'F5 FALLA: la especie no se incorporó al finalizar';
  END IF;
  IF (v_res->>'species_id')::uuid IS DISTINCT FROM v_species_id THEN
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
    PERFORM pg_temp.finalizar_simple(
      p_inspection_id => v_inspection_id, p_inspector => v_inspector, p_fpi => v_hoy + 730, p_fpm => v_hoy + 365
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
    PERFORM pg_temp.finalizar_simple(
      p_inspection_id => v_inspection_id, p_inspector => v_otro_inspector, p_fpi => v_hoy + 730, p_fpm => v_hoy + 365
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
  UPDATE work_orders SET estado_ot = 'programada', fecha_accion_programada = v_hoy WHERE id = v_wo_id;

  BEGIN
    PERFORM pg_temp.finalizar_simple(
      p_inspection_id => v_inspection_id, p_inspector => v_inspector, p_fpi => v_hoy + 730, p_fpm => v_hoy + 365
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

  v_res := pg_temp.finalizar_simple(
    p_inspection_id => v_inspection_id, p_inspector => v_inspector, p_fpi => v_hoy + 730, p_fpm => v_hoy + 365
  );

  BEGIN
    PERFORM pg_temp.finalizar_simple(
      p_inspection_id => v_inspection_id, p_inspector => v_inspector, p_fpi => v_hoy + 730, p_fpm => v_hoy + 365
    );
    RAISE EXCEPTION 'F9 FALLA: se aceptó finalizar dos veces la misma inspección';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('F9 OK');

  -- ------------------------------------------------------------------
  -- F10 — Inspector responsable inactivo: rechazado.
  -- ------------------------------------------------------------------
  v_inspection_id := pg_temp.preparar_inspeccion(p_inspector => v_inspector_inactivo, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F10');
  UPDATE user_profiles SET activo = false WHERE id = v_inspector_inactivo;

  BEGIN
    PERFORM pg_temp.finalizar_simple(
      p_inspection_id => v_inspection_id, p_inspector => v_inspector_inactivo, p_fpi => v_hoy + 730, p_fpm => v_hoy + 365
    );
    RAISE EXCEPTION 'F10 FALLA: un Inspector inactivo pudo finalizar';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('F10 OK');

  -- ------------------------------------------------------------------
  -- F11 — responsable con un rol distinto de Inspector: rechazado.
  -- ------------------------------------------------------------------
  v_inspection_id := pg_temp.preparar_inspeccion(p_inspector => v_inspector_cambia_rol, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F11');
  UPDATE user_profiles SET role_id = (SELECT id FROM roles WHERE nombre = 'usuario_municipal') WHERE id = v_inspector_cambia_rol;

  BEGIN
    PERFORM pg_temp.finalizar_simple(
      p_inspection_id => v_inspection_id, p_inspector => v_inspector_cambia_rol, p_fpi => v_hoy + 730, p_fpm => v_hoy + 365
    );
    RAISE EXCEPTION 'F11 FALLA: un usuario sin rol Inspector pudo finalizar';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('F11 OK');

  -- ------------------------------------------------------------------
  -- F12 — inspección de una OT de Mantenimiento: rechazada.
  -- ------------------------------------------------------------------
  v_inspection_id := pg_temp.preparar_inspeccion(p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F12');
  SELECT work_order_id INTO v_wo_id FROM inspections WHERE id = v_inspection_id;
  UPDATE work_orders SET tipo_ot = 'mantenimiento' WHERE id = v_wo_id;

  BEGIN
    PERFORM pg_temp.finalizar_simple(
      p_inspection_id => v_inspection_id, p_inspector => v_inspector, p_fpi => v_hoy + 730, p_fpm => v_hoy + 365
    );
    RAISE EXCEPTION 'F12 FALLA: se finalizó una inspección de una OT de Mantenimiento';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('F12 OK');

  -- ------------------------------------------------------------------
  -- F13 (a) — sin fila en evaluations: rechazada, catálogo intacto.
  -- ------------------------------------------------------------------
  v_inspection_id := pg_temp.preparar_inspeccion(
    p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Especie sin evaluacion F13', p_con_evaluacion => false
  );

  BEGIN
    PERFORM pg_temp.finalizar_simple(
      p_inspection_id => v_inspection_id, p_inspector => v_inspector, p_fpi => v_hoy + 730, p_fpm => v_hoy + 365
    );
    RAISE EXCEPTION 'F13 FALLA: se finalizó una inspección sin fila en evaluations';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    NULL;
  END;
  IF EXISTS (SELECT 1 FROM species WHERE especie_cientifica = 'Especie sin evaluacion F13') THEN
    RAISE EXCEPTION 'F13 FALLA: la especie entró al catálogo a pesar del rechazo';
  END IF;
  IF EXISTS (SELECT 1 FROM inspections WHERE id = v_inspection_id AND estado_registro <> 'preguardado') THEN
    RAISE EXCEPTION 'F13 FALLA: la inspección cambió de estado a pesar del rechazo';
  END IF;
  INSERT INTO test_log (msg) VALUES ('F13 OK');

  -- ------------------------------------------------------------------
  -- F14 (c) — valor ajustado no_determinado: rechazado, nada escrito.
  -- ------------------------------------------------------------------
  v_inspection_id := pg_temp.preparar_inspeccion(p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F14');

  BEGIN
    PERFORM fn_finalizar_inspeccion(
      p_inspection_id => v_inspection_id, p_usuario => v_inspector,
      p_resultado => v_resultado_base || '{"clasificacion_riesgo_ajustada": "no_determinado"}'::jsonb,
      p_ajustes => jsonb_build_array(jsonb_build_object(
        'campo', 'clasificacion_riesgo', 'valor_calculado', 'bajo',
        'valor_ajustado', 'no_determinado', 'justificacion_ajuste_clasificacion', 'No corresponde'
      )),
      p_fecha_proxima_inspeccion_sugerida => v_hoy + 730, p_fecha_proximo_monitoreo_sugerida => v_hoy + 365,
      p_fecha_proxima_inspeccion => v_hoy + 730, p_fecha_proximo_monitoreo => v_hoy + 365,
      p_justificacion_ajuste_fecha => NULL
    );
    RAISE EXCEPTION 'F14 FALLA: se aceptó un valor ajustado no_determinado';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    NULL;
  END;
  IF EXISTS (
    SELECT 1 FROM classification_adjustments ca JOIN evaluations e ON e.id = ca.evaluation_id
    WHERE e.inspection_id = v_inspection_id
  ) OR EXISTS (SELECT 1 FROM evaluations WHERE inspection_id = v_inspection_id AND calculado_at IS NOT NULL) THEN
    RAISE EXCEPTION 'F14 FALLA: quedó algo escrito a pesar del rechazo';
  END IF;
  INSERT INTO test_log (msg) VALUES ('F14 OK');

  -- ------------------------------------------------------------------
  -- F15 (c) — ajustes incoherentes con p_resultado: cuatro rechazos.
  -- ------------------------------------------------------------------
  v_inspection_id := pg_temp.preparar_inspeccion(p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F15');

  -- (1) valor_calculado distinto del calculado del resultado ("bajo").
  BEGIN
    PERFORM fn_finalizar_inspeccion(
      p_inspection_id => v_inspection_id, p_usuario => v_inspector,
      p_resultado => v_resultado_base || '{"clasificacion_riesgo_ajustada": "alto"}'::jsonb,
      p_ajustes => jsonb_build_array(jsonb_build_object(
        'campo', 'clasificacion_riesgo', 'valor_calculado', 'moderado',
        'valor_ajustado', 'alto', 'justificacion_ajuste_clasificacion', 'Justificación de prueba'
      )),
      p_fecha_proxima_inspeccion_sugerida => v_hoy + 730, p_fecha_proximo_monitoreo_sugerida => v_hoy + 365,
      p_fecha_proxima_inspeccion => v_hoy + 730, p_fecha_proximo_monitoreo => v_hoy + 365,
      p_justificacion_ajuste_fecha => NULL
    );
    RAISE EXCEPTION 'F15 FALLA (1): se aceptó un valor_calculado distinto del calculado';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    NULL;
  END;

  -- (2) ajuste presente, pero el resultado no trae su *_ajustada.
  BEGIN
    PERFORM fn_finalizar_inspeccion(
      p_inspection_id => v_inspection_id, p_usuario => v_inspector,
      p_resultado => v_resultado_base,
      p_ajustes => jsonb_build_array(jsonb_build_object(
        'campo', 'clasificacion_riesgo', 'valor_calculado', 'bajo',
        'valor_ajustado', 'alto', 'justificacion_ajuste_clasificacion', 'Justificación de prueba'
      )),
      p_fecha_proxima_inspeccion_sugerida => v_hoy + 730, p_fecha_proximo_monitoreo_sugerida => v_hoy + 365,
      p_fecha_proxima_inspeccion => v_hoy + 730, p_fecha_proximo_monitoreo => v_hoy + 365,
      p_justificacion_ajuste_fecha => NULL
    );
    RAISE EXCEPTION 'F15 FALLA (2): se aceptó un ajuste sin su *_ajustada en el resultado';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    NULL;
  END;

  -- (3) *_ajustada en el resultado sin ajuste en p_ajustes.
  BEGIN
    PERFORM fn_finalizar_inspeccion(
      p_inspection_id => v_inspection_id, p_usuario => v_inspector,
      p_resultado => v_resultado_base || '{"clasificacion_prioridad_ajustada": "alta"}'::jsonb,
      p_ajustes => '[]'::jsonb,
      p_fecha_proxima_inspeccion_sugerida => v_hoy + 730, p_fecha_proximo_monitoreo_sugerida => v_hoy + 365,
      p_fecha_proxima_inspeccion => v_hoy + 730, p_fecha_proximo_monitoreo => v_hoy + 365,
      p_justificacion_ajuste_fecha => NULL
    );
    RAISE EXCEPTION 'F15 FALLA (3): se aceptó una clasificación ajustada sin ajuste';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    NULL;
  END;

  -- (4) dos ajustes del mismo campo.
  BEGIN
    PERFORM fn_finalizar_inspeccion(
      p_inspection_id => v_inspection_id, p_usuario => v_inspector,
      p_resultado => v_resultado_base || '{"clasificacion_riesgo_ajustada": "alto"}'::jsonb,
      p_ajustes => jsonb_build_array(
        jsonb_build_object('campo', 'clasificacion_riesgo', 'valor_calculado', 'bajo',
                           'valor_ajustado', 'alto', 'justificacion_ajuste_clasificacion', 'Justificación de prueba'),
        jsonb_build_object('campo', 'clasificacion_riesgo', 'valor_calculado', 'bajo',
                           'valor_ajustado', 'alto', 'justificacion_ajuste_clasificacion', 'Justificación repetida')
      ),
      p_fecha_proxima_inspeccion_sugerida => v_hoy + 730, p_fecha_proximo_monitoreo_sugerida => v_hoy + 365,
      p_fecha_proxima_inspeccion => v_hoy + 730, p_fecha_proximo_monitoreo => v_hoy + 365,
      p_justificacion_ajuste_fecha => NULL
    );
    RAISE EXCEPTION 'F15 FALLA (4): se aceptaron dos ajustes del mismo campo';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    NULL;
  END;

  IF EXISTS (SELECT 1 FROM inspections WHERE id = v_inspection_id AND estado_registro <> 'preguardado') THEN
    RAISE EXCEPTION 'F15 FALLA: la inspección cambió de estado a pesar de los rechazos';
  END IF;
  INSERT INTO test_log (msg) VALUES ('F15 OK');

  -- ------------------------------------------------------------------
  -- F16 (d) — D-202 posterior, D-203 igual o posterior a fecha_inspeccion.
  -- ------------------------------------------------------------------
  v_inspection_id := pg_temp.preparar_inspeccion(p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F16');

  -- (1) fecha_proxima_inspeccion = fecha_inspeccion: no es posterior.
  BEGIN
    PERFORM pg_temp.finalizar_simple(p_inspection_id => v_inspection_id, p_inspector => v_inspector, p_fpi => v_hoy, p_fpm => v_hoy + 365);
    RAISE EXCEPTION 'F16 FALLA (1): se aceptó fecha_proxima_inspeccion igual a fecha_inspeccion';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    NULL;
  END;

  -- (2) fecha_proximo_monitoreo anterior a fecha_inspeccion.
  BEGIN
    PERFORM pg_temp.finalizar_simple(p_inspection_id => v_inspection_id, p_inspector => v_inspector, p_fpi => v_hoy + 730, p_fpm => v_hoy - 1);
    RAISE EXCEPTION 'F16 FALLA (2): se aceptó fecha_proximo_monitoreo anterior a fecha_inspeccion';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    NULL;
  END;

  -- (3) fecha sin valor (D-202/D-203 obligatorias).
  BEGIN
    PERFORM pg_temp.finalizar_simple(p_inspection_id => v_inspection_id, p_inspector => v_inspector, p_fpi => NULL, p_fpm => v_hoy + 365);
    RAISE EXCEPTION 'F16 FALLA (3): se aceptó una fecha obligatoria sin valor';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    NULL;
  END;

  -- (4) fecha_proximo_monitoreo = fecha_inspeccion (Extremo, "inmediato"): aceptada.
  v_res := pg_temp.finalizar_simple(p_inspection_id => v_inspection_id, p_inspector => v_inspector, p_fpi => v_hoy + 7, p_fpm => v_hoy);
  IF NOT EXISTS (SELECT 1 FROM inspections WHERE id = v_inspection_id AND estado_registro = 'finalizado' AND fecha_proximo_monitoreo = v_hoy) THEN
    RAISE EXCEPTION 'F16 FALLA (4): no se aceptó fecha_proximo_monitoreo igual a fecha_inspeccion';
  END IF;
  INSERT INTO test_log (msg) VALUES ('F16 OK');

  -- ------------------------------------------------------------------
  -- F17 (CC-053) — especie con species_id ya puesto: no se toca el catálogo.
  -- ------------------------------------------------------------------
  v_inspection_id := pg_temp.preparar_inspeccion(p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Especie ya vinculada F17');
  v_species_id := fn_resolve_or_create_species(p_especie_cientifica => 'Especie ya vinculada F17', p_created_by => v_inspector);
  UPDATE tree_data_versions SET species_id = v_species_id WHERE inspection_id = v_inspection_id;
  SELECT count(*) INTO v_count FROM species;

  v_res := pg_temp.finalizar_simple(
    p_inspection_id => v_inspection_id, p_inspector => v_inspector, p_fpi => v_hoy + 730, p_fpm => v_hoy + 365
  );
  IF (SELECT count(*) FROM species) <> v_count THEN
    RAISE EXCEPTION 'F17 FALLA: cambió el número de especies del catálogo';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tree_data_versions WHERE inspection_id = v_inspection_id AND species_id = v_species_id) THEN
    RAISE EXCEPTION 'F17 FALLA: cambió el species_id de tree_data_versions';
  END IF;
  IF (v_res->>'species_id')::uuid IS DISTINCT FROM v_species_id THEN
    RAISE EXCEPTION 'F17 FALLA: la respuesta no informa el species_id ya vinculado: %', v_res;
  END IF;
  INSERT INTO test_log (msg) VALUES ('F17 OK');

  -- ------------------------------------------------------------------
  -- F18 (e) — justificación sin que ninguna fecha cambie: sin ajuste_fecha_por.
  -- ------------------------------------------------------------------
  v_inspection_id := pg_temp.preparar_inspeccion(p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F18');

  v_res := fn_finalizar_inspeccion(
    p_inspection_id => v_inspection_id, p_usuario => v_inspector,
    p_resultado => v_resultado_base, p_ajustes => '[]'::jsonb,
    p_fecha_proxima_inspeccion_sugerida => v_hoy + 730, p_fecha_proximo_monitoreo_sugerida => v_hoy + 365,
    p_fecha_proxima_inspeccion => v_hoy + 730, p_fecha_proximo_monitoreo => v_hoy + 365,
    p_justificacion_ajuste_fecha => 'Texto sin ajuste de fecha'
  );
  SELECT * INTO v_insp FROM inspections WHERE id = v_inspection_id;
  IF v_insp.ajuste_fecha_por IS NOT NULL OR v_insp.fecha_ajuste_fecha IS NOT NULL THEN
    RAISE EXCEPTION 'F18 FALLA: se registró ajuste_fecha_por sin que cambiara ninguna fecha';
  END IF;
  INSERT INTO test_log (msg) VALUES ('F18 OK');

  -- ------------------------------------------------------------------
  -- F19 (CC-055) — Monitoreo que adelanta la reinspección: aceptado.
  -- Vigente: hoy + 700 (evaluación inicial de una OT completada).
  -- ------------------------------------------------------------------
  v_inspection_a := pg_temp.preparar_inspeccion(
    p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F19', p_fecha_inspeccion => v_hoy - 30
  );
  SELECT tree_id INTO v_tree_id FROM inspections WHERE id = v_inspection_a;
  PERFORM pg_temp.finalizar_simple(p_inspection_id => v_inspection_a, p_inspector => v_inspector, p_fpi => v_hoy + 700, p_fpm => v_hoy + 300);
  PERFORM pg_temp.completar_ot(p_inspection_id => v_inspection_a, p_fecha => v_hoy - 20);

  v_inspection_id := pg_temp.preparar_inspeccion(
    p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F19',
    p_tree_id => v_tree_id, p_tipo => 'monitoreo', p_subtipo => 'fitosanitario'
  );
  v_res := pg_temp.finalizar_simple(p_inspection_id => v_inspection_id, p_inspector => v_inspector, p_fpi => v_hoy + 30, p_fpm => v_hoy + 14);
  IF NOT EXISTS (SELECT 1 FROM inspections WHERE id = v_inspection_id AND estado_registro = 'finalizado' AND fecha_proxima_inspeccion = v_hoy + 30) THEN
    RAISE EXCEPTION 'F19 FALLA: no se aceptó un Monitoreo que adelanta la reinspección';
  END IF;
  INSERT INTO test_log (msg) VALUES ('F19 OK');

  -- ------------------------------------------------------------------
  -- F20 (CC-055) — Monitoreo que atrasaría la reinspección: rechazado;
  -- igual a la vigente: aceptado. Vigente: hoy + 700.
  -- ------------------------------------------------------------------
  v_inspection_a := pg_temp.preparar_inspeccion(
    p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F20', p_fecha_inspeccion => v_hoy - 30
  );
  SELECT tree_id INTO v_tree_id FROM inspections WHERE id = v_inspection_a;
  PERFORM pg_temp.finalizar_simple(p_inspection_id => v_inspection_a, p_inspector => v_inspector, p_fpi => v_hoy + 700, p_fpm => v_hoy + 300);
  PERFORM pg_temp.completar_ot(p_inspection_id => v_inspection_a, p_fecha => v_hoy - 20);

  v_inspection_id := pg_temp.preparar_inspeccion(
    p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F20',
    p_tree_id => v_tree_id, p_tipo => 'monitoreo', p_subtipo => 'estructural'
  );
  BEGIN
    PERFORM pg_temp.finalizar_simple(p_inspection_id => v_inspection_id, p_inspector => v_inspector, p_fpi => v_hoy + 730, p_fpm => v_hoy + 365);
    RAISE EXCEPTION 'F20 FALLA: se aceptó un Monitoreo que atrasa la reinspección vigente';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    NULL;
  END;
  v_res := pg_temp.finalizar_simple(p_inspection_id => v_inspection_id, p_inspector => v_inspector, p_fpi => v_hoy + 700, p_fpm => v_hoy + 365);
  IF NOT EXISTS (SELECT 1 FROM inspections WHERE id = v_inspection_id AND estado_registro = 'finalizado' AND fecha_proxima_inspeccion = v_hoy + 700) THEN
    RAISE EXCEPTION 'F20 FALLA: no se aceptó un Monitoreo que conserva la fecha vigente';
  END IF;
  INSERT INTO test_log (msg) VALUES ('F20 OK');

  -- ------------------------------------------------------------------
  -- F21 (CC-055) — reinspección atrasada. Vigente: hoy - 10 (ya pasó).
  -- La sugerida no puede pasar del día siguiente a fecha_inspeccion; el
  -- Inspector sí puede ajustar la fecha final, con justificación.
  -- ------------------------------------------------------------------
  v_inspection_a := pg_temp.preparar_inspeccion(
    p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F21', p_fecha_inspeccion => v_hoy - 400
  );
  SELECT tree_id INTO v_tree_id FROM inspections WHERE id = v_inspection_a;
  PERFORM pg_temp.finalizar_simple(p_inspection_id => v_inspection_a, p_inspector => v_inspector, p_fpi => v_hoy - 10, p_fpm => v_hoy - 100);
  PERFORM pg_temp.completar_ot(p_inspection_id => v_inspection_a, p_fecha => v_hoy - 390);

  v_inspection_id := pg_temp.preparar_inspeccion(
    p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia F21',
    p_tree_id => v_tree_id, p_tipo => 'monitoreo', p_subtipo => 'vitalidad'
  );
  BEGIN
    PERFORM pg_temp.finalizar_simple(p_inspection_id => v_inspection_id, p_inspector => v_inspector, p_fpi => v_hoy + 30, p_fpm => v_hoy + 365);
    RAISE EXCEPTION 'F21 FALLA: se aceptó una sugerida posterior al día siguiente con la reinspección atrasada';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    NULL;
  END;
  v_res := fn_finalizar_inspeccion(
    p_inspection_id => v_inspection_id, p_usuario => v_inspector,
    p_resultado => v_resultado_base, p_ajustes => '[]'::jsonb,
    p_fecha_proxima_inspeccion_sugerida => v_hoy + 1, p_fecha_proximo_monitoreo_sugerida => v_hoy + 365,
    p_fecha_proxima_inspeccion => v_hoy + 60, p_fecha_proximo_monitoreo => v_hoy + 365,
    p_justificacion_ajuste_fecha => 'Reinspección coordinada con la cuadrilla en dos meses'
  );
  SELECT * INTO v_insp FROM inspections WHERE id = v_inspection_id;
  IF v_insp.fecha_proxima_inspeccion_sugerida <> v_hoy + 1 OR v_insp.fecha_proxima_inspeccion <> v_hoy + 60
     OR v_insp.ajuste_fecha_por IS DISTINCT FROM v_inspector THEN
    RAISE EXCEPTION 'F21 FALLA: la reinspección atrasada no quedó como se esperaba: %', row_to_json(v_insp);
  END IF;
  INSERT INTO test_log (msg) VALUES ('F21 OK');

  -- ==================================================================
  -- v_tree_fechas_vigentes
  -- ==================================================================

  -- V1 — árbol sin fecha vigente: sin fila.
  v_inspection_id := pg_temp.preparar_inspeccion(p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia V1');
  SELECT tree_id INTO v_tree_id FROM inspections WHERE id = v_inspection_id;
  IF EXISTS (SELECT 1 FROM v_tree_fechas_vigentes WHERE tree_id = v_tree_id) THEN
    RAISE EXCEPTION 'V1 FALLA: un árbol sin inspecciones vigentes aparece en la vista';
  END IF;
  INSERT INTO test_log (msg) VALUES ('V1 OK');

  -- V2 — inspección finalizada de una OT abierta: no cuenta.
  PERFORM pg_temp.finalizar_simple(p_inspection_id => v_inspection_id, p_inspector => v_inspector, p_fpi => v_hoy + 730, p_fpm => v_hoy + 365);
  IF EXISTS (SELECT 1 FROM v_tree_fechas_vigentes WHERE tree_id = v_tree_id) THEN
    RAISE EXCEPTION 'V2 FALLA: cuenta una inspección finalizada de una OT todavía abierta';
  END IF;
  INSERT INTO test_log (msg) VALUES ('V2 OK');

  -- V3 — inspección anulada: no cuenta (aunque su OT esté completada).
  PERFORM pg_temp.completar_ot(p_inspection_id => v_inspection_id, p_fecha => v_hoy);
  IF NOT EXISTS (SELECT 1 FROM v_tree_fechas_vigentes WHERE tree_id = v_tree_id AND fecha_proxima_inspeccion = v_hoy + 730) THEN
    RAISE EXCEPTION 'V3 FALLA (control): la inspección de la OT completada no aparece antes de anularla';
  END IF;
  UPDATE inspections SET estado_registro = 'anulado', motivo_anulacion = 'Prueba V3', anulado_por = v_inspector, fecha_anulacion = now()
  WHERE id = v_inspection_id;
  IF EXISTS (SELECT 1 FROM v_tree_fechas_vigentes WHERE tree_id = v_tree_id) THEN
    RAISE EXCEPTION 'V3 FALLA: cuenta una inspección anulada';
  END IF;
  INSERT INTO test_log (msg) VALUES ('V3 OK');

  -- V4 — dos OT completadas en fechas distintas: gana la más reciente.
  v_inspection_a := pg_temp.preparar_inspeccion(
    p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia V4', p_fecha_inspeccion => v_hoy - 20
  );
  SELECT tree_id INTO v_tree_id FROM inspections WHERE id = v_inspection_a;
  PERFORM pg_temp.finalizar_simple(p_inspection_id => v_inspection_a, p_inspector => v_inspector, p_fpi => v_hoy + 100, p_fpm => v_hoy + 50);
  PERFORM pg_temp.completar_ot(p_inspection_id => v_inspection_a, p_fecha => v_hoy - 10);

  v_inspection_b := pg_temp.preparar_inspeccion(
    p_inspector => v_inspector, p_municipal => v_municipal, p_tree_id => v_tree_id, p_fecha_inspeccion => v_hoy - 8
  );
  PERFORM pg_temp.finalizar_simple(p_inspection_id => v_inspection_b, p_inspector => v_inspector, p_fpi => v_hoy + 200, p_fpm => v_hoy + 60);
  PERFORM pg_temp.completar_ot(p_inspection_id => v_inspection_b, p_fecha => v_hoy - 5);

  SELECT * INTO v_fv FROM v_tree_fechas_vigentes WHERE tree_id = v_tree_id;
  IF v_fv.fecha_proxima_inspeccion <> v_hoy + 200 OR v_fv.origen_fecha_proxima_inspeccion <> v_inspection_b
     OR v_fv.fecha_proximo_monitoreo <> v_hoy + 60 OR v_fv.origen_fecha_proximo_monitoreo <> v_inspection_b THEN
    RAISE EXCEPTION 'V4 FALLA: no ganó la OT completada más reciente: %', row_to_json(v_fv);
  END IF;
  INSERT INTO test_log (msg) VALUES ('V4 OK');

  -- V5 — desempate del mismo día: gana la de fecha_inspeccion más
  -- reciente. Se crea primero la que debe ganar (B), para que no gane
  -- por created_at.
  v_inspection_b := pg_temp.preparar_inspeccion(
    p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia V5', p_fecha_inspeccion => v_hoy - 4
  );
  SELECT tree_id INTO v_tree_id FROM inspections WHERE id = v_inspection_b;
  PERFORM pg_temp.finalizar_simple(p_inspection_id => v_inspection_b, p_inspector => v_inspector, p_fpi => v_hoy + 300, p_fpm => v_hoy + 90);
  PERFORM pg_temp.completar_ot(p_inspection_id => v_inspection_b, p_fecha => v_hoy - 2);

  v_inspection_a := pg_temp.preparar_inspeccion(
    p_inspector => v_inspector, p_municipal => v_municipal, p_tree_id => v_tree_id, p_fecha_inspeccion => v_hoy - 6
  );
  PERFORM pg_temp.finalizar_simple(p_inspection_id => v_inspection_a, p_inspector => v_inspector, p_fpi => v_hoy + 150, p_fpm => v_hoy + 45);
  PERFORM pg_temp.completar_ot(p_inspection_id => v_inspection_a, p_fecha => v_hoy - 2);
  -- created_at de A posterior al de B (now() es el mismo en toda la transacción).
  UPDATE inspections SET created_at = now() + interval '1 hour' WHERE id = v_inspection_a;

  SELECT * INTO v_fv FROM v_tree_fechas_vigentes WHERE tree_id = v_tree_id;
  IF v_fv.origen_fecha_proxima_inspeccion <> v_inspection_b OR v_fv.fecha_proxima_inspeccion <> v_hoy + 300 THEN
    RAISE EXCEPTION 'V5 FALLA: en el mismo día no ganó la de fecha_inspeccion más reciente: %', row_to_json(v_fv);
  END IF;
  INSERT INTO test_log (msg) VALUES ('V5 OK');

  -- V6 — mismo día y misma fecha_inspeccion: gana created_at más reciente.
  v_inspection_a := pg_temp.preparar_inspeccion(
    p_inspector => v_inspector, p_municipal => v_municipal, p_especie => 'Robinia pseudoacacia V6', p_fecha_inspeccion => v_hoy - 4
  );
  SELECT tree_id INTO v_tree_id FROM inspections WHERE id = v_inspection_a;
  PERFORM pg_temp.finalizar_simple(p_inspection_id => v_inspection_a, p_inspector => v_inspector, p_fpi => v_hoy + 150, p_fpm => v_hoy + 45);
  PERFORM pg_temp.completar_ot(p_inspection_id => v_inspection_a, p_fecha => v_hoy - 2);

  v_inspection_b := pg_temp.preparar_inspeccion(
    p_inspector => v_inspector, p_municipal => v_municipal, p_tree_id => v_tree_id, p_fecha_inspeccion => v_hoy - 4
  );
  PERFORM pg_temp.finalizar_simple(p_inspection_id => v_inspection_b, p_inspector => v_inspector, p_fpi => v_hoy + 300, p_fpm => v_hoy + 90);
  PERFORM pg_temp.completar_ot(p_inspection_id => v_inspection_b, p_fecha => v_hoy - 2);
  UPDATE inspections SET created_at = now() + interval '1 hour' WHERE id = v_inspection_b;

  SELECT * INTO v_fv FROM v_tree_fechas_vigentes WHERE tree_id = v_tree_id;
  IF v_fv.origen_fecha_proxima_inspeccion <> v_inspection_b THEN
    RAISE EXCEPTION 'V6 FALLA: con mismo día y misma fecha_inspeccion no ganó created_at más reciente: %', row_to_json(v_fv);
  END IF;
  INSERT INTO test_log (msg) VALUES ('V6 OK');
END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
