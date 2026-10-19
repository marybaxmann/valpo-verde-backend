# Diferencias entre el Excel maestro auditado y el motor del backend — 2026-10-18

> **Documento de evidencia (CC-027).** Registra, sin implementar, las diferencias entre la fuente metodológica vigente y lo que implementa el backend. No se modificaron código, migraciones, RLS ni Supabase.

## Fuente vigente

Por decisión de la autora (M1 = a), la fuente vigente es `Anexos/Base de Datos SIVU AUDITADO (2026-10-18).xlsx`, en sus hojas MATRICES_CALCULO, REGLAS_INDICADORES (hoja nueva, 98 reglas), DICCIONARIO_CAMPOS e INDICES. Desde CC-028, ese contenido es el Excel maestro del repositorio: `docs/excel/Base de Datos Valpo Verde.xlsx`.

El backend (`src/services/rules/treeRisk.ts`, migración 007) implementa una versión anterior: `borrador_reglas_diagramas_v3` más el Excel del 2026-10-06 (contradicción C1 de la postauditoría).

## Diferencias

| ID | Tema | Excel maestro auditado | Backend | Acción |
|---|---|---|---|---|
| DM-01 | R02 Tronco | Máximo 14. Tramos: 0–1 Improbable, 2–4 Posible, 5–7 Probable, 8–14 Inminente. Se eliminó la regla de condición severa ("alguna Severa → mínimo Probable") | Igual; no tenía la regla de condición severa | Coincide |
| DM-02 | R03 Copa | Máximo 8 e **incluye la defoliación** (CR-DEF-01 a 04; clases ICP: ≤10 % Despreciable, >10–25 % Leve, >25–60 % Moderada, >60 % Severa). Tramos: 0–2 Improbable, 3–4 Posible, 5–6 Probable, 7–8 Inminente | Máximo 5, sin defoliación; tramos 0–1 / 2 / 3 / 4–5 | **Actualizar** |
| DM-03 | Etiquetas (M3 = mantener las del maestro) | Consecuencia: "Insignificante". Escala intermedia de M02: "Poco probable" | "Despreciable" e "Improbable" | **Actualizar** |
| DM-04 | Cavidades (RC-CAV y TR-CAV 01 a 10) | SL se usa con cavidad externa = Sí; t/R con cavidad interna = Sí. Reglas 09: interna = "Requiere evaluación instrumental" → No determinado hasta registrar la evaluación instrumental. Reglas 10: externa = Sí e interna = Sí → la categoría más severa entre SL y t/R; si alguna es No determinado, el resultado es No determinado. Validación nueva: con pudrición (basal o de tronco), externa e interna no pueden ser ambas No | t/R se usa siempre que externa = No; sin reglas 09 ni 10 ni la validación | **Actualizar** |
| DM-05 | "No determinado" (CC-024) | Consta en R01–R04 y en el diccionario | Implementado | Coincide |
| DM-06 | M04 Infraestructura | Definida en REGLAS_INDICADORES: IN-GEN-01, IN-VER-01 a 06, IN-CAL-01 a 06, IN-ALC-01 a 05, IN-VRT-01 a 05, IN-RAE-01 a 06, IN-RSU-01 a 07. Puntajes: Sin afectación 0, Leve 1, Moderada 2, Severa 3; No aplica y No determinado se excluyen. P_I% con umbrales <15 / 15–<35 / 35–<65 / ≥65 % → Bajo / Moderado / Alto / Crítico | No implementada | **Implementar** |
| DM-07 | M05 Prioridad | Definida en el maestro | No implementada | **Implementar** |
| DM-08 | Otros cambios con efecto en el backend | Ver la sección siguiente | No implementados | **Implementar** (con CC-026) |
| DM-09 | INDICES | Ver la sección "INDICES" | — | Pendiente de revisión posterior |
| DM-10 | Valores que ya coinciden | Ver la sección "Valores que ya coinciden" | Iguales | Coincide (acota lo que cambia al implementar) |

### Alcance del cambio de etiquetas (DM-03)

El cambio no se limita al motor. "Despreciable" e "Improbable" también aparecen en:

- **Backend:** `src/schemas/treeRiskAssessment.schema.ts`, `tests/services/rules/treeRisk.test.ts` y `docs/project-rules.md`.
- **Frontend** (`valpo-verde-frontend`): `src/types/treeRisk.ts` y `src/components/RiskAssessmentModal.tsx`.
- **Diagrama:** `docs/excel/diagramas/EV. Riesgo - consolidacion (R01-R04, M01-M03).drawio`.

"Despreciable" tiene dos usos distintos:

- Como etiqueta de **consecuencia**, pasa a "Insignificante".
- Como **categoría parcial** de los indicadores (Despreciable / Leve / Moderada / Severa), se mantiene, porque el maestro también la usa en ese sentido.

### Decisiones clave de M04 (DM-06)

- **Alcorque:** la categoría más severa entre suelo sellado, compactación y obstáculos; se evalúa siempre.
- **Infraestructura vertical:** compromiso sin daño = Moderada.
- **Red aérea no eléctrica:** Leve o Moderada según `dano_interferencia_red_aerea`.
- **Red subterránea:** `compromete` = Sí → Severa, haya o no daño. Afectación = No y `compromete` = No determinado → No determinado.

### Otros cambios del maestro con efecto en el backend (DM-08)

Ya registrados en CC-026:

- `clasificacion_riesgo`, `clasificacion_infraestructura` y `clasificacion_prioridad` son ajustables por el Inspector con `justificacion_ajuste_clasificacion`; se conserva el valor calculado (PR-008 v2.0).
- `nivel_riesgo` (hoja INSPECCION) hereda `clasificacion_riesgo`.
- Campos nuevos `fecha_proximo_monitoreo` y `justificacion_ajuste_fecha`; se eliminó `requiere_nueva_inspeccion`.
- `MANTENIMIENTO.resultado` pasa a catálogo, y el cierre automático de la OT exige "Ejecutado completamente".
- Hojas nuevas PROYECTOS y MIEMBROS_PROYECTO.
- Campo nuevo `id_incidencia` en ORDENES DE TRABAJO.
- Toda incidencia entra por el código QR del árbol.

### INDICES (DM-09)

- **Agrupación:** por proyecto (`id_sector`) y por barrio (`ARBOLES.sector`). La densidad se calcula solo por proyecto.
- **Área de copa:** elíptica (diámetro norte–sur × diámetro este–oeste); los árboles sin copa cuentan como 0.
- **Columnas:** se eliminó "Datos faltantes"; el estado metodológico es Pendiente o Resuelto.
- **Estado:** los índices quedan pendientes de una revisión posterior.

### Valores que ya coinciden (DM-10)

Verificados entre el maestro auditado y `treeRisk.ts`. No requieren cambios al implementar:

- **R01:** tramos 0–1 / 2–4 / 5 / 6–9.
- **M01:** completa.
- **M02 y M03:** los valores coinciden; solo difieren las etiquetas (DM-03).
- **Reglas parciales:**
  - RC-EST: 15° / 30° / 45°, con y sin levantamiento.
  - RC-REX 01 a 05.
  - Umbrales de SL (< 20 / 20–< 33 / ≥ 33 %) y de t/R (≤ 0,3 Severa; > 0,3 Moderada) en RC-CAV y TR-CAV 02 a 08.
  - TR-HER, TR-COR (Sí = Moderada), TR-EXU (Sí = Leve), TR-GRI y TR-COD.
  - CR-RSE (< 10 / 10–50 / > 50 %, y No determinado si no hay %), CR-RQU y CR-DES (Sí = Leve).
