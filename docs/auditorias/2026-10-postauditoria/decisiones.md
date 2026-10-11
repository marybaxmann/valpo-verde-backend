# Registro de decisiones — Auditoría postdemo 2026-10

Documento de evidencia, no normativo. Registra las decisiones **tal como las formuló la autora** y su estado exacto. Una decisión que aquí figura como aprobada en principio o en concepto **no** está implementada ni registrada como PR, ADR o CC.

**Estados**
- **APROBADA**: decidida por la autora, con el alcance indicado.
- **APROBADA (principio)** / **APROBADA (concepto)**: aprobada solo en ese nivel; la implementación concreta no lo está.
- **PROPUESTA**: recomendación técnica sin aprobar.
- **PENDIENTE**: falta decisión o evidencia.

---

## 1. Decisiones postauditoría (autora, 2026-10-11)

### DA-01 — Arquitectura de escritura · APROBADA (principio)
- **Aprobado:** las escrituras de datos de gestión de SIVU deben pasar por el backend, con autenticación, autorización, validación y trazabilidad.
- **No aprobado todavía:** una implementación concreta con `service_role`, cambios en las políticas RLS o en los permisos de tabla.
- **Origen:** S1, S2, I1, T1.
- **Contexto:** ADR-014 v1.0 y PR-018 v2.0 decidieron que el backend use el JWT del usuario para que RLS actúe como segunda barrera. Como el navegador tiene ese mismo JWT, lo que el backend escribe con él el usuario también puede escribirlo directo. DA-01 exige que el backend escriba con una credencial que el navegador no tenga, lo que **requiere revisar ADR-014** (§4).

### DA-02 — Entidad INSPECCIONES · PENDIENTE (diseño)
- **Instrucción:** revisar el modelo del Excel maestro, la tabla `inspections` existente, ADR-016 y las relaciones con mediciones, evaluaciones de riesgo, infraestructura y órdenes de trabajo. No crear ni modificar tablas.
- **Origen:** X4, X5, X1, I1. Evidencia en §3.

### DA-03 — Historial de eventos · APROBADA (concepto)
- **Aprobado:** los cambios relevantes de incidencias y órdenes de trabajo deben conservar un historial con autor, fecha y trazabilidad, sin sobrescrituras ni pérdida de información.
- **No aprobado todavía:** el esquema SQL.
- **Origen:** I2. Modelo conceptual en §6.

### DA-04 — Transiciones de estado · PENDIENTE (definición)
- **Instrucción:** contrastar las matrices de transición con el Excel vigente, los roles y los procesos de gestión municipal. No asumir que los flujos sugeridos en la auditoría están aprobados.
- **Origen:** I3, X3, X5. Decisiones necesarias en §7.

---

## 2. Decisiones de consolidación documental (autora, 2026-10-11)

| # | Decisión | Estado |
|---|---|---|
| K1 | `main` es la base documental oficial. Los cambios documentales se preparan en ramas `docs/` creadas desde `main` y se revisan por PR | **APROBADA** |
| K2 | Actualizar referencias locales con `git fetch` y `main` solo por avance rápido, sin sobrescribir cambios locales; no modificar ni reescribir `feature/demo-sivu` | **APROBADA** (ejecutada 2026-10-11: `main` backend `7913a13`, frontend `187a90d`) |
| K3 | Etiquetas `demo-2026-10-10` (backend `0397c12`, frontend `ad1c5e2`) | **PROPUESTA**: no autorizado crearlas ni publicarlas |
| K4 | El commit del 2026-10-11 (`601e9d6` backend, `8956d6f` frontend) queda fuera de `main` hasta verificar su funcionamiento; sin cherry-pick, merge ni push | **APROBADA** |
| K5 | Registrar C1 y C2 como hallazgos prioritarios, sin cambiar las reglas del motor ni los permisos | **APROBADA** (ver [contradicciones.md](contradicciones.md)) |
| K6 | Preparar la documentación postauditoría en una rama documental desde `main` | **APROBADA** (rama `docs/postauditoria-2026-10`; commit pendiente de autorización) |

**Sobre CC-015 (roles):**
- La definición definitiva **sigue pendiente**.
- **Modelo conceptual de referencia** indicado por la autora: Administrador, Usuario municipal, Inspector y Mantenimiento.
- **Por revisar:** si una persona puede tener varios roles, sus permisos y su asignación por proyecto.
- **No se cambia el modelo actual:** un rol global por persona en `user_profiles.role_id` y membresía por proyecto sin rol en `project_members`.

**Sobre las pruebas de escritura:** la autora prefiere reactivar primero un **entorno de pruebas aislado**; W1–W12 no se ejecutan hasta entonces.

