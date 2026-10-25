-- =====================================================================
-- Migración 018g — Transiciones Pendiente→Programada→En ejecución de una
-- OT de Inspección, por el responsable (#58; CC-050) — PROPUESTA
-- =====================================================================
--
-- PROPUESTA — NO APLICAR SIN APROBACIÓN DE LA RESPONSABLE.
--
-- CC-050 ya decidió el qué (2026-10-23): "Pendiente → Programada → En
-- ejecución: solo las hace el responsable asignado (`responsable_accion_id`):
-- el Inspector si Tipo_ot = Inspección... Al pasar a Programada, el
-- responsable ingresa fecha_accion_programada". Esa parte de la máquina
-- de estados quedó pendiente de un "issue por asignar"; la responsable
-- la incluyó ahora en el #58 porque sin ella no se puede probar el
-- flujo completo de `fn_save_inspection_draft` (exige la OT En ejecución).
--
-- Cancelación, reasignación, Completada y notificaciones (CC-050,
-- CC-051) siguen fuera de esta migración, en su propio bloque.
--
-- Mismo patrón que `fn_save_inspection_draft`/`fn_create_tree_alta`:
-- `SECURITY DEFINER`, `search_path` fijo, una sola invocación atómica,
-- `EXECUTE` solo para `service_role`. Solo OT de tipo Inspección por
-- ahora: CC-050 también cubre las transiciones de una OT de
-- Mantenimiento (las hace el Encargado de mantención, no el
-- Inspector), pero esas se implementan en el **#61**, con el mismo
-- criterio de CC-050 — no es parte de esta migración ni del #58
-- (corrección de la responsable, 2026-10-23: la versión anterior de
-- este comentario decía, equivocadamente, que Mantenimiento "sigue el
-- flujo del Excel sin cambios").
--
-- Nuevo SQLSTATE `SV059`, distinto de `SV058` (que ya usa
-- `fn_save_inspection_draft` para el borrador de una inspección): esta
-- función rechaza transiciones de la OT en sí, no guardados de una
-- inspección — mismo criterio de un código por función/alcance que ya
-- sigue el resto (SV046 proyecto/sector, SV057 alta, SV058 borrador,
-- SV265 superficies).
--
-- Transiciones permitidas, una a la vez, sin saltos (confirmado por la
-- responsable, 2026-10-23: "Pendiente → Programada → En ejecución,
-- una a la vez"):
--   - Pendiente -> Programada: exige fecha_accion_programada (D-241,
--     "quién lo ingresa" ya corregido por CC-050: el responsable, no
--     el Usuario municipal). Agregada además la validación de D-241
--     (corrección de la responsable, 2026-10-23): fecha_accion_programada
--     no puede ser anterior a `fecha_creacion_ot` (en hora de Chile —
--     `fecha_creacion_ot` ya es un DATE, sin componente horario que
--     convertir).
--   - Programada -> En ejecución: sin datos adicionales.

CREATE FUNCTION public.fn_transition_work_order_estado(
  p_work_order_id uuid,
  p_nuevo_estado text,                   -- 'programada' | 'en_ejecucion'
  p_fecha_accion_programada date,        -- obligatoria solo hacia 'programada'
  p_usuario uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_estado_ot text;
  v_tipo_ot text;
  v_responsable_accion_id uuid;
  v_fecha_creacion_ot date;
  v_rol text;
  v_activo boolean;
BEGIN
  SELECT estado_ot, tipo_ot, responsable_accion_id, fecha_creacion_ot
  INTO v_estado_ot, v_tipo_ot, v_responsable_accion_id, v_fecha_creacion_ot
  FROM public.work_orders WHERE id = p_work_order_id;

  IF v_estado_ot IS NULL THEN
    RAISE EXCEPTION 'La orden de trabajo % no existe', p_work_order_id USING ERRCODE = 'SV059';
  END IF;
  IF v_tipo_ot <> 'inspeccion' THEN
    RAISE EXCEPTION 'Esta función todavía no transiciona OT de Mantenimiento (CC-050: las hace el Encargado de mantención; se implementa en el #61)'
      USING ERRCODE = 'SV059';
  END IF;
  IF v_responsable_accion_id IS NULL OR v_responsable_accion_id <> p_usuario THEN
    RAISE EXCEPTION 'El usuario % no es el responsable asignado de la orden de trabajo % (responsable actual: %)',
      p_usuario, p_work_order_id, v_responsable_accion_id
      USING ERRCODE = 'SV059';
  END IF;

  SELECT r.nombre, up.activo INTO v_rol, v_activo
  FROM public.user_profiles up JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = p_usuario;

  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'El usuario % no existe', p_usuario USING ERRCODE = 'SV059';
  END IF;
  IF v_rol <> 'inspector' THEN
    RAISE EXCEPTION 'El usuario % no tiene el rol Inspector (rol actual: %)', p_usuario, v_rol USING ERRCODE = 'SV059';
  END IF;
  IF NOT v_activo THEN
    RAISE EXCEPTION 'El usuario % no está activo', p_usuario USING ERRCODE = 'SV059';
  END IF;

  IF v_estado_ot = 'pendiente' AND p_nuevo_estado = 'programada' THEN
    IF p_fecha_accion_programada IS NULL THEN
      RAISE EXCEPTION 'fecha_accion_programada es obligatoria al pasar a Programada (D-241, CC-050)' USING ERRCODE = 'SV059';
    END IF;
    IF p_fecha_accion_programada < v_fecha_creacion_ot THEN
      RAISE EXCEPTION 'fecha_accion_programada (%) no puede ser anterior a la fecha de creación de la orden de trabajo (%) (D-241)',
        p_fecha_accion_programada, v_fecha_creacion_ot
        USING ERRCODE = 'SV059';
    END IF;
    UPDATE public.work_orders
      SET estado_ot = 'programada', fecha_accion_programada = p_fecha_accion_programada
      WHERE id = p_work_order_id;
  ELSIF v_estado_ot = 'programada' AND p_nuevo_estado = 'en_ejecucion' THEN
    UPDATE public.work_orders SET estado_ot = 'en_ejecucion' WHERE id = p_work_order_id;
  ELSE
    RAISE EXCEPTION 'Transición % -> % no permitida (CC-050: solo Pendiente->Programada->En ejecución, una a la vez)',
      v_estado_ot, p_nuevo_estado
      USING ERRCODE = 'SV059';
  END IF;

  RETURN jsonb_build_object('work_order_id', p_work_order_id, 'estado_ot', p_nuevo_estado);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_transition_work_order_estado(uuid, text, date, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_transition_work_order_estado(uuid, text, date, uuid) TO service_role;
