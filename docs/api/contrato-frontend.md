# Contrato de la API `/api/sivu` para el frontend (B12)

Fuente: el código de `feature/fase6-backend-api` (= `release/demo`, desplegado en `https://sivu-api.vercel.app`).
Este documento describe **el estado vigente** de cada endpoint. Los cambios del día a día se anotan además en
[`docs/plan/coordinacion.md`](../plan/coordinacion.md) (fecha, qué cambió y commit). Cuando ambos difieran,
manda el código; avisar para corregir el documento.

Última revisión: 2026-10-31 (commit en `coordinacion.md`).

---

## 1. Reglas generales

### Autenticación

- El frontend obtiene la sesión con Supabase Auth (no contra este backend) y envía
  `Authorization: Bearer <access_token>` en cada solicitud.
- Nunca usa la clave `service_role`.
- `GET /api/auth/me` devuelve el usuario y su rol confirmados por el backend.
- **Excepción:** las rutas de `/api/sivu/conecta/*` son **públicas** (sin sesión, con límite de solicitudes por IP).

### Roles

| Código | Rol | Regla general |
|---|---|---|
| `admin` | Administrador | Crea proyectos y gestiona miembros. En los datos del proyecto, **solo lectura**. No ve nombre ni RUT de reportantes. |
| `usuario_municipal` | Usuario municipal | Miembro del proyecto: alta de árboles, crea, completa, cancela y reasigna OT, anula inspecciones, revisa incidencias, placas QR. |
| `inspector` | Inspector | Miembro: inspecciona las OT de Inspección **donde es el responsable actual**; completa y corrige especies. |
| `encargado_mantencion` | Encargado de mantención | Miembro: lecturas del proyecto; no ve OT de Inspección. Su flujo (#61 Mantenimiento) está pendiente. |

«Miembro» = activo y agregado al proyecto. El backend valida rol y membresía en cada solicitud;
además las lecturas pasan por la RLS de la base con el JWT del usuario (segunda capa).

### Formato

- Respuesta correcta: `{ "data": ... }`. Los listados paginados: `{ "data": [...], "total", "limit", "offset" }`.
- Error: `{ "error": "mensaje en español" }`. El mensaje se puede mostrar tal cual.
- Catálogos: los valores de lista llegan como `{ "codigo", "etiqueta" }` (o `null`). El frontend muestra la
  `etiqueta` y envía el `codigo`. Todas las listas vigentes: `GET /api/sivu/catalogs`.
- Fechas: `AAAA-MM-DD`; fecha y hora: ISO 8601 con zona.
- Paginación: `limit` (1 a 200, por defecto 50) y `offset` (por defecto 0).
- Respuestas con `Cache-Control: no-store` y sin ETag.

### Códigos de estado

| Código | Cuándo |
|---|---|
| 200 / 201 / 204 | Correcto (201 al crear; 204 sin cuerpo al borrar). |
| 400 | Datos inválidos (validación). El mensaje dice qué campo y por qué. |
| 401 | Sin token o token vencido. |
| 403 | Rol o membresía insuficiente. |
| 404 | No existe (o no es de ese proyecto). En Conecta, también para entradas mal formadas (misma respuesta). |
| 409 | Conflicto: proyecto cerrado (solo consulta), dato que ya existe, o la composición vigente cambió dos veces (reintentar). |
| 413 | Foto de más de 10 MB. |
| 422 | Una regla del negocio rechazó la acción (estado de la OT, inspección, campos obligatorios…). |
| 429 | Límite de solicitudes por IP (rutas públicas). |
| 503 | Servicio temporalmente no disponible (p. ej. no se pudo leer el perfil) o falta configuración del servidor. |
| 500 | Error inesperado (sin detalles internos). |

---

## 2. Proyectos, sector y miembros

| Método y ruta | Quién | Entrada | Respuesta |
|---|---|---|---|
| `GET /api/sivu/projects` | Todos (el Administrador ve todos; el resto, sus proyectos) | — | 200 `{ data: [proyecto] }` |
| `GET /api/sivu/projects/:id` | Miembros y Administrador | — | 200 `{ data }` con `sector.geometria_sector` en GeoJSON WGS84 (`MultiPolygon`) (B13) |
| `POST /api/sivu/projects` | Administrador | `{ nombre_proyecto, sector: { nombre_sector, geometria_sector } }` (`geometria_sector`: GeoJSON dibujado o archivo KML/KMZ en base64) | 201 `{ data }` |
| `POST /api/sivu/projects/sector-preview` | Administrador | Igual que `sector` | 200 vista previa; no guarda |
| `PATCH /api/sivu/projects/:id` | Administrador | `{ nombre_proyecto?, sector?: { nombre_sector?, geometria_sector? } }` (al menos uno) | 200 `{ data }` |
| `PATCH /api/sivu/projects/:id/estado` | Administrador | `{ estado_proyecto: "activo" \| "cerrado" }` | 200 `{ data }`. Cerrado = solo consulta (las escrituras responden 409). |
| `GET /api/sivu/projects/:id/members` | Administrador | — | 200 `{ data }` |
| `POST /api/sivu/projects/:id/members` | Administrador | `{ user_id }` | 201 `{ data }` |
| `DELETE /api/sivu/projects/:id/members/:userId` | Administrador | — | 204 |
| `GET /api/sivu/projects/:id/available-users?rol=` (B11) | Administrador | `rol` opcional (`admin`, `usuario_municipal`, `inspector`, `encargado_mantencion`) | 200 `{ data: [{ id, nombre, codigo_usuario, rol, activo }] }`: usuarios que aún no son miembros del proyecto, ordenados por nombre (incluye inactivos; el frontend decide cómo mostrarlos). 404 si el proyecto no existe. |
| `GET /api/sivu/projects/:id/assignable-members?rol=inspector` | Miembros y Administrador | `rol` opcional | 200 `{ data: [{ id, nombre, rol }] }` (B14) |

---

## 3. Árboles, inventario, especies y catálogos

| Método y ruta | Quién | Entrada | Respuesta |
|---|---|---|---|
| `POST /api/sivu/projects/:id/trees` | Usuario municipal | `{ sector, ubicacion_descriptiva, utm_este, utm_norte, especie_cientifica?, nombre_comun? }` (al menos uno de los dos últimos; UTM 19S) | 201 `{ data }`. 422 si el punto queda fuera del sector («El árbol no se registró…»). |
| `GET /api/sivu/projects/:id/trees` (B1) | Miembros y Administrador | `limit`, `offset`, `sector_id?`, `estado_ciclo_vida?` (`activo`, `retirado`, `tocon`), `busqueda?` (especie o nombre común, sin distinguir tildes ni mayúsculas) | 200 `{ data: [{ id, tree_code, sector_id, sector, ubicacion_descriptiva, utm_este, utm_norte, ubicacion: { lng, lat } \| null, especie_cientifica, nombre_comun, estado_ciclo_vida (código), ciclo_vida: { codigo, etiqueta }, fecha_registro, multifustal, numero_fustes, dap_cm (en multifustal, el DAP equivalente que calcula la plataforma), altura_total_m, riesgo: { codigo, etiqueta, ajustada } \| null, vigente_desde, qr_token? }], total, limit, offset }`. `qr_token` (token de la placa, PR-022 v2.0) viene **solo para el Usuario municipal**; para los demás roles, incluido el Administrador, el campo no viene. Dirección de la ficha pública: `CONECTA_URL_BASE/<qr_token>`. `riesgo` es el efectivo de la evaluación vigente (el ajustado por el Inspector si existe; si no, el calculado); `null` = sin evaluación. `vigente_desde` = fecha en que se completó la OT que aportó los datos vigentes; `null` si solo hay datos del alta. |
| `GET /api/sivu/projects/:id/trees/:treeId` (B2, ficha) | Miembros y Administrador | — | 200 `{ data: { arbol, sobre_la_especie, evaluacion_vigente, ultima_inspeccion_finalizada, historial, ordenes_trabajo, incidencias } }` (detalle abajo). 404 si el árbol no es del proyecto. |
| `GET /api/sivu/projects/:id/nearby-trees` (CC-052) | Miembros y Administrador | `utm_este`, `utm_norte` (UTM 19S, mismos rangos que el alta), `radio_m` (obligatorio; > 0 y hasta 1000), `limit?` (1 a 50; por defecto 20) | 200 `{ data: [{ id, tree_code, especie_cientifica, nombre_comun, ubicacion_descriptiva, utm_este, utm_norte, estado_ciclo_vida: { codigo, etiqueta }, distancia_m }] }`, del más cercano al más lejano, solo del mismo proyecto y dentro del radio. Para que el Inspector revise si el árbol ya existe antes de crearlo en un Levantamiento. El radio lo elige el frontend (CC-052); los topes son técnicos. |
| `GET /api/sivu/projects/:id/species?nombre=` | Miembros y Administrador | `nombre` obligatorio | 200 `{ data: [especie] }` (hasta 20; busca en la especie científica, sin tildes) |
| `PATCH /api/sivu/projects/:id/species/:speciesId` | Inspector | `{ genero?, familia?, origen_biogeografico?, persistencia_follaje?, tipo_hoja? }` | 200 `{ data }` |
| `PATCH /api/sivu/projects/:id/species/:speciesId/nombre` | Inspector | `{ especie_cientifica }` (nombre completo; no «Género sp.» ni «No determinado») | 200 `{ data }`; 409 si ya existe |
| `GET /api/sivu/catalogs` (B15) | Cualquier usuario con sesión | — | 200 `{ data }`: catálogos vigentes con `codigo`, `etiqueta`, `orden`, `padre` |

**Ficha del árbol (B2):**
- `arbol`: `id`, `tree_code`, `sector_id`, `ubicacion: { lng, lat } | null`, `estado_ciclo_vida: { codigo, etiqueta }`,
  `fecha_registro` y los valores vigentes de medición e identificación: `sector`, `ubicacion_descriptiva`, `utm_este`,
  `utm_norte`, `especie_cientifica`, `nombre_comun`, `multifustal`, `numero_fustes`, `dap_fustes_cm`, `dap_cm`,
  `altura_total_m`, `diametro_copa_ns_m`, `diametro_copa_eo_m`, `diametro_copa_m`, `copa_no_presenta`,
  `altura_primera_rama_m`, `altura_primera_rama_no_presenta`, `altura_base_copa_viva_m`,
  `altura_base_copa_viva_no_presenta`, `clase_edad` y `rango_edad_estimada_anios` (estos dos como `{ codigo, etiqueta }`).
- `arbol.area_proyectada_copa_m2` (INDICES fila 13; CC-016): π × (NS/2) × (EO/2) en m². «No presenta copa» (`copa_no_presenta: true`) = `0`; sin los dos diámetros, `null` (no medido). Solo si `evaluacion_completa_vigente` es `true`; si no, `null`.
- `estimacion_carbono_aereo_lenoso` (en desarrollo, **no publicado**; CC-069 v1): `{ valor, categoria, motivo, detalle, metodo, limitaciones }`. Con resultado, `valor` = `{ volumen_m3, biomasa_aerea_lenosa_kg, carbono_kg, co2e_kg, modelo: { id, version, variante, componente, fuente }, entradas: { dap_cm, altura_total_m, densidad_kg_m3, fraccion_carbono } }` y `categoria`/`motivo`/`detalle` son `null`. Sin resultado, `valor: null` con la categoría, el motivo y el detalle (mismos códigos que B19). Mostrar `restriccion_modelo` como «No estimable» y `sin_modelo` como «No estimable: sin modelo científico aplicable».
- `evaluacion_completa_vigente` (nuevo, 2026-11-02): `true` si el árbol tiene una evaluación completa (inicial, reevaluación o levantamiento) finalizada, con OT completada, no anulada y vigente. `false` = árbol sin evaluación válida: el frontend debe mostrar «sin evaluación», no «sin medición».
- `sobre_la_especie`: `genero`, `familia`, `origen_biogeografico`, `persistencia_follaje`, `tipo_hoja` (los tres
  últimos como `{ codigo, etiqueta }`; sin especie vigente: «Origen no determinado» y los otros dos `null`).
- `evaluacion_vigente`: igual que `vigente` de B18 (§6), o `null`.
- `ultima_inspeccion_finalizada`: igual que un elemento de B18 sin `vigente`, o `null`.
- `historial`: las versiones que fueron vigentes, de la más reciente a la más antigua: el alta y las inspecciones
  finalizadas de OT completadas. Cada una: `{ origen: "alta" | "inspeccion", vigente_desde, inspection_id,
  codigo_inspeccion, fecha_inspeccion, valores }`; `valores` trae solo los campos que registró esa versión.
- `ordenes_trabajo`: todas las OT del árbol, de todos los estados, con la misma forma que B3. **En la ficha se
  muestran todas a cualquier miembro** (decisión de la responsable, 2026-10-31; en B3 rige el filtro por rol de CC-061).
- `incidencias`: las del árbol, con la misma forma que B9 (`reportante` solo para el Usuario municipal).
- `presencia`: `{ codigo, etiqueta, desde }` (D-28, D-29): `presente`, `talado` o `retirado` y desde cuándo. Rige sobre
  `estado_ciclo_vida` (AM-22, 2026-11-01): solo cambia cuando el Inspector aprueba una Tala o un Retiro_tocón **ejecutado**.
- No incluye fotos (se piden por inspección, §5, o por ejecución de mantenimiento, §5 bis).

---

## 4. Órdenes de trabajo (OT)

Estados (`estado_ot`): `pendiente` → `programada` → `en_ejecucion` → `completada`; o `cancelada`.

| Método y ruta | Quién | Entrada | Respuesta |
|---|---|---|---|
| `POST /api/sivu/projects/:id/work-orders` | Usuario municipal | `{ tree_id (salvo levantamiento), accion_solicitada, subtipo_accion?, motivo?, prioridad?, observaciones? (obligatoria en levantamiento), responsable_accion_id, incident_id? }` | 201 `{ data }` |
| `GET /api/sivu/projects/:id/work-orders` (B3) | Miembros y Administrador. El Inspector ve solo las de Inspección donde es responsable; el Encargado, ninguna de Inspección (403 si las pide) | `estado?` (lista separada por coma; por defecto pendiente, programada y en ejecución), `tipo_ot?`, `limit`, `offset` | 200 `{ data: [OT], total, limit, offset }`; cada OT con `estado`, `accion`, `prioridad` en `{ codigo, etiqueta }`, `arbol`, `proyecto`, `responsable`, `inspector_revisor` (Mantenimiento con revisión; si no, `null`) y `acciones` del usuario: `programar`, `iniciar`, `trabajar` (Inspector) o `registrar_ejecucion` (Encargado) |
| `GET /api/sivu/work-orders/mine` (B4) | Cualquier miembro | `project_id?`, `estado?`, `tipo_ot?`, `limit`, `offset` | Igual que B3, solo las OT donde el usuario es el responsable |
| `PATCH /api/sivu/work-orders/:id/estado` | Responsable asignado: Inspector (Inspección) o Encargado de mantención (Mantenimiento) | `{ estado: "programada" \| "en_ejecucion", fecha_accion_programada? }` (fecha obligatoria al programar) | 200 `{ data }` |
| `POST /api/sivu/work-orders/:id/completar` | Usuario municipal | `{}` (la fecha la pone el Sistema) | 200 `{ data }`; 422 sin inspección finalizada o con un borrador; 409 si los datos cambiaron dos veces (reintentar) |
| `POST /api/sivu/work-orders/:id/cancelar` | Usuario municipal | `{ motivo_cancelacion }` (obligatorio) | 200 `{ data }`. Solo desde pendiente, programada o en ejecución. |
| `PATCH /api/sivu/work-orders/:id/responsable` | Usuario municipal | `{ responsable_accion_id }` (Inspector miembro y activo) | 200 `{ data }`. No en completada ni cancelada. |
| `GET /api/sivu/work-orders/:id/inspections` (B17) | Miembros y Administrador | — | 200 `{ data: [inspección con variables y campos_arbol] }` |

---

## 5 bis. Mantenimiento (#61; PR-020 v1.1; migración 031)

Flujo: el Usuario municipal crea la OT y elige al Encargado responsable (y, si requiere revisión, al Inspector revisor) →
el Encargado la programa y la inicia (`PATCH …/estado`) → registra la ejecución con fotos → sin revisión, el Sistema
completa la OT si el resultado es «Ejecutado completamente»; con revisión, el Inspector revisor aprueba (completa la OT)
o rechaza (la OT sigue en ejecución y el Encargado registra una **corrección como un registro nuevo**; los anteriores se
conservan). Tala y Retiro_tocón exigen revisión siempre. Completar a mano (`POST …/completar`) no aplica a Mantenimiento.

| Método y ruta | Quién | Entrada | Respuesta |
|---|---|---|---|
| `POST /api/sivu/projects/:id/work-orders/mantenimiento` | Usuario municipal | `{ tree_id, incident_id?, accion_solicitada, subtipo_accion? (obligatorio si la acción tiene subtipos), motivo?, prioridad, observaciones? (obligatoria con otra_intervencion), responsable_accion_id (Encargado), requiere_revision_inspector?, inspector_revisor_id? (obligatorio si requiere revisión) }` | 201 `{ data: { id, codigo_ot, estado_ot, requiere_revision_inspector, inspector_revisor_id } }`; 422 si una regla se rechaza |
| `PATCH /api/sivu/work-orders/:id/revisor` | Usuario municipal | `{ inspector_revisor_id }` | 200; solo OT con revisión y no cerradas |
| `GET /api/sivu/work-orders/:id/ejecuciones` | Miembros y Administrador | — | 200 `{ data: [ejecución] }`, de la más antigua a la más reciente (incluye las rechazadas) |
| `POST /api/sivu/work-orders/:id/ejecuciones` | Encargado responsable, OT en ejecución | `multipart/form-data`: `fecha_ejecucion`, `accion_ejecutada` (= la solicitada), `subtipo_ejecutado?`, `resultado`, `observaciones?`, `requiere_seguimiento` (`true`/`false`), `fecha_seguimiento?` (posterior a la ejecución), `fotos` (1 a 10 JPG/PNG, hasta 10 MB) | 201 `{ data: { id, codigo_mantenimiento, estado_revision, estado_ot } }`; 422 si hay otra ejecución pendiente de revisión |
| `PATCH /api/sivu/work-orders/:id/ejecuciones/:recordId/revision` | Inspector revisor asignado | `{ estado_revision: "aprobado" \| "rechazado", observaciones_revision? (obligatoria al rechazar), requiere_correccion, fecha_limite_correccion? (obligatoria si requiere corrección) }` | 200 `{ data: { id, estado_revision, estado_ot, estado_presencia } }`. Aprobar exige resultado «Ejecutado completamente». |
| `GET /api/sivu/work-orders/revisiones` | Inspector | `project_id?`, `solo_pendientes?` (`true`/`false`) | 200 `{ data: [OT con la forma de B3 + ejecucion_pendiente] }`: sus OT como revisor (CC-064 b) |

**Ejecución:** `{ id, codigo_mantenimiento, work_order_id, fecha_ejecucion, ejecutado_por, accion_ejecutada, subtipo_ejecutado,
resultado, observaciones, requiere_seguimiento, fecha_seguimiento, estado_revision, revisado_por, fecha_revision,
observaciones_revision, requiere_correccion, fecha_limite_correccion, created_at, fotos: [{ id, url, created_at }] }`;
los valores de lista como `{ codigo, etiqueta }` (catálogos `accion_mantenimiento`, `subtipo_mantenimiento`,
`resultado_mantenimiento`, `estado_revision`).

**Decisiones de Valej (2026-11-01):** revisor asignado al crear la OT (campo fuera del Excel, AM-23); una ejecución nueva solo
cuando no hay otra pendiente; aprobar exige resultado completo.

## 5. Inspecciones y fotos

Estados (`estado_registro`): `preguardado` (borrador) → `finalizado`; o `anulado`.

| Método y ruta | Quién | Entrada | Respuesta |
|---|---|---|---|
| `GET /api/sivu/projects/:id/inspection-form-schema?tipo=` (B16) | Miembros y Administrador | `tipo` | 200 esquema del formulario (campos, tipo, unidad, opciones, obligatoriedad, condición, etiquetas y secciones) |
| `POST /api/sivu/work-orders/:id/inspections` | Inspector responsable, OT en ejecución | `{ tipo_inspeccion_realizada, subtipo_inspeccion?, metodo_instrumental?, resultado_general?, requiere_mantenimiento?, observaciones?, variables, campos_arbol?, tree_id? }` | 201 `{ data }` con `inspection_id` |
| `PATCH /api/sivu/inspections/:id` | Inspector responsable | Mismo cuerpo, sin `tree_id` | 200 `{ data }` (actualiza el borrador; no duplica) |
| `POST /api/sivu/inspections/:id/photos` | Inspector responsable | `multipart/form-data`: `foto` (JPG/PNG, hasta 10 MB) y `vista` (`arbol_completo`, `base`, `tronco`, `copa`; opcional solo en Monitoreo) | 201 `{ data }` |
| `GET /api/sivu/inspections/:id/photos` | Miembros y Administrador | — | 200 `{ data }` con enlaces firmados de 10 minutos |
| `DELETE /api/sivu/inspections/:id/photos/:photoId` | Inspector responsable, inspección en borrador | — | 204 |
| `POST /api/sivu/inspections/:id/calcular` | Inspector responsable | `{ ajustes? }` | 200 `{ data }` con el resultado del motor, `puede_finalizar`, lo que falta y la `huella` |
| `POST /api/sivu/inspections/:id/finalizar` | Inspector responsable | `{ huella, ajustes?, fecha_proxima_inspeccion?, fecha_proximo_monitoreo?, justificacion_ajuste_fecha? }` | 200 `{ data }`. Exige las 4 fotos en Evaluación inicial, Reevaluación y Levantamiento. |
| `POST /api/sivu/inspections/:id/anular` | Usuario municipal | `{ motivo_anulacion }` | 200 `{ data }`. Solo finalizadas; si la OT está completada, recalcula la evaluación vigente. |

`ajustes`: `{ clasificacion_riesgo?, clasificacion_infraestructura?, clasificacion_prioridad? }`, cada uno
`{ valor_ajustado, justificacion_ajuste_clasificacion }` (justificación obligatoria).

---

## 6. Diagnóstico y Dashboard

| Método y ruta | Quién | Entrada | Respuesta |
|---|---|---|---|
| `GET /api/sivu/projects/:id/diagnosticos` (B18) | Miembros y Administrador | `tree_id?` | 200 `{ data: [ { tree_id, tree_code, especie_cientifica, nombre_comun, estado: "finalizado", inspection_id, codigo_inspeccion, work_order_id, tipo_inspeccion, subtipo_inspeccion, fecha_inspeccion, finalizada_at, requiere_mantenimiento, fecha_proxima_inspeccion, fecha_proximo_monitoreo, resultado, vigente } ] }`: un elemento por árbol con inspección finalizada (la última). |
| `GET /api/sivu/projects/:id/upcoming-inspections` (B5) | Miembros y Administrador | `solo_activos?` (`true`/`false`; por defecto todos) | 200 `{ data: [{ arbol: { id, tree_code, especie_cientifica, nombre_comun, ubicacion_descriptiva }, tipo: "inspeccion" \| "monitoreo", inicio, termino, inmediato_y_continuo, ajustada, nivel_riesgo: { codigo, etiqueta }, inspection_id, recordatorio_activo }] }`, ordenado por `inicio`. Detalle abajo. |
| `GET /api/sivu/projects/:id/resumen` (B7) | Miembros y Administrador | — | 200 `{ data: { arboles_total, por_ciclo_vida, georreferenciados, sin_georreferenciar, con_diagnostico, sin_evaluacion, por_riesgo, especies_distintas, especies_top, ot_por_estado, incidencias_por_estado } }`; los conteos por catálogo como `[{ codigo, etiqueta, total }]` |

**Próximas inspecciones y monitoreos (B5; CC-037)** — verificado en la API publicada el 2026-11-01; los intervalos quedan sujetos a la auditoría metodológica general: SIVU no agenda: avisa. Cada árbol con fecha vigente trae
una fila por tipo (D-202 inspección, D-203 monitoreo), solo de inspecciones finalizadas de OT completadas.
- `inicio`: la fecha vigente. `termino`: el fin del rango de la tabla de plazos para el riesgo de esa inspección;
  igual a `inicio` cuando el plazo es un solo valor o cuando el Inspector **ajustó** la fecha (`ajustada: true`);
  `null` con `inmediato_y_continuo: true` (Extremo en monitoreo).
- `recordatorio_activo`: el inicio ya llegó (fecha de Chile).
- Las dos reglas de arriba (fecha ajustada sin rango; todas las fechas con la marca) son decisiones de implementación de
  Valej (2026-11-01), registradas en CC-037 (`docs/registro-cambios.md`).

**Integrar la Agenda y los recordatorios (frontend):**
1. Agenda: `GET …/upcoming-inspections` (todas) y ubicar cada fila entre `inicio` y `termino`; `termino: null` con
   `inmediato_y_continuo` = «inmediato y continuo», sin fecha de fin.
2. Recordatorios / Dashboard: `GET …/upcoming-inspections?solo_activos=true` (las que ya avisan).
3. Etiquetas: `nivel_riesgo.etiqueta`; `tipo` es `inspeccion` (próxima inspección, D-202) o `monitoreo` (próximo monitoreo, D-203);
   el texto visible para `tipo` lo define el frontend o la responsable (no hay catálogo).
4. «Crear OT» (solo Usuario municipal): `POST /projects/:id/work-orders` con el `tree_id` de la fila, el responsable
   (`GET …/assignable-members?rol=inspector`) y la `accion_solicitada` que elija el Usuario municipal (el backend no la
   deduce del recordatorio). Para ver si el árbol ya tiene una OT abierta: la ficha (`GET …/trees/:treeId`, `ordenes_trabajo`).
5. Un recordatorio desaparece solo cuando una OT nueva se completa y deja otra fecha vigente; crear o programar la OT no lo quita.

**`vigente`** (evaluación vigente, ADR-017): `null` mientras ninguna OT del árbol esté completada. Si existe:
`{ evento, work_order_id, inspection_id, desde, requiere_revision_ajuste, resultado }`.
- `evento = "ot_completada"`: `work_order_id` es la OT completada e `inspection_id` es `null` (la vigente se arma
  campo por campo, con datos de una o más inspecciones).
- `evento = "inspeccion_anulada"`: `inspection_id` es la inspección anulada y `work_order_id` es `null`.
- Para mostrar «la inspección del diagnóstico», usar el `inspection_id` principal del elemento.

---

## 6 bis. Indicadores del inventario (B19; hoja INDICES; CC-016)

| Método y ruta | Quién | Entrada | Respuesta |
|---|---|---|---|
| `GET /api/sivu/projects/:id/indicadores` | Miembros y Administrador | `barrio?` (valor de `ARBOLES.sector`, D-7, tal como viene en `barrios`) | 200 `{ data }` (abajo). 400 con una query desconocida. |

`data`: `{ fecha_consulta, ambito: { tipo: "proyecto" | "barrio", barrio }, barrios: [string], cobertura: { arboles_registrados, arboles_presentes, arboles_con_evaluacion_valida, arboles_sin_evaluacion_valida }, numero_total_arboles, densidad_arborea, clases_diametricas, diametro_medio_copa, area_proyectada_copa, cobertura_taxonomica, riqueza_especies, abundancia_relativa, diversidad_shannon, diversidad_taxonomica_10_20_30, proporcion_origen }`.

- **Cambios incompatibles (2026-11-02)** respecto de lo publicado el 2026-11-01:
  - **Renombrados:** `clases_diametricas.denominador` → `denominador_evaluados`; `diametro_medio_copa.denominador_presentes` → `denominador_evaluados`; `area_proyectada_copa.denominador_presentes` → `denominador_evaluados`. Los nombres anteriores ya no vienen.
  - **Cambio de universo:** los tres indicadores biométricos se calculan solo con árboles evaluados (abajo); antes usaban todos los presentes.
  - **Cambio de significado sin cambio de nombre:** `clases_diametricas.sin_dap` y `n_sin_medicion` ya no cuentan árboles nunca evaluados (se informan en `cobertura.arboles_sin_evaluacion_valida`).
  - **Nuevos:** `cobertura.arboles_con_evaluacion_valida` y `cobertura.arboles_sin_evaluacion_valida`; en la ficha (B2, §3), `evaluacion_completa_vigente`, y `arbol.area_proyectada_copa_m2` es `null` cuando es `false`.
  - Sin cambios: `numero_total_arboles`, `densidad_arborea` y los indicadores de especies.
- **Universos (cambio del 2026-11-02, CC-016):**
  - **Inventario** (`numero_total_arboles`, `densidad_arborea`) y **diversidad** (bloque 2): árboles **presentes** (D-28). Los talados o retirados con OT completada y revisión aprobada quedan fuera.
  - **Biométricos** (`clases_diametricas`, `diametro_medio_copa`, `area_proyectada_copa`): solo los presentes con **evaluación completa válida y vigente**: evaluación inicial, reevaluación o levantamiento, finalizada, con OT completada (aprobada), no anulada, y con evaluación vigente del árbol (la de B18). Un árbol nunca evaluado **no** es «Sin DAP» ni «sin medición»: se cuenta en `cobertura.arboles_sin_evaluacion_valida`.
  - La fecha de referencia es la de la consulta.
- `numero_total_arboles`: `{ valor, unidad: "arboles" }`.
- `densidad_arborea`: `{ valor, unidad: "arboles_por_ha", numerador, superficie_m2, motivo }`. Solo por proyecto (superficie del sector, D-256); por barrio, o sin delimitación, `valor: null` y `motivo` con la razón.
- `clases_diametricas`: `{ denominador_evaluados, clases: [{ codigo, etiqueta, desde_cm, hasta_cm, arboles, porcentaje }], sin_dap: { arboles, porcentaje } }`. Once clases de INDICES (">0 a <10 cm" … "≥100 cm"; `hasta_cm` exclusivo, `null` en la última). El denominador son los evaluados; un evaluado sin DAP (dato inconsistente) va en «Sin DAP», así todo suma 100 %. `porcentaje: null` si no hay árboles evaluados.
- `diametro_medio_copa`: `{ valor, unidad: "m", n_validos, n_con_medicion, n_no_presenta_copa, n_sin_medicion, denominador_evaluados }`. «No presenta copa» cuenta como 0 m; un árbol evaluado sin medición (o con un solo diámetro) queda fuera y se cuenta en `n_sin_medicion`. `valor: null` sin datos válidos.
- `area_proyectada_copa`: `{ total_m2, unidad: "m2", n_con_area, n_no_presenta_copa, n_sin_medicion, denominador_evaluados }`. Suma de π × (NS/2) × (EO/2) de cada árbol con los dos diámetros (D-20, D-21). `total_m2: null` si ninguno los tiene.
- Valores sin redondear: el frontend los formatea. Nunca se reemplaza un dato faltante; se informa en los contadores.
- **Especies (bloque 2).** Identificado a nivel de especie = taxón determinado a nivel específico, incluidos híbridos («Platanus × hispanica» o «x») y variedades; **no** cuenta solo el género («Quercus sp.», «spp.», «cf.»). Se agrupa sin distinguir mayúsculas ni espacios, y las variedades, subespecies y cultivares en su especie. Si el árbol está vinculado al catálogo (`species_id`), manda el nombre del catálogo. Género, familia y origen salen del catálogo de especies (CC-053).
- `cobertura_taxonomica`: `{ presentes, identificados_especie, no_identificados_especie, porcentaje_identificados, con_genero_catalogo, con_familia_catalogo, con_origen_catalogo, identificaciones_provisionales, identificaciones_confirmadas, motivo_provisionales }`. Provisionales y confirmadas vienen `null` hasta que la base registre ese dato (migración pendiente).
- `riqueza_especies`: `{ valor, unidad: "especies", n_identificados, n_no_identificados }`.
- `abundancia_relativa`: `{ denominador, especies: [{ especie, arboles, porcentaje }], no_identificados: { arboles, porcentaje } }`, de mayor a menor. Denominador: todos los presentes.
- `diversidad_shannon`: `{ valor, riqueza, n_identificados, cobertura_identificacion }`. H′ con logaritmo natural sobre los identificados; `null` sin identificados.
- `diversidad_taxonomica_10_20_30`: `{ denominador, especie, genero, familia }`; cada nivel `{ umbral_porcentaje, taxones: [{ taxon, arboles, porcentaje, supera_umbral }], sin_dato: { arboles, porcentaje }, cumple }`. `cumple: null` si no hay ningún taxón con dato.
- `proporcion_origen`: `{ denominador, nativos, introducidos, origen_no_determinado }`, cada uno `{ arboles, porcentaje }`. Nativos = Nativa o Endémica. Si ningún presente tiene origen en el catálogo, los porcentajes de nativos e introducidos son `null` (no 0 %).
- **`estimacion_carbono_aereo_lenoso`** (en desarrollo, **no publicado**; CC-069 v1, pendiente de sincronización con el Excel):
  - `metodo` (versión, estado del CC, fracción de carbono 0,47 con su fuente, `factor_co2: "44/12"`, sin raíces, sin follaje, sin factor urbano) y `limitaciones` (textos).
  - `cobertura`: `presentes`, `universo_calculo` (presentes con evaluación completa válida y vigente), `con_resultado`, `por_categoria` (`fuera_del_universo`, `restriccion_modelo`, `dato_faltante_o_inconsistente`, `error_calculo`) y `motivos` (`no_presente`, `sin_evaluacion_valida`, `sin_modelo`, `palmera_sin_modelo`, `multifustal_no_admitido`, `fuera_de_rango`, `fuera_de_rango_altura`, `falta_dap`, `configuracion_fuste_no_determinada`, `resultado_invalido`).
  - `total`: `biomasa_aerea_lenosa_t`, `carbono_t` y `co2e_t`, por separado; `null` si ningún árbol tiene resultado (no 0).
  - Solo dos modelos aprobados (*Jacaranda mimosifolia* y *Liquidambar styraciflua*; Pillsbury et al. 1998). No es carbono total ni secuestro anual.
- Los demás indicadores ecosistémicos siguen fuera: el Excel los marca «Pendiente».

## 7. Incidencias (interno, B9)

Estados (`estado_incidencia`): `ingresada`, `en_revision`, `derivada`, `resuelta`, `descartada`.
Resultado de la revisión: `validada`, `requiere_antecedentes`, `descartada`.

| Método y ruta | Quién | Entrada | Respuesta |
|---|---|---|---|
| `GET /api/sivu/projects/:id/incidencias` | Miembros y Administrador | `estado?` (D-184), `origen?` (D-177), `tipo?` (D-180), `limit`, `offset` | 200 `{ data: [incidencia], total, limit, offset }` |
| `GET /api/sivu/projects/:id/incidencias/:incidentId` | Miembros y Administrador | — | 200 `{ data }`: la incidencia y `fotos: [{ id, url, created_at }]` (enlaces de 10 minutos) |
| `PATCH /api/sivu/projects/:id/incidencias/:incidentId/revision` | Usuario municipal | `{ estado_incidencia, resultado_revision?, observaciones_revision?, prioridad_municipal? }` | 200 `{ data }` (incidencia actualizada y `fotos_borradas`); 422 si la base rechaza la regla |

**Incidencia:** `{ id, codigo_incidencia, arbol: { id, tree_code, especie_cientifica, nombre_comun }, tipo_incidencia, descripcion,
ubicacion, fecha_reporte, origen_reporte, estado_incidencia, fecha_actualizacion_estado, resultado_revision,
observaciones_revision, prioridad_municipal, fecha_revision, revisado_por, cantidad_fotos, ot_derivadas, reportante }`.
- `origen_reporte`: `{ codigo, etiqueta }` (catálogo `origen_reporte`, D-177: Comunidad, Municipalidad, Bomberos, Otro organismo) o `null`.
- `revisado_por`: `{ id, nombre }` del miembro que revisó; si ya no es miembro, `{ id, nombre: null, fuera_del_proyecto: true }`; `null` sin revisión.
- `cantidad_fotos`: número de fotos del reporte (0 después de Descartada, que las borra).
- `ot_derivadas`: **todas** las OT creadas con esta incidencia, `[{ id, codigo_ot, estado: { codigo, etiqueta } }]`, de la más antigua a la más reciente (fecha de creación); `[]` si no hay. Reemplaza al `ot_derivada` que pedía el frontend.
- `reportante: { nombre, rut }` **solo para el Usuario municipal**; `null` para los demás roles y después de Validada o Descartada (se borran).

**Reglas de la revisión (Excel D-185 a D-189):** fuera de `ingresada`, `resultado_revision` es obligatorio;
`prioridad_municipal` es obligatoria con `validada` y no se acepta con otro resultado. El Sistema registra
`fecha_revision` y `revisado_por`. `descartada` borra también las fotos del reporte.
**Requiere antecedentes:** crear una OT de Inspección del árbol con `incident_id` (§4) y, con su resultado,
registrar Validada o Descartada.

| Método y ruta | Quién | Respuesta |
|---|---|---|
| `GET /api/sivu/projects/:id/placas-qr` | Usuario municipal | 200 PDF (`application/pdf`), 6 placas por página A4, una por árbol activo: QR a `CONECTA_URL_BASE/<qr_token>`, nombre común, especie y `tree_code` en letra chica. 503 si falta `CONECTA_URL_BASE` en el servidor; 404 sin árboles activos. |

---

## 8. Valpo Verde Conecta (público, sin sesión)

| Método y ruta | Límite por IP | Entrada | Respuesta |
|---|---|---|---|
| `GET /api/sivu/conecta/catalogos` | 60 por hora | — | 200 `{ data: { tipo_incidencia: [{ codigo, etiqueta, orden, padre }] } }` (D-180; misma forma que `GET /api/sivu/catalogs`). Solo ese catálogo: el resto sigue en `/api/sivu/catalogs`, con sesión. Para el selector del formulario ciudadano. |
| `GET /api/sivu/conecta/arboles/:qrToken` | 60 por hora | `qrToken` de la placa | 200 `{ data: { especie_cientifica, nombre_comun, ubicacion_descriptiva, sobre_la_especie: { especie_cientifica, genero, familia, origen_biogeografico, persistencia_follaje, tipo_hoja } } }` (los tres últimos como `{ codigo, etiqueta }` o `null`). 404 «No encontramos este árbol.» si no existe o está mal formado. |
| `POST /api/sivu/conecta/arboles/:qrToken/incidencias` | 10 por hora | `multipart/form-data`: `nombre_reportante` (letras, espacios y tildes; hasta 100), `rut_reportante` (con o sin puntos; se valida el dígito verificador), `tipo_incidencia` (catálogo `tipo_incidencia`), `descripcion` (obligatoria; hasta 2000), `fotos` (1 a 3 JPG/PNG, hasta 10 MB cada una) | 201 `{ data: { codigo_seguimiento, fecha_reporte } }`. **El código se muestra una sola vez**: no se puede recuperar. 400 con el motivo; 404 si el QR no existe; 409 si el proyecto está cerrado. |
| `POST /api/sivu/conecta/seguimiento` | 30 por hora | `{ "codigo": string }` en el cuerpo (nunca en la URL) | 200 `{ data: { estado_incidencia: { codigo, etiqueta } } }`. 404 «No encontramos un reporte con ese código.» si no existe, venció (90 días después de Resuelta o Descartada) o está mal formado. |

La ficha no entrega `tree_code`, coordenadas, riesgo ni ningún dato técnico. Las fotos ciudadanas se guardan sin metadatos.

**Límites por IP:** se cuentan en memoria, **por instancia** de Vercel, y se reinician cuando la instancia arranca de cero. No son una protección global garantizada: con varias instancias, una misma IP puede superar el número indicado. Aceptado para la demo (Valej, 2026-11-01); pendiente: contadores compartidos en PostgreSQL, con migración sujeta a autorización.

---

## 9. Pendiente o en revisión

- **B6** (OT
  «vencida»: sin definición), **B8** (lectura de infraestructura), **B19** (los 11 indicadores en §6 bis; falta registrar provisional/confirmada, con migración pendiente de autorización; los ecosistémicos siguen «Pendiente» en el Excel).
- **CC-052:** la búsqueda de cercanos está disponible; el radio por defecto y la pantalla los define el frontend.
- **Límites por IP de Conecta:** hoy en memoria, por instancia de Vercel (ver §8). Pendiente: contadores compartidos en PostgreSQL (opción A), con migración sujeta a autorización.
- Configuración pendiente en Vercel: `CONECTA_URL_BASE` (placas) y, si las vistas públicas se sirven desde
  otro dominio, `CORS_ORIGIN`.
