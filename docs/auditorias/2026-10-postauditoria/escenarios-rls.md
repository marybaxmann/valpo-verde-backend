# Escenarios de prueba RLS (T1) — Auditoría postdemo 2026-10

> **Estado: W1–W29 EJECUTADOS el 2026-10-21**, contra `valpo-verde-conecta-pruebas`, tras aplicar la migración 017 (RLS por rol, CC-033; bloqueo de proyecto cerrado, CC-042; `security_invoker` en las vistas de la 016). Autorización expresa de la responsable (2026-10-21).
>
> L1–L5 (solo lectura) se ejecutaron por primera vez el 2026-10-11 contra `valpo-verde-conecta` (modelo anterior). Se repiten aquí contra el modelo nuevo, extendidas a los roles `inspector` y `encargado_mantencion`.

**Repositorio público.** Los escenarios se describen con personas genéricas y resultados esperados, sin identificadores reales ni sentencias listas para ejecutar. La versión ejecutable (fixtures sintéticos + SQL de cada caso) se conserva fuera del repositorio.

## Personas

| Persona | Rol | Situación |
|---|---|---|
| A | `admin` | Acceso transversal de solo lectura (AMD-02) |
| M1 | `usuario_municipal` | Miembro de P1 y de P3 |
| M2 | `usuario_municipal` | Sin proyectos |
| I1 | `inspector` | Miembro de P1 — **nueva** |
| E1 | `encargado_mantencion` | Miembro de P1 — **nueva** |
| ANON | sin sesión | — |

P1: proyecto activo con un sector, un árbol, una OT de inspección completada con su inspección finalizada y su evaluación, una OT de mantenimiento completada con su registro, y una incidencia con su reportante. P2: proyecto activo del que nadie de la lista es miembro (control negativo). P3: proyecto con su propio sector y árbol, miembro M1, **cerrado** durante los escenarios de proyecto cerrado y reabierto al terminar — **nuevo**.

Todas las personas se crearon como filas sintéticas en `auth.users` (correo `@example.invalid`, sin contraseña) y `user_profiles`, solo en `valpo-verde-conecta-pruebas`, y se borraron junto con P1/P2/P3 y todo lo que colgaba de ellos al terminar (verificado con conteos en 0; los 4 usuarios reales de la base no se tocaron).

## Método

Lecturas y escrituras de `authenticated`/`anon`: una transacción con `SET LOCAL ROLE` + `set_config('request.jwt.claims', ...)`, termina en `ROLLBACK`. Escrituras con `service_role` (W23 a W28): `SET LOCAL ROLE service_role` — simula al backend, que escribe pasando por encima del RLS; lo único que puede detenerlo es un trigger. Se considera **rechazo** un error de permiso (RLS, GRANT o EXECUTE) o 0 filas afectadas en UPDATE/DELETE.

## Lecturas

| ID | Persona | Intento | Esperado | Resultado |
|---|---|---|---|---|
| L1 | M1 | `SELECT` de proyectos | Ve P1 y P3 (es miembro de ambos) | ✔ Coincide |
| L1b | I1 | `SELECT` de proyectos | Ve solo P1 | ✔ Coincide |
| L1c | E1 | `SELECT` de proyectos | Ve solo P1 | ✔ Coincide |
| L2 | M2 | `SELECT` de proyectos | 0 filas | ✔ Coincide |
| L3 | A | `SELECT` de proyectos | Ve todos (transversal, solo lectura) | ✔ Coincide |
| L4 | ANON | `SELECT` de proyectos | Rechaza | ✔ Coincide — **rechazado a nivel de GRANT** (`permission denied for table projects`), más fuerte que un filtro RLS a 0 filas |
| L5 | A (cualquiera) | `SELECT` de `roles` | 0 filas / rechazo (solo vía funciones SECURITY DEFINER) | ✔ Coincide |

## Nuevas tablas y roles (W13–W22)

