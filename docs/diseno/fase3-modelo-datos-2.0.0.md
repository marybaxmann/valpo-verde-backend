# Fase 3 — Diseño del modelo de datos para el paquete 2.0.0

> **Estado: PROPUESTA PARA APROBACIÓN (revisión 2, con las respuestas de la autora del 2026-10-20 y CC-040 / CC-041).** Documento de diseño. No contiene migraciones ni modifica ninguna base. La Fase 4 (migraciones) empieza solo con la aprobación de la autora.

- **Fuente:** paquete metodológico 2.0.0 (tag `metodologia-v2.0.0`), Excel maestro `docs/excel/Base de Datos Valpo Verde.xlsx`. Las citas "D-n" remiten a la fila *n* de DICCIONARIO_CAMPOS; "RG" a REGLAS_GENERALES; "RI" a REGLAS_INDICADORES; "MC" a MATRICES_CALCULO.
- **Decisiones que implementa:** CC-026, CC-029, CC-031 a CC-041; PR-003 v8.0, PR-004 v7.0, PR-006 v11.0, PR-008 v2.0, PR-009 v5.0, PR-010 v3.0, PR-011 v3.0, PR-018 v3.0, PR-019 v1.2, PR-020 v1.1, PR-021, PR-022; ADR-010 v3.0, ADR-014 v2.0, ADR-016 v5.0.
- **Estado actual de referencia:** `database/schema.sql` y Supabase `valpo-verde-conecta` (2026-10-20), con datos íntegramente simulados (CC-038).

## 1. Principios del diseño

1. **Nombres:** tablas en inglés, como las existentes (`trees`, `inspections`…); columnas con el nombre exacto del campo en DICCIONARIO_CAMPOS.
2. **Códigos de catálogo:** cada categoría se guarda como código snake_case de PR-021 y la base la valida con `CHECK`. La etiqueta visible es la del Excel.
3. **Calculado ≠ observado (PR-008 v2.0):** las entradas del Inspector y los resultados del motor se guardan por separado; los resultados no se editan, salvo el ajuste justificado.
4. **Historial (ADR-012, ADR-016 v4.0, RG "Historial y vigencia"):** no se sobrescribe; cada versión de los datos técnicos queda vinculada a su inspección.
5. **Valores derivados no se duplican (PR-007):** `estado_presencia`, `fecha_cambio_estado_presencia` y `nivel_riesgo` se obtienen con vistas.
6. **Escrituras solo por el backend (CC-033):** ninguna política RLS de escritura para `authenticated` ni `anon`.
7. **Lo que no se modela:** INDICES (DM-09; incluidos nativos e introducidos, CC-039) y cualquier campo que no esté en el Excel.

## 2. Mapa: tablas actuales → tablas destino

| Tabla actual | Destino | Motivo |
|---|---|---|
| `roles`, `user_profiles` | Se mantienen; +2 roles | CC-032 |
| `projects`, `project_members` | Se mantienen | D-263 a D-266; PR-005 v3.0 |
| — | **`sectors`** (nueva) | D-252 a D-256; AMD-32 |
| `species` | **Se adapta** como catálogo | D-257 a D-262; CC-039 |
| `trees` | **Se adapta** (identidad + valores vigentes) | D-2 a D-29; ADR-010 v3.0 |
| `tree_measurements` | Se **retira** → `tree_data_versions` (nueva) | CC-028 P3; CC-032 |
| — | **`work_orders`** (nueva) | D-231 a D-246 |
| `inspections` (001, vacía) | **Se reutiliza** como INSPECCION | D-191 a D-212; CC-032 |
| `tree_risk_assessments`, `tree_infrastructure_assessments` | Se **retiran** → `evaluations` (nueva) | D-30 a D-173 (REGISTRO_EVALUACION es una sola hoja) |
| — | **`classification_adjustments`** (nueva) | D-170 a D-173; PR-008 v2.0 |
| `maintenance` (OT + ejecución mezcladas) | Se **retira** → `work_orders` + **`maintenance_records`** (nueva) | D-213 a D-230 |
| `incidents` | **Se adapta** | D-174 a D-190; CC-036 |
| — | **`incident_reporters`** (nueva) | D-178, D-179; PR-022 |
| `photos` | **Se adapta** (vistas y vínculos) | D-27, D-183, D-206, D-224; PR-010 v3.0 |
| `audit_log` | Se mantiene | Historial de eventos (PA-27, pendiente) |
| `defect_observations`, `defect_results`, `component_assessments`, `probability_thresholds`, `vitality_assessments`, `risk_evaluations` (001, vacías) | Se **retiran** | CC-032; PA-40 |
| `infrastructure_conflicts` (001, vacía), `public_spaces` | Se **retiran** (paso de retiro, con autorización) | No están en el Excel (CC-041) |

