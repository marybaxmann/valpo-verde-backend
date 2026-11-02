# Carbono aéreo leñoso: referencias bibliográficas y cómo se aplican

> Documento de trazabilidad de la estimación de carbono de SIVU (B19 y ficha del árbol B2). Registra **de dónde sale cada número** y **cómo se usa en el cálculo**. Decisiones: CC-069 v1 (método general) y CC-070 (modelo sustituto para *Acer pseudoplatanus*). Código: `src/services/rules/carbono/modelos.ts` y `calculo.ts`.
>
> **Qué estima SIVU:** **carbono aéreo leñoso almacenado** en el árbol, con la medición vigente (tronco y ramas, sin raíces ni follaje). **No estima el secuestro anual** (carbono capturado por año; INDICES fila 15, «Pendiente»), porque requiere dos mediciones del mismo árbol separadas en el tiempo.

## 1. Cadena de cálculo (igual para todos los modelos)

| Paso | Fórmula | Unidad | Fuente |
|---|---|---|---|
| 1. Volumen | `V = a · DAP^b · H^c` (variante con altura) o `V = a · DAP^b` (solo DAP) | m³ por árbol; DAP en cm; H en m | Ecuación del modelo (sección 3) |
| 2. Biomasa aérea leñosa | `B = V × ρ` | kg de materia seca | ρ = densidad básica (masa seca / volumen verde), sección 3 |
| 3. Carbono | `C = B × 0,47` | kg de C | IPCC 2006 (sección 2) |
| 4. CO₂ equivalente | `CO₂e = C × 44/12` | kg de CO₂ | Razón de masas molares CO₂/C (estequiometría) |

La densidad se aplica **una sola vez** (paso 2). No hay factor urbano, ni raíces, ni corrección de corteza (CC-069, decisión 4). Fuera del rango de la ecuación el resultado es `null` con su motivo, sin extrapolar (decisión 7). Los multifustales no se estiman (decisión 6).

## 2. Referencias generales

1. **IPCC 2006.** *2006 IPCC Guidelines for National Greenhouse Gas Inventories*, Vol. 4 (Agriculture, Forestry and Other Land Use), cap. 4, tabla 4.3. — **Aplicación:** fracción de carbono **0,47** de la biomasa seca, valor por defecto, no específico de la especie (paso 3). Estado: cita tomada de CC-069 («por verificar en el original»).
2. **McPherson, E. G.; van Doorn, N. S.; Peper, P. J. 2016** (actualizado 2020-01-21). *Urban tree database.* Fort Collins, CO: Forest Service Research Data Archive. https://doi.org/10.2737/RDS-2016-0005 — **Aplicación:** coeficientes métricos (TS7) y densidades (TS9) de los modelos de *Jacaranda mimosifolia* y *Liquidambar styraciflua*.

## 3. Referencias por modelo

### 3.1 *Jacaranda mimosifolia* y *Liquidambar styraciflua* (CC-069 v1; confianza «propia_urbana»)

3. **Pillsbury, N. H.; Reimer, J. L.; Thompson, R. P. 1998.** *Tree volume equations for fifteen urban species in California.* Urban Forest Ecosystems Institute, California Polytechnic State University (tablas 6, 7 y 8).
   - **Aplicación:** ecuaciones de volumen de la propia especie (variantes con altura y solo DAP) y rangos de DAP y altura (tabla 8, convertidos a cm y m). Densidad: 490 kg/m³ (Jacarandá) y 460 kg/m³ (Liquidámbar), de la UTD TS9.
   - Modelos: `UTD-TS7-JAME-DH`, `UTD-TS7-JAME-D`, `UTD-TS7-LIST-DH`, `UTD-TS7-LIST-D`. Detalle en `docs/plan/propuestas/carbono-modelos-apto-especificacion.md`.

### 3.2 *Acer pseudoplatanus* (CC-070, opción C2; confianza «sustituta_mismo_genero»)

Es una **estimación indirecta**: la ecuación es de *Acer platanoides*, otra especie del mismo género; la densidad sí es de *Acer pseudoplatanus*. Modelo: `MCH09-T1-ACPL-D-ACPS`.

