# Registro maestro de pendientes — SIVU

> **Qué es.** Inventario único de TODOS los pendientes abiertos, anteriores y actuales: metodología y Excel, migraciones, backend, frontend, validación, despliegue, seguridad y datos. No es una fuente de reglas: cada fila remite a su documento de origen (CC, PR, ADR, roadmap, HANDOFF). Ante una diferencia, manda el documento de origen.
>
> **Regla (Valej, 2026-11-02):** se actualiza en cada bloque de trabajo. **No se eliminan pendientes postergados**: se marcan con su estado. Los ítems `PA-*` y `AM-*` siguen detallados en `docs/roadmap.md`; aquí se listan todos los abiertos con su estado actual.
>
> **Corte:** 2026-11-02 (después de aplicar la 033 y publicar). `feature/fase6-backend-api` y `wip/bloque1-completar-ot` = `8e0c3ee`; `release/demo` = `3d717ce` (API de la presentación, congelada, sin cambios); `main` = `a87292a` (sin cambios).

## Cómo leer los estados

| Columna | Significa |
|---|---|
| **Implementado** | El código o la migración existen (aunque sea solo en local). |
| **Probado** | Pasaron las pruebas automáticas (Jest con datos simulados, o el script SQL en la base de pruebas). |
| **Publicado** | Está en GitHub, en `feature/fase6-backend-api` y `wip/bloque1-completar-ot`. |
| **Desplegado** | Corre en la API publicada (`release/demo`, sivu-api). |
| **Validado** | Valej lo verificó en la API publicada con sesiones reales. |

Valores: **Sí** · **No** · **Parcial** · **—** (no aplica).

## 1. Bloques recientes del backend (2026-11-01/02)

