-- =====================================================================
-- VALPO VERDE — migrations/005_rls_policies.sql
--
-- Quinta migración: introduce Row Level Security como SEGUNDA barrera de
-- autorización, coexistiendo con (no reemplazando) la autorización ya
-- implementada en el backend (services/authorization.service.ts).
--
-- Reglas de referencia (todas vigentes):
--   PR-003 v4.0, PR-004 v4.0, PR-005 v3.0 (docs/project-rules.md)
--   ADR-005 v2.0 (docs/architecture-decisions.md)
--
-- DECISIÓN ARQUITECTÓNICA (aprobada por la autora, no se reabre aquí):
--   - La autorización de backend NO se reemplaza ni se debilita.
--   - RLS aplica de verdad solo cuando el backend consulta Supabase con
--     el JWT del usuario autenticado (no con service_role). Ese cambio
--     de cliente en el backend es un trabajo COORDINADO y SEPARADO de
--     esta migración.
--   - service_role sigue reservado para operaciones internas
--     privilegiadas (getAuthUserByToken, gestión de user_profiles).
--   - Ninguna policy depende de JWT custom claims: no existen en este
--     proyecto. El rol se resuelve siempre vía auth.uid() + user_profiles
--     + roles.
--   - TODAS las policies de este archivo se crean con `TO authenticated`
--     explícito: ninguna queda aplicada a PUBLIC por omisión.
--
-- ESTA MIGRACIÓN NO HACE:
--   - NO agrega policies sobre `roles` (catálogo global; se consulta
--     internamente desde las funciones SECURITY DEFINER, sin necesitar
--     su propia RLS en esta fase).
--   - NO agrega policies de INSERT/UPDATE/DELETE sobre `user_profiles`.
--   - NO agrega UPDATE/DELETE de `incidents` para usuario_municipal.
--   - NO restringe columnas dentro de una fila (ver nota en Sección 6:
--     trees UPDATE protege scope de proyecto, no campos individuales).
--   - NO modifica species, migraciones anteriores, ni cambia código de
--     backend.
--
-- PRECISIÓN SOBRE user_profiles_select_own (Sección 2):
--   Un usuario INACTIVO puede seguir leyendo SU PROPIA fila de
--   user_profiles (para que el frontend pueda, por ejemplo, mostrarle
--   "tu cuenta está inactiva"). Esto es intencional y NO es una brecha:
--   get_user_role() exige explícitamente activo = true (Sección 1), así
--   que un usuario inactivo, aunque pueda leer su propio perfil, no
--   obtiene NINGÚN acceso a projects/project_members/trees/
--   public_spaces/incidents — is_admin() e is_municipal_member()
--   resuelven a false/NULL para él en todos los casos.
--
-- PRECONDICIÓN DE OWNERSHIP (verificar ANTES de aplicar en cualquier
-- entorno, incluido el de pruebas — NO asumir que el owner es `postgres`
-- sin comprobarlo):
--   SELECT tablename, tableowner FROM pg_tables
--   WHERE tablename IN ('user_profiles','roles','project_members');
--   Ajustar los ALTER FUNCTION ... OWNER TO de la Sección 1 si el owner
--   real difiere de `postgres`. Si no se puede confirmar el owner real,
--   NO aplicar esta migración.
-- =====================================================================


BEGIN;

-- ---------------------------------------------------------------------
-- SECCIÓN 1 — FUNCIONES SECURITY DEFINER (rompen la cadena de RLS)
-- ---------------------------------------------------------------------
-- SECURITY DEFINER + mismo owner que las tablas consultadas = la consulta
-- interna de la función bypasea el RLS de esa tabla, evitando que una
-- policy de projects/trees/incidents/public_spaces dispare de nuevo el
-- RLS de user_profiles/roles/project_members (recursión/cadena costosa).
-- SET search_path fijo: mitigación estándar contra search_path hijacking
-- en funciones SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  -- activo = true es obligatorio aquí: es el único lugar que decide si
  -- el usuario tiene ALGÚN rol operativo. user_profiles_select_own
  -- (Sección 2) deliberadamente NO depende de esta función.
  SELECT r.nombre
  FROM public.user_profiles up
  JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = auth.uid()
    AND up.activo = true;
