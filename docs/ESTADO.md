# Estado actual — backend SIVU

> **Leer esto primero.** Es lo único que una sesión nueva necesita para empezar. Lo demás se consulta **por sección** cuando la tarea lo pide (tabla «Qué leer y cuándo»). Este archivo se **reemplaza, no se alarga**: máximo ~120 líneas. El detalle de un trabajo va en `docs/relevo/RELEVO_<fecha>_<tema>.md` o en el CC correspondiente.
>
> Última actualización: 2026-11-18. Estado de ramas verificado contra `origin` ese día.

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

## Trabajo en curso (ramas activas al 2026-11-18)

| Rama | Tema |
|---|---|
| `integration/cc077-d27-backend` | CC-077: aplicar D-27 (fotos) en la API y PostgreSQL |
| `integration/cc077-metodologia` | CC-077: paquete metodológico 3.1.0 |
| `integration/f4d-estacionalidad` | Validar estacionalidad y porcentajes de copa en la inspección |
| `docs/demo-ia-dudas-2026-11-17` | Dudas abiertas de la demo de estimación con IA (AV_000014–020) |

Pendientes conocidos fuera de esas ramas:
- **Conecta** (ficha pública editable, fotos por árbol): `docs/relevo/RELEVO_2026-11-15_mari.md` §3. Requiere CC, filas del Excel aprobadas y autorización para migrar.
- **Carbono** (CC-068/069): bloqueado, al 2026-11-01, por no poder leer Pillsbury et al. 1998.
- **Frontend Infraestructura** (rediseño aprobado, rama del frontend `feature/infraestructura-componentes`): para fotos por componente hace falta un CC (hoy `photos.vista` solo tiene las vistas de D-27 y «detalle»).

## Si cargas evaluaciones de árboles (desde cualquier cuenta)

Una carga cambia lo que ven todas las sesiones y la API publicada. Al terminar:

1. **Una línea en este archivo**, en «Trabajo en curso» o en «Datos cargados»: fecha, base (`gmlbmyreoxgoqrolhyxo` o real), proyecto, lote y enlace al relevo.
2. **Un relevo** en `docs/relevo/RELEVO_<fecha>_carga-<lote>.md` con:
   - **qué**: lote (p. ej. AV_000013–020), cantidad de árboles y sus códigos, inspecciones creadas (INS-…), OT asociadas y tipo de inspección;
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
