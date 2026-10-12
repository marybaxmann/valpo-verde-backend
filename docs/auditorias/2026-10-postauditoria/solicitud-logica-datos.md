# Solicitud de definición lógica de datos — inspecciones, órdenes de trabajo, mantenimiento e incidencias

> **Documento de trabajo, no normativo.** Pide a la responsable de la lógica de datos completar definiciones que hoy faltan en el Excel maestro. Sus respuestas se validan por la tesista y se registran después mediante CC (`docs/workflow.md` §14). Nada de lo que se responda aquí se convierte en regla vigente por sí solo.
>
> **Repositorio público:** no incluir datos personales ni información sensible en las respuestas.

## Cómo responder

- **Formato preferido:** la plantilla Excel `SIVU_plantilla_logica_datos.xlsx` (misma estructura que este documento, con listas desplegables). La entrega la tesista.
- Las definiciones siguen las columnas de `DICCIONARIO_CAMPOS`: Origen · ¿Quién lo ingresa? · ¿Cómo se obtiene? · Definición o criterios · Tipo de dato · Unidad / valores · Tipo de obligatoriedad · Fórmula / regla de cálculo · Condición de activación · Validación y dependencias · ámbito (`operativo` / `metodologico`).
- Si una respuesta depende de una decisión pendiente, márquela como **supuesto** y explíquelo.
- No se pide nada de programación (SQL, base de datos, configuración): solo la lógica.

**Pendiente de la tesista** (puede cambiar las respuestas):

1. si una inspección agrupa varias evaluaciones o cada evaluación es una inspección;
2. si toda inspección nace de una orden de trabajo;
3. si la inspección usa las medidas ya registradas del árbol o toma medidas nuevas;
4. la definición final de los roles (CC-015).

**Fuente de los campos:** hojas INSPECCIONES, ORDENES DE TRABAJO, MANTENIMIENTO e INCIDENCIA del Excel maestro `docs/excel/Base de Datos Valpo Verde.xlsx` (versión registrada por CC-020). Hoy `DICCIONARIO_CAMPOS` solo define 2 de estos 61 campos (`Accion_solicitada` y `subtipo_accion`).

## Lo que ya define la memoria de tesis

La memoria de tesis (borrador de octubre de 2026) describe el flujo de gestión y responde varias de las preguntas de la sección 4. En esas preguntas basta con **confirmar o corregir** lo que dice la memoria.

1. El usuario municipal registra el árbol con su medición inicial y genera una orden de trabajo.
2. Orden de inspección: el inspector la ejecuta y registra el acta; la evaluación técnica es otro registro, asociado al árbol.
3. Orden de mantenimiento: se registra la ejecución y luego su revisión (aprobada o rechazada, con corrección y plazo).
4. Una incidencia (de un árbol o de una ubicación) sirve de antecedente para una nueva orden.
5. Riesgo del árbol × afectación de infraestructura → prioridad (matriz M05), que apoya la creación de órdenes.

Según la memoria, los roles son: **Administrador** (solo crea proyectos y agrega usuarios), **Usuario municipal** (ingresa árboles, consulta y genera órdenes de trabajo, sin registrar evaluaciones técnicas), **Inspector** (inspecciona, evalúa y reevalúa) y **Encargado de mantención** (ejecuta y hace seguimiento). Todos pueden consultar toda la información.

> Puntos de la memoria que contradicen el borrador de reglas v3 o la implementación, y que decide la tesista: el tratamiento de «No determinado» frente a «No aplica» en infraestructura (pregunta 19) y el registro de evaluaciones por el usuario municipal, que hoy la plataforma permite de forma provisional (CC-022 / CC-015).

## 1. Campos a definir

### 1.1 INSPECCIONES (17 campos)

| Campo | Valores en la hoja actual | Estado |
|---|---|---|
| `id_inspeccion` | — (sin lista en la hoja) | **Por definir** |
| `id_ot` | — (sin lista en la hoja) | **Por definir** |
| `id_arbol` | — (sin lista en la hoja) | **Por definir** |
| `fecha_inspeccion` | — (sin lista en la hoja) | **Por definir** |
| `inspector` | — (sin lista en la hoja) | **Por definir** |
| `tipo_inspeccion_realizada` | Evaluación inicial, Reevaluación, Evaluación instrumental, Monitoreo | **Por definir** |
| `subtipo_inspeccion` | Lista que depende de tipo_inspeccion_realizada (LISTAS: subtipo_accion) | **Por definir** |
| `metodo_instrumental` | — (sin lista en la hoja) | **Por definir** |
| `resultado_general` | — (sin lista en la hoja) | **Por definir** |
| `nivel_riesgo` | Crítica, Alta, Media, Baja | **Por definir** |
| `requiere_mantenimiento` | Sí, No | **Por definir** |
| `requiere_nueva_inspeccion` | — (sin lista en la hoja) | **Por definir** |
| `fecha_proxima_inspeccion` | — (sin lista en la hoja) | **Por definir** |
| `observaciones` | — (sin lista en la hoja) | **Por definir** |
| `evidencia_fotografica` | — (sin lista en la hoja) | **Por definir** |
| `registrado_por` | — (sin lista en la hoja) | **Por definir** |
| `fecha_registro` | — (sin lista en la hoja) | **Por definir** |

