-- =====================================================================
-- Pruebas de la migración 025 — Completar OT, cancelar, reasignar y AM-19
-- (#60; CC-050; D-239, D-241, D-242, D-244; PR-003 v8.0)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, DESPUÉS de aplicar la 025.
-- Corre íntegramente dentro de BEGIN … ROLLBACK.
-- Los mensajes FALLA Cn provocan RAISE EXCEPTION y abortan el bloque.
--
-- Sobre SECURITY DEFINER y control de identidad (punto 7 de auditoría):
--   Las funciones fn_complete_work_order_inspeccion, fn_cancel_work_order y
--   fn_reassign_work_order son SECURITY DEFINER con REVOKE a PUBLIC/anon/
--   authenticated y GRANT solo a service_role.
--   En el flujo normal de producción, el backend invoca estas funciones a
--   través de node-postgres (pg.Pool) con la cadena DATABASE_URL del rol
--   service_role (ADR-017), NO a través de PostgREST/supabase-js.
--   El backend extrae el UUID del usuario autenticado exclusivamente del JWT
--   validado por Supabase Auth (`req.user.id`), nunca del cuerpo del request,
--   antes de llamar a la función SQL. El parámetro `p_usuario` es así el UUID
--   que el backend ya autenticó, no una entrada del cliente.
--   La comprobación `auth.uid() IS NOT NULL AND auth.uid() <> p_usuario`
--   sirve como defensa adicional si la función fuese invocada mediante RPC
--   PostgREST (contexto con auth.uid()), pero no reemplaza el control de
--   privilegios: con una conexión service_role directa, auth.uid() es NULL
--   y esa condición no se evalúa, lo que es correcto porque en ese contexto
--   el backend ya es quien autentica al usuario antes de llamar.
--   El riesgo de suplantación vía p_usuario con la conexión service_role
--   es mitigado en la capa de aplicación (el backend nunca acepta p_usuario
--   del cliente) y en estas funciones mediante las validaciones de rol,
--   activo y membresía que comprueban el perfil real del UUID recibido.

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

-- Aserción auxiliar: falla con RAISE EXCEPTION si la condición es falsa.
CREATE FUNCTION pg_temp.assert(p_cond boolean, p_msg text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT p_cond THEN
    RAISE EXCEPTION 'FALLA: %', p_msg;
  END IF;
END;
$$;

CREATE TEMP TABLE test_log (id serial PRIMARY KEY, msg text);

DO $$
DECLARE
  v_project_id uuid;
  v_sector_id uuid;
  v_municipal uuid;
  v_municipal2 uuid;
  v_inspector uuid;
  v_inspector_2 uuid;
  v_encargado uuid;
  v_tree_res jsonb;
  v_tree_id uuid;
  v_wo_id uuid;
  v_wo2_id uuid;
  v_insp_res jsonb;
  v_insp_id uuid;
  v_vigente_antes uuid;
  v_vigente_despues uuid;
BEGIN
  -- 1. Usuarios de prueba
  v_municipal := pg_temp.crear_usuario_prueba(
    p_email => 'muni_025@sivu.example.test',
    p_rol   => 'usuario_municipal',
    p_nombre => 'Municipal 025'
  );
  v_municipal2 := pg_temp.crear_usuario_prueba(
    p_email => 'muni2_025@sivu.example.test',
    p_rol   => 'usuario_municipal',
    p_nombre => 'Municipal Dos 025'
  );
  v_inspector := pg_temp.crear_usuario_prueba(
    p_email => 'insp_025@sivu.example.test',
    p_rol   => 'inspector',
    p_nombre => 'Inspector 025'
  );
  v_inspector_2 := pg_temp.crear_usuario_prueba(
    p_email => 'insp2_025@sivu.example.test',
    p_rol   => 'inspector',
    p_nombre => 'Inspector Dos 025'
  );
  v_encargado := pg_temp.crear_usuario_prueba(
    p_email => 'manten_025@sivu.example.test',
    p_rol   => 'encargado_mantencion',
    p_nombre => 'Encargado 025'
  );

  -- 2. Proyecto y sector
  INSERT INTO public.projects (nombre, institution_name, responsible_professional, created_by)
  VALUES ('Proyecto 025', 'Mun 025', 'Prof 025', v_municipal)
  RETURNING id INTO v_project_id;

  INSERT INTO public.sectors (project_id, nombre, geometria_sector)
  VALUES (
    v_project_id,
    'Sector 025',
    ST_Multi(ST_GeomFromText('POLYGON((-71.65 -33.05, -71.60 -33.05, -71.60 -33.02, -71.65 -33.02, -71.65 -33.05))', 4326))
  )
  RETURNING id INTO v_sector_id;

  INSERT INTO public.project_members (project_id, user_id, added_by)
  VALUES (v_project_id, v_municipal, v_municipal),
         (v_project_id, v_inspector, v_municipal),
         (v_project_id, v_inspector_2, v_municipal),
         (v_project_id, v_encargado, v_municipal);
  -- municipal2 NO es miembro: se usará para probar rechazo por membresía

  -- 3. Árbol de prueba
  v_tree_res := public.fn_create_tree_alta(
    p_project_id             => v_project_id,
    p_especie_cientifica     => 'Cryptocarya alba',
    p_nombre_comun           => 'Peumo',
    p_sector_id              => v_sector_id,
    p_ubicacion_descriptiva  => 'Plaza 025',
    p_coordenadas_utm        => '{"este": 254000, "norte": 6340000}'::jsonb,
    p_creado_por             => v_municipal,
    p_qr_token               => 'qr-025-test'
  );
  v_tree_id := (v_tree_res->>'tree_id')::uuid;

  -- Captura vigente_desde_inspection_id antes de completar la OT
  SELECT vigente_desde_inspection_id INTO v_vigente_antes FROM public.trees WHERE id = v_tree_id;

  -- ===================================================================
  -- Bloque de ayuda: crear y avanzar una OT a en_ejecucion
  -- ===================================================================
  v_wo_id := (public.fn_create_work_order_inspeccion(
    p_project_id           => v_project_id,
    p_tree_id              => v_tree_id,
    p_incident_id          => NULL,
    p_accion_solicitada    => 'evaluacion_inicial',
    p_subtipo_accion       => NULL,
    p_motivo               => 'Control 025',
    p_prioridad            => 'media',
    p_observaciones        => NULL,
    p_responsable_accion_id => v_inspector,
    p_creado_por           => v_municipal,
    p_fecha_creacion_ot    => CURRENT_DATE
  )->>'id')::uuid;

  PERFORM public.fn_transition_work_order_estado(
    p_work_order_id        => v_wo_id,
    p_nuevo_estado         => 'programada',
    p_fecha_accion_programada => CURRENT_DATE + 1,
    p_usuario              => v_inspector
  );
  PERFORM public.fn_transition_work_order_estado(
    p_work_order_id        => v_wo_id,
    p_nuevo_estado         => 'en_ejecucion',
    p_fecha_accion_programada => NULL,
    p_usuario              => v_inspector
  );

  -- -------------------------------------------------------------------
  -- C1: Completar OT sin ninguna inspección -> rechazo SV065 (CC-050)
  -- -------------------------------------------------------------------
  BEGIN
    PERFORM public.fn_complete_work_order_inspeccion(
      p_work_order_id  => v_wo_id,
      p_usuario        => v_municipal,
      p_fecha_completada => CURRENT_DATE
    );
    RAISE EXCEPTION 'FALLA C1: debió rechazar completar sin inspección finalizada';
  EXCEPTION WHEN SQLSTATE 'SV065' THEN
    INSERT INTO test_log (msg) VALUES ('C1 OK: rechazó sin inspección finalizada');
  END;

  -- -------------------------------------------------------------------
  -- C2: Completar OT con inspección en preguardado -> rechazo SV065 (D-239)
  -- -------------------------------------------------------------------
  v_insp_res := public.fn_save_inspection_draft(
    p_inspection_id              => NULL,
    p_work_order_id              => v_wo_id,
    p_tree_id                    => v_tree_id,
    p_inspector                  => v_inspector,
    p_fecha_inspeccion           => CURRENT_DATE,
    p_fecha_registro             => CURRENT_DATE,
    p_rule_version               => '2.1',
    p_tipo_inspeccion_realizada  => 'evaluacion_inicial',
    p_subtipo_inspeccion         => NULL,
    p_metodo_instrumental        => NULL,
    p_resultado_general          => NULL,
    p_requiere_mantenimiento     => false,
    p_observaciones              => NULL,
    p_registrado_por             => v_inspector,
    p_variables                  => '{"dap_cm": 25, "altura_total_m": 8}'::jsonb,
    p_campos_arbol               => '{"dap_cm": 25, "altura_total_m": 8}'::jsonb,
    p_campos_registrados_arbol   => ARRAY['dap_cm', 'altura_total_m']
  );
  v_insp_id := (v_insp_res->>'inspection_id')::uuid;

  BEGIN
    PERFORM public.fn_complete_work_order_inspeccion(
      p_work_order_id    => v_wo_id,
      p_usuario          => v_municipal,
      p_fecha_completada => CURRENT_DATE
    );
    RAISE EXCEPTION 'FALLA C2: debió rechazar con inspección en preguardado';
  EXCEPTION WHEN SQLSTATE 'SV065' THEN
    INSERT INTO test_log (msg) VALUES ('C2 OK: rechazó con inspección en preguardado');
  END;

  -- -------------------------------------------------------------------
  -- C3: Completar OT con inspección finalizada -> ÉXITO y vigencia real
  -- -------------------------------------------------------------------
  PERFORM public.fn_finalizar_inspeccion(
    p_inspection_id                     => v_insp_id,
    p_usuario                           => v_inspector,
    p_resultado                         => '{"entradas_vigentes": {"dap_cm": 25, "altura_total_m": 8},
                                             "calculados": {}, "indicadores": {},
                                             "puntaje_raices_cuello": 2, "probabilidad_falla_raices_cuello": "improbable",
                                             "puntaje_tronco": 3, "probabilidad_falla_tronco": "improbable",
                                             "puntaje_copa_ramas": 1, "probabilidad_falla_copa_ramas": "improbable",
                                             "probabilidad_impacto": "improbable",
                                             "clasificacion_raices_cuello": "bajo", "clasificacion_tronco": "bajo",
                                             "clasificacion_copa_ramas": "bajo", "clasificacion_riesgo_calculada": "bajo",
                                             "clasificacion_prioridad_calculada": "baja",
                                             "fecha_proxima_inspeccion_sugerida": "2028-10-26",
                                             "fecha_proximo_monitoreo_sugerida": "2027-10-26",
                                             "ajustes_descartados": []}'::jsonb,
    p_ajustes                           => '[]'::jsonb,
    p_fecha_proxima_inspeccion_sugerida => CURRENT_DATE + 365,
    p_fecha_proximo_monitoreo_sugerida  => CURRENT_DATE + 180,
    p_fecha_proxima_inspeccion          => CURRENT_DATE + 365,
    p_fecha_proximo_monitoreo           => CURRENT_DATE + 180,
    p_justificacion_ajuste_fecha        => NULL
  );

  PERFORM public.fn_complete_work_order_inspeccion(
    p_work_order_id    => v_wo_id,
    p_usuario          => v_municipal,
    p_fecha_completada => CURRENT_DATE
  );

  -- Aserción: OT completada
  PERFORM pg_temp.assert(
    EXISTS (SELECT 1 FROM public.work_orders WHERE id = v_wo_id AND estado_ot = 'completada' AND fecha_completada_ot = CURRENT_DATE),
    'C3a: OT no quedó en estado completada o fecha_completada_ot incorrecta'
  );

  -- Aserción: árbol refrescado con valores vigentes de la inspección
  PERFORM pg_temp.assert(
    EXISTS (SELECT 1 FROM public.trees WHERE id = v_tree_id AND dap_cm = 25 AND altura_total_m = 8),
    'C3b: árbol no fue refrescado con dap_cm=25 y altura_total_m=8'
  );

  -- Aserción: vigente_desde_inspection_id actualizado
  SELECT vigente_desde_inspection_id INTO v_vigente_despues FROM public.trees WHERE id = v_tree_id;
  PERFORM pg_temp.assert(
    v_vigente_despues = v_insp_id,
    'C3c: vigente_desde_inspection_id no apunta a la inspección finalizada'
  );

  -- Aserción: AM-19 — v_tree_current_inputs refleja la inspección solo con estado_registro = 'finalizado'
  PERFORM pg_temp.assert(
    EXISTS (
      SELECT 1 FROM public.v_tree_current_inputs
      WHERE tree_id = v_tree_id
        AND (entradas_vigentes->>'dap_cm')::numeric = 25
    ),
    'C3d: v_tree_current_inputs no contiene dap_cm = 25 tras AM-19'
  );

  INSERT INTO test_log (msg) VALUES ('C3 OK: OT completada, árbol refrescado, vigencia y AM-19 verificados');

  -- -------------------------------------------------------------------
  -- C4: Completar OT ya completada -> rechazo SV065 (solicitud repetida)
  -- -------------------------------------------------------------------
  BEGIN
    PERFORM public.fn_complete_work_order_inspeccion(
      p_work_order_id    => v_wo_id,
      p_usuario          => v_municipal,
      p_fecha_completada => CURRENT_DATE
    );
    RAISE EXCEPTION 'FALLA C4: debió rechazar completar OT ya completada';
  EXCEPTION WHEN SQLSTATE 'SV065' THEN
    INSERT INTO test_log (msg) VALUES ('C4 OK: rechazó completar OT ya completada (solicitud repetida)');
  END;

  -- -------------------------------------------------------------------
  -- C5: Completar OT por Inspector -> rechazo SV065 (rol incorrecto)
  -- -------------------------------------------------------------------
  v_wo2_id := (public.fn_create_work_order_inspeccion(
    p_project_id           => v_project_id,
    p_tree_id              => v_tree_id,
    p_incident_id          => NULL,
    p_accion_solicitada    => 'reevaluacion',
    p_subtipo_accion       => NULL,
    p_motivo               => 'Control C5',
    p_prioridad            => 'baja',
    p_observaciones        => NULL,
    p_responsable_accion_id => v_inspector,
    p_creado_por           => v_municipal,
    p_fecha_creacion_ot    => CURRENT_DATE
  )->>'id')::uuid;

  PERFORM public.fn_transition_work_order_estado(v_wo2_id, 'programada', CURRENT_DATE + 1, v_inspector);
  PERFORM public.fn_transition_work_order_estado(v_wo2_id, 'en_ejecucion', NULL, v_inspector);

  BEGIN
    PERFORM public.fn_complete_work_order_inspeccion(v_wo2_id, v_inspector, CURRENT_DATE);
    RAISE EXCEPTION 'FALLA C5: debió rechazar completar por inspector';
  EXCEPTION WHEN SQLSTATE 'SV065' THEN
    INSERT INTO test_log (msg) VALUES ('C5 OK: rechazó completar por inspector (rol incorrecto)');
  END;

  -- -------------------------------------------------------------------
  -- C5b: Completar OT por usuario_municipal no miembro -> rechazo SV065
  -- -------------------------------------------------------------------
  BEGIN
    PERFORM public.fn_complete_work_order_inspeccion(v_wo2_id, v_municipal2, CURRENT_DATE);
    RAISE EXCEPTION 'FALLA C5b: debió rechazar completar por usuario no miembro';
  EXCEPTION WHEN SQLSTATE 'SV065' THEN
    INSERT INTO test_log (msg) VALUES ('C5b OK: rechazó completar por usuario no miembro del proyecto');
  END;

  -- -------------------------------------------------------------------
  -- C5c: Completar OT en estado pendiente -> rechazo SV065 (estado incorrecto)
  -- -------------------------------------------------------------------
  DECLARE v_wo_pend uuid;
  BEGIN
    v_wo_pend := (public.fn_create_work_order_inspeccion(
      p_project_id           => v_project_id,
      p_tree_id              => v_tree_id,
      p_incident_id          => NULL,
      p_accion_solicitada    => 'monitoreo',
      p_subtipo_accion       => 'fitosanitario',
      p_motivo               => 'Control estado',
      p_prioridad            => 'baja',
      p_observaciones        => NULL,
      p_responsable_accion_id => v_inspector,
      p_creado_por           => v_municipal,
      p_fecha_creacion_ot    => CURRENT_DATE
    )->>'id')::uuid;

    BEGIN
      PERFORM public.fn_complete_work_order_inspeccion(v_wo_pend, v_municipal, CURRENT_DATE);
      RAISE EXCEPTION 'FALLA C5c: debió rechazar completar OT en estado pendiente';
    EXCEPTION WHEN SQLSTATE 'SV065' THEN
      INSERT INTO test_log (msg) VALUES ('C5c OK: rechazó completar OT en estado pendiente');
    END;
  END;

  -- -------------------------------------------------------------------
  -- C6: Cancelar OT con motivo válido -> ÉXITO con campos de auditoría
  -- -------------------------------------------------------------------
  PERFORM public.fn_cancel_work_order(
    p_work_order_id => v_wo2_id,
    p_motivo        => 'Zona inaccesible por obras municipales',
    p_usuario       => v_municipal
  );

  PERFORM pg_temp.assert(
    EXISTS (
      SELECT 1 FROM public.work_orders
      WHERE id = v_wo2_id
        AND estado_ot = 'cancelada'
        AND motivo_cancelacion = 'Zona inaccesible por obras municipales'
        AND cancelado_por = v_municipal
        AND fecha_cancelacion IS NOT NULL
    ),
    'C6: datos de cancelación incorrectos o ausentes'
  );
  INSERT INTO test_log (msg) VALUES ('C6 OK: OT cancelada con auditoría completa');

  -- -------------------------------------------------------------------
  -- C7: Cancelar OT ya cancelada -> rechazo SV066 (solicitud repetida)
  -- -------------------------------------------------------------------
  BEGIN
    PERFORM public.fn_cancel_work_order(v_wo2_id, 'Segundo intento', v_municipal);
    RAISE EXCEPTION 'FALLA C7: debió rechazar cancelar OT ya cancelada';
  EXCEPTION WHEN SQLSTATE 'SV066' THEN
    INSERT INTO test_log (msg) VALUES ('C7 OK: rechazó cancelar OT ya cancelada (solicitud repetida)');
  END;

  -- -------------------------------------------------------------------
  -- C8: Cancelar OT con motivo vacío o solo espacios -> rechazo SV066
  -- -------------------------------------------------------------------
  DECLARE v_wo_cancel uuid;
  BEGIN
    v_wo_cancel := (public.fn_create_work_order_inspeccion(
      p_project_id           => v_project_id,
      p_tree_id              => v_tree_id,
      p_incident_id          => NULL,
      p_accion_solicitada    => 'reevaluacion',
      p_subtipo_accion       => NULL,
      p_motivo               => 'Control C8',
      p_prioridad            => 'baja',
      p_observaciones        => NULL,
      p_responsable_accion_id => v_inspector,
      p_creado_por           => v_municipal,
      p_fecha_creacion_ot    => CURRENT_DATE
    )->>'id')::uuid;

    BEGIN
      PERFORM public.fn_cancel_work_order(v_wo_cancel, '   ', v_municipal);
      RAISE EXCEPTION 'FALLA C8a: debió rechazar motivo solo espacios';
    EXCEPTION WHEN SQLSTATE 'SV066' THEN
      INSERT INTO test_log (msg) VALUES ('C8a OK: rechazó cancelación con motivo solo espacios');
    END;

    BEGIN
      PERFORM public.fn_cancel_work_order(v_wo_cancel, NULL, v_municipal);
      RAISE EXCEPTION 'FALLA C8b: debió rechazar motivo NULL';
    EXCEPTION WHEN SQLSTATE 'SV066' THEN
      INSERT INTO test_log (msg) VALUES ('C8b OK: rechazó cancelación con motivo NULL');
    END;

    -- Verificar que la OT no quedó cancelada por los intentos fallidos
    PERFORM pg_temp.assert(
      NOT EXISTS (SELECT 1 FROM public.work_orders WHERE id = v_wo_cancel AND estado_ot = 'cancelada'),
      'C8c: OT quedó cancelada pese a motivos inválidos'
    );
    INSERT INTO test_log (msg) VALUES ('C8c OK: OT sin cancelar tras motivos inválidos');
  END;

  -- -------------------------------------------------------------------
  -- C9: Cancelar OT por Inspector -> rechazo SV066 (rol incorrecto)
  -- -------------------------------------------------------------------
  DECLARE v_wo_cancelrol uuid;
  BEGIN
    v_wo_cancelrol := (public.fn_create_work_order_inspeccion(
      p_project_id           => v_project_id,
      p_tree_id              => v_tree_id,
      p_incident_id          => NULL,
      p_accion_solicitada    => 'reevaluacion',
      p_subtipo_accion       => NULL,
      p_motivo               => 'Control C9',
      p_prioridad            => 'baja',
      p_observaciones        => NULL,
      p_responsable_accion_id => v_inspector,
      p_creado_por           => v_municipal,
      p_fecha_creacion_ot    => CURRENT_DATE
    )->>'id')::uuid;

    BEGIN
      PERFORM public.fn_cancel_work_order(v_wo_cancelrol, 'No quiero', v_inspector);
      RAISE EXCEPTION 'FALLA C9: debió rechazar cancelar por inspector';
    EXCEPTION WHEN SQLSTATE 'SV066' THEN
      INSERT INTO test_log (msg) VALUES ('C9 OK: rechazó cancelar por inspector (rol incorrecto)');
    END;
  END;

  -- -------------------------------------------------------------------
  -- C10: Reasignar responsable en OT de inspección -> ÉXITO
  -- -------------------------------------------------------------------
  DECLARE v_wo_reasig uuid;
  BEGIN
    v_wo_reasig := (public.fn_create_work_order_inspeccion(
      p_project_id           => v_project_id,
      p_tree_id              => v_tree_id,
      p_incident_id          => NULL,
      p_accion_solicitada    => 'reevaluacion',
      p_subtipo_accion       => NULL,
      p_motivo               => 'Control C10',
      p_prioridad            => 'baja',
      p_observaciones        => NULL,
      p_responsable_accion_id => v_inspector,
      p_creado_por           => v_municipal,
      p_fecha_creacion_ot    => CURRENT_DATE
    )->>'id')::uuid;

    PERFORM public.fn_reassign_work_order(v_wo_reasig, v_inspector_2, v_municipal);

    PERFORM pg_temp.assert(
      EXISTS (SELECT 1 FROM public.work_orders WHERE id = v_wo_reasig AND responsable_accion_id = v_inspector_2),
      'C10: responsable no fue reasignado a Inspector Dos'
    );
    INSERT INTO test_log (msg) VALUES ('C10 OK: responsable reasignado a Inspector Dos');

    -- C10b: Reasignar a rol incorrecto -> rechazo SV067
    BEGIN
      PERFORM public.fn_reassign_work_order(v_wo_reasig, v_encargado, v_municipal);
      RAISE EXCEPTION 'FALLA C10b: debió rechazar encargado en OT de inspección';
    EXCEPTION WHEN SQLSTATE 'SV067' THEN
      INSERT INTO test_log (msg) VALUES ('C10b OK: rechazó asignar Encargado a OT de Inspección');
    END;

    -- C10c: Reasignar OT completada -> rechazo SV067
    -- Primero, crear y completar una OT
    DECLARE v_wo_comp uuid; v_insp2_res jsonb; v_insp2_id uuid;
    BEGIN
      v_wo_comp := (public.fn_create_work_order_inspeccion(
        p_project_id            => v_project_id,
        p_tree_id               => v_tree_id,
        p_incident_id           => NULL,
        p_accion_solicitada     => 'monitoreo',
        p_subtipo_accion        => 'fitosanitario',
        p_motivo                => 'Control C10c',
        p_prioridad             => 'baja',
        p_observaciones         => NULL,
        p_responsable_accion_id => v_inspector,
        p_creado_por            => v_municipal,
        p_fecha_creacion_ot     => CURRENT_DATE
      )->>'id')::uuid;

      PERFORM public.fn_transition_work_order_estado(v_wo_comp, 'programada', CURRENT_DATE + 1, v_inspector);
      PERFORM public.fn_transition_work_order_estado(v_wo_comp, 'en_ejecucion', NULL, v_inspector);

      v_insp2_res := public.fn_save_inspection_draft(
        p_inspection_id             => NULL,
        p_work_order_id             => v_wo_comp,
        p_tree_id                   => v_tree_id,
        p_inspector                 => v_inspector,
        p_fecha_inspeccion          => CURRENT_DATE,
        p_fecha_registro            => CURRENT_DATE,
        p_rule_version              => '2.1',
        p_tipo_inspeccion_realizada => 'monitoreo',
        p_subtipo_inspeccion        => 'fitosanitario',
        p_metodo_instrumental       => NULL,
        p_resultado_general         => NULL,
        p_requiere_mantenimiento    => false,
        p_observaciones             => NULL,
        p_registrado_por            => v_inspector,
        p_variables                 => '{"dap_cm": 26}'::jsonb,
        p_campos_arbol              => '{"dap_cm": 26}'::jsonb,
        p_campos_registrados_arbol  => ARRAY['dap_cm']
      );
      v_insp2_id := (v_insp2_res->>'inspection_id')::uuid;

      PERFORM public.fn_finalizar_inspeccion(
        p_inspection_id                     => v_insp2_id,
        p_usuario                           => v_inspector,
        p_resultado                         => '{"entradas_vigentes": {"dap_cm": 26},
                                                 "calculados": {}, "indicadores": {},
                                                 "puntaje_raices_cuello": 1, "probabilidad_falla_raices_cuello": "improbable",
                                                 "puntaje_tronco": 1, "probabilidad_falla_tronco": "improbable",
                                                 "puntaje_copa_ramas": 1, "probabilidad_falla_copa_ramas": "improbable",
                                                 "probabilidad_impacto": "improbable",
                                                 "clasificacion_raices_cuello": "bajo", "clasificacion_tronco": "bajo",
                                                 "clasificacion_copa_ramas": "bajo", "clasificacion_riesgo_calculada": "bajo",
                                                 "clasificacion_prioridad_calculada": "baja",
                                                 "fecha_proxima_inspeccion_sugerida": "2028-10-26",
                                                 "fecha_proximo_monitoreo_sugerida": "2027-10-26",
                                                 "ajustes_descartados": []}'::jsonb,
        p_ajustes                           => '[]'::jsonb,
        p_fecha_proxima_inspeccion_sugerida => CURRENT_DATE + 365,
        p_fecha_proximo_monitoreo_sugerida  => CURRENT_DATE + 180,
        p_fecha_proxima_inspeccion          => CURRENT_DATE + 365,
        p_fecha_proximo_monitoreo           => CURRENT_DATE + 180,
        p_justificacion_ajuste_fecha        => NULL
      );

      PERFORM public.fn_complete_work_order_inspeccion(v_wo_comp, v_municipal, CURRENT_DATE);

      BEGIN
        PERFORM public.fn_reassign_work_order(v_wo_comp, v_inspector_2, v_municipal);
        RAISE EXCEPTION 'FALLA C10c: debió rechazar reasignar OT completada';
      EXCEPTION WHEN SQLSTATE 'SV067' THEN
        INSERT INTO test_log (msg) VALUES ('C10c OK: rechazó reasignar OT completada');
      END;
    END;

    -- C10d: Reasignación repetida con mismo responsable (permitida, sin error)
    PERFORM public.fn_reassign_work_order(v_wo_reasig, v_inspector_2, v_municipal);
    PERFORM pg_temp.assert(
      EXISTS (SELECT 1 FROM public.work_orders WHERE id = v_wo_reasig AND responsable_accion_id = v_inspector_2),
      'C10d: reasignación repetida con mismo responsable cambió el estado incorrectamente'
    );
    INSERT INTO test_log (msg) VALUES ('C10d OK: reasignación repetida con mismo responsable es idempotente');
  END;

  -- -------------------------------------------------------------------
  -- C11: Cancelar OT completada -> rechazo SV066 (estado terminal)
  -- -------------------------------------------------------------------
  BEGIN
    PERFORM public.fn_cancel_work_order(v_wo_id, 'Intento tardío', v_municipal);
    RAISE EXCEPTION 'FALLA C11: debió rechazar cancelar OT completada';
  EXCEPTION WHEN SQLSTATE 'SV066' THEN
    INSERT INTO test_log (msg) VALUES ('C11 OK: rechazó cancelar OT completada (estado terminal)');
  END;

END $$;

-- Resumen final: si alguna línea FALLA Cn llegó aquí, algo pasó sin excepción
SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
