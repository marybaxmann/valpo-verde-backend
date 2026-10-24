-- =====================================================================
-- Migración 018f — Árbol nuevo durante un Levantamiento: es un alta (#58; CC-052)
-- =====================================================================
--
-- PROPUESTA — NO APLICAR SIN APROBACIÓN DE LA RESPONSABLE.
--
-- Decisión de la responsable (CC-052, 2026-10-23): la creación de un
-- árbol nuevo por el Inspector durante una OT de Levantamiento (D-2;
-- REGLAS_GENERALES fila 17: "puede registrar árboles nuevos... sin un
-- alta municipal previa") es un alta, no un registro "solo identidad".
-- Dos razones técnicas, ambas de la responsable: (1) `trees` exige
-- especie o nombre común (`chk_trees_especie_o_comun`, 013) — no se
-- puede crear una fila sin esos datos; (2) sin una fila de alta en
-- `tree_data_versions` (`inspection_id IS NULL`), si la inspección de
-- Levantamiento se anula, `fn_refresh_tree_current` deja el árbol con
-- todos los campos en NULL — el mismo defecto de fondo que CC-048/018d
-- corrigió para el alta municipal del #57.
--
-- Esta migración modifica `fn_save_inspection_draft` (018e) agregando
-- seis parámetros nuevos, todos con DEFAULT NULL (no rompen ninguna
-- llamada existente por posición ni por nombre): los datos mínimos del
-- alta (D-7 a D-10, D-13/D-14). Cuando `p_tree_id` llega NULL:
--   - debe ser una OT de Levantamiento (si no, SV058: "solo Levantamiento
--     puede registrar un árbol nuevo");
--   - debe ser el PRIMER guardado (`p_inspection_id` también NULL) — a
--     partir del segundo guardado, el llamador ya tiene el `tree_id`
--     que devolvió el primero y debe enviarlo; si no lo envía, SV058
--     (evita crear un árbol nuevo en cada guardado posterior, que
--     duplicaría el árbol — la responsable no especificó este caso,
--     se agrega por necesidad técnica directa de su propio diseño: "en
--     el primer guardado se crea el árbol" implica que los siguientes
--     no vuelven a crearlo);
--   - los seis campos mínimos son obligatorios, mismo criterio y mismo
--     SQLSTATE (`SV057`) que `fn_create_tree_alta` (018d) — esta
--     función tampoco confía solo en el llamador;
--   - `sector_id` lo resuelve el servidor desde el proyecto de la OT
--     (`sectors.project_id` es UNIQUE: un proyecto, un sector — PR-006
--     v11.0, mismo criterio que `tree.service.ts`), nunca del body;
--   - crea `trees` y su fila de alta en `tree_data_versions`
--     (`inspection_id IS NULL`) en la misma transacción — mismo patrón
--     que `fn_create_tree_alta`; `trg_trees_dentro_sector` y
--     `trg_tree_data_versions_dentro_sector` (018c) validan el sector
--     igual que en cualquier alta (CC-046), sin código nuevo;
--   - el resto de la función continúa igual, usando el `tree_id` recién
--     creado — la rama D-193 existente (018e) se cumple trivialmente
--     porque el árbol nuevo ya es del proyecto de la OT.
--
-- Qué NO cambia: los datos técnicos de la inspección (ARBOLES más allá
-- del mínimo del alta, REGISTRO_EVALUACION) siguen rigiendo solo al
-- completar la OT (REGLAS_GENERALES fila 17: "las modificaciones
-- posteriores al alta se hacen vigentes al completar la OT") — ya es
-- el comportamiento de `fn_refresh_tree_current` para cualquier árbol,
-- sin cambios aquí.
--
-- Qué queda fuera de esta migración (decisión de la responsable, no
-- metodológica): la búsqueda de árboles cercanos para evitar
-- duplicados (`ST_DWithin`) es un endpoint de lectura aparte, que el
-- Inspector consulta ANTES de decidir "crear árbol nuevo" — no es
-- parte de esta función ni de esta migración. Pendiente de diseño de
-- UX en la Fase 7 (radio de búsqueda, pantalla).
--
-- Dado que se agregan parámetros, Postgres identifica la función por
-- su firma completa: hay que DROP la función de 17 parámetros (018e)
-- antes de CREATE la de 23 — si no, quedarían dos sobrecargas y la de
-- 17 (sin esta validación) seguiría invocable.

DROP FUNCTION IF EXISTS public.fn_save_inspection_draft(
  uuid, uuid, uuid, uuid, date, date, text, text, text, text, text, boolean, text, uuid, jsonb, jsonb, text[]
);

CREATE FUNCTION public.fn_save_inspection_draft(
  p_inspection_id uuid,
  p_work_order_id uuid,
  p_tree_id uuid,                        -- NULL en Levantamiento, solo en el primer guardado (CC-052)
  p_inspector uuid,
  p_fecha_inspeccion date,
  p_fecha_registro date,
  p_rule_version text,
  p_tipo_inspeccion_realizada text,
  p_subtipo_inspeccion text,
  p_metodo_instrumental text,
  p_resultado_general text,
  p_requiere_mantenimiento boolean,
  p_observaciones text,
  p_registrado_por uuid,
  p_variables jsonb,
  p_campos_arbol jsonb,
  p_campos_registrados_arbol text[],
  p_nuevo_arbol_sector text DEFAULT NULL,                   -- D-7, solo si p_tree_id es NULL
  p_nuevo_arbol_ubicacion_descriptiva text DEFAULT NULL,    -- D-8
  p_nuevo_arbol_utm_este numeric DEFAULT NULL,              -- D-9
  p_nuevo_arbol_utm_norte numeric DEFAULT NULL,             -- D-10
  p_nuevo_arbol_especie_cientifica text DEFAULT NULL,       -- D-13 (al menos uno de los dos)
  p_nuevo_arbol_nombre_comun text DEFAULT NULL              -- D-14
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inspection_id uuid := p_inspection_id;
  v_estado_registro text;
  v_estado_ot text;
  v_tipo_ot text;
  v_accion_solicitada text;
  v_responsable_accion_id uuid;
  v_ot_tree_id uuid;
  v_wo_project_id uuid;
  v_tree_project_id uuid;
  v_sector_id uuid;
  v_campos_alta text[];
  v_arbol_nuevo boolean := false;
  v_rol text;
  v_activo boolean;
  v_subtipo_valido boolean;
  v_arbol public.tree_data_versions_arbol_input;
  v_evaluation_id uuid;
  v_tree_data_version_id uuid;
BEGIN
  SELECT estado_ot, tipo_ot, accion_solicitada, responsable_accion_id, tree_id, project_id
  INTO v_estado_ot, v_tipo_ot, v_accion_solicitada, v_responsable_accion_id, v_ot_tree_id, v_wo_project_id
  FROM public.work_orders WHERE id = p_work_order_id;

  IF v_estado_ot IS NULL THEN
    RAISE EXCEPTION 'La orden de trabajo % no existe', p_work_order_id USING ERRCODE = 'SV058';
  END IF;
  IF v_tipo_ot <> 'inspeccion' THEN
    RAISE EXCEPTION 'La orden de trabajo % no es de tipo Inspección (tipo_ot: %)', p_work_order_id, v_tipo_ot
      USING ERRCODE = 'SV058';
  END IF;
  IF v_estado_ot <> 'en_ejecucion' THEN
    RAISE EXCEPTION 'La orden de trabajo % no está en ejecución (estado: %); no se puede crear ni guardar una inspección', p_work_order_id, v_estado_ot
      USING ERRCODE = 'SV058';
  END IF;

  IF v_responsable_accion_id IS NULL OR v_responsable_accion_id <> p_registrado_por THEN
    RAISE EXCEPTION 'El usuario % no es el responsable asignado de la orden de trabajo % (responsable actual: %)',
      p_registrado_por, p_work_order_id, v_responsable_accion_id
      USING ERRCODE = 'SV058';
  END IF;

  SELECT r.nombre, up.activo INTO v_rol, v_activo
  FROM public.user_profiles up JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = p_registrado_por;

  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'El usuario % no existe', p_registrado_por USING ERRCODE = 'SV058';
  END IF;
  IF v_rol <> 'inspector' THEN
    RAISE EXCEPTION 'El usuario % no tiene el rol Inspector (rol actual: %)', p_registrado_por, v_rol USING ERRCODE = 'SV058';
  END IF;
  IF NOT v_activo THEN
    RAISE EXCEPTION 'El usuario % no está activo (D-195, D-244)', p_registrado_por USING ERRCODE = 'SV058';
  END IF;

  IF p_tipo_inspeccion_realizada <> v_accion_solicitada THEN
    RAISE EXCEPTION 'tipo_inspeccion_realizada (%) no corresponde a la acción solicitada de la orden de trabajo (%)',
      p_tipo_inspeccion_realizada, v_accion_solicitada
      USING ERRCODE = 'SV058';
  END IF;

  v_subtipo_valido := CASE p_tipo_inspeccion_realizada
    WHEN 'evaluacion_inicial' THEN p_subtipo_inspeccion IS NULL
    WHEN 'levantamiento'      THEN p_subtipo_inspeccion IS NULL
    WHEN 'reevaluacion'       THEN p_subtipo_inspeccion IS NULL OR p_subtipo_inspeccion IN ('seguimiento', 'post_intervencion')
    WHEN 'evaluacion_instrumental' THEN p_subtipo_inspeccion IS NULL OR p_subtipo_inspeccion IN ('tomografia_sonica', 'resistografia', 'otra_instrumental')
    WHEN 'monitoreo'          THEN p_subtipo_inspeccion IN ('fitosanitario', 'estructural', 'vitalidad')
    ELSE false
  END;
  IF NOT v_subtipo_valido THEN
    RAISE EXCEPTION 'subtipo_inspeccion (%) no es válido para tipo_inspeccion_realizada (%)',
      p_subtipo_inspeccion, p_tipo_inspeccion_realizada
      USING ERRCODE = 'SV058';
  END IF;

  -- ---------------------------------------------------------------
  -- Árbol nuevo durante un Levantamiento (CC-052): es un alta. Solo
  -- en el primer guardado (p_inspection_id NULL); a partir del
  -- segundo, el llamador ya recibió tree_id en la respuesta y debe
  -- enviarlo — si no, es un error del llamador, no un segundo árbol.
  -- ---------------------------------------------------------------
  IF p_tree_id IS NULL THEN
    IF v_accion_solicitada <> 'levantamiento' THEN
      RAISE EXCEPTION 'Solo una orden de trabajo de Levantamiento puede registrar un árbol nuevo (CC-052)'
        USING ERRCODE = 'SV058';
    END IF;
    IF v_inspection_id IS NOT NULL THEN
      RAISE EXCEPTION 'tree_id es obligatorio a partir del segundo guardado (ya se creó el árbol en el primero, CC-052)'
        USING ERRCODE = 'SV058';
    END IF;

    IF p_nuevo_arbol_sector IS NULL OR btrim(p_nuevo_arbol_sector) = '' THEN
      RAISE EXCEPTION 'sector es obligatorio para el alta del árbol nuevo (D-7)' USING ERRCODE = 'SV057';
    END IF;
    IF p_nuevo_arbol_ubicacion_descriptiva IS NULL OR btrim(p_nuevo_arbol_ubicacion_descriptiva) = '' THEN
      RAISE EXCEPTION 'ubicacion_descriptiva es obligatoria para el alta del árbol nuevo (D-8)' USING ERRCODE = 'SV057';
    END IF;
    IF p_nuevo_arbol_utm_este IS NULL THEN
      RAISE EXCEPTION 'utm_este es obligatorio para el alta del árbol nuevo (D-9)' USING ERRCODE = 'SV057';
    END IF;
    IF p_nuevo_arbol_utm_norte IS NULL THEN
      RAISE EXCEPTION 'utm_norte es obligatorio para el alta del árbol nuevo (D-10)' USING ERRCODE = 'SV057';
    END IF;
    IF p_nuevo_arbol_especie_cientifica IS NULL AND p_nuevo_arbol_nombre_comun IS NULL THEN
      RAISE EXCEPTION 'especie_cientifica o nombre_comun es obligatorio para el alta del árbol nuevo (D-13/D-14)'
        USING ERRCODE = 'SV057';
    END IF;

    SELECT id INTO v_sector_id FROM public.sectors WHERE project_id = v_wo_project_id;
    IF v_sector_id IS NULL THEN
      RAISE EXCEPTION 'El proyecto % no tiene un sector delimitado', v_wo_project_id USING ERRCODE = 'SV057';
    END IF;

    INSERT INTO public.trees (
      project_id, sector_id, sector, ubicacion_descriptiva,
      utm_este, utm_norte, especie_cientifica, nombre_comun,
      fecha_registro, registrado_por
    ) VALUES (
      v_wo_project_id, v_sector_id, p_nuevo_arbol_sector, p_nuevo_arbol_ubicacion_descriptiva,
      p_nuevo_arbol_utm_este, p_nuevo_arbol_utm_norte, p_nuevo_arbol_especie_cientifica, p_nuevo_arbol_nombre_comun,
      p_fecha_registro, p_registrado_por
    )
    RETURNING id INTO p_tree_id;

    v_campos_alta := ARRAY['sector', 'ubicacion_descriptiva', 'utm_este', 'utm_norte'];
    IF p_nuevo_arbol_especie_cientifica IS NOT NULL THEN
      v_campos_alta := array_append(v_campos_alta, 'especie_cientifica');
    END IF;
    IF p_nuevo_arbol_nombre_comun IS NOT NULL THEN
      v_campos_alta := array_append(v_campos_alta, 'nombre_comun');
    END IF;

    INSERT INTO public.tree_data_versions (
      tree_id, inspection_id, campos_registrados,
      sector, ubicacion_descriptiva, utm_este, utm_norte,
      especie_cientifica, nombre_comun, created_by
    ) VALUES (
      p_tree_id, NULL, v_campos_alta,
      p_nuevo_arbol_sector, p_nuevo_arbol_ubicacion_descriptiva, p_nuevo_arbol_utm_este, p_nuevo_arbol_utm_norte,
      p_nuevo_arbol_especie_cientifica, p_nuevo_arbol_nombre_comun, p_registrado_por
    );

    v_arbol_nuevo := true;
  END IF;

  IF v_ot_tree_id IS NOT NULL THEN
    IF v_ot_tree_id <> p_tree_id THEN
      RAISE EXCEPTION 'El árbol de la inspección (%) no coincide con el árbol de la orden de trabajo (%)', p_tree_id, v_ot_tree_id
        USING ERRCODE = 'SV058';
    END IF;
  ELSE
    SELECT project_id INTO v_tree_project_id FROM public.trees WHERE id = p_tree_id;
    IF v_tree_project_id IS NULL THEN
      RAISE EXCEPTION 'El árbol % no existe', p_tree_id USING ERRCODE = 'SV058';
    END IF;
    IF v_tree_project_id <> v_wo_project_id THEN
      RAISE EXCEPTION 'El árbol % no pertenece al proyecto de la orden de trabajo de Levantamiento (D-193)', p_tree_id
        USING ERRCODE = 'SV058';
    END IF;
  END IF;

  IF v_inspection_id IS NULL THEN
    INSERT INTO public.inspections (
      work_order_id, tree_id, inspector, fecha_inspeccion, fecha_registro,
      rule_version, tipo_inspeccion_realizada, subtipo_inspeccion,
      metodo_instrumental, resultado_general, requiere_mantenimiento,
      observaciones, registrado_por
    ) VALUES (
      p_work_order_id, p_tree_id, p_inspector, p_fecha_inspeccion, p_fecha_registro,
      p_rule_version, p_tipo_inspeccion_realizada, p_subtipo_inspeccion,
      p_metodo_instrumental, p_resultado_general, p_requiere_mantenimiento,
      p_observaciones, p_registrado_por
    )
    RETURNING id INTO v_inspection_id;
  ELSE
    SELECT estado_registro INTO v_estado_registro
    FROM public.inspections WHERE id = v_inspection_id;

    IF v_estado_registro IS NULL THEN
      RAISE EXCEPTION 'La inspección % no existe' , v_inspection_id USING ERRCODE = 'SV058';
    END IF;
    IF v_estado_registro <> 'preguardado' THEN
      RAISE EXCEPTION 'La inspección % ya no está en preguardado (estado: %); no se puede modificar', v_inspection_id, v_estado_registro
        USING ERRCODE = 'SV058';
    END IF;

    UPDATE public.inspections SET
      tipo_inspeccion_realizada = p_tipo_inspeccion_realizada,
      subtipo_inspeccion = p_subtipo_inspeccion,
      metodo_instrumental = p_metodo_instrumental,
      resultado_general = p_resultado_general,
      requiere_mantenimiento = p_requiere_mantenimiento,
      observaciones = p_observaciones
    WHERE id = v_inspection_id;
  END IF;

  INSERT INTO public.evaluations (inspection_id, tree_id, variables)
  VALUES (v_inspection_id, p_tree_id, p_variables)
  ON CONFLICT (inspection_id) DO UPDATE SET
    variables = EXCLUDED.variables,
    updated_at = now()
  RETURNING id INTO v_evaluation_id;

  IF p_campos_registrados_arbol IS NOT NULL AND array_length(p_campos_registrados_arbol, 1) > 0 THEN
    v_arbol := jsonb_populate_record(null::public.tree_data_versions_arbol_input, p_campos_arbol);

    INSERT INTO public.tree_data_versions (
      tree_id, inspection_id, campos_registrados,
      sector, ubicacion_descriptiva, utm_este, utm_norte,
      especie_cientifica, nombre_comun, multifustal, numero_fustes,
      dap_fustes_cm, dap_cm, altura_total_m, diametro_copa_ns_m, diametro_copa_eo_m,
      copa_no_presenta, altura_primera_rama_m, altura_primera_rama_no_presenta,
      altura_base_copa_viva_m, altura_base_copa_viva_no_presenta,
      clase_edad, rango_edad_estimada_anios, created_by
    ) VALUES (
      p_tree_id, v_inspection_id, p_campos_registrados_arbol,
      v_arbol.sector, v_arbol.ubicacion_descriptiva, v_arbol.utm_este, v_arbol.utm_norte,
      v_arbol.especie_cientifica, v_arbol.nombre_comun, v_arbol.multifustal, v_arbol.numero_fustes,
      v_arbol.dap_fustes_cm, v_arbol.dap_cm, v_arbol.altura_total_m, v_arbol.diametro_copa_ns_m, v_arbol.diametro_copa_eo_m,
      v_arbol.copa_no_presenta, v_arbol.altura_primera_rama_m, v_arbol.altura_primera_rama_no_presenta,
      v_arbol.altura_base_copa_viva_m, v_arbol.altura_base_copa_viva_no_presenta,
      v_arbol.clase_edad, v_arbol.rango_edad_estimada_anios, p_registrado_por
    )
    ON CONFLICT (inspection_id) DO UPDATE SET
      campos_registrados = EXCLUDED.campos_registrados,
      sector = EXCLUDED.sector, ubicacion_descriptiva = EXCLUDED.ubicacion_descriptiva,
      utm_este = EXCLUDED.utm_este, utm_norte = EXCLUDED.utm_norte,
      especie_cientifica = EXCLUDED.especie_cientifica, nombre_comun = EXCLUDED.nombre_comun,
      multifustal = EXCLUDED.multifustal, numero_fustes = EXCLUDED.numero_fustes,
      dap_fustes_cm = EXCLUDED.dap_fustes_cm, dap_cm = EXCLUDED.dap_cm,
      altura_total_m = EXCLUDED.altura_total_m, diametro_copa_ns_m = EXCLUDED.diametro_copa_ns_m,
      diametro_copa_eo_m = EXCLUDED.diametro_copa_eo_m, copa_no_presenta = EXCLUDED.copa_no_presenta,
      altura_primera_rama_m = EXCLUDED.altura_primera_rama_m,
      altura_primera_rama_no_presenta = EXCLUDED.altura_primera_rama_no_presenta,
      altura_base_copa_viva_m = EXCLUDED.altura_base_copa_viva_m,
      altura_base_copa_viva_no_presenta = EXCLUDED.altura_base_copa_viva_no_presenta,
      clase_edad = EXCLUDED.clase_edad, rango_edad_estimada_anios = EXCLUDED.rango_edad_estimada_anios
    RETURNING id INTO v_tree_data_version_id;
  ELSE
    DELETE FROM public.tree_data_versions WHERE inspection_id = v_inspection_id;
  END IF;

  RETURN jsonb_build_object(
    'inspection_id', v_inspection_id,
    'evaluation_id', v_evaluation_id,
    'tree_data_version_id', v_tree_data_version_id,
    'tree_id', p_tree_id,
    'arbol_nuevo', v_arbol_nuevo,
    'estado_registro', 'preguardado'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_save_inspection_draft(
  uuid, uuid, uuid, uuid, date, date, text, text, text, text, text, boolean, text, uuid, jsonb, jsonb, text[],
  text, text, numeric, numeric, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_save_inspection_draft(
  uuid, uuid, uuid, uuid, date, date, text, text, text, text, text, boolean, text, uuid, jsonb, jsonb, text[],
  text, text, numeric, numeric, text, text
) TO service_role;