## 3. Tablas

En cada tabla, la columna "Origen" cita el campo del Excel. Los campos técnicos (`id`, `created_at`, `updated_at`, FK internas) no tienen fila en el Excel y se marcan "técnico".

### 3.1 Roles y usuarios
`roles`: se agregan `inspector` y `encargado_mantencion` (CC-032; D-250). Un solo rol global por usuario (AMD-31).

`user_profiles`: se agrega `codigo_usuario` text UNIQUE con formato `USR-000`, generado por una secuencia (D-247; CC-041). El identificador interno (uuid) se mantiene. `Nombre`, `Correo` y `activo` (D-248 a D-251) ya están en `user_profiles.nombre`, `auth.users.email` y `activo`.

### 3.2 `projects`, `project_members`
Sin cambios. `projects.name` = `nombre_proyecto` (D-264). Los campos extra de PR-005 v3.0 (`institution_name`, etc.) no contradicen el Excel y se conservan. `project_members` = MIEMBROS_PROYECTO (D-265, D-266).

### 3.3 `sectors` (nueva)
| Columna | Tipo | Regla | Origen |
|---|---|---|---|
| `id` | uuid PK | — | D-252 |
| `project_id` | uuid FK `projects`, **UNIQUE** | un sector por proyecto; **se crea junto con el proyecto**, en la misma transacción: no existe un proyecto sin sector | D-253; AMD-32; CC-041 |
| `nombre_sector` | text NOT NULL | — | D-254 |
| `geometria_sector` | geography(MultiPolygon, 4326) NOT NULL | Polygon se normaliza a MultiPolygon; importable desde KML/KMZ | D-255; AMD-02 |
| `superficie_sector_m2` | numeric, **generada**: `ST_Area(geometria_sector)` | cálculo geodésico | D-256 |

### 3.4 `species` (catálogo de especies)
| Columna | Tipo | Regla | Origen |
|---|---|---|---|
| `id` | uuid PK | — | técnico |
| `especie_cientifica` | text NOT NULL | renombra `nombre_cientifico`; UNIQUE sobre la forma normalizada (`lower`, espacios simples); no admite "Género sp." ni "No determinado" | D-257 |
| `genero`, `familia` | text NULL | vacío si no se conoce | D-258, D-259 |
| `origen_biogeografico` | text NULL CHECK (`nativa`, `endemica`, `introducida`) | vacío si no se conoce | D-260; CC-039 |
| `persistencia_follaje` | text NULL CHECK (`perennifolia`, `caducifolia`, `semicaducifolia`) | | D-261 |
| `tipo_hoja` | text NULL CHECK (`latifoliada`, `acicular`, `escuamiforme`, `palmera`) | | D-262 |
| `created_by`, `created_at`, `updated_at` | | solo el Inspector escribe (por el backend) | RG Roles; PR-019 v1.2 |

Se elimina `species.nombre_comun`: `nombre_comun` es un dato del árbol (CC-028 P2; D-14).

### 3.5 `trees` (identidad + valores vigentes)
`trees` guarda la identidad y **los valores vigentes** de los datos del árbol (RG "Historial y vigencia": "ARBOLES muestra el valor vigente"). La historia completa vive en `tree_data_versions`.

