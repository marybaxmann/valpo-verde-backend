# 🔄 Active Handoff — Valpo Verde Backend

> **Este archivo es un documento de relevo operativo y contexto para agentes. No constituye fuente metodológica. Ante contradicción, prevalecen las fuentes vigentes definidas por PR-002 y docs/workflow.md.**
>
> Fuentes que prevalecen sobre este archivo: Excel metodológico (DICCIONARIO_CAMPOS y demás hojas del paquete), `docs/project-rules.md`, `docs/architecture-decisions.md` (ADR), `docs/methodology/`, `docs/registro-cambios.md` y `docs/workflow.md`. Si algo de este archivo las contradice, el agente debe detenerse y consultar esas fuentes.
>
> Memoria de trabajo compartida entre agentes (**Claude Code**, **AGY / Gemini**, **Warp AI / GPT**). Cada agente la actualiza al terminar su turno; el siguiente la lee al arrancar.

---

## 📌 Metadatos del Relevo
- **Última actualización:** 2026-10-06 (sesión "SIVU demo funcional")
- **Agente emisor:** Claude Code
- **Agente receptor sugerido:** Claude Code (nueva sesión — contexto de la anterior agotado)
- **Rama Git vigente:** `main` en ambos repos (INV-1B ya fue mergeado antes de esta sesión: commit `f7dfe12`)
- **Rutas:** `C:\Users\usuario\code\valpo-verde-backend` y `C:\Users\usuario\code\valpo-verde-frontend`
- **Resumen:** Demo SIVU lista (6 árboles, 4 riesgos vía motor, todos los módulos). Sin commit. Próximo: auditoría post-demo SIN tocar la demo.
- **Nota rama:** el backend está en `docs/cc-021-jerarquia-fuentes` (no `main`); el trabajo de demo del backend quedó sin commit sobre esa rama.

> La línea **Resumen** se muestra en la barra de estado de Claude Code. Mantenerla en una sola línea corta y actualizarla en cada relevo.

---

## 📋 Planificación post-demo (2026-10-09)
- Tablero GitHub Projects: https://github.com/users/marybaxmann/projects/5 ("SIVU — Planificación", privado). Issues backend #4–#13, frontend #2–#3.
- **P0 abierto: backend #4** — RLS en tablas públicas. Migración propuesta `database/migrations/010_rls_hardening_tablas_expuestas.sql` **NO aplicada** (requiere autorización de la investigadora). Repos públicos: no publicar detalles explotables en issues.

---

## 🚀 SESIÓN "SIVU DEMO FUNCIONAL" (2026-10-06) — leer esto primero

**Contexto:** la investigadora tiene su tesis en ~2 días. Se trabajó en modo "avance visible rápido, sin romper lo que ya funciona", con auditorías metodológicas puntuales solo cuando una regla concreta lo exigía (no auditorías generales). **Nada se commiteó**; todo sigue en working tree.

### Qué funciona end-to-end (probado manualmente por la investigadora)
Usuario Municipal → Inventario → registrar árbol → aparece en mapa/listado → Inspección → Nueva evaluación → formulario de 6 pasos → cálculo real de riesgo en backend → guardar → ficha del árbol muestra el resultado → Admin puede consultar el mismo resultado.