| Ítem | Ref. | Commits | Implementado | Probado | Publicado | Desplegado | Validado | Pendiente concreto |
|---|---|---|---|---|---|---|---|---|
| Universos de B19 (biométricos = evaluación completa vigente) y `evaluacion_completa_vigente` en B2 | CC-016 | `2401497`, `637f757` | Sí | Sí (Jest) | Sí | No | No | Desplegar después de la presentación; frontend adapta los renombres (§4). |
| Carbono aéreo leñoso en B19 y B2 (Jacarandá y Liquidámbar) | CC-069 | `b6dbc43`, `2e09fb1`, `e57d8fd`, `b5ee325` | Sí | Sí (Jest) | Sí | No | No | Cobertura real 0 (sin árboles de esas especies medidos). Sincronizar con el Excel (§2). |
| Árbol nuevo en Levantamiento (`nuevo_arbol`) | CC-052 | `bf2dd9b` | Sí | Sí (Jest; la 018f ya tenía L1-L7 en SQL) | Sí | No | No | Desplegar después de la presentación; probar en la API con una OT de Levantamiento. |
| Infraestructura (B8) | CC-059/060 | `a730784` | Sí | Sí (Jest) | Sí | No | No | Desplegar; validar con datos reales. |
| OT vencidas (B6) | decisión Valej | `791aa2a` | Sí | Sí (Jest) | Sí | No | No | Desplegar; validar. |
| Avisos internos (CC-051) y recordatorios (#63) — backend | CC-051, #63 | `3b8b90c`, `5402698` | Sí | Sí (Jest) | Sí | No | No | Desplegar; validar en la API (cancelar, reasignar, recordatorios con un Usuario municipal). Correo: etapa 2. |
| Migración 033 (tabla `notifications`, trigger, RLS) | CC-051, #63 | `cbd1e25`, `23b4194`, `5402698`, `8e0c3ee` | Sí (aplicada en la base de pruebas) | Sí: `pruebas_033` N1–N9 OK en las dos rondas; reversión restaura el esquema y los datos; md5 up `ec103244…` / down `56197347…` = archivos | Sí | No (no en `release/demo` ni en la base real) | No | Aplicarla en la base real en la Fase 8; validar en la API. |
| Migración 034 (cancelar una OT Pendiente sin fecha programada) | CC-050 | `e53d74c`, `1a7dcb3` | Sí (aplicada en la base de pruebas, 2026-11-02) | Sí: `pruebas_034` R1–R13 y regresión `pruebas_033` N1–N9 en las dos rondas; reversión restaura la línea base; md5 up `8395abb5…` / down `7e92c5fb…` = archivos; sin consumo de numeración | Sí (`feature/fase6-backend-api` = `aaaaeb7`, 2026-11-02) | Solo en la base de pruebas (efecto activo también para `release/demo`); no en la base real | No | Validar por API (guía §6.3); publicar con autorización; aplicarla en la base real en la Fase 8. |
| Migración 032 (identificación de especie provisional/confirmada) | CC-016 (decisión 2) | `d1d9db1` | Sí (propuesta) | No | Sí (como propuesta) | No | No | Autorización; decidir dónde se registra (alta, inspección o carga); CC del campo nuevo. |
| Densidad de la madera en el catálogo de especies | CC-068 | — | No (vive en el catálogo de modelos) | — | — | — | — | Migración sujeta al Excel (Valej: no aplicar hasta incorporarlo). |

## 2. Metodología y Excel maestro (postergado por decisión de Valej, 2026-11-02)

El Excel sigue siendo la fuente original; las decisiones aprobadas en CC son modificaciones provisionales controladas. **No se pide la sincronización como requisito** para tareas que no dependan técnicamente de ella.

| Ítem | Qué falta en el Excel | Estado |
|---|---|---|
| CC-016 | Fila en VERSION; filas 11 a 13 de INDICES con el universo de evaluados (`docs/plan/propuestas/excel-indices-filas-11-13.md`) | Pendiente de sincronización |
| CC-068 | Densidad de la madera en DICCIONARIO_CAMPOS y CATALOGO_ESPECIES | Pendiente de sincronización |
| CC-069 | Fila 14 de INDICES y hoja `MODELOS_BIOMASA` | Pendiente de sincronización |
| CC-052, CC-051 | Ninguno (no cambian el Excel) | — |
| AM-15 | Textos de CC-043, CC-044, CC-050 (D-239/D-241), CC-062 (código de seguimiento), CC-067 | Pendiente |
| AM-21 | Lo que vive solo en el backend (CC-066: 139 etiquetas del formulario, etc.) | Pendiente |
| AM-23 | Inspector revisor de una OT de Mantenimiento | Pendiente |
| PA-21 | CC-022 (USUARIOS, «¿Quién lo ingresa?»), CC-024 | Pendiente |
| AM-05 | INDICES pendiente de revisión posterior (P16) | Parcial (CC-016 cubre filas 3-13) |
| AM-13 | VERSION/tag del paquete 2.1.0 | Pendiente (documentación resuelta) |
| Campo nuevo de identificación provisional | Requiere CC y fila en DICCIONARIO_CAMPOS antes de la 032 | Pendiente |

**Decisiones metodológicas abiertas (no son del Excel, pero las fija Valej):**

| Ítem | Ref. | Estado |
|---|---|---|
| Modelos de carbono APTO CON LIMITACIONES (Falso acacio, Fresno, Aromo, genérica de latifoliadas, Jenkins) | CC-069 | Justificar uno por uno antes de activarlos |
| Palmeras y multifustales en carbono | CC-069 | Sin estimación hasta tener modelos apropiados |
| Secuestro anual de carbono | INDICES fila 15 | Requiere remediciones de D y H |
| Biomasa de copa y área foliar (Dobbs 2011) | CC-069 / INDICES 18-19 | Sin decidir; ecuación de área foliar de *Acer negundo* con probable errata |
| Demás indicadores ecosistémicos (contaminantes, escorrentía, transpiración, VOC, energía, valor compensatorio, aves, UV) | INDICES 20-31 | «Pendiente» en el Excel; requieren datos externos |
| Verificar la cita del IPCC 2006 (0,47) en el original | CC-069 | Pendiente (marcada «verificar») |
| Clasificación de vitalidad en palmeras | AM-20 | Pendiente |
| Agrupar variedades/subespecies en su especie | CC-016 | Resuelto (Valej, 2026-11-01) |
| PA-01 (publicación pendiente), PA-02, PA-05 a PA-11 | roadmap | Pendientes de decisión (ver roadmap) |

## 3. Migraciones y base de datos

| Ítem | Estado | Pendiente |
|---|---|---|
| 033 notificaciones | **Aplicada en la base de pruebas** (2026-11-02, ciclo completo, N1–N9 OK dos rondas) | Base real (Fase 8) |
| 032 identificación de especie | Propuesta | Autorización + CC |
| Límite por IP compartido para Conecta (opción A) | No escrita | Migración sujeta a autorización (hoy en memoria, por instancia de Vercel) |
| `chk_species_especie_cientifica_valida` («spp.» y espacios) | Pendiente de aprobación | Ver HANDOFF |
| `database/schema.sql` desincronizado (018h, 018i, 028 a 031 y 033; la 034 ya está, revisión 28) | Pendiente | Copiar desde las migraciones aplicadas |
| AM-19 unificar filtro de inspecciones válidas | **Resuelto en la base de pruebas** (verificado por lectura el 2026-11-02: `fn_refresh_tree_current` y `v_tree_current_inputs` de la 025, `v_tree_fechas_vigentes` de la 030, todas con inspección finalizada y OT completada); estado actualizado en el roadmap sin borrar el texto | Reproducirlo en la base real (Fase 8) |
| PA-13 / PA-14 entorno de pruebas aislado y W1-W12 | Pendiente de decisión / bloqueado | — |
| PA-34 avisos de rendimiento de Supabase (políticas, índices FK) | Pendiente | Revisar asesores también después de la 033 |
| Base real (`ytcxswbulsmboucardxa`) — Fase 8, #45 | No se toca | Migraciones, bucket (019) y datos cuando se pase a producción |

## 4. Frontend (coordinar con la compañera; `coordinacion.md`)

| Ítem | Estado |
|---|---|
| Adaptar los renombres incompatibles de B19 (`denominador_evaluados`), los nuevos campos de `cobertura` y `evaluacion_completa_vigente` de B2 | Pendiente (publicado en `feature`/`wip`, no desplegado) |
| Mostrar el carbono: «No estimable», «Fuera del universo» y motivos; nunca 0 | Pendiente |
| CC-052: `nuevo_arbol` en el primer guardado y búsqueda de cercanos antes de crear | Pendiente (publicado en `feature`/`wip`, no desplegado) |
| B6 `vencida` y `solo_vencidas`; B8 `/infraestructura`; avisos y recordatorios (`/notificaciones`) | Pendiente (publicado en `feature`/`wip`, no desplegado) |
| Conecta: el documento del frontend usaba rutas y campos viejos (`/api/public/conecta`, `/reportes`, `nombre`/`rut`, `especie`, `estado`); adaptar a `coordinacion.md` | Pendiente |
| PA-16, PA-18, PA-28, PA-30, PA-32, PA-36, PA-43, PA-44 | Pendientes (ver roadmap) |

## 5. Validación en la API publicada (manual, Valej)

| Ítem | Estado |
|---|---|
| Verificados: B1 (búsqueda), B3, B5, B13, B17, B18, Conecta público, B9, catálogo público, `qr_token` en B1, Mantenimiento #61 con AM-22 | Validado |
| Sin validar: B1 ampliado, B2, B7, B11, árboles cercanos (CC-052), placas QR (escanear una impresa) | Pendiente |
| Sin validar por no estar desplegados: universos de B19, carbono, CC-052, B8, B6, avisos y recordatorios | Pendiente. **Plan de validación:** `docs/plan/plan-validacion-bloques-2026-11-02.md` (casos por rol y prioridad). Requiere un backend con `2174243` contra la base de pruebas (local o vista previa; la API publicada corre `3d717ce`) |
| Requisitos de datos para validar (2026-11-02, lectura): no hay ninguna OT de Levantamiento abierta (crear una de QA); en QA Fase 7 no hay OT vencidas (el Piloto tiene 1); **ningún** `recordatorio_activo` hasta el 2026-11-13 (A-000423, Piloto); B8 tiene 1 árbol evaluado en QA y 4 en el Piloto; `notifications` vacía | Pendiente de preparar (los datos de QA creados por la API quedan permanentes y se registran como simulados) |
| **Script de validación por API** (`scripts/validacion/validar-bloques.ps1`; instrucciones `docs/plan/validacion-api-script.md`): entorno V-1 a V-4, parte A de solo lectura y parte B con escritura (`-Modo Escritura`, confirmación `CREAR`) | Implementado; **no ejecutado** (sin PowerShell en la nube; la primera ejecución de Valej también prueba el script); publicado en `feature/fase6-backend-api` (`aaaaeb7`, 2026-11-02, autorización de Valej). `wip/bloque1-completar-ot` sigue en `8e0c3ee` |
| Casos **no validados por API**, solo lectura: B8-1 a B8-9; B6-1 a B6-5 y B6-7; R-1, R-2; A-0, A-11 | Pendiente de ejecución (Valej, `-Modo Lectura`) |
| Casos **no validados por API**, con datos de QA: 034-1 a 034-5 (cancelar Pendiente); A-2 a A-10 y A-12 (avisos); B6-6; L-1, L-2, L-3, L-5 a L-8 (CC-052). Crean 3 OT, 1 árbol y 1 inspección en borrador en el proyecto QA, que se registran en `datos-creados.json` | Pendiente de ejecución (Valej, `-Modo Escritura`), después de revisar la parte A |
| Casos **bloqueados** por datos o fecha: R-3 a R-5 (recordatorio positivo, desde el 2026-11-13, sin alterar fechas); L-4 (fuera del sector, requiere otra OT de Levantamiento); L-9 (finalizar y completar, requiere datos técnicos completos); B8-3 y B8-4 sin cuenta de Administrador o no miembro; B8-9, B6-1 y B6-7 si el Usuario municipal de QA no es miembro del Piloto | Pendiente; requieren autorización, fecha o cuentas |
| Varias OT por incidencia, otros roles en B9 y B1, revisor fuera del proyecto | Pendiente |

## 6. Despliegue y configuración

| Ítem | Estado |
|---|---|
| `release/demo` congelada en `3d717ce` hasta después de la presentación del 2026-11-03 | Vigente |
| **Efecto de la 033 en la API publicada:** `release/demo` usa la misma base de pruebas; desde el 2026-11-02, cancelar o reasignar una OT desde esa API ya guarda avisos en `notifications` (el código viejo no los muestra). Si el trigger fallara, esa API respondería 500 genérico (el 503 claro está solo en el código nuevo) | Riesgo bajo (N1–N9 OK); vigilar durante la presentación |
| Llevar a `release/demo` lo publicado en `feature` (universos, carbono, CC-052, B8, B6, avisos) | Pendiente; después de la presentación y con autorización. La 033 ya está en la base de pruebas, que es la que usa la API publicada |
| `CONECTA_URL_BASE` (placas QR) y `CORS_ORIGIN` en Vercel | Pendiente (lo configura Valej) |
| Etiqueta `presentacion-2026-11-03` | Pendiente |
| PR de `feature/fase6-backend-api` a `main` (sin merge) | Pendiente |
| Worktree `../valpo-verde-backend-pub` y rama `carbono/integracion-b19` | Limpiar cuando Valej lo indique |
| Rama `respaldo/b19-carbono-2026-11-02` y bundle del scratchpad | Conservar hasta cerrar la revisión |
| PA-10 etiquetas `demo-2026-10-10`; PA-22 issue #6 y tablero; PA-24 limpieza de ramas `docs/cc-021…024` | Pendientes (ver roadmap) |

## 7. Seguridad

| Ítem | Estado |
|---|---|
| Límites por IP de Conecta: hoy por instancia de Vercel, no globales | Riesgo aceptado para la demo; opción A pendiente |
| 033: RLS de lectura propia, sin escritura de cliente, `REVOKE` a anon y de escritura a authenticated, trigger `SECURITY DEFINER` con `search_path` fijo | Aplicada en pruebas; N6, N8 y N9 lo comprueban; asesor de seguridad sin hallazgos nuevos |
| Avisos de un usuario que deja el proyecto: conserva los avisos antiguos (código de OT y motivo), sin acceso a la OT | Riesgo bajo, documentado |
| Correo de avisos (CC-051 etapa 2): proveedor externo que trata datos personales; falta dominio remitente | Postergado |
| PA-39 (cabeceras, contraseñas filtradas), PA-25, PA-20 | Pendientes/bloqueados (ver roadmap) |
| Asesor de seguridad de Supabase después de la 033 | Hecho (2026-11-02): sin hallazgos nuevos. Siguen los previos: PostGIS en `public` y `spatial_ref_sys` sin RLS, funciones `SECURITY DEFINER` de ayuda de RLS ejecutables por `authenticated`, tablas del modelo antiguo con RLS sin políticas, protección de contraseñas filtradas desactivada (PA-39) |

## 8. Robustez y calidad

| Ítem | Estado |
|---|---|
| PA-29 tiempos máximos de petición; PA-35 errores tipados; PA-37 CI y pruebas de frontend; PA-38 registro de peticiones; PA-31 idempotencia en altas; PA-41 fecha de alta con hora de Chile; PA-42 caché | Pendientes |
| Rendimiento de B19, B2 y B8 (consultas extra por pedido) | Sin medir en la API |
| Carrera en `completarEspecie` (dos Inspectores completando la misma especie) | Mejora futura, baja prioridad |
| PA-17 README; PA-23 comentarios contradictorios con CC-022; PA-19 `docs/methodology` frente al motor | Pendientes / bloqueado |

## 9. Datos

| Ítem | Estado |
|---|---|
| Inventario de Riquelme: confirmar especies (8 nombres comunes ambiguos), cargar con identificación provisional marcada (requiere 032) | Pendiente; no modificar identificaciones actuales sin revisar la correspondencia |
| Mediciones de DAP y altura de Jacarandá y Liquidámbar (para que el carbono tenga cobertura) | Pendiente (terreno) |
| Catálogo de especies del piloto (P7: falta *Lagerstroemia indica* y otras; `species_id` vacío) | Pendiente |
| AM-09 datos simulados en las bases de prueba | Pendiente |
| Registros de QA (INC-000017, OT-I-000358, OT-M-000018, A-000348): simulados, no son intervenciones reales | Documentado |

## 10. Bloqueos y hallazgos de este corte (2026-11-02)

| Ítem | Estado |
|---|---|
| Respaldo de la base de pruebas: las herramientas de esta sesión no permiten verificar los respaldos de la plataforma Supabase. Se tomó una línea base (triggers de `work_orders` md5 `1d242676…`, datos de OT md5 `02a07460…`) y se comprobó que la reversión la restaura | Documentado |
| md5 de la 033: la primera comparación difirió solo por un salto de línea final de más en el archivo (al quitar `BEGIN/COMMIT`); corregido el archivo; contenido idéntico | Resuelto |
| SV074 ya lo usaba la 031; la 033 usa SV075 | Resuelto |
| Rama local `respaldo/b19-carbono-2026-11-02`, bundle del scratchpad y worktree `../valpo-verde-backend-pub` | Conservados hasta que Valej indique limpiarlos |
| Validación por API de B8, B6, CC-051, CC-052 y #63: **bloqueada** en la sesión en la nube (sin `.env`, `SUPABASE_SERVICE_ROLE_KEY` ni sesiones de QA). Casos independientes por SQL hechos; resultados en `plan-validacion-bloques-2026-11-02.md` §5 | Decisión de Valej: opción B (su computador, PowerShell). Guía: `docs/plan/validacion-local-powershell.md`. Pendiente de ejecución |
| **Defecto preexistente:** cancelar una OT **Pendiente** (Inspección o Mantenimiento) fallaba (`chk_work_orders_fecha_programada`, 014; `fn_cancel_work_order`, 025). Contradecía CC-050. En la API, 400 | **Corregido en la base de pruebas** con la migración 034 (2026-11-02, autorización de Valej): implementado sí; probado sí (034 R1–R13 y 033 N1–N9 en dos rondas, reversión exacta, md5 up `8395abb5…` / down `7e92c5fb…` = archivos); publicado sí (`feature/fase6-backend-api`, `aaaaeb7`); desplegado: activo en la base de pruebas, que también usa `release/demo`; **no** en la base real (Fase 8); validado por API: no (guía §6.3). Ficha: `docs/plan/propuestas/034-cancelar-ot-pendiente.md` |
| Ensayo revertido en QA consumió el código **OT-I-000359** (salto en la secuencia; no hay fila; la próxima OT de Inspección será OT-I-000360) | Documentado; sin efecto en datos. Se conserva el registro. Las pruebas de la 034 no consumen numeración |
| #63: prueba positiva de recordatorios | Pendiente para el 2026-11-13 (sin recordatorios activos antes) |