| ID | Persona | Intento | Esperado | Resultado |
|---|---|---|---|---|
| W13 | I1 | Leer `trees`/`inspections`/`evaluations` de P1 | Acepta | ✔ Coincide (1 fila cada una) |
| W14 | I1 | Leer `trees` de P2 | 0 filas | ✔ Coincide |
| W15 | E1 | Leer `maintenance_records` de P1 | Acepta | ✔ Coincide |
| W16 | M1 | Leer `incident_reporters` de P1 | Acepta (solo `usuario_municipal`) | ✔ Coincide |
| W17 | I1 | Leer `incident_reporters` de P1 | 0 filas (ni inspector) | ✔ Coincide |
| W18 | A | Leer `incident_reporters` de P1 | 0 filas (**PR-022**, no AMD-02: dato personal, ni el admin lo ve) | ✔ Coincide |
| W20 | M1 | `SELECT` en las 6 vistas de la 016 (`v_tree_presence`, `v_inspections`, `v_tree_current_inputs`, `v_species_traits`, `v_upcoming_inspections`) | Filtradas igual que sus tablas base | ✔ Coincide (2/1/0/2/1 filas — el 0 de `v_tree_current_inputs` es porque la evaluación sintética no llevaba variables, no un fallo de la vista) |
| W21 | M2 | `SELECT` en las mismas vistas | 0 filas | ✔ Coincide |
| W22 | ANON | `SELECT` en cualquier vista o tabla | Rechaza | ✔ Coincide (igual que L4: a nivel de GRANT) |

## Escrituras directas (CC-033: ninguna política de escritura, para ningún rol)

| ID | Persona | Intento | Esperado | Resultado |
|---|---|---|---|---|
| W1/W9/W10/W19 | M1, A | `UPDATE trees` directo | Rechaza | ✔ Coincide — `permission denied for table trees` (rechazado a nivel de GRANT, ni siquiera llega a evaluar RLS) |
| W11 | M1 | `UPDATE user_profiles` de su propia fila | Rechaza | ✔ Coincide |
| W19b | I1, E1 | `UPDATE inspections` / `INSERT maintenance_records` | Rechaza | ✔ Coincide |
| W12/W29 | ANON, M1 | `SELECT fn_refresh_tree_current(...)` | Rechaza | ✔ Coincide — `permission denied for function` |
| W12/W29 | ANON, M1 | `SELECT fn_create_tree_with_measurement(...)` | Rechaza | ✔ Coincide — `permission denied for function`. **Nota:** esto deja sin función el alta de árbol actual hasta que la Fase 6 la reescriba sobre el modelo nuevo con `service_role`; hoy solo afecta a `valpo-verde-conecta-pruebas` |

## Proyecto cerrado (RG fila 27; CC-042) — nuevo

| ID | Persona | Intento | Esperado | Resultado |
|---|---|---|---|---|
| W23 | `service_role` | `INSERT work_orders` en P3 (cerrado) | Rechaza, aunque `service_role` tenga `BYPASSRLS` | ✔ Coincide — el trigger se ejecuta igual; `BYPASSRLS` solo omite políticas, nunca triggers |
| W25 | `service_role` | `UPDATE projects` de P3 (cerrado), un campo distinto de `estado_proyecto` | Rechaza | ✔ Coincide |
| W26 | `service_role` | `UPDATE project_members` de P3 (cerrado) | Acepta (excepción) | ✔ Coincide |
| W24 | `service_role` | `UPDATE projects` de P3: `cerrado` → `activo` | Acepta | ✔ Coincide |
| W27 | `service_role` | `DELETE` en una tabla protegida de un proyecto **activo** (P1) | Acepta | ✔ Coincide |
| W28 | `service_role` | Validar una incidencia (`resultado_revision = 'validada'`) en P1 (activo) | Se borra la fila de `incident_reporters` de esa incidencia | ✔ Coincide |

## Resultado global

**29/29 escenarios con el resultado esperado.** Ningún hallazgo nuevo (a diferencia de la ronda de 2026-10-11, que encontró I1-b y las brechas S1/S3 — esas ya están resueltas por el diseño de la Fase 3 y la migración 017).

## Condiciones con las que se ejecutó

1. Entorno aislado (`valpo-verde-conecta-pruebas`, ref `gmlbmyreoxgoqrolhyxo`), confirmado antes de cada bloque de SQL.
2. Usuarios y proyectos sintéticos propios del entorno de pruebas, borrados al terminar con verificación por conteo.
3. Autorización expresa de la responsable (2026-10-21).
4. Resultados registrados en este archivo, sin datos reales ni UUID literales.

## Destino posterior

Estos 29 escenarios son candidatos directos a pruebas automáticas del repositorio (Jest + conexión a un entorno de pruebas), para que corran en CI contra cada cambio de RLS futuro, en vez de repetirse a mano.
