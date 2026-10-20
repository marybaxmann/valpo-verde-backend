# Project Rules — Valpo Verde

## Propósito
Este archivo contiene las decisiones funcionales y técnicas vigentes del proyecto.

Las reglas pueden cambiar durante el desarrollo.

Estados permitidos:
- propuesta
- vigente
- pendiente
- reemplazada
- descartada

Si una decisión nueva contradice una regla vigente:
1. no borrar la regla anterior;
2. marcar la versión anterior como `reemplazada`;
3. crear una nueva versión;
4. indicar qué versión reemplaza;
5. documentar el motivo;
6. identificar las capas afectadas.

Este procedimiento es idéntico al descrito en `docs/workflow.md` (§4); ambos documentos deben mantenerlo redactado de la misma forma.

## PR-001 — Referencia funcional del proyecto (v2.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 2.0
Reemplazada por: PR-001 v3.0
Motivo del reemplazo: definía el prototipo como "referencia funcional actual", lo que permitía que pantallas históricas prevalecieran sobre decisiones posteriores. Origen: CC-021.

El repositorio:
`marybaxmann/Valpo-Verde-Conecta`

es la referencia funcional actual para:
- navegación;
- flujo por roles;
- estructura de pantallas;
- experiencia de usuario.

No es fuente de metodología, reglas técnicas ni cálculos.

Afecta:
- frontend
- UX
- arquitectura funcional

## PR-001 — Referencia funcional del proyecto (v3.0)
Estado: vigente
Versión: 3.0
Reemplaza: PR-001 v2.0
Origen: CC-021

Referencias históricas de intención funcional:
- prototipo navegable `marybaxmann/Valpo-Verde-Conecta`;
- Figma original de SIVU: pantallas en `valpo-verde-frontend/docs/referencias/figma-original/`.

Sirven para comprender la intención funcional y de producto original: qué quería resolver cada pantalla, qué información debía ver el usuario, cómo se relacionaban los módulos y cómo se esperaba recorrer el sistema.

No son especificación vigente. Pueden contener módulos, campos, categorías, cálculos y flujos que después fueron modificados, reemplazados o eliminados. Conservan valor como evidencia de intención funcional y de producto, pero no pueden restablecer decisiones que posteriormente fueron modificadas, reemplazadas o eliminadas. La presencia de un elemento en ellas no demuestra que siga vigente: toda implementación se reconcilia primero con la metodología, las decisiones controladas y el backend/API vigentes (jerarquía en PR-016 v4.0).

No son fuente de metodología, reglas técnicas, cálculos, estructura de datos ni permisos.

Afecta:
- frontend
- UX
- arquitectura funcional

## PR-002 — Fuente de metodología (v1.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 1.0
Reemplazada por: PR-002 v2.0
Motivo del reemplazo: la precedencia "texto de `docs/methodology/` > diagramas" no refleja la fuente metodológica adoptada (Excel maestro + diagramas de decisión) y permitía resolver contradicciones eligiendo un artefacto en lugar de tratarlas como inconsistencias. Origen: CC-001.

Los diagramas de flujo entregados por la autora son la fuente metodológica para:
- raíces/base;
- tronco;
- copa/ramas;
- vitalidad;
- infraestructura;
- y futuras etapas de riesgo.

La implementación debe respetar únicamente las reglas marcadas como vigentes en `docs/methodology/`.

No se deben inventar:
- umbrales;
- categorías;
- ramas de decisión;
- fórmulas;
- matrices.

Afecta:
- rules-engine
- backend
- tests

## PR-002 — Fuente de metodología (v2.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 2.0
Reemplaza: PR-002 v1.0
Origen: CC-001
Reemplazada por: PR-002 v2.1
Motivo del reemplazo: clasificaba VERSION como hoja normativa y no definía el carácter de las demás hojas del Excel maestro (LISTAS, INDICES y hojas operativas), ni la autoridad de cada artefacto. Origen: CC-003.

La fuente de verdad metodológica de Valpo Verde es un PAQUETE VERSIONADO compuesto por:

- Excel maestro (nombre fijo), con las hojas normativas MATRICES_CALCULO, DICCIONARIO_CAMPOS, REGLAS_INDICADORES y VERSION;
- diagramas de decisión de la misma versión (archivo fuente + exportación);
- documentación metodológica en `docs/methodology/` (versión vigente, explicación e historial).

Todos representan una misma versión metodológica y deben mantenerse sincronizados. No existe precedencia entre ellos. Una contradicción entre artefactos es una inconsistencia: se abre un CC (`docs/workflow.md` §14), se determina cuál representa la decisión metodológica aprobada y se sincronizan todos los artefactos afectados.

La implementación (base de datos, backend, API, frontend) deriva del paquete y nunca lo define. No son fuente metodológica: el código, `database/schema.sql`, el prototipo `marybaxmann/Valpo-Verde-Conecta` ni Groundzy. Las referencias técnicas externas (p. ej. ISA, Smiley y Fraedrich) son fundamento citado dentro del paquete, no fuente directa.

`docs/methodology/` documenta solo la versión vigente. Las versiones anteriores se conservan como historial marcadas como reemplazadas y nunca se interpretan como vigentes.

Solo se implementan reglas con estado vigente en la versión publicada que corresponda. No se inventan umbrales, categorías, ramas de decisión, fórmulas ni matrices.

Versionado, aprobación y control de cambios: `docs/workflow.md` §14. Estado de transición hasta la primera versión publicada (2.0.0): `docs/methodology/00-index.md`.

Afecta:
- rules-engine
- backend
- base de datos
- frontend
- tests
- documentación

## PR-002 — Fuente de metodología (v2.1 — REEMPLAZADA)
Estado: reemplazada
Versión: 2.1
Reemplaza: PR-002 v2.0
Origen: CC-003
Reemplazada por: PR-002 v2.2
Motivo del reemplazo: la composición del Excel maestro no incluía el anexo MEDICIONES_DENDROMETRICAS (CC-020) y la autoridad de DICCIONARIO_CAMPOS no incluía el ámbito de cada campo (CC-008). Origen: CC-008, CC-020.

La fuente de verdad metodológica de Valpo Verde es un PAQUETE VERSIONADO compuesto por:

- Excel maestro (nombre fijo), con la composición indicada más abajo;
- diagramas de decisión de la misma versión (archivo fuente + exportación);
- documentación metodológica en `docs/methodology/` (versión vigente, explicación e historial).

Todos representan una misma versión metodológica y deben mantenerse sincronizados. No existe precedencia entre ellos. Una contradicción entre artefactos es una inconsistencia: se abre un CC (`docs/workflow.md` §14), se determina cuál representa la decisión metodológica aprobada y se sincronizan todos los artefactos afectados.

La implementación (base de datos, backend, API, frontend) deriva del paquete y nunca lo define. No son fuente metodológica: el código, `database/schema.sql`, el prototipo `marybaxmann/Valpo-Verde-Conecta` ni Groundzy. Las referencias técnicas externas (p. ej. ISA, Smiley y Fraedrich) son fundamento citado dentro del paquete, no fuente directa.

`docs/methodology/` documenta solo la versión vigente. Las versiones anteriores se conservan como historial marcadas como reemplazadas y nunca se interpretan como vigentes.

Solo se implementan reglas con estado vigente en la versión publicada que corresponda. No se inventan umbrales, categorías, ramas de decisión, fórmulas ni matrices.

### Composición del Excel maestro

| Categoría | Hojas | Carácter |
|---|---|---|
| Núcleo normativo / metodológico | DICCIONARIO_CAMPOS, REGLAS_INDICADORES, MATRICES_CALCULO | Fuente de verdad metodológica. |
| Gobernanza | VERSION | Registro de versiones del paquete. |
| Catálogo controlado subordinado | LISTAS | Parte del paquete; su funcionamiento definitivo se resuelve en CC-004. |
| Módulo metodológico en propuesta | INDICES | Pendiente de adopción (CC-016). No es fuente normativa vigente; sus fórmulas no son implementables hasta adoptarse mediante un CC específico. Mientras permanezca en propuesta, sus cambios no modifican `rule_version`. |
| Anexos / modelos operativos no normativos | ARBOLES, REGISTRO_EVALUACION, INCIDENCIA, INSPECCIONES, MANTENIMIENTO, ORDENES DE TRABAJO, USUARIOS | Representan la captura y organización operacional de la información. No son fuente de verdad para reglas, dominios, roles ni resultados calculados. Deben conformarse al núcleo normativo; sus cambios no generan versión del paquete. |

Los diagramas de decisión y `docs/methodology/` forman parte del paquete como documentación y representación de la metodología: documentan y referencian las reglas ejecutables, no las duplican.

### Autoridad

- DICCIONARIO_CAMPOS es la autoridad funcional sobre cada campo: definición, tipo de dato funcional, dominio o referencia al catálogo, unidad, obligatoriedad, condición de activación, origen manual o calculado, dependencias y fórmula aritmética de variables derivadas cuando corresponda. No repite umbrales de clasificación (REGLAS_INDICADORES), rangos de agregación (MATRICES_CALCULO) ni definiciones de roles y permisos (PR correspondientes). Cuando un resultado depende de R01–R04, M01–M05 u otra regla agregadora, referencia su ID sin volver a escribir la lógica.
- REGLAS_INDICADORES contiene las condiciones o umbrales sobre variables que producen una clasificación parcial (Despreciable / Sin afectación, Leve, Moderada, Severa, No determinado, No aplica) y los ajustes de clasificación cuando correspondan.
- MATRICES_CALCULO combina resultados parciales previamente obtenidos. No define umbrales sobre variables crudas.
- Catálogos: "un catálogo, un solo lugar". DICCIONARIO_CAMPOS indica qué catálogo utiliza cada campo; los valores de catálogos jerárquicos, compartidos o suficientemente extensos pueden residir en LISTAS; los mismos valores no se mantienen simultáneamente y de forma independiente en DICCIONARIO_CAMPOS y LISTAS.
- Roles y permisos: solo las PR correspondientes (PR-003, PR-004). Ni la hoja USUARIOS ni la columna "¿Quién lo ingresa?" de DICCIONARIO_CAMPOS son fuente de roles.
- Cada pieza de lógica existe en un único lugar; los demás artefactos la referencian mediante su identificador.

### Relación con el modelo de datos

El modelo de datos de la plataforma debe implementar de forma consistente el contrato funcional definido por el paquete metodológico. DICCIONARIO_CAMPOS define el significado y comportamiento funcional de los campos, pero no constituye por sí solo el esquema físico de la base de datos. PK, FK, normalización, relaciones, índices, constraints técnicos, autenticación y otros elementos pertenecen al diseño de datos/backend. Las hojas operativas tampoco constituyen el esquema físico de la base de datos.

Versionado, aprobación y control de cambios: `docs/workflow.md` §14. Estado de transición hasta la primera versión publicada (2.0.0): `docs/methodology/00-index.md`.

Afecta:
- rules-engine
- backend
- base de datos
- frontend
- tests
- documentación

## PR-002 — Fuente de metodología (v2.2 — REEMPLAZADA)
Estado: reemplazada
Versión: 2.2
Reemplazada por: PR-002 v3.0
Motivo del reemplazo: incluía MEDICIONES_DENDROMETRICAS, la tabla de códigos de LISTAS y el ámbito de los campos, que dejaron de formar parte del Excel maestro (CC-028, CC-034, CC-035).
Reemplaza: PR-002 v2.1
Origen: CC-008, CC-020
Motivo: incorporar el anexo MEDICIONES_DENDROMETRICAS a la composición del Excel maestro (CC-020) y el ámbito `operativo` / `metodologico` de cada campo a la autoridad de DICCIONARIO_CAMPOS (CC-008). Sin otros cambios respecto de v2.1.

La fuente de verdad metodológica de Valpo Verde es un PAQUETE VERSIONADO compuesto por:

- Excel maestro (nombre fijo), con la composición indicada más abajo;
- diagramas de decisión de la misma versión (archivo fuente + exportación);
- documentación metodológica en `docs/methodology/` (versión vigente, explicación e historial).

Todos representan una misma versión metodológica y deben mantenerse sincronizados. No existe precedencia entre ellos. Una contradicción entre artefactos es una inconsistencia: se abre un CC (`docs/workflow.md` §14), se determina cuál representa la decisión metodológica aprobada y se sincronizan todos los artefactos afectados.

La implementación (base de datos, backend, API, frontend) deriva del paquete y nunca lo define. No son fuente metodológica: el código, `database/schema.sql`, el prototipo `marybaxmann/Valpo-Verde-Conecta` ni Groundzy. Las referencias técnicas externas (p. ej. ISA, Smiley y Fraedrich) son fundamento citado dentro del paquete, no fuente directa.

`docs/methodology/` documenta solo la versión vigente. Las versiones anteriores se conservan como historial marcadas como reemplazadas y nunca se interpretan como vigentes.

Solo se implementan reglas con estado vigente en la versión publicada que corresponda. No se inventan umbrales, categorías, ramas de decisión, fórmulas ni matrices.

### Composición del Excel maestro

