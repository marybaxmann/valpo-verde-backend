# Estado actual — backend SIVU

> **Leer esto primero.** Es lo único que una sesión nueva necesita para empezar. Lo demás se consulta **por sección** cuando la tarea lo pide (tabla «Qué leer y cuándo»). Este archivo se **reemplaza, no se alarga**: máximo ~120 líneas. El detalle de un trabajo va en `docs/relevo/RELEVO_<fecha>_<tema>.md` o en el CC correspondiente.
>
> Última actualización: 2026-11-20 (publicación del secuestro anual). Estado de ramas verificado contra `origin` ese día.

## Qué es

Backend de **SIVU** (antes «Valpo Verde»): API REST Node/Express/TypeScript sobre PostgreSQL/Supabase para la gestión del arbolado urbano de Valparaíso. Capas `routes → controllers → services → repositories`; el motor metodológico vive en `src/services/rules/`. El frontend está en `../valpo-verde-frontend` (su estado: `docs/ESTADO.md` de ese repositorio).

## Ramas, despliegue y bases de datos

| Qué | Dónde |
|---|---|
| Rama de **integración** (aquí se trabaja) | `feature/fase6-backend-api` |
| Rama **publicada** | `release/demo` → https://sivu-api.vercel.app (se publica con merge desde la integración) |
| `main` | Atrasada (cierre de la Fase 5, 2026-10-22). No refleja el estado actual. |
| Base de **pruebas** (la usa la API publicada) | Supabase `gmlbmyreoxgoqrolhyxo` («valpo-verde-conecta-pruebas»), con datos reales del piloto |
| Base **real** | Supabase `ytcxswbulsmboucardxa`: **no se toca** (Fase 8, issue #45) |

## Metodología

- Fuente única: el Excel `docs/excel/Base de Datos Valpo Verde.xlsx` (PR-002). Si algo lo contradice, manda el Excel.
- Versión vigente: **3.1.0** (`rule_version` 3.1, CC-077, 2026-11-18). La 3.0.0 (CC-071) cambió M04 a «peor componente» (ya no hay puntaje P_I).
- Las migraciones 035 y 036 que exige la 3.0 están aplicadas **solo en la base de pruebas**.
- Versión y transición siempre en `docs/methodology/00-index.md`.

## Trabajo en curso (al 2026-11-19)

**CC-077 (D-27, dos fotos) publicado en sivu.cl el 2026-11-19** (madrugada, hora de Chile):

| Paso | Estado |
|---|---|
| Respaldo de la base de pruebas y restauración conjunta verificada | Hecho, PR #82 (`docs/relevo/RELEVO_2026-11-19_respaldo-pre-040.md`) |
| 040 y 041: ciclo completo (aplicar → `pruebas_040` → revertir → reaplicar → probar) en una copia aislada del respaldo | Aprobado: 6/6 casos en dos rondas, la reversión vuelve al estado anterior y no cambian los datos |
| 040 y 041 en `gmlbmyreoxgoqrolhyxo` con `apply_migration` | Aplicadas (versiones `20261119035144` y `20261119035206`). Cierre con dos fotos válidas; trigger de la 041 instalado; permisos y datos sin cambios |
| Backend: #81 → `release/demo` | Fusionado (`6851333`); Vercel `success` |
| Frontend: #19 y #20 → `feature/fase7-maqueta-lab` | Fusionados (`51eff0d`, `06036f4`); Vercel `success`; el formulario publicado ya pide «al menos dos fotos válidas y distintas» |
| Prueba en sivu.cl (Inspector, OT-I-000409 / INS-000382, Piloto, A-000546) | **D-27 verificado:** «Fotografías válidas y distintas: 2 (mínimo 2)» con dos fotos de la misma vista (antes bloqueaba). La inspección aún no se puede finalizar porque le faltan 30 datos de terreno ajenos a las fotos (DAP, altura, copa, riesgo, consecuencias, infraestructura; regla de completitud, C1 del inventario #83). El cierre completo queda para cuando el Inspector registre esos datos. |

Frontend: el rediseño de Infraestructura también se publicó en sivu.cl el 2026-11-19 (PR #22).

Otras ramas activas: `docs/demo-ia-dudas-2026-11-17` (dudas de la demo de estimación con IA, AV_000014–020) y `docs/inventario-reglas-bloqueantes` (propuesta de qué reglas flexibilizar, para decidir).

Pendientes conocidos fuera de esas ramas:
- **Indicadores biométricos completados con lo registrado (Valej, 2026-11-22; PR sin fusionar):** cobertura de copa del sector (`cobertura_copa`: área de copa / superficie, 1,93 % en el Piloto); origen con «sin determinar» como categoría válida (80 introducidos, 15 nativos, 8 sin determinar); los 8 sin especie se muestran como «Especie no identificada / origen sin determinar» sin tocar sus datos. Pendiente: fila de la cobertura de copa en la hoja INDICES del Excel.
- **Código público del árbol (CC-086, 2026-11-22):** P-VIC-NNN en Plaza Victoria y PM-NNN en Pedro Montt (impares norte, pares sur), asignado por la base desde las coordenadas. **049 aplicada en la base de pruebas** (2026-11-22). Visible solo en la plataforma (inventario, ficha del árbol, lista de placas); no en la ficha pública ni en la placa impresa. Pendiente: fila en DICCIONARIO_CAMPOS del Excel y prefijos de los otros dos polígonos del sector.
- **Secuestro bruto anual de CO₂ (decisiones A, B y C de la responsable, 2026-11-20): PUBLICADO en sivu.cl el 2026-11-20** como excepción documentada: la **decisión D** (registrar el método en el Excel, fila 15 de INDICES) sigue pendiente; propuesta en `docs/plan/propuestas/secuestro-anual-cambios-excel.md`. `rules/carbono/secuestro.ts`: C₀ y C₁ con el modelo del carbono almacenado (sin cambios), categorías y factores de i-Tree Eco sin ajuste por heladas; resultados fundamentados (hoy ninguno: no hay categorías aprobadas por especie), simulaciones exploratorias (no se suman) o no estimables. Modelos **exploratorios** de *Acer negundo* (ecuación de *A. platanoides*) y *Ulmus minor* (ecuación de *U. pumila* con altura; densidad 570 kg/m³ de la Global Wood Density Database v2.2): en el carbono almacenado se cuentan aparte (`con_resultado_exploratorio`) y no suman. Piloto: 25 de 49 evaluados con simulación. PR #90 (frontend #34 y #35). Sin migraciones.
- **Conecta — ficha pública editable (CC-078, antes CC-073 en el borrador de Mari): PUBLICADA en sivu.cl el 2026-11-19** con autorización de la responsable. Backend: #84 → `feature/fase6-backend-api` (`801612e`) y #85 → `release/demo` (`864dd13`); frontend: #26 → `feature/fase7-maqueta-lab` (`2e02adf`). Vercel `success` en ambos. Sin migraciones nuevas: 037 y 038 ya estaban aplicadas en la base de pruebas (2026-11-16) y conservan «CC-073» en sus comentarios. Probado antes en local contra la base de pruebas: guardar escribe solo en `tree_public_content`; la huella completa de `trees` no cambió. Pendiente: registrar el PATCH 3.1.1 en VERSION, `00-index.md` y tag (FUENTE SINCRONIZADA). En `tree_public_content` hay una ficha de prueba de A-000417 (Piloto, «lo plante yo») que la responsable debe decidir si se queda.
- **Borrar incidencias (CC-079, PR-022 v4.0, PR-003 v10.0): PUBLICADO en sivu.cl el 2026-11-19** con autorización de la responsable. El Usuario municipal borra una incidencia con motivo; se borran fotos, reportante y OT sin trabajo técnico, y queda una línea en `incident_deletions`. Backend #87 → fase6 (`b3e820e`), #88 → `release/demo` (`24c0b26`); frontend #28 (`0fe4d31`). Vercel `success`. 042 aplicada en pruebas (`20261120001059`). Pendiente: decidir si el registro de borrados entra a DICCIONARIO_CAMPOS.
- **Carbono** (CC-068/069): bloqueado, al 2026-11-01, por no poder leer Pillsbury et al. 1998.
- **Frontend Infraestructura** (rediseño publicado, PR #22): para fotos por componente hace falta un CC (hoy `photos.vista` solo tiene las vistas de D-27 y «detalle»).

## Cuándo hay que documentar (obligatorio, desde cualquier cuenta)

Se documenta **en el momento**, no al final de la semana, cada vez que pasa una de estas cosas:

| Evento | Qué actualizar |
|---|---|
| Se registran árboles nuevos (alta, levantamiento, importación) | Línea en «Datos cargados» + relevo de la carga |
| Se cargan o finalizan evaluaciones, inspecciones u OT en lote | Línea en «Datos cargados» + relevo de la carga |
| Se suben o corrigen fotos, ubicaciones o especies en lote | Línea en «Datos cargados» + relevo de la carga |
| Se aplica o revierte una migración (en cualquier base) | «Ramas, despliegue y bases de datos» + el CC o relevo |
| Se publica en `release/demo` o en el frontend | «Ramas y despliegue» |
| Se aprueba o descarta un CC | «Metodología» o «Trabajo en curso» + `docs/registro-cambios.md` |
| Termina una sesión de trabajo | «Trabajo en curso» (qué quedó hecho y qué falta) |

Un cambio de datos sin registro no existe para la sesión siguiente: no sabrá qué árboles ni qué evaluaciones son nuevos.

## Datos cargados

| Fecha | Base | Proyecto | Qué | Relevo |
|---|---|---|---|---|
| 2026-11-16 | pruebas | Piloto Valparaíso | Integración AV_000001–012 (CC-073, CC-075, CC-076) | PR #76 |
| 2026-11-19 | pruebas | (todos) | Migraciones 040 y 041 (CC-077); sin cambios de datos | PR #82 |
| 2026-11-19 | pruebas | Piloto Valparaíso | Ficha pública de A-000417 guardada desde el editor (prueba de la responsable; sin cambios en `trees`) | — |
| 2026-11-19 | pruebas | (todos) | Migración 042 (CC-079, borrado de incidencias con registro; versión `20261120001059`): tabla `incident_deletions` vacía y `fn_borrar_incidencia`; sin cambios de datos. Ensayada antes en una transacción revertida (8/8 casos) | rama `feature/borrar-incidencias` |

## Si cargas árboles o evaluaciones

Una carga cambia lo que ven todas las sesiones y la API publicada. Al terminar:

1. **Una línea en «Datos cargados»**: fecha, base (`gmlbmyreoxgoqrolhyxo` o real), proyecto, qué se cargó y enlace al relevo.
2. **Un relevo** en `docs/relevo/RELEVO_<fecha>_carga-<lote>.md` con:
   - **qué**: lote (p. ej. AV_000013–020), cantidad de árboles y sus códigos (nuevos o existentes), inspecciones creadas (INS-…), OT asociadas y tipo de inspección;
   - **cómo**: por la API (borrador → calcular → finalizar → completar OT) o por SQL/script; el script y su commit; `rule_version` con que se calculó;
   - **fotos**: cuántas por árbol y qué vistas (D-27, «detalle»);
   - **verificación**: conteos antes y después (B8 `cobertura`, diagnósticos B18), árboles omitidos o con error y el motivo, componentes «No determinado» y ajustes del Inspector;
   - **decisiones y pendientes**: CC relacionados, datos que faltaron y quién debe decidir;
   - **cómo revertir** la carga si hace falta.
3. Si la carga trajo campos, catálogos o reglas nuevas: **CC primero** (`docs/workflow.md` §14). Nunca se cargan datos que el Excel no define.

## Personas y decisiones

- **Valej**: metodología, evaluación y medidas. Decide los CC metodológicos.
- **Mari**: Valpo Verde Conecta y fichas públicas.
- Toda decisión se registra como CC en `docs/registro-cambios.md` (`docs/workflow.md` §14). No se aplica una migración en ninguna base sin autorización explícita.

## Reglas que más se olvidan

- **`D-n` es la fila de `DICCIONARIO_CAMPOS` en el `.xlsx`**, nunca la línea del CSV exportado. Verifica con `scripts/metodologia/fila_diccionario.py`.
- **Jest simula la base:** toda función SQL nueva necesita además un script de pruebas real contra la base de pruebas, con un caso por rama, y probar las funciones que consumen su resultado.
- **Migraciones:** `apply_migration` (queda en el historial), nunca `execute_sql` para aplicar o revertir. Si `apply_migration` falla, reintentarlo. Al cambiar la firma de una función: `DROP` de la firma anterior antes del `CREATE`.
- **md5** de una migración aplicada: contra el archivo pasado a LF (`tr -d '\r' < f.sql | md5sum`).
- **Storage:** un bucket no se revierte con SQL; las migraciones de Storage se escriben idempotentes.
- Llamadas SQL con varios parámetros del mismo tipo: siempre con nombre (`p_x => valor`).

(Detalle y contexto de cada una: `HANDOFF.md`, § «Lecciones permanentes».)

## Cómo leer `project-rules.md` sin cargarlo entero

Pesa ~158 KB y dos tercios son versiones reemplazadas. Para ver solo las vigentes:

```bash
grep -n "^## " docs/project-rules.md | grep -v REEMPLAZADA
```

Luego lee solo la sección que necesitas (con `offset` y `limit`). Lo mismo con `docs/architecture-decisions.md` (`grep -n "^## ADR"`) y `docs/registro-cambios.md` (`grep -n "^### CC-077"`).

## Qué leer y cuándo

| Necesito… | Leer |
|---|---|
| Reglas de trabajo y jerarquía de fuentes | `CLAUDE.md` (ya cargado) |
| Hacer cualquier cambio | `docs/workflow.md`: §1 (clasificar), §8 (migraciones), §11 (verificación) y §14 (CC), según el caso |
| Una regla de negocio o un rol | `docs/project-rules.md`, solo la sección vigente (ver arriba) |
| Arquitectura, autenticación, SIG | `docs/architecture-decisions.md`, el ADR puntual |
| Un campo, catálogo o regla metodológica | El Excel (o `docs/excel/export/`) y `docs/methodology/00-index.md` |
| Un CC aprobado o pendiente | `docs/registro-cambios.md`, solo ese CC |
| Contrato de un endpoint | `README.md` § «Contrato para frontend» y `src/routes/` |
| Historia de un bloque de trabajo | `HANDOFF.md` (historial; buscar por fecha o tema) y `docs/relevo/` |
| Pendientes o deudas técnicas | `docs/registro-pendientes.md`, `docs/roadmap.md` |

## Verificación

`npm test` (Jest) y `npm run typecheck`. Las funciones SQL se prueban además contra la base de pruebas, con los scripts `database/fase6/pruebas_*.sql`.
