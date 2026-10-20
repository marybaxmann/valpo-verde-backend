# Workflow — Valpo Verde

## Propósito

Este documento define cómo deben procesarse los cambios del proyecto antes de implementarlos.

La prioridad es evitar:
- contradicciones entre decisiones;
- implementación de metodología incompleta;
- cambios de arquitectura no documentados;
- sobreescritura de decisiones anteriores;
- modificaciones innecesarias en múltiples capas.

---

## 1. Clasificar el cambio

Antes de implementar, identificar si la solicitud afecta una o más categorías:

- funcional;
- frontend / UX;
- backend;
- base de datos;
- autenticación / permisos;
- metodología;
- motor de reglas;
- infraestructura;
- arquitectura;
- documentación.

No asumir que todos los cambios requieren modificar todas las capas.

---

## 2. Consultar fuentes de verdad

Antes de proponer o implementar, leer en este orden.

Siempre:

1. `CLAUDE.md` — punto de entrada;
2. `docs/project-rules.md`;
3. `docs/workflow.md` (este documento).

Condicional:

4. `docs/architecture-decisions.md` — si la tarea afecta arquitectura, datos, autenticación, permisos, infraestructura técnica o decisiones transversales;
5. el paquete metodológico vigente (PR-002), con `docs/methodology/00-index.md` como punto de entrada — si la tarea afecta evaluación técnica / metodológica; si además implica un cambio, `docs/workflow.md` §14 y `docs/registro-cambios.md`;
6. el código / `database/schema.sql` actual — según la tarea, después de comprender las decisiones documentadas.

Este mismo criterio está en `CLAUDE.md`; ambos deben coincidir.

---

## 3. Identificar reglas afectadas

Para cada cambio:

- indicar qué `PR-*` se ven afectadas;
- distinguir entre:
  - regla compatible;
  - regla que requiere nueva versión;
  - regla que queda reemplazada;
  - decisión pendiente;
  - contradicción.

No modificar silenciosamente una regla vigente.

---

## 4. Cambios que contradicen una regla vigente

Si la nueva decisión contradice una regla:

1. no borrar la regla anterior;
2. marcar la versión anterior como `reemplazada`;
3. crear una nueva versión;
4. indicar qué versión reemplaza;
5. documentar el motivo;
6. identificar las capas afectadas.

Este procedimiento es idéntico al descrito en `docs/project-rules.md` (Propósito); ambos documentos deben mantenerlo redactado de la misma forma.

Una decisión explícita nueva de una aprobadora del proyecto (§14.5: `marybaxmann` o `Valen-j211`) puede reemplazar una decisión anterior.

---

## 5. Cambios metodológicos

Si el cambio afecta metodología:

1. revisar el paquete metodológico vigente (PR-002), con `docs/methodology/00-index.md` como punto de entrada;
2. identificar el estado de cada regla afectada (`estado_regla`: vigente, pendiente, reemplazada, descartada). Hasta la publicación del paquete 2.0.0 rige el estado de transición descrito en `docs/methodology/00-index.md`;
3. no inferir información faltante;
4. no copiar reglas entre componentes por similitud;
5. no implementar una regla pendiente;
6. no implementar una regla reemplazada o descartada, aunque aparezca en un diagrama o documento antiguo;
7. registrar y versionar el cambio según §14 (incluida `rule_version`, §14.10).

La metodología debe mantenerse separada de decisiones visuales o de UX.

---

## 6. Orden recomendado de trabajo

### Cambio pequeño y localizado

Ejemplos:
- endpoint;
- validación;
- componente UI;
- query;
- error de TypeScript.

Flujo:

Solicitud
→ revisar reglas afectadas
→ implementar en la capa correspondiente
→ verificar
→ resumir cambio

No involucrar múltiples agentes/capas si no es necesario.

### Cambio funcional medio

Ejemplos:
- nuevo campo;
- cambio de permisos;
- nuevo estado;
- cambio de flujo.

Flujo:

Solicitud
→ revisar `project-rules`
→ identificar capas afectadas
→ actualizar documentación si corresponde
→ implementar
→ verificar consistencia

### Cambio transversal o de arquitectura

Ejemplos:
- proyectos;
- membresías;
- cambio de auth;
- geolocalización;
- cambio de modelo de inspecciones.