| Categoría | Hojas | Carácter |
|---|---|---|
| Núcleo normativo / metodológico | DICCIONARIO_CAMPOS, REGLAS_INDICADORES, MATRICES_CALCULO | Fuente de verdad metodológica. |
| Gobernanza | VERSION | Registro de versiones del paquete. |
| Catálogo controlado subordinado | LISTAS | Parte del paquete; su funcionamiento definitivo se resuelve en CC-004. |
| Módulo metodológico en propuesta | INDICES | Pendiente de adopción (CC-016). No es fuente normativa vigente; sus fórmulas no son implementables hasta adoptarse mediante un CC específico. Mientras permanezca en propuesta, sus cambios no modifican `rule_version`. |
| Anexos / modelos operativos no normativos | ARBOLES, MEDICIONES_DENDROMETRICAS, REGISTRO_EVALUACION, INCIDENCIA, INSPECCIONES, MANTENIMIENTO, ORDENES DE TRABAJO, USUARIOS | Representan la captura y organización operacional de la información. No son fuente de verdad para reglas, dominios, roles ni resultados calculados. Deben conformarse al núcleo normativo; sus cambios no generan versión del paquete. |

Los diagramas de decisión y `docs/methodology/` forman parte del paquete como documentación y representación de la metodología: documentan y referencian las reglas ejecutables, no las duplican.

### Autoridad

- DICCIONARIO_CAMPOS es la autoridad funcional sobre cada campo: definición, tipo de dato funcional, dominio o referencia al catálogo, unidad, obligatoriedad, condición de activación, origen manual o calculado, dependencias, fórmula aritmética de variables derivadas cuando corresponda y ámbito del campo (`operativo` o `metodologico`, `docs/workflow.md` §14.12). No repite umbrales de clasificación (REGLAS_INDICADORES), rangos de agregación (MATRICES_CALCULO) ni definiciones de roles y permisos (PR correspondientes). Cuando un resultado depende de R01–R04, M01–M05 u otra regla agregadora, referencia su ID sin volver a escribir la lógica.
- REGLAS_INDICADORES contiene las condiciones o umbrales sobre variables que producen una clasificación parcial (Despreciable / Sin afectación, Leve, Moderada, Severa, No determinado, No aplica) y los ajustes de clasificación cuando correspondan.
- MATRICES_CALCULO combina resultados parciales previamente obtenidos. No define umbrales sobre variables crudas.
- Catálogos: "un catálogo, un solo lugar". DICCIONARIO_CAMPOS indica qué catálogo utiliza cada campo; los valores de catálogos jerárquicos, compartidos o suficientemente extensos pueden residir en LISTAS; los mismos valores no se mantienen simultáneamente y de forma independiente en DICCIONARIO_CAMPOS y LISTAS.
- Roles y permisos: solo las PR correspondientes (PR-003, PR-004). Ni la hoja USUARIOS ni la columna "¿Quién lo ingresa?" de DICCIONARIO_CAMPOS son fuente de roles.
- Cada pieza de lógica existe en un único lugar; los demás artefactos la referencian mediante su identificador.

### Relación con el modelo de datos

El modelo de datos de la plataforma debe implementar de forma consistente el contrato funcional definido por el paquete metodológico. DICCIONARIO_CAMPOS define el significado y comportamiento funcional de los campos, pero no constituye por sí solo el esquema físico de la base de datos. PK, FK, normalización, relaciones, índices, constraints técnicos, autenticación y otros elementos pertenecen al diseño de datos/backend. Las hojas operativas tampoco constituyen el esquema físico de la base de datos.

Versionado, aprobación y control de cambios: `docs/workflow.md` §14. Estado de transición hasta la primera versión publicada (2.0.0): `docs/methodology/00-index.md`.

Afecta:
- rules-engine
- backend
- base de datos
- frontend
- tests
- documentación

## PR-002 — Fuente de metodología (v3.0)
Estado: vigente
Versión: 3.0
Reemplaza: PR-002 v2.2
Origen: CC-028, CC-030, CC-034, CC-035
Motivo: el Excel auditado es la única fuente metodológica y cambió su composición (CC-028); los diagramas de decisión quedan fuera del paquete (CC-030); LISTAS ya no contiene una tabla de códigos (CC-034); DICCIONARIO_CAMPOS ya no registra el ámbito de cada campo (CC-028 P8, CC-035).

La fuente de verdad metodológica de Valpo Verde es un PAQUETE VERSIONADO compuesto por:

- Excel maestro `docs/excel/Base de Datos Valpo Verde.xlsx` (nombre fijo), con la composición indicada más abajo. Desde CC-028 contiene el Excel auditado el 2026-10-18 y es la única fuente metodológica: no se mantienen copias ni versiones paralelas;
- documentación metodológica en `docs/methodology/` (versión vigente, explicación e historial), que documenta la versión sin definir reglas.

**El Excel maestro es la única fuente de verdad.** Si `docs/methodology/` difiere del Excel, manda el Excel y la documentación se corrige mediante un CC (`docs/workflow.md` §14).

Los diagramas de decisión (`docs/excel/diagramas/`) **no forman parte del paquete** desde 2.0.0 (CC-030, opción B). Pueden actualizarse a partir del Excel como ilustración, pero no son fuente: si un diagrama difiere del Excel, manda el Excel.

La implementación (base de datos, backend, API, frontend) deriva del paquete y nunca lo define. No son fuente metodológica: el código, `database/schema.sql`, el prototipo `marybaxmann/Valpo-Verde-Conecta` ni Groundzy. Las referencias técnicas externas (p. ej. ISA, Smiley y Fraedrich) son fundamento citado dentro del paquete, no fuente directa.

`docs/methodology/` documenta solo la versión vigente. Las versiones anteriores se conservan como historial marcadas como reemplazadas y nunca se interpretan como vigentes.

Solo se implementan especificaciones y reglas de una versión publicada del paquete (CC-030, CC-035). No se inventan umbrales, categorías, ramas de decisión, fórmulas ni matrices.

### Composición del Excel maestro

| Categoría | Hojas | Carácter |
|---|---|---|
| Núcleo normativo / metodológico | DICCIONARIO_CAMPOS, REGLAS_GENERALES, REGLAS_INDICADORES, MATRICES_CALCULO | Fuente de verdad metodológica. REGLAS_GENERALES reúne las reglas transversales de registro (preguardado y finalización, ausencia, historial y vigencia, roles, revisión de mantenimiento, reinspección), que no se repiten campo por campo (AMD-15). |
| Gobernanza | VERSION | Registro de versiones del paquete. |
| Menús auxiliares | LISTAS | Valores de los menús desplegables y su jerarquía (AMD-30). No contiene códigos: los códigos persistentes los define el backend (PR-021, CC-034). |
| Módulo metodológico en propuesta | INDICES | Pendiente de revisión (CC-016; CC-027 DM-09). No es fuente normativa vigente; sus fórmulas no son implementables hasta adoptarse mediante un CC específico. Mientras permanezca en propuesta, sus cambios no modifican `rule_version`. |
| Anexos / modelos operativos no normativos | ARBOLES, REGISTRO_EVALUACION, INSPECCION, ORDENES DE TRABAJO, MANTENIMIENTO, INCIDENCIA, USUARIOS, PROYECTOS, MIEMBROS_PROYECTO, SECTORES, CATALOGO_ESPECIES | Representan la captura y organización operacional de la información. No son fuente de verdad para reglas, dominios, roles ni resultados calculados. Deben conformarse al núcleo normativo; sus cambios no generan versión del paquete. |

Ya no forman parte del Excel maestro: MEDICIONES_DENDROMETRICAS (CC-028 P3), Hoja4 (AMD-33), la tabla de códigos de LISTAS (columnas P:X de CC-004) y la columna `ambito` de DICCIONARIO_CAMPOS (CC-028 P8).

`docs/methodology/` documenta y referencia las reglas ejecutables del Excel; no las duplica.

### Autoridad

- DICCIONARIO_CAMPOS es la autoridad funcional sobre cada campo: definición, tipo de dato funcional, dominio y etiquetas de sus valores, unidad, obligatoriedad, condición de activación, origen manual o calculado, dependencias y fórmula aritmética de variables derivadas cuando corresponda. No repite umbrales de clasificación (REGLAS_INDICADORES), rangos de agregación (MATRICES_CALCULO) ni definiciones de roles y permisos (PR correspondientes). Cuando un resultado depende de R01–R04, M01–M05 u otra regla agregadora, referencia su ID sin volver a escribir la lógica.
- REGLAS_GENERALES contiene las reglas transversales de registro, historial y flujo que aplican a varios campos u hojas.
- REGLAS_INDICADORES contiene las condiciones o umbrales sobre variables que producen una clasificación parcial (Despreciable / Sin afectación, Leve, Moderada, Severa, No determinado, No aplica) y los ajustes de clasificación cuando correspondan.
- MATRICES_CALCULO combina resultados parciales previamente obtenidos. No define umbrales sobre variables crudas.
- Catálogos: "un catálogo, un solo lugar". DICCIONARIO_CAMPOS define los valores permitidos y sus etiquetas; LISTAS los organiza para los menús. El código persistente de cada valor lo define el backend (PR-021) y no se mantiene en el Excel.
- Roles y permisos: solo las PR correspondientes (PR-003, PR-004, PR-019, PR-020). Ni la hoja USUARIOS ni la columna "¿Quién lo ingresa?" de DICCIONARIO_CAMPOS son fuente de roles.
- Cada pieza de lógica existe en un único lugar; los demás artefactos la referencian mediante su identificador.

### Relación con el modelo de datos

El modelo de datos de la plataforma debe implementar de forma consistente el contrato funcional definido por el paquete metodológico. DICCIONARIO_CAMPOS define el significado y comportamiento funcional de los campos, pero no constituye por sí solo el esquema físico de la base de datos. PK, FK, normalización, relaciones, índices, constraints técnicos, autenticación y otros elementos pertenecen al diseño de datos/backend. Las hojas operativas tampoco constituyen el esquema físico de la base de datos.

Versionado, aprobación y control de cambios: `docs/workflow.md` §14. Estado de transición hasta la primera versión publicada (2.0.0): `docs/methodology/00-index.md`.

Afecta:
- rules-engine
- backend
- base de datos
- frontend
- tests
- documentación

## PR-003 — Rol Usuario municipal (v4.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 4.0
Reemplazada por: PR-003 v5.0
Motivo del reemplazo: no establecía que el Usuario municipal puede registrar mediciones dendrométricas ni que hacerlo no constituye una inspección técnica (CC-020).

Actualización 3.0 (cierre C-4): se fijan los identificadores del rol.
- Identificador interno: `usuario_municipal`
- Etiqueta de interfaz: `Usuario municipal`

Actualización 4.0 (multiproyecto, aclaración menor — no cambia el resto de permisos):
"acceder a su proyecto asignado" significa que exista una fila en
`project_members` para ese usuario y proyecto. El enforcement se aplica
primero en backend; RLS se añade posteriormente. Ver PR-005 v3.0 y ADR-005 v2.0.

El Usuario municipal realiza captura básica y consulta.

Puede:
- acceder a su proyecto asignado;
- ver dashboard básico;
- consultar inventario;
- registrar nuevos árboles;
- editar datos básicos del árbol permitidos;
- consultar resultados técnicos;
- reportar y consultar incidencias;
- consultar mantenimiento;
- consultar indicadores básicos.

No realiza:
- evaluación técnica;
- inspección estructural;
- cálculo de severidades;
- cálculo de puntajes;
- evaluación de vitalidad;
- evaluación de riesgo;
- priorización técnica;
- modificación manual de resultados calculados.

Reemplaza cualquier regla anterior que tratara al usuario municipal como inspector técnico.

Afecta:
- frontend
- backend
- permisos
- RLS

## PR-003 — Rol Usuario municipal (v5.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 5.0
Reemplazada por: PR-003 v6.0
Motivo del reemplazo: no permitía al Usuario municipal registrar órdenes de trabajo ni actualizar el estado de órdenes e incidencias (CC-022).
Reemplaza: PR-003 v4.0
Origen: CC-020
Motivo: aclarar que el Usuario municipal puede registrar mediciones dendrométricas y que ello no constituye una inspección técnica. Sin otros cambios de permisos respecto de v4.0; no resuelve CC-015.

Actualización 3.0 (cierre C-4): se fijan los identificadores del rol.
- Identificador interno: `usuario_municipal`
- Etiqueta de interfaz: `Usuario municipal`

Actualización 4.0 (multiproyecto, aclaración menor — no cambia el resto de permisos):
"acceder a su proyecto asignado" significa que exista una fila en
`project_members` para ese usuario y proyecto. El enforcement se aplica
primero en backend; RLS se añade posteriormente. Ver PR-005 v3.0 y ADR-005 v2.0.

El Usuario municipal realiza captura básica y consulta.

Puede:
- acceder a su proyecto asignado;
- ver dashboard básico;
- consultar inventario;
- registrar nuevos árboles, incluida su medición dendrométrica inicial (PR-006 v7.0);
- registrar nuevas mediciones dendrométricas de los árboles de su proyecto asignado (PR-006 v7.0);
- editar datos básicos del árbol permitidos;
- consultar resultados técnicos;
- reportar y consultar incidencias;
- consultar mantenimiento;
- consultar indicadores básicos.

