# Escenarios de prueba RLS (T1) — Auditoría postdemo 2026-10

> **Estado: W1–W12 NO EJECUTADOS.** Son escenarios preparados. Solo se ejecutarán en un **entorno de pruebas aislado** (decisión de la autora, 2026-10-11) y con su autorización expresa.
>
> L1–L5 (solo lectura) **se ejecutaron** el 2026-10-11 contra `valpo-verde-conecta`, dentro de transacciones con `ROLLBACK` y sin escrituras.

**Repositorio público.** Los escenarios se describen con personas genéricas y resultados esperados, sin identificadores reales ni sentencias listas para ejecutar. La versión ejecutable se conserva fuera del repositorio.

## Personas

| Persona | Rol | Situación |
|---|---|---|
| A | `admin` | Acceso transversal de solo lectura (CC-022) |
| M1 | `usuario_municipal` | Miembro del proyecto P1 |
| M2 | `usuario_municipal` | Sin proyectos |
| ANON | sin sesión | — |

P1 es un proyecto con árboles; P2 es otro proyecto del que M1 no es miembro.

## Método

En cada escenario, una transacción independiente adopta el rol de la persona (rol de base de datos y claims del JWT), intenta la operación y termina siempre en `ROLLBACK`.

Se considera **rechazo** un error de permiso o 0 filas afectadas en UPDATE/DELETE.

## Lecturas (EJECUTADAS 2026-10-11)

| ID | Persona | Resultado esperado | Resultado obtenido |
|---|---|---|---|
| L1 | M1 | Ve solo P1 y sus datos (árboles, mediciones, evaluaciones, incidencias, órdenes); solo su propia membresía y su propio perfil | ✔ Coincide |
| L2 | M2 | No ve ningún proyecto ni dato de proyecto; ve su perfil y el catálogo de especies | ✔ Coincide |
| L3 | A | Ve todos los proyectos y datos (lectura transversal) | ✔ Coincide |
| L4 | ANON | No ve nada, ni siquiera especies | ✔ Coincide |
| L5 | todos | La tabla de roles no es legible por la API (el rol se resuelve con funciones de la base) | ✔ Coincide |

Hallazgo derivado de L1: **I1-b**. M1 no puede leer los nombres de otros usuarios, por lo que la ficha muestra "—" como autor en los registros de otras personas.

## Escrituras (NO EJECUTADAS)

"Esperado hoy" se basa en la lectura de las políticas y permisos vigentes. "Objetivo" es el resultado tras implementar DA-01 / I1.

| ID | Persona | Intento | Esperado hoy | Objetivo | Hallazgo |
|---|---|---|---|---|---|
| W1 | M1 | Registrar directamente una evaluación de riesgo con un resultado no calculado por el motor | Acepta | **Rechaza** | S1, C1 |
| W2 | M1 | Registrar una evaluación atribuida a otro usuario | Acepta | **Rechaza** | S1, I1 |
| W3 | M1 | Modificar columnas protegidas de un árbol de P1 (código, estado de ciclo de vida, autor) | Acepta | **Rechaza** | S1 |
| W4 | M1 | Mover un árbol de P1 a P2 | Rechaza | Rechaza | Control positivo |
| W5 | M1 | Crear un árbol sin medición inicial, sin pasar por la función atómica | Acepta | **Rechaza** | S1, ADR-016 |
| W6 | M1 | Reescribir la bitácora, la descripción o el informante de una incidencia | Acepta | **Rechaza** | S1, I2 |
| W7 | M1 | Registrar una incidencia a nombre de otro usuario | Acepta | **Rechaza** | S1, I1 |
| W8 | M1 | Asignar a una orden un estado fuera del catálogo | Acepta | **Rechaza** | S1, I3 |
| W9 | A | Escribir datos de P1 (CC-022: solo lectura) | Rechaza | Rechaza | C2 (control) |
| W10 | M2 | Escribir datos de P1 | Rechaza | Rechaza | Control |
| W11 | M1 | Modificar su perfil o rol, agregarse a P2 o borrar datos | Rechaza | Rechaza | Control |
| W12 | ANON | Ejecutar la función de alta de árbol | Rechaza (la función exige sesión) | Rechaza, idealmente sin permiso de ejecución | S3 |

## Condiciones para ejecutarlos

1. Entorno aislado activo, con el esquema reproducido. Ojo: el historial de migraciones solo registra 007–011 (E1).
2. Usuarios y proyectos sintéticos propios del entorno de pruebas.
3. Autorización expresa de la autora.
4. Resultados registrados en este archivo, con fecha, sin datos reales.

## Destino posterior

Una vez ejecutados, los escenarios deberían pasar a pruebas automáticas del repositorio, corriendo en CI contra el entorno de pruebas (hallazgos T1 y T2).