| Columna | Tipo | Regla | Origen |
|---|---|---|---|
| `id` | uuid PK | — | D-2 |
| `tree_code` | text UNIQUE (`A-000000`) | se conserva | D-2 (identificador) |
| `project_id` | uuid FK | — | D-3 |
| `sector_id` | uuid FK `sectors` **NOT NULL** | el sector del proyecto, asignado por el sistema | D-6; CC-041 |
| `fecha_registro` | date NOT NULL | hora de Chile | D-4 |
| `registrado_por` | uuid FK `user_profiles` NOT NULL | explícito (CC-033) | D-5 |
| `via_registro` | text CHECK (`alta_municipal`, `levantamiento`) | trazabilidad de la vía de registro | PR-006 v10.0 "Vías de registro" |
| `legacy_id` | text UNIQUE NULL | se conserva | técnico |
| **Valores vigentes** (los escribe solo la función de vigencia, §5.1) | | | |
| `sector`, `ubicacion_descriptiva` | text | | D-7, D-8 |
| `utm_este`, `utm_norte` | numeric(10,2) | coordenadas canónicas | D-9, D-10; CC-028 P1 |
| `huso`, `datum` | text CHECK (`19S`), CHECK (`WGS84`) | fijos | D-11, D-12 |
| `ubicacion` | geography(Point, 4326), **generada** desde UTM (`ST_Transform(… 32719 → 4326)`) | solo lectura; índice GIST | ADR-010 v3.0 |
| `especie_cientifica`, `nombre_comun` | text | al menos uno en el alta | D-13, D-14; RG "Preguardado" |
| `multifustal` … `rango_edad_estimada_anios` | igual que en `tree_data_versions` | | D-15 a D-26 |
| `vigente_desde_inspection_id` | uuid NULL FK `inspections` | inspección que aportó los valores vigentes; NULL = valores del alta ("Evaluación pendiente") | RG "Historial y vigencia" |
| `created_at`, `updated_at` | | | técnico |

Se retiran: `species_id` (el vínculo con el catálogo es por `especie_cientifica` normalizada, D-13, D-257, para que una especie ausente del catálogo no bloquee el alta), `dap`, `altura_total`, `diametro_copa`, `altura_primera_rama`, `estado_ciclo_vida` (→ vista `v_tree_presence`), `direccion`, `comuna`, `lugar_referencia` y `public_space_id` (CC-041).

### 3.6 `tree_data_versions` (nueva): datos del árbol por inspección
Una fila por alta (sin inspección) y una por cada inspección que registra o confirma datos del árbol (D-26 "conservar el historial"; RG "Historial y vigencia").

**Inspecciones parciales (CC-040):** cada versión guarda solo los datos que registró. La columna `campos_registrados text[]` lista esos campos, para distinguir "no registrado en esta inspección" de "vacío" o "No presenta". La Evaluación instrumental y el Monitoreo suelen no registrar datos del árbol.

| Columna | Tipo | Regla | Origen |
|---|---|---|---|
| `id`, `tree_id` | uuid | — | técnico / D-2 |
| `inspection_id` | uuid NULL FK `inspections`, UNIQUE | NULL solo en la versión del alta | RG "Historial y vigencia" |
| `campos_registrados` | text[] NOT NULL | campos que registró esta versión | CC-040 |
| `sector`, `ubicacion_descriptiva`, `utm_este`, `utm_norte` | | el Inspector puede corregir la ubicación (PR-006 v10.0) | D-7 a D-10 |
| `especie_cientifica`, `nombre_comun` | text | para finalizar: ambos, sin "Género sp." ni "No determinado" | D-13, D-14 |
| `multifustal` | boolean | | D-15 |
| `numero_fustes` | integer CHECK ≥ 2 | si `multifustal` | D-16 |
| `dap_fustes_cm` | numeric(6,2)[] | si `multifustal`; largo = `numero_fustes` | D-17 |
| `dap_cm` | numeric(6,2) CHECK > 0 | manual si monofustal; si multifustal lo calcula el backend con la fórmula de D-18 | D-18 |
| `altura_total_m` | numeric(6,2) CHECK > 0 | | D-19; AMD-13 |
| `diametro_copa_ns_m`, `diametro_copa_eo_m` | numeric(6,2) | + `copa_no_presenta` boolean (RG "Ausencia") | D-20, D-21 |
| `diametro_copa_m` | numeric(6,2), **generada**: promedio si ambas existen | | D-22 |
| `altura_primera_rama_m` + `altura_primera_rama_no_presenta` | numeric / boolean | "No presenta" desactiva el número | D-23; RG "Ausencia" |
| `altura_base_copa_viva_m` + `altura_base_copa_viva_no_presenta` | numeric / boolean | | D-24; RG "Ausencia" |
| `clase_edad` | text CHECK (5 códigos) | obligatoria para finalizar | D-25 |
| `rango_edad_estimada_anios` | text CHECK (21 códigos: `0_5` … `96_100`, `mas_de_100`) NULL | **opcional**; no se exige para finalizar | D-26; CC-039 |
| `created_by`, `created_at` | | | técnico |