No realiza:
- evaluación técnica;
- inspección estructural;
- cálculo de severidades;
- cálculo de puntajes;
- evaluación de vitalidad;
- evaluación de riesgo;
- priorización técnica;
- modificación manual de resultados calculados.

Reemplaza cualquier regla anterior que tratara al usuario municipal como inspector técnico.

Aclaración 5.0 (CC-020): registrar una medición dendrométrica (MEDICIONES_DENDROMETRICAS) no constituye evaluación técnica ni inspección estructural. MEDICIÓN DENDROMÉTRICA e INSPECCIÓN TÉCNICA son conceptos distintos; su relación sigue pendiente (ADR-016). Los permisos para corregir o anular mediciones no se amplían en esta versión (PR-006 v7.0).

Afecta:
- frontend
- backend
- permisos
- RLS

## PR-003 — Rol Usuario municipal (v6.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 6.0
Reemplazada por: PR-003 v7.0
Motivo del reemplazo: el Usuario municipal registraba mediciones dendrométricas y, en desarrollo, evaluaciones técnicas; CC-026 limita su alta a nombre y ubicación y asigna los datos técnicos al Inspector.
Reemplaza: PR-003 v5.0
Origen: CC-022
Motivo: el Usuario municipal registra órdenes de trabajo y actualiza el estado de órdenes de trabajo e incidencias; el Administrador pasa a acceso de solo lectura sobre los datos del proyecto (PR-004 v5.0).

- Identificador interno: `usuario_municipal`
- Etiqueta de interfaz: `Usuario municipal`
- "Acceder a su proyecto asignado" significa que exista una fila en `project_members` para ese usuario y proyecto (PR-005 v3.0, ADR-005 v2.0).

Puede:
- acceder a su proyecto asignado;
- ver dashboard básico;
- consultar inventario;
- registrar nuevos árboles, incluida su medición dendrométrica inicial (PR-006 v7.0);
- registrar nuevas mediciones dendrométricas de los árboles de su proyecto asignado (PR-006 v7.0);
- editar datos básicos del árbol permitidos;
- consultar resultados técnicos;
- reportar y consultar incidencias, y actualizar su estado (CC-022);
- registrar órdenes de trabajo y actualizar su estado (CC-022);
- consultar indicadores básicos.

No realiza:
- cálculo de severidades;
- cálculo de puntajes;
- priorización técnica;
- modificación manual de resultados calculados.

Pendiente (CC-015, en revisión): si el Usuario municipal es también el Inspector y, por lo tanto, realiza la evaluación técnica (estructural, de vitalidad, de riesgo e infraestructura). La versión 5.0 lo excluía; con PR-004 v5.0 el Administrador ya no realiza evaluaciones, por lo que mientras CC-015 se resuelve el entorno de desarrollo conserva el registro de evaluaciones por el Usuario municipal (el cálculo lo realiza siempre el motor metodológico y no puede modificarse manualmente). También quedan pendientes en CC-015: el rol "Encargado de mantención" y quién puede corregir datos ya registrados (especie, mediciones, ubicación).

Aclaración (CC-020): registrar una medición dendrométrica no constituye evaluación técnica ni inspección estructural; su relación con la inspección sigue pendiente (ADR-016).

Afecta:
- frontend
- backend
- permisos
- RLS

## PR-003 — Rol Usuario municipal (v7.0)
Estado: vigente
Versión: 7.0
Reemplaza: PR-003 v6.0
Origen: CC-026
Motivo: auditoría del modelo de datos (2026-10-18): el Usuario municipal no registra datos técnicos; el alta del árbol se limita a nombre y ubicación; los datos técnicos los registra el Inspector mediante OT (PR-019 v1.0).

- Identificador interno: `usuario_municipal`
- Etiqueta de interfaz: `Usuario municipal`
- "Acceder a su proyecto asignado" significa que exista una fila en `project_members` para ese usuario y proyecto (PR-005 v3.0, ADR-005 v2.0).

Puede:
- acceder a su proyecto asignado;
- ver dashboard básico;
- consultar inventario, resultados técnicos e indicadores básicos;
- registrar el alta de un árbol solo con el nombre común o científico y la ubicación: coordenadas, sector y descripción del lugar; puede agregar de forma opcional el origen biogeográfico, que el Inspector confirma o corrige (PR-006 v8.0);
- crear órdenes de trabajo, incluidas las OT de Levantamiento, y actualizar su estado (CC-022); las OT de Mantenimiento las completa el Sistema (PR-020 v1.0). La prioridad de la OT se propone por defecto desde la `clasificacion_prioridad` vigente del árbol y puede modificarla;
- definir, al crear una OT de Mantenimiento, si requiere revisión del Inspector (`requiere_revision_inspector`); Tala y Retiro_tocón la exigen siempre;
- reportar, revisar y consultar incidencias, y actualizar su estado (CC-022).

No realiza:
- registro ni modificación de datos técnicos del árbol (origen biogeográfico, fustes, DAP, altura, copa, clase de edad) ni evaluaciones técnicas; las modificaciones posteriores al alta las realiza el Inspector mediante OT;
- revisión de ejecuciones de mantenimiento;
- cálculo de severidades, puntajes o priorización técnica;
- modificación manual de resultados calculados.

Pendiente (CC-026 P7): identificadores internos de los roles nuevos. El rol es global y un usuario puede pertenecer a varios proyectos (PR-005 v3.0).

Afecta:
- frontend
- backend
- permisos
- RLS

## PR-004 — Rol Administrador (v4.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 4.0
Reemplazada por: PR-004 v5.0
Motivo del reemplazo: el Administrador deja de realizar la evaluación y la gestión de inventario, infraestructura, incidencias y mantenimiento; conserva la gestión de proyectos y usuarios y la consulta de solo lectura (CC-022).

Actualización 3.0 (cierre C-4 y C-5): se fijan los identificadores del rol
y se reemplaza la regla sobre edición de resultados calculados por una
formulación estricta y sin ambigüedad.
- Identificador interno: `admin`
- Etiqueta de interfaz: `Administrador`

Actualización 4.0 (multiproyecto, aclaración menor — no cambia el resto de permisos):
"acceder a proyectos" significa acceso transversal a todos los proyectos en
esta versión; incluye crear proyectos y gestionar miembros (`project_members`).
Ver PR-005 v3.0 y ADR-005 v2.0.

El Administrador corresponde al equipo técnico que gestiona el sistema y realiza la evaluación del arbolado.

Puede:
- crear y gestionar proyectos;
- acceder a proyectos;
- gestionar inventarios;
- completar/corregir datos básicos;
- iniciar y completar evaluaciones técnicas;
- evaluar raíces/base;
- evaluar tronco;
- evaluar copa/ramas;
- evaluar vitalidad;
- gestionar infraestructura;
- gestionar incidencias;
- gestionar mantenimiento;
- consultar priorización;
- consultar indicadores y análisis.

Los resultados producidos por el motor metodológico no pueden ser modificados manualmente. Cualquier futura excepción deberá definirse como una regla explícita, versionada y trazable.

No existe actualmente mecanismo de override manual.

Afecta:
- frontend
- backend
- permisos
- RLS
- rules-engine

## PR-004 — Rol Administrador (v5.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 5.0
Reemplazada por: PR-004 v6.0
Motivo del reemplazo: no incluía la gestión de la delimitación territorial del proyecto (CC-026).
Reemplaza: PR-004 v4.0
Origen: CC-022
Motivo: decisión de la autora y su equipo (2026-10-09): el Administrador crea proyectos y agrega usuarios, y puede ver el proyecto completo en modo de solo lectura.

- Identificador interno: `admin`
- Etiqueta de interfaz: `Administrador`
- Acceso transversal a todos los proyectos en esta versión (PR-005 v3.0, ADR-005 v2.0).

Puede:
- crear y gestionar proyectos;
- gestionar los miembros de cada proyecto (`project_members`);
- consultar, en modo de solo lectura, toda la información de los proyectos: dashboard, inventario, mediciones, fichas, evaluaciones técnicas y de riesgo, infraestructura, mantención, incidencias e indicadores.

No realiza:
- registro ni edición de árboles o mediciones;
- evaluaciones técnicas (estructural, vitalidad, riesgo, infraestructura);
- registro de órdenes de trabajo o incidencias, ni cambios de su estado;
- modificación manual de resultados calculados.

Los resultados producidos por el motor metodológico no pueden ser modificados manualmente. Cualquier futura excepción deberá definirse como una regla explícita, versionada y trazable. No existe actualmente mecanismo de override manual.

Pendiente (CC-015): quién corrige datos ya registrados (la versión 4.0 permitía al Administrador "completar/corregir datos básicos").

Afecta:
- frontend
- backend
- permisos
- RLS

## PR-004 — Rol Administrador (v6.0)
Estado: vigente
Versión: 6.0
Reemplaza: PR-004 v5.0
Origen: CC-026
Motivo: agregar la gestión de la delimitación territorial del proyecto (auditoría del modelo de datos, 2026-10-18). Sin otros cambios respecto de v5.0.

- Identificador interno: `admin`
- Etiqueta de interfaz: `Administrador`
- Acceso transversal a todos los proyectos en esta versión (PR-005 v3.0, ADR-005 v2.0).

Puede:
- crear y gestionar proyectos;
- gestionar los miembros de cada proyecto (`project_members`);
- gestionar la delimitación territorial de cada proyecto: un polígono o multipolígono, dibujado o importado desde KML o KMZ de Google Earth (SECTORES). Los árboles heredan el `id_sector` del proyecto;
- consultar, en modo de solo lectura, toda la información de los proyectos: dashboard, inventario, mediciones, fichas, evaluaciones técnicas y de riesgo, infraestructura, mantención, incidencias e indicadores.

No realiza:
- registro ni edición de árboles o mediciones;
- evaluaciones técnicas (estructural, vitalidad, riesgo, infraestructura);
- registro de órdenes de trabajo o incidencias, ni cambios de su estado;
- modificación manual de resultados calculados.

El Administrador no modifica resultados calculados. El único ajuste permitido es el del Inspector, con justificación y trazabilidad (PR-008 v2.0).

Afecta:
- frontend
- backend
- permisos
- RLS

## PR-005 — Proyectos (v2.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 2.0
Reemplazada por: PR-005 v3.0
Motivo del reemplazo: la estructura física del modelo multiproyecto quedó aprobada por la autora; esta versión la dejaba "pendiente de revisión antes de implementar".

Actualización 2.0 (cierre C-1): se confirma que el modelo funcional es
multiproyecto y reemplaza el enfoque anterior sin `Project`. Esta decisión
se documentará en `architecture-decisions.md`. No se modifica `schema.sql`
todavía.

La plataforma es multiproyecto.

Un proyecto representa una gestión/inventario de arbolado asociada a una institución.

Debe contemplar conceptualmente:
- nombre del proyecto;
- institución responsable;
- profesional responsable;
- miembros/usuarios asociados;
- inventario propio;
- CRS/SRID de captura de coordenadas usado por el proyecto (ver PR-006).

Estructura conceptual objetivo:

```
Project
├── Members
├── Trees
├── Inspections
├── Incidents
├── Maintenance
└── ...
```

Los árboles deben pertenecer a un proyecto.

Entidades a revisar posteriormente (aún no implementar):
- `projects`
- `project_members`
- `trees.project_id`

La estructura exacta de base de datos queda pendiente de revisión antes de implementar.

Afecta:
- base de datos
- backend
- frontend
- permisos

## PR-005 — Proyectos (v3.0)
Estado: vigente
Versión: 3.0
Reemplaza: PR-005 v2.0
Motivo: cierre de la estructura física del modelo multiproyecto, aprobada por la autora. El detalle arquitectónico vive en ADR-005 v2.0.

La plataforma es multiproyecto. Un proyecto representa una gestión/inventario de arbolado asociado a una institución. Los árboles pertenecen a un proyecto.

### Tabla `projects`

- `id`
- `name` — `NOT NULL`
- `institution_name` — `NOT NULL`
- `responsible_professional` — `TEXT`, nullable por ahora
- `created_by` — `UUID`, nullable, FK a `user_profiles`, `ON DELETE SET NULL`
- `status` — valores `activo | cerrado`, default `activo`
- `created_at`
- `updated_at`

Sin `UNIQUE` global en `name` ni en `(institution_name, name)` por ahora.
Sin eliminación física normal: el cierre se representa con `status = 'cerrado'`.

### Tabla `project_members`

Representa **solo pertenencia** (no rol). Campos:

- `id`
- `project_id`
- `user_id`
- `created_at`
- `added_by` — nullable

Constraints y FKs:

- `UNIQUE(project_id, user_id)`
- `project_id → projects.id` `ON DELETE RESTRICT`
- `user_id → user_profiles.id` `ON DELETE RESTRICT`
- `added_by → user_profiles.id` `ON DELETE SET NULL`

El rol (`admin`, `usuario_municipal`) sigue siendo global en `user_profiles`.

### Columnas de scope