### Backend — cambios sin commit
- **Migración `007_tree_risk_assessment.sql`** (ya aplicada en Supabase vía MCP): tabla `tree_risk_assessments` (1:N con `trees`, igual patrón que `tree_measurements`), RLS igual a `trees` (admin ALL, usuario_municipal según `is_municipal_member`), sin UPDATE/DELETE para usuario_municipal.
- **`src/services/rules/treeRisk.ts`**: motor de cálculo R01 (raíces/cuello, máx. 9), R02 (tronco, máx. **14**), R03 (copa/ramas, máx. **5**), R04 (consolidación = el más desfavorable entre clasificaciones M02+M03 por componente), M01 (probabilidad de impacto), M02+M03 (matrices → Bajo/Moderado/Alto/Extremo). Fuente: `borrador_reglas_diagramas_v3.xlsx` (hojas REGLAS_INDICADORES, CHEQUEO_PUNTAJES) + `docs/excel/Base de Datos Valpo Verde.xlsx` (MATRICES_CALCULO, DICCIONARIO_CAMPOS, LISTAS), verificadas celda por celda. **Importante:** `docs/methodology/*.md` y `docs/project-rules.md` están DESACTUALIZADOS frente a estos Excel (dicen R02 máx. 18 y R03 máx. 9 — están mal; el código usa los valores correctos 14 y 5, confirmados por DICCIONARIO_CAMPOS). Sincronizar la documentación queda **pendiente POST-DEMO**, no se tocó.
- **20 tests nuevos** en `tests/services/rules/treeRisk.test.ts` (casos sano/peor caso/límites/"No determinado"). Total: **140/140 tests pasando**.
- Nuevos endpoints: `POST/GET /api/trees/:treeId/risk-assessments`, `GET /api/trees/:treeId/risk-assessments/latest`, `GET /api/projects/:id/risk-assessments/latest` (resumen de todo el proyecto en una sola consulta, para colorear el mapa sin N+1). También `PATCH /api/trees/:treeId` (editar especie/dirección/comuna/referencia — nunca ubicación ni medición).
- **DAP equivalente (polifuste): NO implementado.** No existe fórmula aprobada en ningún Excel ni documento — se dejó explícitamente pendiente, con nota visible en el formulario.
- Catálogo de especies sigue consultando Supabase directo (`src/api/trees.ts` en frontend) porque no hay endpoint backend — gap conocido, documentado, sin fallback ficticio.

### Frontend — cambios sin commit
- Rediseño territorial-analítico completo de Inventario/Dashboard (referencia: `docs/referencias/visuales/03_CityDashboardsButton.jpg`), mapa con Valparaíso como vista por defecto, guard contra zoom continental, zoom a selección, sincronización incremental del mapa (sin recrear ArcGIS en cada cambio).
- Combobox buscable de especies, flujo de edición de árbol (`EditTreeModal`), Capa 0 real para Inspección e Infraestructura (`ModulePage.tsx`, con mapa), Mantención e Incidencias separadas en pantallas propias SIN mapa (`MaintenancePage.tsx`, `IncidentsPage.tsx`).
- **Evaluación de riesgo completa**: `RiskAssessmentModal.tsx` (formulario de 6 pasos), integrado en Inspección, en el panel contextual del árbol y en la ficha técnica. Mapa coloreado por nivel de riesgo (colores oficiales) + leyenda + filtro por riesgo en Inventario. Dashboard con tarjetas de riesgo reales.