Las versiones no se modifican después de finalizar la inspección (PR-009 v4.0).

### 3.7 `work_orders` (nueva): ORDENES DE TRABAJO
| Columna | Tipo | Regla | Origen |
|---|---|---|---|
| `id` | uuid PK | | técnico |
| `codigo_ot` | text UNIQUE | `OT-I-000000` / `OT-M-000000`, una secuencia por tipo | D-231 |
| `project_id` | uuid FK NOT NULL | también para OT de Levantamiento | AMD-19 |
| `tree_id` | uuid FK NULL | CHECK: NULL si y solo si `accion_solicitada = levantamiento` | D-232 |
| `incident_id` | uuid FK NULL | | D-233 |
| `tipo_ot` | text CHECK (`inspeccion`, `mantenimiento`) | | D-234 |
| `accion_solicitada`, `subtipo_accion` | text | combinación válida según el registro de catálogos (PR-021) | D-235, D-236 |
| `motivo` | text NULL | | D-237 |
| `prioridad` | text CHECK (`critica`, `alta`, `media`, `baja`) | el backend propone la `clasificacion_prioridad` vigente | D-238; AMD-39 |
| `estado_ot` | text CHECK (`pendiente`, `programada`, `en_ejecucion`, `completada`, `cancelada`) | | D-239 |
| `fecha_creacion_ot` | date | | D-240 |
| `fecha_accion_programada` | date NULL | obligatoria desde `programada` | D-241 |
| `fecha_completada_ot` | date NULL | CHECK: presente si y solo si `completada` | D-242 |
| `ot_creado_por` | uuid FK | | D-243 |
| `responsable_accion_id` | uuid FK `user_profiles` | | D-244 |
| `requiere_revision_inspector` | boolean NULL | solo Mantenimiento; CHECK: `true` si `subtipo_accion` ∈ (`tala`, `retiro_tocon`) | D-245; AMD-20 |
| `observaciones` | text NULL | CHECK: obligatoria en Levantamiento y Otra / Otra_Intervención | D-246 |
| `created_at`, `updated_at` | | | técnico |

Trigger: no permite `completada` si alguna inspección de la OT está `preguardado` (D-239; RG "Preguardado").

### 3.8 `inspections` (reutilizada): INSPECCION
| Columna | Tipo | Regla | Origen |
|---|---|---|---|
| `id` | uuid PK | se conserva | técnico |
| `codigo_inspeccion` | text UNIQUE `INS-000000` | | D-191 |
| `work_order_id` | uuid FK NOT NULL | | D-192 |
| `tree_id` | uuid FK NOT NULL | en Levantamiento, el árbol creado o reutilizado | D-193; AMD-10 |
| `fecha_inspeccion` | date | renombra `fecha` | D-194 |
| `inspector` | uuid FK | renombra `inspector_id` | D-195 |
| `tipo_inspeccion_realizada`, `subtipo_inspeccion` | text CHECK | | D-196, D-197 |
| `metodo_instrumental` | text NULL | | D-198 |
| `resultado_general` | text | | D-199 |
| `requiere_mantenimiento` | boolean | | D-201 |
| `fecha_proxima_inspeccion_sugerida`, `fecha_proxima_inspeccion` | date | se conserva la sugerida y la ajustada | D-202; D-204 L |
| `fecha_proximo_monitoreo_sugerida`, `fecha_proximo_monitoreo` | date | | D-203 |
| `justificacion_ajuste_fecha`, `ajuste_fecha_por`, `fecha_ajuste_fecha` | | CHECK: justificación si la fecha difiere de la sugerida | D-204 |
| `observaciones` | text NULL | | D-205 |
| `registrado_por`, `fecha_registro` | | | D-207, D-208 |
| `estado_registro` | text CHECK (`preguardado`, `finalizado`, `anulado`) | renombra `estado`; `anulado` solo desde `finalizado` | D-209; CC-031 |
| `motivo_anulacion`, `anulado_por`, `fecha_anulacion` | | CHECK: presentes si y solo si `anulado` | D-210 a D-212 |
| `rule_version` | text NOT NULL | se conserva; `2.0` | PR-009 v4.0 |
| `finalizada_at` | timestamptz NULL | renombra `completed_at` | técnico |

`nivel_riesgo` (D-200) no se guarda: se deriva del riesgo efectivo de su evaluación (vista `v_inspections`). La evidencia fotográfica (D-206) vive en `photos`.