4. **McHale, M. R.; Burke, I. C.; Lefsky, M. A.; Peper, P. J.; McPherson, E. G. 2009.** Urban forest biomass estimates: is it important to use allometric relationships developed specifically for urban trees? *Urban Ecosystems* 12(1): 95-113. https://doi.org/10.1007/s11252-009-0081-3
   - **Lo que se tomó:** tabla 1, *Acer platanoides* (ACPL): `Volumen (m³) = a · DBH(cm)^b`, con **a = 1,9 × 10⁻³** y **b = 1,785** (R² = 0,940; RMSE = 0,280).
   - **Cómo se aplica:** paso 1 con DAP = `dap_cm` (D-18) y sin altura: la ecuación **no usa la altura**, por eso no se controla un rango de altura y la altura registrada del árbol no cambia el resultado.
   - **Contexto de la muestra:** 184 árboles de calle de Fort Collins, Colorado (EE. UU.), 14 a 22 por especie, con el volumen total medido por LiDAR terrestre (método de Lefsky y McHale 2008). El artículo no publica el rango de DAP por especie.
   - **Verificación:** artículo leído (texto y tabla 1) el 2026-11-02. La UTD y `carbono-verificacion-modelos.md` citaban esta ecuación como «McHale 2007» (la tesis doctoral de McHale, Colorado State University, con los mismos datos): la cita correcta es la de 2009.
   - **No se usa:** la variante con altura que aparece en la UTD (`V = 0.001011·D^1.533·H^0.657`), porque no está en el artículo de 2009 y su origen no está verificado.
5. **California Air Resources Board 2010.** *Compliance Offset Protocol: Urban Forest Projects*, tabla B.1 (*Acer platanoides*).
   - **Lo que se tomó:** el **rango de DAP admisible, 9,7 a 102,1 cm**, que se aplica al modelo (límites incluidos).
   - **Diferencia de coeficientes:** esta tabla publica **a = 0,0019421** con el mismo b = 1,785. SIVU usa **a = 0,0019 del artículo original** (decisión de Valej, 2026-11-02): es la fuente primaria, y los decimales adicionales no tienen su origen documentado. La diferencia es de un 2,2 % en todo el rango (0,0019421 / 0,0019 = 1,0222). Para A-000419 (DAP 13,4 cm): con 0,0019 → 46,8 kg C y 171,6 kg CO₂e; con 0,0019421 → 47,8 kg C y 175,4 kg CO₂e.
   - **Verificación:** dato aportado por la responsable; el documento no se pudo descargar en esta sesión (el servidor responde 403). El rango coincide con el de la UTD (10-102 cm, redondeado).
6. **Sedlar, T.; Šefc, B.; Stojnić, S.; Sinković, T. 2021.** Wood quality characterization of sycamore maple (*Acer pseudoplatanus* L.) and its utilization in wood products industries. *Croatian Journal of Forest Engineering* 42(3): 543-560. https://doi.org/10.5552/crojfe.2021.1099
   - **Lo que se tomó:** **densidad básica ρy = 0,51 g/cm³ = 510 kg/m³** (rango 0,45-0,57 g/cm³), medida según ISO 13061-2 (masa anhidra / volumen verde), tabla 1 y texto de resultados.
   - **Cómo se aplica:** paso 2, ρ = 510 kg/m³. Es la misma definición de densidad que usan los demás modelos («masa seca / volumen verde»).
   - **Contexto de la muestra:** árboles de bosque de Medvednica (Croacia), no urbanos. La misma tabla cita 0,547 g/cm³ de Wagenführ (2007).
   - **Verificación:** artículo leído el 2026-11-02.
7. **Nowak, D. J. 2020.** *Understanding i-Tree: summary of programs and methods.* General Technical Report NRS-200. Madison, WI: USDA Forest Service, Northern Research Station. https://doi.org/10.2737/NRS-GTR-200 — **Aplicación:** según la responsable, el apéndice 11 informa 510 kg/m³ para *Acer pseudoplatanus*, el mismo valor de Sedlar et al. 2021. **No verificado en esta sesión:** el servidor del USDA bloquea la descarga de los apéndices. Fuente secundaria de respaldo; el valor aplicado se sostiene en Sedlar et al. 2021.

**Resultado de referencia, A-000419** (Piloto Valparaíso; *A. pseudoplatanus*, un fuste, DAP 13,4 cm), calculado a mano y comprobado por las pruebas automáticas:

| Paso | Cálculo | Resultado |
|---|---|---|
| Volumen | 0,0019 × 13,4^1,785 | 0,1953 m³ |
| Biomasa | 0,1953 × 510 | 99,6 kg |
| Carbono | 99,6 × 0,47 | 46,8 kg C |
| CO₂e | 46,8 × 44/12 | 171,6 kg CO₂e |

**Limitaciones de este modelo** (se entregan con cada resultado, en `modelo.limitaciones_modelo`): ecuación de otra especie del mismo género; ajustada en Fort Collins (clima semiárido continental, no mediterráneo); densidad de árboles de bosque de Croacia; DAP de SIVU a 1,30 m y el de la ecuación a 4,5 ft (1,37 m), sin corrección. Además, las limitaciones generales de CC-069.

## 4. Lo que queda pendiente

- Leer el apéndice 11 de Nowak 2020 y la tabla B.1 de CARB 2010 cuando se puedan descargar, y anotar su verificación aquí.
- Confirmar en el original la tabla 4.3 del IPCC 2006 (fracción 0,47), como pide CC-069.
- Llevar los modelos al Excel maestro (hoja de modelos propuesta en CC-069), con estas mismas referencias.