Flujo:

Solicitud
→ análisis de arquitectura
→ reglas afectadas
→ decisión documentada
→ plan de implementación
→ aprobación cuando corresponda
→ implementación por capas
→ QA

### Cambio metodológico

Flujo:

Nueva decisión/diagrama
→ CC en `docs/registro-cambios.md` (§14)
→ sincronizar el paquete metodológico (§14.7, paso 2)
→ publicar la versión (§14.10)
→ implementar en `services/rules/`
→ agregar/verificar tests
→ QA

---

## 7. Implementación por capas

Arquitectura backend objetivo:

routes
→ controllers
→ services
→ repositories

Las responsabilidades deben mantenerse separadas.

### Routes
- definición de endpoints;
- middlewares;
- composición.

### Controllers
- entrada/salida HTTP;
- delegación a servicios.

### Services
- casos de uso;
- reglas de negocio;
- coordinación.

### Repositories
- acceso a datos.

### services/rules/
- reglas metodológicas puras;
- cálculos técnicos;
- versionado metodológico.

No introducir lógica metodológica directamente en controllers o repositories.

---

## 8. Base de datos y migraciones

Cuando un cambio requiere modificar la base de datos:

1. revisar `database/schema.sql`;
2. identificar impacto histórico;
3. crear una nueva migración;
4. no editar migraciones ya aplicadas;
5. actualizar `schema.sql` consolidado;
6. preservar integridad e historial.

No modificar la base de datos solo para replicar exactamente la forma visual de un formulario.

La interfaz y el modelo físico de datos pueden diferir.

### Nota operativa — entornos Supabase (desarrollo/pruebas vs. producción)

El proyecto Supabase usado hoy para migraciones, fixtures, pruebas de RLS
y validaciones Postman/E2E es el entorno de **desarrollo/pruebas** del
proyecto (ver ADR-013). Su propio dashboard de Supabase puede mostrar una
etiqueta `main` / `PRODUCTION` — esa etiqueta es de la plataforma
Supabase (identifica una rama de proyecto), no una afirmación sobre el
rol que este proyecto cumple para Valpo Verde. No debe interpretarse como
que ese proyecto es el entorno productivo real.

El entorno productivo real es un proyecto Supabase **separado**, todavía
no creado. A él solo se aplicarán migraciones que ya hayan sido validadas
en el entorno de desarrollo/pruebas — el mismo criterio que ya rige el
despliegue de `002`-`005` (nunca aplicar directo a producción).

### Nota operativa — probar migraciones localmente sin Supabase real

Esta nota describe cómo probar `schema.sql`/migraciones contra un
PostgreSQL local (por ejemplo con Docker) cuando no se dispone de un
proyecto Supabase real a mano. **No aplica al entorno Supabase real**:
ahí no se crea ni se necesita el stub siguiente, porque `auth.users` ya
existe de forma nativa.

`user_profiles.id` referencia `auth.users(id)`, una tabla que en Supabase
real gestiona el servicio de Auth. Para aplicar `001_init.sql` (o
`schema.sql` completo) contra un Postgres local vacío, crear antes un
stub mínimo:

```sql
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
```

Diferencias relevantes entre `psql` local y el SQL Editor de Supabase, si
se prueba ahí en lugar de local:

- sin metacomandos `\i` / `\c`;
- `CREATE EXTENSION` limitado a una allowlist (`postgis` y `pgcrypto` sí
  están permitidas);
- sin superusuario;
- cada ejecución ("Run") es un lote transaccional propio.

Esta nota es información operativa de entorno, no una decisión de
arquitectura ni una regla de negocio.

---

## 9. Estados pendientes

Una decisión marcada como `pendiente` no debe implementarse como si estuviera definida.

Si una feature depende de una decisión pendiente:

- detener solo esa parte;
- implementar únicamente lo que sí esté definido;
- dejar explícita la dependencia;
- no inventar un valor temporal salvo autorización explícita.

---

## 10. Prototipos y referencias

Jerarquía única de fuentes (PR-016 v4.0, CC-021), de mayor a menor autoridad:

