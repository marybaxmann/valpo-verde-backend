-- =====================================================================
-- Migración 018e — evaluations admite una fila en Preguardado (#58; CC-048)
-- =====================================================================
--
-- Vacío encontrado al planificar el #58: el diseño de la Fase 3 (§3.6,
-- §3.8, §3.9 y REGLAS_GENERALES "Historial y vigencia" — "Mientras una
-- inspección está Preguardado, el Inspector puede modificar todos sus
-- datos") exige que los datos de una inspección Preguardado se guarden
-- (D-209: Preguardado/Finalizado se calcula desde los datos ya
-- guardados), pero `evaluations` (migración 014) tenía `variables_calculo`,
-- `rule_version` y `motor_commit` como NOT NULL sin default — ninguno de
-- los tres existe hasta que el motor corre, lo que impedía crear la fila
-- de `evaluations` antes de finalizar. `calculados` y `calculado_at` ya
-- eran opcionales: el diseño sí previó una fila "antes del cálculo", pero
-- quedó inconsistente con esos tres NOT NULL. Decisión de la responsable
-- (CC-048, 2026-10-23): hacerlos opcionales, con un CHECK de coherencia
-- explícito en vez de dejar la inconsistencia.
--
-- `variables` sigue NOT NULL: es obligatorio desde el primer guardado
-- (es justamente lo que el Inspector ya registró).
--
-- `fn_save_inspection_draft` (#58): mismo patrón sin motor en medio que
-- `fn_create_tree_alta` (018d) — SECURITY DEFINER, una sola invocación
-- ya es atómica. El primer guardado (`p_inspection_id` NULL) crea
-- `inspections` (Preguardado) y `evaluations` (solo `variables`); cada
-- guardado siguiente actualiza esas mismas filas (nunca inserta una
-- nueva) mientras la inspección siga Preguardado — rechazada con SV058
-- si ya está Finalizada o Anulada. Los campos de ARBOLES que el
-- Inspector corrija en la inspección (PR-006 v11.0; D-7 a D-26) van a
-- `tree_data_versions` con el mismo `inspection_id` (upsert igual que
-- `evaluations`); si esta inspección no toca ningún campo de ARBOLES
-- (Evaluación instrumental, la mayoría de Monitoreo), no se crea fila
-- ahí — igual que ya hacía el diseño original.
--
-- CC-050 punto 3 (2026-10-23): el Inspector solo puede crear o guardar
-- una inspección (incluido el Preguardado) cuando la OT está En
-- ejecución — se rechaza con SV058 para cualquier otro `estado_ot`
-- (Pendiente, Programada, Completada o Cancelada), no solo Completada
-- o Cancelada como en la versión anterior de esta migración.
--
-- Validaciones agregadas tras la revisión de la responsable (2026-10-23,
-- todas con SV058): (a) solo el Inspector asignado actual
-- (`work_orders.responsable_accion_id`), activo y con rol Inspector,
-- puede crear o guardar — cubre la reasignación sin ningún paso
-- adicional: al cambiar el responsable, el anterior queda bloqueado de
-- inmediato porque ya no es el que figura en `responsable_accion_id`.
-- (b) la OT debe ser `tipo_ot = 'inspeccion'`; `tipo_inspeccion_realizada`
-- debe igualar `accion_solicitada` de la OT (D-196) y `subtipo_inspeccion`
-- debe pertenecer a ese tipo (D-197, mismos pares que el registro de
-- catálogos). (c) el árbol de la inspección debe ser el de la OT, salvo
-- Levantamiento. (d) si un guardado ya no trae campos de ARBOLES, se
-- borra la fila de `tree_data_versions` de esa inspección (el estado
-- del borrador es siempre el del guardado más reciente).
--
-- El motor, `variables_calculo` y `calculado_at` son del #59/#72, al
-- finalizar — esta función nunca los toca.

-- ---------------------------------------------------------------------
-- 1. evaluations: variables_calculo / rule_version / motor_commit opcionales
-- ---------------------------------------------------------------------

ALTER TABLE public.evaluations ALTER COLUMN variables_calculo DROP NOT NULL;
ALTER TABLE public.evaluations ALTER COLUMN rule_version DROP NOT NULL;
ALTER TABLE public.evaluations ALTER COLUMN motor_commit DROP NOT NULL;

-- Coherencia: sin calculado_at, ninguna columna de resultado tiene
-- valor (la fila es un borrador Preguardado); con calculado_at, las
-- tres columnas que el motor siempre produce son obligatorias. Nunca
-- un estado a medias (p. ej. motor_commit sin rule_version).
ALTER TABLE public.evaluations ADD CONSTRAINT chk_evaluations_calculado_coherente CHECK (
  (
    calculado_at IS NULL
    AND variables_calculo IS NULL
    AND rule_version IS NULL
    AND motor_commit IS NULL
    AND calculados IS NULL
    AND indicadores IS NULL
    AND puntaje_raices_cuello IS NULL
    AND probabilidad_falla_raices_cuello IS NULL
    AND puntaje_tronco IS NULL
    AND probabilidad_falla_tronco IS NULL
    AND puntaje_copa_ramas IS NULL
    AND probabilidad_falla_copa_ramas IS NULL
    AND probabilidad_impacto IS NULL
    AND clasificacion_raices_cuello IS NULL
    AND clasificacion_tronco IS NULL
    AND clasificacion_copa_ramas IS NULL
    AND clasificacion_riesgo_calculada IS NULL
    AND puntaje_infraestructura IS NULL
    AND pct_infraestructura IS NULL
    AND clasificacion_infraestructura_calculada IS NULL
    AND clasificacion_prioridad_calculada IS NULL
    AND clasificacion_riesgo_ajustada IS NULL
    AND clasificacion_infraestructura_ajustada IS NULL
    AND clasificacion_prioridad_ajustada IS NULL
  )
  OR
  (
    calculado_at IS NOT NULL
    AND variables_calculo IS NOT NULL
    AND rule_version IS NOT NULL
    AND motor_commit IS NOT NULL
  )
);

-- ---------------------------------------------------------------------
-- 2. fn_save_inspection_draft — crear/actualizar el borrador (#58)
-- ---------------------------------------------------------------------

-- Subconjunto insertable de tree_data_versions que el Inspector puede
-- corregir desde una inspección (sin id/tree_id/inspection_id/
-- created_by/created_at, que resuelve la función, y sin
-- diametro_copa_m, que es GENERATED). jsonb_populate_record hace el
-- cast de cada campo, incluido el arreglo dap_fustes_cm.
CREATE TYPE public.tree_data_versions_arbol_input AS (
  sector                             text,
  ubicacion_descriptiva              text,
  utm_este                           numeric(10,2),
  utm_norte                          numeric(10,2),
  especie_cientifica                 text,
  nombre_comun                       text,
  multifustal                        boolean,
  numero_fustes                      integer,
  dap_fustes_cm                      numeric(6,2)[],
  dap_cm                             numeric(6,2),
  altura_total_m                     numeric(6,2),
  diametro_copa_ns_m                 numeric(6,2),
  diametro_copa_eo_m                 numeric(6,2),
  copa_no_presenta                   boolean,
  altura_primera_rama_m              numeric(6,2),
  altura_primera_rama_no_presenta    boolean,
  altura_base_copa_viva_m            numeric(6,2),
  altura_base_copa_viva_no_presenta  boolean,
  clase_edad                         text,
  rango_edad_estimada_anios          text
);

CREATE FUNCTION public.fn_save_inspection_draft(
  p_inspection_id uuid,                  -- NULL en el primer guardado
  p_work_order_id uuid,                  -- obligatorio en el primer guardado
  p_tree_id uuid,
  p_inspector uuid,
  p_fecha_inspeccion date,
  p_fecha_registro date,                 -- hoyEnChile(), nunca CURRENT_DATE
  p_rule_version text,                   -- versión del paquete vigente al registrar (D-209 L; no es motor_commit)
  p_tipo_inspeccion_realizada text,
  p_subtipo_inspeccion text,
  p_metodo_instrumental text,
  p_resultado_general text,
  p_requiere_mantenimiento boolean,
  p_observaciones text,
  p_registrado_por uuid,
  p_variables jsonb,                     -- REGISTRO_EVALUACION; estado completo del borrador, no un delta
  p_campos_arbol jsonb,                  -- subconjunto de tree_data_versions_arbol_input; estado completo del borrador
  p_campos_registrados_arbol text[]      -- qué columnas de p_campos_arbol trae este guardado; NULL o '{}' si esta inspección no registra datos del árbol
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
  v_rol text;
  v_activo boolean;
  v_subtipo_valido boolean;
  v_arbol public.tree_data_versions_arbol_input;
  v_evaluation_id uuid;
  v_tree_data_version_id uuid;
BEGIN
  -- La orden de trabajo debe existir, ser de tipo Inspección y estar En
  -- ejecución en cada guardado (CC-050 punto 3), no solo en el primero.
  SELECT estado_ot, tipo_ot, accion_solicitada, responsable_accion_id, tree_id
  INTO v_estado_ot, v_tipo_ot, v_accion_solicitada, v_responsable_accion_id, v_ot_tree_id
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

  -- Solo el Inspector asignado (responsable_accion_id actual, D-244)
  -- puede crear o guardar la inspección. Cubre la reasignación: al
  -- cambiar el responsable, el anterior queda bloqueado de inmediato,
  -- sin ningún paso adicional.
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

  -- tipo_inspeccion_realizada debe corresponder a la Accion_solicitada
  -- de la OT (D-196); el subtipo debe pertenecer al tipo (D-197) — los
  -- mismos pares tipo/subtipo del registro de catálogos (PR-021,
  -- catalogs.ts), repetidos aquí porque esta función es la única
  -- puerta de escritura real.
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

  -- El árbol de la inspección debe ser el de la OT — salvo Levantamiento
  -- (OT.tree_id es NULL hasta que la inspección registra o reutiliza el
  -- árbol; mismo criterio que trg_inspections_tree_coherente, 014).
  IF v_ot_tree_id IS NOT NULL AND v_ot_tree_id <> p_tree_id THEN
    RAISE EXCEPTION 'El árbol de la inspección (%) no coincide con el árbol de la orden de trabajo (%)', p_tree_id, v_ot_tree_id
      USING ERRCODE = 'SV058';
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
    -- Este guardado ya no trae campos de ARBOLES: si un guardado
    -- anterior había dejado una fila, se borra (el estado del borrador
    -- es siempre el que trae el guardado más reciente, nunca una
    -- mezcla con uno anterior).
    DELETE FROM public.tree_data_versions WHERE inspection_id = v_inspection_id;
  END IF;

  RETURN jsonb_build_object(
    'inspection_id', v_inspection_id,
    'evaluation_id', v_evaluation_id,
    'tree_data_version_id', v_tree_data_version_id,
    'estado_registro', 'preguardado'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_save_inspection_draft(
  uuid, uuid, uuid, uuid, date, date, text, text, text, text, text, boolean, text, uuid, jsonb, jsonb, text[]
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_save_inspection_draft(
  uuid, uuid, uuid, uuid, date, date, text, text, text, text, text, boolean, text, uuid, jsonb, jsonb, text[]
) TO service_role;
