# 🔄 Active Handoff — Valpo Verde Backend

> **Este archivo es un documento de relevo operativo y contexto para agentes. No constituye fuente metodológica. Ante contradicción, prevalecen las fuentes vigentes definidas por PR-002 y docs/workflow.md.**
>
> Fuentes que prevalecen sobre este archivo: Excel metodológico (DICCIONARIO_CAMPOS y demás hojas del paquete), `docs/project-rules.md`, `docs/architecture-decisions.md` (ADR), `docs/methodology/`, `docs/registro-cambios.md` y `docs/workflow.md`. Si algo de este archivo las contradice, el agente debe detenerse y consultar esas fuentes.
>
> Memoria de trabajo compartida entre agentes (**Claude Code**, **AGY / Gemini**, **Warp AI / GPT**). Cada agente la actualiza al terminar su turno; el siguiente la lee al arrancar.

---

## 📌 Metadatos del Relevo
- **Última actualización:** 2026-10-05
- **Agente emisor:** Claude Code
- **Agente receptor sugerido:** AGY — INV-1A (diseño técnico)
- **Rama Git vigente:** `main`
- **Ruta del proyecto:** `C:\Users\usuario\code\valpo-verde-backend`
- **Resumen:** INV-1A — diseño técnico del inventario (CC-020 pendiente de implementación)

> La línea **Resumen** se muestra en la barra de estado de Claude Code. Mantenerla en una sola línea corta y actualizarla en cada relevo.

---

## 🎯 Próximo hito: INV-1A — DISEÑO TÉCNICO DEL INVENTARIO

Traducir el modelo conceptual ya aprobado —**ARBOLES 1:N MEDICIONES_DENDROMETRICAS**— a un diseño técnico compatible con la arquitectura existente (`routes → controllers → services → repositories`, Supabase/PostgreSQL + PostGIS, autorización en dos capas backend + RLS).

INV-1A **no implementa**. Debe preparar, para aprobación posterior:
- modelo físico;
- migración;
- RLS de las entidades afectadas (ADR-014);
- contratos de API;
- alta atómica árbol + medición inicial;
- historial de mediciones (nueva medición, corrección auditada, anulación lógica);
- obtención de la última medición válida y del valor dendrométrico actual derivado.

Durante el diseño **no se cierran decisiones metodológicas pendientes** (ver abajo).

Fuentes a leer: ADR-016, PR-006 v7.0, PR-003 v5.0, `docs/methodology/modelo-arbol-medicion.md`, DICCIONARIO_CAMPOS (ARBOLES y MEDICIONES_DENDROMETRICAS), `docs/workflow.md` §14.12, ADR-010 v2.0, ADR-014, `database/schema.sql` (estado actual, no fuente).

---

## 📌 Estado actual
- **CC-020** (separación ÁRBOL / MEDICIÓN DENDROMÉTRICA) — integrado en `main` por PR #3 (merge `637db1a`; commits `6af04ec`, `15c9994`). Estado: **PENDIENTE DE IMPLEMENTACIÓN**. Especificación de ámbito `operativo`: puede implementarse sin esperar la publicación de 2.0.0 (§14.12), pero la implementación todavía no está autorizada.
- **CC-008** (columna `ambito`, §14.12) — **CERRADO** (sin implementación).
- **CC-009** (validación de `clase_edad`) — **CERRADO** (sin implementación).
- Paquete metodológico 2.0.0: **en preparación, no publicado**; sin `rule_version`. `services/rules/` sigue bloqueado.
- Migraciones `001`–`005` validadas en desarrollo/pruebas (`valpo-verde-conecta`); el entorno productivo aún no existe (ADR-013).
- SIG-1 cerrado: `GET /api/projects/:id/trees` (solo lectura; no expone dimensiones).

**Todavía NO existe:**
- implementación física del modelo ÁRBOL 1:N MEDICIONES_DENDROMETRICAS;
- migraciones, RLS, API ni frontend de INV-1.

`trees` en `schema.sql` conserva columnas dimensionales sobrescribibles (`dap`, `altura_total`, `diametro_copa`, `altura_primera_rama`) que no se ajustan a ADR-016: no escribir en ellas; su tratamiento se define en el diseño de INV-1A.

---

## ⚠️ Decisiones PENDIENTE (no cerrar en INV-1A)
- Categorías definitivas de configuración de fustes, criterio/altura de referencia, relación con `numero_fustes` y regla de DAP equivalente (no implementable). Si, una vez aprobada, la regla de DAP equivalente requerirá publicación del paquete: por decidir.
- Política de especie no determinada, fuente y administración del catálogo de especies, nombres comunes.
- UTM: obligatoriedad, datum, huso y conservación de la coordenada original (ADR-010 v2.0). WGS84 es la ubicación canónica obligatoria.
- Relación MEDICIÓN ↔ INSPECCIÓN (A / B / C) y efecto de corregir o anular una medición usada por una inspección completada (ADR-007).
- Obligatoriedad de los campos en mediciones posteriores a la inicial.
- Tratamiento metodológico de `clase_edad`.
- Correspondencia `sector` / `ubicacion_descriptiva` ↔ comuna, dirección y lugar de referencia.
- Permisos de anulación de mediciones y de corrección por el Usuario municipal.

Reglas permanentes: no inventar reglas; autorización en dos capas (`authorization.service.ts` + RLS, ADR-014, PR-018).

---

## 📝 Notas de Agentes
- **2026-10-05 — Claude Code:** Cierre documental de CC-008, CC-009 y CC-020 tras el PR #3. Sin cambios en `database/`, `src/`, migraciones, RLS, API, frontend, SIG ni Excel.

---

## 🚀 Instrucción Directa para el Siguiente Agente (Prompt de arranque)

> *"Hola AGY. Lee `HANDOFF.md` (contexto operativo, no fuente metodológica), `CLAUDE.md`, `docs/workflow.md` §14 (incluida §14.12), ADR-016, PR-006 v7.0, PR-003 v5.0, `docs/methodology/modelo-arbol-medicion.md` y las filas ARBOLES / MEDICIONES_DENDROMETRICAS de DICCIONARIO_CAMPOS. Prepara el diseño técnico de INV-1A: modelo físico, migración, RLS, contratos de API, alta atómica árbol + medición inicial, historial de mediciones y obtención de la última medición válida. NO implementes ni modifiques código, schema o migraciones. NO cierres ninguna decisión marcada como PENDIENTE: si el diseño la necesita, déjala como punto abierto para la investigadora."*
