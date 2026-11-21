# Secuestro anual de CO₂: cambios propuestos al Excel maestro (decisión D, pendiente)

**Estado:** propuesta para revisión. **No se modificó el Excel ni la fila 15 de INDICES.**
**Implementación relacionada:** rama `feature/secuestro-anual` del backend y del frontend (decisiones A, B y C aprobadas por la responsable el 2026-11-20).

## 1. Fila 15 de INDICES («Secuestro anual de carbono»)

| Columna | Hoy | Propuesta |
|---|---|---|
| Resultado | Secuestro anual de carbono | Secuestro bruto anual de CO₂ |
| Unidad | kg C/año por árbol; t C/año por sector o proyecto | **kg CO₂/año por árbol**; kg CO₂/año por sector o proyecto (solo estimaciones fundamentadas). Se informa también en kg C/año |
| Uso en SIVU | Mostrar la estimación… cuando se valide el método | Ficha del árbol: estimación fundamentada (valor), simulación exploratoria (rango, rotulada) o no estimable (motivo). Vista del proyecto: total de las estimaciones fundamentadas y cuántos árboles tienen simulación o no pueden estimarse. Las simulaciones nunca se suman |
| Campos de entrada | Por confirmar | ARBOLES.especie_cientifica; ARBOLES.dap_cm; ARBOLES.altura_total_m; ARBOLES.multifustal; exposicion_luminica_copa_cle (D-88) y muerte_regresiva_copa_pct (D-89) de la evaluación vigente; estado_presencia; evaluación completa vigente |
| Datos externos | Ecuaciones de biomasa, modelo de crecimiento y parámetros ambientales | Modelos de volumen y densidades del carbono almacenado (CC-069, CC-070); categorías de crecimiento y factores de CLE de i-Tree Eco (Nowak 2024, pp. 44-45); categoría de crecimiento aprobada por especie (hoy ninguna) |
| Método y fuente | Base conceptual de i-Tree Eco | C₀ = carbono aéreo leñoso con el DAP vigente (función del carbono almacenado, sin cambios). ΔDAP = tasa de la categoría (0,58 / 0,84 / 1,09 cm/año) × factor CLE (0-1: 0,44; 2-3: 0,56; 4-5: 1) × (1 − muerte regresiva). C₁ = la misma función con DAP + ΔDAP y la misma altura. Secuestro = (C₁ − C₀) × 44/12. Sin ajuste por días libres de heladas. Ambos DAP dentro del rango del modelo; multifustales excluidos. Fundamentada solo con categoría aprobada para la especie; si no, simulación con las tres categorías |
| Fecha de referencia | Período anual | Fecha de la evaluación vigente; período: el año siguiente a esa medición |
| Estado metodológico | Pendiente | **Parcial**: implementado como simulación exploratoria; sin estimaciones fundamentadas hasta aprobar categorías por especie |

## 2. Otros registros

- **CC nuevo** en `docs/registro-cambios.md` con las decisiones A, B y C del 2026-11-20 y la referencia a esta rama.
- **Fila 14 (carbono almacenado):** sigue «Pendiente» aunque CC-069 está implementado. Su sincronización es la decisión D2 de indicadores, independiente de esta.
- **VERSION:** subir la versión del paquete cuando se copien estos cambios.

## 3. Lo que queda fuera

- Categorías de crecimiento por especie: requieren una fuente aprobada por especie.
- Ajuste por temporada para Valparaíso, proyección de la altura y modelos para *Ulmus minor*, *Acer negundo* y *Quillaja saponaria*.
