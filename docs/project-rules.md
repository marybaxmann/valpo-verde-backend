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

## PR-001 — Referencia funcional del proyecto
Estado: vigente
Versión: 2.0

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

## PR-002 — Fuente de metodología (v2.1)
Estado: vigente
Versión: 2.1
Reemplaza: PR-002 v2.0
Origen: CC-003

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

## PR-003 — Rol Usuario municipal
Estado: vigente
Versión: 4.0

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

## PR-004 — Rol Administrador
Estado: vigente
Versión: 4.0

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
- CRS/SRID sigue pendiente (ADR-010 `propuesta`): no se agrega columna todavía.

### Despliegue

`002` estructura → backend con scoping rol + proyecto → `003` backfill (si corresponde) → `004` `SET NOT NULL` → RLS posterior.

Afecta:
- base de datos
- backend
- frontend
- permisos

## PR-006 — Registro básico del árbol
Estado: vigente
Versión: 5.0

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

## PR-008 — Separación observado → calculado → decisión
Estado: vigente
Versión: 1.0

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

## PR-009 — Inspecciones
Estado: vigente
Versión: 1.0

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

## PR-010 — Fotografías
Estado: vigente
Versión: 1.0

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

## PR-015 — Geolocalización
Estado: vigente
Versión: 1.0

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

## PR-016 — Groundzy (v3.0)
Estado: vigente
Versión: 3.0
Reemplaza: PR-016 v2.0
Origen: CC-001

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

## PR-018 — Autenticación
Estado: vigente
Versión: 2.0

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