### Iteración "flujo visible demo" (2026-10-06, Claude Code) — solo frontend, sin commit
- `CreateTreeModal`: lat/lon parten vacías (antes se prellenaban con el encuadre -33.045/-71.620 → árboles apilados). Obliga a "Marcar en mapa SIG".
- Ficha (`TreeDetailModal`): franja resumen (árbol/ubicación/dimensiones/última evaluación/nivel de riesgo), clasificación por componente, historial siempre visible si >1, acciones en pie [Volver al mapa] [Editar árbol] [Nueva evaluación].
- Inventario: badge de riesgo por fila, distribución por riesgo en el panel de resumen, filtros se limpian al registrar árbol, panel contextual con riesgo en cabecera y acciones [Ver ficha] [Editar] [Evaluar], sincronizado si se evalúa desde la ficha.
- Inspección (`ModulePage`): filtro Todos/Evaluados/Sin evaluar (listado + mapa), historial completo del árbol seleccionado en el panel, "Ver árbol →", "← Volver al listado".
- Infraestructura: sin textos "Módulo aún no habilitado"; árboles reales + mapa + selección + ficha; estado vacío "Aún no existen evaluaciones de infraestructura…"; acción deshabilitada "Disponible en próxima etapa". No hay entidad backend → sin cifras.
- Mantención/Incidencias: nuevo `ManagementModule.tsx` compartido (flujo del proceso, resumen "—", buscador/filtros deshabilitados, tabla con estado vacío, acción deshabilitada). Sin datos inventados.
- Dashboard: distribución por riesgo, accesos a los 5 módulos sin cifras inventadas. `ProjectsList` → "Entrar al proyecto" va al Dashboard. `ProjectDetail` con accesos a todos los módulos.
- Datos: Proyecto Valparaíso = 3 árboles (A-000010 Moderado con 4 evaluaciones —2 con `test:true`—; A-000011 y A-000012 sin evaluar). A-000010/11 en el punto por defecto, A-000012 con latitud positiva (+33.046). **La investigadora pidió NO modificarlos** (pendiente post-demo).
- Validación: `tsc -b` + `npm run build` OK. Backend sin cambios (140/140). Sin revisión visual en navegador (Claude in Chrome no conectado) — la hace la investigadora.
- **Ronda 2 (tras revisión visual de la investigadora):**
  - Jerarquía: `RoleLayout.tsx` común a admin/usuario (los layouts quedan como wrappers). Fuera de proyecto el sidebar solo muestra "Mis proyectos"; dentro, solo los 6 módulos ("Inspección y Riesgo" con nombre completo). Pie del rail: bloque PROYECTO ACTUAL (+ "Cambiar proyecto") y bloque USUARIO (+ "Salir").
  - `hooks/useCurrentProject.tsx`: el layout carga el proyecto una vez (GET /api/projects/:id) y lo comparte; Mantención/Incidencias ya no hacen peticiones propias.
  - `ProjectsList` → pantalla "Mis proyectos" (tarjetas; admin conserva "Crear proyecto" y "Configurar").
  - **Error "Token inválido o expirado"**: no era exclusivo de Incidencias. `getSession()` puede devolver un access_token vencido si el auto-refresh de supabase-js no corrió (pestaña en segundo plano/suspensión). `src/api/client.ts` ahora, ante 401, hace `refreshSession()` y reintenta una vez; si falla, muestra "Tu sesión expiró. Vuelve a iniciar sesión para continuar."
  - Dashboard: CTA de tarjetas = "Ver módulo →". Inventario: "Cambiar proyecto" (antes "Cambiar Territorio").
- **Ronda 3 (pulido visual):** sistema TABLA SIVU (`components/SivuTable.tsx` + `.sivu-table*` en global.css; `.table` no tenía estilos → encabezados "flotando"). Aplicado a Mantención, Incidencias (anchos por columna, estado vacío dentro de la tabla), historial dendrométrico y de evaluaciones de la ficha, miembros del proyecto. `.content` centrado y más ancho. Infraestructura: bloque "Evaluación de infraestructura" + riesgo actual real del árbol. Panel contextual: consecuencias. Dashboard: tarjetas de módulo de altura uniforme. Solo frontend, sin commit.

