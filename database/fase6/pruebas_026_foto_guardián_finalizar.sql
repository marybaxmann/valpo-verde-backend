-- =====================================================================
-- Pruebas de la migración 026 — Guardián fotográfico en fn_finalizar_inspeccion
-- (PR-010 v4.0; D-27; CC-056 punto 2)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, DESPUÉS de aplicar las
-- migraciones 020 y 026 (en ese orden).
-- Corre íntegramente dentro de BEGIN … ROLLBACK.
--
-- Casos cubiertos:
--   F1: Evaluación inicial sin fotografías → SV064
--   F2: Evaluación inicial con 1 vista sola (arbol_completo) → SV064
--   F3: Evaluación inicial con 3 vistas (falta copa) → SV064
--   F4: Fotos de OTRA inspección del mismo árbol, sin fotos propias → SV064
--   F5: Evaluación inicial con las 4 vistas correctas → ÉXITO
--   F6: Monitoreo sin fotografías → ÉXITO (exento por PR-010 v4.0)
--   F7: Evaluación instrumental sin fotografías → ÉXITO (exento)

BEGIN;

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

CREATE FUNCTION pg_temp.assert(p_cond boolean, p_msg text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF p_cond IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'FALLA: %', p_msg;
  END IF;
END;
$$;

-- Helper: crea un borrador de inspección mínimo y avanza la OT a en_ejecucion.
-- Devuelve (wo_id, insp_id) como jsonb.
CREATE FUNCTION pg_temp.preparar_inspeccion(
  p_project_id uuid,
  p_tree_id uuid,
  p_sector_id uuid,
  p_inspector uuid,
  p_municipal uuid,
  p_tipo text,
  p_subtipo text,
  p_email_suffix text
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_wo_id uuid;
  v_insp_res jsonb;
  v_insp_id uuid;
BEGIN
  v_wo_id := (public.fn_create_work_order_inspeccion(
    p_project_id            => p_project_id,
    p_tree_id               => p_tree_id,
    p_incident_id           => NULL,
    p_accion_solicitada     => p_tipo,
    p_subtipo_accion        => p_subtipo,
    p_motivo                => 'Prueba 026 ' || p_email_suffix,
    p_prioridad             => 'media',
    p_observaciones         => NULL,
    p_responsable_accion_id => p_inspector,
    p_creado_por            => p_municipal,
    p_fecha_creacion_ot     => CURRENT_DATE
  )::jsonb->>'id')::uuid;

  PERFORM public.fn_transition_work_order_estado(
    p_work_order_id           => v_wo_id,
    p_nuevo_estado            => 'programada',
    p_fecha_accion_programada => CURRENT_DATE + 1,
    p_usuario                 => p_inspector
  );
  PERFORM public.fn_transition_work_order_estado(
    p_work_order_id           => v_wo_id,
    p_nuevo_estado            => 'en_ejecucion',
    p_fecha_accion_programada => NULL,
    p_usuario                 => p_inspector
  );

  v_insp_res := public.fn_save_inspection_draft(
    p_inspection_id             => NULL,
    p_work_order_id             => v_wo_id,
    p_tree_id                   => p_tree_id,
    p_inspector                 => p_inspector,
    p_fecha_inspeccion          => CURRENT_DATE,
    p_fecha_registro            => CURRENT_DATE,
    p_rule_version              => '2.1',
    p_tipo_inspeccion_realizada => p_tipo,
    p_subtipo_inspeccion        => p_subtipo,
    p_metodo_instrumental       => NULL,
    p_resultado_general         => NULL,
    p_requiere_mantenimiento    => false,
    p_observaciones             => NULL,
    p_registrado_por            => p_inspector,
    p_variables                 => '{"dap_cm": 25, "altura_total_m": 8}'::jsonb,
    p_campos_arbol              => '{"dap_cm": 25, "altura_total_m": 8}'::jsonb,
    p_campos_registrados_arbol  => ARRAY['dap_cm', 'altura_total_m']
  );
  v_insp_id := (v_insp_res->>'inspection_id')::uuid;

  RETURN jsonb_build_object('wo_id', v_wo_id, 'insp_id', v_insp_id);
END;
$$;

-- Helper: llama fn_finalizar_inspeccion con resultado mínimo válido.
CREATE FUNCTION pg_temp.finalizar(p_insp_id uuid, p_inspector uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.fn_finalizar_inspeccion(
    p_inspection_id                     => p_insp_id,
    p_usuario                           => p_inspector,
    p_resultado                         => '{
      "variables_calculo": {},
      "calculados": {}, "indicadores": {},
      "puntaje_raices_cuello": 2, "probabilidad_falla_raices_cuello": "improbable",
      "puntaje_tronco": 3,        "probabilidad_falla_tronco": "improbable",
      "puntaje_copa_ramas": 1,    "probabilidad_falla_copa_ramas": "improbable",
      "probabilidad_impacto": "improbable",
      "clasificacion_raices_cuello": "bajo", "clasificacion_tronco": "bajo",
      "clasificacion_copa_ramas": "bajo",    "clasificacion_riesgo_calculada": "bajo",
      "puntaje_infraestructura": 0, "pct_infraestructura": 0,
      "clasificacion_infraestructura_calculada": "bajo",
      "clasificacion_prioridad_calculada": "baja",
      "clasificacion_riesgo_ajustada": null,
      "clasificacion_infraestructura_ajustada": null,
      "clasificacion_prioridad_ajustada": null,
      "rule_version": "2.1", "motor_commit": "test"
    }'::jsonb,
    p_ajustes                           => '[]'::jsonb,
    p_fecha_proxima_inspeccion_sugerida => CURRENT_DATE + 365,
    p_fecha_proximo_monitoreo_sugerida  => CURRENT_DATE + 180,
    p_fecha_proxima_inspeccion          => CURRENT_DATE + 365,
    p_fecha_proximo_monitoreo           => CURRENT_DATE + 180,
    p_justificacion_ajuste_fecha        => NULL
  );
END;
$$;

-- Helper: inserta una foto vinculada a una inspección.
CREATE FUNCTION pg_temp.insertar_foto(
  p_inspection_id uuid,
  p_tree_id uuid,
  p_uploaded_by uuid,
  p_vista text
) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.photos (id, tree_id, storage_path, vista, inspection_id, maintenance_record_id, incident_id, uploaded_by)
  VALUES (
    gen_random_uuid(),
    p_tree_id,
    'tree-photos/' || p_inspection_id::text || '/' || p_vista || '.jpg',
    p_vista,
    p_inspection_id,
    NULL,
    NULL,
    p_uploaded_by
  );
END;
$$;

CREATE TEMP TABLE test_log (id serial PRIMARY KEY, msg text);

DO $$
DECLARE
  v_project_id   uuid;
  v_sector_id    uuid;
  v_municipal    uuid;
  v_inspector    uuid;
  v_tree_id      uuid;
  v_tree_res     jsonb;
  v_ctx          jsonb;
  v_insp_id      uuid;
  v_insp_id_otro uuid;
BEGIN
  -- 1. Usuarios
  v_municipal := pg_temp.crear_usuario_prueba('muni_026@sivu.example.test', 'usuario_municipal', 'Municipal 026');
  v_inspector := pg_temp.crear_usuario_prueba('insp_026@sivu.example.test', 'inspector', 'Inspector 026');

  -- 2. Proyecto, sector y miembros
  INSERT INTO public.projects (nombre, institution_name, responsible_professional, created_by)
  VALUES ('Proyecto 026', 'Mun 026', 'Prof 026', v_municipal)
  RETURNING id INTO v_project_id;

  INSERT INTO public.sectors (project_id, nombre, geometria_sector)
  VALUES (
    v_project_id, 'Sector 026',
    ST_Multi(ST_GeomFromText('POLYGON((-71.65 -33.05, -71.60 -33.05, -71.60 -33.02, -71.65 -33.02, -71.65 -33.05))', 4326))
  ) RETURNING id INTO v_sector_id;

  INSERT INTO public.project_members (project_id, user_id, added_by)
  VALUES (v_project_id, v_municipal, v_municipal),
         (v_project_id, v_inspector, v_municipal);

  -- 3. Árbol de prueba
  v_tree_res := public.fn_create_tree_alta(
    p_project_id            => v_project_id,
    p_especie_cientifica    => 'Quillaja saponaria',
    p_nombre_comun          => 'Quillay',
    p_sector_id             => v_sector_id,
    p_ubicacion_descriptiva => 'Plaza 026',
    p_coordenadas_utm       => '{"este": 254100, "norte": 6340100}'::jsonb,
    p_creado_por            => v_municipal,
    p_qr_token              => 'qr-026-test'
  );
  v_tree_id := (v_tree_res->>'tree_id')::uuid;

  -- =================================================================
  -- F1: evaluacion_inicial sin fotografías → SV064
  -- =================================================================
  v_ctx    := pg_temp.preparar_inspeccion(v_project_id, v_tree_id, v_sector_id, v_inspector, v_municipal,
                'evaluacion_inicial', NULL, 'f1');
  v_insp_id := (v_ctx->>'insp_id')::uuid;

  BEGIN
    PERFORM pg_temp.finalizar(v_insp_id, v_inspector);
    RAISE EXCEPTION 'FALLA F1: debió rechazar sin fotografías';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    INSERT INTO test_log (msg) VALUES ('F1 OK: rechazó evaluacion_inicial sin fotografías (SV064)');
  END;

  -- =================================================================
  -- F2: evaluacion_inicial con 1 vista sola (arbol_completo) → SV064
  -- =================================================================
  PERFORM pg_temp.insertar_foto(v_insp_id, v_tree_id, v_inspector, 'arbol_completo');

  BEGIN
    PERFORM pg_temp.finalizar(v_insp_id, v_inspector);
    RAISE EXCEPTION 'FALLA F2: debió rechazar con solo 1 vista';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    INSERT INTO test_log (msg) VALUES ('F2 OK: rechazó evaluacion_inicial con 1 vista (SV064)');
  END;

  -- =================================================================
  -- F3: evaluacion_inicial con 3 vistas (falta copa) → SV064
  -- =================================================================
  PERFORM pg_temp.insertar_foto(v_insp_id, v_tree_id, v_inspector, 'base');
  PERFORM pg_temp.insertar_foto(v_insp_id, v_tree_id, v_inspector, 'tronco');
  -- 'copa' deliberadamente ausente

  BEGIN
    PERFORM pg_temp.finalizar(v_insp_id, v_inspector);
    RAISE EXCEPTION 'FALLA F3: debió rechazar con 3 vistas (falta copa)';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    INSERT INTO test_log (msg) VALUES ('F3 OK: rechazó evaluacion_inicial con 3 vistas / falta copa (SV064)');
  END;

  -- =================================================================
  -- F4: Fotos de OTRA inspección, sin fotos propias → SV064
  -- (Crea una inspección paralela del mismo árbol con fotos completas,
  --  pero la inspección a finalizar sigue sin fotos propias.)
  -- =================================================================
  -- Necesita una segunda OT. Usamos una reevaluacion para no colisionar
  -- con el tipo de la primera OT (que sigue en_ejecucion).
  -- Nota: las dos OT del mismo árbol son independientes; la 025 valida
  -- que solo una inspección finalizada por OT sea necesaria para
  -- completar, pero aquí no completamos la OT — solo creamos el contexto.
  v_ctx := pg_temp.preparar_inspeccion(v_project_id, v_tree_id, v_sector_id, v_inspector, v_municipal,
             'reevaluacion', NULL, 'f4-otro');
  v_insp_id_otro := (v_ctx->>'insp_id')::uuid;

  -- Fotos en la inspección "otro" (no en v_insp_id del caso F1-F3)
  PERFORM pg_temp.insertar_foto(v_insp_id_otro, v_tree_id, v_inspector, 'arbol_completo');
  PERFORM pg_temp.insertar_foto(v_insp_id_otro, v_tree_id, v_inspector, 'base');
  PERFORM pg_temp.insertar_foto(v_insp_id_otro, v_tree_id, v_inspector, 'tronco');
  PERFORM pg_temp.insertar_foto(v_insp_id_otro, v_tree_id, v_inspector, 'copa');

  -- v_insp_id (F1) sigue con solo 3 vistas (arbol_completo, base, tronco)
  BEGIN
    PERFORM pg_temp.finalizar(v_insp_id, v_inspector);
    RAISE EXCEPTION 'FALLA F4: debió rechazar — fotos de otra inspección no cuentan';
  EXCEPTION WHEN SQLSTATE 'SV064' THEN
    INSERT INTO test_log (msg) VALUES ('F4 OK: rechazó — fotos de otra inspección no sustituyen a las propias (SV064)');
  END;

  -- =================================================================
  -- F5: evaluacion_inicial con las 4 vistas correctas → ÉXITO
  -- =================================================================
  -- Añadimos 'copa' a v_insp_id (que ya tiene arbol_completo, base, tronco)
  PERFORM pg_temp.insertar_foto(v_insp_id, v_tree_id, v_inspector, 'copa');

  PERFORM pg_temp.finalizar(v_insp_id, v_inspector);

  PERFORM pg_temp.assert(
    EXISTS (SELECT 1 FROM public.inspections WHERE id = v_insp_id AND estado_registro = 'finalizado'),
    'F5: la inspección no quedó en estado finalizado'
  );
  INSERT INTO test_log (msg) VALUES ('F5 OK: evaluacion_inicial con 4 vistas finalizó correctamente');

  -- =================================================================
  -- F6: Monitoreo sin fotografías → ÉXITO (exento PR-010 v4.0)
  -- =================================================================
  v_ctx    := pg_temp.preparar_inspeccion(v_project_id, v_tree_id, v_sector_id, v_inspector, v_municipal,
                'monitoreo', 'fitosanitario', 'f6');
  v_insp_id := (v_ctx->>'insp_id')::uuid;

  PERFORM pg_temp.finalizar(v_insp_id, v_inspector);

  PERFORM pg_temp.assert(
    EXISTS (SELECT 1 FROM public.inspections WHERE id = v_insp_id AND estado_registro = 'finalizado'),
    'F6: el monitoreo no finalizó'
  );
  INSERT INTO test_log (msg) VALUES ('F6 OK: monitoreo sin fotografías finalizó correctamente (exento)');

  -- =================================================================
  -- F7: Evaluación instrumental sin fotografías → ÉXITO (exento)
  -- =================================================================
  v_ctx    := pg_temp.preparar_inspeccion(v_project_id, v_tree_id, v_sector_id, v_inspector, v_municipal,
                'evaluacion_instrumental', 'tomografia_sonica', 'f7');
  v_insp_id := (v_ctx->>'insp_id')::uuid;

  PERFORM pg_temp.finalizar(v_insp_id, v_inspector);

  PERFORM pg_temp.assert(
    EXISTS (SELECT 1 FROM public.inspections WHERE id = v_insp_id AND estado_registro = 'finalizado'),
    'F7: la evaluación instrumental no finalizó'
  );
  INSERT INTO test_log (msg) VALUES ('F7 OK: evaluacion_instrumental sin fotografías finalizó correctamente (exento)');

END $$;

-- Resumen final
SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
