# Plan de validación funcional — CC-052, B6, CC-051, #63 y B8

> **Estado:** plan, sin ejecutar. No implementa nada. Preparado el 2026-11-02 sobre `feature/fase6-backend-api` = `2174243`.
> Los resultados se registran en `docs/registro-pendientes.md` (§1 y §5) a medida que se ejecuten.

## 0. Qué está probado y qué no

| Bloque | Probado en Jest (datos simulados) | Probado en Supabase de pruebas (SQL real) | Desplegado en la API publicada | Validado (Valej, API) |
|---|---|---|---|---|
| CC-052 árbol nuevo en Levantamiento | Sí | Sí, la función 018f (L1–L7, 2026-10-23); la llamada del backend nunca corrió contra la base | **No** (`release/demo` = `3d717ce`) | No |
| B6 OT vencidas | Sí | No (es una consulta; nunca corrió contra la base) | No | No |
| CC-051 avisos | Sí | **Sí, la 033** (N1–N9, dos rondas, 2026-11-02); los endpoints nunca corrieron contra la base | No | No |
| #63 recordatorios | Sí | Parcial: N4 (sin duplicados) sí; la generación desde B5 nunca corrió contra la base | No | No |
| B8 infraestructura | Sí | No | No | No |

**Importante — efecto ya activo en la API de la presentación:** la API publicada (`release/demo`) usa la misma base de pruebas. Desde que se aplicó la 033, **cancelar o reasignar una OT desde la API publicada ya crea avisos** en `notifications` (el código viejo no los muestra, pero la base sí los guarda). Si el trigger fallara, esa API respondería 500 genérico en vez del 503 del código nuevo. Riesgo bajo (N1–N9 OK), pero existe. Hoy la tabla tiene 0 avisos.

## 1. Requisitos para ejecutar

1. **Un backend con el código `2174243` contra la base de pruebas.** La API publicada no sirve: corre `3d717ce`. Opciones (decide Valej):
   - **(a) Local (recomendada):** clonar o actualizar `feature/fase6-backend-api`, `.env` de pruebas (`SUPABASE_URL` de `gmlbmyreoxgoqrolhyxo`, claves), `npm ci` y `npm run dev`. API en `http://localhost:<puerto>/api/sivu`.
   - **(b) Despliegue de vista previa** de la rama en Vercel, si el proyecto lo permite, apuntando a la base de pruebas. Nunca a `release/demo`.
2. **Cuatro sesiones reales** del proyecto «QA Fase 7 — proyecto de prueba del frontend» (activo): Usuario municipal, dos Inspectores, Encargado de mantención (ya son miembros). Más un Administrador, y un usuario **no miembro** para los casos de permisos.
3. **Datos de QA** (se crean por la API con los flujos existentes; quedan **permanentes** en la base de pruebas y se marcan como simulados en el registro):
   - una OT de Levantamiento sin árbol en QA Fase 7, asignada a un Inspector y En ejecución (hoy no hay ninguna);
   - una OT de Inspección desechable para cancelar y otra para reasignar;
   - una OT Programada con fecha anterior a hoy (en QA Fase 7 no hay; en el Piloto hay 1 vencida, que se puede leer sin modificarla).