### Sprint "módulos mínimos" (2026-10-06, Claude Code) — sin commit
- **Migración 008 APLICADA** (`008_demo_infra_maintenance_incidents.sql`, solo aditiva): tabla nueva `tree_infrastructure_assessments` (datos crudos por componente, claves DICCIONARIO_CAMPOS, sin severidad/M04; RLS patrón 007); `maintenance` + columnas nullable `subtipo_accion`, `created_by` y **RLS habilitada** (antes estaba desactivada) con políticas patrón 007; `incidents` sin cambios (RLS ya existía). `created_by DEFAULT auth.uid()` + check en INSERT municipal.
- Backend: `services/rules/moduleCatalogs.ts` (LISTAS accion/subtipo_accion CC-004 + dominios DICCIONARIO de infraestructura), `schemas/moduleRecords.schema.ts`, `repositories/moduleRecords.repository.ts`, `services/moduleRecords.service.ts`, `controllers/moduleRecords.controller.ts`. Endpoints: `GET /api/catalogs/modules`; `POST/GET /api/trees/:treeId/infrastructure-assessments`; `GET /api/projects/:id/infrastructure-assessments`; `GET/POST /api/projects/:id/maintenance`; `GET/POST /api/projects/:id/incidents`. 140/140 tests (sin tests nuevos para estos endpoints — pendiente post-demo).
- Frontend: Infraestructura con formulario + resumen ("Clasificación global pendiente") e historial; Mantención (orden de trabajo: árbol, acción, subtipo, fecha, responsable, observación; estado = default 'pendiente') e Incidencias (árbol opcional, tipo y origen texto libre sin catálogo vigente) con tabla real; ficha con sección 5 "Gestión del ejemplar"; panel contextual con accesos; Dashboard con conteos reales. Navegación contextual por `?arbol=<id>&nuevo=1`.
- RLS verificada con transacción simulada como usuario municipal + ROLLBACK (0 filas residuales).

### Sprint "módulos básicos + Índices" (2026-10-06, Claude Code) — sin commit
- **Migración 009 APLICADA** (aditiva): `maintenance.codigo_ot` ('OT-M-000001') e `incidents.codigo_incidencia` ('INC-000001') con secuencias + índices únicos (formato del Excel maestro). Sin cambios de RLS.
- Estados según listas de validación del Excel: estado_ot = Pendiente/Programada/En ejecución/Completada/Cancelada; estado_incidencia = Ingresada/En revisión/Derivada/Resuelta/Descartada. Sin transiciones impuestas (la fuente no las define). Incidencias nuevas nacen 'ingresada'.
- `PATCH /api/projects/:id/maintenance/:recordId/estado` y `/incidents/:recordId/estado` → **solo admin** (assertAdmin + RLS sin UPDATE municipal; PR-003 v5.0 y 005).
- `GET /api/projects/:id/indices`: agregados descriptivos (conteos, especies, min/prom/máx de la medición vigente; polifuste sin DAP). **No se calculan índices de la hoja INDICES (CC-016: "no implementable ni normativa vigente")**; la pantalla Índices lista cada uno con su motivo.
- Corregido: listados de módulos/índices omitían árboles sin ubicación (`listAllProjectTreeRowsForUser`).
- Tests: `tests/integration/moduleRecords.routes.test.ts` (18). Total 158/158.
- **⚠️ DECISIÓN PENDIENTE DE LA INVESTIGADORA — conflicto con PR-003 v5.0:** el Usuario municipal "no realiza evaluación técnica ni evaluación de riesgo" y solo "consulta mantenimiento", pero la RLS actual le permite INSERT en `tree_risk_assessments` (007), `tree_infrastructure_assessments` y `maintenance` (008). No se revocó nada (requiere su decisión/CC).

### Dataset de demo (2026-10-06, Claude Code) — datos en Supabase
- **Limpieza autorizada por la investigadora**: eliminados los 3 árboles de prueba A-000010/11/12 (Proyecto Valparaíso) + sus 3 mediciones y 4 evaluaciones de riesgo (incluidas las 2 `test:true`). Sin otras dependencias. 0 huérfanos.
- **Carga histórica (levantamiento 10/08/2026)**: A004 → `A-000013`, A005 → `A-000014` (`legacy_id` = A004/A005), vía `fn_create_tree_with_measurement` como admin. Coordenadas UTM 19S convertidas con PostGIS `ST_Transform(32719→4326)`. Especie nueva en catálogo: *Robinia pseudoacacia* (Falsa acacia). Medición: monofuste, DAP/altura/copa/1ª rama del levantamiento.
- Evaluaciones de infraestructura históricas (datos crudos; no evaluado = null). Compuertas por componente ahora admiten null ("No determinado").
- **Riesgo NO cargado ni calculado**: faltan zona objetivo, tasa de ocupación y consecuencias (entradas obligatorias). Ambos "Sin evaluación".
- Total final: 2 árboles (la investigadora indicó no cargar A006–A008 ni conservar los de prueba).