- `trees.project_id`, `incidents.project_id`, `public_spaces.project_id` se agregan **NULLABLE** en la migración `002`; objetivo final `NOT NULL` en `004`.
- No se crea backfill automático ni proyecto legacy. Si existen filas previas, la migración `003` requiere un mapeo explícito de la autora.
- `incidents.project_id` es directo; `incidents.tree_id` sigue nullable; si `tree_id` tiene valor, el árbol debe pertenecer al mismo `project_id`.
- `maintenance`, `infrastructure_conflicts`, `photos` e `inspections` no llevan `project_id` propio: derivan el proyecto vía `tree_id`.

### Catálogos e identificación

- `species` es global.
- `public_spaces` es scoped por proyecto: `UNIQUE(project_id, nombre)`; la misma plaza/nombre puede existir en proyectos distintos; un árbol no puede apuntar a un `public_space` de otro proyecto.
- `tree_code` mantiene la secuencia global (`A-000001`, …).
- CRS/SRID sigue pendiente (ADR-010 v2.0): no se agrega columna todavía.

### Despliegue

`002` estructura → backend con scoping rol + proyecto → `003` backfill (si corresponde) → `004` `SET NOT NULL` → RLS posterior.

Afecta:
- base de datos
- backend
- frontend
- permisos

## PR-006 — Registro básico del árbol (v5.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 5.0
Reemplazada por: PR-006 v6.0
Motivo del reemplazo: ADR-010 pasó a v2.0 vigente (CC-019); la sección "Coordenadas" la describía como estrategia propuesta no cerrada.

Actualización 3.0 (cierre C-2 y C-3): se aclara el manejo de coordenadas y
la resolución de datos de especie. Las listas siguientes describen
información presentada/capturada por la interfaz, no necesariamente
columnas físicas de `trees`.

Actualización 4.0 (revisión AD-2): se explicita que PostGIS es decisión
vigente y que el almacenamiento canónico en `geography(Point,4326)` con
transformación en backend es la estrategia propuesta actual (ADR-010), no
cerrada, y puede cambiar.

Actualización 5.0 (multiproyecto, aclaración menor):
el alta de árbol exige `project_id`; el espacio público seleccionado
(`public_spaces`) debe pertenecer al mismo proyecto que el árbol;
`tree_code` mantiene la secuencia global (`A-000001`, …); sin cambios en la
estrategia de coordenadas. Ver PR-005 v3.0.

El Usuario municipal puede registrar únicamente el bloque básico de la ficha:

Identificación:
- código del árbol automático;
- fecha de registro automática;
- registrado por automático.

Ubicación:
- comuna;
- dirección;
- lugar de referencia;
- coordenadas UTM Este/Norte;
- futura geolocalización.

Caracterización básica:
- especie científica;
- nombre común;
- DAP;
- altura total;
- diámetro de copa;
- altura de primera rama.

El Administrador puede consultar y corregir estos datos.

Coordenadas (cierre C-2, revisión AD-2):
- El uso de PostGIS se mantiene como decisión vigente.
- La interfaz actual contempla la captura de coordenadas UTM Este/Norte.
- Estrategia propuesta actual (ver ADR-010), no cerrada definitivamente: el almacenamiento canónico es `geography(Point,4326)` y el backend transforma las coordenadas capturadas a ese sistema antes de persistirlas.
- Esta estrategia puede cambiar posteriormente.
- Al ser la plataforma multiproyecto, no se asume una única zona UTM global; el CRS/SRID de captura lo define la configuración del proyecto (ver PR-005).
- No se modifica `schema.sql` todavía.

Datos de especie (cierre C-3):
- No hay duplicación: `nombre_comun` vive exclusivamente en `species`.
- Al seleccionar una especie, `nombre_cientifico` y `nombre_comun` se resuelven desde `species`.
- La política para crear nuevas especies en el catálogo queda pendiente.

Afecta:
- frontend
- backend
- base de datos
- permisos

## PR-006 — Registro básico del árbol (v6.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 6.0
Reemplazada por: PR-006 v7.0
Motivo del reemplazo: trataba DAP, altura total, diámetro de copa y altura de primera rama como atributos del árbol sobrescribibles, sin historial (CC-020, ADR-016).
Reemplaza: PR-006 v5.0
Origen: CC-019
Motivo: sincronizar la sección "Coordenadas" con ADR-010 v2.0. Sin otros cambios respecto de v5.0.

Actualización 3.0 (cierre C-2 y C-3): se aclara el manejo de coordenadas y
la resolución de datos de especie. Las listas siguientes describen
información presentada/capturada por la interfaz, no necesariamente
columnas físicas de `trees`.

Actualización 4.0 (revisión AD-2): se explicita que PostGIS es decisión
vigente y que el almacenamiento canónico en `geography(Point,4326)` con
transformación en backend es la estrategia propuesta actual (ADR-010), no
cerrada, y puede cambiar.

Actualización 5.0 (multiproyecto, aclaración menor):
el alta de árbol exige `project_id`; el espacio público seleccionado
(`public_spaces`) debe pertenecer al mismo proyecto que el árbol;
`tree_code` mantiene la secuencia global (`A-000001`, …); sin cambios en la
estrategia de coordenadas. Ver PR-005 v3.0.

El Usuario municipal puede registrar únicamente el bloque básico de la ficha:

Identificación:
- código del árbol automático;
- fecha de registro automática;
- registrado por automático.

Ubicación:
- comuna;
- dirección;
- lugar de referencia;
- coordenadas UTM Este/Norte;
- futura geolocalización.

Caracterización básica:
- especie científica;
- nombre común;
- DAP;
- altura total;
- diámetro de copa;
- altura de primera rama.

El Administrador puede consultar y corregir estos datos.

Coordenadas (cierre C-2, revisión AD-2; actualizado en v6.0, CC-019):
- El uso de PostGIS se mantiene como decisión vigente.
- La interfaz actual contempla la captura de coordenadas UTM Este/Norte.
- Estrategia vigente (ADR-010 v2.0): la ubicación canónica es `trees.ubicacion geography(Point,4326)` (WGS84 / EPSG:4326). La transformación desde el CRS de captura al sistema canónico es responsabilidad de la capa servidor de Valpo Verde; su mecanismo concreto está pendiente (ADR-010 v2.0).
- Una coordenada capturada directamente en WGS84 no requiere transformación.
- No se crean columnas de latitud/longitud como segunda ubicación editable. La coordenada original de levantamiento se conserva para trazabilidad; su estructura física está pendiente (ADR-010 v2.0).
- Esta estrategia puede cambiar posteriormente.
- Al ser la plataforma multiproyecto, no se asume una única zona UTM global; el CRS/SRID de captura lo define la configuración del proyecto (ver PR-005).
- No se modifica `schema.sql` todavía.

Datos de especie (cierre C-3):
- No hay duplicación: `nombre_comun` vive exclusivamente en `species`.
- Al seleccionar una especie, `nombre_cientifico` y `nombre_comun` se resuelven desde `species`.
- La política para crear nuevas especies en el catálogo queda pendiente.

Afecta:
- frontend
- backend
- base de datos
- permisos

## PR-006 — Registro básico del árbol (v7.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 7.0
Reemplazada por: PR-006 v8.0
Motivo del reemplazo: exigía la medición inicial en el alta, permitía al Usuario municipal registrar mediciones y determinaba la vigencia por `fecha_medicion` (CC-026).
Reemplaza: PR-006 v6.0
Origen: CC-020
Motivo: separar la identidad del árbol (ÁRBOL) de sus mediciones dendrométricas fechadas (MEDICIONES_DENDROMETRICAS) para conservar el historial dendrométrico (ADR-016).

Las listas siguientes describen la información presentada/capturada por la interfaz y su contrato funcional (DICCIONARIO_CAMPOS), no columnas físicas de la base de datos.

### Alta del árbol

Para el usuario, el alta es un único flujo:

Identificación → Ubicación → Especie → Medición dendrométrica inicial → Guardar

Conceptualmente, el alta produce ÁRBOL + MEDICIÓN INICIAL. El usuario no crea primero el árbol y después, en otro módulo, su primera medición. El alta se completa cuando quedan registrados el árbol georreferenciado y su medición dendrométrica inicial.

ÁRBOL — identidad y caracterización relativamente estable:

Identificación:
- código del árbol automático (`tree_code` mantiene la secuencia global `A-000001`, …);
- fecha de registro (alta) automática;
- registrado por automático;
- proyecto: el alta exige `project_id`; el espacio público seleccionado (`public_spaces`) debe pertenecer al mismo proyecto que el árbol (PR-005 v3.0).

Ubicación:
- ubicación canónica en WGS84 (`ubicacion_wgs84`), obligatoria para completar el alta;
- comuna;
- dirección;
- lugar de referencia.

Especie:
- especie científica;
- nombre común, resuelto desde el catálogo de especies.

MEDICIÓN DENDROMÉTRICA INICIAL — obligatoria para completar el alta:
- fecha de la medición;
- configuración de fustes;
- DAP (ejemplar de un solo fuste) o diámetros por fuste (ejemplar con más de un fuste);
- altura total (`altura_total_m`);
- diámetro de copa;
- altura de primera rama;
- clase de edad: opcional (estimación).

En un ejemplar con más de un fuste se conservan los diámetros individuales medidos. El DAP equivalente se calcula únicamente cuando exista una regla metodológica aprobada aplicable; mientras esa regla siga abierta puede quedar pendiente de cálculo, y su ausencia no impide completar la medición si se registraron los datos primarios obligatorios.

La definición funcional de cada campo (obligatoriedad, activación, dominio y ámbito) vive en DICCIONARIO_CAMPOS (PR-002 v2.2).

### Historial de mediciones

- Relación conceptual: ARBOLES 1:N MEDICIONES_DENDROMETRICAS.
- Nueva medición: nuevo evento dendrométrico realizado al ejemplar. No sobrescribe mediciones anteriores.
- Corrección: se modifica un dato erróneo de la misma medición, conservando auditoría. No constituye una nueva medición.
- Anulación: anulación lógica de la medición completa, que deja de considerarse válida. Permanece en el historial, no participa en la determinación del valor actual y conserva motivo, autor y fecha de anulación.
- Última medición válida: la medición no anulada con la `fecha_medicion` más reciente. `fecha_medicion` indica cuándo se realizó la medición; la fecha de registro indica cuándo fue ingresada al sistema, tiene función de trazabilidad administrativa y no determina cuál medición es la vigente.
- Valor dendrométrico actual: se deriva de la última medición válida. No existe como un segundo dato editable independiente.
- Especie: una modificación posterior de la identificación taxonómica es una corrección o refinamiento de identificación, no una nueva medición.

### Permisos

- El Usuario municipal registra el alta (árbol + medición inicial) y nuevas mediciones dendrométricas (PR-003 v5.0). Registrar una medición no constituye una inspección técnica.
- El Administrador puede consultar y corregir estos datos (PR-004).
- Pendiente: permisos de anulación de mediciones y si el Usuario municipal puede corregir mediciones o la especie.

### Coordenadas (cierre C-2, revisión AD-2; ADR-010 v2.0)

- El uso de PostGIS se mantiene como decisión vigente.
- La ubicación canónica es WGS84 / EPSG:4326 (ADR-010 v2.0). Una coordenada capturada directamente en WGS84 no requiere transformación.
- La captura de coordenadas en otro CRS (p. ej. UTM Este/Norte), el datum, el huso y la estructura de la coordenada original de levantamiento siguen pendientes (ADR-010 v2.0). No bloquean la ubicación canónica en WGS84.
- No se crean columnas de latitud/longitud como segunda ubicación editable. La coordenada original de levantamiento se conserva para trazabilidad; su estructura física está pendiente (ADR-010 v2.0).
- Al ser la plataforma multiproyecto, no se asume una única zona UTM global; el CRS/SRID de captura lo define la configuración del proyecto (ver PR-005).

### Datos de especie (cierre C-3)

- No hay duplicación: `nombre_comun` vive exclusivamente en `species`.
- Al seleccionar una especie, `nombre_cientifico` y `nombre_comun` se resuelven desde `species`.
- La política para crear nuevas especies en el catálogo queda pendiente.

### Pendientes (no se cierran en esta versión)

- Categorías definitivas de configuración de fustes (monofuste, bifurcado, multifuste) y su relación con el número de fustes y la regla de DAP equivalente.
- Política de especie no determinada, fuente y administración del catálogo de especies y nombres comunes (puede haber más de uno por especie).
- UTM, datum, huso y conservación de la coordenada original (ADR-010 v2.0).
- Relación MEDICIÓN ↔ INSPECCIÓN (ADR-016).
- Obligatoriedad de cada campo en mediciones posteriores a la inicial.
- Tratamiento metodológico de la clase de edad.
- Correspondencia entre comuna, dirección y lugar de referencia y los campos `sector` y `ubicacion_descriptiva` de DICCIONARIO_CAMPOS.
- Permisos de anulación y de corrección de mediciones por el Usuario municipal.

Esta PR no modifica `schema.sql`. El diseño físico se realiza después, a partir de CC-020.

Afecta:
- frontend
- backend
- base de datos
- permisos

## PR-006 — Registro básico del árbol (v8.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 8.0
Reemplazada por: PR-006 v9.0
Motivo del reemplazo: sus pendientes P1 a P4 quedaron resueltos por CC-028, CC-031 y CC-032.
Reemplaza: PR-006 v7.0
Origen: CC-026
Motivo: auditoría del modelo de datos (2026-10-18): el alta no exige medición; los datos técnicos los registra el Inspector en la inspección; los valores se hacen vigentes al completar la OT (ADR-016 v2.0).