---

## 3. Identificadores vigentes (verificados 2026-10-11 en todas las ramas)

| Serie | Último | Próximo libre |
|---|---|---|
| ADR | ADR-016 | ADR-017 |
| CC | CC-024 | CC-025 |
| PR | PR-018 | PR-019 |

No hay ninguna mención a CC-025+, ADR-017+ ni PR-019 en ninguna rama, y no hay PR abiertos. El número de un CC se asigna **al registrarlo**, no al proponerlo.

---

## 4. DA-01 — Alternativas de implementación (PROPUESTA; sin aprobación técnica)

**Requisito:** el backend debe escribir con algo que el navegador no tenga. Mover las escrituras a funciones de la base no basta si se pueden llamar con el JWT del usuario.

| | A1 · `service_role` | A1+ · `service_role` + funciones con actor | A2 · Rol propio de Postgres | A3 · JWT propio del backend | A4 · Funciones con secreto del backend | B · Solo endurecer RLS |
|---|---|---|---|---|---|---|
| Cumple DA-01 | Sí | Sí | Sí | Sí | Sí | **No** |
| Conserva la verificación en la base | No | Parcial (la función revisa la membresía del actor) | Parcial | Sí | Sí | Sí |
| `auth.uid()` disponible en la base | No (actor explícito) | No (`p_actor_id`) | No | Sí | Sí | Sí |
| Secretos o dependencias nuevas | Ninguno | Ninguno | Credencial de BD + `pg` | Secreto de firma | Secreto compartido | Ninguno |
| Complejidad | Baja | Media | Alta | Alta | Media (poco convencional) | Media |

- **Recomendación preliminar:** A1+. Cumple DA-01 sin secretos nuevos, conserva una verificación en la base y fija el autor desde la sesión (resuelve I1).
- **Impactos comunes:** retirar los permisos de escritura de los roles de API en las tablas de datos manteniendo la lectura bajo RLS; unos 9 repositorios de escritura; actor tomado siempre de la sesión; nueva versión de la función de alta de árbol (hoy depende de `auth.uid()`); pruebas de ruta por cada escritura; ADR-014 v2.0 y PR-018 v3.0.
- **Evidencia que falta antes de pedir la aprobación técnica:**

| # | Evidencia | Requiere autorización |
|---|---|---|
| E-1 | Resultados reales de W1–W12 | Sí (entorno de pruebas aislado) |
| E-2 | Inventario completo de defaults, funciones y políticas que dependen de `auth.uid()` | No (lectura) |
| E-3 | Uso de la clave de servicio de formato nuevo (`sb_…`) con supabase-js en escrituras | No |
| E-4 | Para A4: acceso a cabeceras desde funciones y almacenamiento del secreto | Sí, si se prueba |
| E-5 | Cobertura de pruebas de autorización de todas las escrituras | No |

- **Criterios de aceptación de una implementación futura:**
  - W1, W2, W3, W5, W6, W7 y W8 rechazados.
  - W4 y W9–W12 siguen rechazados.
  - Las lecturas L1–L4 no cambian.
  - El actor siempre viene de la sesión.
  - Hay una prueba de ruta por escritura.
  - ADR-014 y PR-018 actualizadas antes de implementar.

---

## 5. Propuestas de CC (NO REGISTRADAS)

Ninguna propuesta se ha escrito en `docs/registro-cambios.md`. Se registran solo con autorización expresa, una por tema, con el próximo número libre en el momento del registro y **en el estado indicado**; nunca como aprobadas sin decisión.

### Propuesta para CC-025 (si la autora autoriza registrarla primero)
| Campo | Propuesta |
|---|---|
| Título | Implementación del motor de riesgo con reglas de un borrador no publicado (C1) |
| Tipo | 2 (metodológico; gobernanza de versión) con 4 secundario |
| Estado inicial propuesto | `PENDIENTE DE DECISIÓN` |
| Alcance | Formular la decisión entre: excepción controlada para desarrollo/pruebas · publicación del paquete 2.0.0 con las reglas del borrador v3 · marcar los resultados como provisionales. Fijar el formato de `rule_version` |
| No incluye | Cambios del motor, de reglas, de resultados guardados ni de permisos |
| Artefactos afectados (cuando se decida) | PR-011, `methodology/00-index.md`, REGLAS_INDICADORES, VERSION, `treeRisk.ts` (solo `rule_version`), migración de `rule_version` |
| Dependencias | Ninguna bloqueante; condiciona C4 |

**Por qué C1 como CC-025:** es la contradicción de mayor alcance (afecta la validez de todos los resultados de riesgo) y no depende de otras decisiones. Si la autora prefiere otro orden, el número se asigna al tema que registre primero.