1. **Metodología y fuentes vigentes** — paquete metodológico (PR-002).
2. **Decisiones controladas** — ADR, PR y CC.
3. **Backend y API vigentes.**
4. **Documentación vigente del proyecto.**
5. **Figma y prototipo histórico** (`marybaxmann/Valpo-Verde-Conecta`; pantallas en `valpo-verde-frontend/docs/referencias/figma-original/`) — solo intención funcional (PR-001 v3.0).
6. **Referencias visuales aprobadas** — solo UX/UI (`valpo-verde-frontend/docs/referencias/visuales/`).

El prototipo y el Figma histórico pueden utilizarse para comprender:
- navegación;
- jerarquía;
- pantallas;
- flujo de roles;
- experiencia esperada.

No debe utilizarse para inferir:
- reglas metodológicas;
- fórmulas;
- estructura definitiva de BD;
- permisos no documentados.

Su presencia en el prototipo no demuestra que un módulo, campo, categoría, cálculo o flujo siga vigente: conservan valor como evidencia de intención funcional, pero no restablecen decisiones posteriormente modificadas, reemplazadas o eliminadas.

La referencia visual aprobada define solo lenguaje visual (composición, relación mapa–paneles, densidad informativa y paleta); no define lógica, metodología ni estructura de datos. Groundzy dejó de ser referencia visual oficial (PR-016 v4.0).

---

## 11. Verificación

Después de implementar un cambio, verificar al menos:

- coherencia con `project-rules.md`;
- que no se haya implementado una decisión pendiente;
- permisos correctos;
- separación observado → calculado → decisión;
- historial e inmutabilidad cuando aplique;
- TypeScript;
- validación Zod;
- impacto en migraciones/schema si aplica;
- tests relevantes cuando corresponda.

---

## 12. Respuesta final de una implementación

Evitar explicaciones extensas salvo que se soliciten.

Al terminar, informar brevemente:

- qué se cambió;
- archivos modificados;
- reglas afectadas;
- tests/verificaciones ejecutadas;
- pendientes o riesgos.

No volver a explicar toda la arquitectura en cada tarea.

---

## 13. Uso futuro de subagentes (arquitectura planificada, aún no implementada)

Esta sección describe una arquitectura futura planificada de subagentes. Ninguno existe todavía.

Los nombres y responsabilidades aquí descritos son una propuesta operativa vigente para la futura configuración de subagentes. La definición efectiva vivirá en `.claude/agents/` cuando estos se creen.

Cuando existan subagentes:

- usar el mínimo número necesario;
- no invocar todos por defecto;
- usar `architect` solo en cambios transversales;
- usar `database` para schema/migraciones;
- usar `backend` para API/servicios/repositorios;
- usar `rules-engine` para metodología;
- usar `qa` para revisión final o cambios relevantes.

Una tarea pequeña debe resolverse directamente si no requiere especialización adicional.

El uso de subagentes no reemplaza las reglas ni fuentes de verdad del proyecto.

---

## 14. Control de cambios

### 14.1 Propósito

Esta sección define cómo se registra, aprueba, sincroniza, implementa y
cierra cualquier cambio que afecte la fuente metodológica de Valpo Verde
(PR-002) o su implementación.

El registro oficial de cambios es `docs/registro-cambios.md`. Cada cambio
se identifica con un ID `CC-NNN`: correlativo, de tres dígitos, nunca
reutilizado (aunque el cambio se descarte).

Las herramientas temporales de revisión (por ejemplo, un Excel de
auditoría) no son registro oficial y no autorizan modificar la fuente
metodológica ni la implementación.

### 14.2 Principios

1. La fuente metodológica define; la implementación (base de datos,
   backend, API, frontend) deriva. Un cambio de implementación nunca
   modifica la metodología.
2. Los artefactos de la fuente metodológica (MATRICES_CALCULO,
   DICCIONARIO_CAMPOS, REGLAS_INDICADORES, VERSION, LISTAS como catálogo
   subordinado, diagramas de decisión y `docs/methodology/`) representan
   una misma versión metodológica. Ninguno prevalece automáticamente sobre
   otro; una contradicción entre LISTAS y DICCIONARIO_CAMPOS también se
   trata mediante control de cambios.
3. Una contradicción entre artefactos es una inconsistencia. No se
   resuelve eligiendo uno: se abre un CC, se determina cuál representa la
   decisión metodológica aprobada y se sincronizan todos los afectados.