### 1.2 ORDENES DE TRABAJO (13 campos)

| Campo | Valores en la hoja actual | Estado |
|---|---|---|
| `ID_OT` | — (sin lista en la hoja) | **Por definir** |
| `ID_Árbol` | — (sin lista en la hoja) | **Por definir** |
| `Tipo_ot` | Inspección, Mantenimiento | **Por definir** |
| `Accion_solicitada` | Lista que depende de Tipo_ot (LISTAS: accion) | Ya definido en DICCIONARIO_CAMPOS (revisar) |
| `subtipo_accion` | Lista que depende de Accion_solicitada (LISTAS: subtipo_accion) | Ya definido en DICCIONARIO_CAMPOS (revisar) |
| `motivo` | — (sin lista en la hoja) | **Por definir** |
| `Prioridad` | Crítica, Alta, Media, Baja | **Por definir** |
| `estado_ot` | Pendiente, Programada, En ejecución, Completada, Cancelada | **Por definir** |
| `fecha_creacion_OT` | — (sin lista en la hoja) | **Por definir** |
| `fecha_accion_programada` | — (sin lista en la hoja) | **Por definir** |
| `OT_ creado_por` | — (sin lista en la hoja) | **Por definir** · el nombre tiene un espacio; proponer nombre normalizado |
| `responsable_accion_id` | — (sin lista en la hoja) | **Por definir** |
| `observaciones` | — (sin lista en la hoja) | **Por definir** |

### 1.3 MANTENIMIENTO (18 campos)

| Campo | Valores en la hoja actual | Estado |
|---|---|---|
| `id_mantenimiento` | — (sin lista en la hoja) | **Por definir** |
| `id_ot` | — (sin lista en la hoja) | **Por definir** |
| `id_arbol` | — (sin lista en la hoja) | **Por definir** |
| `fecha_ejecucion` | — (sin lista en la hoja) | **Por definir** |
| `ejecutado_por` | — (sin lista en la hoja) | **Por definir** |
| `accion_ejecutada` | Acciones de mantenimiento (LISTAS: accion con tipo_ot = mantenimiento) | **Por definir** |
| `subtipo_ejecutado` | Lista que depende de accion_ejecutada (LISTAS: subtipo_accion) | **Por definir** |
| `resultado` | — (sin lista en la hoja) | **Por definir** |
| `observaciones` | — (sin lista en la hoja) | **Por definir** |
| `requiere_seguimiento` | Sí, No | **Por definir** |
| `fecha_seguimiento` | — (sin lista en la hoja) | **Por definir** |
| `evidencia_fotografica` | — (sin lista en la hoja) | **Por definir** |
| `estado_revision` | Pendiente de revisión, Aprobado, Rechazado | **Por definir** |
| `revisado_por` | — (sin lista en la hoja) | **Por definir** |
| `fecha_revision` | — (sin lista en la hoja) | **Por definir** |
| `observaciones_revision` | — (sin lista en la hoja) | **Por definir** |
| `requiere_correccion` | Sí, No | **Por definir** |
| `fecha_limite_correccion` | — (sin lista en la hoja) | **Por definir** |

### 1.4 INCIDENCIA (13 campos)

| Campo | Valores en la hoja actual | Estado |
|---|---|---|
| `id_incidencia` | — (sin lista en la hoja) | **Por definir** |
| `id_arbol` | — (sin lista en la hoja) | **Por definir** |
| `fecha_reporte` | — (sin lista en la hoja) | **Por definir** |
| `origen_reporte` | Comunidad, Municipalidad, Bomberos, Otro organismo | **Por definir** |
| `reportado_por` | — (sin lista en la hoja) | **Por definir** |
| `tipo_incidencia` | Rama caída, Rama quebrada, Árbol inclinado, Árbol caído, Daño en infraestructura, Raíces expuestas, Problema fitosanitario, Obstrucción, Otro | **Por definir** |
| `descripcion` | — (sin lista en la hoja) | **Por definir** |
| `ubicacion` | — (sin lista en la hoja) | **Por definir** |
| `utm_este` | — (sin lista en la hoja) | **Por definir** |
| `utm_norte` | — (sin lista en la hoja) | **Por definir** |
| `evidencia_fotografica` | — (sin lista en la hoja) | **Por definir** |
| `prioridad_reportada` | Crítica, Alta, Media, Baja | **Por definir** |
| `estado_incidencia` | Ingresada, En revisión, Derivada, Resuelta, Descartada | **Por definir** |