Las listas siguientes describen la información capturada por la interfaz y su contrato funcional (DICCIONARIO_CAMPOS), no columnas físicas de la base de datos.

### Vías de registro

- **Alta municipal:** el Usuario municipal registra el árbol con el nombre común o científico y la ubicación (coordenadas, sector y descripción del lugar). Puede agregar de forma opcional el origen biogeográfico, que el Inspector confirma o corrige mediante OT. No se exige medición.
- **Registro en levantamiento:** el Inspector registra árboles nuevos durante una OT de Levantamiento, sin alta municipal previa.
- Si el árbol ya existe, se reutiliza su identificador y se agrega una nueva evaluación; no se duplica el árbol.
- Todo árbol registrado comienza como Presente, aunque su evaluación técnica esté pendiente. Sin evaluación vigente, la ficha muestra "Evaluación pendiente".

### Identificación y ubicación

- Código, fecha de registro y registrado por: automáticos.
- Proyecto e `id_sector`: el árbol hereda la delimitación territorial del proyecto (`id_sector`, no visible en el formulario, usado en los índices territoriales). `sector` es el texto descriptivo del barrio o sector y no se reemplaza por `id_sector`.
- Coordenadas UTM de ingreso manual (`utm_este`, `utm_norte`) con `huso` y `datum`, y descripción del lugar (`ubicacion_descriptiva`).
- Las modificaciones posteriores al alta las realiza el Inspector mediante OT y se hacen vigentes al completarla.

### Especie

- En el alta se acepta el nombre común o el científico. Para finalizar la inspección se exigen `especie_cientifica` y `nombre_comun`; no se admiten "Género sp." ni "No determinado".
- El Inspector confirma o corrige la identificación; la corrección se hace vigente al completar la OT.
- Solo el Inspector incorpora especies a CATALOGO_ESPECIES (`especie_cientifica`, `genero`, `familia`). El árbol se vincula por `especie_cientifica` normalizada. La ausencia de la especie en el catálogo no bloquea el alta.

### Datos técnicos e historial (ADR-016 v2.0)

- Los registra el Inspector en la inspección, mediante OT: origen biogeográfico, configuración de fustes y DAP, altura total (`altura_total_m` > 0), diámetros de copa norte–sur y este–oeste (el diámetro medio se calcula), altura de primera rama, altura de base de copa viva y clase de edad.
- Una nueva inspección puede precargar los valores anteriores; solo se conservan si el Inspector los confirma, y entonces cuentan como mediciones de esa inspección.
- No se sobrescribe el historial: la ficha muestra el valor vigente y la plataforma conserva cada versión anterior vinculada a la inspección que la registró.
- Los valores nuevos se hacen vigentes al completar toda la OT. El valor vigente es el de la OT completada más recientemente según `fecha_completada_ot`, aunque su inspección se haya realizado antes que otra.
- Una medición aplicable pendiente deja la inspección preguardada (PR-009 v3.0); no equivale a cero ni a "No presenta". "No presenta" se usa para características inexistentes y desactiva el valor numérico.

### Pendientes (CC-026, `docs/auditorias/2026-10-18-modelo-datos/pendientes.md`)

- P1: ubicación canónica en WGS84 con PostGIS (ADR-010 v2.0) frente a las coordenadas UTM de ingreso manual.
- P2: `nombre_comun` como campo del árbol o resuelto solo desde el catálogo de especies.
- P3: corrección y anulación lógica de una medición ya registrada.
- P4: categorías de configuración de fustes y regla de DAP equivalente.

Esta PR no modifica `schema.sql`.

Afecta:
- frontend
- backend
- base de datos
- permisos

## PR-006 — Registro básico del árbol (v9.0)
Estado: vigente
Versión: 9.0
Reemplaza: PR-006 v8.0
Origen: CC-028, CC-031, CC-032
Motivo: cerrar los pendientes P1 a P4 de la v8.0 con las resoluciones de CC-028 y las decisiones de la Fase 1 (2026-10-20).

Las listas siguientes describen la información capturada por la interfaz y su contrato funcional (DICCIONARIO_CAMPOS), no columnas físicas de la base de datos.

### Vías de registro

- **Alta municipal:** el Usuario municipal registra el árbol con el nombre común o científico y la ubicación (coordenadas UTM, sector y descripción del lugar). Puede agregar de forma opcional el origen biogeográfico, que el Inspector confirma o corrige mediante OT. No se exige medición.
- **Registro en levantamiento:** el Inspector registra árboles nuevos durante una OT de Levantamiento, sin alta municipal previa.
- Si el árbol ya existe, se reutiliza su identificador y se agrega una nueva evaluación; no se duplica el árbol.
- Todo árbol registrado comienza como Presente, aunque su evaluación técnica esté pendiente. Sin evaluación vigente, la ficha muestra "Evaluación pendiente".

### Identificación y ubicación

- Código, fecha de registro y registrado por: automáticos.
- Proyecto e `id_sector`: el árbol hereda la delimitación territorial del proyecto (`id_sector`, no visible en el formulario, usado en los índices territoriales). `sector` es el texto descriptivo del barrio o sector y no se reemplaza por `id_sector`.
- Coordenadas UTM de ingreso manual y obligatorio (`utm_este`, `utm_norte`). `huso` = 19S y `datum` = WGS84 son fijos y los asigna el Sistema (CC-028 P1). Descripción del lugar en `ubicacion_descriptiva`.
- Como ayuda, al marcar el punto en el mapa del formulario la plataforma rellena `utm_este` y `utm_norte`, que siguen siendo editables; se guardan las coordenadas UTM del formulario (CC-032).
- La geometría para el mapa y las consultas espaciales se deriva de las coordenadas UTM y es de solo lectura (ADR-010 v3.0).
- `estado_presencia` (Presente / Talado / Retirado) y `fecha_cambio_estado_presencia` se derivan de las OT completadas y de los MANTENIMIENTO aprobados (PR-020); no son datos editables del árbol.
- Las modificaciones posteriores al alta las realiza el Inspector mediante OT y se hacen vigentes al completarla.

### Especie

- `nombre_comun` es un dato del árbol (CC-028 P2).
- En el alta se acepta el nombre común o el científico. Para finalizar la inspección se exigen `especie_cientifica` y `nombre_comun`; no se admiten "Género sp." ni "No determinado".
- El Inspector confirma o corrige la identificación; la corrección se hace vigente al completar la OT.
- Solo el Inspector incorpora especies a CATALOGO_ESPECIES (`especie_cientifica`, `genero`, `familia`). El árbol se vincula por `especie_cientifica` normalizada. La ausencia de la especie en el catálogo no bloquea el alta.

### Datos técnicos e historial (ADR-016 v3.0)

- Los registra el Inspector en la inspección, mediante OT: origen biogeográfico (opcional en el alta, obligatorio para finalizar la inspección), `multifustal`, `numero_fustes`, `dap_fustes_cm` y `dap_cm` según la fórmula de DICCIONARIO_CAMPOS (CC-028 P4; no se usa `configuracion_fustes`), altura total (`altura_total_m` > 0), diámetros de copa norte–sur y este–oeste (el diámetro medio se calcula), altura de primera rama, altura de base de copa viva y clase de edad, que es obligatoria (CC-028 P5).
- Una nueva inspección puede precargar los valores anteriores; solo se conservan si el Inspector los confirma, y entonces cuentan como mediciones de esa inspección.
- No se sobrescribe el historial: la ficha muestra el valor vigente y la plataforma conserva cada versión anterior vinculada a la inspección que la registró.
- Los valores nuevos se hacen vigentes al completar toda la OT. El valor vigente es el de la OT completada más recientemente según `fecha_completada_ot` cuya inspección no esté anulada, aunque se haya realizado antes que otra.
- Corrección y anulación: según `estado_registro` de la inspección (PR-009 v4.0, CC-031).
- Una medición aplicable pendiente deja la inspección preguardada (PR-009 v4.0); no equivale a cero ni a "No presenta". "No presenta" se usa para características inexistentes y desactiva el valor numérico.

Esta PR no modifica `schema.sql`. El modelo físico se diseña en la Fase 3 (CC-032).

Afecta:
- frontend
- backend
- base de datos
- permisos

## PR-007 — Estado técnico derivado
Estado: propuesta
Versión: 1.0

No almacenar inicialmente un estado técnico duplicado si puede derivarse de las inspecciones.

Regla propuesta:

- sin inspección → `sin_evaluar`
- inspección en borrador → `evaluacion_en_curso`
- inspección completada → `evaluado`

Antes de persistir este estado como columna debe existir una razón técnica explícita.

Afecta:
- backend
- frontend

## PR-008 — Separación observado → calculado → decisión (v1.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 1.0
Reemplazada por: PR-008 v2.0
Motivo del reemplazo: la "regla futura explícita" para ajustar resultados calculados quedó definida en CC-026.

La arquitectura metodológica debe mantener:

dato observado
→ resultado calculado
→ evaluación agregada
→ decisión de gestión

El usuario/admin ingresa observaciones y mediciones.
El backend aplica reglas.
La plataforma devuelve resultados.

No permitir escribir manualmente resultados calculados salvo una regla futura explícita.

Afecta:
- base de datos
- backend
- rules-engine
- frontend

## PR-008 — Separación observado → calculado → decisión (v2.0)
Estado: vigente
Versión: 2.0
Reemplaza: PR-008 v1.0
Origen: CC-026
Motivo: define la regla explícita de ajuste de clasificaciones por el Inspector (auditoría del modelo de datos, 2026-10-18).

La arquitectura metodológica mantiene:

dato observado
→ resultado calculado
→ evaluación agregada
→ decisión de gestión

El Inspector ingresa observaciones y mediciones; el backend aplica las reglas y la plataforma devuelve los resultados.

Ajuste justificado (única excepción):
- El Inspector puede ajustar `clasificacion_riesgo`, `clasificacion_infraestructura` y `clasificacion_prioridad`.
- Todo ajuste exige `justificacion_ajuste_clasificacion`.
- Se conservan el valor calculado, el valor ajustado, el Inspector y la fecha del ajuste.
- Si se ajusta el riesgo o la infraestructura, la prioridad se calcula con el valor ajustado.
- Ningún otro resultado calculado se escribe manualmente, y ningún otro rol ajusta clasificaciones.

Afecta:
- base de datos
- backend
- rules-engine
- frontend

## PR-009 — Inspecciones (v1.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 1.0
Reemplazada por: PR-009 v2.0
Motivo del reemplazo: asignaba las inspecciones al Administrador, que pasa a solo lectura (CC-022).

Las inspecciones:
- pertenecen a un árbol;
- son realizadas por Administrador;
- comienzan como `borrador`;
- admiten autosave por sección;
- al completarse quedan inmutables;
- conservan `rule_version`.

Una inspección completada no se modifica retroactivamente.

Afecta:
- base de datos
- backend
- frontend
- rules-engine

## PR-009 — Inspecciones (v2.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 2.0
Reemplazada por: PR-009 v3.0
Motivo del reemplazo: no definía el rol que realiza las inspecciones ni su ciclo de preguardado (CC-026).
Reemplaza: PR-009 v1.0
Origen: CC-022
Motivo: el Administrador pasa a solo lectura (PR-004 v5.0).

Las inspecciones:
- pertenecen a un árbol;
- no son realizadas por el Administrador (PR-004 v5.0); el rol que las realiza se define en CC-015 (pendiente);
- comienzan como `borrador`;
- admiten autosave por sección;
- al completarse quedan inmutables;
- conservan `rule_version`.

Una inspección completada no se modifica retroactivamente.

Afecta:
- base de datos
- backend
- frontend
- rules-engine

## PR-009 — Inspecciones (v3.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 3.0
Reemplazada por: PR-009 v4.0
Motivo del reemplazo: no definía la corrección ni la anulación de una inspección (CC-031) y enviaba las fechas a un "calendario del módulo" que no existe (CC-037).
Reemplaza: PR-009 v2.0
Origen: CC-026
Motivo: definir quién realiza las inspecciones, su ciclo de preguardado y su vigencia (auditoría del modelo de datos, 2026-10-18).

Las inspecciones:
- pertenecen a un árbol y a una OT de Inspección (Evaluación inicial, Reevaluación, Evaluación instrumental, Monitoreo o Levantamiento). Una OT de Levantamiento puede abarcar varios árboles aún no identificados al crearla; su alcance es el proyecto y el área de trabajo descrita en la OT;
- las realiza el Inspector (PR-019 v1.0); no las realizan el Administrador ni el Usuario municipal;
- tienen `estado_registro`, asignado por el Sistema: `Preguardado` mientras falte un dato obligatorio o un dato condicional activado; `Finalizado` cuando están completas. Equivalen a `borrador` y `completada` de ADR-007;
- admiten guardado parcial;
- "Requiere evaluación instrumental" permite finalizar la inspección visual; si la base está cubierta y no permite observar raíces o cuello, la inspección queda preguardada;
- exigen cuatro fotografías nuevas (PR-010 v2.0);
- al finalizar quedan inmutables y conservan `rule_version`;
- sus valores se hacen vigentes solo cuando la OT pasa a Completada. La OT no puede completarse mientras alguna de sus inspecciones esté preguardada;
- `nivel_riesgo` se hereda de `clasificacion_riesgo` de su evaluación (incluido el ajuste del Inspector, PR-008 v2.0), con la escala Bajo / Moderado / Alto / Extremo;
- la plataforma sugiere `fecha_proxima_inspeccion` y `fecha_proximo_monitoreo` según `nivel_riesgo` (inicio del rango — inspección: Bajo 24 meses, Moderado 12 meses, Alto 1 a 3 meses, Extremo 1 a 4 semanas; monitoreo: Bajo 12 meses, Moderado 3 a 6 meses, Alto 2 a 4 semanas, Extremo inmediato y continuo). El Inspector puede ajustarlas registrando `justificacion_ajuste_fecha`. Al llegar la fecha de inicio, se envía al calendario del módulo.

