# Inventario de reglas que bloquean el trabajo de evaluación

> **Propuesta para decidir, no un cambio.** Pedido de la investigadora responsable (2026-11-18): hay reglas antiguas muy estrictas que no dejan avanzar (ejemplo: no poder evaluar si la foto no muestra el árbol completo). Este documento lista **todo lo que hoy impide evaluar**, de dónde sale cada regla y qué opciones hay. Cambiar cualquiera requiere un CC (`docs/workflow.md` §14): Excel primero, después la plataforma.
>
> **Fuente:** lo que exige hoy la rama de integración `feature/fase6-backend-api` (la misma lógica de la API publicada), cruzado con el Excel 3.1.0, `docs/project-rules.md` (PR-009 v7.0, PR-010 v5.0) y los CC. Los `D-n` son filas de `DICCIONARIO_CAMPOS`.

## Qué significa «bloquear»

Una regla bloquea cuando impide uno de estos pasos: **guardar** el borrador, **finalizar** la inspección (pasa de Preguardado a Finalizado) o que la evaluación quede **vigente** y aparezca en los mapas de Riesgo e Infraestructura.

## Resumen para decidir

| # | Regla | Estado | Peso en el trabajo diario |
|---|---|---|---|
| A1 | Cuatro vistas de foto obligatorias para finalizar | **Ya cambiada** por CC-077 (dos fotos); falta publicarla | Alto |
| A2 | Vista obligatoria al subir cada foto | Debería caer con CC-077; verificar | Medio |
| A3 | Fotos de inspecciones anteriores no cuentan | Vigente | Medio |
| A4 | Protocolo IA VTA-01 v2 («árbol completo visible») | Vigente, **fuera del repositorio** | Alto (en cargas con IA) |
| B1 | Especie «Género sp.» o «No determinado» no permite finalizar | Vigente | Alto |
| C1 | Todos los campos obligatorios y condicionales activados (~137) | Vigente | **Muy alto** |
| D1 | Fecha distinta de la sugerida exige justificación | Vigente | Bajo |
| E1 | Solo se evalúa dentro de una OT de Inspección programada y en ejecución | Vigente | Alto |
| E2 | La evaluación es vigente solo cuando la OT se completa | Vigente | **Muy alto** |
| E3 | Una inspección finalizada no se corrige: se anula y se rehace | Vigente | Medio |
| F1 | Coherencia de datos al guardar (multifustal, porcentajes, estacionalidad) | Vigente y en ampliación (F4d) | Bajo |
| G1 | Permisos e integridad | Vigente | — (mantener) |

Candidatas más fuertes para flexibilizar: **E2, C1, B1, A4 y A3**. A1 y A2 ya están decididas.

---

## A. Fotografías

### A1. Cuatro vistas obligatorias para finalizar (D-27)
- **Hoy en la API:** Evaluación inicial, Reevaluación y Levantamiento no se finalizan sin fotos nuevas de las vistas árbol completo, base, tronco y copa (`completitud.ts`, `VISTAS_D27`; mensaje «Faltan fotos nuevas de esta inspección con las vistas…»).
- **Ya decidido:** CC-077 (2026-11-18, Excel 3.1.0) exige **dos fotos válidas y físicamente distintas**; las vistas pasan a ser recomendaciones y su falta solo genera un aviso.
- **Falta:** publicar la implementación (rama `integration/cc077-d27-backend`). Mientras no se publique, la API sigue exigiendo las cuatro vistas.

### A2. Vista obligatoria al subir la foto
- **Hoy:** `photo.service.ts` rechaza la subida sin vista («vista es obligatoria para este tipo de inspección (D-27)»).
- **Con CC-077** las etiquetas son informativas, así que esta regla debería quedar sin efecto. **Verificar** que la rama de CC-077 la quite.

### A3. Las fotos anteriores no cuentan
- **Hoy:** solo valen las fotos asociadas a esta inspección; además, la misma foto (misma huella) no se puede volver a asociar al árbol (409). Una reevaluación siempre exige fotos nuevas, aunque el árbol no haya cambiado.
- **Fuente:** PR-010 (desde v1.0, AMD-17); CC-077 la mantiene («asociadas a la inspección»).
- **Opciones:** (a) mantener, porque la foto es evidencia del estado actual; (b) aceptar fotos del mismo árbol de hasta N meses en Reevaluación y Monitoreo; (c) aceptar la foto anterior más una nueva.

### A4. Protocolo IA VTA-01 v2
- Es lo que más probablemente produce «si el árbol no se ve completo no se puede evaluar»: lo aplica la carga con IA de la otra cuenta (`sivu_batch`, fuera de este repositorio). CC-077 lo mantuvo explícitamente.
- **Para revisarlo** hace falta traer el protocolo al repositorio (o a este equipo). Sin leerlo no se puede proponer el cambio exacto.

## B. Identificación

