# Reglas del Proyecto para AGY (Antigravity / Gemini)

Este archivo define las pautas de operación para **AGY** dentro de `valpo-verde-backend`.

---

## 1. Fuentes de Verdad y Jerarquía
- **Reglas maestras:** Respeta íntegramente las instrucciones de [CLAUDE.md](file:///C:/Users/usuario/code/valpo-verde-backend/CLAUDE.md) y [docs/project-rules.md](file:///C:/Users/usuario/code/valpo-verde-backend/docs/project-rules.md).
- **Procedimiento de cambio:** Consulta obligatoriamente [docs/workflow.md](file:///C:/Users/usuario/code/valpo-verde-backend/docs/workflow.md) antes de proponer o aplicar modificaciones estructurales.
- **Metodología técnica:** La verdad metodológica reside en el paquete versionado de `docs/methodology/00-index.md` (PR-002). No inventes reglas que no estén documentadas como vigentes.

---

## 2. Memoria Compartida y Handoff
- **Al iniciar cualquier sesión o tarea:** Lee primero [HANDOFF.md](file:///C:/Users/usuario/code/valpo-verde-backend/HANDOFF.md) para sincronizarte con el estado del proyecto, lo que hicieron Claude Code o GPT, y los bloqueos vigentes.
- **Al finalizar un hito o cuando el usuario solicite relevo ("handoff"):**
  Actualiza [HANDOFF.md](file:///C:/Users/usuario/code/valpo-verde-backend/HANDOFF.md) indicando:
  1. Objetivo trabajado.
  2. Archivos modificados/creados y estado de tests (`npm test`).
  3. Dudas, bloqueos o decisiones pendientes.
  4. Instrucción precisa (prompt listo para copiar) para el siguiente agente (Claude o GPT).

---

## 3. Arquitectura y Restricciones Técnicas
- **Stack:** Node.js, Express, TypeScript, PostgreSQL / Supabase.
- **Capas:** `routes` → `controllers` → `services` → `repositories`.
  - La lógica metodológica reside exclusivamente en `services/rules/`.
- **Autorización:** Dos capas estrictas (Backend `authorization.service.ts` y RLS en base de datos). RLS no reemplaza la capa backend (ADR-014, PR-018).
- **Prohibición de invención:** Si falta una definición, reporta el bloqueo en `HANDOFF.md` en vez de improvisar una regla de negocio o alterar `database/schema.sql`.