4. Un cambio no está terminado porque se modificó un artefacto. Solo
   termina en `CERRADO`, después de verificar la sincronización de todo
   lo afectado (14.9).
5. Un CC que no está `APROBADO METODOLÓGICAMENTE` no autoriza modificar
   el Excel maestro, los diagramas ni el código. Una decisión pendiente
   no se implementa (§9).
6. No se borran versiones anteriores: se marcan como reemplazadas (§4).

### 14.3 Cuándo se requiere un CC

Requieren CC:

- cualquier modificación de la fuente metodológica (PR-002);
- crear o reemplazar una PR o una ADR;
- cambios de modelo de datos (campos, tablas, migraciones);
- implementar o modificar en backend/frontend una regla metodológica;
- corregir una inconsistencia entre artefactos de la fuente, o entre la
  fuente y la implementación.

No requieren CC (siguen §6, "cambio pequeño y localizado"):

- refactorizaciones sin cambio de comportamiento;
- estilos o maquetación de interfaz sin efecto en datos ni reglas;
- actualización de dependencias;
- correcciones tipográficas fuera de la fuente metodológica;
- regenerar el export de texto de la fuente sin cambiar el Excel.

### 14.4 Tipos de cambio

| Tipo | Definición | Ejemplo |
|---|---|---|
| 1. Corrección de inconsistencia | Artefactos que deben decir lo mismo no lo dicen, o hay un error matemático. Si ningún artefacto refleja la decisión aprobada, el CC pasa a tipo 2. | R02 decía 8–18 en MATRICES_CALCULO; el máximo real es 14. |
| 2. Cambio metodológico | Cambia un umbral, clasificación, fórmula, agregación o salida. | Nueva salida "No determinado". |
| 3. Cambio de modelo de datos | Cambia la estructura de campos o tablas. Requiere ADR si es transversal. | Permitir múltiples redes por árbol. |
| 4. Cambio de implementación | Código que implementa una regla o una especificación ya aprobada. Una regla metodológica requiere que esté en una versión publicada del paquete; una especificación de ámbito `operativo` requiere que su CC esté en `FUENTE SINCRONIZADA` (§14.12). | El backend calcula R02. |
| 5. Cambio documental | Sin cambio de lógica ni de datos. | Actualizar un diagrama desactualizado. |

Un CC puede afectar más de un tipo: se registra un tipo principal y los
secundarios.

### 14.5 Aprobación

- Pueden aprobar cambios metodológicos (tipos 1, 2, 3 y 5 que toquen la
  fuente) y publicar versiones del paquete: `marybaxmann` o `Valen-j211`.
- Basta la aprobación de una de las dos. No se exige doble aprobación.
- La ficha CC registra quién aprobó y la fecha.
- Los cambios tipo 4 requieren revisión técnica y un CC metodológico
  previo en `FUENTE SINCRONIZADA` o posterior.
- Si en el futuro ciertos cambios requieren doble aprobación, se
  incorporará como regla explícita en esta sección.

### 14.6 Estados

Flujo principal:

```
DETECTADO → EN REVISIÓN → PENDIENTE DE DECISIÓN → APROBADO METODOLÓGICAMENTE
→ FUENTE SINCRONIZADA → PENDIENTE DE IMPLEMENTACIÓN → IMPLEMENTADO → PROBADO → CERRADO
```

| Estado | Significado | Para salir del estado |
|---|---|---|
| `DETECTADO` | Se registró el cambio o la inconsistencia. | Iniciar revisión. |
| `EN REVISIÓN` | Se analiza alcance, impacto (14.8) y dependencias. | Ficha de impacto completa. Si la decisión ya existe, puede pasar directo a `APROBADO METODOLÓGICAMENTE`. |
| `PENDIENTE DE DECISIÓN` | La revisión ya identificó exactamente qué decisión falta tomar; la ficha la formula. | Decisión registrada por una aprobadora (14.5). |
| `APROBADO METODOLÓGICAMENTE` | Decisión tomada y registrada. En tipo 4 significa aprobado técnicamente. | Sincronizar la fuente (14.7, paso 2). |
| `FUENTE SINCRONIZADA` | Todos los artefactos afectados están actualizados en la misma versión y pasaron 14.9. | Tipo 5: `CERRADO` (sin implementación). Resto: `PENDIENTE DE IMPLEMENTACIÓN`. |
| `PENDIENTE DE IMPLEMENTACIÓN` | Falta llevar el cambio a BD, backend, API o frontend. | Implementación en el entorno de desarrollo/pruebas (ADR-013). |
| `IMPLEMENTADO` | El código y las migraciones están aplicados en desarrollo/pruebas. | Ejecutar las pruebas de la ficha. |
| `PROBADO` | Las pruebas de la ficha pasan. | Revisión final (agente `qa` cuando corresponda). |
| `CERRADO` | Cambio completo y verificado. Para tipo 5 se anota "sin implementación". | — |

