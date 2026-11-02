# Excel maestro, hoja INDICES: filas 11 a 13 corregidas (propuesta; NO aplicada al Excel)

> Corrección aprobada metodológicamente por Valej el 2026-11-02 (CC-016, historial). El Excel maestro **no se modificó**: estas filas se incorporan en la próxima versión del paquete, junto con su fila en la hoja VERSION.
>
> Regla nueva: los indicadores biométricos usan **solo los árboles presentes con evaluación completa válida y vigente**. Una evaluación completa es una evaluación inicial, una reevaluación o un levantamiento, finalizada, con OT completada (aprobada), no anulada y vigente. El número total de árboles presentes sigue como referencia, y se informa la cobertura de evaluación.

Solo cambian las columnas «Uso en SIVU», «Campos de entrada» y «Método y fuente». Lo demás queda igual («Datos externos»: «No requiere»; «Estado metodológico»: «Resuelto»).

## Fila 11: Distribución por clase diamétrica

| Columna | Texto vigente | Texto propuesto |
|---|---|---|
| Uso en SIVU | Mostrar la distribución de tamaños del arbolado presente por proyecto o barrio (ARBOLES.sector), en Inventario y Dashboard. | Mostrar la distribución de tamaños de los árboles presentes **con evaluación completa válida y vigente**, por proyecto o barrio (ARBOLES.sector), en Inventario y Dashboard, junto con el número de árboles presentes y la cobertura de evaluación. |
| Campos de entrada | ARBOLES.id_arbol; …; ARBOLES.dap_cm; ARBOLES.multifustal; estado_presencia derivado. | (lo mismo) **; INSPECCION.tipo_inspeccion_realizada; INSPECCION.estado_registro; ORDENES DE TRABAJO.estado_ot; evaluación vigente del árbol.** |
| Método y fuente | … Porcentaje por clase = número de árboles de la clase / **Número total de Árboles presentes** × 100. … | Contar individuos **presentes con evaluación completa válida y vigente** por intervalos de DAP: (mismos intervalos). Porcentaje por clase = número de árboles de la clase / **número de árboles evaluados** × 100. Los árboles sin evaluación válida no se cuentan como «Sin DAP»: quedan fuera del universo y se informan como cobertura. Cada individuo cuenta una vez. En multifustales, utilizar dap_cm equivalente según la regla existente. Fuente: inventario de SIVU; intervalos descriptivos propuestos para la plataforma. |

## Fila 12: Diámetro medio de copa

| Columna | Texto vigente | Texto propuesto |
|---|---|---|
| Uso en SIVU | Caracterizar el tamaño promedio de las copas de los árboles presentes por proyecto o barrio … | Caracterizar el tamaño promedio de las copas de los árboles presentes **con evaluación completa válida y vigente**, por proyecto o barrio (ARBOLES.sector), en Inventario y Dashboard. |
| Campos de entrada | ARBOLES.diametro_copa_m; estado_presencia derivado; … | (lo mismo) **; INSPECCION.tipo_inspeccion_realizada; INSPECCION.estado_registro; ORDENES DE TRABAJO.estado_ot; evaluación vigente del árbol.** |
| Método y fuente | Dc_medio = Σ diametro_copa_m / N_validos, donde N_validos es el número de **árboles presentes** con diámetro de copa numérico válido o con copa registrada como No presenta (0 m). … | Dc_medio = Σ diametro_copa_m / N_validos, donde N_validos es el número de árboles presentes **con evaluación completa válida y vigente** que tienen diámetro de copa numérico válido o copa registrada como No presenta (0 m). Los árboles sin evaluación válida no se cuentan como «sin medición». (Resto igual.) |

## Fila 13: Área proyectada de copa

| Columna | Texto vigente | Texto propuesto |
|---|---|---|
| Uso en SIVU | Mostrar la superficie horizontal aproximada de copa por árbol en su ficha y la suma de áreas individuales … | (lo mismo), **solo para árboles con evaluación completa válida y vigente**. |
| Campos de entrada | ARBOLES.diametro_copa_ns_m; ARBOLES.diametro_copa_eo_m; estado_presencia derivado; … | (lo mismo) **; INSPECCION.tipo_inspeccion_realizada; INSPECCION.estado_registro; ORDENES DE TRABAJO.estado_ot; evaluación vigente del árbol.** |
| Método y fuente | Por **árbol presente**: Ac_i = π × (NS/2) × (EO/2). … | Por árbol presente **con evaluación completa válida y vigente**: Ac_i = π × (NS/2) × (EO/2); con copa registrada como No presenta, Ac_i = 0 m². Sin los dos diámetros, sin valor. Para el conjunto: Ac_total = Σ Ac_i. (Resto igual.) |

## Fila propuesta para la hoja VERSION

| version_paquete | rule_version | estado | fecha_publicacion | cc_incluidos | aprobado_por |
|---|---|---|---|---|---|
| (la siguiente que publique Valej, p. ej. la que acumula AM-15/AM-21) | sin cambio (INDICES no afecta al motor de riesgo) | en preparación | — | CC-016 (filas 3 a 13 de INDICES, con la corrección de universos de las filas 11 a 13) | Valej |
