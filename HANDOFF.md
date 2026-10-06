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
- **Agente receptor sugerido:** Claude Code (Reauditoría) / Investigadora
- **Rama Git vigente:** `feature/inv-1b-inventario-arbol-medicion`
- **Ruta del proyecto:** `C:\Users\usuario\code\valpo-verde-backend`
- **Resumen:** INV-1B CORREGIDO — LISTO PARA REAUDITORÍA (10 suites, 116 tests pass, RLS SELECT-only, RPC SECURITY DEFINER)

> La línea **Resumen** se muestra en la barra de estado de Claude Code. Mantenerla en una sola línea corta y actualizarla en cada relevo.

---

## 🎯 Estado de la Tarea: INV-1B CORREGIDO — LISTO PARA REAUDITORÍA

> [!IMPORTANT]
> **INV-1B NO ESTÁ CERRADO**. Se corrigieron todas las observaciones de la auditoría de Claude Code. El hito queda en estado `INV-1B CORREGIDO — LISTO PARA REAUDITORÍA`.
> **CC-020 CONTINÚA PENDIENTE** en su tratamiento metodológico (se capturan las 5 categorías aprobadas en el diccionario, pero las reglas/evaluación no se inventan).

### Correcciones Aplicadas Post-Auditoría Claude

1. **Corrección de RLS en `tree_measurements`:**
   - **Eliminada la policy permisiva `tree_measurements_all_admin`** (que otorgaba `ALL` a admin, contradiciendo el diseño que bloquea UPDATE/DELETE).
   - **Admin NO tiene UPDATE ni DELETE ni INSERT directo.**
   - **Usuario municipal NO tiene UPDATE ni DELETE ni INSERT directo.**
   - La tabla `tree_measurements` cuenta con RLS habilitado y **exclusivamente 2 políticas de SELECT**:
     - `tree_measurements_select_admin` (FOR SELECT USING (is_admin()))
     - `tree_measurements_select_municipal` (FOR SELECT USING (is_active_municipal() AND is_project_member(tree_id -> project_id)))
   - **Cero políticas para INSERT, UPDATE, DELETE** para roles autenticados y anónimos. Inserciones directas vía PostgREST quedan bloqueadas físicamente por RLS (código 42501).

2. **Alta Inicial Exclusiva y Trazabilidad (RPC `SECURITY DEFINER`):**
   - La inserción de la medición inicial está autorizada **única y exclusivamente** mediante la función transaccional `fn_create_tree_with_measurement`.
   - Se configuró como `SECURITY DEFINER` (ejecuta como owner de DB para escribir en la tabla restringida) pero con **verificación estricta en profundidad**:
     - Verifica `auth.uid() IS NOT NULL` (o parámetro equivalente validado).
     - Valida perfil activo y rol del usuario (`is_active_municipal()` o `is_admin()`).
     - Valida membresía activa en el proyecto (`is_project_member(project_id)`).
     - Valida existencia de especie y proyecto activo.
     - Valida fecha gregoriana válida y no futura.
     - Fuerza estrictamente `created_by = v_user_id` y `estado_medicion = 'valida'`. El usuario no puede suplantar autor ni insertar mediciones pre-anuladas.
   - **Mediciones posteriores NO están autorizadas, no tienen endpoint, ni política INSERT directa ni RPC en backend.**

3. **Corrección de Restricciones de Diámetros:**
   - **Eliminada la restricción de exclusión mutua (XOR)** entre `dap_cm` y `dap_fustes_cm`.
   - Si `dap_cm` está presente: `dap_cm > 0`.
   - Si `dap_fustes_cm` está presente: cada elemento debe ser `> 0` (`NOT (0 >= ANY(dap_fustes_cm))`).
   - Si `numero_fustes >= 2`: exige obligatoriamente `dap_fustes_cm IS NOT NULL` y `array_length(dap_fustes_cm, 1) = numero_fustes`.
   - Se permite árbol sin diámetros registrados en la medición si no se midió.

4. **Alineación de Dominio `clase_edad` (Fila 26 `DICCIONARIO_CAMPOS`):**
   - Valores aprobados en el diccionario: `'Joven'`, `'Semimaduro'`, `'Tempranamente maduro'`, `'Maduro'`, `'Sobremaduro'`.
   - Alineado tanto en el CHECK constraint de SQL como en el esquema Zod (`CLASE_EDAD_VALUES`).
   - Se mantiene como opcional. Su tratamiento metodológico y reglas continúan PENDIENTES bajo **CC-020**.

