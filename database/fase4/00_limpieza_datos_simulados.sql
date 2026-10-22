-- =====================================================================
-- Fase 4, paso 1 — Inventario y limpieza autorizada de los datos simulados
-- Diseño §7 paso 1 (docs/diseno/fase3-modelo-datos-2.0.0.md); CC-038; AM-09.
-- Issue #37.
--
-- Alcance: todos los datos operativos (árboles, proyectos, inspecciones,
-- evaluaciones, incidencias, mantenimiento, fotos, espacios públicos,
-- especies) son simulados (CC-038) y se descartan sin convertir: la
-- estructura nueva de la Fase 4 se crea vacía (§7).
--
-- NO toca: roles, user_profiles ni auth.users (las cuentas no son el
-- "dato simulado" que CC-038 autoriza a descartar aquí; siguen haciendo
-- falta para iniciar sesión durante las pruebas W1–W12 y las fases
-- siguientes). Tampoco toca spatial_ref_sys (PostGIS).
--
-- Uso (SOLO contra valpo-verde-conecta-pruebas; nunca contra
-- valpo-verde-conecta):
--   psql "$DESTINO_URL" -X -v ON_ERROR_STOP=1 -f 00_limpieza_datos_simulados.sql
--
-- Orden de borrado: hijos antes que padres (todas las FK existentes al
-- 2026-10-21 son ON DELETE RESTRICT o sin acción, salvo la cascada
-- auth.users -> user_profiles, que este script no activa).
-- =====================================================================

\echo '=== INVENTARIO ANTES ==='
SELECT 'photos' t, count(*) FROM photos
UNION ALL SELECT 'tree_risk_assessments', count(*) FROM tree_risk_assessments
UNION ALL SELECT 'tree_infrastructure_assessments', count(*) FROM tree_infrastructure_assessments
UNION ALL SELECT 'defect_results', count(*) FROM defect_results
UNION ALL SELECT 'component_assessments', count(*) FROM component_assessments
UNION ALL SELECT 'vitality_assessments', count(*) FROM vitality_assessments
UNION ALL SELECT 'risk_evaluations', count(*) FROM risk_evaluations
UNION ALL SELECT 'defect_observations', count(*) FROM defect_observations
UNION ALL SELECT 'inspections', count(*) FROM inspections
UNION ALL SELECT 'tree_measurements', count(*) FROM tree_measurements
UNION ALL SELECT 'maintenance', count(*) FROM maintenance
UNION ALL SELECT 'incidents', count(*) FROM incidents
UNION ALL SELECT 'infrastructure_conflicts', count(*) FROM infrastructure_conflicts
UNION ALL SELECT 'trees', count(*) FROM trees
UNION ALL SELECT 'public_spaces', count(*) FROM public_spaces
UNION ALL SELECT 'project_members', count(*) FROM project_members
UNION ALL SELECT 'projects', count(*) FROM projects
UNION ALL SELECT 'species', count(*) FROM species
UNION ALL SELECT 'audit_log', count(*) FROM audit_log
UNION ALL SELECT 'roles (no se toca)', count(*) FROM roles
UNION ALL SELECT 'user_profiles (no se toca)', count(*) FROM user_profiles
ORDER BY 1;

BEGIN;

DELETE FROM photos;
DELETE FROM tree_risk_assessments;
DELETE FROM tree_infrastructure_assessments;
DELETE FROM defect_results;
DELETE FROM component_assessments;
DELETE FROM vitality_assessments;
DELETE FROM risk_evaluations;
DELETE FROM defect_observations;
DELETE FROM inspections;
DELETE FROM tree_measurements;
DELETE FROM maintenance;
DELETE FROM incidents;
DELETE FROM infrastructure_conflicts;
DELETE FROM trees;
DELETE FROM public_spaces;
DELETE FROM project_members;
DELETE FROM projects;
DELETE FROM species;
DELETE FROM audit_log;

\echo '=== INVENTARIO DESPUÉS (dentro de la transacción) ==='
SELECT 'photos' t, count(*) FROM photos
UNION ALL SELECT 'tree_risk_assessments', count(*) FROM tree_risk_assessments
UNION ALL SELECT 'tree_infrastructure_assessments', count(*) FROM tree_infrastructure_assessments
UNION ALL SELECT 'defect_results', count(*) FROM defect_results
UNION ALL SELECT 'component_assessments', count(*) FROM component_assessments
UNION ALL SELECT 'vitality_assessments', count(*) FROM vitality_assessments
UNION ALL SELECT 'risk_evaluations', count(*) FROM risk_evaluations
UNION ALL SELECT 'defect_observations', count(*) FROM defect_observations
UNION ALL SELECT 'inspections', count(*) FROM inspections
UNION ALL SELECT 'tree_measurements', count(*) FROM tree_measurements
UNION ALL SELECT 'maintenance', count(*) FROM maintenance
UNION ALL SELECT 'incidents', count(*) FROM incidents
UNION ALL SELECT 'infrastructure_conflicts', count(*) FROM infrastructure_conflicts
UNION ALL SELECT 'trees', count(*) FROM trees
UNION ALL SELECT 'public_spaces', count(*) FROM public_spaces
UNION ALL SELECT 'project_members', count(*) FROM project_members
UNION ALL SELECT 'projects', count(*) FROM projects
UNION ALL SELECT 'species', count(*) FROM species
UNION ALL SELECT 'audit_log', count(*) FROM audit_log
UNION ALL SELECT 'roles (no se toca)', count(*) FROM roles
UNION ALL SELECT 'user_profiles (no se toca)', count(*) FROM user_profiles
ORDER BY 1;

COMMIT;

\echo '=== LIMPIEZA COMMITEADA ==='