### B1. Especie sin identificar
- **Hoy:** no se finaliza con «Género sp.» ni «No determinado» (`completitud.ts`, D-13). Si en terreno no se puede identificar la especie, el árbol no se puede evaluar.
- **Opciones:** (a) permitir finalizar con «Género sp.» marcado como identificación provisional (B19 ya separa lo identificado a nivel de especie en `cobertura_taxonomica`); (b) permitir también «No determinado», con aviso; (c) mantener.

## C. Completitud para finalizar

### C1. Todos los campos obligatorios y los condicionales activados
- **Hoy:** el Excel marca 63 campos «Obligatorio», 92 «Condicional» y otros con obligatoriedad según la copa (`REGLAS_COMPLETITUD`, 169 reglas en total). Si falta **uno** de los que aplican, la inspección queda en Preguardado.
- **Alivio que ya existe:** en una Reevaluación, los datos del árbol que no se vuelven a registrar se toman de los vigentes (DAP, altura, copa, etc.), así que no hay que medir todo de nuevo.
- **Grupos que más frenan en terreno:**
  - **Riesgo** (~30 obligatorios): raíces (D-33 a D-39), tronco (D-51 a D-72, D-272, D-273), copa (D-76, D-79, D-86 a D-89), base (D-275, D-276).
  - **Zona objetivo y consecuencias:** D-157, D-158, D-160 a D-162.
  - **Infraestructura:** D-91, D-119, D-127 a D-129 obligatorios, más los condicionales que se activan con cada «Sí».
  - **Dendrometría:** D-15, D-18, D-19, D-20, D-21, D-25 y la primera rama y base de copa (D-23 y D-24, que admiten la marca «no presenta»).
- **El motor ya sabe manejar lo no observado:** cuando falta un dato, el componente queda «No determinado» y no bloquea el resultado global (D-170 en M04; también en R01 a R03). El bloqueo está en la completitud, no en el cálculo.
- **Opciones:** (a) agregar la respuesta «No observable» en los campos de observación que en terreno a veces no se pueden ver (cavidades internas, red subterránea, plato radicular), que el motor trate como «No determinado»; (b) separar campos **críticos** (que siguen bloqueando) de **complementarios** (que solo avisan); (c) permitir finalizar con faltantes marcando la evaluación como «Parcial». Cualquiera requiere revisar en el Excel la obligatoriedad de cada campo.

## D. Fechas

### D1. Ajuste de la fecha sugerida
- **Hoy:** si la próxima fecha difiere de la sugerida, se exige `justificacion_ajuste_fecha` (D-204). Es poco costoso; se propone mantener.

## E. Flujo de la orden de trabajo

### E1. Solo se evalúa dentro de una OT de Inspección
- **Hoy:** el Usuario municipal crea la OT (prioridad obligatoria, D-238), la programa con fecha (D-241) y asigna un Inspector (D-244). El Inspector la inicia («En ejecución») y recién ahí puede guardar, subir fotos y finalizar. Solo el Inspector asignado puede hacerlo.
- **Opciones:** (a) mantener; (b) permitir que el Inspector cree o inicie una OT de evaluación desde terreno; (c) una OT de Levantamiento por zona (ya existe, D-232) como vía rápida para varios árboles.

### E2. La evaluación es vigente solo al completar la OT
- **Hoy:** una inspección finalizada no cambia los mapas ni la ficha hasta que el Usuario municipal **completa la OT** (PR-009 v7.0, CC-050). La OT no se completa si alguna de sus inspecciones sigue en Preguardado. Esto explica muchos «Evaluación pendiente» en los mapas.
- **Opciones:** (a) que la evaluación sea vigente al **finalizar** la inspección, y la OT siga solo como control de gestión; (b) completar la OT automáticamente cuando todas sus inspecciones están finalizadas; (c) mantener.

### E3. Corregir una inspección finalizada
- **Hoy:** no se modifica; el Usuario municipal la anula con motivo y se registra una nueva (CC-067). Es trazabilidad; se propone mantener, quizá con una corrección menor sin anular (por ejemplo, un error de tipeo en observaciones).

## F. Coherencia de datos al guardar el borrador
- Multifustal (D-16 a D-18): número de fustes ≥ 2; el DAP se calcula desde los fustes.
- Porcentajes entre 0 y 100, y la casilla estacional no aplica con copa ausente (D-268). Rama `integration/f4d-estacionalidad`, aún no integrada.
- Son reglas de consistencia que evitan datos imposibles; se propone **mantenerlas**.

## G. Permisos e integridad (mantener)
Rol y membresía en el proyecto, usuario activo, árbol del proyecto, una OT de Levantamiento sin árbol (D-232), formato real de la foto (JPG/PNG, hasta 10 MB) y huella verificada. Protegen los datos y no frenan la evaluación en sí.

---

## Cómo seguir

1. La investigadora responsable marca, por número, qué mantener, qué cambiar y con qué opción.
2. Por cada cambio: ficha CC en `docs/registro-cambios.md`, filas del Excel, publicación del paquete y después la plataforma (backend y frontend).
3. Antes de decidir A4, traer el protocolo VTA-01 v2 al repositorio.
