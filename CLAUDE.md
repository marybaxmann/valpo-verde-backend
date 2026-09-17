# Valpo Verde — Instrucciones de proyecto

Punto de entrada. Deliberadamente corto: indica qué leer y qué fuente manda. No repite el contenido de `docs/`.

## Antes de trabajar — orden de lectura

Siempre:

1. `CLAUDE.md` (este archivo);
2. `docs/project-rules.md` — reglas y decisiones vigentes (`PR-*`);
3. `docs/workflow.md` — procedimiento obligatorio para cualquier cambio.

Condicional:

4. `docs/architecture-decisions.md` (ADR) — si la tarea afecta arquitectura, datos, autenticación, permisos, infraestructura técnica o decisiones transversales;
5. `docs/methodology/00-index.md` y el documento metodológico específico — si la tarea afecta evaluación técnica / metodológica;
6. el código / `database/schema.sql` actual — según la tarea, después de comprender las decisiones documentadas;
7. `docs/roadmap.md` — si la tarea puede depender de un pendiente ya detectado (migraciones sin validar, metodología sin cerrar, backend sin implementar). Es un índice de tareas, no una fuente de reglas: ante cualquier diferencia con `project-rules.md`, `architecture-decisions.md` o `docs/methodology/`, esos documentos mandan.

Ninguna decisión es permanente.

---

## Qué fuente manda según el ámbito

### Funcional / UX

1. prototipo propio `marybaxmann/Valpo-Verde-Conecta`;
2. reglas funcionales / documentación vigente del proyecto;
3. Groundzy — referencia visual/UX secundaria;
4. otras referencias.

- `marybaxmann/Valpo-Verde-Conecta` = prototipo navegable / referencia funcional v2.
- `valpo-verde-frontend` = nombre previsto para el frontend productivo futuro. No asumir que hoy son el mismo repositorio.
- El prototipo no define metodología ni estructura definitiva de base de datos.

### Metodología técnica

- Fuente consolidada: `docs/methodology/`. Jerarquía de precedencia: la definida en `docs/methodology/00-index.md`.
- El estado metodológico actual (`vigente` / `vigente parcial` / `pendiente` / `obsoleta`) se consulta **siempre** en `docs/methodology/00-index.md`. No duplicarlo aquí.

---

## Reglas transversales

- **No inventar.** Cuando falte una decisión: implementar solo lo documentado como `vigente` y reportar el bloqueo restante. Una feature no se completa inventando reglas para cubrir una sección pendiente.
- **No usar `database/schema.sql`** como fuente para inventar reglas metodológicas pendientes.
- **Decisiones versionables.** Para cambios de reglas y versionado, seguir exactamente el procedimiento definido en `docs/project-rules.md` y `docs/workflow.md`.

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