### Otros candidatos (sin número)
| Tema | Tipo | Estado inicial propuesto | Depende de |
|---|---|---|---|
| C2: ADR-006 contradice CC-022 | 1 | `EN REVISIÓN` | CC-015 (para la versión definitiva) |
| DA-01: arquitectura de escritura | 3 + 4 | `EN REVISIÓN` (principio aprobado) | Evidencia E-1 a E-5 |
| DA-02: entidad INSPECCIONES | 3 (+2) | `DETECTADO` | CC-015, ADR-016, X1 |
| DA-03: historial de eventos | 3 + 4 | `EN REVISIÓN` (concepto aprobado) | DA-01 (implementación) |
| DA-04: transiciones de estado | 2 / 3 | `DETECTADO` | CC-015, DA-03 |
| X1: `INSPECCIONES.nivel_riesgo` | 1 | `DETECTADO` | — |
| I1: autor e inspector de las evaluaciones | 3 | `DETECTADO` | DA-01, CC-015, DA-02 |

CC-015 ya existe (`EN REVISIÓN`): el modelo de roles se trabaja dentro de él, sin abrir un CC nuevo.

---

## 6. DA-03 — Modelo conceptual de eventos (concepto aprobado; esquema sin aprobar)

**Principios:**
1. Solo agregar; las correcciones son eventos nuevos.
2. Autor tomado de la sesión.
3. Fecha y hora del servidor; se muestran en hora de Chile.
4. El cambio de estado y su evento se guardan juntos (atomicidad).
5. Control de concurrencia: si el registro cambió desde que el usuario lo vio, la respuesta es 409.
6. El estado guardado coincide siempre con el último evento.

**Entidad conceptual "evento de gestión":**
- identificador;
- registro (incidencia u OT; a futuro, inspección);
- proyecto;
- tipo (creación, cambio de estado, nota, asignación, vinculación, corrección);
- estado anterior y nuevo;
- nota;
- datos de la transición;
- autor y fecha y hora;
- secuencia;
- evento corregido (solo en correcciones).

**Almacenamiento (sin decidir):**
- (a) una tabla común para incidencias y OT;
- (b) una tabla por entidad;
- (c) reutilizar la tabla antigua `audit_log`, poco adecuada: está diseñada para cambios de campos, no tiene `project_id` y su RLS está cerrada.

**Preguntas:**
- **D1:** ¿cada entrada muestra autor y hora?
- **D2:** ¿las notas nunca se editan ni se borran?
- **D3:** ¿qué se hace con el texto actual de la bitácora?
- **D4:** ¿las OT tienen el mismo historial?
- **D5:** ¿se puede agregar una nota sin cambiar el estado?
- **D9:** ¿se registra la vinculación incidencia → OT?
- **D12:** ¿quién ve el historial?

**Criterios de aceptación futuros:**
- Dos cambios simultáneos producen un resultado y un 409, nunca una pérdida silenciosa.
- Ningún rol modifica ni borra eventos.
- Estado y último evento siempre coinciden.
- Cada evento tiene autor y fecha del servidor.

---

## 7. DA-04 — Decisiones necesarias (sin matrices propuestas)

**Fuente:**
- El Excel define los estados:
  - OT: Pendiente, Programada, En ejecución, Completada, Cancelada.
  - Incidencia: Ingresada, En revisión, Derivada, Resuelta, Descartada.
  - Revisión de mantenimiento: Pendiente de revisión, Aprobado, Rechazado.
- No define **ninguna transición** (`moduleCatalogs.ts`: "La fuente no define transiciones").

| ID | Decisión | Naturaleza | Depende de |
|---|---|---|---|
| T-01 | ¿Los estados de OT e incidencia pasan al catálogo LISTAS (CC-004)? | Metodológica | — |
| T-02 | Matriz de transiciones de OT de mantenimiento | Funcional / gestión municipal | CC-015 |
| T-03 | Matriz de transiciones de incidencias | Funcional / gestión municipal | CC-015 |
| T-04 | ¿Existe la OT de inspección y comparte matriz? | Funcional | DA-02 |
| T-05 | ¿"Completada" significa ejecutada, o revisada y aprobada (`estado_revision`)? | Metodológica | CC-015 |
| T-06 | Datos obligatorios por transición | Metodológica / funcional | T-02, T-03 |
| T-07 | ¿Se reabren los estados finales? ¿Quién? | Funcional / roles | CC-015, DA-03 |
| T-08 | ¿Quién ejecuta cada transición? | Roles | CC-015 |
| T-09 | ¿Transición al mismo estado (solo nota)? | Funcional | DA-03 (D5) |
| T-10 | ¿Una incidencia derivada o resuelta se vincula a una OT? | Funcional | T-02, T-03 |
| T-11 | ¿Programar con fecha pasada? ¿"Vencida" sigue siendo derivado? | Funcional | — |
| T-12 | ¿Tipo y origen de incidencia pasan a catálogo? | Metodológica | — |
| T-13 | ¿La prioridad es manual (reportada) o la calcula M05? | Metodológica | — |