### Casos SINTÉTICOS de demostración de riesgo (DEMO / TEST, 2026-10-06)
- A-000015 (Bajo), A-000016 (Moderado), A-000017 (Alto), A-000018 (Extremo): árboles sintéticos, `lugar_referencia LIKE 'Caso de demostración%'`. Medición plausible, NO medida en terreno. Alta vía `fn_create_tree_with_measurement` (como admin).
- Evaluaciones: entradas validadas con `createTreeRiskAssessmentSchema` y resultado calculado por `evaluarRiesgo` (motor vigente, sin cambios); inserción con service role y el mismo mapeo de columnas del repositorio. Script: scratchpad `demo_risk_cases.ts`. Ningún nivel asignado a mano.
- **Limpieza post-informe** (requiere autorización explícita; orden por FK): `tree_risk_assessments` → `tree_measurements` → `trees` filtrando `tree_id IN (SELECT id FROM trees WHERE lugar_referencia LIKE 'Caso de demostración%')`.

### Pendiente / cuidado
- **Fila de prueba sin borrar**: `tree_risk_assessments`, árbol A-000010, `variables: {"test": true}`, riesgo "Bajo". La investigadora pidió dejarla hasta después de la demo. **Regla explícita suya, vigente para toda sesión futura: ningún `DROP`/`TRUNCATE`/`DELETE` sobre datos o estructuras existentes sin detenerse primero a explicar exactamente la operación.**
- Servidores: frontend `npm run dev` (puerto 5173, CORS backend configurado para ese puerto específico — si Vite toma otro puerto falla el login con "Failed to fetch"), backend `npm run dev` (puerto 3000, tsx watch).
- Congelado explícitamente (no tocar salvo que lo pida): Mantención/Incidencias reales, Infraestructura completa, M04/M05, priorización, sincronización documental completa, optimización de rendimiento profunda.

---

## 🧭 CC-021 — Jerarquía de fuentes de producto (cierre documental, 2026-10-06)

- **Estado:** APROBADO METODOLÓGICAMENTE; cambios documentales sin commit en la rama `docs/cc-021-jerarquia-fuentes` (backend). Pendiente: revisión, PR a `main` y registro de cierre (`CERRADO`, sin implementación).
- **Jerarquía vigente (PR-016 v4.0):** (1) metodología y fuentes vigentes → (2) decisiones controladas ADR/PR/CC → (3) backend + API vigente → (4) documentación vigente → (5) Figma y prototipo histórico, solo intención funcional (PR-001 v3.0) → (6) referencias visuales aprobadas, solo UX/UI.
- El Figma/prototipo histórico conserva valor como evidencia de intención funcional, pero no restablece decisiones posteriormente modificadas, reemplazadas o eliminadas.
- Referencia visual oficial única: `valpo-verde-frontend/docs/referencias/visuales/03_CityDashboardsButton.jpg`. Groundzy retirada. Los diagramas metodológicos no son referencias de UI.
- `clasificacion_prioridad` = resultado metodológico (M05, versión en preparación) que el frontend representa cuando exista el contrato backend. "Priorización" como módulo independiente del Figma histórico no se reconstruye.
- Frontend (sin commit): `CLAUDE.md`, agente `.claude/agents/frontend-ux.md`, `docs/referencias/figma-original/` (8 pantallas) y `docs/referencias/visuales/`.
- Hallazgos INV-1C pendientes (no corregidos): acceso directo a Supabase y especie ficticia de respaldo en `src/api/trees.ts`; revisar `ClassificationBadge.tsx`.

---

## 🎯 Estado de la Tarea: INV-1B VALIDADO EN SUPABASE — LISTO PARA MERGE

