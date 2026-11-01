# Especificación: módulo de carbono aéreo y CO₂ equivalente (B19, v1)

> **Estado:** especificación, sin código. Se implementa cuando estén aprobados CC-069 (método) y, para la densidad en el catálogo, CC-068. Se mantiene **separado** de los indicadores del inventario ya publicados (`src/services/rules/indicadores/inventario.ts` y `especies.ts`), que no se tocan.

## 1. Alcance

- **Calcula por árbol presente:** biomasa aérea seca (kg), carbono aéreo (kg C) y CO₂ equivalente (kg CO₂e).
- **Suma por ámbito** (proyecto o barrio): t C y t CO₂e, con cobertura.
- **No calcula:** raíces, factor urbano 0,8, secuestro anual, biomasa de copa ni palmeras (decisiones 4, 5 y 7; sección 3 de la verificación).

## 2. Fórmulas (decisiones 2 y 3)

- **Volumen por densidad:** `B_kg = V_m3 × ρ_kg_m3`.
- **Modelo directo:** `B_kg` = salida del modelo.
- **Carbono:** `C_kg = B_kg × 0.47`, con la fracción como constante con nombre y referencia (CC-069).
- **CO₂ equivalente:** `CO2e_kg = C_kg × 44 / 12`.
- **Agregados:** `t = Σ kg / 1000`, sumando solo los árboles con resultado. Nunca se rellena un faltante.

## 3. Catálogo de modelos (dato, no código)

**Origen:** una hoja nueva del Excel, `MODELOS_BIOMASA` (CC-069). El backend la copia en `src/services/rules/carbono/modelos.ts`, con una prueba que la compara contra el Excel, igual que `campos_evaluacion_completa.py`.

Cada fila del catálogo:

| Campo | Ejemplo | Nota |
|---|---|---|
| `id` | `UTD-TS7-JAME-DH` | Estable; se guarda con cada resultado. |
| `version` | `1` | Cambia si cambia un coeficiente. |
| `taxon`, `nivel_taxon` | `jacaranda mimosifolia`, `especie` | La clave de especie de B19 (`claveEspecie`). |
| `prioridad` | `local_especie` \| `urbana_especie` \| `urbana_sustituta` \| `urbana_generica` \| `forestal_grupo` | Orden de la decisión 1. |
| `componente` | `aerea` \| `aerea_sin_follaje` | v1 solo usa estas dos. |
| `tipo` | `volumen_x_densidad` \| `directo` | |
| `forma` | `a*D^b*H^c` \| `a*D^b` \| `jenkins_menos_follaje` | Lista cerrada de formas: no se evalúan fórmulas en texto. |
| `a`, `b`, `c`, … | `0.0000801`, `2.18578`, `0.548045` | Copiados de la fuente. |
| `requiere` | `D`, `H`, `rho` | |
| `d_min_cm`, `d_max_cm` | `17`, `60` | Rango de la muestra. |
| `h_min_m`, `h_max_m` | `null` | Solo si la fuente los declara. |
| `admite_multifustal` | `false` | v1: siempre `false` (verificación §2.3). |
| `apto_palmeras` | `false` | |
| `clase` | `APTO` \| `APTO_CON_LIMITACIONES` | Los NO APTO no entran al catálogo. |
| `fuente` | «Pillsbury, Reimer y Thompson 1998, vía UTD TS7 (RDS-2016-0005)» | |

**Densidad (CC-068):** en el catálogo de especies, `densidad_madera_kg_m3`, `densidad_fuente`, `densidad_nivel_taxon` (`especie` \| `genero`) y `densidad_tipo` («masa seca / volumen verde»). Mientras no exista, los modelos `volumen_x_densidad` devuelven `null` con el motivo `falta_densidad`.

## 4. Selección de modelo, por árbol

1. **Presencia:** solo árboles con `estado_presencia = presente` (D-28).
2. **Especie:** `claveEspecie(nombre)` con el nombre del catálogo si hay `species_id` (CC-053). Si devuelve `null`: `especie_no_identificada`.
3. **Palmeras:** si el catálogo dice `tipo_hoja = palmera` (D-262): `palmera_sin_modelo`. Nunca se le aplica una ecuación de dicotiledóneas.
4. **Multifustal:** si `multifustal = true` y el modelo tiene `admite_multifustal = false`: `multifustal_no_admitido`.
5. **Candidatos:** los modelos de esa clave con el componente pedido, ordenados por `prioridad`. Dentro de una misma prioridad, primero la forma con D y H (si hay H) y después la forma solo con D (si se aprueba la regla de la verificación §2.4).
6. **Primer candidato que cumpla:**
   - D presente;
   - H presente si la forma la pide;
   - ρ presente si el tipo es `volumen_x_densidad`;
   - D (y H) dentro del rango.