Estados auxiliares (fuera del flujo lineal):

- `BLOQUEADO`: no puede avanzar por una dependencia pendiente (otro CC o
  una decisión). Se indica cuál; al resolverse, vuelve al estado en que
  estaba.
- `REEMPLAZADO`: otro CC lo deja sin efecto. Se indica cuál.
- `DESCARTADO`: se decidió no hacerlo. Se indica motivo y quién decidió.

`CERRADO` significa hoy "probado en desarrollo/pruebas". Cuando exista
el entorno productivo (ADR-013) se agregará un estado de despliegue.

### 14.7 Flujo de actualización

```
0. DETECCIÓN → ficha CC (DETECTADO)
1. DECISIÓN METODOLÓGICA (14.5) → nueva versión de PR/ADR si contradice una vigente (§4)
2. FUENTE METODOLÓGICA — un solo paquete, una sola versión:
     DICCIONARIO_CAMPOS (los campos deben existir antes de usarse)
     → REGLAS_INDICADORES y MATRICES_CALCULO
     → diagramas de decisión
     → docs/methodology/ (versión, explicación, historial)
     → hoja VERSION + export de texto + verificación 14.9
     → publicación de la versión (tag de git)
3. MODELO DE BASE DE DATOS (solo si corresponde): migración nueva (nunca
   editar una aplicada), schema.sql, RLS si hay tabla nueva (ADR-014),
   validación en desarrollo/pruebas (ADR-013)
4. BACKEND: services/rules/ → services → validación Zod / API
5. FRONTEND: formularios, activaciones, resultados y roles
6. PRUEBAS: casos borde por regla, integración de API, E2E
7. REVISIÓN FINAL (qa) → CERRADO
```

El paso 2 es atómico: los artefactos de la fuente no se publican por
separado. Los cambios tipo 5 recorren 0 → 1 (si corresponde) → 2 → 7.
Los cambios tipo 4 empiezan en el paso 3, sobre una versión publicada.
Excepción reglada (CC-008, §14.12): un CC cuyo alcance de implementación
se limita a especificaciones de ámbito `operativo` puede pasar al paso 3
desde `FUENTE SINCRONIZADA`, sin esperar la publicación de la versión
(tag) del paso 2. Las reglas metodológicas no tienen esta excepción.

Los cambios al Excel maestro y a los diagramas se hacen en una rama y se
integran mediante pull request que cita el CC; no se suben directo a `main`.

### 14.8 Matriz de impacto

● obligatorio · ○ si corresponde · — no aplica

| Cambio | Diagrama | REGLAS_IND. | MATRICES | DICCIONARIO | docs/methodology | PR/ADR | BD / migración | Backend (rules) | API / Zod | Frontend | Pruebas | rule_version |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Umbral o límite de intervalo | ● | ● | ○ | ○ | ● | ○ | — | ● | — | ○ | ● | ● |
| Nueva salida o rama (p. ej. No determinado) | ● | ● | ○ | ● | ● | ○ | ○ | ● | ● | ● | ● | ● |
| Agregación o rangos de clasificación | — | — | ● | ● | ● | ○ | ○ | ● | — | ○ | ● | ● |
| Campo nuevo | ○ | ○ | — | ● | ○ | — | ● | ○ | ● | ● | ● | ○ |
| Renombrar campo | ● | ● | ○ | ● | ○ | — | ○ | ○ | ● | ● | ● | ○ |
| Valores o catálogo de un campo | ○ | ○ | — | ● | ○ | — | ○ | ○ | ● | ● | ● | ○ |
| Activación o dependencia de campo | ○ | — | — | ● | ○ | — | — | ○ | ● | ● | ● | ○ |
| Modelo de datos estructural | ○ | ○ | ○ | ● | ● | ● (ADR) | ● | ● | ● | ● | ● | ○ |
| Corrección entre artefactos de la fuente | ○ | ○ | ○ | ○ | ○ | — | — | ○ | — | — | ● | ○ |
| Solo texto o forma de un diagrama | ● | — | — | — | ○ | — | — | — | — | — | — | — |
| Implementación de regla aprobada | — | — | — | — | — | — | ○ | ● | ○ | ○ | ● | — |
| Rol o permisos | — | — | — | ○ | — | ● | ● (RLS) | ● | ● | ● | ● | — |

