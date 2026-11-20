-- =====================================================================
-- 042 — Borrado de incidencias por el Usuario municipal, con registro
-- (CC-079; PR-022 v4.0). Decisión de la responsable (2026-11-19):
-- borrado real (incidencia, fotos, datos del reportante y OT vinculadas)
-- que deja una línea de trazabilidad.
--
-- Límite de seguridad: no se borra una incidencia si alguna OT vinculada
-- ya tiene trabajo técnico (inspección, mantención o evaluación del
-- árbol): ese trabajo puede haber cambiado los datos vigentes del árbol
-- y su historial no se pierde.
--
-- El registro no guarda datos personales (ni nombre, RUT ni descripción
-- del reportante): solo códigos, estado, quién borró, cuándo y por qué.
-- =====================================================================
BEGIN;

-- ---------------------------------------------------------------------
-- 1. Registro de incidencias borradas (trazabilidad)
-- ---------------------------------------------------------------------
CREATE TABLE public.incident_deletions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  incident_id         UUID NOT NULL,              -- id de la incidencia borrada (ya no existe)
  codigo_incidencia   TEXT NOT NULL,
  tree_id             UUID NOT NULL REFERENCES public.trees(id) ON DELETE RESTRICT,
  tree_code           TEXT NOT NULL,              -- copia, para leer el registro sin cruzar tablas
  tipo_incidencia     TEXT,
  origen_reporte      TEXT,
  estado_incidencia   TEXT,
  resultado_revision  TEXT,
  fecha_reporte       DATE,
  ots_borradas        JSONB NOT NULL DEFAULT '[]'::jsonb
                        CHECK (jsonb_typeof(ots_borradas) = 'array'),  -- [{codigo_ot, tipo_ot, estado_ot}]
  fotos_borradas      INTEGER NOT NULL DEFAULT 0 CHECK (fotos_borradas >= 0),
  motivo              TEXT NOT NULL CHECK (char_length(btrim(motivo)) BETWEEN 3 AND 300),
  borrado_por         UUID NOT NULL REFERENCES public.user_profiles(id),
  borrado_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incident_deletions_project ON public.incident_deletions (project_id, borrado_at DESC);

-- RLS (ADR-014): lo leen el Administrador y los miembros del proyecto;
-- nadie escribe directo (solo fn_borrar_incidencia, con service_role).
ALTER TABLE public.incident_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY incident_deletions_select_admin_o_miembro
  ON public.incident_deletions FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_project_member(project_id));

REVOKE ALL ON public.incident_deletions FROM PUBLIC, anon;
GRANT SELECT ON public.incident_deletions TO authenticated;

-- ---------------------------------------------------------------------
-- 2. Función de borrado
-- ---------------------------------------------------------------------
CREATE FUNCTION public.fn_borrar_incidencia(
  p_incident_id UUID,
  p_usuario UUID,
  p_motivo TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inc public.incidents%ROWTYPE;
  v_rol TEXT;
  v_activo BOOLEAN;
  v_motivo TEXT := NULLIF(btrim(COALESCE(p_motivo, '')), '');
  v_tree_code TEXT;
  v_ots JSONB;
  v_rutas TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_usuario THEN
    RAISE EXCEPTION 'No está autorizado a ejecutar esta acción en nombre de otro usuario' USING ERRCODE = '42501';
  END IF;

  IF v_motivo IS NULL OR char_length(v_motivo) < 3 OR char_length(v_motivo) > 300 THEN
    RAISE EXCEPTION 'El motivo del borrado es obligatorio (entre 3 y 300 caracteres)' USING ERRCODE = 'SV082';
  END IF;

  SELECT * INTO v_inc FROM public.incidents WHERE id = p_incident_id FOR UPDATE;
  IF v_inc.id IS NULL THEN
    RAISE EXCEPTION 'La incidencia % no existe', p_incident_id USING ERRCODE = 'SV082';
  END IF;

  SELECT r.nombre, up.activo INTO v_rol, v_activo
  FROM public.user_profiles up JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = p_usuario;
  IF v_rol IS DISTINCT FROM 'usuario_municipal' THEN
    RAISE EXCEPTION 'Solo un Usuario municipal borra incidencias (rol actual: %)', v_rol USING ERRCODE = 'SV082';
  END IF;
  IF NOT v_activo THEN
    RAISE EXCEPTION 'El usuario % no está activo', p_usuario USING ERRCODE = 'SV082';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = v_inc.project_id AND user_id = p_usuario) THEN
    RAISE EXCEPTION 'El usuario % no es miembro del proyecto de la incidencia', p_usuario USING ERRCODE = 'SV082';
  END IF;

  -- OT vinculadas, bloqueadas para que nadie empiece trabajo mientras se borran.
  PERFORM 1 FROM public.work_orders WHERE incident_id = p_incident_id FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.incident_id = p_incident_id
      AND (EXISTS (SELECT 1 FROM public.inspections x WHERE x.work_order_id = w.id)
           OR EXISTS (SELECT 1 FROM public.maintenance_records m WHERE m.work_order_id = w.id)
           OR EXISTS (SELECT 1 FROM public.tree_assessments a WHERE a.work_order_id = w.id))
  ) THEN
    RAISE EXCEPTION 'No se puede borrar: una OT vinculada ya tiene inspección, mantención o evaluación registrada'
      USING ERRCODE = 'SV083';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('codigo_ot', w.codigo_ot, 'tipo_ot', w.tipo_ot, 'estado_ot', w.estado_ot)
                            ORDER BY w.codigo_ot), '[]'::jsonb)
  INTO v_ots
  FROM public.work_orders w WHERE w.incident_id = p_incident_id;

  SELECT t.tree_code INTO v_tree_code FROM public.trees t WHERE t.id = v_inc.tree_id;

  -- Fotos de la incidencia (los archivos los borra el backend con las rutas devueltas).
  WITH borradas AS (
    DELETE FROM public.photos WHERE incident_id = p_incident_id RETURNING storage_path
  )
  SELECT COALESCE(array_agg(storage_path), ARRAY[]::TEXT[]) INTO v_rutas FROM borradas;

  DELETE FROM public.work_orders WHERE incident_id = p_incident_id;
  -- incident_reporters se borra en cascada (nombre y RUT).
  DELETE FROM public.incidents WHERE id = p_incident_id;

  INSERT INTO public.incident_deletions (
    project_id, incident_id, codigo_incidencia, tree_id, tree_code, tipo_incidencia, origen_reporte,
    estado_incidencia, resultado_revision, fecha_reporte, ots_borradas, fotos_borradas, motivo, borrado_por
  ) VALUES (
    v_inc.project_id, v_inc.id, v_inc.codigo_incidencia, v_inc.tree_id, v_tree_code, v_inc.tipo_incidencia,
    v_inc.origen_reporte, v_inc.estado_incidencia, v_inc.resultado_revision, v_inc.fecha_reporte, v_ots,
    COALESCE(array_length(v_rutas, 1), 0), v_motivo, p_usuario
  );

  RETURN jsonb_build_object(
    'codigo_incidencia', v_inc.codigo_incidencia,
    'ots_borradas', v_ots,
    'fotos_borradas', to_jsonb(v_rutas)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_borrar_incidencia(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_borrar_incidencia(UUID, UUID, TEXT) TO service_role;

COMMIT;
