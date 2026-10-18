# Auditoría funcional del modelo de datos SIVU — 2026-10-18

> **Documento de evidencia.** Registra las decisiones de la autora tomadas durante la auditoría funcional express del modelo de datos (2026-10-18). Las decisiones se incorporan a la gobernanza mediante **CC-026** (`docs/registro-cambios.md`); las reglas vigentes resultantes viven en `docs/project-rules.md` y `docs/architecture-decisions.md`.
>
> Por decisión de `marybaxmann` (2026-10-18), **lo decidido en esta auditoría es la fuente que prevalece para la plataforma** sobre las versiones anteriores de PR, ADR y CC que la contradicen. Lo que la auditoría no decidió se mantiene como estaba o queda como pendiente ([pendientes.md](pendientes.md)).

## Alcance

- **Archivo auditado:** `Base de Datos SIVU AUDITAR.xlsx` (Excel de la tesis, carpeta `Anexos/`), contrastado con el documento de continuidad de la auditoría anterior.
- **Hojas auditadas:** ARBOLES, REGISTRO_EVALUACION, ORDENES DE TRABAJO, INSPECCIONES, MANTENIMIENTO, LISTAS, CATALOGO_ESPECIES (filas duplicadas), INCIDENCIA (en curso) y, en DICCIONARIO_CAMPOS, las filas de todas ellas.
- **Fuera de alcance:** metodología (M01–M05, R01–R04, índices, umbrales y notas "REVISAR"); REGLAS_INDICADORES y VERSION del Excel maestro del repositorio.
- **Resultado:** copia auditada `Base de Datos SIVU AUDITADO (2026-10-18).xlsx`, generada sin modificar el original y verificada (abre en Excel; cabeceras = diccionario en el mismo orden; sin campos duplicados; sin referencias a nombres antiguos).

## Estado

| Elemento | Estado |
|---|---|
| Decisiones de la autora | Aprobadas (ver [decisiones.md](decisiones.md)); INCIDENCIA, SECTORES, proyectos y Hoja4 con preguntas abiertas |
| CC | **CC-026** — `APROBADO METODOLÓGICAMENTE` |
| Excel maestro del repositorio (`docs/excel/Base de Datos Valpo Verde.xlsx`) | **No modificado.** Su sincronización con la copia auditada queda pendiente (decisión de la autora: actualizar solo la documentación) |
| Código, BD, RLS, migraciones | **No modificados.** La implementación vigente en desarrollo (CC-020, CC-022) no coincide con CC-026 y queda como implementación pendiente |

## Contenido

| Archivo | Finalidad |
|---|---|
| [decisiones.md](decisiones.md) | Decisiones AMD-01 a AMD-30 con su origen en la auditoría y lo que reemplazan |
| [pendientes.md](pendientes.md) | Preguntas abiertas, conflictos por confirmar y sincronizaciones pendientes |

## Identificadores

Para no confundirlos con los de la auditoría de diagramas (D1–D23, N1–N21) ni con los de la postauditoría (DA-01…DA-04, C1–C12), las decisiones de esta auditoría se identifican como **AMD-NN** (Auditoría del Modelo de Datos). Entre paréntesis se conserva la referencia interna de la sesión (D1…D25, bloques A–N).