En el Excel auditado la entidad se llama INSPECCION.

Una inspección finalizada no se modifica retroactivamente.

Afecta:
- base de datos
- backend
- frontend
- rules-engine

## PR-009 — Inspecciones (v4.0)
Estado: vigente
Versión: 4.0
Reemplaza: PR-009 v3.0
Origen: CC-031, CC-037
Motivo: definir la corrección y anulación de una inspección (CC-031) y reemplazar el envío al "calendario del módulo" por un recordatorio (CC-037).

Las inspecciones:
- pertenecen a un árbol y a una OT de Inspección (Evaluación inicial, Reevaluación, Evaluación instrumental, Monitoreo o Levantamiento). Una OT de Levantamiento puede abarcar varios árboles aún no identificados al crearla; su alcance es el proyecto y el área de trabajo descrita en la OT;
- las realiza el Inspector (PR-019 v1.1); no las realizan el Administrador ni el Usuario municipal;
- tienen `estado_registro`, asignado por el Sistema: `Preguardado` mientras falte un dato obligatorio o un dato condicional activado; `Finalizado` cuando están completas; `Anulado` cuando el Inspector anula una inspección finalizada (CC-031). Preguardado y Finalizado equivalen a `borrador` y `completada` de ADR-007;
- admiten guardado parcial;
- "Requiere evaluación instrumental" permite finalizar la inspección visual; si la base está cubierta y no permite observar raíces o cuello, la inspección queda preguardada;
- exigen cuatro fotografías nuevas (PR-010 v3.0);
- al finalizar quedan inmutables y conservan `rule_version`;
- sus valores se hacen vigentes solo cuando la OT pasa a Completada. La OT no puede completarse mientras alguna de sus inspecciones esté preguardada;
- `nivel_riesgo` se hereda de `clasificacion_riesgo` de su evaluación (incluido el ajuste del Inspector, PR-008 v2.0), con la escala Bajo / Moderado / Alto / Extremo;
- la plataforma sugiere `fecha_proxima_inspeccion` y `fecha_proximo_monitoreo` según `nivel_riesgo` (inicio del rango — inspección: Bajo 24 meses, Moderado 12 meses, Alto 1 a 3 meses, Extremo 1 a 4 semanas; monitoreo: Bajo 12 meses, Moderado 3 a 6 meses, Alto 2 a 4 semanas, Extremo inmediato y continuo). El Inspector puede ajustarlas registrando `justificacion_ajuste_fecha`.

Recordatorio (CC-037): SIVU no agenda automáticamente. Al llegar el inicio del rango, la fecha (la ajustada, si existe) aparece como recordatorio en la lista de próximas inspecciones y monitoreos del proyecto, con el inicio y el término del rango. Desde esa lista el Usuario municipal crea y programa la OT.

Corrección y anulación (CC-031):
- Mientras la inspección está Preguardado, el Inspector modifica libremente todos sus datos, incluidos los datos técnicos del árbol registrados en ella.
- Una inspección Finalizado no se modifica. Si contiene un error, el Inspector la anula registrando el motivo; el Sistema registra quién y cuándo.
- La inspección anulada se conserva en el historial con todos sus valores y deja de considerarse para la vigencia.
- Los datos correctos se registran en una nueva inspección: en la misma OT si todavía no está completada; si lo está, en una nueva OT.
- Solo el Inspector anula inspecciones. El Usuario municipal, el Administrador y el Encargado de mantención no anulan.

En el Excel auditado la entidad se llama INSPECCION.

Una inspección finalizada no se modifica retroactivamente.

Afecta:
- base de datos
- backend
- frontend
- rules-engine

## PR-010 — Fotografías (v1.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 1.0
Reemplazada por: PR-010 v2.0
Motivo del reemplazo: no exigía vistas fotográficas por inspección ni evidencia en mantenimiento e incidencias (CC-026).

Cada árbol puede tener hasta 20 fotografías.

Relación actual:
Tree → Photos

Las imágenes viven en Supabase Storage.
PostgreSQL almacena metadatos.

El límite debe validarse en frontend y backend.

La asociación directa a inspecciones/incidencias/intervenciones queda pendiente de futuras decisiones.

Afecta:
- frontend
- backend
- storage
- base de datos

## PR-010 — Fotografías (v2.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 2.0
Reemplazada por: PR-010 v3.0
Motivo del reemplazo: CC-028 (P9) resolvió el límite de fotografías y CC-036 definió la fotografía del reporte ciudadano.
Reemplaza: PR-010 v1.0
Origen: CC-026
Motivo: vistas fotográficas obligatorias por inspección y evidencia en mantenimiento e incidencias (auditoría del modelo de datos, 2026-10-18).

- Se permiten varias fotografías por árbol y por inspección.
- Para finalizar una inspección se exigen fotografías nuevas de cuatro vistas: árbol completo, base, tronco y copa. Las fotografías anteriores no cumplen las vistas obligatorias de una nueva inspección.
- Se conserva el historial fotográfico vinculado a cada inspección.
- Mantenimiento: la evidencia fotográfica de la ejecución es obligatoria para completar la OT (PR-020 v1.0).
- Incidencias: el reportante carga al menos una fotografía (textos del diccionario por confirmar, CC-026 P11).
- Las imágenes viven en Supabase Storage; PostgreSQL almacena metadatos (ADR-011).

Pendiente (CC-026 P9): el límite de 20 fotografías por árbol de la v1.0 no fue confirmado.

Afecta:
- frontend
- backend
- storage
- base de datos

## PR-010 — Fotografías (v3.0)
Estado: vigente
Versión: 3.0
Reemplaza: PR-010 v2.0
Origen: CC-028, CC-036
Motivo: CC-028 (P9) resolvió que no hay un límite fijo de fotografías y CC-036 definió la fotografía del reporte ciudadano.

- Se permiten varias fotografías por árbol y por inspección, sin un límite fijo (CC-028 P9).
- Para finalizar una inspección se exigen fotografías nuevas de cuatro vistas: árbol completo, base, tronco y copa. Las fotografías anteriores no cumplen las vistas obligatorias de una nueva inspección.
- Se conserva el historial fotográfico vinculado a cada inspección.
- Mantenimiento: la evidencia fotográfica de la ejecución es obligatoria para completar la OT (PR-020 v1.1).
- Incidencias: el reportante carga al menos una fotografía (jpg o png) en el formulario ciudadano público (PR-022 v1.0).
- Las imágenes viven en Supabase Storage; PostgreSQL almacena metadatos (ADR-011).

Afecta:
- frontend
- backend
- storage
- base de datos

## PR-011 — Motor de reglas (v1.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 1.0
Reemplazada por: PR-011 v2.0
Motivo del reemplazo: remitía el estado de las reglas a `docs/methodology/` y dejaba sin formato `rule_version`; ambos puntos quedan definidos por PR-002 v2.0 y `docs/workflow.md` §14. Origen: CC-001.

Las reglas técnicas deben implementarse en:
`services/rules/`

Cada cambio metodológico debe considerar `rule_version`.

Los diagramas/textos metodológicos en `docs/methodology/` determinan qué está:
- vigente;
- pendiente;
- obsoleto.

No implementar reglas pendientes.

Afecta:
- backend
- rules-engine

## PR-011 — Motor de reglas (v2.0)
Estado: vigente
Versión: 2.0
Reemplaza: PR-011 v1.0
Origen: CC-001

Las reglas técnicas deben implementarse en:
`services/rules/`

Cada cambio metodológico se registra como CC y se versiona según `docs/workflow.md` §14. `rule_version` corresponde a `MAJOR.MINOR` de la versión publicada del paquete metodológico (PR-002).

El estado de cada regla (vigente, pendiente, reemplazada, descartada) lo determina el paquete metodológico: columna `estado_regla` de REGLAS_INDICADORES a partir del paquete 2.0.0; hasta entonces rige el estado de transición de `docs/methodology/00-index.md`.

Solo se implementan reglas vigentes de una versión publicada. No implementar reglas pendientes, reemplazadas ni descartadas.

Afecta:
- backend
- rules-engine

## PR-012 — Probabilidad de falla
Estado: pendiente
Versión: 1.0

Las reglas individuales de severidad/puntaje de raíces, tronco y copa pueden estar definidas en metodología.

La conversión definitiva de puntaje total a probabilidad de falla todavía está pendiente de consolidación.

No implementar rangos definitivos hasta que sean marcados como vigentes en metodología.

Afecta:
- rules-engine
- probability_thresholds

## PR-013 — SL y agravantes
Estado: vigente
Versión: 2.0

La rama:
`SL >= 20% + agravantes`

queda descartada y no debe implementarse aunque aparezca en versiones antiguas de diagramas.

La condición vigente asociada a SL será únicamente la que esté documentada como válida en `docs/methodology/`.

Reemplaza cualquier regla anterior sobre agravantes.

Afecta:
- rules-engine
- metodología raíces
- metodología tronco

## PR-014 — Impacto, consecuencias y riesgo final
Estado: pendiente
Versión: 1.0

No implementar todavía:
- probabilidad de impacto;
- consecuencias;
- matriz final de riesgo;
- riesgo final automático.

Se implementarán cuando sus diagramas estén entregados y marcados como vigentes.

Afecta:
- rules-engine
- backend
- frontend
- risk_evaluations

## PR-015 — Geolocalización (v1.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 1.0
Reemplazada por: PR-015 v2.0
Motivo del reemplazo: se definió la tecnología SIG (ADR-015) y se autorizó el mapa de inventario, que esta versión prohibía (CC-019).

La arquitectura debe quedar preparada para geolocalización.

PostGIS se mantiene.

El proveedor cartográfico aún no está definido.

No implementar mapa definitivo todavía.

El objetivo futuro es una experiencia territorial similar conceptualmente a Groundzy:
- árboles georreferenciados;
- selección desde mapa;
- panel contextual;
- ubicación del dispositivo;
- registro desde ubicación;
- filtros territoriales.

Afecta:
- base de datos
- frontend
- backend

## PR-015 — Geolocalización (v2.0)
Estado: vigente
Versión: 2.0
Reemplaza: PR-015 v1.0
Origen: CC-019
Motivo: decisión SIG-0 de marybaxmann (2026-10-04). El detalle arquitectónico vive en ADR-015 y ADR-010 v2.0.

PostGIS se mantiene como única fuente de verdad espacial (ADR-010 v2.0).

Tecnología SIG del frontend: ArcGIS Maps SDK for JavaScript (ADR-015).

Se autoriza el desarrollo progresivo del mapa. Primer caso de uso: mapa de inventario de árboles por proyecto, alimentado por el backend. Las capas de riesgo, priorización, infraestructura, mantenimiento, incidencias y órdenes de trabajo se incorporan posteriormente.

ArcGIS no es fuente de datos ni de cálculo:
- ninguna capa ArcGIS es editable desde la plataforma; toda escritura pasa por la API;
- ArcGIS no calcula riesgo, prioridad ni otra clasificación metodológica.

Pendiente: seleccionar y validar el mecanismo de acceso/autenticación a los servicios cartográficos ArcGIS requeridos para desarrollo y producción (ADR-015). Debe resolverse antes de implementar el mapa que dependa de dichos servicios.

El objetivo progresivo es una experiencia territorial que permita:
- árboles georreferenciados;
- selección desde mapa;
- panel contextual;
- ubicación del dispositivo;
- registro desde ubicación;
- filtros territoriales.

Afecta:
- base de datos
- frontend
- backend

## PR-016 — Groundzy (v2.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 2.0
Reemplazada por: PR-016 v3.0
Motivo del reemplazo: el punto 2 de la prioridad de referencias citaba "Diagramas / metodología (`docs/methodology/`)" como fuente técnica; se actualiza a la fuente definida por PR-002 v2.0. Sin otros cambios. Origen: CC-001.

Actualización 2.0 (cierre W-1): se elimina la contradicción entre calificar
a Groundzy como "principal" y ubicarla en el puesto 3 de la lista de
prioridad. Groundzy queda definida como referencia secundaria.

Groundzy inspira experiencia visual y organización de UX.

No define:
- lógica;
- metodología;
- reglas de negocio;
- estructura de datos.

Es secundaria respecto del prototipo propio (`marybaxmann/Valpo-Verde-Conecta`)
y de la metodología.

