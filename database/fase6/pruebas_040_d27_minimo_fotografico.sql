-- CC-077 — ejecutar con psql -X -v ON_ERROR_STOP=1 en una BD aislada
-- llamada sivu_f5d_local con el esquema SIVU hasta la migración 040.
BEGIN;
DO $$
BEGIN
  IF current_database() <> 'sivu_f5d_local' THEN
    RAISE EXCEPTION 'Prueba 040: use exclusivamente la base aislada sivu_f5d_local';
  END IF;
END;
$$;

-- Sector de prueba en UTM 19S (mismo que pruebas_020 y pruebas_021).
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
    p_tree_id               => CASE WHEN p_tipo = 'levantamiento' THEN NULL ELSE p_tree_id END,
    p_incident_id           => NULL,
    p_accion_solicitada     => p_tipo,
    p_subtipo_accion        => p_subtipo,
    p_motivo                => 'Prueba 040 ' || p_email_suffix,
    p_prioridad             => 'media',
    p_observaciones         => CASE WHEN p_tipo = 'levantamiento' THEN 'Prueba local D-27' END,
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
    p_rule_version              => '3.0',
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
    p_resultado                         => jsonb_build_object(
      'variables_calculo', '{"dap_cm": 25, "altura_total_m": 8}'::jsonb,
      'calculados', '{}'::jsonb, 'indicadores', '{}'::jsonb,
      'puntaje_raices_cuello', 0, 'probabilidad_falla_raices_cuello', 'improbable',
      'puntaje_tronco', 0, 'probabilidad_falla_tronco', 'improbable',
      'puntaje_copa_ramas', 0, 'probabilidad_falla_copa_ramas', 'improbable',
      'probabilidad_impacto', 'baja',
      'clasificacion_raices_cuello', 'bajo', 'clasificacion_tronco', 'bajo', 'clasificacion_copa_ramas', 'bajo',
      'clasificacion_riesgo_calculada', 'bajo',
      'puntaje_infraestructura', 0, 'pct_infraestructura', 0, 'clasificacion_infraestructura_calculada', 'no_aplica',
      'clasificacion_prioridad_calculada', 'baja',
      'clasificacion_riesgo_ajustada', NULL, 'clasificacion_infraestructura_ajustada', NULL, 'clasificacion_prioridad_ajustada', NULL,
      'rule_version', '3.0', 'motor_commit', 'prueba-040'
    ),
    p_ajustes                           => '[]'::jsonb,
    p_fecha_proxima_inspeccion_sugerida => CURRENT_DATE + 365,
    p_fecha_proximo_monitoreo_sugerida  => CURRENT_DATE + 180,
    p_fecha_proxima_inspeccion          => CURRENT_DATE + 365,
    p_fecha_proximo_monitoreo           => CURRENT_DATE + 180,
    p_justificacion_ajuste_fecha        => NULL
  );
END;
$$;

