BEGIN;

CREATE FUNCTION public.fn_traspasar_fotos_regularizacion(
  p_origen uuid,
  p_destino uuid,
  p_fotos uuid[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $func$
DECLARE
  usuario uuid := auth.uid();
  origen record;
  destino record;
  fila record;
  proyecto uuid;
  id_av text;
  cantidad integer;
  auditoria uuid;
BEGIN
  IF usuario IS NULL OR NOT EXISTS (
    SELECT FROM public.user_profiles u JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = usuario AND u.activo AND r.nombre = 'usuario_municipal'
  ) THEN
    RAISE EXCEPTION 'El traspaso requiere un Usuario municipal activo' USING ERRCODE = '42501';
  END IF;

  IF p_origen IS NULL OR p_destino IS NULL OR p_origen = p_destino
    OR COALESCE(cardinality(p_fotos), 0) NOT BETWEEN 1 AND 1000
    OR (SELECT count(DISTINCT x) FROM unnest(p_fotos) x) <> cardinality(p_fotos) THEN
    RAISE EXCEPTION 'Indique dos inspecciones distintas y una lista de fotos sin nulos ni duplicados' USING ERRCODE = '22023';
  END IF;

  -- Mantener bloqueadas ambas inspecciones y sus OT hasta que termine la auditoría.
  FOR fila IN
    SELECT i.id, i.codigo_inspeccion, i.tree_id, i.estado_registro, w.project_id,
           w.codigo_ot, w.estado_ot
    FROM public.inspections i JOIN public.work_orders w ON w.id = i.work_order_id
    WHERE i.id IN (p_origen, p_destino)
    ORDER BY i.id
    FOR UPDATE OF i, w
  LOOP
    IF fila.id = p_origen THEN origen := fila; ELSE destino := fila; END IF;
  END LOOP;
  IF origen IS NULL OR destino IS NULL OR origen.tree_id IS DISTINCT FROM destino.tree_id
    OR origen.project_id IS DISTINCT FROM destino.project_id THEN
    RAISE EXCEPTION 'Las dos inspecciones deben pertenecer al mismo árbol y proyecto' USING ERRCODE = '22023';
  END IF;

  SELECT t.project_id, t.legacy_id INTO proyecto, id_av FROM public.trees t WHERE t.id = origen.tree_id;
  IF proyecto IS DISTINCT FROM origen.project_id OR NOT EXISTS (
    SELECT FROM public.project_members m WHERE m.project_id = proyecto AND m.user_id = usuario
  ) THEN
    RAISE EXCEPTION 'El Usuario municipal debe ser miembro del proyecto del árbol' USING ERRCODE = '42501';
  END IF;

  IF destino.estado_registro IS DISTINCT FROM 'preguardado' OR destino.estado_ot IS DISTINCT FROM 'en_ejecucion' THEN
    RAISE EXCEPTION 'El destino debe estar Preguardado en una OT En ejecución' USING ERRCODE = '22023';
  END IF;
  IF (origen.estado_registro = 'anulado' OR (
    origen.estado_registro = 'preguardado' AND (
      origen.estado_ot = 'cancelada' OR (
        origen.estado_ot = 'en_ejecucion' AND
        (id_av, origen.codigo_inspeccion) IN (
          ('AV_000043', 'INS-000360'), ('AV_000089', 'INS-000366'), ('AV_000098', 'INS-000385')
        )
      )
    )
  )) IS NOT TRUE THEN
    RAISE EXCEPTION 'El origen debe estar Anulado o ser una preguardada autorizada' USING ERRCODE = '22023';
  END IF;

  PERFORM p.id FROM public.photos p WHERE p.id = ANY(p_fotos) ORDER BY p.id FOR UPDATE;
  SELECT count(*) INTO cantidad FROM public.photos p
  WHERE p.id = ANY(p_fotos) AND p.inspection_id = p_origen AND p.tree_id = origen.tree_id;
  IF cantidad <> cardinality(p_fotos) THEN
    RAISE EXCEPTION 'Al menos una foto no pertenece a la inspección de origen' USING ERRCODE = '22023';
  END IF;

  UPDATE public.photos p SET inspection_id = p_destino WHERE p.id = ANY(p_fotos);
  INSERT INTO public.audit_log (entity_type, entity_id, accion, valor_anterior, valor_nuevo, changed_by)
  VALUES ('inspection', p_origen, 'traspaso_evidencia_fotografica',
    jsonb_build_object('inspection_id', p_origen, 'fotos', p_fotos),
    jsonb_build_object('inspection_id', p_destino, 'fotos', p_fotos), usuario)
  RETURNING id INTO auditoria;

  RETURN jsonb_build_object('origen', p_origen, 'destino', p_destino, 'fotos', p_fotos, 'audit_id', auditoria);
END;
$func$;

REVOKE ALL ON FUNCTION public.fn_traspasar_fotos_regularizacion(uuid, uuid, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_traspasar_fotos_regularizacion(uuid, uuid, uuid[]) TO authenticated;

COMMIT;
