# Registro de hallazgos — Auditoría postdemo 2026-10

Documento de evidencia, no normativo (ver [README](README.md)).

**Convenciones**
- **Prioridad:** Alta · Media · Baja · Info.
- **Certeza:**
  - Alta: código, esquema o consulta leídos.
  - Media: inferencia razonada.
  - Pendiente: requiere verificación en el navegador o en un entorno de pruebas.
- **Estado:**
  - `ABIERTO`
  - `PENDIENTE DE DECISIÓN` (requiere decisión de la autora)
  - `CORREGIDO EN RAMA`: corregido en `feature/demo-sivu` (`601e9d6` backend / `8956d6f` frontend), **no** en `main`, sin verificar en el navegador
  - `CORREGIDO EN MAIN`
  - `INFORMATIVO`
- Un estado documental nunca equivale a una implementación funcional: solo `CORREGIDO EN MAIN` describe código integrado.

**Totales:** 57 hallazgos.
- 11 de la auditoría de frontend (P)
- 29 de la auditoría full stack (S, I, F, A, R, M, T, E)
- 12 contradicciones documentales (C), detalladas en [contradicciones.md](contradicciones.md)
- 5 brechas entre la fuente y la implementación (X)

Antecedente ya integrado en `main`: la auditoría del motor de riesgo del 2026-10-10 (coincidencia con REGLAS_INDICADORES v3; corrección de datos condicionales faltantes, `0397c12`). Ver `HANDOFF.md`, sección "Auditoría del motor de riesgo".

---

## 1. Auditoría de frontend y fechas (2026-10-10 / 2026-10-11)

