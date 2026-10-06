# 🔄 Active Handoff — Valpo Verde Backend

> **Este archivo es un documento de relevo operativo y contexto para agentes. No constituye fuente metodológica. Ante contradicción, prevalecen las fuentes vigentes definidas por PR-002 y docs/workflow.md.**
>
> Fuentes que prevalecen sobre este archivo: Excel metodológico (DICCIONARIO_CAMPOS y demás hojas del paquete), `docs/project-rules.md`, `docs/architecture-decisions.md` (ADR), `docs/methodology/`, `docs/registro-cambios.md` y `docs/workflow.md`. Si algo de este archivo las contradice, el agente debe detenerse y consultar esas fuentes.
>
> Memoria de trabajo compartida entre agentes (**Claude Code**, **AGY / Gemini**, **Warp AI / GPT**). Cada agente la actualiza al terminar su turno; el siguiente la lee al arrancar.

---

## 📌 Metadatos del Relevo
- **Última actualización:** 2026-10-06
- **Agente emisor:** AGY (Gemini)
- **Agente receptor sugerido:** Investigadora (marybaxmann) / Claude Code
- **Rama Git vigente:** `feature/inv-1b-inventario-arbol-medicion`
- **Ruta del proyecto:** `C:\Users\usuario\code\valpo-verde-backend`
- **Resumen:** INV-1B VALIDADO EN SUPABASE — LISTO PARA MERGE (006 aplicada, 26/26 pruebas reales en Postgres OK, 120 tests pass)

> La línea **Resumen** se muestra en la barra de estado de Claude Code. Mantenerla en una sola línea corta y actualizarla en cada relevo.

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

> *"Hola. INV-1B está completamente implementado y validado empíricamente en la base de datos Supabase real en la rama `feature/inv-1b-inventario-arbol-medicion`. Lee `HANDOFF.md` y `docs/workflow.md`. Ejecuta `git status`, `npm test` (120 tests pasando) y `npx tsc --noEmit`. La migración 006 está aplicada y verificada con 26 pruebas en PostgreSQL. A la espera de autorización formal de la investigadora para proceder al merge en main o al hito siguiente."*
