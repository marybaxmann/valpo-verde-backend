# Auditoría funcional del modelo de datos SIVU — 2026-10-18

> **Documento de evidencia.** Registra las decisiones de la autora tomadas durante la auditoría funcional express del modelo de datos (2026-10-18). Las decisiones se incorporan a la gobernanza mediante **CC-026** (`docs/registro-cambios.md`); las reglas vigentes resultantes viven en `docs/project-rules.md` y `docs/architecture-decisions.md`.
>
> Por decisión de `marybaxmann` (2026-10-18), **lo decidido en esta auditoría es la fuente que prevalece para la plataforma** sobre las versiones anteriores de PR, ADR y CC que la contradicen. Lo que la auditoría no decidió se mantiene como estaba o queda como pendiente ([pendientes.md](pendientes.md)).

## Alcance

- **Archivo auditado:** `Base de Datos SIVU AUDITAR.xlsx` (Excel de la tesis, carpeta `Anexos/`), contrastado con el documento de continuidad de la auditoría anterior.
- **Hojas auditadas:** ARBOLES, REGISTRO_EVALUACION, ORDENES DE TRABAJO, INSPECCION (antes INSPECCIONES), MANTENIMIENTO, LISTAS, CATALOGO_ESPECIES, INCIDENCIA, SECTORES, USUARIOS, PROYECTOS y MIEMBROS_PROYECTO (nuevas) y, en DICCIONARIO_CAMPOS, las filas de todas ellas.
- **Fuera de alcance (pendiente):** MATRICES_CALCULO e INDICES, en revisión por la autora; REGLAS_INDICADORES y VERSION del Excel maestro del repositorio.
- **Resultado:** copia auditada `Base de Datos SIVU AUDITADO (2026-10-18).xlsx`, generada sin modificar el original y verificada (abre en Excel; cabeceras = diccionario en el mismo orden; sin campos duplicados; sin referencias a nombres antiguos).

## Estado

| Elemento | Estado |
|---|---|
| Decisiones de la autora | Aprobadas: AMD-01 a AMD-42 (ver [decisiones.md](decisiones.md)). Matrices y reglas: CC-027 ([diferencias-motor.md](diferencias-motor.md)); INDICES pendiente de revisión posterior |
| CC | **CC-026** — `APROBADO METODOLÓGICAMENTE` |
| Excel maestro del repositorio (`docs/excel/Base de Datos Valpo Verde.xlsx`) | **Reemplazado por el Excel auditado (CC-028)**, con la hoja VERSION. Es la única fuente metodológica |
| Código, BD, RLS, migraciones | **No modificados.** La implementación vigente en desarrollo (CC-020, CC-022) no coincide con CC-026 y queda como implementación pendiente |

## Contenido

| Archivo | Finalidad |
|---|---|
| [decisiones.md](decisiones.md) | Decisiones AMD-01 a AMD-42 con su origen en la auditoría y lo que reemplazan |
| [pendientes.md](pendientes.md) | Preguntas abiertas, conflictos por confirmar y sincronizaciones pendientes |
| [diferencias-motor.md](diferencias-motor.md) | Diferencias entre MATRICES_CALCULO / REGLAS_INDICADORES del Excel auditado y el motor del backend (CC-027) |

## Identificadores

Para no confundirlos con los de la auditoría de diagramas (D1–D23, N1–N21) ni con los de la postauditoría (DA-01…DA-04, C1–C12), las decisiones de esta auditoría se identifican como **AMD-NN** (Auditoría del Modelo de Datos). Entre paréntesis se conserva la referencia interna de la sesión (D1…D25, bloques A–N).