### 3.9 `evaluations` (nueva): REGISTRO_EVALUACION y resultados
Una fila por inspección (D-30 a D-32). El **alcance** depende del tipo de inspección (CC-040): evaluación completa en Evaluación inicial, Reevaluación y Levantamiento; solo cavidades (D-39 a D-49 y D-51 a D-61) en Evaluación instrumental; solo los campos del subtipo en Monitoreo.

| Columna | Tipo | Regla | Origen |
|---|---|---|---|
| `id` | uuid PK | | D-30 |
| `inspection_id` | uuid FK UNIQUE NOT NULL | | D-31 |
| `tree_id` | uuid FK NOT NULL | | D-32 |
| `variables` | jsonb NOT NULL | **entradas registradas en esta inspección** (solo las de su alcance), con el nombre exacto del Excel: D-33 a D-45, D-47, D-50 a D-57, D-59, D-62 a D-141, D-143 a D-158, D-160 a D-162 y D-169. Validación por campo en el backend (Zod), **exactamente según DICCIONARIO_CAMPOS**: dominio, unidad, rango, obligatoriedad y condición de activación (CC-032 punto 4) | D-33 a D-169 |
| `variables_calculo` | jsonb NOT NULL | **entradas con las que se calculó**: las de esta inspección más los valores vigentes del árbol para los demás campos (CC-040), con el origen de cada una (`inspection_id`) | CC-040 |
| `calculados` | jsonb | **variables derivadas por el sistema**: `SL_basal_pct`, `R_radio_basal_cm`, `t_R_basal`, `SL_tronco_pct`, `R_radio_tronco_cm`, `t_R_tronco`, `superficie_alcorque_m2` (rectangular y circular; si la forma es irregular la ingresa el Inspector y va en `variables`), `cumplimiento_distancia_seguridad_bt_mt` | D-46, D-48, D-49, D-58, D-60, D-61, D-125, D-142 |
| `indicadores` | jsonb | por indicador: ID de regla aplicada (p. ej. `CR-DEF-03`), categoría parcial y puntaje | RI (98 reglas); PR-011 v3.0 |
| `puntaje_raices_cuello`, `probabilidad_falla_raices_cuello` | int / text | R01; "No determinado" sin puntaje (CC-024) | D-163; MC S9 |
| `puntaje_tronco`, `probabilidad_falla_tronco` | | R02 | D-164; MC Z11 |
| `puntaje_copa_ramas`, `probabilidad_falla_copa_ramas` | | R03 (con defoliación) | D-165; MC AF8 |
| `probabilidad_impacto` | text | M01 | D-159 |
| `clasificacion_raices_cuello`, `clasificacion_tronco`, `clasificacion_copa_ramas` | text | M02 + M03 | D-166 a D-168 |
| `clasificacion_riesgo_calculada` | text | R04 | D-171 |
| `puntaje_infraestructura`, `pct_infraestructura`, `clasificacion_infraestructura_calculada` | numeric / text | M04 (P_I y P_I%) | D-170; MC AL5 |
| `clasificacion_prioridad_calculada` | text | M05 con el riesgo y la infraestructura **efectivos** | D-172; MC AW5; CC-029 |
| `clasificacion_riesgo_ajustada`, `clasificacion_infraestructura_ajustada`, `clasificacion_prioridad_ajustada` | text NULL | ajuste del Inspector; el valor efectivo = ajustado si existe, si no, calculado | D-170 a D-172 L; PR-008 v2.0 |
| `rule_version` | text NOT NULL CHECK (`2.0`) | versión con la que se calcularon los resultados | CC-030; PR-011 v3.0 |
| `motor_commit` | text NOT NULL | hash del código del motor que calculó | CC-030 punto 4; CC-041 |
| `calculado_at`, `created_at`, `updated_at` | | | técnico |

Sin `estado_registro` propio: lo hereda de su inspección.

### 3.10 `classification_adjustments` (nueva): historial de ajustes
| Columna | Tipo | Origen |
|---|---|---|
| `id`, `evaluation_id` | uuid | técnico |
| `campo` | text CHECK (`clasificacion_riesgo`, `clasificacion_infraestructura`, `clasificacion_prioridad`) | D-170 a D-172 |
| `valor_calculado`, `valor_ajustado` | text | D-173 L |
| `justificacion_ajuste_clasificacion` | text NOT NULL | D-173 |
| `ajustado_por` (Inspector), `fecha_ajuste` | | D-173 L |
| `rule_version` | text | la del valor calculado (CC-030 punto 3) |

