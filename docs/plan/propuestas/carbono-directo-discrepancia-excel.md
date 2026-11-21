# Carbono aéreo total (carbono directo): discrepancia pendiente con el Excel maestro

**Estado:** discrepancia metodológica **pendiente de sincronización** con el Excel maestro (DICCIONARIO_CAMPOS, REGLAS_INDICADORES y MATRICES_CALCULO). **No se modificó el Excel.** El código **no sustituye** la metodología documentada: es una **propuesta experimental** pendiente de revisión del equipo (resumen: `carbono-directo-revision-equipo.md`); solo si se aprueba se registra un CC y se sincroniza el Excel.
**Implementación:** rama `feature/carbono-directo` del backend y `feature/carbono-aereo-total` del frontend. Trazabilidad científica: `docs/metodologia/carbono-referencias.md`, sección 4.

## 1. Qué no está en el Excel

| Elemento nuevo | Dónde está hoy | Qué falta en el Excel |
|---|---|---|
| Indicador **carbono aéreo total almacenado** (tallo, ramas, ramillas y hojas; sin raíces), por árbol y cobertura por ámbito | `estimacion_carbono_aereo_total` (ficha B2 y B19) | Fila en INDICES, distinta de la fila 14 (carbono aéreo leñoso), con su unidad (kg C y kg CO₂e por árbol), su uso y su estado («exploratorio») |
| **Tipo de modelo «carbono directo»**: `C = a · DAP^b`, sin densidad ni fracción de carbono | `MODELOS_CARBONO_DIRECTO` en `rules/carbono/modelos.ts` | Hoja o sección de modelos (propuesta en CC-069) con el tipo de modelo |
| **Componente del carbono** (`aerea_lenosa` / `aerea_total`) | `ComponenteCarbono` en `modelos.ts` | Criterio de que cada indicador agrega un solo componente y que no se suman entre sí |
| **Nivel de confianza `propia_no_urbana`** | `NivelConfianza` en `modelos.ts` | Valor nuevo junto a `propia_urbana` y `sustituta_mismo_genero` (CC-069, CC-070) |
| **Estado metodológico del modelo** (aprobado / exploratorio), independiente del nivel de confianza | `EstadoModelo` en `modelos.ts` | Criterio de que solo los aprobados suman a un total |
| **Selección explícita** por componente, especie y estado | `seleccionarModelos` en `modelos.ts` | Regla: dentro de un componente, el modelo aprobado prevalece sobre el exploratorio; nunca dos candidatos iguales |
| Modelos `CRUZ15-C6-QUSA-D` (*Quillaja saponaria*) y `CRUZ15-C6-CRAL-D` (*Cryptocarya alba*) | `modelos.ts` | Parámetros, rangos, n, R², fuente y DOI (sección 4 de `carbono-referencias.md`) |

## 2. Criterios aplicados (decisiones de la responsable, 2026-11-21)

- **Campos de entrada:** los mismos del carbono leñoso: ARBOLES.especie_cientifica (o el nombre del catálogo), ARBOLES.dap_cm (D-18, a 1,30 m), ARBOLES.multifustal (D-15), estado_presencia (D-28), tipo de hoja del catálogo (D-262) y evaluación completa vigente. La altura no interviene.
- **Universo:** presentes con evaluación completa finalizada, OT completada, no anulada y vigente. Las medidas de inspecciones finalizadas cuya OT sigue en ejecución no se usan.
- **Exclusiones:** multifustales (sin suma por fuste ni DAP equivalente), DAP fuera de rango (sin extrapolar), palmeras y especies sin modelo.
- **Resultado:** C en kg y CO₂e = C × 44/12. Sin densidad ni fracción de carbono adicional.
- **Agregado:** solo cobertura (`con_resultado_exploratorio`, `por_modelo`, motivos). Sin total oficial mientras los modelos sean exploratorios. Nunca se suma con el carbono aéreo leñoso.
- **Secuestro anual:** quillay y peumo quedan fuera, ni siquiera como simulación (temporal, hasta tener una metodología fundamentada de crecimiento).

## 3. Al sincronizar

- Registrar un CC con estas decisiones en `docs/registro-cambios.md`.
- Copiar al Excel los elementos de la sección 1 y subir la versión del paquete (VERSION).
- Actualizar este documento y `docs/ESTADO.md`.