## 2. Cambios de estado

Hoy la plataforma permite pasar de cualquier estado a cualquier otro. El Excel define los estados, pero no qué cambios están permitidos. Para cada par, indicar **Sí / No / Sí, con condición**; y para cada cambio permitido: quién puede hacerlo, datos obligatorios, si exige nota y si se puede revertir.

### Órdenes de trabajo (`estado_ot`)

| Desde ↓ / Hacia → | Pendiente | Programada | En ejecución | Completada | Cancelada |
|---|---|---|---|---|---|
| **Pendiente** | — |   |   |   |   |
| **Programada** |   | — |   |   |   |
| **En ejecución** |   |   | — |   |   |
| **Completada** |   |   |   | — |   |
| **Cancelada** |   |   |   |   | — |

### Revisión de mantenimiento (`estado_revision`)

| Desde ↓ / Hacia → | Pendiente de revisión | Aprobado | Rechazado |
|---|---|---|---|
| **Pendiente de revisión** | — |   |   |
| **Aprobado** |   | — |   |
| **Rechazado** |   |   | — |

### Incidencias (`estado_incidencia`)

| Desde ↓ / Hacia → | Ingresada | En revisión | Derivada | Resuelta | Descartada |
|---|---|---|---|---|---|
| **Ingresada** | — |   |   |   |   |
| **En revisión** |   | — |   |   |   |
| **Derivada** |   |   | — |   |   |
| **Resuelta** |   |   |   | — |   |
| **Descartada** |   |   |   |   | — |

**Pregunta clave:** ¿'Completada' significa que la orden se ejecutó, o que se ejecutó y además fue revisada y aprobada? ¿Cómo se relaciona con `estado_revision`?

## 3. Permisos por tipo de usuario (propuesta)

Usar como criterio los roles que define la memoria (ver «Lo que ya define la memoria de tesis»); la definición final la valida la tesista (CC-015). Para cada entidad y acción (ver · crear · modificar o corregir · cambiar estado · anular), indicar **Sí / No / Condicional**. La plantilla Excel trae la tabla completa y la situación implementada hoy (CC-022) como referencia.

| Entidad | Situación implementada hoy (referencia, CC-022) |
|---|---|
| Proyecto | Administrador: crea y gestiona proyectos y ve todos. Usuario municipal: ve solo los proyectos donde es miembro. |
| Miembros del proyecto | Solo el Administrador agrega o quita miembros. |
| Árbol (identidad) | Usuario municipal: registra árboles y edita especie, dirección, comuna y referencia. Administrador: solo lectura. |
| Medición dendrométrica | Usuario municipal: registra la medición inicial al dar de alta el árbol. No hay corrección ni anulación en la plataforma. |
| Inspección | No existe todavía como entidad en la plataforma. |
| Evaluación de riesgo | Usuario municipal: registra (provisional mientras se resuelve CC-015). Administrador: solo lectura. Nadie modifica el resultado calculado. |
| Evaluación de infraestructura | Usuario municipal: registra. Administrador: solo lectura. |
| Orden de trabajo | Usuario municipal: crea y cambia el estado. Administrador: solo lectura. |
| Ejecución de mantenimiento | No existe todavía en la plataforma. |
| Revisión de mantenimiento | No existe todavía en la plataforma. |
| Incidencia | Usuario municipal: registra y cambia el estado con nota. Administrador: solo lectura. |
| Historial (notas y cambios) | Solo existe la bitácora de incidencias como texto. Las órdenes no tienen historial. |

Preguntas adicionales: ¿una persona puede tener más de un rol? · ¿el rol es para toda la plataforma o por proyecto? · ¿quién corrige datos ya registrados y qué debe quedar registrado?

## 4. Preguntas abiertas

Prioridad 1 = bloquea el diseño · 2 = necesaria para diseñar el módulo · 3 = puede esperar. Las páginas citadas son de la memoria de tesis (borrador de octubre de 2026). Quién responde cada pregunta está en la plantilla Excel y en la página compartida.

