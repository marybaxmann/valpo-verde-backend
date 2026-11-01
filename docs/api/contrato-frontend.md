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
| `GET /api/sivu/projects/:id/trees` (B1) | Miembros y Administrador | `limit`, `offset`, `sector_id?`, `estado_ciclo_vida?` (`activo`, `retirado`, `tocon`), `busqueda?` (especie o nombre común, sin distinguir tildes ni mayúsculas) | 200 `{ data: [{ id, tree_code, sector_id, sector, ubicacion_descriptiva, utm_este, utm_norte, ubicacion: { lng, lat } \| null, especie_cientifica, nombre_comun, estado_ciclo_vida (código), ciclo_vida: { codigo, etiqueta }, fecha_registro, multifustal, numero_fustes, dap_cm (en multifustal, el DAP equivalente que calcula la plataforma), altura_total_m, riesgo: { codigo, etiqueta, ajustada } \| null, vigente_desde }], total, limit, offset }`. `riesgo` es el efectivo de la evaluación vigente (el ajustado por el Inspector si existe; si no, el calculado); `null` = sin evaluación. `vigente_desde` = fecha en que se completó la OT que aportó los datos vigentes; `null` si solo hay datos del alta. |
| `GET /api/sivu/projects/:id/trees/:treeId` (B2, ficha) | Miembros y Administrador | — | 200 `{ data: { arbol, sobre_la_especie, evaluacion_vigente, ultima_inspeccion_finalizada, historial, ordenes_trabajo, incidencias } }` (detalle abajo). 404 si el árbol no es del proyecto. |
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
- No incluye la presencia (Presente/Talado/Retirado: pendiente de AM-22) ni fotos (se piden por inspección, §5).

---

## 4. Órdenes de trabajo (OT)

Estados (`estado_ot`): `pendiente` → `programada` → `en_ejecucion` → `completada`; o `cancelada`.

| Método y ruta | Quién | Entrada | Respuesta |
|---|---|---|---|
| `POST /api/sivu/projects/:id/work-orders` | Usuario municipal | `{ tree_id (salvo levantamiento), accion_solicitada, subtipo_accion?, motivo?, prioridad?, observaciones? (obligatoria en levantamiento), responsable_accion_id, incident_id? }` | 201 `{ data }` |
| `GET /api/sivu/projects/:id/work-orders` (B3) | Miembros y Administrador. El Inspector ve solo las de Inspección donde es responsable; el Encargado, ninguna de Inspección (403 si las pide) | `estado?` (lista separada por coma; por defecto pendiente, programada y en ejecución), `tipo_ot?`, `limit`, `offset` | 200 `{ data: [OT], total, limit, offset }`; cada OT con `estado`, `accion`, `prioridad` en `{ codigo, etiqueta }`, `arbol`, `proyecto`, `responsable` y `acciones` permitidas |
| `GET /api/sivu/work-orders/mine` (B4) | Cualquier miembro | `project_id?`, `estado?`, `tipo_ot?`, `limit`, `offset` | Igual que B3, solo las OT donde el usuario es el responsable |
| `PATCH /api/sivu/work-orders/:id/estado` | Inspector responsable | `{ estado: "programada" \| "en_ejecucion", fecha_accion_programada? }` (fecha obligatoria al programar) | 200 `{ data }` |
| `POST /api/sivu/work-orders/:id/completar` | Usuario municipal | `{}` (la fecha la pone el Sistema) | 200 `{ data }`; 422 sin inspección finalizada o con un borrador; 409 si los datos cambiaron dos veces (reintentar) |
| `POST /api/sivu/work-orders/:id/cancelar` | Usuario municipal | `{ motivo_cancelacion }` (obligatorio) | 200 `{ data }`. Solo desde pendiente, programada o en ejecución. |
| `PATCH /api/sivu/work-orders/:id/responsable` | Usuario municipal | `{ responsable_accion_id }` (Inspector miembro y activo) | 200 `{ data }`. No en completada ni cancelada. |
| `GET /api/sivu/work-orders/:id/inspections` (B17) | Miembros y Administrador | — | 200 `{ data: [inspección con variables y campos_arbol] }` |

---

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
| `GET /api/sivu/projects/:id/resumen` (B7) | Miembros y Administrador | — | 200 `{ data: { arboles_total, por_ciclo_vida, georreferenciados, sin_georreferenciar, con_diagnostico, sin_evaluacion, por_riesgo, especies_distintas, especies_top, ot_por_estado, incidencias_por_estado } }`; los conteos por catálogo como `[{ codigo, etiqueta, total }]` |

