# Preguntas para Mari y Valej antes de aplicar

> **Quién responde:** lo de evaluación y medidas, **Valej** (1 y 4); lo de Conecta, fichas, textos y fotos, **Mari** (2, 3 y 5 a 11); la 12, las dos. Cada una dice qué propongo si no hay otra indicación. Nada se aplica hasta tener las respuestas, el CC aprobado y las filas en el Excel.

## Respuestas recibidas

### Mari, 2026-11-16 (reenviadas por la usuaria en el chat)

| # | Respuesta |
|---|---|
| 2 | **Aprobado.** PR-004 v8.0 con la excepción solo para textos y fotos públicas. |
| 3 | **Aprobado.** Cualquier Usuario municipal activo o el Administrador. Revisarlo cuando exista un segundo proyecto. |
| 5 | **Cambia la propuesta:** cargar las fuentes **por bloque** desde ya, según la sección «Fuentes por bloque» de cada especie en `FICHAS_SEIS_ESPECIES.md` (v5). «General» solo para lo que no tenga un bloque claro. |
| 6 | **Aprobado.** Un árbol puede reemplazar curiosidad, «quién soy» y consejo; rasgos, estaciones e historia de la especie quedan fijos. |
| 7 | **Carga autorizada en la base de pruebas** (`gmlbmyreoxgoqrolhyxo`) de *Acer negundo* y *Lagerstroemia indica* con los datos aprobados en P9, y dejarla registrada. |
| 8 | **Aprobado.** Autor y licencia obligatorios; no se usa la foto del olmo con marca de agua; mientras no haya foto propia, el olmo queda sin foto. |
| 9, 10, 11 | **Aprobados** como se proponen. |
| 12 | La numeración D-n se ajusta al copiar las filas al Excel, según si CC-068 entra antes. **No frena el CC.** |
| 1, 4 | Las responde Valej. |

Mari confirmó estas respuestas el 2026-11-16 en el mensaje que trajo las de Valej. En la 2 precisó que la excepción cubre solo el contenido ciudadano de especies y fichas públicas, sin inventario, OT, inspecciones ni incidencias.

### Valej, 2026-11-16 (medidas)

| # | Respuesta |
|---|---|
| 1 | **Opción (b).** No se agrega un campo de método y la opción (a) queda **descartada, no postergada**: no es posible saber cómo se determinó cada dato. La ficha dice «medida en terreno o estimada con escala» para el DAP, la altura y la copa; «estimación» para D-26, y «clasificación del Inspector» para D-25. |
| 4 | **Aprobado.** Las cinco medidas empiezan en «No» en cada árbol. |

**Todas las preguntas están respondidas.** El CC y las filas quedan para la revisión final de Mari; la 037 no se aplica hasta esa revisión.

## Bloquean el CC

**1. Medido vs estimado (relevo §3.2). — Valej** D-18 (DAP) y D-19 (altura) dicen «Medición en terreno o estimación con escala», pero ningún campo registra, árbol por árbol, cuál de las dos se usó. D-22 (copa) se calcula desde D-20 y D-21, que tienen la misma ambigüedad. D-26 sí es «Estimado» y D-25 es una clasificación del Inspector.
- **(a)** Agregar un campo de método (Medición / Estimación con escala) para D-18, D-19, D-20 y D-21. Lo registra el Inspector en la inspección. Necesita su propio CC, filas en ARBOLES y cambio en el formulario B16. La ficha diría «medido» o «estimado» con certeza, pero solo para inspecciones nuevas: las de antes quedarían sin método.
- **(b)** No agregar nada por ahora. La ficha rotula DAP, altura y copa como «medida en terreno o estimada con escala», D-26 como «estimación» y D-25 como «clasificación del Inspector».
- **Propuesta:** (b) ahora, y (a) como CC aparte si se quiere el detalle.

**2. Administrador y PR-004. — Mari** P4 dice que el Administrador edita las fichas, pero PR-004 v7.0 lo deja en solo lectura e incluye «fichas» entre lo que solo consulta. ¿Se aprueba crear **PR-004 v8.0** con esta única excepción: contenido ciudadano de especies y fichas públicas, sin escritura en inventario, OT, inspecciones ni incidencias?

**3. Alcance del contenido por especie. — Mari** El catálogo es uno solo para todos los proyectos. Si un Usuario municipal del proyecto A edita el texto del olmo, cambia también en las fichas del proyecto B. ¿Se acepta, o el contenido de especie lo edita solo el Administrador?
- **Propuesta:** cualquier Usuario municipal activo o el Administrador (como dice P4), porque hoy hay un solo proyecto piloto.

**4. Interruptores apagados por defecto. — Valej** ¿Las 5 medidas empiezan en «No» en cada árbol, como proponía D6? La otra opción es que empiecen en «Sí» y se muestre todo lo que exista.
- **Propuesta:** «No», que no publica nada sin una decisión explícita.

**5. Fuentes por bloque. — Mari** El relevo pide «fuentes por bloque», pero los textos aprobados tienen sus fuentes por especie (`fuentes` en `contenidoEspecie.ts`). ¿Se acepta un bloque «General» para cargar las que ya existen, y por bloque desde ahora? La otra opción es repartirlas por bloque antes de cargar, revisando `FICHAS_SEIS_ESPECIES.md`.

**6. Qué bloques puede personalizar un árbol. — Mari** Propongo curiosidad, «quién soy» y consejo. Rasgos, año por estaciones e historia de la especie quedan fijos, porque son botánicos y comunes a la especie. ¿Está bien, o se quiere personalizar algún otro bloque?

## Bloquean la carga de datos, no el CC

**7. — Mari.** Camino para agregar *Acer negundo* y *Lagerstroemia indica* (P9).** ¿Las carga un Inspector en la plataforma (CC-053) o se hace una carga autorizada en la base de pruebas? Sin esas dos filas en `species`, su contenido ciudadano no tiene dónde guardarse.

**8. Créditos de fotos. — Mari** Propongo que toda foto de especie (referencial y de reconocimiento) lleve crédito obligatorio (autor y licencia). Las fotos propias del levantamiento llevarían «Valpo Verde, levantamiento 2026-10-01». La foto del olmo de terceros con marca de agua no se cargaría. ¿De acuerdo? Para la foto del ejemplar no propongo crédito: la toma la municipalidad.

## Menores (se pueden ajustar después)

**9. Límites de caracteres.** Propongo: curiosidad 200, «quién soy» 160, consejo 160, historia de la especie 300, aporte 40, rasgo 120, estación 80 y paso de ciclo 60. Todos quedan por sobre el texto más largo aprobado en V5. «Mi historia», 1.000 (P2).

**10. Íconos de aporte.** Se fijan los 8 que usa V5 (Sombra, Frescor, Aves, Polinizadores, Flores, Siempreverde, Hito, Generaciones) como lista nueva en LISTAS. ¿Se agregan otros?

**11. Árbol sin especie vigente** (A-000507, 508, 509, 512 y 513, P18). La ficha no muestra contenido de especie, pero sí «Mi historia», la foto propia y las medidas activadas, si existen. ¿Correcto?

**12. Numeración D-n. — Mari y Valej** Las filas quedan provisionalmente en D-280 a D-306. Si CC-068 (densidad de la madera) entra antes al Excel, se corren 4. ¿Cuál entra primero?