CREATE FUNCTION pg_temp.esperar_error(p_id uuid, p_inspector uuid, p_texto text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_temp.finalizar(p_id, p_inspector);
  RAISE EXCEPTION 'Se esperaba el rechazo %', p_texto;
EXCEPTION WHEN SQLSTATE 'SV064' THEN
  IF strpos(SQLERRM, p_texto) = 0 THEN RAISE; END IF;
END;
$$;

DO $$
DECLARE
  v_project_id uuid;
  v_sector_id uuid;
  v_municipal uuid;
  v_inspector uuid;
  v_tree_id uuid;
  v_tree_res jsonb;
  v_actual uuid;
  v_ajena uuid;
  v_caso record;
BEGIN
  -- 1. Usuarios
  v_municipal := pg_temp.crear_usuario_prueba(p_email => 'muni_040@sivu.example.test', p_rol => 'usuario_municipal', p_nombre => 'Municipal 040');
  v_inspector := pg_temp.crear_usuario_prueba(p_email => 'insp_040@sivu.example.test', p_rol => 'inspector', p_nombre => 'Inspector 040');

  -- 2. Proyecto, sector y miembros
  INSERT INTO public.projects (nombre_proyecto, created_by)
  VALUES ('040 prueba ' || gen_random_uuid(), v_municipal)
  RETURNING id INTO v_project_id;

  INSERT INTO public.sectors (project_id, nombre_sector, geometria_sector)
  VALUES (v_project_id, 'Sector 040', pg_temp.geom_sector())
  RETURNING id INTO v_sector_id;

  INSERT INTO public.project_members (project_id, user_id, added_by)
  VALUES (v_project_id, v_municipal, v_municipal),
         (v_project_id, v_inspector, v_municipal);

  -- 3. Árbol de prueba
  v_tree_res := public.fn_create_tree_alta(
    p_project_id            => v_project_id,
    p_sector_id             => v_sector_id,
    p_sector                => 'Barrio Puerto',
    p_ubicacion_descriptiva => 'Plaza 040',
    p_utm_este              => 256100,
    p_utm_norte             => 6341100,
    p_especie_cientifica    => 'Quillaja saponaria',
    p_nombre_comun          => 'Quillay',
    p_fecha_registro        => CURRENT_DATE,
    p_registrado_por        => v_municipal
  );
  v_tree_id := (v_tree_res->>'id')::uuid;

  PERFORM pg_temp.assert(
    has_function_privilege('service_role', 'public.fn_finalizar_inspeccion(uuid,uuid,jsonb,jsonb,date,date,date,date,text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.fn_finalizar_inspeccion(uuid,uuid,jsonb,jsonb,date,date,date,date,text)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.fn_finalizar_inspeccion(uuid,uuid,jsonb,jsonb,date,date,date,date,text)', 'EXECUTE'),
    'los permisos de ejecución deben conservarse'
  );

  v_ajena := (pg_temp.preparar_inspeccion(v_project_id, v_tree_id, v_sector_id, v_inspector, v_municipal,
    'evaluacion_inicial', NULL, 'ajena')->>'insp_id')::uuid;
  INSERT INTO public.photos (tree_id, inspection_id, storage_path, vista, uploaded_by)
    VALUES (v_tree_id, v_ajena, 'externa.jpg', 'copa', v_inspector);

  FOR v_caso IN SELECT * FROM (VALUES
    ('evaluacion_inicial', NULL, 'cero', 0),
    ('reevaluacion', NULL, 'una', 1),
    ('levantamiento', NULL, 'dos', 2),
    ('reevaluacion', NULL, 'varias', 3),
    ('monitoreo', 'fitosanitario', 'monitoreo', 0),
    ('evaluacion_instrumental', 'tomografia_sonica', 'instrumental', 0)
  ) AS casos(tipo, subtipo, nombre, cantidad)
  LOOP
    v_actual := (pg_temp.preparar_inspeccion(v_project_id, v_tree_id, v_sector_id, v_inspector, v_municipal,
      v_caso.tipo, v_caso.subtipo, v_caso.nombre)->>'insp_id')::uuid;
    INSERT INTO public.photos (tree_id, inspection_id, storage_path, vista, sha256, uploaded_by)
      SELECT v_tree_id, v_actual, v_caso.nombre || '/' || n || '.jpg', NULL, NULL, v_inspector
      FROM generate_series(1, v_caso.cantidad) AS n;

    IF v_caso.nombre = 'una' THEN
      UPDATE public.photos SET sha256 = repeat('a', 64) WHERE inspection_id = v_actual;
      INSERT INTO public.photos (tree_id, inspection_id, storage_path, vista, uploaded_by)
        VALUES (v_tree_id, v_actual, 'una/1.jpg', 'base', v_inspector),
               (v_tree_id, v_actual, '   ', 'tronco', v_inspector);
      BEGIN
        INSERT INTO public.photos (tree_id, inspection_id, storage_path, sha256, uploaded_by)
          VALUES (v_tree_id, v_actual, 'repetida.jpg', repeat('a', 64), v_inspector);
        RAISE EXCEPTION 'El índice 039 debió rechazar la huella repetida';
      EXCEPTION WHEN unique_violation THEN NULL;
      END;
    END IF;

    IF v_caso.nombre IN ('cero','una') THEN
      PERFORM pg_temp.esperar_error(v_actual, v_inspector, 'Fotografías válidas: ' || v_caso.cantidad);
      PERFORM pg_temp.assert(
        (SELECT estado_registro = 'preguardado' FROM public.inspections WHERE id = v_actual),
        'un rechazo debe conservar el borrador'
      );
    ELSE
      IF v_caso.nombre = 'dos' THEN
        BEGIN
          PERFORM public.fn_finalizar_inspeccion(v_actual, v_inspector, '{}'::jsonb, '[]'::jsonb,
            NULL, NULL, NULL, NULL, NULL);
          RAISE EXCEPTION 'Las fechas técnicas obligatorias deben bloquear el cierre';
        EXCEPTION WHEN SQLSTATE 'SV064' THEN
          IF strpos(SQLERRM, 'D-202, D-203') = 0 THEN RAISE; END IF;
        END;
      END IF;
      PERFORM pg_temp.finalizar(v_actual, v_inspector);
      PERFORM pg_temp.assert(
        (SELECT estado_registro = 'finalizado' FROM public.inspections WHERE id = v_actual),
        v_caso.nombre || ': cierre esperado'
      );
    END IF;
    RAISE NOTICE '040: caso % correcto', v_caso.nombre;
  END LOOP;
END;
$$;

ROLLBACK;
