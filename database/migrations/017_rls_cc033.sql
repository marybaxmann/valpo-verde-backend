-- =====================================================================
-- Migración 017 — RLS por rol (CC-033), bloqueo de proyecto cerrado
-- (CC-042, RG fila 27) y cierre de vistas (security_invoker)
-- Diseño Fase 3 §5.2, §6, §7 paso 7. Issue #43.
--
-- Revisado y aprobado por la responsable (2026-10-21) con correcciones:
-- ver comentarios "RESP:" junto a cada punto corregido.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Funciones de apoyo nuevas
-- ---------------------------------------------------------------------

-- Generaliza is_municipal_member a cualquier conjunto de roles (§6).
CREATE FUNCTION public.has_project_role(p_project_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.get_user_role() = ANY(p_roles)
     AND public.is_project_member(p_project_id);
$$;
ALTER FUNCTION public.has_project_role(uuid, text[]) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.has_project_role(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_project_role(uuid, text[]) TO authenticated;

-- Resuelve el project_id de una fila (como jsonb) según cómo la tabla
-- protegida llega a él. Lo usa fn_check_proyecto_no_cerrado tanto para
-- OLD como para NEW (RESP punto 2).
CREATE FUNCTION public.fn_resolve_project_id(p_row jsonb, p_mode text)
RETURNS uuid
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result uuid;
BEGIN
  IF p_row IS NULL THEN
    RETURN NULL;
  END IF;
  CASE p_mode
    WHEN 'direct' THEN
      v_result := (p_row->>'project_id')::uuid;
    WHEN 'via_tree' THEN
      SELECT project_id INTO v_result FROM trees WHERE id = (p_row->>'tree_id')::uuid;
    WHEN 'via_evaluation' THEN
      SELECT t.project_id INTO v_result
        FROM evaluations e JOIN trees t ON t.id = e.tree_id
        WHERE e.id = (p_row->>'evaluation_id')::uuid;
    WHEN 'via_incident' THEN
      SELECT project_id INTO v_result FROM incidents WHERE id = (p_row->>'incident_id')::uuid;
  END CASE;
  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------
-- 1. Trigger de proyecto cerrado (RG fila 27; CC-042)
-- ---------------------------------------------------------------------
-- RESP punto 1: en DELETE, NEW es NULL; un BEFORE trigger que devuelve
-- NULL cancela la operación en silencio (bloquearía también el borrado
-- de incident_reporters hecho por fn_clear_incident_reporter, violando
-- PR-022). Se corrige: solo RAISE si el proyecto está cerrado; si no,
-- se retorna OLD en DELETE y NEW en el resto.
--
-- RESP punto 2: en UPDATE se revisa el proyecto de OLD y de NEW, para
-- que no se pueda sacar ni meter una fila en un proyecto cerrado
-- cambiando tree_id/project_id.
CREATE FUNCTION public.fn_check_proyecto_no_cerrado() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_mode text := TG_ARGV[0];
  v_project_old uuid;
  v_project_new uuid;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_project_old := public.fn_resolve_project_id(to_jsonb(OLD), v_mode);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_project_new := public.fn_resolve_project_id(to_jsonb(NEW), v_mode);
  END IF;

  IF v_project_old IS NOT NULL AND EXISTS (
    SELECT 1 FROM projects WHERE id = v_project_old AND estado_proyecto = 'cerrado'
  ) THEN
    RAISE EXCEPTION 'El proyecto % está cerrado: solo consulta (RG fila 27; CC-042)', v_project_old;
  END IF;

  IF v_project_new IS NOT NULL AND v_project_new IS DISTINCT FROM v_project_old AND EXISTS (
    SELECT 1 FROM projects WHERE id = v_project_new AND estado_proyecto = 'cerrado'
  ) THEN
    RAISE EXCEPTION 'El proyecto % está cerrado: solo consulta (RG fila 27; CC-042)', v_project_new;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trees_proyecto_cerrado
  BEFORE INSERT OR UPDATE OR DELETE ON trees
  FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('direct');

CREATE TRIGGER trg_sectors_proyecto_cerrado
  BEFORE INSERT OR UPDATE OR DELETE ON sectors
  FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('direct');

CREATE TRIGGER trg_work_orders_proyecto_cerrado
  BEFORE INSERT OR UPDATE OR DELETE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('direct');

CREATE TRIGGER trg_incidents_proyecto_cerrado
  BEFORE INSERT OR UPDATE OR DELETE ON incidents
  FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('direct');

CREATE TRIGGER trg_tree_data_versions_proyecto_cerrado
  BEFORE INSERT OR UPDATE OR DELETE ON tree_data_versions
  FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('via_tree');

CREATE TRIGGER trg_inspections_proyecto_cerrado
  BEFORE INSERT OR UPDATE OR DELETE ON inspections
  FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('via_tree');

CREATE TRIGGER trg_evaluations_proyecto_cerrado
  BEFORE INSERT OR UPDATE OR DELETE ON evaluations
  FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('via_tree');

CREATE TRIGGER trg_tree_assessments_proyecto_cerrado
  BEFORE INSERT OR UPDATE OR DELETE ON tree_assessments
  FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('via_tree');

CREATE TRIGGER trg_maintenance_records_proyecto_cerrado
  BEFORE INSERT OR UPDATE OR DELETE ON maintenance_records
  FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('via_tree');

CREATE TRIGGER trg_photos_proyecto_cerrado
  BEFORE INSERT OR UPDATE OR DELETE ON photos
  FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('via_tree');

CREATE TRIGGER trg_classification_adjustments_proyecto_cerrado
  BEFORE INSERT OR UPDATE OR DELETE ON classification_adjustments
  FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('via_evaluation');

CREATE TRIGGER trg_incident_reporters_proyecto_cerrado
  BEFORE INSERT OR UPDATE OR DELETE ON incident_reporters
  FOR EACH ROW EXECUTE FUNCTION fn_check_proyecto_no_cerrado('via_incident');

-- project_members: SIN trigger — el Administrador sigue gestionando
-- miembros con el proyecto cerrado (§3.2).

-- projects (la propia fila): decisión de la responsable (2026-10-21,
-- §3.2) — "solo consulta" (RG fila 27) incluye la propia fila del
-- proyecto: con el proyecto cerrado se bloquea cualquier cambio salvo
-- la transición de estado_proyecto (cerrar/reabrir).
CREATE FUNCTION public.fn_check_project_self_closed() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.estado_proyecto = 'cerrado'
     AND NEW.estado_proyecto = 'cerrado'
     AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'El proyecto % está cerrado: solo puede reabrirse, no editarse (RG fila 27; CC-042)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_projects_self_closed
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION fn_check_project_self_closed();

-- ---------------------------------------------------------------------
-- 2. RLS — habilitar en las 8 tablas nuevas sin RLS
-- ---------------------------------------------------------------------
ALTER TABLE sectors                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tree_data_versions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations                ENABLE ROW LEVEL SECURITY;
ALTER TABLE classification_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tree_assessments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records        ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_reporters         ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 3. Retirar policies que contradicen CC-033 ("ninguna política de
--    escritura para authenticated ni anon, sin excepción de rol")
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS projects_all_admin ON projects;
DROP POLICY IF EXISTS projects_select_municipal ON projects;
DROP POLICY IF EXISTS project_members_all_admin ON project_members;
DROP POLICY IF EXISTS project_members_select_own_municipal ON project_members;
DROP POLICY IF EXISTS public_spaces_all_admin ON public_spaces;
DROP POLICY IF EXISTS trees_select_admin ON trees;
DROP POLICY IF EXISTS trees_select_municipal ON trees;
DROP POLICY IF EXISTS trees_insert_municipal ON trees;
DROP POLICY IF EXISTS trees_update_municipal ON trees;
DROP POLICY IF EXISTS incidents_select_admin ON incidents;
DROP POLICY IF EXISTS incidents_select_municipal ON incidents;
DROP POLICY IF EXISTS incidents_insert_municipal ON incidents;
DROP POLICY IF EXISTS incidents_update_municipal ON incidents;
DROP POLICY IF EXISTS maintenance_insert_municipal ON maintenance;
DROP POLICY IF EXISTS maintenance_update_municipal ON maintenance;
DROP POLICY IF EXISTS tree_risk_assessments_insert_municipal ON tree_risk_assessments;
DROP POLICY IF EXISTS tree_infra_assessments_insert_municipal ON tree_infrastructure_assessments;

-- ---------------------------------------------------------------------
-- 4. Policies de lectura (§6) — (select ...) para que el planificador
--    las evalúe como initplan, no por fila (RESP punto 6)
-- ---------------------------------------------------------------------

-- projects
CREATE POLICY projects_select_admin
  ON projects FOR SELECT TO authenticated
  USING ((select public.is_admin()));
CREATE POLICY projects_select_project_roles
  ON projects FOR SELECT TO authenticated
  USING ((select public.has_project_role(id, ARRAY['usuario_municipal','inspector','encargado_mantencion'])));

-- project_members (de la propia fila; no está "scoped" por proyecto
-- del mismo modo, así que no usa has_project_role)
CREATE POLICY project_members_select_admin
  ON project_members FOR SELECT TO authenticated
  USING ((select public.is_admin()));
CREATE POLICY project_members_select_own
  ON project_members FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    AND (select public.get_user_role()) IN ('usuario_municipal', 'inspector', 'encargado_mantencion')
  );

-- public_spaces (legacy, se retira en la 018; solo se corrige CC-033)
CREATE POLICY public_spaces_select_admin
  ON public_spaces FOR SELECT TO authenticated
  USING ((select public.is_admin()));

-- sectors
CREATE POLICY sectors_select_admin
  ON sectors FOR SELECT TO authenticated
  USING ((select public.is_admin()));
CREATE POLICY sectors_select_project_roles
  ON sectors FOR SELECT TO authenticated
  USING ((select public.has_project_role(project_id, ARRAY['usuario_municipal','inspector','encargado_mantencion'])));

-- trees
CREATE POLICY trees_select_admin
  ON trees FOR SELECT TO authenticated
  USING ((select public.is_admin()));
CREATE POLICY trees_select_project_roles
  ON trees FOR SELECT TO authenticated
  USING ((select public.has_project_role(project_id, ARRAY['usuario_municipal','inspector','encargado_mantencion'])));

-- tree_data_versions
CREATE POLICY tree_data_versions_select_admin
  ON tree_data_versions FOR SELECT TO authenticated
  USING ((select public.is_admin()));
CREATE POLICY tree_data_versions_select_project_roles
  ON tree_data_versions FOR SELECT TO authenticated
  USING ((select public.has_project_role(
    (SELECT t.project_id FROM trees t WHERE t.id = tree_data_versions.tree_id),
    ARRAY['usuario_municipal','inspector','encargado_mantencion']
  )));

-- work_orders
CREATE POLICY work_orders_select_admin
  ON work_orders FOR SELECT TO authenticated
  USING ((select public.is_admin()));
CREATE POLICY work_orders_select_project_roles
  ON work_orders FOR SELECT TO authenticated
  USING ((select public.has_project_role(project_id, ARRAY['usuario_municipal','inspector','encargado_mantencion'])));

-- inspections (RLS ya estaba activada, sin políticas)
CREATE POLICY inspections_select_admin
  ON inspections FOR SELECT TO authenticated
  USING ((select public.is_admin()));
CREATE POLICY inspections_select_project_roles
  ON inspections FOR SELECT TO authenticated
  USING ((select public.has_project_role(
    (SELECT t.project_id FROM trees t WHERE t.id = inspections.tree_id),
    ARRAY['usuario_municipal','inspector','encargado_mantencion']
  )));

-- evaluations
CREATE POLICY evaluations_select_admin
  ON evaluations FOR SELECT TO authenticated
  USING ((select public.is_admin()));
CREATE POLICY evaluations_select_project_roles
  ON evaluations FOR SELECT TO authenticated
  USING ((select public.has_project_role(
    (SELECT t.project_id FROM trees t WHERE t.id = evaluations.tree_id),
    ARRAY['usuario_municipal','inspector','encargado_mantencion']
  )));

-- classification_adjustments
CREATE POLICY classification_adjustments_select_admin
  ON classification_adjustments FOR SELECT TO authenticated
  USING ((select public.is_admin()));
CREATE POLICY classification_adjustments_select_project_roles
  ON classification_adjustments FOR SELECT TO authenticated
  USING ((select public.has_project_role(
    (SELECT t.project_id FROM evaluations e JOIN trees t ON t.id = e.tree_id WHERE e.id = classification_adjustments.evaluation_id),
    ARRAY['usuario_municipal','inspector','encargado_mantencion']
  )));

-- tree_assessments
CREATE POLICY tree_assessments_select_admin
  ON tree_assessments FOR SELECT TO authenticated
  USING ((select public.is_admin()));
CREATE POLICY tree_assessments_select_project_roles
  ON tree_assessments FOR SELECT TO authenticated
  USING ((select public.has_project_role(
    (SELECT t.project_id FROM trees t WHERE t.id = tree_assessments.tree_id),
    ARRAY['usuario_municipal','inspector','encargado_mantencion']
  )));

-- maintenance_records
CREATE POLICY maintenance_records_select_admin
  ON maintenance_records FOR SELECT TO authenticated
  USING ((select public.is_admin()));
CREATE POLICY maintenance_records_select_project_roles
  ON maintenance_records FOR SELECT TO authenticated
  USING ((select public.has_project_role(
    (SELECT t.project_id FROM trees t WHERE t.id = maintenance_records.tree_id),
    ARRAY['usuario_municipal','inspector','encargado_mantencion']
  )));

-- incidents
CREATE POLICY incidents_select_admin
  ON incidents FOR SELECT TO authenticated
  USING ((select public.is_admin()));
CREATE POLICY incidents_select_project_roles
  ON incidents FOR SELECT TO authenticated
  USING ((select public.has_project_role(project_id, ARRAY['usuario_municipal','inspector','encargado_mantencion'])));

-- incident_reporters (PR-022: dato personal; SOLO usuario_municipal.
-- Ni admin ni inspector ni encargado_mantencion — la razón es PR-022,
-- no AMD-02, que es sobre el alcance de lectura de admin en general).
CREATE POLICY incident_reporters_select_municipal
  ON incident_reporters FOR SELECT TO authenticated
  USING ((select public.has_project_role(
    (SELECT i.project_id FROM incidents i WHERE i.id = incident_reporters.incident_id),
    ARRAY['usuario_municipal']
  )));

-- photos (RLS ya estaba activada, sin políticas)
CREATE POLICY photos_select_admin
  ON photos FOR SELECT TO authenticated
  USING ((select public.is_admin()));
CREATE POLICY photos_select_project_roles
  ON photos FOR SELECT TO authenticated
  USING ((select public.has_project_role(
    (SELECT t.project_id FROM trees t WHERE t.id = photos.tree_id),
    ARRAY['usuario_municipal','inspector','encargado_mantencion']
  )));

-- ---------------------------------------------------------------------
-- 5. GRANT/REVOKE a nivel de tabla, secuencia y esquema
-- ---------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;  -- anon sin SELECT en ninguna tabla NI VISTA (ALL TABLES incluye vistas)
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- ---------------------------------------------------------------------
-- 6. Funciones — EXECUTE (inventario completo revisado antes de
--    escribir esta migración; ver el informe que acompaña el PR)
-- ---------------------------------------------------------------------

-- SECURITY DEFINER que se conservan: solo authenticated.
REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
REVOKE ALL ON FUNCTION public.is_project_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.is_municipal_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_municipal_member(uuid) TO authenticated;
-- has_project_role ya quedó restringida a authenticated al crearla (§0).

-- RESP punto 3: fn_create_tree_with_measurement es SECURITY DEFINER
-- pero escribe directo (trees + tree_measurements) — contradice CC-033
-- tal como quedó definido (ninguna escritura directa para
-- authenticated/anon, ni siquiera vía RPC). Se revoca por completo.
-- CONSECUENCIA: esto deja sin función el alta de árbol actual (la que
-- usa este RPC desde el frontend con el JWT del Usuario municipal)
-- hasta que la Fase 6 reescriba el flujo de alta sobre sectors/trees/
-- tree_data_versions con el backend escribiendo vía service_role. Por
-- ahora solo afecta a valpo-verde-conecta-pruebas.
REVOKE ALL ON FUNCTION public.fn_create_tree_with_measurement(uuid, uuid, uuid, text, text, text, double precision, double precision, jsonb) FROM PUBLIC, anon, authenticated;

-- fn_refresh_tree_current: la única función nueva no-trigger realmente
-- invocable directo (RETURNS void).
REVOKE ALL ON FUNCTION public.fn_refresh_tree_current(uuid) FROM PUBLIC, anon, authenticated;

-- Funciones de trigger (ya inejecutables directo por ser RETURNS
-- TRIGGER; se revoca por higiene, como se pidió).
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_next_codigo_usuario() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_set_work_order_codigo() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_fix_requiere_revision_inspector() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_check_inspection_anulacion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_check_inspection_tree_coherente() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_check_ot_completada() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_check_maintenance_record_ot() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_clear_incident_reporter() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_check_photo_tree_coherente() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_check_proyecto_no_cerrado() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_check_project_self_closed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_resolve_project_id(jsonb, text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. Vistas de la 016 — security_invoker (sin esto, corren con los
--    privilegios del owner de la vista y NO respetan el RLS de las
--    tablas de origen)
-- ---------------------------------------------------------------------
ALTER VIEW v_tree_presence           SET (security_invoker = true);
ALTER VIEW v_inspections             SET (security_invoker = true);
ALTER VIEW v_tree_current_inputs     SET (security_invoker = true);
ALTER VIEW v_tree_current_assessment SET (security_invoker = true);
ALTER VIEW v_species_traits          SET (security_invoker = true);
ALTER VIEW v_upcoming_inspections    SET (security_invoker = true);

REVOKE ALL ON v_tree_presence, v_inspections, v_tree_current_inputs,
             v_tree_current_assessment, v_species_traits, v_upcoming_inspections
  FROM PUBLIC, anon;
GRANT SELECT ON v_tree_presence, v_inspections, v_tree_current_inputs,
               v_tree_current_assessment, v_species_traits, v_upcoming_inspections
  TO authenticated;