Plantilla de matriz (para completar con la autora; sin contenido propuesto): filas "desde" × columnas "hacia" por cada estado; en cada celda, si está permitida, el rol y los datos obligatorios.

---

## 8. DA-02 — Evidencia del modelo INSPECCIONES

- **Excel, hoja INSPECCIONES** (17 campos):
  - `id_inspeccion`, `id_ot`, `id_arbol`, `fecha_inspeccion`;
  - **`inspector`** (distinto de `registrado_por`);
  - `tipo_inspeccion_realizada` (Evaluación inicial, Reevaluación, Evaluación instrumental, Monitoreo) y `subtipo_inspeccion`;
  - `metodo_instrumental`, `resultado_general`, `nivel_riesgo` (ver X1);
  - `requiere_mantenimiento`, `requiere_nueva_inspeccion`, `fecha_proxima_inspeccion`;
  - `observaciones`, `evidencia_fotografica`, `registrado_por`, `fecha_registro`.
- **Cadena implícita en el Excel:** OT (tipo Inspección) → INSPECCIÓN → REGISTRO_EVALUACION (`id_inspeccion` obligatorio). Si requiere mantenimiento: OT (tipo Mantenimiento) → MANTENIMIENTO (ejecución y revisión). La cardinalidad inspección → evaluaciones no está declarada.
- **Reglas:**
  - ADR-007 v1.1: cada evaluación es una nueva inspección; borrador → completada; inmutable.
  - ADR-012 v1.1: preservación histórica.
  - PR-009 v2.0: no la realiza el Administrador; rol pendiente en CC-015; autosave; `rule_version`.
  - ADR-016: medición ≠ inspección; relación A/B/C pendiente.
- **Base actual:**
  - `inspections` (modelo inicial, 0 filas): tiene `inspector_id`, estado borrador/completada con CHECK, `rule_version` y `completed_at`; le faltan OT, proyecto, tipo, resultado, `registrado_por`, etc.
  - Tablas hijas antiguas sin uso.
  - `tree_risk_assessments` y `tree_infrastructure_assessments` sin vínculo a inspección (X4).
- **Alternativas de diseño (sin elegir):**
  1. Extender `inspections`.
  2. Nueva entidad desde el Excel, retirando la antigua (borrar requiere autorización).
  3. Metadatos de inspección en cada evaluación; contradice la fuente y requeriría un CC tipo 2.
- **Preguntas:**
  - **Q5** (ADR-016 A/B/C).
  - **Q6:** ¿una inspección agrupa varias evaluaciones?
  - **Q8:** ¿toda inspección nace de una OT?
  - **Q9:** ¿qué se hace con las 4 + 2 evaluaciones sintéticas?
  - **Q10:** ¿CC tipo 1 por X1?
- **Criterios de aceptación futuros:**
  - Toda evaluación nueva referencia una inspección, salvo que un CC apruebe lo contrario.
  - Inspector y registrador quedan por separado.
  - Una inspección completada es inmutable a nivel de base.
  - `rule_version` lo fija el motor.

---

## 9. Preguntas abiertas para la autora (bloqueantes primero)

| ID | Pregunta | Bloquea |
|---|---|---|
| Q1 | CC-015: modelo de roles (4 roles de referencia, varios roles por persona, rol global o por proyecto, permisos) | DA-02, DA-04, I1, C2 |
| C1 | Tratamiento del motor con borrador (excepción, publicación o resultados provisionales) | C4, validez de los resultados |
| Q3 | Reactivar y preparar el entorno de pruebas aislado (reproducir el esquema; ver E1) | E-1 (W1–W12), T1 |
| Q4 | ¿La gestión de proyectos y miembros (admin) entra en DA-01? | DA-01 |
| Q5 | ADR-016: relación medición ↔ inspección (A/B/C) | DA-02 |
| Q6, Q8, Q9, Q10 | Ver §8 | DA-02 |
| Q7 | ¿Los miembros ven los nombres de los demás miembros? | I1-b |
| D1–D5, D9, D12 | Ver §6 | DA-03 (esquema) |
| T-01 a T-13 | Ver §7 | DA-04 |
| K3 | Etiquetas de la demo | — |