| N.º | Componente | Pregunta | Prior. | Estado según la memoria | Lo que dice la memoria (confirmar o corregir) |
|---|---|---|---|---|---|
| 1 | Inspecciones | Cuando un inspector visita un árbol y evalúa raíces, tronco, copa, vitalidad e infraestructura el mismo día, ¿es una inspección con varias evaluaciones o cada evaluación es una inspección distinta? | 1 | Parcial — completar | La inspección (acta) y la evaluación técnica son registros distintos: la evaluación se guarda como registro propio del árbol y la orden de trabajo se vincula con la inspección que origina (p. 34–35, 44). No dice cuántas evaluaciones caben en una inspección. |
| 2 | Inspecciones | ¿Toda inspección nace de una orden de trabajo de tipo 'Inspección', o puede registrarse sin orden previa (p. ej. en el primer inventario)? | 1 | Respondida — confirmar | Sí: el módulo Inspección y Riesgo administra las órdenes de trabajo de evaluación; el usuario municipal genera la orden y el inspector la ejecuta (p. 34). Confirmar si hay excepciones, como el primer inventario. |
| 3 | Inspecciones / Mediciones | Durante una inspección, ¿se usan las medidas del árbol ya registradas o se toman medidas nuevas (o ambas)? | 1 | Parcial — completar | El inspector registra observaciones, mediciones y condiciones (p. 33); las mediciones sucesivas van en su propia hoja (p. 44). No dice si la inspección crea una medición nueva. |
| 4 | Inspecciones | Completar el diccionario de la hoja INSPECCIONES (hoja DICC_INSPECCIONES). | 1 | Parcial — completar | Datos del acta: fecha de ejecución, tipo, resultado general, observaciones, fotos y necesidad de mantenimiento o de nueva inspección (p. 31, 35). Faltan definiciones y obligatoriedad. |
| 5 | Inspecciones | El campo 'nivel_riesgo' de la inspección, ¿lo escribe el inspector o es el resultado que calcula la plataforma? ¿Con qué escala: Bajo/Moderado/Alto/Extremo o Crítica/Alta/Media/Baja? | 1 | Respondida en principio — confirmar | Los resultados calculados no se editan a mano (p. 44) y los campos de riesgo ingresados en paralelo a los calculados se reconocen como una ambigüedad (p. 55): el nivel de riesgo sería el calculado (Bajo / Moderado / Alto / Extremo). Confirmar. |
| 6 | Usuarios | ¿Qué puede hacer cada tipo de usuario con cada entidad? (hoja PERMISOS) | 1 | Respondida — confirmar | Cuatro roles (p. 32–33): el Administrador solo crea proyectos y usuarios; el Usuario municipal ingresa árboles, consulta y genera órdenes, sin registrar evaluaciones técnicas; el Inspector inspecciona, evalúa y reevalúa; el Encargado de mantención ejecuta y hace seguimiento. Todos pueden consultar todo. Completar la tabla de permisos con este criterio. |
| 7 | Usuarios | ¿Una persona puede tener más de un rol? ¿El rol es para toda la plataforma o por proyecto? | 1 | Abierta | Cada proyecto tiene su propio equipo (p. 45); no trata varios roles por persona ni el rol por proyecto. |
| 8 | Responsables | ¿El inspector debe ser siempre un usuario de SIVU o puede ser alguien externo? ¿Se registra por separado de quien ingresa la inspección al sistema? | 1 | Parcial — completar | El inspector es un rol de usuario de la plataforma (p. 33) y cada registro conserva al usuario que lo creó (p. 44). No trata inspectores externos. |
| 9 | Órdenes de trabajo | Completar el diccionario de ORDENES DE TRABAJO y MANTENIMIENTO (hojas DICC_ORDENES_TRABAJO y DICC_MANTENIMIENTO). | 2 | Parcial — completar | Orden: tipo de acción, motivo, prioridad, responsable y fecha programada. Ejecución: acción, subtipo, fecha, responsable, resultado, observaciones, fotos y seguimiento. Revisión: estado, responsable, fecha, observaciones, corrección y plazo (p. 35). Faltan definiciones. |
| 10 | Órdenes de trabajo | El responsable de una orden, ¿es un usuario de SIVU o un texto (empresa, cuadrilla)? | 2 | Parcial — completar | Habla de profesionales y responsables asignados (p. 35): apunta a un usuario de SIVU. Confirmar. |
| 11 | Órdenes de trabajo | Al marcar 'Completada', ¿hay que registrar quién ejecutó, cuándo y el resultado? ¿La revisión ocurre antes o después de 'Completada'? | 2 | Parcial — completar | Secuencia: orden → ejecución → revisión (aprobado o rechazado, con corrección y plazo) (p. 35–36). Falta definir qué estado de la orden corresponde a cada paso. |
| 12 | Estados | ¿Desde qué estado se puede pasar a cuál? (hojas TRANSICIONES_OT y TRANSICIONES_INCIDENCIA) | 2 | Abierta | Menciona actividades pendientes, programadas, vencidas y realizadas (p. 35), sin reglas de cambio de estado. |
| 13 | Estados | ¿Qué dato se exige en cada cambio (motivo al cancelar o descartar, destino al derivar, fecha al programar)? ¿Se puede reabrir un caso cerrado? | 2 | Abierta | No lo trata. |
| 14 | Incidencias | Completar el diccionario de INCIDENCIA. ¿Se registra a quien reporta (vecino, anónimo, organismo) por separado del funcionario que la ingresa? ¿Qué datos del informante se guardan? | 2 | Respondida — confirmar | Se registra la persona que reporta, además del usuario que crea el registro (p. 36, 44). La incidencia puede asociarse a un árbol o solo a una ubicación (p. 36). Confirmar qué datos del informante se guardan. |
| 15 | Historial | ¿Qué cambios de una incidencia u orden deben quedar en su historial y qué se guarda de cada cambio? ¿Una nota se puede corregir o solo agregar otra? | 2 | Parcial — completar | Registro histórico de evaluaciones, mantenciones e intervenciones, y seguimiento del estado (p. 32, 36); no detalla qué se guarda de cada cambio. |
| 16 | Catálogos | Los estados, el tipo y origen de incidencia y la prioridad que hoy son listas desplegables de las hojas, ¿pasan al catálogo oficial LISTAS con código y etiqueta? | 2 | Abierta | LISTAS cubre los tipos de acción, los subtipos y la materialidad (p. 43); no menciona estados ni tipo u origen de incidencia. |
| 17 | Prioridad | La prioridad de una orden o incidencia, ¿la escribe una persona o la calcula la plataforma (matriz M05)? | 2 | Respondida — confirmar | La prioridad del árbol se calcula con la matriz M05: riesgo × afectación; riesgo Extremo = prioridad Crítica (p. 42–43). La prioridad reportada de la incidencia la entrega quien reporta (p. 36). Falta definir si la prioridad de la orden copia la del árbol o se ingresa. |
| 18 | Relaciones | ¿Una incidencia puede dar origen a una orden de trabajo? ¿Una inspección que 'requiere mantenimiento' crea una orden? | 2 | Respondida — confirmar | Sí, como derivación: la incidencia sirve de antecedente para una orden, y la inspección registra necesidades de mantenimiento o de nueva inspección (p. 35–36). |
| 19 | Datos no disponibles | En datos numéricos de infraestructura, ¿hay que distinguir 'No aplica' de 'No determinado' en vez de dejar vacío? ¿Qué pasa si no hay ningún componente aplicable (N21)? | 2 | Respondida, pero contradice — decidir | En infraestructura, si el componente no está presente o no se puede establecer su condición, se clasifica como No aplica; si no se pudo evaluar ningún componente, la clasificación global es No aplica (p. 41–42). Resuelve N21, pero el borrador de reglas v3 mantiene separado «No determinado» de «No aplica» (D21): hay que decidir. |
| 20 | Correcciones | Si un dato ya registrado está mal (especie, medición, ubicación), ¿quién puede corregirlo y qué debe quedar registrado? | 3 | Parcial — completar | Un resultado calculado no se corrige a mano: se revisan los datos de entrada o la regla (p. 44). No dice quién corrige. |
| 21 | Árboles / Mediciones | Pendientes ya marcados en el diccionario: categorías de configuración de fustes, DAP equivalente, nombres comunes, catálogo de vitalidad, quién puede anular mediciones. | 3 | Abierta | Solo define las clases de defoliación de Michel et al. (2025) (p. 39). |

## 5. Referencias

- Hallazgos relacionados: X1–X5, I1, I1-b, I2, I3 ([hallazgos.md](hallazgos.md)); decisiones DA-02, DA-03, DA-04 ([decisiones.md](decisiones.md)); tareas PA-03, PA-05, PA-06, PA-07, PA-09 ([`docs/roadmap.md`](../../roadmap.md)).
- Reglas vigentes: PR-002 v2.2 (autoridad de DICCIONARIO_CAMPOS), PR-003 v6.0, PR-004 v5.0, PR-009 v2.0, ADR-007, ADR-016, CC-015, CC-022.