> [!IMPORTANT]
> **MIGRACIÓN 006 APLICADA Y VALIDADA EMPÍRICAMENTE EN SUPABASE REAL (`valpo-verde-conecta`).**
> Se ejecutó la batería de 26 pruebas reales contra PostgreSQL, RLS, la función RPC transaccional y los endpoints de Express con 100% de éxito (26/26 pruebas pasadas).
> **NO SE HA HECHO MERGE A `main` NI SE HA INICIADO FRONTEND** (a la espera de la autorización formal de cierre de hito).
> **CC-020 CONTINÚA PENDIENTE** en su tratamiento metodológico (se capturan las 5 categorías operativas aprobadas en el diccionario, pero las reglas/evaluación no se inventan).

### Evidencia Empírica Comprobada en PostgreSQL Real

1. **Tabla `tree_measurements`:**
   - Creada en el esquema `public` con todas las columnas aprobadas en INV-1A/ADR-016.
   - Restricción de integridad referencial FK `tree_id` configurada con `ON DELETE RESTRICT`.

2. **Seguridad RLS y Denegación por Defecto:**
   - **Lectura anónima bloqueada:** Usuario sin autenticación recibe 0 filas.
   - **INSERT directo bloqueado por RLS:** Intentos de inserción directa desde cliente alcanzado por JWT (tanto `admin` como `usuario_municipal`) son rechazados por PostgreSQL:
     `new row violates row-level security policy for table "tree_measurements"`.
   - **UPDATE directo bloqueado:** 0 registros modificados al carecer de política de actualización.
   - **DELETE directo bloqueado:** 0 registros eliminados al carecer de política de borrado físico.
   - Políticas de SELECT aprobadas y activas:
     - `tree_measurements_select_admin` (USING `public.is_admin()`)
     - `tree_measurements_select_municipal` (USING `public.is_municipal_member(t.project_id)`)

3. **Operación Transaccional Atómica y Autorización (`fn_create_tree_with_measurement`):**
   - Configurada como `SECURITY DEFINER` con `SET search_path = public, pg_temp`.
   - **Llamada no autenticada:** Rechazada con excepción `'Usuario no autenticado'`.
   - **Usuario municipal no miembro:** Rechazado con excepción `'No tiene acceso a este proyecto'`.
   - **Usuario inactivo:** Rechazado con excepción `'Usuario inactivo o sin perfil válido'`.
   - **Especie inexistente:** Rechazada con excepción `'Especie no encontrada'`.
   - **Espacio público de otro proyecto:** Rechazado con excepción `'Espacio público no encontrado en el proyecto'`.
   - **Trazabilidad estricta forzada:** `created_by` se asigna automáticamente a `auth.uid()` del usuario que invoca la función (comprobado tanto con admin como con usuario municipal), y `estado_medicion` se fija obligatoriamente a `'valida'`.
   - **Secuencia y código canónico:** Generación correcta de `tree_code` secuencial bajo formato `A-XXXXXX` (ej. `A-000006`).
   - **Resolución PostGIS:** Columna `ubicacion` creada exitosamente como `geography(Point, 4326)` con coordenadas WGS84 canónicas.

4. **Validaciones de Integridad y Diámetros (H-1):**
   - **Alta sin diámetros rechazada en DB:** La RPC rechaza mediciones donde `dap_cm` y `dap_fustes_cm` son nulos (`'La medición inicial requiere al menos un diámetro registrado (dap_cm o dap_fustes_cm)'`).
   - **`numero_fustes = 1` rechazado:** Violación de constraint `chk_tree_measurements_fustes`.
   - **Alta con solo `dap_cm`:** Permitida y validada.
   - **Alta con solo `dap_fustes_cm`:** Permitida y validada con array dimensional coincidente.
   - **Alta con coexistencia de ambos:** Permitida sin XOR forzado.