Si se ajusta el riesgo o la infraestructura, el backend recalcula `clasificacion_prioridad_calculada` con el valor ajustado (PR-008 v2.0). Los ajustes solo se registran mientras la inspección está `preguardado`; después de finalizar, se anula la inspección y se registra una nueva (CC-041; PR-009 v5.0).

### 3.11 `maintenance_records` (nueva): MANTENIMIENTO
| Columna | Tipo | Regla | Origen |
|---|---|---|---|
| `id`, `codigo_mantenimiento` (`MAN-000000`) | | | D-213 |
| `work_order_id`, `tree_id` | uuid FK NOT NULL | OT de tipo Mantenimiento; mismo árbol | D-214, D-215 |
| `fecha_ejecucion`, `ejecutado_por` | | | D-216, D-217 |
| `accion_ejecutada`, `subtipo_ejecutado` | text CHECK | | D-218, D-219 |
| `resultado` | text CHECK (`ejecutado_completamente`, `ejecutado_parcialmente`, `no_ejecutado`) | | D-220; AMD-40 |
| `observaciones` | text NULL | | D-221 |
| `requiere_seguimiento`, `fecha_seguimiento` | | | D-222, D-223 |
| `estado_revision` | text CHECK (`pendiente_revision`, `aprobado`, `rechazado`) NULL | solo si la OT requiere revisión | D-225 |
| `revisado_por`, `fecha_revision`, `observaciones_revision`, `requiere_correccion`, `fecha_limite_correccion` | | condicionales | D-226 a D-230 |

Evidencia obligatoria en `photos` (D-224). Cierre automático de la OT (RG "Revisión de mantenimiento"): sin revisión, al registrar `ejecutado_completamente` con evidencia; con revisión, al registrar `aprobado`. Si se rechaza, la corrección es un nuevo registro con el mismo `work_order_id`.

### 3.12 `incidents` (adaptada) e `incident_reporters` (nueva)
`incidents`:

| Columna | Tipo | Regla | Origen |
|---|---|---|---|
| `id`, `codigo_incidencia` (`INC-000000`) | | se conserva | D-174 |
| `tree_id` | uuid FK **NOT NULL** | entrada por QR | D-175; AMD-34 |
| `project_id` | uuid FK NOT NULL | el del árbol (para RLS) | técnico |
| `fecha_reporte` | date | | D-176 |
| `origen_reporte` | text CHECK (`comunidad`, `municipalidad`, `bomberos`, `otro_organismo`) | hoy siempre `comunidad` | D-177 |
| `tipo_incidencia`, `descripcion` | | | D-180, D-181 |
| `ubicacion` | text | copia de `ubicacion_descriptiva` del árbol al reportar | D-182 |
| `estado_incidencia` | text CHECK (`ingresada`, `en_revision`, `derivada`, `resuelta`, `descartada`) | códigos actuales conservados (PR-021) | D-184 |
| `fecha_revision`, `revisado_por` (Usuario municipal), `resultado_revision`, `observaciones_revision`, `prioridad_municipal` | | condicionales | D-185 a D-189 |
| `fecha_actualizacion_estado` | timestamptz | | D-190 |

Se retiran `reportado_por_user_id`, `observacion`, `actualizado_por` y `prioridad` (reemplazados por los campos de arriba).

`incident_reporters` (datos personales, PR-022):

| Columna | Tipo | Regla | Origen |
|---|---|---|---|
| `incident_id` | uuid PK FK `incidents` ON DELETE CASCADE | | técnico |
| `nombre_reportante` | text NOT NULL, ≤ 100 caracteres | | D-178 |
| `rut_reportante` | text NOT NULL, formato y dígito verificador | | D-179 |

- Separada para que la RLS la muestre **solo al Usuario municipal** miembro del proyecto (§6).
- Trigger: al registrar `resultado_revision` = `validada` o `descartada`, **se borra la fila** (nombre y RUT). Con `requiere_antecedentes` se conserva.
- Los respaldos de la base pueden conservar el dato hasta su rotación: se documenta como límite.

