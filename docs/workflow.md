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
5. `docs/methodology/00-index.md` y el documento metodológico específico — si la tarea afecta evaluación técnica / metodológica;
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

Una decisión explícita nueva de la autora del proyecto puede reemplazar una decisión anterior.

---

## 5. Cambios metodológicos

Si el cambio afecta metodología:

1. revisar `docs/methodology/`;
2. identificar si la regla está:
   - vigente;
   - vigente parcial;
   - pendiente;
   - obsoleta;
3. no inferir información faltante;
4. no copiar reglas entre componentes por similitud;
5. no implementar una rama pendiente;
6. no implementar una rama obsoleta aunque aparezca en un diagrama antiguo;
7. actualizar `rule_version` cuando corresponda.

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
→ consolidar versión textual en `docs/methodology/`
→ determinar estado
→ actualizar reglas/versiones
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

Jerarquía de referencias (de mayor a menor autoridad):

1. **Prototipo propio `marybaxmann/Valpo-Verde-Conecta`** — referencia funcional/UX principal.
2. **Diagramas / metodología en `docs/methodology/`** — fuente técnica.
3. **Groundzy** — referencia visual/UX secundaria.

El frontend `marybaxmann/Valpo-Verde-Conecta` puede utilizarse para comprender:
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

Groundzy inspira experiencia visual y organización de UX. No define lógica, metodología ni estructura de datos, y es secundaria respecto del prototipo propio y de la metodología (ver `project-rules.md` PR-016).

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