| ID | Hallazgo | Evidencia | Prior. | Certeza | Estado |
|---|---|---|---|---|---|
| P1 | Fechas calculadas con el día UTC (`toISOString().slice(0,10)`, `created_at.slice(0,10)`). Entre las 21:00 y las 23:59 en Chile (20:00 en invierno) se propone, guarda o muestra el día siguiente; también afecta órdenes "vencidas", la nota de la bitácora y las validaciones de "fecha no futura" del backend | Antes de corregir: `CreateTreeModal`, `InfrastructureAssessmentModal`, `MaintenancePage`, `IncidentsPage`, `TreeModulesSummary`, `ProjectMembersSection`, `ProjectDetail`; backend `tree.schema.ts`, `moduleRecords.schema.ts`, `moduleRecords.service.ts`. Regla aprobada: **hora de Chile (America/Santiago)** | Alta | Alta | CORREGIDO EN RAMA |
| P2 | El mapa de Inventario borraba y volvía a dibujar todos los pines en cada tecla del buscador | `InventoryMapView.syncTreeLayer` + efecto `[features]` | Media | Alta | CORREGIDO EN RAMA (filtro de vista + búsqueda diferida) |
| P3 | Dos sincronizaciones simultáneas de la capa podían duplicar pines | Efectos de inventario y de resumen de riesgo sin encadenar | Media | Pendiente | CORREGIDO EN RAMA (sincronización secuencial); falta verificar en el navegador |
| P4a | El panel del árbol pedía la última evaluación aunque el resumen ya la tenía | `TreeContextualPanel` | Baja | Alta | CORREGIDO EN RAMA |
| P4b | "Ver ficha completa" repetía peticiones ya hechas por el panel | `TreeDetailModal` | Baja | Alta | CORREGIDO EN RAMA (caché por árbol) |
| P4c | El resumen de riesgo traía todo el historial con `variables` y mandaba los ids de todos los árboles en la URL | `treeRiskAssessment.repository` | Media | Alta | CORREGIDO EN RAMA (filtro por proyecto, sin `variables`) |
| P4d | Cualquier escritura vacía toda la caché de lecturas | `api/client.ts` → `clearApiCache` | Baja | Alta | ABIERTO (aceptado por ahora) |
| P4e | Editar o crear un árbol vuelve a pedir el inventario completo | `ProjectInventoryMap` | Baja | Alta | ABIERTO (aceptado por ahora) |
| P5 | Páginas con demasiadas responsabilidades; lógica de carga duplicada | `ModulePage.tsx` (914 líneas, dos módulos), `ProjectInventoryMap.tsx` | Media | Alta | Parcial: índice de riesgo compartido (`lib/risk.ts`) CORREGIDO EN RAMA; división de `ModulePage` ABIERTA (ver M3) |
| P6 | El menú lateral no se adaptaba al tipo de pantalla al cambiar de módulo | `Sidebar.tsx` `useState(initialCompact)` | Baja | Alta | CORREGIDO EN RAMA |
| P7 | El catálogo de especies se leía directo de Supabase, contra la regla "Supabase solo para la sesión" | `api/trees.ts listSpeciesCatalog` (issue #8) | Media | Alta | CORREGIDO EN RAMA (`GET /api/species`); issue #8 sigue abierto |

## 2. Seguridad

| ID | Hallazgo | Evidencia | Prior. | Certeza | Estado | Depende |
|---|---|---|---|---|---|---|
| **S1** | El navegador tiene la clave pública y el JWT del usuario. Las políticas RLS de **escritura** verifican la membresía al proyecto, pero no limitan columnas, valores ni autor, y los roles de la API tienen permisos de tabla amplios. Un miembro podría escribir directo en la base saltándose las reglas del backend: resultados de riesgo no calculados por el motor, columnas protegidas del árbol, bitácoras, autor de los registros, árbol sin medición inicial. **No** puede borrar, cambiar su rol, unirse a otros proyectos ni tocar proyectos ajenos | `pg_policies` (políticas `*_insert_municipal`, `*_update_municipal`); permisos de tabla; escenarios W1–W8 en [escenarios-rls.md](escenarios-rls.md) | **Alta** | Alta (lectura de políticas); pendiente confirmar con W1–W12 | PENDIENTE DE DECISIÓN → DA-01 | DA-01, T1 |
| S2 | Los roles de API (`anon`, `authenticated`) tienen todos los permisos de tabla; la única protección es RLS | Permisos de tabla | Media | Alta | ABIERTO (incluido en DA-01) | DA-01 |
| S3 | Ocho funciones `SECURITY DEFINER` se pueden ejecutar sin sesión (aviso de Supabase); la de alta de árbol sí verifica la sesión internamente | Supabase Advisors (seguridad) | Baja | Alta | ABIERTO | — |
| S4 | Protección contra contraseñas filtradas desactivada; `set_updated_at` sin `search_path` fijo; `spatial_ref_sys` sin RLS (tabla de PostGIS) | Supabase Advisors | Baja | Alta | ABIERTO | — |
| S5 | El backend no limita la tasa de peticiones ni envía cabeceras de seguridad | `src/app.ts` | Baja | Alta | ABIERTO | — |

## 3. Integridad de datos

| ID | Hallazgo | Evidencia | Prior. | Certeza | Estado | Depende |
|---|---|---|---|---|---|---|
| **I1** | Las evaluaciones de riesgo creadas desde la app no guardan quién las hizo: `created_by` no tiene valor por defecto y el repositorio no lo envía. Las 4 actuales tienen autor porque vienen del dataset de demo; las 2 de infraestructura quedaron sin autor | `tree_risk_assessments.created_by` (sin default); `createTreeRiskAssessment` | **Alta** | Alta | PENDIENTE DE DECISIÓN | DA-01, CC-015, DA-02 |
| I1-b | Un usuario municipal no puede leer el nombre de otros usuarios (`user_profiles_select_own`): la ficha muestra inspector "—" en registros creados por otra persona | Escenario L1 ejecutado: 4 evaluaciones y 1 incidencia sin nombre visible | Media | Alta | PENDIENTE DE DECISIÓN (Q7) | — |
| I2 | La bitácora de incidencias es un texto que se lee y se reescribe: dos cambios simultáneos pierden una nota; las entradas no tienen autor; `actualizado_por` se sobrescribe; las órdenes de trabajo no tienen historial | `moduleRecords.service.updateIncidentStateForUser`; `updateMaintenanceState` | Media | Alta | DA-03 (concepto aprobado) | DA-01 |
| I3 | Cualquier estado puede pasar a cualquier otro, incluso volver desde los estados finales; la base no restringe los valores de `estado`; ninguna transición exige datos | `moduleCatalogs.ts` ("La fuente no define transiciones"); sin CHECK en `maintenance.estado` / `incidents.estado` | Media | Alta | DA-04 (pendiente) | CC-015, DA-03 |
| I4 | 11 tablas del modelo inicial sin uso (`inspections`, `photos`, `risk_evaluations`, `audit_log`, etc.) y columnas dendrométricas antiguas en `trees` (sin datos) | Supabase: 0 filas; RLS sin políticas | Baja | Alta | ABIERTO (borrar requiere autorización) | DA-02, DA-03 |
| I5 | La función de alta de árbol valida "fecha no futura" con `CURRENT_DATE` en UTC | `fn_create_tree_with_measurement` | Baja | Alta | ABIERTO (el backend ya valida en hora de Chile en la rama) | DA-01 |

## 4. Funcionales

| ID | Hallazgo | Evidencia | Prior. | Certeza | Estado |
|---|---|---|---|---|---|
| F1 | Si después de guardar un árbol falla la recarga del inventario, el mensaje de error reemplaza todo el mapa y el listado | `ProjectInventoryMap.handleCreateSuccess` → `setError` | Media | Alta | ABIERTO |
| F2 | Ninguna petición tiene tiempo máximo (ni frontend → backend ni backend → Supabase); "Cargando…" puede quedar indefinidamente | `api/client.ts`; repositorios | Media | Alta | ABIERTO |
| F3 | Si la sesión vence no se redirige al login; los cambios de rol o membresía se ven recién al recargar (el backend sí los aplica, con una caché de 60 s) | `api/client.ts`; `useAuth.tsx`; `auth.service.ts` | Baja | Alta | ABIERTO |
| F4 | Si la red se corta después de guardar y el usuario reintenta, se puede duplicar el registro (no hay clave de idempotencia; el botón se desactiva solo mientras guarda) | Formularios de alta | Baja | Media | ABIERTO |

## 5. Accesibilidad y diseño adaptable

| ID | Hallazgo | Evidencia | Prior. | Certeza | Estado |
|---|---|---|---|---|---|
| A1 | Las etiquetas de los formularios no están asociadas a sus campos (0 `htmlFor`; etiquetas como elementos hermanos) | `CreateTreeModal`, `EditTreeModal`, `RiskAssessmentModal`, `MaintenancePage`, `IncidentsPage`… | Media | Alta | ABIERTO |
| A2 | Los modales no se cierran con Escape ni retienen el foco; `Modal.tsx` no tiene `role="dialog"`/`aria-modal` | `components/*Modal*.tsx` | Media | Alta | ABIERTO |
| A3 | El diseño adaptable no se verificó en ancho de teléfono (hay 3 puntos de quiebre en el CSS) | `styles/global.css` | — | Pendiente | ABIERTO (verificar en navegador) |

## 6. Rendimiento

| ID | Hallazgo | Evidencia | Prior. | Certeza | Estado |
|---|---|---|---|---|---|
| R1 | Infraestructura, mantención e índices leen todos los árboles del proyecto para obtener sus ids y luego consultan con esos ids en la URL; no escala a miles de árboles | `moduleRecords.service.projectTreeIds`; `findValidMeasurementsByTreeIds` | Media (al crecer) | Alta | ABIERTO |
| R2 | Avisos de rendimiento: 4 políticas recalculan `auth.uid()` por fila; 10 tablas con políticas permisivas duplicadas; 16 claves foráneas sin índice | Supabase Advisors (rendimiento) | Baja | Alta | ABIERTO |
| R3 | Paquete inicial de 488 KB (141 KB comprimido), aceptable; ArcGIS se carga solo en las pantallas con mapa; cada pantalla con mapa crea su propio mapa | `npm run build` | Info | Alta | INFORMATIVO |
| R4 | El backend crea un cliente de Supabase por petición (diseño intencional y seguro, costo menor) | `config/supabase.ts` | Info | Alta | INFORMATIVO |

## 7. Mantenibilidad

| ID | Hallazgo | Evidencia | Prior. | Certeza | Estado |
|---|---|---|---|---|---|
| M1 | El código HTTP de los errores se decide buscando texto en los mensajes (`msg.includes(...)`); `mapError` traduce cualquier error de clave foránea a "Árbol no encontrado" | `tree.service.ts`, `moduleRecords.service.ts`, `moduleRecords.repository.ts` | Media | Alta | ABIERTO |
| M2 | Comentarios desactualizados que contradicen CC-022 ("solo Administrador", "el servicio exige admin", "admin transversal") | `IncidentsPage.tsx`, `MaintenancePage.tsx`, `moduleRecords.repository.ts`, `fn_create_tree_with_measurement` | Media | Alta | ABIERTO (ver C10) |
| M3 | Componentes grandes: `ModulePage` (914 líneas), `ProjectInventoryMap` (736), `RiskAssessmentModal` (687), `InventoryMapView` (615), `CreateTreeModal` (569) | `wc -l` | Media | Alta | ABIERTO (dividir solo con verificación en navegador) |

## 8. Pruebas, observabilidad y entorno

| ID | Hallazgo | Evidencia | Prior. | Certeza | Estado |
|---|---|---|---|---|---|
| **T1** | Las políticas RLS nunca se prueban automáticamente: las pruebas del backend simulan los repositorios | `tests/**` (`jest.mock`) | **Alta** | Alta | ABIERTO: escenarios preparados en [escenarios-rls.md](escenarios-rls.md) |
| T2 | Faltan pruebas de ruta para la evaluación de riesgo e índices; el frontend no tiene pruebas; ningún repositorio tiene CI | `tests/integration`; ausencia de `.github/` | Media | Alta | ABIERTO |
| T3 | Observabilidad mínima: solo `console.error`, sin registro de peticiones ni identificador de correlación | `error.middleware.ts` | Media | Alta | ABIERTO |
| E1 | El historial de migraciones de Supabase registra solo 007–011 (001–006 se aplicaron a mano); el proyecto de pruebas `valpo-verde-conecta-pruebas` está inactivo | `list_migrations`; `list_projects` | Media | Alta | ABIERTO |

## 9. Brechas entre la fuente y la implementación (DA-02 / DA-04)

| ID | Hallazgo | Evidencia | Prior. | Certeza | Estado |
|---|---|---|---|---|---|
| X1 | `INSPECCIONES.nivel_riesgo` valida contra "Crítica, Alta, Media, Baja" (escala de prioridad, M05), no contra `escala_nivel_riesgo` (Bajo, Moderado, Alto, Extremo; M03/R04) | Validación de datos de la hoja INSPECCIONES; LISTAS P:X | Media | Alta | PENDIENTE DE DECISIÓN (candidato a CC tipo 1) |
| X2 | DICCIONARIO_CAMPOS no tiene filas para INSPECCIONES, INCIDENCIA ni MANTENIMIENTO, y solo 2 para ÓRDENES DE TRABAJO; sus campos no tienen definición formal | DICCIONARIO_CAMPOS (160 filas) | Media | Alta | ABIERTO (sincronizar en el paquete 2.0.0) |
| X3 | Los estados de OT e incidencia, el tipo y el origen de incidencia y la prioridad existen como listas de validación en las hojas, pero no en el catálogo LISTAS P:X (CC-004). La implementación trata tipo y origen como texto libre | Validaciones de las hojas; `moduleRecords.schema.ts` | Media | Alta | PENDIENTE DE DECISIÓN (T-01, T-12) |
| X4 | Las evaluaciones de riesgo e infraestructura no cuelgan de una inspección: contradice REGISTRO_EVALUACION (`id_inspeccion` obligatorio), ADR-007 ("cada evaluación constituye una nueva inspección") y PR-009 v2.0 (borrador, autosave) | `tree_risk_assessments`, `tree_infrastructure_assessments` sin `inspection_id` | Alta | Alta | DA-02 (pendiente de diseño) |
| X5 | No están implementadas las OT de tipo "Inspección" ni la hoja MANTENIMIENTO (ejecución: `ejecutado_por`, `fecha_ejecucion`; revisión: `estado_revision`, `revisado_por`) | `MAINTENANCE_ACTIONS` solo con acciones de mantenimiento; no existe tabla de ejecución | Media | Alta | DA-02 / DA-04 |

## 10. Contradicciones documentales (resumen; detalle en [contradicciones.md](contradicciones.md))

| ID | Resumen | Prior. | Estado |
|---|---|---|---|
| **C1** | Motor de riesgo implementado con reglas de un borrador no publicado, contra PR-011 v2.0 y el estado de transición de `methodology/00-index.md` | **Alta** | PENDIENTE DE DECISIÓN |
| **C2** | ADR-006 v1.1 (vigente) atribuye la evaluación técnica al administrador; contradice CC-022 (PR-003 v6.0, PR-004 v5.0) | **Alta** | PENDIENTE DE DECISIÓN |
| C3 | ADR-014 v1.0 describe RLS en 6 tablas / 15 políticas (anterior a 007–011) | Baja | ABIERTO (revisar junto con DA-01) |
| C4 | `methodology/01–05` (v1.1, transitorios) describen como pendientes reglas que el motor implementa | Baja | Depende de C1 |
| C5 | `HANDOFF.md` con cabecera y estados desactualizados | Media | Corregido en esta rama documental |
| C6 | `README.md` del backend desactualizado (estado, pruebas, contrato) | Media | ABIERTO |
| C7 | `docs/roadmap.md` sin actualizar desde 2026-09-16 | Media | Nota y sección nueva en esta rama; las secciones antiguas no se reescribieron |
| C8 | Frontend `docs/frontend-architecture.md` sin actualizar desde 2026-10-05 | Media | ABIERTO (repositorio frontend) |
| C9 | Frontend `.env.example` con comentario obsoleto | Baja | ABIERTO (repositorio frontend) |
| C10 | Comentarios de código contradictorios con CC-022 (= M2) | Media | ABIERTO |
| C11 | Sincronizaciones del Excel pendientes (CC-022, CC-024) | Media | ABIERTO |
| C12 | Issue #6 ("merge a `main` solo con aprobación"): los merges #16 y #17 ya ocurrieron | Baja | ABIERTO (revisar el tablero) |