7. **Si ninguno cumple:** `null` con el motivo del **primer** candidato, el más prioritario: `sin_modelo`, `falta_dap`, `falta_altura`, `falta_densidad` o `fuera_de_rango` (con el rango en el detalle).

## 5. Respuesta (`GET /api/sivu/projects/:id/indicadores`, campo nuevo `carbono_aereo`)

```json
{
  "carbono_aereo": {
    "metodo": { "version": "CC-069 v1", "fraccion_carbono": 0.47, "factor_co2": "44/12", "incluye_raices": false, "factor_urbano": null },
    "cobertura": { "presentes": 0, "con_resultado": 0, "provisionales_en_resultado": null, "motivos": { "fuera_de_rango": 0, "falta_dap": 0, "falta_altura": 0, "falta_densidad": 0, "multifustal_no_admitido": 0, "palmera_sin_modelo": 0, "especie_no_identificada": 0, "sin_modelo": 0 } },
    "total": { "biomasa_aerea_t": null, "carbono_t": null, "co2e_t": null },
    "por_especie": [{ "especie": "Jacaranda mimosifolia", "arboles": 0, "con_resultado": 0, "carbono_t": null, "modelos": ["UTD-TS7-JAME-DH"] }]
  }
}
```

- `total` es `null` si ningún árbol tiene resultado. No es 0.
- `provisionales_en_resultado`: cuántos resultados usan una identificación provisional (migración 032; `null` hasta que exista). Decisión 9.

**Por árbol, en la ficha (B2), campo `carbono_aereo`:**
- con resultado: `{ biomasa_aerea_kg, carbono_kg, co2e_kg, modelo: { id, version, clase, fuente, componente }, entradas: { dap_cm, altura_total_m, densidad_kg_m3 }, identificacion: "confirmada" | "provisional" | null }`;
- sin resultado: `{ valor: null, motivo, detalle }`.

## 6. Errores y bordes

| Caso | Resultado |
|---|---|
| Valor no numérico o ≤ 0 en D, H o ρ | `null`, motivo `dato_invalido` (no debería pasar: la base exige D > 0). |
| Resultado no finito o ≤ 0 (p. ej. Jenkins con D muy chico) | `null`, motivo `resultado_invalido`; se registra en el log. |
| Modelo con forma desconocida en el catálogo | Error al arrancar (la prueba contra el Excel lo detecta antes del despliegue). |
| Proyecto sin árboles presentes | `cobertura.presentes = 0`; totales `null`. |

## 7. Trazabilidad

- Cada resultado lleva `modelo.id`, `modelo.version`, la fuente, las entradas usadas y la identificación.
- La respuesta lleva `metodo.version` y la fecha de consulta: se calcula al consultar, no se guarda (como el resto de B19). No necesita migración.
- Si más adelante se quiere un histórico, se evalúa guardar los resultados por inspección (otro CC).

## 8. Pruebas (cuando se implemente)

- Una prueba por modelo del catálogo con un valor de referencia **calculado a mano** desde la fórmula de la fuente (p. ej. Jacarandá con D = 30 y H = 10 da V = 0,479 m³, B = 234,7 kg, C = 110,3 kg, CO₂e = 404,5 kg, redondeados a 0,1).
- Bordes del rango de D, incluido el límite exacto.
- Cada motivo de `null`.
- Multifustal, palmera, especie solo de género, especie provisional.
- Que los indicadores existentes de B19 no cambian.
- Prueba de sincronía catálogo ↔ Excel.

## 9. Archivos (cuando se implemente)

- `src/services/rules/carbono/modelos.ts`: catálogo.
- `src/services/rules/carbono/calculo.ts`: funciones puras.
- `src/services/sivu/indicadores.service.ts`: agrega el campo `carbono_aereo`.
- Repositorio: leer `multifustal`, `altura_total_m` y, con CC-068, la densidad del catálogo.
- Contrato §6 bis y `coordinacion.md`.
