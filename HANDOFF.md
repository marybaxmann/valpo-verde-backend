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
- **Agente receptor sugerido:** Claude Code / Investigadora
- **Rama Git vigente:** `feature/inv-1b-inventario-arbol-medicion`
- **Ruta del proyecto:** `C:\Users\usuario\code\valpo-verde-backend`
- **Resumen:** INV-1B CORREGIDO — 006 LISTA PARA APLICACIÓN (10 suites, 120 tests pass, H-1 implementado, RLS SELECT-only)

> La línea **Resumen** se muestra en la barra de estado de Claude Code. Mantenerla en una sola línea corta y actualizarla en cada relevo.

---

## 🎯 Estado de la Tarea: INV-1B CORREGIDO — 006 LISTA PARA APLICACIÓN

> [!IMPORTANT]
> **INV-1B NO ESTÁ CERRADO NI MERGEADO A MAIN**. La migración `006_tree_measurements.sql` está completamente preparada y corregida en código, pero **NO ha sido ejecutada en Supabase**.
> Se implementaron todas las correcciones solicitadas en la segunda ronda de auditoría de Claude Code.
> **CC-020 CONTINÚA PENDIENTE** en su tratamiento metodológico (se capturan las 5 categorías operativas aprobadas en el diccionario, pero las reglas/evaluación no se inventan).

### Correcciones Aplicadas en esta Ronda (Post-Reauditoría Claude)

1. **H-1 — Diámetro Obligatorio en Medición Inicial:**
   - La medición inicial exige al menos un diámetro registrado: `dap_cm IS NOT NULL OR dap_fustes_cm IS NOT NULL`.
   - **No es XOR:** Se permite solo `dap_cm`, solo `dap_fustes_cm` (con sus campos dependientes coherentes: `numero_fustes >= 2`, array coincidentemente dimensionado), o la coexistencia de ambos. No se prohíbe coexistencia, no se calcula DAP equivalente ni se deriva `dap_cm`.
   - **Ámbito:** Implementado en el esquema Zod (`initialMeasurementSchema.refine(...)`) y dentro de la función de base de datos `fn_create_tree_with_measurement`.
   - **No es CHECK de tabla:** No se configuró como constraint en `tree_measurements` dado que la obligatoriedad de mediciones posteriores continúa pendiente.
   - Si no se provee ningún diámetro en el alta inicial, se rechaza con HTTP 400 Bad Request.

2. **`numero_fustes` Intacto:**
   - Se mantiene estrictamente `numero_fustes >= 2` cuando se registra.
   - `numero_fustes = 1` no está implementado ni permitido (rechazado con HTTP 400).

3. **Eliminación de Regla No Aprobada de Altura:**
   - Se eliminó completamente la restricción `altura_primera_rama_m <= altura_total_m` de:
     - `database/migrations/006_tree_measurements.sql`
     - `database/schema.sql`
     - `src/schemas/tree.schema.ts`
     - Tests asociados (ahora verifican que no se rechace un árbol por esta condición).
   - Se conservan únicamente las validaciones individuales de no-negatividad (`>= 0`) aprobadas.

4. **Estado del Proyecto en la RPC:**
   - Se eliminó de `fn_create_tree_with_measurement` la condición `status = 'activo'` sobre `projects`.
   - La RPC verifica existencia del proyecto (`projects.id = p_project_id`) y membresía/autorización, pero no bloquea proyectos cerrados para el alta inicial (PR-005 no establece dicha prohibición funcional en esta etapa).

5. **Validación de Fecha de Medición:**
   - Se mantiene la validación operacional: formato gregoriano estricto y `fecha_medicion <= fecha actual` (no futura).
   - *Nota operativa:* Este criterio deberá sincronizarse posteriormente con `DICCIONARIO_CAMPOS` para formalizar su explicitud metodológica.

6. **PostGIS y `search_path` de la RPC:**
   - Se verificó mediante inspección de esquema en Supabase que las funciones y tipos de PostGIS (`st_point`, `st_makepoint`, `geometry`, `geography`, `spatial_ref_sys`) residen en el esquema `public`.
   - La RPC `fn_create_tree_with_measurement` mantiene de forma segura:
     `SET search_path = public, pg_temp`
     sin agregar `extensions` innecesariamente.

7. **RLS Estricto y Trazabilidad Real:**
   - La tabla `tree_measurements` cuenta con RLS habilitado y **exactamente 2 políticas de SELECT**:
     - `tree_measurements_select_admin` (USING `public.is_admin()`)
     - `tree_measurements_select_municipal` (USING `public.is_municipal_member(t.project_id)`)
   - **Cero políticas para INSERT, UPDATE o DELETE**: RLS opera con denegación por defecto (`deny-by-default`) para roles autenticados y anónimos. Inserciones directas vía PostgREST quedan impedidas.
   - La inserción inicial de medición se realiza **exclusivamente** mediante `fn_create_tree_with_measurement` (`SECURITY DEFINER`), la cual fija internamente:
     `created_by = auth.uid()`
     `estado_medicion = 'valida'`
     utilizando la identidad de sesión de Supabase (`auth.uid()`) sin parámetros de suplantación.

8. **Mapeo Puntual de Errores DB/RPC:**
   - Errores de PostgreSQL `23502` (violación de NOT NULL) y `22P02` (sintaxis/formato inválido) son mapeados limpiamente a HTTP 400 en el repositorio y servicio, evitando respuestas 500 no controladas.

9. **Configuración `.gitignore`:**
   - Se excluye puntualmente `.claude/launch.json` sin ignorar los agentes versionados en `.claude/agents/`.

10. **Batería de Pruebas Automatizadas:**
    - Se ejecutaron las 10 test suites, alcanzando **120 tests pasando exitosamente** (`npm test`), incluyendo:
      - Alta inicial con solo `dap_cm` (201).
      - Alta inicial con solo `dap_fustes_cm` y dependientes coherentes (201).
      - Alta inicial con coexistencia de ambos diámetros (201).
      - Alta inicial sin ningún diámetro (400).
      - `numero_fustes = 1` rechazado (400).
      - Fechas inexistentes o futuras rechazadas (400).
      - `altura_primera_rama_m > altura_total_m` no rechazada (201).
      - ≥3 mediciones empatadas en fecha máxima resueltas como `error_empate_fecha_maxima` con `medicion_actual: null`.
      - Coexistencia de mediciones anuladas y válidas resuelta inequívocamente.
      - Rutas de mediciones posteriores inexistentes (`POST /api/trees/:treeId/measurements` retorna 404).

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
- **2026-10-06 — AGY (Gemini):** Correcciones de la reauditoría aplicadas completamente. Diámetro obligatorio implementado en alta inicial (H-1), eliminada regla inventada de altura, removida exigencia de estado de proyecto en la RPC, search_path verificado con PostGIS en public, .gitignore corregido y HANDOFF alineado fielmente con el código real. 120 tests pasando. Listo para aplicación de 006 cuando se autorice.

---

## 🚀 Instrucción Directa para el Siguiente Agente (Prompt de arranque)

> *"Hola. INV-1B fue corregido según la reauditoría de Claude Code en la rama `feature/inv-1b-inventario-arbol-medicion`. Lee `HANDOFF.md` y `docs/workflow.md`. Ejecuta `git status`, `npm test` (120 tests pasando) y `npx tsc --noEmit`. La migración 006 está lista para ser aplicada en Supabase una vez autorizada por la investigadora. Recuerda que INV-1B NO debe fusionarse a main."*