Prioridad de referencias (de mayor a menor autoridad):
1. Prototipo funcional propio (`marybaxmann/Valpo-Verde-Conecta`) — referencia funcional/UX.
2. Diagramas / metodología (`docs/methodology/`) — fuente técnica.
3. Groundzy — referencia visual/UX secundaria.
4. Otras referencias secundarias.

Afecta:
- frontend
- UX

## PR-016 — Groundzy (v3.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 3.0
Reemplaza: PR-016 v2.0
Origen: CC-001
Reemplazada por: PR-016 v4.0
Motivo del reemplazo: ubicaba el prototipo como primera referencia funcional/UX, por encima de la documentación vigente, y mantenía a Groundzy como referencia visual. Se adopta una jerarquía única de fuentes y una referencia visual principal aprobada. Origen: CC-021.

Groundzy inspira experiencia visual y organización de UX.

No define:
- lógica;
- metodología;
- reglas de negocio;
- estructura de datos.

Es secundaria respecto del prototipo propio (`marybaxmann/Valpo-Verde-Conecta`)
y de la metodología.

Prioridad de referencias (de mayor a menor autoridad):
1. Prototipo funcional propio (`marybaxmann/Valpo-Verde-Conecta`) — referencia funcional/UX.
2. Paquete metodológico (PR-002, `docs/methodology/`) — fuente técnica.
3. Groundzy — referencia visual/UX secundaria.
4. Otras referencias secundarias.

Afecta:
- frontend
- UX

## PR-016 — Jerarquía de fuentes de producto y referencias visuales (v4.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 4.0
Reemplazada por: PR-016 v5.0
Motivo del reemplazo: incorpora referencias visuales complementarias de inspiración UX/UI, entre ellas una de Groundzy, mediante decisión explícita (CC-023).
Reemplaza: PR-016 v3.0
Origen: CC-021

Jerarquía de fuentes (de mayor a menor autoridad). Ante contradicción manda el nivel superior:

1. Metodología y fuentes vigentes — paquete metodológico (PR-002).
2. Decisiones controladas — ADR, PR y CC.
3. Backend y API vigentes.
4. Documentación vigente del proyecto.
5. Figma y prototipo histórico (`marybaxmann/Valpo-Verde-Conecta`) — solo intención funcional (PR-001 v3.0).
6. Referencias visuales aprobadas — solo UX/UI.

Las referencias de los niveles 5 y 6 nunca definen lógica, metodología, reglas de negocio, estructura de datos ni permisos, y no pueden prevalecer sobre una decisión posterior.

Referencia visual aprobada:
- Principal y única referencia visual oficial vigente: `valpo-verde-frontend/docs/referencias/visuales/03_CityDashboardsButton.jpg`. Función exclusivamente visual: composición, lenguaje gráfico, relación mapa–paneles, densidad informativa y paleta. No define funcionalidad ni metodología.
- Groundzy deja de ser referencia visual oficial, para evitar lenguajes visuales contradictorios. Una idea concreta de Groundzy puede reincorporarse solo mediante decisión explícita.

Los diagramas de decisión metodológicos no son referencias de UI: pertenecen al paquete metodológico (PR-002).

Afecta:
- frontend
- UX
- documentación

## PR-016 — Jerarquía de fuentes de producto y referencias visuales (v5.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 5.0
Reemplazada por: PR-016 v6.0
Motivo del reemplazo: adopta el prototipo SIVU Territorio como referencia visual principal y fija sus reglas de integración (CC-025).
Reemplaza: PR-016 v4.0
Origen: CC-023

Jerarquía de fuentes (de mayor a menor autoridad). Ante contradicción manda el nivel superior:

1. Metodología y fuentes vigentes — paquete metodológico (PR-002).
2. Decisiones controladas — ADR, PR y CC.
3. Backend y API vigentes.
4. Documentación vigente del proyecto.
5. Figma y prototipo histórico (`marybaxmann/Valpo-Verde-Conecta`) — solo intención funcional (PR-001 v3.0).
6. Referencias visuales aprobadas — solo UX/UI.

Las referencias de los niveles 5 y 6 nunca definen lógica, metodología, reglas de negocio, estructura de datos ni permisos, y no pueden prevalecer sobre una decisión posterior.

Referencia visual principal (sin cambio): `valpo-verde-frontend/docs/referencias/visuales/03_CityDashboardsButton.jpg` — composición, lenguaje gráfico, relación mapa–paneles, densidad informativa y paleta.

Referencias visuales complementarias (inspiración UX/UI, CC-023). Son material de terceros: se conservan fuera del repositorio público y se describen aquí por lo que aportan.
- Vista de árbol de Groundzy (escritorio y móvil): ficha lateral del ejemplar con pestañas, mediciones con íconos, pines legibles sobre mapa satelital, barra de herramientas sobre el mapa. Se reincorpora como idea concreta, según lo previsto en PR-016 v4.0.
- Tablero agrícola en tablet (mapa satelital con parcelas): tarjeta de resumen flotante sobre el mapa con barras de estado.
- Farm Management System: gráficos de dona con porcentajes y tarjetas de indicadores tintadas por categoría.
- Wisetown (tablero de áreas verdes): barras horizontales ordenadas y gráficos de evolución.

Reglas de uso de las referencias complementarias:
- Se adaptan a la arquitectura, los módulos y los datos de SIVU; no se copian su identidad, marca, nombres ni composición literal (por ejemplo, el botón verde lima y la barra en píldora de Groundzy).
- La paleta oficial de riesgo (Bajo `#DCE8A9`, Moderado `#F9B52B`, Alto `#F04A32`, Extremo `#C7252B`) no se modifica y se usa solo para el riesgo. Los colores de módulo evitan esos tonos.
- No se incorporan elementos que impliquen funciones o resultados que SIVU no calcula (por ejemplo, recomendaciones automáticas tipo "AI insight").
- Los gráficos se usan solo cuando aportan a la lectura del módulo y siempre con datos reales.
- Antes de rediseñar la interfaz se valida una maqueta visual con la autora.

Los diagramas de decisión metodológicos no son referencias de UI: pertenecen al paquete metodológico (PR-002).

Afecta:
- frontend
- UX
- documentación

## PR-016 — Jerarquía de fuentes de producto y referencias visuales (v6.0)
Estado: vigente
Versión: 6.0
Reemplaza: PR-016 v5.0
Origen: CC-025

Jerarquía de fuentes (de mayor a menor autoridad). Ante contradicción manda el nivel superior:

1. Metodología y fuentes vigentes — paquete metodológico (PR-002).
2. Decisiones controladas — ADR, PR y CC.
3. Backend y API vigentes.
4. Documentación vigente del proyecto.
5. Figma y prototipo histórico (`marybaxmann/Valpo-Verde-Conecta`) — solo intención funcional (PR-001 v3.0).
6. Referencias visuales aprobadas — solo UX/UI.

Las referencias de los niveles 5 y 6 nunca definen lógica, metodología, reglas de negocio, estructura de datos ni permisos, y no pueden prevalecer sobre una decisión posterior. El Excel maestro "Base de Datos Valpo Verde" (paquete metodológico, PR-002) conserva su autoridad sobre los campos y las reglas que documenta: ningún elemento de una referencia visual lo sustituye.

Referencia visual principal (CC-025): prototipo "SIVU Territorio" — repositorio `valpo-verde-frontend`, rama `prototype/sivu-territorio-v1`, carpeta `prototypes/sivu-territorio-lab/`. Línea base aprobada: commit `c852104`.
- Define la dirección visual: composición, lenguaje gráfico, navegación, relación mapa–paneles y estilo de la ficha.
- La aprobación corresponde a la dirección visual, no a cada componente, contenido o interacción particular.
- No es una implementación funcional terminada.
- Sus ajustes visuales posteriores pueden continuar dentro del proceso de diseño, validados con la autora, sin considerarse cambios funcionales aprobados.

Antecedente e inspiración complementaria: `valpo-verde-frontend/docs/referencias/visuales/03_CityDashboardsButton.jpg` (composición mapa–paneles, densidad informativa).

Referencias visuales complementarias (inspiración UX/UI, CC-023), sin cambio. Son material de terceros: se conservan fuera del repositorio público y se describen aquí por lo que aportan.
- Vista de árbol de Groundzy (escritorio y móvil): ficha lateral del ejemplar con pestañas, mediciones con íconos, pines legibles sobre mapa satelital, barra de herramientas sobre el mapa. Se reincorpora como idea concreta, según lo previsto en PR-016 v4.0.
- Tablero agrícola en tablet (mapa satelital con parcelas): tarjeta de resumen flotante sobre el mapa con barras de estado.
- Farm Management System: gráficos de dona con porcentajes y tarjetas de indicadores tintadas por categoría.
- Wisetown (tablero de áreas verdes): barras horizontales ordenadas y gráficos de evolución.

Reglas de uso de las referencias complementarias:
- Se adaptan a la arquitectura, los módulos y los datos de SIVU; no se copian su identidad, marca, nombres ni composición literal (por ejemplo, el botón verde lima y la barra en píldora de Groundzy).
- La paleta oficial de riesgo (Bajo `#DCE8A9`, Moderado `#F9B52B`, Alto `#F04A32`, Extremo `#C7252B`) no se modifica y se usa solo para el riesgo. Los colores de módulo evitan esos tonos.
- No se incorporan elementos que impliquen funciones o resultados que SIVU no calcula (por ejemplo, recomendaciones automáticas tipo "AI insight").
- Los gráficos se usan solo cuando aportan a la lectura del módulo y siempre con datos reales.
- Antes de rediseñar la interfaz se valida una maqueta visual con la autora.

Reglas de integración del prototipo:
1. La adaptación es progresiva, módulo por módulo. Cada módulo se integra por separado sobre `main`, con revisión y validación de la autora.
2. El rediseño UX/UI no modifica por sí mismo módulos, campos, rutas, funcionalidades, permisos ni reglas de negocio.
   - Se conservan todos los módulos existentes y sus capacidades.
   - Pueden reorganizarse visualmente o cambiar su nombre visible solo con aprobación previa de la autora.
   - Las decisiones funcionales pendientes (por ejemplo CC-015, CC-020 o DA-01 a DA-04) evolucionan solo mediante su propio procedimiento de control de cambios.
3. Si el prototipo muestra un campo, dato, acción o texto que no coincide con lo vigente (por ejemplo, "Coordenadas WGS84"), manda lo vigente. La diferencia se registra como pendiente y no se implementa.
4. Esta referencia no autoriza a incorporar al frontend productivo datos ficticios, campos no validados ni reglas metodológicas provisionales. Los datos de ejemplo del prototipo (`src/data/mock.ts`) nunca pasan al código productivo; los gráficos y los indicadores se construyen solo con datos de la API.
5. El código del prototipo no se importa desde la aplicación productiva: se reescribe dentro de su arquitectura.

Roles:
- Según la autora (2026-10-16), el modelo funcional objetivo de SIVU contempla cuatro roles: Administrador, Usuario municipal, Inspector y Mantenimiento. Su definición sigue en conciliación en CC-015 (varios roles por persona, asignación por proyecto, permisos).
- El prototipo representa los dos roles implementados hoy (Administrador y Usuario municipal, CC-022). Ese modelo no es la definición funcional definitiva, y el prototipo no lo fija ni sustituye el objetivo.
- La interfaz integrada se adapta al rol que confirma el backend.
- El selector "Ver como" es un recurso de revisión del prototipo, no una función.

Cartografía:
- La imagen aérea del prototipo (Esri/Maxar) es material de terceros. No se versiona en repositorios públicos y su único uso es la revisión local.
- El frontend productivo usa la cartografía de la arquitectura SIG vigente (ADR-015, CC-019): ArcGIS solo para representar, con la atribución que exige el proveedor, y sin imágenes fijas descargadas.
- Cualquier imagen o capa nueva debe tener una licencia compatible con un repositorio público, o quedar fuera de él, documentada.

Los diagramas de decisión metodológicos no son referencias de UI: pertenecen al paquete metodológico (PR-002).

Afecta:
- frontend
- UX
- documentación

## PR-017 — Arquitectura técnica
Estado: vigente
Versión: 1.0

Arquitectura objetivo:

Frontend React/Vite/TypeScript
→ API REST
→ Backend Node/Express/TypeScript
→ PostgreSQL/Supabase

Frontend y backend permanecen como proyectos independientes.

El backend es fuente de verdad para lógica de negocio y cálculos.

Afecta:
- arquitectura completa

## PR-018 — Autenticación (v2.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 2.0
Reemplazada por: PR-018 v3.0
Motivo del reemplazo: permitía que las escrituras llegaran a la base con el JWT del usuario; desde CC-033 (DA-01) las escrituras pasan solo por el backend.

Login mediante Supabase Auth desde frontend.

No implementar `POST /api/auth/login` en Express.

Backend valida JWT recibido.

`SUPABASE_SERVICE_ROLE_KEY` solo existe en backend.

Actualización 2.0 (cierre RLS/cutover, ver ADR-014): la autorización
tiene dos capas — backend (`assertAdmin`, `assertProjectAccess`,
validaciones de rol/membership) y RLS en Supabase/Postgres (migración
`005`). RLS no reemplaza la autorización de backend; ambas coexisten.
Para operaciones realizadas en nombre de un usuario autenticado, el
backend consulta Supabase con el JWT de ese usuario (`req.accessToken`
→ `createUserScopedClient`), no con `service_role`. `service_role`
queda reservado a `auth`/perfil y operaciones internas privilegiadas.

