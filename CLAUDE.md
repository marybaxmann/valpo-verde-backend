# Valpo Verde — Instrucciones de proyecto

Punto de entrada. Deliberadamente corto: indica qué leer y qué fuente manda. No repite el contenido de `docs/`.

## Antes de trabajar — orden de lectura

Siempre:

1. `CLAUDE.md` (este archivo);
2. `HANDOFF.md` — memoria de relevo entre agentes (estado actual, cambios recientes y bloqueos);
3. `docs/project-rules.md` — reglas y decisiones vigentes (`PR-*`);
4. `docs/workflow.md` — procedimiento obligatorio para cualquier cambio.

Condicional:

4. `docs/architecture-decisions.md` (ADR) — si la tarea afecta arquitectura, datos, autenticación, permisos, infraestructura técnica o decisiones transversales;
5. el paquete metodológico vigente (PR-002), con `docs/methodology/00-index.md` como punto de entrada — si la tarea afecta evaluación técnica / metodológica; si además implica un cambio, `docs/workflow.md` §14 y `docs/registro-cambios.md`;
6. el código / `database/schema.sql` actual — según la tarea, después de comprender las decisiones documentadas;
7. `docs/roadmap.md` — si la tarea puede depender de un pendiente ya detectado (migraciones sin validar, metodología sin cerrar, backend sin implementar). Es un índice de tareas, no una fuente de reglas: ante cualquier diferencia con `project-rules.md`, `architecture-decisions.md` o el paquete metodológico (PR-002), esos documentos mandan.

Ninguna decisión es permanente.

---

## Qué fuente manda según el ámbito

### Producto, funcional y UX

Jerarquía única de fuentes (PR-016 v4.0, CC-021). Ante contradicción manda el nivel superior:

1. metodología y fuentes vigentes (PR-002);
2. decisiones controladas (ADR, PR, CC);
3. backend + API vigente;
4. documentación vigente del proyecto;
5. Figma y prototipo histórico — solo intención funcional (PR-001 v3.0);
6. referencias visuales aprobadas — solo UX/UI.

- `marybaxmann/Valpo-Verde-Conecta` y el Figma original (`valpo-verde-frontend/docs/referencias/figma-original/`) = referencias históricas de intención funcional; no restablecen decisiones posteriormente modificadas.
- Referencia visual principal aprobada: `valpo-verde-frontend/docs/referencias/visuales/03_CityDashboardsButton.jpg`.
- `valpo-verde-frontend` = nombre previsto para el frontend productivo futuro. No asumir que hoy son el mismo repositorio.
- El prototipo no define metodología ni estructura definitiva de base de datos.

### Metodología técnica

- Fuente de verdad: el paquete metodológico versionado definido en PR-002 (Excel maestro con MATRICES_CALCULO, DICCIONARIO_CAMPOS, REGLAS_INDICADORES y VERSION; diagramas de decisión de la misma versión; `docs/methodology/`). No hay precedencia interna: una contradicción entre artefactos es una inconsistencia y se trata como cambio CC (`docs/workflow.md` §14).
- La implementación (BD, backend, API, frontend) deriva del paquete y nunca lo define.
- La versión vigente y el estado de transición se consultan **siempre** en `docs/methodology/00-index.md`. No duplicarlos aquí.

---

## Reglas transversales

- **No inventar.** Cuando falte una decisión: implementar solo lo documentado como `vigente` y reportar el bloqueo restante. Una feature no se completa inventando reglas para cubrir una sección pendiente.
- **No usar `database/schema.sql`** como fuente para inventar reglas metodológicas pendientes.
- **Decisiones versionables.** Para cambios de reglas y versionado, seguir exactamente el procedimiento definido en `docs/project-rules.md` y `docs/workflow.md`; todo cambio que requiera CC (`docs/workflow.md` §14.3) se registra en `docs/registro-cambios.md`.

---

## Arquitectura (orientación; el detalle vive en ADR y `docs/project-rules.md`)

- Frontend React/Vite/TypeScript → API REST → Backend Node/Express/TypeScript → PostgreSQL/Supabase.
- Backend por capas: `routes → controllers → services → repositories`. Lógica metodológica en `services/rules/`.
- Frontend y backend son proyectos independientes. PostgreSQL = verdad de los datos persistidos; backend = verdad de reglas de negocio y cálculos.
- Autorización en dos capas — backend (`authorization.service.ts`) y RLS en Supabase/Postgres — que coexisten; RLS no reemplaza la de backend (ADR-014, PR-018 v2.0).

---

## Roles

Identificadores internos: `admin`, `usuario_municipal`.

La definición vigente de permisos vive en `docs/project-rules.md` (PR-003 y PR-004).

---

## Subagentes

Definidos en `.claude/agents/`: `architect`, `database`, `backend`, `rules-engine`, `qa`.

Usar el mínimo número necesario y no invocarlos todos por defecto.

Fronteras:

- `architect` decide/analiza cambios transversales (incluida la decisión de auth/autorización); `backend` implementa una vez que la decisión está definida.
- `architect` define el impacto transversal y el orden del cambio; `database` diseña e implementa el cambio físico de schema/migraciones.
- `architect` detecta contradicciones y riesgos antes de implementar; `qa` revisa consistencia y regresiones después.
- `rules-engine` calcula; `backend` orquesta, persiste y expone los resultados.

`architect` y `qa` son de solo lectura/análisis (no implementan). Solo se usa `architect` si la tarea cambia decisiones, contratos o varias capas; una implementación ya decidida y localizada va directo al agente especializado. `qa` se limita al alcance del cambio que se le entregue, no al repositorio completo.
 
---
 
## Protocolo de Handoff entre Agentes (Claude ↔ AGY ↔ GPT)
 
- **Lectura obligatoria:** Al iniciar cualquier sesión, lee `HANDOFF.md` para conocer el estado dejado por otros agentes.
- **Preparar Relevo:** Cuando el usuario diga "prepara handoff para [AGY/GPT]" o cuando termines un bloque de trabajo, actualiza `HANDOFF.md` con:
  1. **Objetivo activo** y **Agente receptor sugerido**.
  2. **Qué se hizo en este turno:** archivos creados/modificados y resultado de tests (`npm test`).
  3. **Bloqueos / decisiones pendientes:** reglas que falten o discrepancias detectadas.
  4. **Instrucción directa para el siguiente agente:** redacta el prompt exacto y listo para copiar para que el siguiente agente empiece sin fricción.
