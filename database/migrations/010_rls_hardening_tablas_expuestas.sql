-- ============================================================================
-- Migración 010 — Cierre de tablas expuestas sin RLS (auditoría post-demo,
-- 2026-10-09). PROPUESTA: NO APLICADA hasta autorización de la investigadora.
-- ============================================================================
--
-- Hallazgo (Supabase security advisor "rls_disabled_in_public" + revisión de
-- grants): 12 tablas de `public` tenían RLS desactivada y los roles `anon` y
-- `authenticated` conservaban TODOS los privilegios por defecto (SELECT,
-- INSERT, UPDATE, DELETE, TRUNCATE). La clave anon está en el bundle del
-- frontend, por lo que cualquiera podía escribir en ellas vía PostgREST.
--
-- Riesgo crítico: `roles`. is_admin() resuelve el rol por `roles.nombre`;
-- un `UPDATE roles SET nombre='admin' WHERE nombre='usuario_municipal'`
-- convertía a todo usuario municipal en administrador (RLS y backend).
--
-- Quién lee cada tabla (verificado en el código):
--   - roles: backend con service role (userProfile.repository) y funciones
--     SECURITY DEFINER (get_user_role) → no necesitan política: RLS sin
--     políticas = denegado para anon/authenticated, sin romper nada.
--   - species: frontend (listSpeciesCatalog, sesión authenticated) y joins
--     del backend con cliente del usuario → requiere SELECT para
--     authenticated. Escritura solo vía service role.
--   - audit_log, inspections, defect_observations, defect_results,
--     component_assessments, probability_thresholds, vitality_assessments,
--     risk_evaluations, infrastructure_conflicts, photos: sin uso en el
--     código y vacías → RLS sin políticas (denegado) hasta que se diseñe
--     su acceso.
--   - spatial_ref_sys (PostGIS): no se habilita RLS (tabla de la extensión);
--     solo se retira la escritura a anon/authenticated.
--
-- Solo operaciones de endurecimiento: sin DROP, DELETE ni cambios de datos.
-- ============================================================================

ALTER TABLE public.roles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.species                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defect_observations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defect_results         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.component_assessments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.probability_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitality_assessments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_evaluations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infrastructure_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos                 ENABLE ROW LEVEL SECURITY;

-- Catálogo de especies: lectura para usuarios autenticados (formulario
-- Nuevo árbol y joins del inventario). Sin políticas de escritura.
CREATE POLICY species_select_authenticated
  ON public.species FOR SELECT
  TO authenticated
  USING (true);

-- PostGIS: sin escritura para roles de la API.
-- RESULTADO VERIFICADO (2026-10-09): SIN EFECTO. spatial_ref_sys pertenece a
-- supabase_admin y el rol que aplica migraciones no puede retirar esos
-- privilegios (el REVOKE no falla, pero no cambia nada). Pendiente: mover
-- PostGIS al esquema `extensions` o solicitarlo a Supabase (issue backend #9).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.spatial_ref_sys FROM anon, authenticated;
