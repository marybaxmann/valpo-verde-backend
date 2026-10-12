# Auditoría postdemo SIVU — octubre 2026

> **Documento de evidencia, no normativo.** Esta carpeta registra hallazgos, decisiones de la autora y pendientes de la auditoría postdemo (2026-10-10 y 2026-10-11).
>
> No reemplaza a `docs/project-rules.md` (PR), `docs/architecture-decisions.md` (ADR), `docs/registro-cambios.md` (CC) ni al paquete metodológico (PR-002). Ante contradicción, mandan esas fuentes (PR-016 v4.0, CC-021).
>
> Nada de lo escrito aquí registra un CC ni aprueba una decisión que la autora no haya aprobado expresamente.

## Estado

| Elemento | Estado |
|---|---|
| Auditoría | Completada en modo de solo lectura; pruebas de escritura **no ejecutadas** |
| Decisiones de la autora | DA-01 **aprobada como principio** · DA-02 **pendiente de diseño** · DA-03 **aprobada como concepto** · DA-04 **pendiente de definición** (ver [decisiones.md](decisiones.md)) |
| CC nuevos | **Ninguno registrado.** Las propuestas (incluida CC-025) están en [decisiones.md §5](decisiones.md#5-propuestas-de-cc-no-registradas) |
| Correcciones de código | Las del frontend y backend del 2026-10-11 (fechas, `GET /api/species`, mapa) están **solo en `feature/demo-sivu`** (`601e9d6` / `8956d6f`), **fuera de `main`** y sin verificar en el navegador |

## Contenido

| Archivo | Finalidad |
|---|---|
| [informe.md](informe.md) | Informe integral: alcance, método, limitaciones, resultados por área, recorridos de punta a punta y lo que funciona bien |
| [hallazgos.md](hallazgos.md) | Registro de todos los hallazgos con ID estable, categoría, prioridad, certeza, evidencia, estado y prueba de confirmación |
| [contradicciones.md](contradicciones.md) | Contradicciones documentales y de gobernanza (C1–C12); C1 y C2 son prioritarias |
| [decisiones.md](decisiones.md) | DA-01 a DA-04 con su estado exacto, decisiones de consolidación del 2026-10-11, alternativas, preguntas y propuestas de CC |
| [dependencias.md](dependencias.md) | Matriz de dependencias entre decisiones y prioridades de ejecución |
| [escenarios-rls.md](escenarios-rls.md) | Escenarios de prueba RLS L1–L5 (ejecutados, solo lectura) y W1–W12 (**NO EJECUTADOS**) |
| [solicitud-logica-datos.md](solicitud-logica-datos.md) | Solicitud a la responsable de la lógica de datos: campos por definir de inspecciones, órdenes de trabajo, mantenimiento e incidencias; matrices de estados; permisos por rol; preguntas abiertas. Documento de trabajo, no normativo |

El **registro maestro de pendientes** está en [`docs/roadmap.md`](../../roadmap.md), sección "Postauditoría 2026-10", siguiendo la convención de `CLAUDE.md`. El **punto de reanudación** para agentes está en [`HANDOFF.md`](../../../HANDOFF.md).

## Aviso: repositorio público

Este repositorio es **público**. S1 (escritura directa contra la base) **no está corregido**. Por eso, aquí se describe a nivel de tipo de problema y de resultado esperado, **sin** identificadores reales de usuarios o proyectos, **sin** sentencias listas para ejecutar y **sin** detalle de permisos por tabla. La versión ejecutable de las pruebas se conserva fuera del repositorio y solo se usará en un entorno de pruebas aislado, con autorización de la autora.

## Referencias cruzadas principales

- **Reglas y decisiones:**
  - PR-002 v2.2, PR-003 v6.0, PR-004 v5.0, PR-009 v2.0, PR-011 v2.0, PR-016 v5.0, PR-018 v2.0.
  - ADR-002, ADR-006 v1.1, ADR-007 v1.1, ADR-012 v1.1, ADR-013, ADR-014 v1.0, ADR-016.
  - CC-015 (EN REVISIÓN), CC-020, CC-021, CC-022 (PROBADO), CC-023, CC-024.
- **Excel maestro** (`docs/excel/Base de Datos Valpo Verde.xlsx`): hojas INSPECCIONES, ORDENES DE TRABAJO, MANTENIMIENTO, INCIDENCIA, USUARIOS, LISTAS (tabla P:X), DICCIONARIO_CAMPOS (REGISTRO_EVALUACION).
- **Backend:** `src/services/rules/treeRisk.ts`, `src/services/authorization.service.ts`, `src/services/moduleRecords.service.ts`, `src/repositories/*`, `src/config/supabase.ts`, `database/migrations/005–011`.
- **Frontend** (`marybaxmann/valpo-verde-frontend`): `src/api/client.ts`, `src/api/cache.ts`, `src/components/InventoryMapView.tsx`, `src/pages/ModulePage.tsx`, `src/pages/ProjectInventoryMap.tsx`, `docs/frontend-architecture.md`.
