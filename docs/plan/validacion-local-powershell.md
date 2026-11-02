# Validación local por API con PowerShell (opción B, decisión de Valej 2026-11-02)

> Para ejecutar en el computador de Valej. Backend de desarrollo local contra **Supabase de pruebas** (`gmlbmyreoxgoqrolhyxo`), nunca contra la base real (`ytcxswbulsmboucardxa`) ni la API de `release/demo`.
> Ningún paso muestra claves ni tokens en pantalla. No los pegues en el chat ni en archivos versionados.
> Los casos y sus resultados esperados están en `plan-validacion-bloques-2026-11-02.md` §2 y §5.2. Esta guía dice **cómo** correrlos.

## 0. Requisitos

- Git, Node.js 20 o superior y PowerShell 7 (`pwsh`). Comprobar: `node -v`, `$PSVersionTable.PSVersion`.
- Las contraseñas de los usuarios de QA (Usuario municipal, Inspector 1, Inspector 2, Encargado; y si es posible un Administrador y un usuario no miembro del proyecto QA).
- En el panel de Supabase del proyecto **de pruebas**: URL, clave anónima y clave `service_role` (Project Settings → API).

## 1. Obtener el código

```powershell
cd <carpeta de trabajo>
git clone https://github.com/marybaxmann/valpo-verde-backend.git   # solo la primera vez
cd valpo-verde-backend
git fetch origin feature/fase6-backend-api
git checkout feature/fase6-backend-api
git pull origin feature/fase6-backend-api
git log -1 --format="%h %s"     # esperado: 2174243 (o posterior, si se autoriza publicar los commits locales)
```

Los commits locales posteriores (`84aaea8`, `791c050` y el de la 034) son solo de documentación y SQL propuesto: el código del backend es el mismo de `2174243`.

## 2. Crear el `.env` (no se versiona: `.gitignore` lo excluye)

```powershell
notepad .env
```

Contenido (completar los valores **en el editor**, nunca en la consola ni en el chat):

```
PORT=3000
CORS_ORIGIN=http://localhost:5173
SUPABASE_URL=https://gmlbmyreoxgoqrolhyxo.supabase.co
SUPABASE_ANON_KEY=<clave anónima del proyecto de pruebas>
SUPABASE_SERVICE_ROLE_KEY=<clave service_role del proyecto de pruebas>
MOTOR_COMMIT=<hash completo de git rev-parse HEAD>
```

`CONECTA_URL_BASE` se omite (solo afecta a las placas QR).

Comprobar que Git lo ignora: `git check-ignore .env` debe imprimir `.env`.

## 3. Comprobar que apunta SOLO a Supabase de pruebas (antes de arrancar)

Pegar en PowerShell. No imprime ninguna clave; se detiene si algo no corresponde.

```powershell
$PRUEBAS = "gmlbmyreoxgoqrolhyxo"; $REAL = "ytcxswbulsmboucardxa"
$envVars = @{}
Get-Content .env | Where-Object { $_ -match '^\s*([A-Z_]+)\s*=\s*(.*)$' } | ForEach-Object { $envVars[$Matches[1]] = $Matches[2].Trim() }
function Leer-Jwt($t) {
  $p = $t.Split('.')[1].Replace('-', '+').Replace('_', '/'); while ($p.Length % 4) { $p += '=' }
  [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($p)) | ConvertFrom-Json
}
$url = $envVars.SUPABASE_URL
if ($url -ne "https://$PRUEBAS.supabase.co") { throw "SUPABASE_URL no es el proyecto de pruebas. Detente." }
if ((Get-Content .env -Raw) -match $REAL) { throw ".env menciona la base real. Detente." }
foreach ($k in 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY') {
  $v = $envVars[$k]
  if (-not $v) { throw "$k vacía" }
  if ($v.Split('.').Count -eq 3) {
    $c = Leer-Jwt $v
    if ($c.ref -ne $PRUEBAS) { throw "$k pertenece a otro proyecto ($($c.ref)). Detente." }
    "$k OK: proyecto $($c.ref), rol $($c.role)"
  } else {
    "$k no es JWT (formato nuevo sb_...): se verifica solo la URL; una clave de otro proyecto será rechazada por Supabase."
  }
}
"SUPABASE_URL OK: $url"
```