**`vigente`** (evaluación vigente, ADR-017): `null` mientras ninguna OT del árbol esté completada. Si existe:
`{ evento, work_order_id, inspection_id, desde, requiere_revision_ajuste, resultado }`.
- `evento = "ot_completada"`: `work_order_id` es la OT completada e `inspection_id` es `null` (la vigente se arma
  campo por campo, con datos de una o más inspecciones).
- `evento = "inspeccion_anulada"`: `inspection_id` es la inspección anulada y `work_order_id` es `null`.
- Para mostrar «la inspección del diagnóstico», usar el `inspection_id` principal del elemento.

---

## 7. Incidencias (interno, B9)

Estados (`estado_incidencia`): `ingresada`, `en_revision`, `derivada`, `resuelta`, `descartada`.
Resultado de la revisión: `validada`, `requiere_antecedentes`, `descartada`.

| Método y ruta | Quién | Entrada | Respuesta |
|---|---|---|---|
| `GET /api/sivu/projects/:id/incidencias` | Miembros y Administrador | `estado?`, `limit`, `offset` | 200 `{ data: [incidencia], total, limit, offset }` |
| `GET /api/sivu/projects/:id/incidencias/:incidentId` | Miembros y Administrador | — | 200 `{ data }`: la incidencia y `fotos: [{ id, url, created_at }]` (enlaces de 10 minutos) |
| `PATCH /api/sivu/projects/:id/incidencias/:incidentId/revision` | Usuario municipal | `{ estado_incidencia, resultado_revision?, observaciones_revision?, prioridad_municipal? }` | 200 `{ data }` (incidencia actualizada y `fotos_borradas`); 422 si la base rechaza la regla |

**Incidencia:** `{ id, codigo_incidencia, arbol: { id, tree_code, especie_cientifica, nombre_comun }, tipo_incidencia, descripcion,
ubicacion, fecha_reporte, origen_reporte, estado_incidencia, fecha_actualizacion_estado, resultado_revision,
observaciones_revision, prioridad_municipal, fecha_revision, revisado_por, reportante }`.
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
| `GET /api/sivu/conecta/arboles/:qrToken` | 60 por hora | `qrToken` de la placa | 200 `{ data: { especie_cientifica, nombre_comun, ubicacion_descriptiva, sobre_la_especie: { especie_cientifica, genero, familia, origen_biogeografico, persistencia_follaje, tipo_hoja } } }` (los tres últimos como `{ codigo, etiqueta }` o `null`). 404 «No encontramos este árbol.» si no existe o está mal formado. |
| `POST /api/sivu/conecta/arboles/:qrToken/incidencias` | 10 por hora | `multipart/form-data`: `nombre_reportante` (letras, espacios y tildes; hasta 100), `rut_reportante` (con o sin puntos; se valida el dígito verificador), `tipo_incidencia` (catálogo `tipo_incidencia`), `descripcion` (obligatoria; hasta 2000), `fotos` (1 a 3 JPG/PNG, hasta 10 MB cada una) | 201 `{ data: { codigo_seguimiento, fecha_reporte } }`. **El código se muestra una sola vez**: no se puede recuperar. 400 con el motivo; 404 si el QR no existe; 409 si el proyecto está cerrado. |
| `POST /api/sivu/conecta/seguimiento` | 30 por hora | `{ "codigo": string }` en el cuerpo (nunca en la URL) | 200 `{ data: { estado_incidencia: { codigo, etiqueta } } }`. 404 «No encontramos un reporte con ese código.» si no existe, venció (90 días después de Resuelta o Descartada) o está mal formado. |

La ficha no entrega `tree_code`, coordenadas, riesgo ni ningún dato técnico. Las fotos ciudadanas se guardan sin metadatos.

---

## 9. Pendiente o en revisión

- **B5** (próximas inspecciones; requiere corregir una vista, AM-18), **B6** (OT
  «vencida»: sin definición), **B8** (lectura de infraestructura), **B19** (indicadores; depende de CC-016), **#61** Mantenimiento (depende de AM-22).
- Configuración pendiente en Vercel: `CONECTA_URL_BASE` (placas) y, si las vistas públicas se sirven desde
  otro dominio, `CORS_ORIGIN`.
