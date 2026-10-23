# 🔄 Active Handoff — Valpo Verde Backend

> **Este archivo es un documento de relevo operativo y contexto para agentes. No constituye fuente metodológica. Ante contradicción, prevalecen las fuentes vigentes definidas por PR-002 y docs/workflow.md.**
>
> Fuentes que prevalecen sobre este archivo: Excel metodológico (DICCIONARIO_CAMPOS y demás hojas del paquete), `docs/project-rules.md`, `docs/architecture-decisions.md` (ADR), `docs/methodology/`, `docs/registro-cambios.md` y `docs/workflow.md`. Si algo de este archivo las contradice, el agente debe detenerse y consultar esas fuentes.
>
> Memoria de trabajo compartida entre agentes (**Claude Code**, **AGY / Gemini**, **Warp AI / GPT**). Cada agente la actualiza al terminar su turno; el siguiente la lee al arrancar.

---

## 📌 Metadatos del Relevo
- **Última actualización:** 2026-10-22 (Fase 6 — backend/API — en curso en `feature/fase6-backend-api`; issue #56 en revisión; Fase 5 cerrada y fusionada en `main`, PR #71)
- **Agente emisor:** Claude Code
- **Agente receptor sugerido:** Claude Code
- **Base documental oficial:** `main` (decisión K1, 2026-10-11). Backend `main` = `a87292a` (PR #71 fusionado: cierre documental de la Fase 5, sobre `3a5be8b`/PR #68 y `874c938`/PR #70); frontend `main` = `187a90d` (PR #5). Fase 6 en la rama `feature/fase6-backend-api` (sin PR todavía).
- **Ramas de trabajo:** `feature/fase6-backend-api` (backend/API, en curso, ver la novedad del 2026-10-22 más abajo). `feature/demo-sivu` en ambos repos (+1 commit sobre `main`: `601e9d6` backend / `8956d6f` frontend, fechas en hora de Chile, `GET /api/species`, optimizaciones de mapa y consultas). **K4 verificado por la autora el 2026-10-20** (P1–P5 y P7 OK; P6 con falla parcial ya existente en `main`, PA-43; fluidez de P3–P4, PA-44); fusionado en `main` (PR #23 backend, #9 frontend). Documentación postauditoría en `docs/postauditoria-2026-10` (worktree `../valpo-verde-backend-docs`).
- **Rutas:** `C:\Users\usuario\code\valpo-verde-backend` y `C:\Users\usuario\code\valpo-verde-frontend`
- **Resumen:** Fase 4 y 5 cerradas y fusionadas en `main` (PR #71 cierra la documentación de la Fase 5; issues #47–#52 cerrados, #53 abierto para la Fase 6). `valpo-verde-conecta` **sigue sin tocar** (issue #45, Fase 8). Fase 6 (backend/API) en curso en `feature/fase6-backend-api`: `.gitignore`/ADR-017/018a (#54 Zod + #55 autorización) ya revisados; issue #56 (proyectos+sector, miembros, estado) implementado, en revisión antes de pasar a #57.

> La línea **Resumen** se muestra en la barra de estado de Claude Code. Mantenerla en una sola línea corta y actualizarla en cada relevo.

---

## ▶ Novedad 2026-10-22 — Fase 6 (backend/API): issue #56 implementado, en revisión

- **Rama `feature/fase6-backend-api`** (desde `main` en `874c938`, Fase 5 fusionada). Plan de la Fase 6 aprobado por la responsable (9 puntos: fuentes, convivencia con la demo, endpoints por flujo, Zod, autorización, seguridad, contrato API, pruebas, orden de trabajo en bloques). Avance por bloque:
  - **Punto 0 + #54 (Zod) + #55 (autorización):** `.gitignore` con `.env.*`; ADR-017 (node-postgres para flujos transaccionales); 018a propuesta (sin aplicar: `trees.qr_token`); esquemas `src/schemas/sivu/*` (común, proyectos, árboles); `assertProjectRole` en `authorization.service.ts`. Revisado y aprobado por la responsable.
  - **#56 (proyectos, miembros, estado del proyecto), implementado:**
    - `coordenadaUtm` (débil, solo `> 0`) se dividió en `coordenadaUtmEste` (166000–834000 m) / `coordenadaUtmNorte` (0–10000000 m), con tests de rango (`common.schema.ts`, `arboles.schema.ts`).
    - **ADR-017 revisado a v1.1:** "crear proyecto + sector" se sacó de los flujos que necesitan `node-postgres` — no tiene el motor de reglas en medio, así que una función Postgres `SECURITY DEFINER` (`fn_create_project_with_sector`, invocada una sola vez vía `supabase-js` con `service_role`) ya es una transacción atómica. Quedan solo dos flujos en ADR-017: completar OT y anular inspección. El rol de Postgres dedicado para esos dos sigue pendiente, **antes del issue #60** (no se necesitaba para #56).
    - **Migración 018b** (propuesta, sin aplicar en ninguna base — mostrar antes de aplicar en pruebas): retira `projects.institution_name`/`.responsible_professional` (brecha encontrada: PR-005 v4.0 ya decía eliminarlas, la 012 nunca lo ejecutó); agrega `fn_build_sector_geometria` (valida D-265: superficie válida y no vacía, sin puntos ni líneas, huecos conservados, unión sin duplicar solapes, MultiPolygon, SRID 4326, rango lon/lat genérico, nunca `ST_MakeValid`), `fn_create_project_with_sector` y `fn_update_sector_geometria` (ambas `SECURITY DEFINER`, solo `service_role` — no repiten el patrón de `fn_create_tree_with_measurement`: la autorización ya ocurrió en el backend antes de invocarlas).
    - KMZ: se resuelve en Node (desempaquetado del ZIP con `yauzl`, límites explícitos de entradas y tamaño descomprimido contra bombas ZIP) y se entrega a Postgres como texto KML crudo — PostGIS (`ST_GeomFromKML`) hace el parseo geométrico, no una librería de Node (`src/services/sivu/geometriaSector.service.ts`). `express.json` subido a 8mb (antes 100kb, el default).
    - Nuevo stack `src/{repositories,services,controllers,routes}/sivu/project*.ts`, montado en `/api/sivu` (`src/routes/index.ts`, una sola línea nueva). Miembros: lecturas reutilizan `findMembership`/`listMembersByProject` de la demo (mismo criterio que `authorization.service.ts`: lecturas con el JWT del usuario); altas/bajas son nuevas (`service_role`, CC-033 ya no deja ninguna policy de escritura para `authenticated`). `removeProyectoMember` llama a `invalidateMembership` tras borrar.
    - Cierre/reapertura (D-275, CC-042): el bloqueo de escritura en proyecto cerrado ya lo hacen los triggers de la migración 017 (`trg_projects_self_closed`, `trg_sectors_proyecto_cerrado`) — no se duplicó esa lógica en Node, solo se traduce el error a 409.
    - Tests nuevos: `tests/schemas/sivu/common.schema.test.ts`, ampliación de `arboles.schema.test.ts`, `tests/services/sivu/project.service.test.ts`, `tests/services/sivu/projectMember.service.test.ts`. `npm test`: 784/784. `npx tsc --noEmit`: sin errores. **Sin tests de integración (supertest) para `/api/sivu` todavía** — solo esquemas y servicios con repositorios mockeados.
  - **Cierre del #56 (correcciones de la 018b tras las pruebas de la responsable):** extracción del KML por xpath, validación por superficie antes de unir, `ST_Force2D`; vista previa `POST /api/sivu/projects/sector-preview` (cada elemento con índice y estado `valida`/`invalida`/`excluida`); `indicesSeleccionados` obligatorio si el archivo trae más de una superficie; una inválida o un punto/línea nunca se pueden seleccionar; todo rechazo de geometría con SQLSTATE `SV265` → 422 (400 solo para errores de forma de Zod); `PATCH /api/sivu/projects/:id` responde 200 con `{ superficiesExcluidas }`. Decisiones aprobadas por la responsable el 2026-10-22, **a registrar como CC-047**. Pruebas SQL en `database/fase6/pruebas_018b_sector.sql` (P1–P8, R1–R3).
  - **Árbol dentro del sector: decidido (CC-046, aprobado el 2026-10-22, a registrar).** Se implementa en una migración nueva 018c (alta del #57 y `fn_update_sector_geometria`), que se muestra antes de aplicar.
  - **Sigue #57** (alta municipal mínima del árbol) tras la revisión de #56.

---

## ▶ Novedad 2026-10-22 — Fase 5 (motor de reglas) cerrada y fusionada (PR #70, `874c938`; cierre documental PR #71, `a87292a`)

- **Motor completo en `src/services/rules/engine/`** (catálogos PR-021, `dominio.ts`, variables derivadas, R01–R04, M01–M05, `reglaId` por indicador, fechas sugeridas, ensamblaje `ensamblarResultadoEvaluacion`/`ensamblarResultadoVigente`), con `rule_version = "2.1"`. Puro: sin endpoints, sin tocar ninguna base. `treeRisk.ts` **no se tocó** — sigue en uso por la demo contra `valpo-verde-conecta` hasta que la Fase 6/8 lo reemplace.
- **CC-043 `APROBADO METODOLÓGICAMENTE` (2026-10-22):** M04/IN-RAE — si `tipo_red_aerea` incluye "Función no determinada" y no incluye "Eléctrica", el componente red aérea queda `no_determinado` (se excluye de M04, D-180); si incluye "Eléctrica", se aplican IN-RAE-02 a 04 igual.
- **CC-044 `APROBADO METODOLÓGICAMENTE` (2026-10-22):** el Inspector puede ajustar una clasificación (`clasificacion_riesgo`, `_infraestructura`, `_prioridad`) cuyo valor calculado es `No determinado`/`No aplica`, con justificación obligatoria; la regla de descarte de CC-040 (d) aplica igual en el siguiente recálculo. Lo que nunca es válido es que el **valor ajustado** mismo sea `No determinado`/`No aplica`.
- **CC-045 `APROBADO METODOLÓGICAMENTE` (2026-10-22):** cierra los dos bloqueos del ensamblaje. **(a)** ajustes ante una `inspeccion_anulada`: se recompone la vigente como si esa inspección nunca hubiera existido; sus ajustes nunca aplican; los de inspecciones válidas anteriores se reevalúan con la regla normal de CC-040 (d). **(b)** `nivel_riesgo = no_determinado`: las fechas sugeridas usan los rangos de Extremo como criterio de precaución, con motivo.
- Las tres fichas completas en `docs/registro-cambios.md`. **Pendiente (AM-15, roadmap):** llevar CC-043/044/045 al Excel y publicar el paquete 2.2.0.
- **Próximos libres:** CC-046, ADR-017, PR-023.
- **Discrepancia encontrada contra el plan aprobado de la Fase 5 (resuelta con el esquema real, no en silencio):** `fecha_proxima_inspeccion(_sugerida)` y `fecha_proximo_monitoreo(_sugerida)` son columnas de `inspections`, no de `evaluations` (migración 014); `nivel_riesgo` no se guarda nunca (principio §1.5, se deriva con `v_inspections`). `ensamblarResultadoEvaluacion` las devuelve aparte, en `inspeccion: {...}`, con el comentario de a qué tabla va cada una — no se mezclan en el INSERT de `evaluations`.
- **Issues:** #47–#52 cerrados (los 6 bloques de la Fase 5). **#53 sigue abierto**, para la Fase 6: la composición real de valores vigentes desde `v_tree_current_inputs` (qué inspección aportó cada campo) no es trabajo del motor puro.
- **Siguiente: Fase 6 (backend/API).** En planificación — ver la próxima novedad si ya hay un plan mostrado para revisión.

---

## ▶ Novedad 2026-10-21 — Fase 4: migraciones 012–017 completas (leer primero)

- **Protocolo de 9 fases:** van 4 cerradas (0 a 3); Fase 4 (base de datos) con sus 6 migraciones (012–017) escritas, aplicadas y probadas en `valpo-verde-conecta-pruebas`, en la rama `feature/fase4-migraciones-012-017` del backend. **Falta abrir el PR** (con el script de limpieza, las 6 migraciones + `.down.sql` y `schema.sql`) y la revisión/aprobación de la responsable antes de fusionar o de pasar a `valpo-verde-conecta` (issue #45, Fase 8).
- **Paso 0 (#36) y paso 1 (#37), hechos:** respaldo de `valpo-verde-conecta` (`C:\Users\usuario\respaldos\sivu\2026-10-21\`); `valpo-verde-conecta-pruebas` reactivada; limpieza de los datos simulados (`database/fase4/00_limpieza_datos_simulados.sql`), solo en pruebas.
- **012 (#38):** roles `inspector`/`encargado_mantencion`; `user_profiles.codigo_usuario`; `projects.name`→`nombre_proyecto` y `.status`→`estado_proyecto`; `species` adaptada (CC-039). Corregida una vez (LPAD/setval y el rename de `name` que faltaba).
- **013 (#39):** `sectors`, `trees` con identidad + valores vigentes, `tree_data_versions`. Corregida una vez (snake_case en `clase_edad`, FK de coherencia proyecto↔sector, CHECK del Excel).
- **014 (#40):** `work_orders`, `inspections` reutilizada (`estado_registro`), `evaluations`, `classification_adjustments`, `tree_assessments`, `maintenance_records`, `fn_refresh_tree_current`. Corregida una vez (`CASE WHEN EXISTS` en vez de `COALESCE` para no perder un "No presenta" explícito; `probabilidad_falla_*` en snake_case con `no_determinado`; triggers de coherencia OT↔inspección↔evaluación↔mantenimiento).
- **015 (#41):** `incidents` adaptada, `incident_reporters`, `photos` adaptada.
- **016 (#42):** las 6 vistas (`v_tree_presence`, `v_inspections`, `v_tree_current_inputs`, `v_tree_current_assessment`, `v_species_traits`, `v_upcoming_inspections`).
- **017 (#43), hecha pero PENDIENTE DE REVISIÓN antes de cerrar el issue:** RLS por rol (CC-033: solo SELECT, ninguna escritura para ningún rol, incluido admin); `has_project_role`; `incident_reporters` solo `usuario_municipal` (PR-022); GRANT/REVOKE de tabla/secuencia/función (anon sin SELECT en nada; `fn_refresh_tree_current` y `fn_create_tree_with_measurement` sin EXECUTE para anon/authenticated — **esto deja sin función el alta de árbol actual hasta que la Fase 6 la reescriba con `service_role`**, solo en pruebas por ahora); trigger de proyecto cerrado (RG fila 27; CC-042) en 12 tablas + la propia fila de `projects` (bloquea todo salvo el cambio de `estado_proyecto`); `security_invoker = true` en las 6 vistas. W1–W29 (29/29 con el resultado esperado) documentados en `docs/auditorias/2026-10-postauditoria/escenarios-rls.md`.
- **017b (misma rama, mismo issue #43):** endurecimiento adicional tras correr el asesor de seguridad — `search_path` fijo en `set_updated_at` y `fn_next_codigo_usuario`; `REFERENCES`/`TRIGGER` revocados de `anon`/`authenticated` en las 30 tablas y 6 vistas de `public` (quedan solo con lo que la 017 ya les dejaba: nada a `anon`, SELECT a `authenticated`). `st_estimatedextent` (PostGIS, 3 firmas): **intentado, sin efecto** — pertenece a `supabase_admin`, igual que `spatial_ref_sys` (issue #9/migración 010); el `REVOKE` no da error pero no cambia el `proacl`, verificado antes y después. Avisos aceptados del asesor, con motivo, en `escenarios-rls.md`.
- **Protección de contraseñas filtradas (HaveIBeenPwned): limitación aceptada** (PA-39, issue #9). **No está disponible en el plan gratuito de Supabase — Supabase rechaza el cambio.** Igual en `valpo-verde-conecta` y `valpo-verde-conecta-pruebas`. Mitigación verificada por la responsable en el panel el 2026-10-21, idéntica en ambas bases: longitud mínima **12 caracteres**; **letras, dígitos y símbolos, con mayúsculas y minúsculas** (los cuatro tipos obligatorios); **contraseña actual obligatoria para cambiarla**. Pendiente para producción (ADR-013): plan **Pro** de Supabase, con la protección activada. El aviso `auth_leaked_password_protection` del asesor de seguridad queda aceptado con este motivo.
- **CRÍTICO — alcance de 012 a 017b:** se aplican y prueban únicamente en `valpo-verde-conecta-pruebas`. `valpo-verde-conecta` (la base con la demo/dev actual) **no se toca** hasta el issue #45, que requiere aprobación expresa de la autora.
- **Historial de migraciones de Supabase:** en `valpo-verde-conecta-pruebas` hay 2 entradas antiguas (`demo_valpo_verde_schema`, `demo_real_data_schema_v2`) que no corresponden a 001–011 (la estructura llegó por `pg_restore`, no por replay). No se editaron a mano. Si hace falta reconciliar esas 2 entradas, se propone antes de tocarlas.
- **Cierre (2026-10-22):** PR #68 fusionado en `main` (`3a5be8b`); issue #43 cerrado con el resumen de la 017+017b, W1–W29 y los avisos del asesor de seguridad. **Fase 4 queda cerrada.** Pendientes explícitamente diferidos, cada uno con autorización aparte: migración 018 (retiro de las tablas del modelo 001 sin política, hoy en `rls_enabled_no_policy`) y el seed de datos de desarrollo sobre el modelo nuevo. Ver la novedad del 2026-10-22 para la Fase 5.

## ▶ Novedad 2026-10-22 — Fase 4 cerrada y fusionada; Fase 5 (motor de reglas) en curso

- **Fase 4 cerrada:** PR #68 fusionado en `main` (`3a5be8b`); issue #43 cerrado. `valpo-verde-conecta` sigue sin tocar (issue #45, Fase 8). **Pendientes diferidos, con autorización aparte:** migración 018 (retiro de las tablas del modelo 001 que hoy quedan con RLS habilitada y sin política) y el seed de datos de desarrollo sobre el modelo nuevo (012–017b) — ninguno de los dos se ha empezado.
- **Fase 5 (motor de reglas), rama `feature/fase5-motor-reglas` desde `feature/fase4-migraciones-012-017` (antes de que se fusionara el PR #68; verificado que la rama queda limpia respecto de `main` tras la fusión — solo los commits propios del motor por encima de `main`).** Plan aprobado por la responsable (fuente: solo el Excel 2.1.0; módulo nuevo en `src/services/rules/engine/`, separado de `treeRisk.ts`, que no se toca). Avance:
  - `catalogs.ts` (PR-021): registro de catálogos y códigos persistentes, con test que compara las etiquetas contra los CSV exportados del Excel.
  - `variables-calculo.ts`: SL_basal_pct/SL_tronco_pct, R_radio_basal_cm/R_radio_tronco_cm y t_R_basal/t_R_tronco (D-56/58/59, D-68/70/71) calculados desde las mediciones crudas — nunca aceptados como entrada. "No calculable" (dato faltante, condición violada, NaN/Infinity) nunca se trata como 0; se propaga como `no_determinado` con motivo.
  - `r01-raices-cuello.ts` y `r02-tronco.ts` completos: todas las reglas RC-*/TR-* de REGLAS_INDICADORES, con sus tramos de puntaje. El motor nunca rellena, supone ni sustituye un dato: cada campo obligatorio o condicional sin valor, fuera de rango (p. ej. `angulo_inclinacion` fuera de 0°–90°, D-47), o con una combinación imposible (D-51), termina en `no_determinado` con motivo explícito.
  - 186 tests nuevos sobre el motor (uno por regla, límites exactos de cada tramo, un caso por campo faltante, la fórmula D-56 verificada a mano). `npm test`: 334/334. `npx tsc --noEmit`: sin errores.
  - **Sigue R03** (copa y ramas), después R04/M01–M03, M04/M05 y las fechas sugeridas D-212/D-213. Sin endpoints ni cambios de API (Fase 6). Nada aplicado a ninguna base.

## ▶ Novedad 2026-10-21 — Fase 3 cerrada; publicación de 2.1.0 preparada

- **Fase 3 (diseño del modelo de datos) cerrada en contenido.** PR #31 (propuesta de diseño, `docs/diseno/fase3-modelo-datos-2.0.0.md`) y PR #33 (AM-12: textos de CC-040 en el Excel) fusionados por la autora en `main` (`34d8e99`). Del protocolo de 9 fases (0 a 8) van 4 cerradas.
- **CC-040** (alcance de la evaluación según el tipo de inspección, evaluación vigente compuesta por campo, fotografías por tipo de inspección) y **CC-042** (`estado_proyecto` Activo/Cerrado) pasan a `FUENTE SINCRONIZADA` — paquete **2.1.0**, publicada el 2026-10-21. CC-041 (decisiones de diseño sin impacto en el Excel) queda `APROBADO METODOLÓGICAMENTE`, fuera del paquete.
- **Verificación §14.9** sobre el Excel de `main` (incluye AM-12): **0 hallazgos** automáticos (`scripts/metodologia/verificar_14_9.py`). `docs/methodology/00-index.md` actualizado con la fecha y el tag previsto.
- **Pendiente de otra sesión:** VERSION fila 6 del Excel (estado "publicada", `fecha_publicacion`, `aprobado_por`, `fecha_aprobacion`) y el tag `metodologia-v2.1.0` — a cargo de la sesión de auditoría en un PR aparte, como el PR #30 de 2.0.0. **No se tocó el Excel en este PR.**
- **No fusionar sin aprobación expresa de la autora.**
- **Después de publicar 2.1.0:** Fase 4 (base de datos — migraciones, schema.sql, RLS en la base de prueba), que empieza solo con la aprobación de la autora del respaldo y la reactivación de la base de prueba de Supabase. Fases 5 (motor de reglas), 6 (backend/API) y 7 (frontend) a cargo de otra sesión/colega; Fase 8 (verificación y cierre) al final.

## ▶ Novedad 2026-10-20 — AM-08, publicación de 2.0.0

- **Estado:** **2.0.0 publicada el 2026-10-20** con aprobación expresa de la autora (VERSION fila 5, PR #30; PR #27). El tag `metodologia-v2.0.0` se crea sobre el commit de `main` que fusiona el PR #27. Verificación §14.9 sobre el Excel de `main` con AM-10 (PR #28): **0 hallazgos** automáticos (`scripts/metodologia/verificar_14_9.py`) y revisión manual de activaciones y cobertura. Export de texto en `docs/excel/export/` (solo hojas del paquete).
- **Fichas en `FUENTE SINCRONIZADA`:** CC-024, CC-026 a CC-032, CC-034 a CC-037 y CC-039 (las de la fila 5 de VERSION).
- **No publicar sin aprobación expresa de la autora.** Al aprobar: la autora completa VERSION (fila 5); se reemplaza `[FECHA DE PUBLICACIÓN]` en `00-index.md` y `01–05`; se crea el tag `metodologia-v2.0.0`.
- **Después:** respaldo de la base y prueba de restauración (obligatorios) y Fase 3 (diseño del modelo, incluido CC-039).

## ▶ Novedad 2026-10-20 — Implementación de CC-026 a CC-029, Fase 2

La autora conduce la actualización del backend y el frontend con un protocolo por fases (0 reconocimiento · 1 decisiones · 2 documentación · 3 diseño del modelo · 4 base de datos · 5 motor · 6 backend · 7 frontend · 8 verificación). **No se avanza de fase sin su aprobación.**

- **Fases 0 y 1 cerradas** (2026-10-20). `main` incluye la rama de la demo (K4 verificado; PR #23 backend y #9 frontend).
- **Fase 2 (esta rama, `docs/fase2-am07-decisiones`), solo documentación:** CC-030 a CC-038 registrados; PR-002 v3.0, PR-006 v9.0, PR-009 v4.0, PR-010 v3.0, PR-018 v3.0, PR-019 v1.1, PR-020 v1.1, PR-021 v1.0 (catálogos), PR-022 v1.0 (incidencias ciudadanas); ADR-010 v3.0 (UTM canónica), ADR-014 v2.0 (escrituras solo por el backend), ADR-016 v3.0; `workflow.md` §14.12 sin efecto (CC-035); CC-008, CC-009 y CC-020 reemplazados; AM-07 resuelto.
- **Bloqueo principal:** toda implementación espera la publicación de 2.0.0 (CC-030, CC-035 → AM-08), que requiere el Excel actualizado (AM-10) y la aprobación explícita de la autora.
- **Respuestas de la Fase 2 aplicadas (2026-10-20):** diagramas fuera del paquete (CC-030, opción B); nueva inspección en la misma OT si no está completada (CC-031); mapa del alta como ayuda para UTM (CC-032); nombre y RUT se eliminan con Validada o Descartada y "Requiere antecedentes" se resuelve con una OT de Inspección vinculada por `id_incidencia` (CC-036); todo dato actual es simulado y la limpieza aplica solo a las bases de prueba, con autorización (CC-038). Siguiente: la autora fusiona el PR #24 y actualiza el Excel (AM-10); luego AM-08 (publicar 2.0.0) y la Fase 3.
- **Hallazgo:** las migraciones 008 y 009 no cargan datos; los datos simulados entraron por script o por la aplicación (CC-038).
- **CC-039 `APROBADO METODOLÓGICAMENTE` (2026-10-20):** `origen_biogeografico` pasa de ARBOLES a CATALOGO_ESPECIES; nuevos `persistencia_follaje` y `tipo_hoja` en el catálogo y `rango_edad_estimada_anios` en ARBOLES (Excel maestro actualizado). AM-11 cerrado (referencia estacional de la defoliación). Edad estimada Opcional; PN y PI fuera de 2.0.0. Sincronización documental: PR-003 v8.0, PR-006 v10.0, PR-019 v1.2, ADR-016 v4.0.
- **Próximos libres:** CC-043, ADR-017, PR-023.

## ▶ Novedad 2026-10-18 — CC-026

- **CC-026 `APROBADO METODOLÓGICAMENTE`** (marybaxmann): auditoría funcional del modelo de datos. Evidencia en `docs/auditorias/2026-10-18-modelo-datos/` (decisiones AMD-01 a AMD-42, pendientes P1–P9 y P15–P16).
- **Prevalece** sobre lo que contradiga: cuatro roles (Administrador, Usuario municipal, Inspector, Encargado de mantención); el Usuario municipal da de alta el árbol solo con nombre y ubicación y no registra datos técnicos; el Inspector registra los datos técnicos mediante OT (incluida la OT de Levantamiento); vigencia por la OT completada más reciente (`fecha_completada_ot`); `estado_registro` Preguardado / Finalizado; revisión de mantenimiento definida por el Usuario municipal y obligatoria en Tala y Retiro_tocón.
- **Nuevas versiones:** PR-003 v7.0, PR-004 v6.0, PR-006 v8.0, PR-008 v2.0 (ajuste justificado de clasificaciones por el Inspector), PR-009 v3.0, PR-010 v2.0, PR-019 v1.0, PR-020 v1.0, ADR-006 v2.0 (cierra C2 en la documentación), ADR-016 v2.0.
- **Decisiones complementarias AMD-31 a AMD-42:** PROYECTOS y MIEMBROS_PROYECTO, INSPECCION, fechas sugeridas de reinspección y monitoreo, `resultado` de mantenimiento en catálogo, Prioridad de OT propuesta desde `clasificacion_prioridad`. Solo quedan sin auditar MATRICES_CALCULO e INDICES.
- **CC-028 `APROBADO METODOLÓGICAMENTE` (2026-10-18):** el Excel auditado es la **única fuente metodológica**. `docs/excel/Base de Datos Valpo Verde.xlsx` (nombre fijo) contiene ahora el Excel auditado más la hoja VERSION; se eliminó la copia con fecha y el contenido anterior queda solo en git. P1–P9 resueltos a favor del Excel auditado (sin MEDICIONES_DENDROMETRICAS ni columna `ambito`). Textos contradichos por actualizar: AM-07.
- **No modificado:** código, Supabase, migraciones, RLS y motor. La implementación de desarrollo (CC-020, CC-022) queda desalineada con CC-026 hasta su implementación (AM-04).
- **CC-027 `APROBADO METODOLÓGICAMENTE`:** el motor (`treeRisk.ts`) difiere del Excel auditado en R03 (máximo 8 con defoliación), etiquetas, cavidades (reglas 09 y 10) y no implementa M04 ni M05. Detalle en `docs/auditorias/2026-10-18-modelo-datos/diferencias-motor.md`. **No modificar el motor sin autorización.**
- **CC-029 `APROBADO METODOLÓGICAMENTE` (2026-10-20):** M05 devuelve `clasificacion_prioridad` = No determinado cuando `clasificacion_riesgo` = No determinado (Excel maestro actualizado).
- **Próximos libres (actualizado 2026-10-20):** CC-043, ADR-017, PR-023.

## ▶ Punto de reanudación (2026-10-11) — leer primero

**Dónde está todo:**
- Auditoría postdemo: `docs/auditorias/2026-10-postauditoria/` (README, informe, hallazgos, contradicciones, decisiones, dependencias, escenarios RLS).
- Registro maestro de pendientes: `docs/roadmap.md`, sección "Postauditoría 2026-10" (PA-01 a PA-44).

**Decisiones de la autora (estado exacto, ver `decisiones.md`):**
- DA-01 escrituras solo por el backend: **APROBADA en principio**; implementación (credencial, permisos, RLS) **no aprobada**.
- DA-02 INSPECCIONES: **PENDIENTE de diseño** (no crear ni modificar tablas).
- DA-03 historial de eventos: **APROBADA en concepto**; esquema SQL **no aprobado**.
- DA-04 transiciones: **PENDIENTE de definición** (no asumir flujos).
- K1–K6 (consolidación): `main` es la base oficial; etiquetas de la demo solo **propuestas**; el commit del 2026-10-11 queda **fuera de `main`**.
- CC-015 (roles): **pendiente**. Modelo conceptual de referencia: Administrador, Usuario municipal, Inspector, Mantenimiento. **No cambiar el modelo actual.**

**Contradicciones prioritarias abiertas (no resolver cambiando motor ni permisos):**
- **C1:** motor de riesgo (`treeRisk.ts`, `rule_version = borrador_reglas_diagramas_v3`) implementado con reglas de borrador, contra PR-011 v2.0 y `methodology/00-index.md`.
- **C2:** ADR-006 v1.1 atribuye la evaluación técnica al administrador, contra CC-022. **Resuelta en la documentación por ADR-006 v2.0 (CC-026, 2026-10-18).**

**CC:** CC-025 registrado (2026-10-16): prototipo visual SIVU Territorio como referencia visual principal (PR-016 v6.0). Próximos libres (actualizado 2026-10-18): CC-028, ADR-017, PR-021. La propuesta para C1 (`decisiones.md` §5, redactada como "CC-025") sigue **sin registrar** y recibirá el número libre al registrarse.

**Prohibido sin autorización expresa:** modificar código, Supabase o migraciones; ejecutar pruebas de escritura (W1–W12 solo en un entorno de pruebas aislado); modificar motor, roles o permisos; borrar ramas, etiquetas o archivos; commit, push, merge o PR. Repos **públicos**: no publicar detalles explotables de S1.

**Siguiente paso esperado:** la autora revisa la rama `docs/postauditoria-2026-10` y autoriza (o no) el commit documental; luego decide PA-01 (C1), PA-03 (CC-015) y PA-13 (entorno de pruebas).

---

## 📋 Planificación post-demo (2026-10-09)
- Tablero GitHub Projects: https://github.com/users/marybaxmann/projects/5 ("SIVU — Planificación", privado). Issues backend #4–#13, frontend #2–#3.
- Backend #4 (RLS en tablas públicas): migración 010 **aplicada**; 011 (CC-022) aplicada. Repos públicos: no publicar detalles explotables en issues.

## 🎨 Diseño del front (2026-10-10)
- Maquetas: v1 https://claude.ai/artifact/BekBCfnJK5maLnRcsL2Fdq · v2 https://claude.ai/artifact/PyDjwKC5vKJbQ5nHfqzZvk (descartada: muy parecida a Groundzy) · **v3** https://claude.ai/artifact/5u7cmUZjtB4xkceKJqtpcD (cartografía + símbolos proporcionales al DAP, módulos arriba, tabla de registros, ficha técnica).
- **2026-10-16 · CC-025:** el prototipo SIVU Territorio (frontend, rama `prototype/sivu-territorio-v1`, `c852104`) es la referencia visual principal (PR-016 v6.0). Es un prototipo nuevo, no la v2 de esta lista.
- **Dirección visual: APROBADA (CC-025). Integración: PENDIENTE**, progresiva y módulo por módulo, cada uno con aprobación de la autora, sin quitar módulos, campos, rutas, funcionalidades ni permisos.
- **Implementado:** diagnóstico por componente en la ficha (`src/components/RiskComponentDiagram.tsx`, usado en `TreeDetailModal`). Silueta genérica provisoria; solo representa `resultado` del backend y destaca el componente cuyo nivel coincide con R04.
- **Pendiente:** silueta general o según especie → frontend issue #4.
- Pines del mapa en gota con color de riesgo (`treePinSymbol` en `InventoryMapView.tsx`); modo claro/oscuro (`useTheme`, botón en el menú lateral). En `main` del frontend (PR #5, `ad1c5e2`).

## 🔎 Auditoría del motor de riesgo (2026-10-10)
- `treeRisk.ts` coincide con REGLAS_INDICADORES v3, rangos R01–R03, M01–M03 y R04; las 4 evaluaciones guardadas se recalcularon y coinciden.
- **Corregido:** la API aceptaba datos condicionales vacíos o fuera de rango y el motor asumía severidades (p. ej. grieta sin afectación → Severa). Ahora `schemas/treeRiskAssessment.schema.ts` los rechaza (400) y el asistente del frontend no deja avanzar. Fecha futura validada con hora de Chile. Tests: 185/185.
- **N13 decidido (CC-024, opción a):** componente "No determinado" → árbol "Sin clasificación", independiente de infraestructura y distinto de "Sin evaluación" (pin blanco en el mapa). Ficha registrada y fusionada en `main` (PR #17, 2026-10-10). Falta sincronizar el Excel (DUDAS N13, DICCIONARIO_CAMPOS). N21 sigue pendiente.

## 🕘 Fechas y arquitectura frontend (2026-10-11)
- **Regla aprobada:** toda fecha "de hoy" y toda fecha mostrada usan **hora de Chile (`America/Santiago`)**. Nunca `toISOString().slice(0,10)` ni `created_at.slice(0,10)` (dan el día UTC: desde las 21:00, o 20:00 en invierno, ya es el día siguiente). Backend: `src/utils/fechaChile.ts` (`hoyEnChile`); frontend: `src/lib/dates.ts` (`hoyChile`, `fechaChile`, `fechaHoraChile`).
- **Backend:** `GET /api/species` (issue #8); el resumen de riesgo del proyecto filtra por proyecto en la BD (`trees!inner`) y no trae `variables`. Tests 195/195.
- **Frontend:** el mapa filtra con `layerView.filter` (no reconstruye la capa); las sincronizaciones de la capa son secuenciales (sin pines duplicados); el panel no repite la última evaluación; detalle/historial por árbol en caché; menú lateral sigue el tipo de pantalla; `src/lib/risk.ts` comparte el índice de riesgo.
- **Pendiente:** separar Inspección e Infraestructura de `ModulePage.tsx` (hacerlo con verificación en navegador); P4d (caché global se vacía en cada escritura) y P4e (relectura completa tras editar un árbol) se mantienen por ahora. Sin verificación en navegador de estos cambios.

---

## 🚀 SESIÓN "SIVU DEMO FUNCIONAL" (2026-10-06) — leer esto primero

**Contexto:** la investigadora tiene su tesis en ~2 días. Se trabajó en modo "avance visible rápido, sin romper lo que ya funciona", con auditorías metodológicas puntuales solo cuando una regla concreta lo exigía (no auditorías generales). **Nada se commiteó**; todo sigue en working tree.

### Qué funciona end-to-end (probado manualmente por la investigadora)
Usuario Municipal → Inventario → registrar árbol → aparece en mapa/listado → Inspección → Nueva evaluación → formulario de 6 pasos → cálculo real de riesgo en backend → guardar → ficha del árbol muestra el resultado → Admin puede consultar el mismo resultado.

### Backend — cambios sin commit
- **Migración `007_tree_risk_assessment.sql`** (ya aplicada en Supabase vía MCP): tabla `tree_risk_assessments` (1:N con `trees`, igual patrón que `tree_measurements`), RLS igual a `trees` (admin ALL, usuario_municipal según `is_municipal_member`), sin UPDATE/DELETE para usuario_municipal.
- **`src/services/rules/treeRisk.ts`**: motor de cálculo R01 (raíces/cuello, máx. 9), R02 (tronco, máx. **14**), R03 (copa/ramas, máx. **5**), R04 (consolidación = el más desfavorable entre clasificaciones M02+M03 por componente), M01 (probabilidad de impacto), M02+M03 (matrices → Bajo/Moderado/Alto/Extremo). Fuente: `borrador_reglas_diagramas_v3.xlsx` (hojas REGLAS_INDICADORES, CHEQUEO_PUNTAJES) + `docs/excel/Base de Datos Valpo Verde.xlsx` (MATRICES_CALCULO, DICCIONARIO_CAMPOS, LISTAS), verificadas celda por celda. **Importante:** `docs/methodology/*.md` y `docs/project-rules.md` están DESACTUALIZADOS frente a estos Excel (dicen R02 máx. 18 y R03 máx. 9 — están mal; el código usa los valores correctos 14 y 5, confirmados por DICCIONARIO_CAMPOS). Sincronizar la documentación queda **pendiente POST-DEMO**, no se tocó.
- **20 tests nuevos** en `tests/services/rules/treeRisk.test.ts` (casos sano/peor caso/límites/"No determinado"). Total: **140/140 tests pasando**.
- Nuevos endpoints: `POST/GET /api/trees/:treeId/risk-assessments`, `GET /api/trees/:treeId/risk-assessments/latest`, `GET /api/projects/:id/risk-assessments/latest` (resumen de todo el proyecto en una sola consulta, para colorear el mapa sin N+1). También `PATCH /api/trees/:treeId` (editar especie/dirección/comuna/referencia — nunca ubicación ni medición).
- **DAP equivalente (polifuste): NO implementado.** No existe fórmula aprobada en ningún Excel ni documento — se dejó explícitamente pendiente, con nota visible en el formulario.
- Catálogo de especies sigue consultando Supabase directo (`src/api/trees.ts` en frontend) porque no hay endpoint backend — gap conocido, documentado, sin fallback ficticio.

### Frontend — cambios sin commit
- Rediseño territorial-analítico completo de Inventario/Dashboard (referencia: `docs/referencias/visuales/03_CityDashboardsButton.jpg`), mapa con Valparaíso como vista por defecto, guard contra zoom continental, zoom a selección, sincronización incremental del mapa (sin recrear ArcGIS en cada cambio).
- Combobox buscable de especies, flujo de edición de árbol (`EditTreeModal`), Capa 0 real para Inspección e Infraestructura (`ModulePage.tsx`, con mapa), Mantención e Incidencias separadas en pantallas propias SIN mapa (`MaintenancePage.tsx`, `IncidentsPage.tsx`).
- **Evaluación de riesgo completa**: `RiskAssessmentModal.tsx` (formulario de 6 pasos), integrado en Inspección, en el panel contextual del árbol y en la ficha técnica. Mapa coloreado por nivel de riesgo (colores oficiales) + leyenda + filtro por riesgo en Inventario. Dashboard con tarjetas de riesgo reales.

### Iteración "flujo visible demo" (2026-10-06, Claude Code) — solo frontend, sin commit
- `CreateTreeModal`: lat/lon parten vacías (antes se prellenaban con el encuadre -33.045/-71.620 → árboles apilados). Obliga a "Marcar en mapa SIG".
- Ficha (`TreeDetailModal`): franja resumen (árbol/ubicación/dimensiones/última evaluación/nivel de riesgo), clasificación por componente, historial siempre visible si >1, acciones en pie [Volver al mapa] [Editar árbol] [Nueva evaluación].
- Inventario: badge de riesgo por fila, distribución por riesgo en el panel de resumen, filtros se limpian al registrar árbol, panel contextual con riesgo en cabecera y acciones [Ver ficha] [Editar] [Evaluar], sincronizado si se evalúa desde la ficha.
- Inspección (`ModulePage`): filtro Todos/Evaluados/Sin evaluar (listado + mapa), historial completo del árbol seleccionado en el panel, "Ver árbol →", "← Volver al listado".
- Infraestructura: sin textos "Módulo aún no habilitado"; árboles reales + mapa + selección + ficha; estado vacío "Aún no existen evaluaciones de infraestructura…"; acción deshabilitada "Disponible en próxima etapa". No hay entidad backend → sin cifras.
- Mantención/Incidencias: nuevo `ManagementModule.tsx` compartido (flujo del proceso, resumen "—", buscador/filtros deshabilitados, tabla con estado vacío, acción deshabilitada). Sin datos inventados.
- Dashboard: distribución por riesgo, accesos a los 5 módulos sin cifras inventadas. `ProjectsList` → "Entrar al proyecto" va al Dashboard. `ProjectDetail` con accesos a todos los módulos.
- Datos: Proyecto Valparaíso = 3 árboles (A-000010 Moderado con 4 evaluaciones —2 con `test:true`—; A-000011 y A-000012 sin evaluar). A-000010/11 en el punto por defecto, A-000012 con latitud positiva (+33.046). **La investigadora pidió NO modificarlos** (pendiente post-demo).
- Validación: `tsc -b` + `npm run build` OK. Backend sin cambios (140/140). Sin revisión visual en navegador (Claude in Chrome no conectado) — la hace la investigadora.
- **Ronda 2 (tras revisión visual de la investigadora):**
  - Jerarquía: `RoleLayout.tsx` común a admin/usuario (los layouts quedan como wrappers). Fuera de proyecto el sidebar solo muestra "Mis proyectos"; dentro, solo los 6 módulos ("Inspección y Riesgo" con nombre completo). Pie del rail: bloque PROYECTO ACTUAL (+ "Cambiar proyecto") y bloque USUARIO (+ "Salir").
  - `hooks/useCurrentProject.tsx`: el layout carga el proyecto una vez (GET /api/projects/:id) y lo comparte; Mantención/Incidencias ya no hacen peticiones propias.
  - `ProjectsList` → pantalla "Mis proyectos" (tarjetas; admin conserva "Crear proyecto" y "Configurar").
  - **Error "Token inválido o expirado"**: no era exclusivo de Incidencias. `getSession()` puede devolver un access_token vencido si el auto-refresh de supabase-js no corrió (pestaña en segundo plano/suspensión). `src/api/client.ts` ahora, ante 401, hace `refreshSession()` y reintenta una vez; si falla, muestra "Tu sesión expiró. Vuelve a iniciar sesión para continuar."
  - Dashboard: CTA de tarjetas = "Ver módulo →". Inventario: "Cambiar proyecto" (antes "Cambiar Territorio").
- **Ronda 3 (pulido visual):** sistema TABLA SIVU (`components/SivuTable.tsx` + `.sivu-table*` en global.css; `.table` no tenía estilos → encabezados "flotando"). Aplicado a Mantención, Incidencias (anchos por columna, estado vacío dentro de la tabla), historial dendrométrico y de evaluaciones de la ficha, miembros del proyecto. `.content` centrado y más ancho. Infraestructura: bloque "Evaluación de infraestructura" + riesgo actual real del árbol. Panel contextual: consecuencias. Dashboard: tarjetas de módulo de altura uniforme. Solo frontend, sin commit.

### Sprint "módulos mínimos" (2026-10-06, Claude Code) — sin commit
- **Migración 008 APLICADA** (`008_demo_infra_maintenance_incidents.sql`, solo aditiva): tabla nueva `tree_infrastructure_assessments` (datos crudos por componente, claves DICCIONARIO_CAMPOS, sin severidad/M04; RLS patrón 007); `maintenance` + columnas nullable `subtipo_accion`, `created_by` y **RLS habilitada** (antes estaba desactivada) con políticas patrón 007; `incidents` sin cambios (RLS ya existía). `created_by DEFAULT auth.uid()` + check en INSERT municipal.
- Backend: `services/rules/moduleCatalogs.ts` (LISTAS accion/subtipo_accion CC-004 + dominios DICCIONARIO de infraestructura), `schemas/moduleRecords.schema.ts`, `repositories/moduleRecords.repository.ts`, `services/moduleRecords.service.ts`, `controllers/moduleRecords.controller.ts`. Endpoints: `GET /api/catalogs/modules`; `POST/GET /api/trees/:treeId/infrastructure-assessments`; `GET /api/projects/:id/infrastructure-assessments`; `GET/POST /api/projects/:id/maintenance`; `GET/POST /api/projects/:id/incidents`. 140/140 tests (sin tests nuevos para estos endpoints — pendiente post-demo).
- Frontend: Infraestructura con formulario + resumen ("Clasificación global pendiente") e historial; Mantención (orden de trabajo: árbol, acción, subtipo, fecha, responsable, observación; estado = default 'pendiente') e Incidencias (árbol opcional, tipo y origen texto libre sin catálogo vigente) con tabla real; ficha con sección 5 "Gestión del ejemplar"; panel contextual con accesos; Dashboard con conteos reales. Navegación contextual por `?arbol=<id>&nuevo=1`.
- RLS verificada con transacción simulada como usuario municipal + ROLLBACK (0 filas residuales).

### Sprint "módulos básicos + Índices" (2026-10-06, Claude Code) — sin commit
- **Migración 009 APLICADA** (aditiva): `maintenance.codigo_ot` ('OT-M-000001') e `incidents.codigo_incidencia` ('INC-000001') con secuencias + índices únicos (formato del Excel maestro). Sin cambios de RLS.
- Estados según listas de validación del Excel: estado_ot = Pendiente/Programada/En ejecución/Completada/Cancelada; estado_incidencia = Ingresada/En revisión/Derivada/Resuelta/Descartada. Sin transiciones impuestas (la fuente no las define). Incidencias nuevas nacen 'ingresada'.
- `PATCH /api/projects/:id/maintenance/:recordId/estado` y `/incidents/:recordId/estado` → **solo admin** (assertAdmin + RLS sin UPDATE municipal; PR-003 v5.0 y 005).
- `GET /api/projects/:id/indices`: agregados descriptivos (conteos, especies, min/prom/máx de la medición vigente; polifuste sin DAP). **No se calculan índices de la hoja INDICES (CC-016: "no implementable ni normativa vigente")**; la pantalla Índices lista cada uno con su motivo.
- Corregido: listados de módulos/índices omitían árboles sin ubicación (`listAllProjectTreeRowsForUser`).
- Tests: `tests/integration/moduleRecords.routes.test.ts` (18). Total 158/158.
- **⚠️ DECISIÓN PENDIENTE DE LA INVESTIGADORA — conflicto con PR-003 v5.0:** el Usuario municipal "no realiza evaluación técnica ni evaluación de riesgo" y solo "consulta mantenimiento", pero la RLS actual le permite INSERT en `tree_risk_assessments` (007), `tree_infrastructure_assessments` y `maintenance` (008). No se revocó nada (requiere su decisión/CC).

### Dataset de demo (2026-10-06, Claude Code) — datos en Supabase
- **Limpieza autorizada por la investigadora**: eliminados los 3 árboles de prueba A-000010/11/12 (Proyecto Valparaíso) + sus 3 mediciones y 4 evaluaciones de riesgo (incluidas las 2 `test:true`). Sin otras dependencias. 0 huérfanos.
- **Carga histórica (levantamiento 10/08/2026)**: A004 → `A-000013`, A005 → `A-000014` (`legacy_id` = A004/A005), vía `fn_create_tree_with_measurement` como admin. Coordenadas UTM 19S convertidas con PostGIS `ST_Transform(32719→4326)`. Especie nueva en catálogo: *Robinia pseudoacacia* (Falsa acacia). Medición: monofuste, DAP/altura/copa/1ª rama del levantamiento.
- Evaluaciones de infraestructura históricas (datos crudos; no evaluado = null). Compuertas por componente ahora admiten null ("No determinado").
- **Riesgo NO cargado ni calculado**: faltan zona objetivo, tasa de ocupación y consecuencias (entradas obligatorias). Ambos "Sin evaluación".
- Total final: 2 árboles (la investigadora indicó no cargar A006–A008 ni conservar los de prueba).

### Casos SINTÉTICOS de demostración de riesgo (DEMO / TEST, 2026-10-06)
- A-000015 (Bajo), A-000016 (Moderado), A-000017 (Alto), A-000018 (Extremo): árboles sintéticos, `lugar_referencia LIKE 'Caso de demostración%'`. Medición plausible, NO medida en terreno. Alta vía `fn_create_tree_with_measurement` (como admin).
- Evaluaciones: entradas validadas con `createTreeRiskAssessmentSchema` y resultado calculado por `evaluarRiesgo` (motor vigente, sin cambios); inserción con service role y el mismo mapeo de columnas del repositorio. Script: scratchpad `demo_risk_cases.ts`. Ningún nivel asignado a mano.
- **Limpieza post-informe** (requiere autorización explícita; orden por FK): `tree_risk_assessments` → `tree_measurements` → `trees` filtrando `tree_id IN (SELECT id FROM trees WHERE lugar_referencia LIKE 'Caso de demostración%')`.

### Pendiente / cuidado
- **Fila de prueba sin borrar**: `tree_risk_assessments`, árbol A-000010, `variables: {"test": true}`, riesgo "Bajo". La investigadora pidió dejarla hasta después de la demo. **Regla explícita suya, vigente para toda sesión futura: ningún `DROP`/`TRUNCATE`/`DELETE` sobre datos o estructuras existentes sin detenerse primero a explicar exactamente la operación.**
- Servidores: frontend `npm run dev` (puerto 5173, CORS backend configurado para ese puerto específico — si Vite toma otro puerto falla el login con "Failed to fetch"), backend `npm run dev` (puerto 3000, tsx watch).
- Congelado explícitamente (no tocar salvo que lo pida): Mantención/Incidencias reales, Infraestructura completa, M04/M05, priorización, sincronización documental completa, optimización de rendimiento profunda.

---

## 🧭 CC-021 — Jerarquía de fuentes de producto (cierre documental, 2026-10-06)

- **Estado:** APROBADO METODOLÓGICAMENTE; cambios documentales sin commit en la rama `docs/cc-021-jerarquia-fuentes` (backend). Pendiente: revisión, PR a `main` y registro de cierre (`CERRADO`, sin implementación).
- **Jerarquía vigente (PR-016 v4.0):** (1) metodología y fuentes vigentes → (2) decisiones controladas ADR/PR/CC → (3) backend + API vigente → (4) documentación vigente → (5) Figma y prototipo histórico, solo intención funcional (PR-001 v3.0) → (6) referencias visuales aprobadas, solo UX/UI.
- El Figma/prototipo histórico conserva valor como evidencia de intención funcional, pero no restablece decisiones posteriormente modificadas, reemplazadas o eliminadas.
- Referencia visual oficial única: `valpo-verde-frontend/docs/referencias/visuales/03_CityDashboardsButton.jpg`. Groundzy retirada. Los diagramas metodológicos no son referencias de UI.
- `clasificacion_prioridad` = resultado metodológico (M05, versión en preparación) que el frontend representa cuando exista el contrato backend. "Priorización" como módulo independiente del Figma histórico no se reconstruye.
- Frontend (sin commit): `CLAUDE.md`, agente `.claude/agents/frontend-ux.md`, `docs/referencias/figma-original/` (8 pantallas) y `docs/referencias/visuales/`.
- Hallazgos INV-1C pendientes (no corregidos): acceso directo a Supabase y especie ficticia de respaldo en `src/api/trees.ts`; revisar `ClassificationBadge.tsx`.

---

## 🎯 Estado de la Tarea: INV-1B VALIDADO EN SUPABASE — LISTO PARA MERGE

> [!IMPORTANT]
> **MIGRACIÓN 006 APLICADA Y VALIDADA EMPÍRICAMENTE EN SUPABASE REAL (`valpo-verde-conecta`).**
> Se ejecutó la batería de 26 pruebas reales contra PostgreSQL, RLS, la función RPC transaccional y los endpoints de Express con 100% de éxito (26/26 pruebas pasadas).
> **NO SE HA HECHO MERGE A `main` NI SE HA INICIADO FRONTEND** (a la espera de la autorización formal de cierre de hito).
> **CC-020 CONTINÚA PENDIENTE** en su tratamiento metodológico (se capturan las 5 categorías operativas aprobadas en el diccionario, pero las reglas/evaluación no se inventan).

### Evidencia Empírica Comprobada en PostgreSQL Real

1. **Tabla `tree_measurements`:**
   - Creada en el esquema `public` con todas las columnas aprobadas en INV-1A/ADR-016.
   - Restricción de integridad referencial FK `tree_id` configurada con `ON DELETE RESTRICT`.

2. **Seguridad RLS y Denegación por Defecto:**
   - **Lectura anónima bloqueada:** Usuario sin autenticación recibe 0 filas.
   - **INSERT directo bloqueado por RLS:** Intentos de inserción directa desde cliente alcanzado por JWT (tanto `admin` como `usuario_municipal`) son rechazados por PostgreSQL:
     `new row violates row-level security policy for table "tree_measurements"`.
   - **UPDATE directo bloqueado:** 0 registros modificados al carecer de política de actualización.
   - **DELETE directo bloqueado:** 0 registros eliminados al carecer de política de borrado físico.
   - Políticas de SELECT aprobadas y activas:
     - `tree_measurements_select_admin` (USING `public.is_admin()`)
     - `tree_measurements_select_municipal` (USING `public.is_municipal_member(t.project_id)`)

3. **Operación Transaccional Atómica y Autorización (`fn_create_tree_with_measurement`):**
   - Configurada como `SECURITY DEFINER` con `SET search_path = public, pg_temp`.
   - **Llamada no autenticada:** Rechazada con excepción `'Usuario no autenticado'`.
   - **Usuario municipal no miembro:** Rechazado con excepción `'No tiene acceso a este proyecto'`.
   - **Usuario inactivo:** Rechazado con excepción `'Usuario inactivo o sin perfil válido'`.
   - **Especie inexistente:** Rechazada con excepción `'Especie no encontrada'`.
   - **Espacio público de otro proyecto:** Rechazado con excepción `'Espacio público no encontrado en el proyecto'`.
   - **Trazabilidad estricta forzada:** `created_by` se asigna automáticamente a `auth.uid()` del usuario que invoca la función (comprobado tanto con admin como con usuario municipal), y `estado_medicion` se fija obligatoriamente a `'valida'`.
   - **Secuencia y código canónico:** Generación correcta de `tree_code` secuencial bajo formato `A-XXXXXX` (ej. `A-000006`).
   - **Resolución PostGIS:** Columna `ubicacion` creada exitosamente como `geography(Point, 4326)` con coordenadas WGS84 canónicas.

4. **Validaciones de Integridad y Diámetros (H-1):**
   - **Alta sin diámetros rechazada en DB:** La RPC rechaza mediciones donde `dap_cm` y `dap_fustes_cm` son nulos (`'La medición inicial requiere al menos un diámetro registrado (dap_cm o dap_fustes_cm)'`).
   - **`numero_fustes = 1` rechazado:** Violación de constraint `chk_tree_measurements_fustes`.
   - **Alta con solo `dap_cm`:** Permitida y validada.
   - **Alta con solo `dap_fustes_cm`:** Permitida y validada con array dimensional coincidente.
   - **Alta con coexistencia de ambos:** Permitida sin XOR forzado.

5. **Atomicidad y Rollback Transaccional:**
   - Se provocó deliberadamente una falla en la inserción de la medición (mismatch de fustes) posterior al `INSERT` del árbol.
   - PostgreSQL realizó un rollback total de la transacción: **cero árboles huérfanos creados** (recuento de `trees` idéntico antes y después del fallo).

6. **Endpoints Backend Reales (Express -> Supabase):**
   - `POST /api/projects/:id/trees` → 201 Created con alta unificada.
   - `GET /api/trees/:treeId` → 200 OK devolviendo ficha completa del árbol y `medicion_actual_estado: 'ok'`.
   - `GET /api/trees/:treeId/measurements` → 200 OK devolviendo historial cronológico de mediciones.
   - `GET /api/projects/:id/trees` (SIG-1) → 200 OK devolviendo la `FeatureCollection` canónica en GeoJSON WGS84.
   - Limpieza segura de datos de prueba completada, retornando la base de datos a su estado limpio inicial.

---

## ⚠️ Decisiones PENDIENTE (Preservadas intactas)
- **H-1 / Mediciones posteriores:** Obligatoriedad de diámetros en mediciones posteriores a la inicial continúa pendiente.
- **CC-020:** Tratamiento metodológico, reglas de transición y cálculo de `clase_edad` por consolidar (categorías operativas capturadas, evaluación pendiente).
- **Categorías definitivas de `configuracion_fustes`:** Se mantiene como `TEXT` abierto.
- **Tratamiento / publicación futura del DAP equivalente:** Pendiente, no se inventó fórmula.
- **Sector / `ubicacion_descriptiva`:** Pendiente.
- **Obligatoriedad / datum / huso de UTM:** Pendiente.
- **Relación MEDICIÓN ↔ INSPECCIÓN:** Pendiente.
- **Permisos futuros de corrección y anulación:** Pendientes de gobernanza (RLS UPDATE/DELETE no implementados).
- **Tratamiento metodológico definitivo del empate de fecha máxima:** Pendiente regla de negocio.
- **Sincronización de `fecha_medicion <= fecha actual` con `DICCIONARIO_CAMPOS`:** Pendiente.
- **No modificar migraciones 001–005 ni fusionar a `main`.**

---

## 📝 Notas de Agentes
- **2026-10-06 — AGY (Gemini):** Migración `006_tree_measurements.sql` aplicada en Supabase por la investigadora. Se completó la validación empírica en PostgreSQL real con 26/26 pruebas exitosas que abarcan RLS, atomicidad, constraints, RPC y endpoints backend Express. 120 tests automáticos pasando. Rama lista para merge a `main` cuando la investigadora lo autorice formalmente.

---

## 🚀 Instrucción Directa para el Siguiente Agente (Prompt de arranque)

> *"Hola. Lee `CLAUDE.md`, la sección '▶ Punto de reanudación' de este HANDOFF y `docs/auditorias/2026-10-postauditoria/README.md`. La auditoría postdemo de SIVU está registrada (57 hallazgos; pendientes PA-01 a PA-42 en `docs/roadmap.md`). Respeta los estados exactos de `decisiones.md`: DA-01 aprobada solo en principio, DA-03 solo en concepto, DA-02 y DA-04 pendientes, CC-015 pendiente. C1 (motor con reglas de borrador) y C2 (ADR-006 vs CC-022) están abiertas: no las resuelvas cambiando el motor ni los permisos. Antes de cambiar nada: `git status` en ambos repos; `main` es la base documental oficial; `feature/demo-sivu` lleva un commit fuera de `main` (`601e9d6` / `8956d6f`) pendiente de verificación en navegador. Backend: `npm test` y `npx tsc --noEmit`; frontend: `npx tsc -b` y `npm run build`. No registres CC sin autorización (próximo libre: CC-025). NO modificar código, Supabase, migraciones, motor, roles ni permisos; NO pruebas de escritura (W1–W12 solo en un entorno de pruebas aislado); NO borrar ramas, etiquetas ni archivos; NO commit/push/merge/PR sin autorización explícita de la investigadora. Repos públicos: no publicar detalles explotables de S1."*

Prompt anterior (2026-10-06, histórico): demo terminada; auditoría postdemo pendiente. Sus siete puntos quedaron cubiertos por la auditoría de octubre (ver `docs/auditorias/2026-10-postauditoria/`).