5. **Atomicidad y Rollback Transaccional:**
   - Se provocó deliberadamente una falla en la inserción de la medición (mismatch de fustes) posterior al `INSERT` del árbol.
   - PostgreSQL realizó un rollback total de la transacción: **cero árboles huérfanos creados** (recuento de `trees` idéntico antes y después del fallo).

6. **Endpoints Backend Reales (Express -> Supabase):**
   - `POST /api/projects/:id/trees` → 201 Created con alta unificada.
   - `GET /api/trees/:treeId` → 200 OK devolviendo ficha completa del árbol y `medicion_actual_estado: 'ok'`.
   - `GET /api/trees/:treeId/measurements` → 200 OK devolviendo historial cronológico de mediciones.
   - `GET /api/projects/:id/trees` (SIG-1) → 200 OK devolviendo la `FeatureCollection` canónica en GeoJSON WGS84.
   - Limpieza segura de datos de prueba completada, retornando la base de datos a su estado limpio inicial.

---

## ⚠️ Decisiones PENDIENTE (Preservadas intactas)
- **H-1 / Mediciones posteriores:** Obligatoriedad de diámetros en mediciones posteriores a la inicial continúa pendiente.
- **CC-020:** Tratamiento metodológico, reglas de transición y cálculo de `clase_edad` por consolidar (categorías operativas capturadas, evaluación pendiente).
- **Categorías definitivas de `configuracion_fustes`:** Se mantiene como `TEXT` abierto.
- **Tratamiento / publicación futura del DAP equivalente:** Pendiente, no se inventó fórmula.
- **Sector / `ubicacion_descriptiva`:** Pendiente.
- **Obligatoriedad / datum / huso de UTM:** Pendiente.
- **Relación MEDICIÓN ↔ INSPECCIÓN:** Pendiente.
- **Permisos futuros de corrección y anulación:** Pendientes de gobernanza (RLS UPDATE/DELETE no implementados).
- **Tratamiento metodológico definitivo del empate de fecha máxima:** Pendiente regla de negocio.
- **Sincronización de `fecha_medicion <= fecha actual` con `DICCIONARIO_CAMPOS`:** Pendiente.
- **No modificar migraciones 001–005 ni fusionar a `main`.**

---

## 📝 Notas de Agentes
- **2026-10-06 — AGY (Gemini):** Migración `006_tree_measurements.sql` aplicada en Supabase por la investigadora. Se completó la validación empírica en PostgreSQL real con 26/26 pruebas exitosas que abarcan RLS, atomicidad, constraints, RPC y endpoints backend Express. 120 tests automáticos pasando. Rama lista para merge a `main` cuando la investigadora lo autorice formalmente.

---

## 🚀 Instrucción Directa para el Siguiente Agente (Prompt de arranque)

> *"Hola. Lee `valpo-verde-frontend/CLAUDE.md` y este HANDOFF completo. La demo de SIVU para la tesis quedó terminada el 2026-10-06 y la investigadora quiere **conservarla tal como está** (datos, código y Supabase) hasta después de presentarla. Cuando ella lo indique, haremos una **auditoría post-demo** para que todo funcione bien. Antes de cambiar nada: `git status` en ambos repos, `npm test` (158) y `npx tsc --noEmit` (backend), `npx tsc -b` y `npm run build` (frontend). Puntos a revisar en la auditoría: (1) conflicto PR-003 v5.0 vs RLS que permite al usuario municipal crear evaluaciones de riesgo/infraestructura y órdenes; (2) backend en rama `docs/cc-021-jerarquia-fuentes` con todo el trabajo de demo sin commit (decidir ramas/commits con ella); (3) migraciones 008 y 009 aplicadas en Supabase; (4) casos sintéticos A-000015…18 (limpieza solo con su autorización); (5) documentación desactualizada (frontend-architecture.md, methodology R02/R03); (6) catálogo de especies leído directo de Supabase; (7) CC-016 (INDICES) y catálogos de tipo/origen de incidencias. NO commit/push/merge ni DELETE/DROP sin autorización explícita."*
