# Pendientes — Auditoría del modelo de datos 2026-10-18

Nada de lo listado aquí está decidido. Los conflictos P1–P9 son puntos donde una regla vigente del repositorio no coincide con el Excel auditado, pero la auditoría no tomó una decisión explícita sobre ellos.

## Conflictos por confirmar

| ID | Conflicto | Regla vigente | Excel auditado |
|---|---|---|---|
| P1 | Ubicación del árbol | ADR-010 v2.0 / PR-006 v7.0: ubicación canónica WGS84 (`ubicacion_wgs84`) obligatoria; UTM, datum y huso pendientes | Coordenadas UTM de ingreso manual y obligatorias; `huso` = 19S y `datum` = WGS84 fijos (AMD-12) |
| P2 | Nombre común | PR-006 v7.0: `nombre_comun` vive solo en el catálogo de especies | `nombre_comun` es un campo del árbol, obligatorio para finalizar (AMD-11) |
| P3 | Entidad de mediciones | ADR-016 v1.0: entidad `MEDICIONES_DENDROMETRICAS` con corrección y anulación lógica | Dimensiones en ARBOLES con versiones por inspección (AMD-06). La auditoría no decidió sobre corrección ni anulación de una medición |
| P4 | Configuración de fustes | CC-020: `multifustal` reemplazado por `configuracion_fustes`; fórmula de DAP equivalente pendiente | Conserva `multifustal`, `numero_fustes`, `dap_fustes_cm` y la fórmula de `dap_cm` (no auditada: metodología) |
| P5 | Clase de edad | CC-009 / CC-020: opcional, en mediciones | Obligatoria en ARBOLES |
| P6 | Cumplimiento de distancia BT/MT | CC-017 (ubicación de la regla, DETECTADO) | Con varias redes aéreas, la distancia registrada es la menor de todas; si una red no eléctrica está más cerca, el cumplimiento se evalúa con esa distancia (error conservador). No se modificó el umbral |
| P7 | Identificadores internos de rol | `admin`, `usuario_municipal` | Faltan los de Inspector y Encargado de mantención. Resuelto (AMD-31): el rol es global (`USUARIOS.Rol`) y un usuario puede pertenecer a varios proyectos |
| P8 | Columna `ambito` de DICCIONARIO_CAMPOS | CC-008 | El Excel auditado no tiene esa columna; los campos nuevos de CC-026 no tienen ámbito asignado |
| P9 | Límite de fotografías | PR-010 v1.0: hasta 20 por árbol | La auditoría no fijó límite (varias por árbol e inspección) |

## Preguntas de la auditoría (resueltas)

| ID | Pregunta | Resolución |
|---|---|---|
| P10 | ¿Toda incidencia entra por el código QR de un árbol? | Sí (AMD-34) |
| P11 | Textos de celda de INCIDENCIA (N4–N11) | Aplicados (AMD-34) |
| P12 | SECTORES: un único sector por proyecto | Sí (AMD-32) |
| P13 | Hojas de proyectos y membresía | Agregadas: PROYECTOS y MIEMBROS_PROYECTO (AMD-31) |
| P14 | Hoja4 | Eliminada (AMD-33) |

## Pendiente de auditoría

| ID | Pendiente |
|---|---|
| P15 | MATRICES_CALCULO y REGLAS_INDICADORES: revisados; fuente vigente el Excel auditado. Diferencias con el motor registradas en CC-027 ([diferencias-motor.md](diferencias-motor.md), DM-01 a DM-08) |
| P16 | INDICES: agrupación, área de copa y estado metodológico registrados (DM-09); los índices quedan pendientes de una revisión posterior |

## Sincronizaciones pendientes (CC-026)

- Excel maestro del repositorio (`docs/excel/Base de Datos Valpo Verde.xlsx`): incorporar lo auditado conservando REGLAS_INDICADORES y VERSION. Por decisión de la autora, en esta etapa solo se actualiza la documentación.
- Implementación (BD, RLS, backend, frontend): permisos por rol según AMD-01 a AMD-05; alta municipal sin medición; inspección con `estado_registro`; vigencia por `fecha_completada_ot`; revisión de mantenimiento. No autorizada todavía.
- Metodología: sin cambios; sigue rigiendo C1 de la postauditoría.
