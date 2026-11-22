  DECLARE
    origen uuid;
    destino uuid;
    otra_inspeccion uuid;
    otro_arbol uuid;
    foto uuid;
    ajena uuid;
    datos_previos jsonb;
    resultado jsonb;
  BEGIN
    origen := (pg_temp.preparar_inspeccion(v_project_id, v_tree_id, v_sector_id, v_inspector,
      v_municipal, 'evaluacion_instrumental', 'resistografia', 'origen045')->>'insp_id')::uuid;
    destino := (pg_temp.preparar_inspeccion(v_project_id, v_tree_id, v_sector_id, v_inspector,
      v_municipal, 'reevaluacion', NULL, 'destino045')->>'insp_id')::uuid;
    otro_arbol := (public.fn_create_tree_alta(v_project_id, v_sector_id, 'Barrio Puerto',
      'Segundo árbol 045', 256101, 6341101, 'Quillaja saponaria', 'Quillay', CURRENT_DATE, v_municipal)->>'id')::uuid;
    otra_inspeccion := (pg_temp.preparar_inspeccion(v_project_id, otro_arbol, v_sector_id, v_inspector,
      v_municipal, 'levantamiento', NULL, 'otro-arbol045')->>'insp_id')::uuid;
    INSERT INTO public.photos(tree_id, inspection_id, storage_path, vista, sha256, uploaded_by)
      VALUES(v_tree_id, origen, '045/base.jpg', 'base', repeat('c',64), v_inspector)
      RETURNING id, to_jsonb(photos)-'inspection_id' INTO foto, datos_previos;
    INSERT INTO public.photos(tree_id, inspection_id, storage_path, vista, uploaded_by)
      VALUES(otro_arbol, otra_inspeccion, '045/ajena.jpg', 'base', v_inspector)
      RETURNING id INTO ajena;

    PERFORM set_config('request.jwt.claim.sub', v_inspector::text, true);
    BEGIN
      PERFORM public.fn_traspasar_fotos_regularizacion(origen, destino, ARRAY[foto]);
      RAISE EXCEPTION 'Se esperaba rechazo del rol Inspector';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    PERFORM set_config('request.jwt.claim.sub', v_municipal::text, true);
    BEGIN
      PERFORM public.fn_traspasar_fotos_regularizacion(origen, destino, ARRAY[foto]);
      RAISE EXCEPTION 'Se esperaba rechazo de preguardada sin autorización';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
    PERFORM pg_temp.finalizar(origen, v_inspector);
    PERFORM public.fn_anular_inspeccion(origen, v_municipal, 'Ensayo 045', NULL);
    BEGIN
      PERFORM public.fn_traspasar_fotos_regularizacion(origen, otra_inspeccion, ARRAY[foto]);
      RAISE EXCEPTION 'Se esperaba rechazo de otro árbol';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
    BEGIN
      PERFORM public.fn_traspasar_fotos_regularizacion(origen, destino, ARRAY[foto, ajena]);
      RAISE EXCEPTION 'Se esperaba rechazo de foto ajena';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
    PERFORM pg_temp.assert((SELECT inspection_id=origen FROM public.photos WHERE id=foto), 'fallos atómicos');
    resultado := public.fn_traspasar_fotos_regularizacion(origen, destino, ARRAY[foto]);
    PERFORM pg_temp.assert((SELECT inspection_id=destino AND to_jsonb(p)-'inspection_id'=datos_previos
      FROM public.photos p WHERE id=foto), 'conserva atributos originales');
    PERFORM pg_temp.assert(EXISTS(SELECT FROM public.audit_log a WHERE a.id=(resultado->>'audit_id')::uuid
      AND a.changed_by=v_municipal AND a.entity_id=origen AND a.valor_nuevo->>'inspection_id'=destino::text),
      'auditoría del traspaso');
    INSERT INTO public.photos(tree_id, inspection_id, storage_path, vista, uploaded_by)
      VALUES(v_tree_id, destino, '045/dos.jpg', 'copa', v_inspector);
    PERFORM pg_temp.finalizar(destino, v_inspector);
    BEGIN
      PERFORM public.fn_traspasar_fotos_regularizacion(origen, destino, ARRAY[foto]);
      RAISE EXCEPTION 'Se esperaba rechazo de destino finalizado';
    EXCEPTION WHEN invalid_parameter_value THEN
      IF SQLERRM NOT LIKE 'El destino%' THEN RAISE; END IF;
    END;
    RAISE NOTICE '040: caso RPC 045 correcto';
  END;