Esperado: `SUPABASE_URL OK` y, para cada clave, `proyecto gmlbmyreoxgoqrolhyxo` con rol `anon` y `service_role`.

## 4. Instalar, revisar y arrancar

```powershell
npm ci
npm run typecheck
npm test            # Jest con datos simulados; no toca Supabase
```

En **otra** ventana de PowerShell (se queda corriendo):

```powershell
npm run dev
```

De vuelta en la primera ventana:

```powershell
Invoke-RestMethod http://localhost:3000/health     # esperado: status ok
```

## 5. Abrir las sesiones (tokens solo en memoria)

```powershell
$api  = "http://localhost:3000/api/sivu"
$anon = $envVars.SUPABASE_ANON_KEY
$tok  = @{}
function Abrir-Sesion($rol) {
  $correo = Read-Host "Correo de $rol"
  $clave  = Read-Host "Contraseña de $rol" -AsSecureString
  $plano  = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($clave))
  $r = Invoke-RestMethod -Method Post -Uri "$url/auth/v1/token?grant_type=password" -Headers @{ apikey = $anon } `
       -ContentType "application/json" -Body (@{ email = $correo; password = $plano } | ConvertTo-Json)
  $plano = $null
  $c = Leer-Jwt $r.access_token
  if ($c.iss -ne "$url/auth/v1") { throw "El token no es del proyecto de pruebas" }
  $tok[$rol] = $r.access_token
  [pscustomobject]@{ rol = $rol; user_id = $c.sub; vence = [DateTimeOffset]::FromUnixTimeSeconds($c.exp).LocalDateTime }
}
Abrir-Sesion municipal; Abrir-Sesion inspector; Abrir-Sesion inspector2; Abrir-Sesion encargado
# opcionales: Abrir-Sesion admin; Abrir-Sesion ajeno
```

Comprobar que los `user_id` coinciden con los de QA: municipal `395decaf-…`, inspector `141f83df-…`, inspector2 `defe22d7-…`, encargado `689c6e09-…`.
Los tokens vencen en una hora: si una llamada responde 401, repetir `Abrir-Sesion <rol>`.

```powershell
function Llamar($rol, $metodo, $ruta, $cuerpo = $null) {
  $p = @{ Method = $metodo; Uri = "$api$ruta"; ContentType = "application/json"; SkipHttpErrorCheck = $true; StatusCodeVariable = "sc" }
  if ($rol) { $p.Headers = @{ Authorization = "Bearer $($tok[$rol])" } }
  if ($cuerpo) { $p.Body = ($cuerpo | ConvertTo-Json -Depth 8) }
  $r = Invoke-RestMethod @p
  [pscustomobject]@{ status = $sc; body = $r }
}
$P      = "cddf7c71-6879-4c17-8498-a91d7baaa9b2"   # QA
$PILOTO = "18b647e8-7b5e-44a4-ac02-a5a6a2b4f7d8"   # solo lectura
$ARBOL  = "2d991022-cd7e-4aa5-a90f-2313ed26254c"   # A-000346 (QA)
$INSP1  = "141f83df-f609-4399-bf52-5d8721826097"; $INSP2 = "defe22d7-3aab-48fc-a9de-a2e206f60174"
```

Guardar la salida de cada caso (por ejemplo `... | ConvertTo-Json -Depth 8 | Out-File evidencias\B8-1.json`), en una carpeta fuera del repositorio o ignorada.

## 6. Casos, en el orden aprobado

### 6.1 B8 — solo lectura

```powershell
(Llamar municipal GET "/projects/$P/infraestructura").body | ConvertTo-Json -Depth 8   # B8-1: A-000346 crítico, 100 %
Llamar inspector GET "/projects/$P/infraestructura" | Select status                       # B8-2: 200
Llamar encargado GET "/projects/$P/infraestructura" | Select status                       # B8-2: 200
Llamar $null GET "/projects/$P/infraestructura" | Select status                           # B8-5: 401
Llamar municipal GET "/projects/$P/infraestructura?clasificacion=rojo" | Select status    # B8-7: 400
Llamar municipal GET "/projects/$P/infraestructura?componente=vereda" | Select status     # B8-7: 400
Llamar municipal GET "/projects/$P/infraestructura?x=1" | Select status                  # B8-7: 400
```

Con sesión del Piloto (si el Usuario municipal es miembro): A-000419 bajo 13,33; A-000426 y A-000423 bajo 8,33; A-000422 moderado 16,67.

### 6.2 B6 — lectura

```powershell
$r = Llamar municipal GET "/projects/$PILOTO/work-orders?solo_vencidas=true"; $r.status; $r.body   # B6-1: solo OT-M-000020, vencida true
$r = Llamar municipal GET "/projects/$P/work-orders"; $r.body.data | Select codigo_ot, estado_ot, fecha_accion_programada, vencida   # B6-2
Llamar inspector GET "/work-orders/mine?solo_vencidas=true" | Select status                # B6-3: 200
Llamar municipal GET "/projects/$P/work-orders?solo_vencidas=si" | Select status           # B6-5: 400
```

Las respuestas vienen dentro de `data` (listados: `data`, `total`; avisos: `data`, `total`, `no_leidas`, `recordatorios_generados`). Si un campo no aparece, mirar `$r.body | ConvertTo-Json -Depth 6`.

### 6.3 CC-051 — crea dos OT de QA (quedan permanentes; anotar sus códigos)

```powershell
# OT para reasignar
$a = Llamar municipal POST "/projects/$P/work-orders" @{ tree_id = $ARBOL; accion_solicitada = "monitoreo"; subtipo_accion = "fitosanitario"; prioridad = "baja"; motivo = "QA CC-051 reasignación"; responsable_accion_id = $INSP1 }
$a.status; $OT_A = $a.body.data.id; $a.body.data.codigo_ot
# OT para cancelar
$b = Llamar municipal POST "/projects/$P/work-orders" @{ tree_id = $ARBOL; accion_solicitada = "monitoreo"; subtipo_accion = "fitosanitario"; prioridad = "baja"; motivo = "QA CC-051 cancelación"; responsable_accion_id = $INSP1 }
$b.status; $OT_B = $b.body.data.id; $b.body.data.codigo_ot