### 3.13 `photos` (adaptada)
| Columna | Tipo | Regla | Origen |
|---|---|---|---|
| `id`, `storage_path`, `uploaded_by`, `created_at` | | se conservan | ADR-011 |
| `tree_id` | uuid FK NOT NULL | | D-27 |
| `inspection_id`, `maintenance_record_id`, `incident_id` | uuid FK NULL | CHECK: a lo más uno | D-27, D-206, D-224, D-183 |
| `vista` | text CHECK (`arbol_completo`, `base`, `tronco`, `copa`) NULL | las 4 son obligatorias para finalizar una inspección | D-27; PR-010 v3.0 |

## 4. Valores derivados (vistas)
| Vista | Qué entrega | Origen |
|---|---|---|
| `v_tree_presence` | `estado_presencia` y `fecha_cambio_estado_presencia`: Presente desde `fecha_registro`; Talado o Retirado con OT completada + mantenimiento `aprobado` de Tala o Retiro_tocón (`fecha_revision`) | D-28, D-29; PR-020 v1.1 |
| `v_inspections` | inspección + `nivel_riesgo` = riesgo efectivo de su evaluación | D-200 |
| `v_tree_current_assessment` | evaluación vigente del árbol: la de la OT completada más reciente (`fecha_completada_ot`) cuya inspección no está anulada. Como sus resultados se calcularon con `variables_calculo`, ya incorporan los valores vigentes de las inspecciones anteriores | D-242 L; RG "Historial y vigencia"; CC-031; CC-040 |
| `v_species_traits` | árbol + rasgos del catálogo por `especie_cientifica` normalizada ("Origen no determinado" si no hay especie) | D-257 a D-262; CC-039 |
| `v_upcoming_inspections` | por proyecto: próximas inspecciones y monitoreos, con inicio y término del rango, desde la fecha de inicio | D-202, D-203; CC-037 |

## 5. Funciones de base y lógica que se queda en el backend

### 5.1 Vigencia de los datos del árbol
`fn_refresh_tree_current(tree_id)`: **por cada campo**, copia en `trees` el valor de la versión más reciente (OT completada, inspección no anulada) que registró ese campo; si ninguna lo registró, el del alta (CC-040). Se llama al completar una OT y al anular una inspección. Es la única vía de escritura de los valores vigentes. `vigente_desde_inspection_id` pasa a ser la última inspección que aportó algún valor.

### 5.2 Generadores y controles
- Secuencias de códigos: `OT-I-`, `OT-M-`, `INS-`, `MAN-` (nuevas); `INC-` y `A-` (existentes).
- Triggers de control: `requiere_revision_inspector` fijo para Tala y Retiro_tocón; OT no `completada` con inspecciones `preguardado`; `anulado` solo desde `finalizado`; borrado de `incident_reporters`.

### 5.3 En el backend, no en SQL
El motor de reglas (R01–R04, M01–M05; PR-011 v3.0), la validación por DICCIONARIO_CAMPOS, el cálculo de `estado_registro` (completitud), las fechas sugeridas (CC-037) y el cierre automático de las OT de Mantenimiento. La base solo protege invariantes con `CHECK` y triggers.

## 6. RLS por rol (CC-033)
**Escritura:** ninguna política INSERT, UPDATE ni DELETE para `authenticated` ni `anon` en ninguna tabla de datos, y se revocan esos privilegios. El backend escribe con la credencial de servicio después de autorizar. El formulario ciudadano (PR-022) también pasa por el backend.

**Lectura** (`authenticated`):

| Tabla | Administrador | Usuario municipal | Inspector | Encargado de mantención |
|---|---|---|---|---|
| `projects` | todos | sus proyectos | sus proyectos | sus proyectos |
| `project_members` | todos | filas propias | filas propias | filas propias |
| `sectors`, `trees`, `tree_data_versions`, `work_orders`, `inspections`, `evaluations`, `classification_adjustments`, `maintenance_records`, `incidents`, `photos` | todos (solo lectura, AMD-02) | su proyecto | su proyecto | su proyecto |
| `incident_reporters` | **no** | **su proyecto** | **no** | **no** |
| `species` | sí | sí | sí | sí |
| `user_profiles` | todos | propio (PA-08 sigue pendiente) | propio | propio |

**Funciones de apoyo:** se conservan `get_user_role`, `is_admin` e `is_project_member`; `is_municipal_member` sigue para `incident_reporters`; se agrega `has_project_role(project_id, roles[])`.