$$;

ALTER FUNCTION public.get_user_role() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;


CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = p_project_id
      AND pm.user_id = auth.uid()
  );
$$;

ALTER FUNCTION public.is_project_member(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_project_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO authenticated;


CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.get_user_role() = 'admin';
$$;

ALTER FUNCTION public.is_admin() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;


CREATE OR REPLACE FUNCTION public.is_municipal_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.get_user_role() = 'usuario_municipal'
     AND public.is_project_member(p_project_id);
$$;

ALTER FUNCTION public.is_municipal_member(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_municipal_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_municipal_member(uuid) TO authenticated;

-- Grafo de dependencias (DAG, sin ciclos):
--   policies(projects/public_spaces/trees/incidents)
--     -> is_admin() / is_municipal_member()
--         -> get_user_role()     -> user_profiles, roles   (bypass RLS)
--         -> is_project_member() -> project_members         (bypass RLS)
-- Ninguna función consulta projects/trees/incidents/public_spaces.


-- ---------------------------------------------------------------------
-- SECCIÓN 2 — user_profiles (solo SELECT; sin policies de escritura)
-- ---------------------------------------------------------------------

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Deliberadamente NO exige activo = true: un usuario inactivo puede leer
-- su propia fila. Ver nota en el encabezado.
CREATE POLICY user_profiles_select_own
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY user_profiles_select_admin
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Sin INSERT/UPDATE/DELETE: decisión explícita (ver encabezado). Sin
-- policy de escritura + RLS habilitado = denegado por defecto para
-- cualquier rol "authenticated". service_role sigue bypasseando.


-- ---------------------------------------------------------------------
-- SECCIÓN 3 — project_members
-- ---------------------------------------------------------------------

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_members_all_admin
  ON public.project_members FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- usuario_municipal: SOLO su propia fila, SOLO lectura. No ve membresías
-- de otros usuarios, no administra.
CREATE POLICY project_members_select_own_municipal
  ON public.project_members FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() = 'usuario_municipal'
    AND user_id = auth.uid()
  );


-- ---------------------------------------------------------------------
-- SECCIÓN 4 — projects
-- ---------------------------------------------------------------------

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_all_admin
  ON public.projects FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY projects_select_municipal
  ON public.projects FOR SELECT
  TO authenticated
  USING (public.is_municipal_member(id));


-- ---------------------------------------------------------------------
-- SECCIÓN 5 — public_spaces
-- ---------------------------------------------------------------------

ALTER TABLE public.public_spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_spaces_all_admin
  ON public.public_spaces FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY public_spaces_select_municipal
  ON public.public_spaces FOR SELECT
  TO authenticated
  USING (public.is_municipal_member(project_id));

-- Confirmado: usuario_municipal SIN INSERT/UPDATE/DELETE sobre
-- public_spaces.


-- ---------------------------------------------------------------------
-- SECCIÓN 6 — trees
-- ---------------------------------------------------------------------

ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;

CREATE POLICY trees_all_admin
  ON public.trees FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY trees_select_municipal
  ON public.trees FOR SELECT
  TO authenticated
  USING (public.is_municipal_member(project_id));

CREATE POLICY trees_insert_municipal
  ON public.trees FOR INSERT
  TO authenticated
  WITH CHECK (public.is_municipal_member(project_id));

-- LÍMITE DOCUMENTADO: esta policy protege el SCOPE por proyecto (fila),
-- no restringe QUÉ COLUMNAS puede tocar usuario_municipal dentro de un
-- árbol de su propio proyecto. "Editar solo datos básicos permitidos"
-- (PR-003 v4.0) sigue siendo responsabilidad exclusiva de services/Zod
-- en el backend — un UPDATE que pase el filtro de fila de esta policy
-- podría, a nivel de Postgres puro, tocar cualquier columna, incluidos
-- campos técnicos reservados a admin. Mejora futura no implementada
-- aquí: column-level privileges (GRANT UPDATE (col...) ON trees) o un
-- RPC/función SECURITY DEFINER dedicado que solo exponga las columnas
-- básicas, si se quiere que PostgreSQL proteja también eso directamente.
CREATE POLICY trees_update_municipal
  ON public.trees FOR UPDATE
  TO authenticated
  USING (public.is_municipal_member(project_id))
  WITH CHECK (public.is_municipal_member(project_id));

-- Sin DELETE para usuario_municipal (no hay eliminación física, ADR-012).


-- ---------------------------------------------------------------------
-- SECCIÓN 7 — incidents
-- ---------------------------------------------------------------------

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY incidents_all_admin
  ON public.incidents FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- usuario_municipal: SELECT + INSERT sí ("reportar y consultar",
-- PR-003 v4.0); UPDATE/DELETE no ("gestionar" es exclusivo de admin,
-- PR-004 v4.0).
CREATE POLICY incidents_select_municipal
  ON public.incidents FOR SELECT
  TO authenticated
  USING (public.is_municipal_member(project_id));

CREATE POLICY incidents_insert_municipal
  ON public.incidents FOR INSERT
  TO authenticated
  WITH CHECK (public.is_municipal_member(project_id));


-- ---------------------------------------------------------------------
-- SECCIÓN 8 — VERIFICACIÓN POSTERIOR (defensiva, mismo patrón que 003/004)
-- ---------------------------------------------------------------------

DO $$
DECLARE
  v_missing_functions integer;
BEGIN
  SELECT COUNT(*) INTO v_missing_functions
  FROM (VALUES ('get_user_role'), ('is_project_member'), ('is_admin'), ('is_municipal_member')) AS expected(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = expected.name AND p.prosecdef = true
  );

  IF v_missing_functions > 0 THEN
    RAISE EXCEPTION 'Migración 005 abortada: % función(es) SECURITY DEFINER esperada(s) no se crearon correctamente.', v_missing_functions;
  END IF;
END $$;

DO $$
DECLARE
  v_tables_without_rls integer;
BEGIN
  SELECT COUNT(*) INTO v_tables_without_rls
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND t.tablename IN ('user_profiles','project_members','projects','public_spaces','trees','incidents')
    AND NOT (SELECT relrowsecurity FROM pg_class c WHERE c.oid = (t.schemaname||'.'||t.tablename)::regclass);

  IF v_tables_without_rls > 0 THEN
    RAISE EXCEPTION 'Migración 005 abortada: % de las 6 tablas no quedaron con RLS habilitado.', v_tables_without_rls;
  END IF;
END $$;

DO $$
DECLARE
  v_policy_count integer;
  v_public_policy_count integer;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('user_profiles','project_members','projects','public_spaces','trees','incidents');

  IF v_policy_count <> 15 THEN
    RAISE EXCEPTION 'Migración 005 abortada: se esperaban 15 policies y se encontraron %.', v_policy_count;
  END IF;

  -- Confirma que ninguna policy quedó aplicada a PUBLIC por omisión:
  -- roles debe ser exactamente {authenticated} en cada una.
  SELECT COUNT(*) INTO v_public_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('user_profiles','project_members','projects','public_spaces','trees','incidents')
    AND (roles IS NULL OR 'public' = ANY(roles) OR array_length(roles, 1) IS DISTINCT FROM 1 OR NOT ('authenticated' = ANY(roles)));

  IF v_public_policy_count > 0 THEN
    RAISE EXCEPTION 'Migración 005 abortada: % policy(ies) no está(n) restringida(s) exactamente a TO authenticated.', v_public_policy_count;
  END IF;
END $$;

COMMIT;

-- =====================================================================
-- FIN 005_rls_policies.sql
--
-- Pendiente, fuera de alcance de esta migración:
--   - Cutover del backend de service_role a JWT de usuario por
--     repository (trabajo coordinado y separado, no forma parte de este
--     archivo).
--   - RLS sobre roles, y sobre inspections/maintenance/infrastructure_
--     conflicts/photos/defect_*/vitality_assessments/risk_evaluations
--     (derivadas vía tree_id, mayor costo de policy) — fuera de esta
--     primera fase.
--   - Policies de escritura sobre user_profiles (activo/role_id).
--   - UPDATE/DELETE de incidents para usuario_municipal.
--   - Column-level privileges / RPC dedicado para trees UPDATE (ver
--     nota de límite en Sección 6).
-- =====================================================================