5. **Validación Estricta de Fechas y Mapeo de Errores DB/RPC:**
   - Esquema Zod valida calendario gregoriano estricto (rechaza fechas inválidas como `2026-02-31` y fechas futuras `> hoy`).
   - Errores previsibles de base de datos y RPC (`23503`, `23514`, violaciones de constraints, mensajes de `RAISE EXCEPTION`) son capturados en repositorio/servicio y mapeados a `AppError` con códigos HTTP apropiados (400, 401, 403, 404), evitando 500 no controlados.

6. **Resolución de `medicion_actual` (INV-1A):**
   - 0 mediciones válidas → `null` (`sin_mediciones`).
   - 1 fecha máxima inequívoca → medición actual (`ok`).
   - $\ge 2$ mediciones válidas compartiendo la fecha máxima → `null` (`error_empate_fecha_maxima`), sin desempate arbitrario.
   - Mediciones anuladas son ignoradas por el índice parcial y la consulta de candidatas.

7. **Pruebas y Verificación:**
   - Se ampliaron los tests unitarios y de integración:
     - Alta con medición sin diámetros (201).
     - Validación estricta de fecha gregoriana y fechas futuras (400).
     - Validación de `clase_edad` permitidas (201) y no permitidas (400).
     - Validación de `numero_fustes >= 2` sin `dap_fustes_cm` (400).
     - Validación de `dap_fustes_cm` con valores no positivos (400).
     - Caso de $\ge 3$ mediciones válidas empatadas en fecha máxima.
     - Manejo de mediciones anuladas coexistiendo con válidas.
     - Verificación de rutas inexistentes/prohibidas (`POST /api/trees/:id/measurements` retorna 404).
     - Mapeo limpio de errores de RPC a 400.
   - **Total tests:** 10 test suites, 116 tests pasando exitosamente.
   - **Typecheck:** `npx tsc --noEmit` limpio (0 errores).

---

## ⚠️ Decisiones PENDIENTE (Preservadas intactas)
- **CC-020:** Tratamiento metodológico y reglas de `clase_edad` por consolidar (categorías capturadas, evaluación pendiente).
- **Categorías definitivas de `configuracion_fustes`:** Se mantiene como `TEXT` abierto.
- **Relación fustes ↔ fórmula de DAP equivalente:** Continúa pendiente, no se inventó fórmula.
- **Corrección y anulación de mediciones:** Permisos y flujos pendientes de gobernanza (RLS UPDATE/DELETE completamente denegado).
- **Mediciones posteriores:** Flujo no autorizado en INV-1B.
- **Política de especie no determinada y almacenamiento UTM adicional:** Pendientes.
- **Relación MEDICIÓN ↔ INSPECCIÓN:** Pendiente.
- **Tratamiento metodológico definitivo del empate de fecha máxima:** Pendiente regla de negocio.
- **No modificar migraciones 001–005 ni fusionar a `main`.**

---

## 📝 Notas de Agentes
- **2026-10-05 — AGY (Gemini):** Corregidas todas las observaciones de la auditoría de Claude Code sobre la rama `feature/inv-1b-inventario-arbol-medicion`. RLS endurecido a SELECT-only, RPC con `SECURITY DEFINER` y validaciones en profundidad, constraints de diámetros y clase_edad alineados con el Excel metodológico, validación gregoriana de fechas, y tests ampliados a 116 tests pasando. Listo para reauditoría.

---

## 🚀 Instrucción Directa para el Siguiente Agente (Prompt de arranque)

> *"Hola. INV-1B fue corregido tras la auditoría de Claude Code y se encuentra en la rama `feature/inv-1b-inventario-arbol-medicion`. Lee `HANDOFF.md` y `docs/workflow.md`. Ejecuta `git status` y `npm test` para verificar el estado limpio de las 10 test suites (116 tests pasando) y `npx tsc --noEmit`. Procede con la reauditoría de INV-1B. Recuerda que INV-1B NO debe fusionarse a main hasta la aprobación formal de la investigadora."*