Llamar inspector GET "/notificaciones" | % body                                            # A-1: total 0
Llamar municipal PATCH "/work-orders/$OT_A/responsable" @{ responsable_accion_id = $INSP2 } | Select status   # A-2: 200
Llamar inspector2 GET "/notificaciones" | % body                                           # A-3: ot_reasignada_nuevo
Llamar inspector GET "/notificaciones" | % body                                            # A-4: ot_reasignada_anterior

# Cancelación: mientras la 034 no esté aplicada, cancelar una OT PENDIENTE falla (defecto, §5.3).
Llamar municipal POST "/work-orders/$OT_B/cancelar" @{ motivo_cancelacion = "QA CC-051" } | Select status, body   # hoy: 400 chk_work_orders_fecha_programada
# Para probar el aviso hoy, el Inspector 1 la programa primero y luego se cancela:
Llamar inspector PATCH "/work-orders/$OT_B/estado" @{ estado = "programada"; fecha_accion_programada = (Get-Date).ToString("yyyy-MM-dd") } | Select status   # A-12: 200, sin aviso
Llamar municipal POST "/work-orders/$OT_B/cancelar" @{ motivo_cancelacion = "QA CC-051" } | Select status   # A-5: 200
Llamar inspector GET "/notificaciones" | % body                                            # A-6: ot_cancelada con el motivo
Llamar encargado GET "/notificaciones" | % body                                            # A-7: sin avisos ajenos

