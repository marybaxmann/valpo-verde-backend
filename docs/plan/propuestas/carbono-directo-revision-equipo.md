# Carbono aéreo total de quillay y peumo: resumen para la revisión del equipo

| | |
|---|---|
| **Estado** | **Propuesta experimental.** No forma parte de la metodología vigente. |
| **Implementación** | Backend PR #94 (`feature/carbono-directo`) y frontend PR #37 (`feature/carbono-aereo-total`), ambos en borrador. **No se fusionan ni se despliegan** hasta que el equipo apruebe la propuesta. |
| **Excel maestro** | Sin cambios. Sus reglas vigentes no se sustituyen. |
| **Fecha** | 2026-11-21 |

En este documento se distinguen tres niveles:
- **Metodología vigente:** lo aprobado en el Excel maestro y en los CC.
- **Propuesta experimental:** lo implementado en las ramas para probarlo.
- **Decisión pendiente:** lo que el equipo debe resolver.

## 1. Qué permanece intacto (metodología vigente)

- **Carbono aéreo leñoso (CC-069 v1 y CC-070).**
  - Se conservan los modelos de volumen, las densidades, la fracción 0,47, la cadena V × ρ × 0,47 × 44/12, los rangos y las exclusiones.
  - En el Piloto sigue dando 141 kg C con 3 árboles de modelo aprobado, más 22 exploratorios que no suman.
- **Secuestro anual.**
  - Mismo cálculo y mismos resultados: 25 simulaciones y 24 no estimables.
  - `secuestro.ts` no se modificó.
  - Quillay y peumo siguen como «sin modelo».
- **Datos.** No hay migraciones ni cambios en la base de datos, las OT o la vigencia de las inspecciones.
- **Excel.** Las filas 14 y 15 de INDICES siguen como están.

## 2. Qué agrega la propuesta experimental

| Elemento | Propuesta |
|---|---|
| Indicador | **Carbono aéreo total almacenado**: tallo, ramas, ramillas y hojas; sin raíces. Va en un indicador aparte (`estimacion_carbono_aereo_total`) y nunca se suma con el carbono leñoso. |
| Tipo de modelo | **Carbono directo**: `C = a · DAP^b`, en kg. No se aplican densidad ni fracción 0,47. CO₂e = C × 44/12. |
| Modelos | *Quillaja saponaria*: a 0,0736, b 2,251, DAP 5 a 41 cm, n 80, R² 0,95. *Cryptocarya alba*: a 0,0675, b 2,352, DAP 5 a 37 cm, n 82, R² 0,95. |
| Clasificación | Confianza `propia_no_urbana` (por el origen de la ecuación) y estado `exploratorio` (por su aplicación en SIVU). |
| Selección | Por componente, especie y estado. Una especie puede tener modelos en ambos componentes; dentro de un componente, el modelo aprobado prevalece y no puede haber dos candidatos iguales. |
| Agregado del proyecto | Solo informa la cobertura; no hay total oficial. |
| Vista | La ficha muestra el carbono aéreo total, el CO₂e, los componentes incluidos y excluidos, el rótulo «Exploratorio» y la referencia. La vista del proyecto agrega una nota de cobertura. |

## 3. Evidencia para la revisión

- **Bibliografía, parámetros y limitaciones:** `docs/metodologia/carbono-referencias.md`, sección 4.
  - Fuente: Cruz et al. 2015, *Bosque* 36(3), 375-381, doi:10.4067/S0717-92002015000300005.
  - Fuente complementaria: Cruz et al. 2014, informe OTERRA.
- **Resultados del Piloto:** obtenidos con la API local contra la base de pruebas, en solo lectura.

| Árbol | DAP (cm) | kg C | kg CO₂e |
|---|---|---|---|
| A-000543 (quillay) | 6,9 | 5,69 | 20,86 |
| A-000554 (quillay) | 8,9 | 10,09 | 37,00 |
| A-000568 (quillay) | 18,4 | 51,76 | 189,78 |
| A-000537 (peumo) | 7,8 | 8,46 | 31,03 |

  - Excluidos por multifustales: A-000538, A-000540 y A-000558.
  - Fuera del universo por no tener medidas vigentes (OT en ejecución): A-000562 a A-000565.
- **Pruebas:** 1.890 en verde. Cubren los valores de referencia, la ausencia de doble conversión (C = a·D^b exacto), los rangos, las exclusiones, la no regresión del carbono leñoso y del secuestro, y la ausencia de doble conteo.
  - Archivo principal: `tests/services/rules/carbono/carbonoAereoTotal.test.ts`.
- **Diferencias con el Excel:** `carbono-directo-discrepancia-excel.md` lista los campos y criterios nuevos.

## 4. Decisiones pendientes del equipo

1. **Indicador.** ¿Se incorpora el carbono aéreo total, con follaje, como indicador distinto del leñoso? Si se aprueba, requiere una fila nueva en INDICES.
2. **Tipo de modelo.** ¿Se admite el carbono directo junto a la cadena de volumen, densidad y fracción de carbono?
3. **Modelos y parámetros.** ¿Se aprueban las ecuaciones de Cruz et al. 2015 para quillay y peumo, con sus rangos?
4. **Clasificación.** ¿Se agrega el nivel `propia_no_urbana`? ¿Los modelos quedan exploratorios (sin total) o aprobados, con un total propio que nunca se suma al leñoso?
5. **Regla de selección.** ¿Se aprueba elegir por componente, especie y estado, con prevalencia del modelo aprobado?
6. **Multifustales.** Hoy se excluyen. ¿Se mantiene la exclusión o se define un tratamiento?
7. **Secuestro anual de quillay y peumo.** Queda fuera hasta que exista una propuesta fundamentada de crecimiento, que pasará por el mismo procedimiento.
8. **Presentación.** ¿Se aprueba cómo se muestra en la ficha y en el proyecto (PR #37)?
9. **Formalización.** Si se aprueba: registrar un CC, sincronizar el Excel y subir la versión del paquete. Solo después se fusiona y se despliega.