**Permisos de escritura del backend por rol** (capa 1, `authorization.service.ts`; Fase 6):
- **Usuario municipal:** alta de árbol; OT; estado de OT de Inspección; revisión de incidencias.
- **Inspector:** inspecciones, evaluaciones, versiones de datos del árbol, ajustes, anulación, catálogo de especies, revisión de mantenimiento.
- **Encargado de mantención:** `maintenance_records` de sus OT y su evidencia.
- **Administrador:** proyectos, miembros y sectores.

## 7. Plan de migración (Fase 4) y reversión
Todos los datos actuales son simulados (CC-038), así que **no se convierten**: se descartan con autorización y la estructura nueva se crea vacía.

| Paso | Contenido | Reversión |
|---|---|---|
| 0 | Respaldo de `valpo-verde-conecta` (procedimiento probado el 2026-10-20) y reactivación de `valpo-verde-conecta-pruebas` **con tu confirmación** | — |
| 1 | Inventario de solo lectura y **limpieza autorizada** de los datos simulados (orden de FK, una transacción) | restaurar el respaldo |
| 2 | `012_roles_y_catalogo`: roles nuevos, `species` adaptada | `012.down.sql` |
| 3 | `013_sectores_y_arboles`: `sectors`, `trees` adaptada, `tree_data_versions`, `fn_refresh_tree_current` | `013.down.sql` |
| 4 | `014_ot_inspeccion_evaluacion`: `work_orders`, `inspections` adaptada, `evaluations`, `classification_adjustments`, `maintenance_records`, secuencias y triggers | `014.down.sql` |
| 5 | `015_incidencias_y_fotos`: `incidents` adaptada, `incident_reporters`, `photos` adaptada | `015.down.sql` |
| 6 | `016_vistas`: vistas de §4 | `016.down.sql` |
| 7 | `017_rls_cc033`: RLS de §6 y revocación de escritura | `017.down.sql` (restaura las políticas actuales) |
| 8 | Seed de desarrollo (`database/seeds/dev/`, solo bases de prueba) | vaciar las tablas |
| 9 | `018_retiro` **(aparte, con autorización)**: retiro de `tree_measurements`, `fn_create_tree_with_measurement`, `tree_risk_assessments`, `tree_infrastructure_assessments`, `maintenance`, las 6 tablas de 001, `infrastructure_conflicts`, `public_spaces` y las columnas antiguas de `trees` e `incidents` (CC-041) | restaurar el respaldo |

- **Orden de aplicación:** primero en `valpo-verde-conecta-pruebas`, con las pruebas W1–W12 y las de cada `down`; después en `valpo-verde-conecta`.
- Cada migración es aditiva salvo la 9. Cada `down` se prueba aplicándolo y volviendo a aplicar la migración.
- `schema.sql` se actualiza al final de cada paso.
- El historial de Supabase registra 007 a 011; 001 a 006 se aplicaron a mano (E1). Las nuevas se registran con `apply_migration`.

## 8. Lo que no cubre este diseño
INDICES (DM-09) · historial de eventos de OT e incidencias (PA-27) · visibilidad de nombres entre miembros (PA-08) · producción (se crea vacía cuando la plataforma esté lista, ADR-013).

## 9. Respuestas incorporadas (revisión 2) y lo que queda abierto
| # | Respuesta de la autora | Dónde |
|---|---|---|
| 1 | La delimitación es obligatoria y se carga al crear el proyecto | §3.3, §3.5; PR-004 v7.0; CC-041 |
| 2 | Todo lo que no está en el Excel se elimina | §2, §7 paso 9; CC-041 |
| 3 | Alcance según el tipo de inspección y vigencia por dato | §3.6, §3.9, §4, §5.1; CC-040; PR-009 v5.0 |
| 4 | Ajuste solo antes de finalizar | §3.10; PR-009 v5.0 |
| 5 | `motor_commit` | §3.9 |
| 6 | `codigo_usuario` `USR-000` | §3.1 |

**Abierto (CC-040), no bloquea el modelo físico:**
- (a) Los campos de cada subtipo de Monitoreo (Fitosanitario, Estructural, Vitalidad). Hay una propuesta en la ficha.
- (b) En la Evaluación instrumental, las cavidades internas solo admiten Sí o No.
- (c) Si falta un valor vigente que una clasificación necesita, esa clasificación queda No determinado.
- (d) Si las 4 vistas fotográficas se exigen también en las inspecciones parciales.