Contrato del frontend (repositorio separado, `valpo-verde-frontend`):
- obtiene su sesión/JWT mediante Supabase Auth directamente;
- envía `Authorization: Bearer <JWT>` al backend en cada request;
- NUNCA usa ni contiene `SUPABASE_SERVICE_ROLE_KEY`; puede usar la
  `anon`/publishable key para su propia sesión de Supabase Auth;
- el backend determina `req.user` y los permisos; el frontend no
  decide seguridad, solo adapta la UI según el rol confirmado (p. ej.
  vía `GET /api/auth/me`).

Afecta:
- frontend
- backend
- seguridad

## PR-018 — Autenticación (v3.0)
Estado: vigente
Versión: 3.0
Reemplaza: PR-018 v2.0
Origen: CC-033
Motivo: las escrituras pasan solo por el backend (DA-01), que escribe con la credencial de servicio después de autorizar (ADR-014 v2.0).

Login mediante Supabase Auth desde frontend.

No implementar `POST /api/auth/login` en Express.

Backend valida JWT recibido.

La autorización tiene dos capas: backend (`authorization.service.ts`) y RLS en Supabase/Postgres.

- **Lecturas:** el backend consulta Supabase con el JWT del usuario (`createUserScopedClient`) y las RLS filtran por proyecto y rol.
- **Escrituras:** solo por el backend. Después de su autorización funcional y de las validaciones, el backend escribe con la credencial de servicio. Las RLS no permiten escrituras directas a los roles de sesión (`authenticated`, `anon`) en las tablas de datos.
- **Autor:** el backend registra explícitamente quién crea o modifica cada fila con el usuario autenticado; no depende de valores por defecto de la sesión.
- **Formulario ciudadano (PR-022):** endpoint público del backend, sin sesión, que escribe con la credencial de servicio después de validar y limitar las solicitudes.

`SUPABASE_SERVICE_ROLE_KEY` (credencial de servicio) solo existe en las variables de entorno del servidor del backend. Nunca llega al frontend y nunca queda en el repositorio: no aparece en el código, en `.env.example`, en registros ni en respuestas de la API.

Contrato del frontend (repositorio separado, `valpo-verde-frontend`):
- obtiene su sesión/JWT mediante Supabase Auth directamente;
- envía `Authorization: Bearer <JWT>` al backend en cada request;
- NUNCA usa ni contiene la credencial de servicio; puede usar la `anon`/publishable key para su propia sesión de Supabase Auth;
- no escribe directamente en Supabase: toda escritura pasa por la API;
- el backend determina `req.user` y los permisos; el frontend no decide seguridad, solo adapta la UI según el rol confirmado (p. ej. vía `GET /api/auth/me`).

Afecta:
- frontend
- backend
- seguridad
- RLS

## PR-019 — Rol Inspector (v1.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 1.0
Reemplazada por: PR-019 v1.1
Motivo del reemplazo: dejaba pendiente el identificador interno (CC-032) y no incluía la anulación de inspecciones (CC-031).
Origen: CC-026
Motivo: definir el rol técnico (auditoría del modelo de datos, 2026-10-18; resuelve la parte de CC-015 sobre el Inspector).

- Identificador interno: pendiente (CC-026 P7).
- Etiqueta de interfaz: `Inspector`. Es el término único del rol técnico; no se usa "Inspector Municipal".

Puede:
- realizar las inspecciones de las OT de Inspección, incluida la OT de Levantamiento (PR-009 v3.0);
- registrar árboles nuevos durante una OT de Levantamiento, sin alta municipal previa (PR-006 v8.0);
- registrar y modificar todos los datos técnicos del árbol y de la evaluación mediante OT;
- confirmar o corregir la especie e incorporar especies a CATALOGO_ESPECIES;
- aprobar o rechazar las ejecuciones de mantenimiento cuya OT requiere revisión (PR-020 v1.0);
- ajustar `clasificacion_riesgo`, `clasificacion_infraestructura` y `clasificacion_prioridad` con justificación (PR-008 v2.0);
- ajustar las fechas sugeridas de próxima inspección y monitoreo con justificación (PR-009 v3.0).

No realiza:
- creación de proyectos ni gestión de miembros;
- creación de órdenes de trabajo;
- modificación de resultados calculados fuera del ajuste justificado de PR-008 v2.0.

Afecta:
- frontend
- backend
- permisos
- RLS

## PR-019 — Rol Inspector (v1.1)
Estado: vigente
Versión: 1.1
Reemplaza: PR-019 v1.0
Origen: CC-031, CC-032
Motivo: fijar el identificador interno del rol (CC-032) y la anulación de inspecciones (CC-031).

- Identificador interno: `inspector`.
- Etiqueta de interfaz: `Inspector`. Es el término único del rol técnico; no se usa "Inspector Municipal".
- Rol global: un usuario tiene un solo rol (AMD-31).

Puede:
- realizar las inspecciones de las OT de Inspección, incluida la OT de Levantamiento (PR-009 v4.0);
- registrar árboles nuevos durante una OT de Levantamiento, sin alta municipal previa (PR-006 v9.0);
- registrar y modificar todos los datos técnicos del árbol y de la evaluación mediante OT;
- anular una inspección finalizada, con motivo (PR-009 v4.0);
- confirmar o corregir la especie e incorporar especies a CATALOGO_ESPECIES;
- aprobar o rechazar las ejecuciones de mantenimiento cuya OT requiere revisión (PR-020 v1.1);
- ajustar `clasificacion_riesgo`, `clasificacion_infraestructura` y `clasificacion_prioridad` con justificación (PR-008 v2.0);
- ajustar las fechas sugeridas de próxima inspección y monitoreo con justificación (PR-009 v4.0).

No realiza:
- creación de proyectos ni gestión de miembros;
- creación de órdenes de trabajo;
- modificación de resultados calculados fuera del ajuste justificado de PR-008 v2.0.

Afecta:
- frontend
- backend
- permisos
- RLS

## PR-020 — Rol Encargado de mantención y revisión de mantenimiento (v1.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 1.0
Reemplazada por: PR-020 v1.1
Motivo del reemplazo: dejaba pendiente el identificador interno (CC-032).
Origen: CC-026
Motivo: definir la ejecución de mantenimiento y cuándo la revisa el Inspector (auditoría del modelo de datos, 2026-10-18; resuelve la parte de CC-015 sobre "Encargado de mantención").

- Identificador interno: pendiente (CC-026 P7).
- Etiqueta de interfaz: `Encargado de mantención`.

El Encargado de mantención registra la ejecución de las OT de Mantenimiento que tiene asignadas y su evidencia fotográfica, que es obligatoria.

Revisión del Inspector:
- La define el Usuario municipal al crear la OT (`requiere_revision_inspector`; valor inicial No).
- Tala y Retiro_tocón exigen siempre revisión; el Sistema fija Sí y no permite cambiarlo.
- Sin revisión: el Sistema completa la OT al registrarse la ejecución con `resultado` = Ejecutado completamente y la evidencia. Con Ejecutado parcialmente o No ejecutado, la OT permanece En ejecución.
- Con revisión: el Sistema completa la OT cuando el Inspector registra `estado_revision = Aprobado`.
- Rechazo: la OT vuelve a En ejecución; la corrección se registra como un nuevo registro de MANTENIMIENTO con el mismo `id_ot` y se conservan los anteriores.
- `estado_presencia` cambia a Talado o Retirado solo después de la aprobación del Inspector.

Afecta:
- frontend
- backend
- base de datos
- permisos
- RLS

## PR-020 — Rol Encargado de mantención y revisión de mantenimiento (v1.1)
Estado: vigente
Versión: 1.1
Reemplaza: PR-020 v1.0
Origen: CC-032
Motivo: fijar el identificador interno del rol (CC-032).

- Identificador interno: `encargado_mantencion`.
- Etiqueta de interfaz: `Encargado de mantención`.
- Rol global: un usuario tiene un solo rol (AMD-31).

El Encargado de mantención registra la ejecución de las OT de Mantenimiento que tiene asignadas y su evidencia fotográfica, que es obligatoria.

Revisión del Inspector:
- La define el Usuario municipal al crear la OT (`requiere_revision_inspector`; valor inicial No).
- Tala y Retiro_tocón exigen siempre revisión; el Sistema fija Sí y no permite cambiarlo.
- Sin revisión: el Sistema completa la OT al registrarse la ejecución con `resultado` = Ejecutado completamente y la evidencia. Con Ejecutado parcialmente o No ejecutado, la OT permanece En ejecución.
- Con revisión: el Sistema completa la OT cuando el Inspector registra `estado_revision = Aprobado`.
- Rechazo: la OT vuelve a En ejecución; la corrección se registra como un nuevo registro de MANTENIMIENTO con el mismo `id_ot` y se conservan los anteriores.
- `estado_presencia` cambia a Talado o Retirado solo después de la aprobación del Inspector. Es un valor derivado, no un dato editable del árbol (PR-006 v9.0).

Afecta:
- frontend
- backend
- base de datos
- permisos
- RLS

## PR-021 — Catálogos y códigos persistentes (v1.0)
Estado: vigente
Versión: 1.0
Origen: CC-034
Motivo: el Excel maestro ya no contiene la tabla de códigos de LISTAS (CC-004) y no la tendrá; los códigos persistentes se definen en el backend.

- El Excel maestro define los valores permitidos de cada campo y sus etiquetas (DICCIONARIO_CAMPOS, columna "Unidad / valores"; LISTAS para los menús y su jerarquía).
- El backend define el **código persistente** de cada valor, en un único registro de catálogos que reemplaza a `src/services/rules/moduleCatalogs.ts`. Cada valor registra: catálogo, código, etiqueta, orden (solo escalas), valor padre (solo catálogos jerárquicos), estado (`vigente`, `reemplazado` o `descartado`) y el CC que lo creó o modificó.
- Formato del código: snake_case ASCII (`^[a-z0-9_]+$`), único dentro de su catálogo. Un código nunca se reutiliza ni se renombra.
- **Los códigos ya guardados en la base de datos no cambian** (por ejemplo, las acciones de mantenimiento y los estados de OT e incidencias).
- Un cambio de etiqueta en el Excel no cambia el código. Un valor que deja de usarse se marca `reemplazado` o `descartado`; no se borra mientras haya datos que lo referencien.
- Un test automático compara las etiquetas del registro con DICCIONARIO_CAMPOS y LISTAS del Excel del repositorio y falla si difieren. El sistema no lee el Excel mientras funciona.
- La base de datos valida los códigos guardados (diseño físico en la Fase 3).
- El frontend obtiene los catálogos desde la API; no los escribe en su código.
- **Sí/No** es un dominio base, no un catálogo.

Reemplaza a `docs/methodology/convenciones-catalogos.md` (CC-004) en lo relativo a la tabla de códigos de LISTAS y a las referencias `LISTAS:<id_catalogo>`.

Afecta:
- backend
- base de datos
- API
- frontend
- tests

## PR-022 — Incidencias ciudadanas y datos del reportante (v1.0)
Estado: vigente
Versión: 1.0
Origen: CC-036
Motivo: definir el canal de reporte ciudadano, la protección de los datos del reportante y el tratamiento de "Requiere antecedentes" (Fases 1 y 2, 2026-10-20).

Ingreso:
- Toda incidencia entra por el código QR de un árbol (AMD-34), mediante un formulario público, sin cuenta ciudadana.
- `id_arbol` y `ubicacion` se obtienen del árbol del QR. `origen_reporte` = Comunidad.
- El reportante ingresa nombre (máximo 100 caracteres), RUT, tipo de incidencia, descripción y al menos una fotografía (PR-010 v3.0).
- El RUT se valida en estructura y dígito verificador.
- El endpoint público limita la cantidad de solicitudes y valida las fotografías. Escribe por el backend con la credencial de servicio (PR-018 v3.0).

Visibilidad del nombre y del RUT:
- Solo los ve el Usuario municipal miembro del proyecto del árbol.
- No los ven el Administrador, el Inspector ni el Encargado de mantención. La API no los entrega en sus respuestas a esos roles, ni aparecen en exportaciones ni registros.

Conservación del nombre y del RUT:
- Se conservan hasta que la incidencia se aprueba o se rechaza (`resultado_revision` = Validada o Descartada), y en ese momento se eliminan los dos.
- Con `resultado_revision` = Requiere antecedentes se conservan hasta la resolución final (Validada o Descartada).
- No se registra ningún dato de contacto del reportante.

Requiere antecedentes:
- No significa pedirle información al reportante: el Inspector confirma en terreno el estado del árbol.
- El Usuario municipal crea una OT de Inspección del árbol vinculada a la incidencia mediante `id_incidencia`; elige la `Accion_solicitada` entre las de Inspección (no se fija). Con el resultado de esa inspección registra Validada o Descartada.
- Si la incidencia validada requiere mantenimiento, la OT de Mantenimiento también se vincula con `id_incidencia`.

Afecta:
- frontend
- backend
- base de datos
- permisos
- RLS