### 14.9 Verificación de sincronización

Un CC solo pasa a `FUENTE SINCRONIZADA` si se cumple todo lo que aplica:

- [ ] La misma versión figura en la hoja VERSION, los diagramas y
      `docs/methodology/00-index.md`.
- [ ] Todo campo citado en REGLAS_INDICADORES (`campos_utilizados`),
      MATRICES_CALCULO y diagramas existe en DICCIONARIO_CAMPOS con el
      mismo nombre.
- [ ] Las condiciones de activación del DICCIONARIO son coherentes con el
      orden de evaluación del diagrama.
- [ ] Cada camino del diagrama tiene una regla vigente y cada regla
      vigente tiene un camino; ningún nodo queda sin salida.
- [ ] `max_indicador` = mayor puntaje de las reglas vigentes del indicador.
- [ ] Máximo de cada regla agregadora = suma de los `max_indicador` que
      aportan a ella, y coincide en MATRICES (tabla y texto) y DICCIONARIO
      (fórmula y validación).
- [ ] Los rangos de clasificación cubren 0…máximo sin huecos ni solapes.
- [ ] Los intervalos numéricos de cada indicador no tienen huecos ni
      solapes.
- [ ] Ninguna salida "No determinado" o "No aplica" tiene puntaje 0.
- [ ] Export de texto regenerado desde el Excel.
- [ ] La ficha CC registra la versión del paquete y `rule_version`.

Catálogos (LISTAS ↔ DICCIONARIO_CAMPOS; convenciones en
`docs/methodology/convenciones-catalogos.md`, CC-004):

- [ ] Toda referencia `LISTAS:<id_catalogo>` existe en LISTAS.
- [ ] Ningún dominio se mantiene en dos fuentes editables.
- [ ] Los códigos son únicos dentro de su catálogo.
- [ ] Las relaciones padre-hijo referencian códigos existentes.
- [ ] Todo código usado por el contrato funcional existe en LISTAS.
- [ ] Las escalas de LISTAS son consistentes con REGLAS_INDICADORES y
      MATRICES_CALCULO, sin que LISTAS redefina su lógica.

Para pasar a `PROBADO`:

- [ ] Pruebas por regla, incluidos los valores borde de cada intervalo.
- [ ] El backend declara la `rule_version` que implementa y coincide con
      una versión publicada. N/A en implementaciones limitadas a ámbito
      `operativo` (§14.12): no ejecutan reglas metodológicas; la ficha CC
      registra la versión del paquete (publicada o en preparación) que
      contiene la especificación.
- [ ] La implementación usa solo reglas `vigente` de esa versión.
- [ ] Ningún resultado calculado puede editarse manualmente (PR-008).

Para cambios que no tocan la fuente metodológica (por ejemplo, cambios de
gobernanza en `docs/`), los puntos que no aplican se marcan `N/A` en la
ficha con su motivo.

### 14.10 Versionado

| Elemento | Formato | Regla |
|---|---|---|
| Versión del paquete metodológico | `MAJOR.MINOR.PATCH` | MAJOR: cambia la estructura de la evaluación (componentes, agregaciones, matrices nuevas). MINOR: cambia algún resultado calculable, o el conjunto o significado de los campos de ámbito `metodologico`. PATCH: no cambia resultados ni campos de ámbito `metodologico` (redacción, forma de diagramas, notas, cambios limitados a campos de ámbito `operativo`; §14.12). |
| `rule_version` | `MAJOR.MINOR` | Igual a la versión del paquete sin PATCH. Un PATCH no genera nueva `rule_version`. Se guarda en cada resultado calculado. |
| Tag de git | `metodologia-vMAJOR.MINOR.PATCH` | Se crea al publicar cada versión. |
| Excel maestro | nombre fijo | No se crea una copia por versión: el historial está en git y los tags. |

