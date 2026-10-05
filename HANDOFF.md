# 🔄 Active Handoff — Valpo Verde Backend

> **Este archivo es un documento de relevo operativo y contexto para agentes. No constituye fuente metodológica. Ante contradicción, prevalecen las fuentes vigentes definidas por PR-002 y docs/workflow.md.**
>
> Fuentes que prevalecen sobre este archivo: Excel metodológico (DICCIONARIO_CAMPOS y demás hojas del paquete), `docs/project-rules.md`, `docs/architecture-decisions.md` (ADR), `docs/methodology/`, `docs/registro-cambios.md` y `docs/workflow.md`. Si algo de este archivo las contradice, el agente debe detenerse y consultar esas fuentes.
>
> Memoria de trabajo compartida entre agentes (**Claude Code**, **AGY / Gemini**, **Warp AI / GPT**). Cada agente la actualiza al terminar su turno; el siguiente la lee al arrancar.

---

## 📌 Metadatos del Relevo
- **Última actualización:** 2026-10-05
- **Agente emisor:** AGY (Gemini)
- **Agente receptor sugerido:** Auditoría / QA / Siguiente iteración (Frontend o INV-1C)
- **Rama Git vigente:** `feature/inv-1b-inventario-arbol-medicion`
- **Ruta del proyecto:** `C:\Users\usuario\code\valpo-verde-backend`
- **Resumen:** INV-1B backend implementado y verificado (10 suites, 103 tests pass) — listo para auditoría

> La línea **Resumen** se muestra en la barra de estado de Claude Code. Mantenerla en una sola línea corta y actualizarla en cada relevo.

---

## 🎯 Estado de la Tarea: INV-1B IMPLEMENTADO Y LISTO PARA AUDITORÍA

Se implementó el backend del primer circuito funcional del Inventario:
`PROYECTO → ALTA DE ÁRBOL → UBICACIÓN WGS84 → ESPECIE → MEDICIÓN DENDROMÉTRICA INICIAL → GUARDAR → FICHA DEL ÁRBOL → MEDICIÓN ACTUAL`.

### Componentes Implementados
1. **Migración `006_tree_measurements.sql` y actualización de `schema.sql`:**
   - Tabla `tree_measurements` desacoplada (PK `UUID`, FK `tree_id` con `ON DELETE RESTRICT`).
   - Restricciones validadas contra `DICCIONARIO_CAMPOS`: `dap_cm > 0`, `numero_fustes >= 2`, `dap_fustes_cm` (array >= 2 coincidente con `numero_fustes`), `altura_primera_rama_m <= altura_total_m`.
   - Índices B-Tree: `idx_tree_measurements_tree_id` e índice parcial `idx_tree_measurements_tree_fecha` filtrado por `estado_medicion = 'valida'`.
   - RLS: Policies `tree_measurements_all_admin`, `tree_measurements_select_municipal`, `tree_measurements_insert_municipal`. Políticas de UPDATE y DELETE no creadas (bloqueadas por decisión de gobernanza).
   - RPC transaccional: `fn_create_tree_with_measurement` con `SECURITY INVOKER` para alta atómica de árbol y medición inicial.
   - Migración legacy (Alternativa A): Cero backfill automático. Columnas dimensionales legacy de `trees` marcadas como deprecadas para nuevas escrituras.
2. **Validación Zod (`src/schemas/tree.schema.ts`):**
   - `initialMeasurementSchema`: validación estricta de medición inicial.
   - `createTreeSchema`: validación de alta unificada (WGS84 lon [-180, 180], lat [-90, 90], `species_id`, etc.).
   - `treeIdParamSchema`: validación de identificador de árbol en parámetros.
3. **Capa Repositories:**
   - `treeMeasurement.repository.ts`: `findMeasurementsByTreeId` y `findLatestValidMeasurementsCandidates` (con mocks en `__mocks__`).
   - `tree.repository.ts`: ampliado con `findTreeById` y `createTreeWithMeasurementRpc` (con mocks en `__mocks__`).
4. **Capa Services (`src/services/tree.service.ts`):**
   - `createTreeForUser`: valida acceso y ejecuta RPC de alta atómica.
   - `getTreeDetailForUser`: consulta ficha de árbol y resuelve `medicion_actual`.
   - `listTreeMeasurementsForUser`: consulta historial ordenado (lectura).
   - `resolveCurrentMeasurement`: implementa lógica estricta sin desempate arbitrario:
     - 0 válidas → `medicion_actual: null`, `medicion_actual_estado: 'sin_mediciones'`.
     - 1 fecha máxima inequívoca → `medicion_actual: obj`, `medicion_actual_estado: 'ok'`.
     - Empate en fecha máxima ($\ge 2$) → `medicion_actual: null`, `medicion_actual_estado: 'error_empate_fecha_maxima'`.
5. **Capa Controllers y Rutas:**
   - `tree.controller.ts`: implementa `createTree`, `getTreeDetail`, `listTreeMeasurements`.
   - `project.routes.ts`: monta `POST /:id/trees`.
   - `tree.routes.ts`: monta `GET /:treeId` y `GET /:treeId/measurements`.
   - `src/routes/index.ts`: monta `/trees`.
6. **Tests y Verificación:**
   - 10 test suites / 103 tests pasando exitosamente (`npm test`).
   - Typecheck limpio sin errores (`npx tsc --noEmit`).
   - Compatibilidad total con SIG-1 (`GET /api/projects/:id/trees`) preservada.

---

## ⚠️ Decisiones PENDIENTE (Preservadas intactas)
- Categorías definitivas de `configuracion_fustes` (se mantuvo como `TEXT` abierto).
- Relación fustes ↔ fórmula de DAP equivalente (no se inventó fórmula).
- Corrección y anulación de mediciones (permisos pendientes, RLS UPDATE/DELETE denegado).
- Obligatoriedad de campos en mediciones posteriores a la inicial.
- Política de especie no determinada y almacenamiento UTM adicional.
- Relación MEDICIÓN ↔ INSPECCIÓN.
- No modificar migraciones 001–005 ni fusionar a `main`.

---

## 📝 Notas de Agentes
- **2026-10-05 — AGY (Gemini):** Implementación completa de INV-1B en la rama `feature/inv-1b-inventario-arbol-medicion`. Todas las pruebas unitarias y de integración pasan (103 tests). No se realizaron commits a `main`.

---

## 🚀 Instrucción Directa para el Siguiente Agente (Prompt de arranque)

> *"Hola. INV-1B está completamente implementado y verificado en la rama `feature/inv-1b-inventario-arbol-medicion`. Lee `HANDOFF.md` y `docs/workflow.md`. Ejecuta `git status` y `npm test` para verificar el estado limpio de las 10 test suites (103 tests pasando). Procede con la revisión/auditoría o con el siguiente hito que autorice la investigadora."*
