-- Reversión de la 031: quita las funciones de Mantenimiento y el Inspector
-- revisor, y devuelve v_tree_presence (016) y fn_transition_work_order_estado
-- (018h) a como estaban. Los registros de mantenimiento ya creados quedan;
-- estado_ciclo_vida no se deshace.
DROP FUNCTION IF EXISTS public.fn_revisar_mantenimiento(uuid, uuid, text, text, boolean, date, date);
DROP FUNCTION IF EXISTS public.fn_registrar_ejecucion_mantenimiento(uuid, uuid, date, text, text, text, text, boolean, date, jsonb, date);
DROP FUNCTION IF EXISTS public.fn_reassign_inspector_revisor(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.fn_create_work_order_mantenimiento(uuid, uuid, uuid, text, text, text, text, text, uuid, boolean, uuid, uuid, date);
DROP FUNCTION IF EXISTS public.fn_assert_miembro_con_rol(uuid, uuid, text, text, text);
DROP FUNCTION IF EXISTS public.fn_subtipos_mantenimiento(text);

CREATE OR REPLACE VIEW public.v_tree_presence WITH (security_invoker = true) AS
WITH cierre AS (
  SELECT
    wo.tree_id,
    wo.subtipo_accion,
    mr.fecha_revision,
    ROW_NUMBER() OVER (PARTITION BY wo.tree_id ORDER BY mr.fecha_revision DESC) AS rn
  FROM public.work_orders wo
  JOIN public.maintenance_records mr ON mr.work_order_id = wo.id
  WHERE wo.estado_ot = 'completada'
    AND wo.subtipo_accion IN ('tala', 'retiro_tocon')
    AND mr.estado_revision = 'aprobado'
)
SELECT
  t.id AS tree_id,
  CASE
    WHEN c.subtipo_accion = 'tala' THEN 'talado'
    WHEN c.subtipo_accion = 'retiro_tocon' THEN 'retirado'
    ELSE 'presente'
  END AS estado_presencia,
  COALESCE(c.fecha_revision::date, t.fecha_registro) AS fecha_cambio_estado_presencia
FROM public.trees t
LEFT JOIN cierre c ON c.tree_id = t.id AND c.rn = 1;

CREATE OR REPLACE FUNCTION public.fn_transition_work_order_estado(
  p_work_order_id uuid,
  p_nuevo_estado text,
  p_fecha_accion_programada date,
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

DROP INDEX IF EXISTS public.idx_work_orders_inspector_revisor;
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS chk_work_orders_inspector_revisor;
ALTER TABLE public.work_orders DROP COLUMN IF EXISTS inspector_revisor_id;