$n = (Llamar inspector2 GET "/notificaciones").body.data[0].id
Llamar inspector2 PATCH "/notificaciones/$n/leida" | % body                                # A-8: leida true
Llamar inspector PATCH "/notificaciones/$n/leida" | Select status                          # A-9: 404
Llamar inspector2 PATCH "/notificaciones/no-uuid/leida" | Select status                    # A-11: 400
```

Después de aplicar la 034 (si se autoriza): crear otra OT Pendiente y cancelarla directo → 200 y aviso `ot_cancelada`.

### 6.4 CC-052 — crea una OT de Levantamiento y un árbol permanente en QA

```powershell
$l = Llamar municipal POST "/projects/$P/work-orders" @{ accion_solicitada = "levantamiento"; prioridad = "baja"; observaciones = "QA CC-052"; responsable_accion_id = $INSP1 }
$l.status; $OT_L = $l.body.data.id; $l.body.data.codigo_ot
Llamar inspector PATCH "/work-orders/$OT_L/estado" @{ estado = "programada"; fecha_accion_programada = (Get-Date).ToString("yyyy-MM-dd") } | Select status
Llamar inspector PATCH "/work-orders/$OT_L/estado" @{ estado = "en_ejecucion" } | Select status
Llamar inspector GET "/projects/$P/nearby-trees?utm_este=255337&utm_norte=6340783&radio_m=20" | % body   # L-1
$nuevo = @{ sector = "QA"; ubicacion_descriptiva = "QA CC-052, árbol simulado"; utm_este = 255337.24; utm_norte = 6340783.63; nombre_comun = "Jacarandá" }
Llamar inspector2 POST "/work-orders/$OT_L/inspections" @{ tipo_inspeccion_realizada = "levantamiento"; variables = @{}; nuevo_arbol = $nuevo } | Select status   # L-7: 422
Llamar municipal  POST "/work-orders/$OT_L/inspections" @{ tipo_inspeccion_realizada = "levantamiento"; variables = @{}; nuevo_arbol = $nuevo } | Select status   # L-8: 403
Llamar inspector  POST "/work-orders/$OT_L/inspections" @{ tipo_inspeccion_realizada = "levantamiento"; variables = @{}; tree_id = $ARBOL; nuevo_arbol = $nuevo } | Select status   # L-5: 400
$i = Llamar inspector POST "/work-orders/$OT_L/inspections" @{ tipo_inspeccion_realizada = "levantamiento"; variables = @{}; nuevo_arbol = $nuevo }
$i.status; $i.body.data.arbol_nuevo; $i.body.data.tree_id                                             # L-2: 201, true, id nuevo
```

Anotar el código de la OT, el `tree_id` y el código del árbol nuevo. L-4 (fuera del sector) necesita una segunda OT de Levantamiento: hacerlo solo si se autoriza otro dato.

### 6.5 #63 — recordatorios

```powershell
(Llamar municipal GET "/notificaciones").body.recordatorios_generados    # R-1 hoy: 0
(Llamar inspector GET "/notificaciones").body.recordatorios_generados    # R-2: 0
```

R-3 a R-5 (caso positivo) el **2026-11-13 o después**, con el Usuario municipal del Piloto. No adelantar fechas.

## 7. Al terminar

1. Detener `npm run dev` (Ctrl+C) y cerrar PowerShell: los tokens desaparecen con la sesión.
2. No subir `.env` ni las evidencias con tokens.
3. Enviar a Claude los estados y cuerpos (sin tokens) para registrarlos en `plan-validacion-bloques-2026-11-02.md` §5 y en `registro-pendientes.md`, con los códigos de las OT y del árbol creados.