4. **Recordatorios (#63):** hoy **ningún** árbol tiene `recordatorio_activo` (el inicio más próximo es el 2026-11-13, A-000423 del Piloto). El caso positivo no se puede validar hoy sin crear datos que adelanten una fecha; se propone validarlo el 2026-11-13 o después (ver §2.4).
5. Herramienta: PowerShell 7 con `Invoke-RestMethod` (sin el alias `H`).

```powershell
$api = "http://localhost:3000/api/sivu"   # o la URL de la vista previa
$P   = "<id del proyecto QA Fase 7>"
$tok = @{ municipal = "<token>"; inspector = "<token>"; inspector2 = "<token>"; encargado = "<token>"; admin = "<token>"; ajeno = "<token>" }
function Llamar($rol, $metodo, $ruta, $cuerpo = $null) {
  $p = @{ Method = $metodo; Uri = "$api$ruta"; Headers = @{ Authorization = "Bearer $($tok[$rol])" }; ContentType = "application/json"; SkipHttpErrorCheck = $true; StatusCodeVariable = "sc" }
  if ($cuerpo) { $p.Body = ($cuerpo | ConvertTo-Json -Depth 8) }
  $r = Invoke-RestMethod @p
  [pscustomobject]@{ status = $sc; body = $r }
}
```

## 2. Casos por bloque, en orden de prioridad

Prioridad: 1 = sin datos nuevos ni efectos permanentes; 2 = crea datos de QA; 3 = depende de fechas o del frontend.

### 2.1 B8 Infraestructura — prioridad 1 (solo lectura)

| # | Rol | Petición | Esperado |
|---|---|---|---|
| B8-1 | Usuario municipal | `GET /projects/$P/infraestructura` | 200; `cobertura.arboles_con_evaluacion_valida` = árboles evaluados (hoy 1 en QA, 4 en el Piloto); cada árbol con 6 componentes y clasificación con etiqueta |
| B8-2 | Inspector, Encargado | ídem | 200, mismo contenido |
| B8-3 | Administrador | ídem | 200 |
| B8-4 | No miembro | ídem | 403 |
| B8-5 | Sin token | ídem | 401 |
| B8-6 | Usuario municipal | `?clasificacion=alto`; `?componente=vereda&categoria=leve` | 200; `arboles` filtrado; `resumen` igual al de B8-1 |
| B8-7 | Usuario municipal | `?componente=vereda` (sin categoría); `?clasificacion=rojo`; `?x=1` | 400 con el mensaje del contrato |
| B8-8 | Usuario municipal | Comparar con la ficha (B2) del mismo árbol | Misma clasificación y ajuste que `evaluacion_vigente` |

### 2.2 B6 OT vencidas — prioridad 1 (lectura) y 2 (con dato nuevo)

| # | Rol | Petición | Esperado |
|---|---|---|---|
| B6-1 | Usuario municipal (Piloto) | `GET /projects/<Piloto>/work-orders?solo_vencidas=true` | 200; la OT Programada con fecha pasada, `vencida: true`; `total` = 1 |
| B6-2 | Usuario municipal | `GET /projects/$P/work-orders` | Cada OT trae `vencida`; ninguna En ejecución ni Pendiente con `true` |
| B6-3 | Inspector responsable | `GET /work-orders/mine?solo_vencidas=true` | Solo sus OT vencidas |
| B6-4 | Encargado | `GET /projects/$P/work-orders?tipo_ot=inspeccion&solo_vencidas=true` | 403 (regla vigente de B3) |
| B6-5 | Cualquiera | `?solo_vencidas=si`; `?estado=vencida` | 400 (no es un estado) |
| B6-6 | — | Programar hoy una OT de QA y repetir B6-2 mañana | Hoy `false`; mañana `true` (límite: hoy no está vencida) |
| B6-7 | Usuario municipal | Ficha (B2) de un árbol con OT vencida | La OT en `ordenes_trabajo` trae `vencida: true` |

### 2.3 CC-051 Avisos — prioridad 2 (crea datos)

| # | Rol | Paso | Esperado |
|---|---|---|---|
| A-1 | Inspector | `GET /notificaciones` antes de todo | 200; `total` 0; `recordatorios_generados` 0 (no es Usuario municipal) |
| A-2 | Usuario municipal | Reasignar la OT desechable del Inspector 1 al Inspector 2 (`PATCH /work-orders/:id/responsable`) | 200 |
| A-3 | Inspector 2 | `GET /notificaciones` | Aviso `ot_reasignada_nuevo` con el código de la OT; `no_leidas` 1 |
| A-4 | Inspector 1 | `GET /notificaciones` | Aviso `ot_reasignada_anterior` |
| A-5 | Usuario municipal | Cancelar la otra OT con motivo (`POST /work-orders/:id/cancelar`) | 200 |
| A-6 | Responsable de esa OT | `GET /notificaciones` | Aviso `ot_cancelada` con el motivo |
| A-7 | Encargado / otro Inspector | `GET /notificaciones` | No ven avisos ajenos |
| A-8 | Inspector 2 | `PATCH /notificaciones/<id>/leida` | 200; `leida: true`; `no_leidas` baja a 0 |
| A-9 | Inspector 1 | `PATCH` sobre el aviso del Inspector 2 | 404 (no revela que existe) |
| A-10 | Inspector 2 | `PATCH` repetido | 200; no cambia `leido_at` |
| A-11 | Cualquiera | `?solo_no_leidas=si`; `PATCH /notificaciones/no-uuid/leida` | 400 |
| A-12 | Usuario municipal | Programar o iniciar una OT (transiciones existentes) | Ningún aviso nuevo |
| A-13 | — | Escritura directa con la clave anónima o el JWT contra `/rest/v1/notifications` (opcional, Supabase REST) | Rechazada (RLS/privilegios; ya cubierto por N8/N9) |

### 2.4 #63 Recordatorios — prioridad 3 (depende de fechas)

| # | Rol | Paso | Esperado |
|---|---|---|---|
| R-1 | Usuario municipal | `GET /notificaciones` hoy | `recordatorios_generados` 0 (no hay `recordatorio_activo` hasta el 2026-11-13) |
| R-2 | Inspector / Encargado | ídem | `recordatorios_generados` 0 (solo Usuario municipal) |
| R-3 | Usuario municipal del Piloto | El 2026-11-13 o después: `GET /notificaciones` | Recordatorio `recordatorio_inspeccion` de A-000423 (monitoreo); `recordatorios_generados` 1 |
| R-4 | ídem | Repetir R-3 dos veces, y dos llamadas simultáneas (`Start-Job`) | Sigue 1 recordatorio (sin duplicados) |
| R-5 | ídem | Comparar con `GET /projects/<Piloto>/upcoming-inspections?solo_activos=true` | Mismos árboles, tipo e inicio (B5 sin cambios) |

Alternativa para no esperar: crear con los flujos existentes una evaluación de QA cuyo plazo deje el inicio en el pasado. Requiere decisión de Valej, porque modifica la evaluación vigente de un árbol de QA.

### 2.5 CC-052 Árbol nuevo en Levantamiento — prioridad 2 (crea un árbol permanente)

Preparación: el Usuario municipal crea una OT de Levantamiento sin árbol (`POST /projects/$P/work-orders`, `accion_solicitada: "levantamiento"`, observaciones obligatorias, responsable Inspector 1); el Inspector la programa y la inicia (`PATCH /work-orders/:id/estado`).

| # | Rol | Paso | Esperado |
|---|---|---|---|
| L-1 | Inspector 1 | `GET /projects/$P/nearby-trees?utm_este=…&utm_norte=…&radio_m=20` | Lista de cercanos (el frontend decide si crear) |
| L-2 | Inspector 1 | `POST /work-orders/:id/inspections` con `tipo_inspeccion_realizada: "levantamiento"` y `nuevo_arbol` dentro del sector | 201; `arbol_nuevo: true`; `tree_id` nuevo; el árbol aparece en B1 con sus datos de alta |
| L-3 | Inspector 1 | `PATCH /inspections/:id` (guardado siguiente, sin `tree_id`) | 200; no crea otro árbol |
| L-4 | Inspector 1 | `nuevo_arbol` con coordenadas fuera del sector (en otra OT) | 422 «El árbol no se registró: …»; ningún árbol creado |
| L-5 | Inspector 1 | `tree_id` y `nuevo_arbol` juntos; `nuevo_arbol` sin especie ni nombre común | 400 |
| L-6 | Inspector 1 | `nuevo_arbol` en una OT que no es de Levantamiento | 422 |
| L-7 | Inspector 2 (no responsable) | L-2 sobre la OT del Inspector 1 | 422 (SV058: solo el Inspector responsable registra la inspección) |
| L-8 | Usuario municipal / Encargado | L-2 | 403 |
| L-9 | Inspector 1 → Usuario municipal | Finalizar la inspección y completar la OT | Datos técnicos vigentes; B19 lo cuenta como evaluado |

Requiere integración con el frontend para la experiencia completa: búsqueda de cercanos antes de crear, radio por defecto y confirmación.

## 3. Qué requiere el frontend

| Bloque | Se valida por API | Requiere frontend |
|---|---|---|
| B8 | Todo | Mapa y tablero del módulo Infraestructura |
| B6 | Todo | Distintivo «Vencida» y filtro en la agenda |
| CC-051 | Todo | Bandeja de avisos, contador de no leídos |
| #63 | Todo (con fechas) | Mostrar recordatorios en la bandeja |
| CC-052 | Todo | Flujo de búsqueda de cercanos → «crear árbol nuevo» con confirmación |
| B19 y B2 (publicados antes) | Todo | Renombres a `denominador_evaluados` y `evaluacion_completa_vigente` |

## 4. Criterio de cierre

Un bloque pasa a **Validado** en el registro cuando Valej ejecuta sus casos de prioridad 1 y 2 con resultado esperado, o anota la diferencia. Los datos creados se registran como simulados de QA (código de OT, de árbol y de inspección).