- La hoja VERSION del Excel maestro es la fuente de las versiones
  publicadas.
- Primera versión sincronizada: `2.0.0` (`rule_version` `2.0`). El Excel
  previo se registra como "previa a 2.0.0 — sin versión formal".
- Tipo de CC → versión: tipo 2 → MINOR (MAJOR si cambia la estructura);
  tipo 1 → MINOR si altera algún resultado posible, si no PATCH; tipo 3 →
  MINOR si cambia campos de ámbito `metodologico` del DICCIONARIO, PATCH si
  solo cambia campos de ámbito `operativo` (§14.12); tipo 4 → sin cambio de versión;
  tipo 5 → PATCH (o ninguno si está fuera del paquete).
- La implementación de una `rule_version` usa solo las reglas `vigente`
  del paquete publicado con esa versión. Las reglas `reemplazada` son
  trazabilidad, nunca reglas activas.
- Commits que implementan o modifican un CC: mensaje con prefijo
  `[CC-NNN]`. La nueva versión de una PR o ADR indica "Origen: CC-NNN".

### 14.11 Relación con otras secciones

- §4 (reemplazo de reglas) se mantiene: el CC registra qué PR o ADR se
  reemplaza y la nueva versión.
- §5 y el flujo "Cambio metodológico" de §6 se aplican a través de esta
  sección.
- §9 (estados pendientes) se aplica sin cambios.

### 14.12 Ámbito de los campos: operativo y metodológico (CC-008)

DICCIONARIO_CAMPOS registra en la columna `ambito` el ámbito de cada campo:

| Valor | Definición |
|---|---|
| `metodologico` | El campo es entrada, salida o parte de una regla de evaluación, clasificación, probabilidad de falla, riesgo, afectación global, priorización o indicadores metodológicos (REGLAS_INDICADORES, MATRICES_CALCULO, o INDICES cuando se adopte), o su valor resulta de una de esas reglas. |
| `operativo` | Especificación operativa o estructural del inventario o de la gestión (identidad, ubicación, trazabilidad, registro de mediciones y similares) que no constituye ni ejecuta ninguna de esas reglas. |

Reglas:

1. Un campo sin valor en `ambito` se trata como `metodologico` hasta que
   un CC lo clasifique.
2. El ámbito de un campo se asigna y aprueba en el CC que lo crea o
   modifica (§14.5).
3. Un CC cuyo alcance de implementación se limita a especificaciones de
   ámbito `operativo` puede pasar a implementación (paso 3 de §14.7) sin
   esperar la publicación de la versión del paquete, siempre que:
   a. esté `APROBADO METODOLÓGICAMENTE`;
   b. esté en `FUENTE SINCRONIZADA` (fuentes actualizadas y verificación
      §14.9 aprobada);
   c. la implementación no ejecute ninguna regla metodológica ni calcule
      ningún campo de ámbito `metodologico`;
   d. la implementación no implemente fórmulas ni reglas pendientes o no
      aprobadas, aunque estén descritas en el campo;
   e. la ficha CC registre la versión del paquete (publicada o en
      preparación) que contiene la especificación.
4. Las reglas de evaluación, clasificación, probabilidad de falla, riesgo,
   afectación global, priorización e indicadores metodológicos siguen
   exigiendo una versión publicada y su `rule_version` (PR-002, PR-011,
   §14.4, §14.10). Esta sección no las exceptúa.
5. Referencias cruzadas: si un campo `metodologico` usa como referencia un
   campo `operativo` (por ejemplo, `zona_objetivo` usa `altura_total_m`),
   todo cambio de definición, unidad o dominio del campo operativo evalúa
   en el mismo CC su efecto sobre el campo metodológico. Si ese efecto
   altera algún resultado calculable, el cambio se versiona como
   metodológico (MINOR).
6. Versionado: un cambio limitado a campos de ámbito `operativo` no altera
   `rule_version` y corresponde a PATCH (§14.10). Mientras la primera
   versión (2.0.0) no se publique, estos cambios se acumulan en la versión
   en preparación.
