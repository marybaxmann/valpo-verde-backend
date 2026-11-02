#Requires -Version 7.0
<#
.SYNOPSIS
  Validación por API de B8, B6, CC-051, CC-052, #63 y la migración 034 (SIVU).

.DESCRIPTION
  Corre contra el backend LOCAL (npm run dev) conectado a Supabase de PRUEBAS
  (gmlbmyreoxgoqrolhyxo). Instrucciones: docs/plan/validacion-api-script.md.

  - Modo Lectura (por defecto): no crea ni modifica datos.
  - Modo Escritura: además crea los datos mínimos de QA (3 OT, 1 árbol,
    1 inspección en borrador) y prueba avisos, cancelación (034) y
    Levantamiento. Pide confirmación escrita antes de crear nada.

  Seguridad:
  - Nunca imprime ni guarda contraseñas ni tokens. Las contraseñas se piden con
    Get-Credential; los tokens viven solo en memoria y se borran al terminar.
  - Se detiene si el .env o el backend no apuntan al proyecto de pruebas.
  - Solo actúa sobre las OT que crea; nunca modifica árboles ni OT preexistentes.
  - No altera fechas ni elimina datos.

  Resultado: PASS, FAIL o BLOCKED por caso, con evidencia JSON por caso, en la
  carpeta de salida (por defecto, fuera del repositorio).
#>
[CmdletBinding()]
param(
  [ValidateSet('Lectura', 'Escritura')]
  [string]$Modo = 'Lectura',
  [string]$BackendDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  [string]$Api = 'http://localhost:3000',
  [string]$Salida = (Join-Path $HOME ("sivu-validacion\" + (Get-Date -Format 'yyyyMMdd-HHmmss'))),
  [switch]$ConAdmin,
  [switch]$ConNoMiembro
)

$ErrorActionPreference = 'Stop'

# --------------------------------------------------------------------------
# Constantes de QA (base de pruebas)
# --------------------------------------------------------------------------
$PRUEBAS   = 'gmlbmyreoxgoqrolhyxo'
$REAL      = 'ytcxswbulsmboucardxa'
$P         = 'cddf7c71-6879-4c17-8498-a91d7baaa9b2'   # proyecto QA
$PILOTO    = '18b647e8-7b5e-44a4-ac02-a5a6a2b4f7d8'   # Piloto (solo lectura)
$ARBOL     = '2d991022-cd7e-4aa5-a90f-2313ed26254c'   # A-000346 (QA)
$UTM_E     = 255337.24; $UTM_N = 6340783.63           # centroide del sector QA
$CUENTAS = [ordered]@{
  municipal  = '395decaf-08d4-46d8-9299-d4be55ab8719'
  inspector  = '141f83df-f609-4399-bf52-5d8721826097'
  inspector2 = 'defe22d7-3aab-48fc-a9de-a2e206f60174'
  encargado  = '689c6e09-97e3-4d3a-a76d-19c9f4eb3054'
}
$INSP1 = $CUENTAS.inspector; $INSP2 = $CUENTAS.inspector2
$FECHA_RECORDATORIOS = [datetime]'2026-11-13'

# --------------------------------------------------------------------------
# Estado del script
# --------------------------------------------------------------------------
$script:Tok        = @{}
$script:Resultados = [System.Collections.Generic.List[object]]::new()
$script:Creados    = [System.Collections.Generic.List[object]]::new()
$script:OtPropias  = [System.Collections.Generic.HashSet[string]]::new()
$api = "$($Api.TrimEnd('/'))/api/sivu"

New-Item -ItemType Directory -Force -Path (Join-Path $Salida 'evidencias') | Out-Null

function Hoy-Chile {
  foreach ($id in 'America/Santiago', 'Pacific SA Standard Time') {
    try { return [TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([datetime]::UtcNow, $id).Date } catch { }
  }
  throw 'No se encontró la zona horaria de Chile en este equipo.'
}
$HOY = Hoy-Chile

function Valor($obj, [string]$ruta) {
  $actual = $obj
  foreach ($parte in $ruta.Split('.')) {
    if ($null -eq $actual) { return $null }
    $prop = $actual.PSObject.Properties[$parte]
    if ($null -eq $prop) { return $null }
    $actual = $prop.Value
  }
  return $actual
}

# ConvertFrom-Json puede convertir fechas a DateTime: se devuelven como AAAA-MM-DD.
function Fecha-Iso($v) {
  if ($v -is [datetime]) { return $v.ToString('yyyy-MM-dd') }
  return ([string]$v).Substring(0, 10)
}

function Leer-Jwt([string]$t) {
  $p = $t.Split('.')[1].Replace('-', '+').Replace('_', '/')
  while ($p.Length % 4) { $p += '=' }
  [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($p)) | ConvertFrom-Json
}

function Registrar($id, $bloque, $desc, $estado, $esperado, $obtenido, $evidencia = $null) {
  $fila = [pscustomobject]@{
    caso = $id; bloque = $bloque; descripcion = $desc; resultado = $estado
    esperado = $esperado; obtenido = $obtenido; evidencia = $evidencia
    hora = (Get-Date).ToString('s')
  }
  $script:Resultados.Add($fila)
  $color = switch ($estado) { 'PASS' { 'Green' } 'FAIL' { 'Red' } default { 'Yellow' } }
  Write-Host ("[{0,-7}] {1,-8} {2}  — {3}" -f $estado, $id, $desc, $obtenido) -ForegroundColor $color
}

function Guardar-Evidencia($id, $rol, $metodo, $ruta, $cuerpo, $resp) {
  $archivo = Join-Path $Salida "evidencias\$id.json"
  [pscustomobject]@{
    caso = $id; rol = $rol; metodo = $metodo; ruta = $ruta
    cuerpo_enviado = $cuerpo; status = $resp.status; respuesta = $resp.body
    hora = (Get-Date).ToString('s')
  } | ConvertTo-Json -Depth 20 | Set-Content -Path $archivo -Encoding utf8
  return "evidencias/$id.json"
}

function Guardar-Creados {
  $script:Creados | ConvertTo-Json -Depth 6 | Set-Content -Path (Join-Path $Salida 'datos-creados.json') -Encoding utf8
}

function Registrar-Creado($tipo, $id, $codigo, $caso, $detalle) {
  $script:Creados.Add([pscustomobject]@{
    tipo = $tipo; id = $id; codigo = $codigo; caso = $caso; detalle = $detalle
    proyecto = $P; creado = (Get-Date).ToString('s'); simulado_qa = $true
  })
  if ($tipo -eq 'work_order') { [void]$script:OtPropias.Add($id) }
  Guardar-Creados
}

function Assert-OtPropia($otId) {
  if (-not $script:OtPropias.Contains([string]$otId)) {
    throw "Protección: la OT $otId no fue creada por este script. No se modifica."
  }
}

function Llamar($rol, $metodo, $ruta, $cuerpo = $null) {
  $p = @{
    Method = $metodo; Uri = "$api$ruta"; ContentType = 'application/json'
    SkipHttpErrorCheck = $true; StatusCodeVariable = 'sc'; TimeoutSec = 60
  }
  if ($rol) {
    if (-not $script:Tok.ContainsKey($rol)) { return $null }
    $p.Headers = @{ Authorization = "Bearer $($script:Tok[$rol])" }
  }
  if ($null -ne $cuerpo) { $p.Body = ($cuerpo | ConvertTo-Json -Depth 10 -Compress) }
  try {
    $r = Invoke-RestMethod @p
    return [pscustomobject]@{ status = [int]$sc; body = $r }
  } catch {
    return [pscustomobject]@{ status = 0; body = @{ error = "Sin respuesta del backend: $($_.Exception.Message)" } }
  }
}

# Caso de petición con estado esperado y una comprobación opcional.
# $Comprobar recibe la respuesta y devuelve $null (bien) o un texto (motivo de FAIL).
function Caso {
  param($Id, $Bloque, $Desc, $Rol, $Metodo, $Ruta, $Cuerpo = $null, [int]$Esperado, [scriptblock]$Comprobar = $null)
  if ($Rol -and -not $script:Tok.ContainsKey($Rol)) {
    Registrar $Id $Bloque $Desc 'BLOCKED' $Esperado "sin sesión para el rol '$Rol'"
    return $null
  }
  $r = Llamar $Rol $Metodo $Ruta $Cuerpo
  $ev = Guardar-Evidencia $Id $Rol $Metodo $Ruta $Cuerpo $r
  if ($r.status -ne $Esperado) {
    $msg = Valor $r.body 'error'
    Registrar $Id $Bloque $Desc 'FAIL' $Esperado "status $($r.status) $msg" $ev
    return $r
  }
  if ($Comprobar) {
    try { $motivo = & $Comprobar $r } catch { $motivo = "error al comprobar: $($_.Exception.Message)" }
    if ($motivo) { Registrar $Id $Bloque $Desc 'FAIL' $Esperado "status $($r.status); $motivo" $ev; return $r }
  }
  Registrar $Id $Bloque $Desc 'PASS' $Esperado "status $($r.status)" $ev
  return $r
}

function Bloqueado($Id, $Bloque, $Desc, $Motivo) { Registrar $Id $Bloque $Desc 'BLOCKED' '-' $Motivo }

function Ids-Notificaciones($rol) {
  $r = Llamar $rol GET '/notificaciones?limit=100'
  if ($null -eq $r -or $r.status -ne 200) { return $null }
  return @($r.body.data)
}

# --------------------------------------------------------------------------
# 0. Verificación del entorno (si algo falla, se detiene)
# --------------------------------------------------------------------------
Write-Host "`n=== 0. Verificación del entorno ===" -ForegroundColor Cyan
Write-Host "Modo: $Modo · Backend: $BackendDir · Salida: $Salida · Hoy (Chile): $($HOY.ToString('yyyy-MM-dd'))"

$uriApi = [Uri]$Api
if ($uriApi.Host -notin @('localhost', '127.0.0.1')) {
  throw "El script solo corre contra un backend local (localhost). Recibido: $($uriApi.Host)"
}

$envPath = Join-Path $BackendDir '.env'
if (-not (Test-Path $envPath)) { throw "No existe $envPath" }
$envVars = @{}
Get-Content $envPath | Where-Object { $_ -match '^\s*([A-Z_]+)\s*=\s*(.*)$' } | ForEach-Object { $envVars[$Matches[1]] = $Matches[2].Trim().Trim('"') }
$url = $envVars['SUPABASE_URL']
if ($url -ne "https://$PRUEBAS.supabase.co") { throw 'V-1: SUPABASE_URL no es el proyecto de pruebas. Se detiene.' }
if ((Get-Content $envPath -Raw) -match $REAL) { throw 'V-1: el .env menciona la base real. Se detiene.' }
foreach ($k in 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY') {
  $v = $envVars[$k]
  if (-not $v) { throw "V-1: $k está vacía" }
  if ($v.Split('.').Count -eq 3) {
    $c = Leer-Jwt $v
    if ($c.ref -ne $PRUEBAS) { throw "V-1: $k pertenece a otro proyecto. Se detiene." }
  }
}
Registrar 'V-1' 'Entorno' '.env apunta solo a Supabase de pruebas' 'PASS' $PRUEBAS 'URL y claves del proyecto de pruebas'
$anon = $envVars['SUPABASE_ANON_KEY']
$envVars = $null

try { $h = Invoke-RestMethod "$($Api.TrimEnd('/'))/health" -TimeoutSec 10 } catch { throw 'V-2: el backend local no responde en /health. ¿Está corriendo npm run dev?' }
if ($h.status -ne 'ok') { throw 'V-2: /health no respondió ok' }
Registrar 'V-2' 'Entorno' 'Backend local responde /health' 'PASS' 'ok' 'ok'

function Abrir-Sesion($rol, $subEsperado) {
  $cred = Get-Credential -Message "SIVU QA — cuenta '$rol' (proyecto de pruebas)"
  if ($null -eq $cred) { return $false }
  $cuerpo = @{ email = $cred.UserName; password = $cred.GetNetworkCredential().Password } | ConvertTo-Json -Compress
  try {
    $r = Invoke-RestMethod -Method Post -Uri "$url/auth/v1/token?grant_type=password" -Headers @{ apikey = $anon } -ContentType 'application/json' -Body $cuerpo
  } catch {
    $cuerpo = $null; $cred = $null
    Write-Host "No se pudo iniciar sesión como '$rol' (credenciales rechazadas o sin red)." -ForegroundColor Red
    return $false
  }
  $cuerpo = $null; $cred = $null
  $c = Leer-Jwt $r.access_token
  if ($c.iss -ne "$url/auth/v1") { throw "El token de '$rol' no es del proyecto de pruebas. Se detiene." }
  if ($subEsperado -and $c.sub -ne $subEsperado) { throw "La cuenta ingresada para '$rol' no es la de QA esperada ($subEsperado). Se detiene." }
  $script:Tok[$rol] = $r.access_token
  Write-Host ("Sesión '{0}' abierta (usuario {1}…)" -f $rol, $c.sub.Substring(0, 8)) -ForegroundColor DarkGray
  return $true
}

foreach ($rol in $CUENTAS.Keys) {
  if (-not (Abrir-Sesion $rol $CUENTAS[$rol])) { throw "Sin sesión para '$rol': el script la necesita. Se detiene." }
}
if ($ConAdmin)     { [void](Abrir-Sesion 'admin' $null) }
if ($ConNoMiembro) { [void](Abrir-Sesion 'ajeno' $null) }

# V-3: el backend valida tokens del proyecto de pruebas y lee el proyecto QA,
# que solo existe en esa base. Si el backend apuntara a otra base, fallaría.
$r = Caso 'V-3' 'Entorno' 'Backend acepta tokens de pruebas y lee el proyecto QA' municipal GET "/projects/$P" -Esperado 200 -Comprobar {
  param($r) if ((Valor $r.body 'data.id') -ne $P) { 'el proyecto devuelto no es el de QA' }
}
if ($null -eq $r -or $r.status -ne 200) { throw 'V-3 falló: el backend no está conectado al proyecto de pruebas. Se detiene.' }
$r = Caso 'V-4' 'Entorno' 'Tabla de avisos disponible (033)' municipal GET '/notificaciones?limit=1' -Esperado 200
if ($null -eq $r -or $r.status -ne 200) { throw 'V-4 falló: /notificaciones no responde. Se detiene.' }

# ==========================================================================
# PARTE A — SOLO LECTURA
# ==========================================================================
Write-Host "`n=== A. Pruebas de solo lectura ===" -ForegroundColor Cyan

# ---------------- B8 Infraestructura ----------------
$b8 = Caso 'B8-1' 'B8' 'Infraestructura QA (Usuario municipal)' municipal GET "/projects/$P/infraestructura" -Esperado 200 -Comprobar {
  param($r)
  $d = $r.body.data
  if ((Valor $d 'cobertura.arboles_con_evaluacion_valida') -lt 1) { return 'sin árboles evaluados' }
  $a = @($d.arboles) | Where-Object { $_.arbol.id -eq $ARBOL }
  if (-not $a) { return 'A-000346 no aparece' }
  if ((Valor $a 'infraestructura.clasificacion.codigo') -ne 'critico') { return "A-000346 clasificación $(Valor $a 'infraestructura.clasificacion.codigo') (esperado critico)" }
  if ([double](Valor $a 'infraestructura.porcentaje') -ne 100) { return "A-000346 porcentaje $(Valor $a 'infraestructura.porcentaje') (esperado 100)" }
  foreach ($x in @($d.arboles)) { if (@($x.componentes).Count -ne 6) { return "$($x.arbol.tree_code) con $(@($x.componentes).Count) componentes (esperado 6)" } }
  if (-not (Valor $a 'infraestructura.clasificacion.etiqueta')) { return 'clasificación sin etiqueta' }
}
$resumenB8 = if ($b8 -and $b8.status -eq 200) { $b8.body.data.resumen | ConvertTo-Json -Depth 10 -Compress } else { $null }
$coberturaB8 = if ($b8 -and $b8.status -eq 200) { $b8.body.data.cobertura | ConvertTo-Json -Compress } else { $null }
foreach ($rol in 'inspector', 'encargado') {
  [void](Caso "B8-2-$rol" 'B8' "Infraestructura QA ($rol)" $rol GET "/projects/$P/infraestructura" -Esperado 200 -Comprobar {
    param($r) if (($r.body.data.cobertura | ConvertTo-Json -Compress) -ne $coberturaB8) { 'cobertura distinta de B8-1' }
  })
}
if ($script:Tok.ContainsKey('admin')) { [void](Caso 'B8-3' 'B8' 'Infraestructura QA (Administrador)' admin GET "/projects/$P/infraestructura" -Esperado 200) }
else { Bloqueado 'B8-3' 'B8' 'Infraestructura QA (Administrador)' 'sin cuenta de Administrador (usar -ConAdmin)' }
if ($script:Tok.ContainsKey('ajeno')) { [void](Caso 'B8-4' 'B8' 'Infraestructura QA (no miembro)' ajeno GET "/projects/$P/infraestructura" -Esperado 403) }
else { Bloqueado 'B8-4' 'B8' 'Infraestructura QA (no miembro)' 'sin cuenta no miembro (usar -ConNoMiembro)' }
[void](Caso 'B8-5' 'B8' 'Infraestructura sin token' $null GET "/projects/$P/infraestructura" -Esperado 401)
[void](Caso 'B8-6a' 'B8' 'Filtro clasificacion=critico' municipal GET "/projects/$P/infraestructura?clasificacion=critico" -Esperado 200 -Comprobar {
  param($r)
  $d = $r.body.data
  if (@($d.arboles | Where-Object { (Valor $_ 'infraestructura.clasificacion.codigo') -ne 'critico' }).Count -gt 0) { return 'hay árboles no críticos' }
  if ($resumenB8 -and ($d.resumen | ConvertTo-Json -Depth 10 -Compress) -ne $resumenB8) { return 'el resumen cambió con el filtro' }
})
[void](Caso 'B8-6b' 'B8' 'Filtro componente=vereda&categoria=leve' municipal GET "/projects/$P/infraestructura?componente=vereda&categoria=leve" -Esperado 200 -Comprobar {
  param($r) if ($resumenB8 -and ($r.body.data.resumen | ConvertTo-Json -Depth 10 -Compress) -ne $resumenB8) { 'el resumen cambió con el filtro' }
})
[void](Caso 'B8-7a' 'B8' 'componente sin categoria → 400' municipal GET "/projects/$P/infraestructura?componente=vereda" -Esperado 400)
[void](Caso 'B8-7b' 'B8' 'clasificacion inválida → 400' municipal GET "/projects/$P/infraestructura?clasificacion=rojo" -Esperado 400)
[void](Caso 'B8-7c' 'B8' 'parámetro desconocido → 400' municipal GET "/projects/$P/infraestructura?x=1" -Esperado 400)
[void](Caso 'B8-8' 'B8' 'Coincide con la ficha (B2) de A-000346' municipal GET "/projects/$P/trees/$ARBOL" -Esperado 200 -Comprobar {
  param($r)
  $f = Valor $r.body 'data.evaluacion_vigente.resultado.infraestructura.clasificacion.codigo'
  if ($f -ne 'critico') { "ficha: $f (esperado critico, igual que B8-1)" }
})
$esperadoPiloto = @{ 'A-000419' = @('bajo', 13.33); 'A-000426' = @('bajo', 8.33); 'A-000423' = @('bajo', 8.33); 'A-000422' = @('moderado', 16.67) }
$rp = Llamar municipal GET "/projects/$PILOTO/infraestructura"
if ($rp.status -eq 403) { Bloqueado 'B8-9' 'B8' 'Infraestructura del Piloto' 'el Usuario municipal de QA no es miembro del Piloto' }
else {
  $ev = Guardar-Evidencia 'B8-9' 'municipal' 'GET' "/projects/$PILOTO/infraestructura" $null $rp
  $motivo = $null
  if ($rp.status -ne 200) { $motivo = "status $($rp.status)" }
  else {
    foreach ($cod in $esperadoPiloto.Keys) {
      $a = @($rp.body.data.arboles) | Where-Object { $_.arbol.tree_code -eq $cod }
      if (-not $a) { $motivo = "$cod no aparece"; break }
      $cl = Valor $a 'infraestructura.clasificacion.codigo'; $pc = [math]::Round([double](Valor $a 'infraestructura.porcentaje'), 2)
      if ($cl -ne $esperadoPiloto[$cod][0] -or $pc -ne $esperadoPiloto[$cod][1]) { $motivo = "$cod $cl $pc (esperado $($esperadoPiloto[$cod] -join ' '))"; break }
    }
  }
  Registrar 'B8-9' 'B8' 'Infraestructura del Piloto (4 árboles)' ($(if ($motivo) { 'FAIL' } else { 'PASS' })) 'valores de la consulta SQL' ($(if ($motivo) { $motivo } else { 'coinciden' })) $ev
}

# ---------------- B6 OT vencidas ----------------
$rv = Llamar municipal GET "/projects/$PILOTO/work-orders?solo_vencidas=true"
if ($rv.status -eq 403) {
  Bloqueado 'B6-1' 'B6' 'Vencidas del Piloto' 'el Usuario municipal de QA no es miembro del Piloto'
  Bloqueado 'B6-7' 'B6' 'Ficha del árbol con OT vencida' 'depende de B6-1'
} else {
  $ev = Guardar-Evidencia 'B6-1' 'municipal' 'GET' "/projects/$PILOTO/work-orders?solo_vencidas=true" $null $rv
  $cods = @($rv.body.data | ForEach-Object { $_.codigo_ot })
  $ok = $rv.status -eq 200 -and $cods.Count -eq 1 -and $cods[0] -eq 'OT-M-000020' -and @($rv.body.data | Where-Object { -not $_.vencida }).Count -eq 0
  Registrar 'B6-1' 'B6' 'Vencidas del Piloto' ($(if ($ok) { 'PASS' } else { 'FAIL' })) 'solo OT-M-000020, vencida true' "status $($rv.status); $($cods -join ', ')" $ev
  $vencida = @($rv.body.data)[0]
  $arbolV = Valor $vencida 'arbol.id'
  if ($ok -and $arbolV) {
    [void](Caso 'B6-7' 'B6' 'Ficha del árbol con OT vencida' municipal GET "/projects/$PILOTO/trees/$arbolV" -Esperado 200 -Comprobar {
      param($r) $o = @($r.body.data.ordenes_trabajo) | Where-Object { $_.codigo_ot -eq 'OT-M-000020' }
      if (-not $o) { 'la OT no aparece en la ficha' } elseif (-not $o.vencida) { 'vencida = false en la ficha' }
    })
  } else { Bloqueado 'B6-7' 'B6' 'Ficha del árbol con OT vencida' 'B6-1 no devolvió el árbol' }
}
[void](Caso 'B6-2' 'B6' 'Listado QA trae vencida y no marca otros estados' municipal GET "/projects/$P/work-orders?estado=pendiente,programada,en_ejecucion,completada,cancelada&limit=200" -Esperado 200 -Comprobar {
  param($r)
  foreach ($o in @($r.body.data)) {
    if ($null -eq $o.PSObject.Properties['vencida']) { return "$($o.codigo_ot) sin campo vencida" }
    if ($o.vencida -and $o.estado.codigo -ne 'programada') { return "$($o.codigo_ot) en $($o.estado.codigo) marcada vencida" }
    if ($o.vencida -and [datetime]$o.fecha_accion_programada -ge $HOY) { return "$($o.codigo_ot) vencida con fecha no pasada" }
  }
})
[void](Caso 'B6-3' 'B6' 'Mis OT vencidas (Inspector)' inspector GET '/work-orders/mine?solo_vencidas=true' -Esperado 200 -Comprobar {
  param($r) if (@($r.body.data | Where-Object { -not $_.vencida }).Count -gt 0) { 'hay OT no vencidas' }
})
[void](Caso 'B6-4' 'B6' 'Encargado no ve OT de Inspección' encargado GET "/projects/$P/work-orders?tipo_ot=inspeccion&solo_vencidas=true" -Esperado 403)
[void](Caso 'B6-5a' 'B6' 'solo_vencidas=si → 400' municipal GET "/projects/$P/work-orders?solo_vencidas=si" -Esperado 400)
[void](Caso 'B6-5b' 'B6' 'estado=vencida → 400 (no es un estado)' municipal GET "/projects/$P/work-orders?estado=vencida" -Esperado 400)

# ---------------- #63 Recordatorios (lectura solo antes del 2026-11-13) ----------------
if ($HOY -lt $FECHA_RECORDATORIOS) {
  [void](Caso 'R-1' '#63' 'Usuario municipal: 0 recordatorios hoy' municipal GET '/notificaciones' -Esperado 200 -Comprobar {
    param($r) if ($r.body.recordatorios_generados -ne 0) { "recordatorios_generados = $($r.body.recordatorios_generados)" }
  })
  foreach ($rol in 'inspector', 'encargado') {
    [void](Caso "R-2-$rol" '#63' "Sin recordatorios para $rol" $rol GET '/notificaciones' -Esperado 200 -Comprobar {
      param($r) if ($r.body.recordatorios_generados -ne 0) { "recordatorios_generados = $($r.body.recordatorios_generados)" }
    })
  }
  Bloqueado 'R-3' '#63' 'Recordatorio positivo (A-000423, Piloto)' 'pendiente hasta el 2026-11-13; no se alteran fechas'
  Bloqueado 'R-4' '#63' 'Sin duplicados con consultas repetidas y simultáneas' 'pendiente hasta el 2026-11-13'
  Bloqueado 'R-5' '#63' 'Coincide con upcoming-inspections?solo_activos=true' 'pendiente hasta el 2026-11-13'
} else {
  Bloqueado 'R-1' '#63' 'Recordatorios (lectura)' 'desde el 2026-11-13 la consulta genera recordatorios: correr con -Modo Escritura'
}

# ---------------- CC-051 lectura ----------------
[void](Caso 'A-11a' 'CC-051' 'solo_no_leidas=si → 400' inspector GET '/notificaciones?solo_no_leidas=si' -Esperado 400)
[void](Caso 'A-11b' 'CC-051' 'PATCH con id no UUID → 400' inspector PATCH '/notificaciones/no-uuid/leida' -Esperado 400)
[void](Caso 'A-0' 'CC-051' 'Avisos sin token → 401' $null GET '/notificaciones' -Esperado 401)

# ==========================================================================
# PARTE B — CREA DATOS DE QA (solo con -Modo Escritura)
# ==========================================================================
if ($Modo -eq 'Escritura') {
  Write-Host "`n=== B. Pruebas que crean datos de QA ===" -ForegroundColor Cyan
  Write-Host 'Se crearán en el proyecto QA: 3 OT de Inspección (2 de monitoreo, 1 de Levantamiento),' -ForegroundColor Yellow
  Write-Host '1 árbol nuevo y su inspección en borrador. Quedan permanentes y se registran en datos-creados.json.' -ForegroundColor Yellow
  Write-Host 'No se modifican árboles ni OT preexistentes. No se elimina nada.' -ForegroundColor Yellow
  if ((Read-Host 'Escriba CREAR para continuar') -cne 'CREAR') {
    Bloqueado 'B-*' 'Escritura' 'Pruebas con escritura' 'cancelado por la usuaria antes de crear datos'
  } else {
    $base = @{}
    foreach ($rol in 'inspector', 'inspector2', 'encargado') { $base[$rol] = @((Ids-Notificaciones $rol) | ForEach-Object { $_.id }) }
    $nuevos = { param($rol) @((Ids-Notificaciones $rol) | Where-Object { $_ -and $base[$rol] -notcontains $_.id }) }

    # ---- Crear OT_A y OT_B ----
    $cuerpoOt = { param($m) @{ tree_id = $ARBOL; accion_solicitada = 'monitoreo'; subtipo_accion = 'fitosanitario'; prioridad = 'baja'; motivo = $m; responsable_accion_id = $INSP1 } }
    $a = Caso 'E-1' 'Datos' 'Crear OT de QA para reasignar' municipal POST "/projects/$P/work-orders" (& $cuerpoOt 'QA validación API: reasignación (CC-051)') -Esperado 201
    $b = Caso 'E-2' 'Datos' 'Crear OT de QA para cancelar desde Pendiente' municipal POST "/projects/$P/work-orders" (& $cuerpoOt 'QA validación API: cancelación desde Pendiente (034)') -Esperado 201
    $OT_A = if ($a -and $a.status -eq 201) { $a.body.data } else { $null }
    $OT_B = if ($b -and $b.status -eq 201) { $b.body.data } else { $null }
    if ($OT_A) { Registrar-Creado 'work_order' $OT_A.id $OT_A.codigo_ot 'E-1' 'monitoreo/fitosanitario, A-000346, responsable Inspector 1 → Inspector 2' }
    if ($OT_B) { Registrar-Creado 'work_order' $OT_B.id $OT_B.codigo_ot 'E-2' 'monitoreo/fitosanitario, A-000346, responsable Inspector 1; se cancela' }

    # ---- 034: cancelar desde Pendiente ----
    if ($OT_B) {
      Assert-OtPropia $OT_B.id
      [void](Caso '034-5' '034' 'Cancelar con motivo vacío → 400' municipal POST "/work-orders/$($OT_B.id)/cancelar" @{ motivo_cancelacion = '   ' } -Esperado 400)
      [void](Caso '034-4' '034' 'Inspector no puede cancelar → 403' inspector POST "/work-orders/$($OT_B.id)/cancelar" @{ motivo_cancelacion = 'QA' } -Esperado 403)
      [void](Caso '034-1' '034' 'Cancelar OT Pendiente → 200' municipal POST "/work-orders/$($OT_B.id)/cancelar" @{ motivo_cancelacion = 'QA validación 034' } -Esperado 200 -Comprobar {
        param($r) if ((Valor $r.body 'data.estado_ot') -ne 'cancelada') { "estado_ot = $(Valor $r.body 'data.estado_ot')" }
      })
      [void](Caso '034-2' '034' 'Persistencia: cancelada y sin fecha programada' municipal GET "/projects/$P/work-orders?estado=cancelada&limit=200" -Esperado 200 -Comprobar {
        param($r) $o = @($r.body.data) | Where-Object { $_.id -eq $OT_B.id }
        if (-not $o) { 'no aparece entre las canceladas' } elseif ($null -ne $o.fecha_accion_programada) { "fecha_accion_programada = $($o.fecha_accion_programada)" }
      })
      [void](Caso '034-3' '034' 'Cancelar de nuevo → 422' municipal POST "/work-orders/$($OT_B.id)/cancelar" @{ motivo_cancelacion = 'QA repetida' } -Esperado 422)
      $n = & $nuevos 'inspector' | Where-Object { $_.work_order_id -eq $OT_B.id -and $_.tipo.codigo -eq 'ot_cancelada' }
      $ok = @($n).Count -eq 1 -and $n.mensaje -like '*QA validación 034*'
      Registrar 'A-6' 'CC-051' 'Aviso ot_cancelada al Inspector 1, con motivo' ($(if ($ok) { 'PASS' } else { 'FAIL' })) '1 aviso con el motivo' "$(@($n).Count) aviso(s)"
    } else { Bloqueado '034-*' '034' 'Cancelación desde Pendiente' 'no se creó la OT (E-2)' }

    # ---- CC-051: reasignación ----
    if ($OT_A) {
      Assert-OtPropia $OT_A.id
      [void](Caso 'A-2' 'CC-051' 'Reasignar OT a Inspector 2' municipal PATCH "/work-orders/$($OT_A.id)/responsable" @{ responsable_accion_id = $INSP2 } -Esperado 200)
      $n2 = & $nuevos 'inspector2' | Where-Object { $_.work_order_id -eq $OT_A.id -and $_.tipo.codigo -eq 'ot_reasignada_nuevo' }
      Registrar 'A-3' 'CC-051' 'Aviso ot_reasignada_nuevo al Inspector 2' ($(if (@($n2).Count -eq 1) { 'PASS' } else { 'FAIL' })) '1 aviso' "$(@($n2).Count) aviso(s)"
      $n1 = & $nuevos 'inspector' | Where-Object { $_.work_order_id -eq $OT_A.id -and $_.tipo.codigo -eq 'ot_reasignada_anterior' }
      Registrar 'A-4' 'CC-051' 'Aviso ot_reasignada_anterior al Inspector 1' ($(if (@($n1).Count -eq 1) { 'PASS' } else { 'FAIL' })) '1 aviso' "$(@($n1).Count) aviso(s)"
      $ne = & $nuevos 'encargado'
      Registrar 'A-7' 'CC-051' 'El Encargado no recibe avisos ajenos' ($(if (@($ne).Count -eq 0) { 'PASS' } else { 'FAIL' })) '0 avisos nuevos' "$(@($ne).Count) aviso(s)"
      if (@($n2).Count -ge 1) {
        $idAviso = @($n2)[0].id
        $antes = (Llamar inspector2 GET '/notificaciones?limit=1').body.no_leidas
        $l1 = Caso 'A-8' 'CC-051' 'Marcar como leído (dueño)' inspector2 PATCH "/notificaciones/$idAviso/leida" -Esperado 200 -Comprobar {
          param($r) if (-not (Valor $r.body 'data.leida')) { 'leida = false' }
        }
        $despues = (Llamar inspector2 GET '/notificaciones?limit=1').body.no_leidas
        Registrar 'A-8b' 'CC-051' 'no_leidas baja en 1' ($(if ($despues -eq $antes - 1) { 'PASS' } else { 'FAIL' })) ($antes - 1) $despues
        [void](Caso 'A-9' 'CC-051' 'Otro usuario no puede marcarlo → 404' inspector PATCH "/notificaciones/$idAviso/leida" -Esperado 404)
        [void](Caso 'A-10' 'CC-051' 'Marcar de nuevo no cambia leido_at' inspector2 PATCH "/notificaciones/$idAviso/leida" -Esperado 200 -Comprobar {
          param($r) if ($l1 -and (Valor $r.body 'data.leido_at') -ne (Valor $l1.body 'data.leido_at')) { 'leido_at cambió' }
        })
      } else { Bloqueado 'A-8..A-10' 'CC-051' 'Marcar como leído' 'no hubo aviso de reasignación' }

      # A-12 + B6-6: programar no avisa; hoy no está vencida
      $base['inspector2'] = @((Ids-Notificaciones 'inspector2') | ForEach-Object { $_.id })
      $base['inspector']  = @((Ids-Notificaciones 'inspector')  | ForEach-Object { $_.id })
      [void](Caso 'A-12a' 'CC-051' 'Inspector 2 programa la OT (fecha de creación)' inspector2 PATCH "/work-orders/$($OT_A.id)/estado" @{ estado = 'programada'; fecha_accion_programada = (Fecha-Iso $OT_A.fecha_creacion_ot) } -Esperado 200)
      $sin = @(& $nuevos 'inspector2') + @(& $nuevos 'inspector')
      Registrar 'A-12b' 'CC-051' 'Programar no genera avisos' ($(if ($sin.Count -eq 0) { 'PASS' } else { 'FAIL' })) '0' $sin.Count
      [void](Caso 'B6-6' 'B6' 'OT programada con fecha de hoy no está vencida' municipal GET "/projects/$P/work-orders?limit=200" -Esperado 200 -Comprobar {
        param($r) $o = @($r.body.data) | Where-Object { $_.id -eq $OT_A.id }
        if (-not $o) { 'no aparece' } elseif ([datetime]$o.fecha_accion_programada -ge $HOY -and $o.vencida) { 'vencida = true con fecha de hoy' }
      })
      [void](Caso 'E-3' 'Datos' 'Inspector 2 inicia la OT (para L-6)' inspector2 PATCH "/work-orders/$($OT_A.id)/estado" @{ estado = 'en_ejecucion' } -Esperado 200)
    } else { Bloqueado 'A-2..A-12' 'CC-051' 'Reasignación y avisos' 'no se creó la OT (E-1)' }

    # ---- CC-052: Levantamiento con árbol nuevo ----
    $l = Caso 'E-4' 'Datos' 'Crear OT de Levantamiento (QA)' municipal POST "/projects/$P/work-orders" @{ accion_solicitada = 'levantamiento'; prioridad = 'baja'; observaciones = 'QA validación API: Levantamiento con árbol nuevo (CC-052)'; responsable_accion_id = $INSP1 } -Esperado 201
    $OT_L = if ($l -and $l.status -eq 201) { $l.body.data } else { $null }
    if ($OT_L) {
      Registrar-Creado 'work_order' $OT_L.id $OT_L.codigo_ot 'E-4' 'Levantamiento sin árbol, responsable Inspector 1'
      Assert-OtPropia $OT_L.id
      [void](Caso 'E-5' 'Datos' 'Programar Levantamiento' inspector PATCH "/work-orders/$($OT_L.id)/estado" @{ estado = 'programada'; fecha_accion_programada = (Fecha-Iso $OT_L.fecha_creacion_ot) } -Esperado 200)
      [void](Caso 'E-6' 'Datos' 'Iniciar Levantamiento' inspector PATCH "/work-orders/$($OT_L.id)/estado" @{ estado = 'en_ejecucion' } -Esperado 200)
      [void](Caso 'L-1' 'CC-052' 'Buscar árboles cercanos' inspector GET "/projects/$P/nearby-trees?utm_este=$UTM_E&utm_norte=$UTM_N&radio_m=20" -Esperado 200)
      $nuevo = @{ sector = 'QA Fase 7'; ubicacion_descriptiva = 'QA validación API (CC-052), árbol simulado'; utm_este = $UTM_E; utm_norte = $UTM_N; nombre_comun = 'Jacarandá' }
      $insp = @{ tipo_inspeccion_realizada = 'levantamiento'; variables = @{} }
      [void](Caso 'L-8a' 'CC-052' 'Usuario municipal no registra inspección → 403' municipal POST "/work-orders/$($OT_L.id)/inspections" ($insp + @{ nuevo_arbol = $nuevo }) -Esperado 403)
      [void](Caso 'L-8b' 'CC-052' 'Encargado no registra inspección → 403' encargado POST "/work-orders/$($OT_L.id)/inspections" ($insp + @{ nuevo_arbol = $nuevo }) -Esperado 403)
      [void](Caso 'L-7' 'CC-052' 'Inspector no responsable → 422' inspector2 POST "/work-orders/$($OT_L.id)/inspections" ($insp + @{ nuevo_arbol = $nuevo }) -Esperado 422)
      [void](Caso 'L-5a' 'CC-052' 'tree_id y nuevo_arbol juntos → 400' inspector POST "/work-orders/$($OT_L.id)/inspections" ($insp + @{ nuevo_arbol = $nuevo; tree_id = $ARBOL }) -Esperado 400)
      $sinNombre = @{ sector = 'QA Fase 7'; ubicacion_descriptiva = 'QA'; utm_este = $UTM_E; utm_norte = $UTM_N }
      [void](Caso 'L-5b' 'CC-052' 'nuevo_arbol sin especie ni nombre → 400' inspector POST "/work-orders/$($OT_L.id)/inspections" ($insp + @{ nuevo_arbol = $sinNombre }) -Esperado 400)
      if ($OT_A) {
        [void](Caso 'L-6' 'CC-052' 'nuevo_arbol en OT que no es Levantamiento → 422' inspector2 POST "/work-orders/$($OT_A.id)/inspections" @{ tipo_inspeccion_realizada = 'monitoreo'; subtipo_inspeccion = 'fitosanitario'; variables = @{}; nuevo_arbol = $nuevo } -Esperado 422)
      } else { Bloqueado 'L-6' 'CC-052' 'nuevo_arbol en OT que no es Levantamiento' 'no se creó la OT (E-1)' }
      $totalAntes = (Llamar municipal GET "/projects/$P/trees?limit=1").body.total
      $l2 = Caso 'L-2' 'CC-052' 'Primer guardado con nuevo_arbol → 201, árbol nuevo' inspector POST "/work-orders/$($OT_L.id)/inspections" ($insp + @{ nuevo_arbol = $nuevo }) -Esperado 201 -Comprobar {
        param($r) if (-not (Valor $r.body 'data.arbol_nuevo')) { 'arbol_nuevo = false' } elseif (-not (Valor $r.body 'data.tree_id')) { 'sin tree_id' }
      }
      if ($l2 -and $l2.status -eq 201) {
        $treeNuevo = $l2.body.data.tree_id; $inspId = $l2.body.data.inspection_id
        $fic = Llamar municipal GET "/projects/$P/trees/$treeNuevo"
        Registrar-Creado 'tree' $treeNuevo (Valor $fic.body 'data.arbol.tree_code') 'L-2' 'alta por Levantamiento (CC-052), nombre común Jacarandá, centroide del sector QA'
        Registrar-Creado 'inspection' $inspId $null 'L-2' "borrador (Preguardado) de la OT $($OT_L.codigo_ot)"
        [void](Caso 'L-3' 'CC-052' 'Guardado siguiente no crea otro árbol' inspector PATCH "/inspections/$inspId" $insp -Esperado 200)
        $totalDespues = (Llamar municipal GET "/projects/$P/trees?limit=1").body.total
        Registrar 'L-2b' 'CC-052' 'Inventario: exactamente un árbol más' ($(if ($totalDespues -eq $totalAntes + 1) { 'PASS' } else { 'FAIL' })) ($totalAntes + 1) $totalDespues
        [void](Caso 'L-2c' 'CC-052' 'El árbol nuevo tiene ficha' municipal GET "/projects/$P/trees/$treeNuevo" -Esperado 200)
      }
      Bloqueado 'L-4' 'CC-052' 'nuevo_arbol fuera del sector → 422' 'requiere otra OT de Levantamiento (no autorizada en este corte)'
      Bloqueado 'L-9' 'CC-052' 'Finalizar inspección y completar OT' 'requiere datos técnicos completos; fuera de este corte'
    } else { Bloqueado 'L-*' 'CC-052' 'Levantamiento' 'no se creó la OT (E-4)' }

    # ---- #63 positivo (solo desde el 2026-11-13) ----
    if ($HOY -ge $FECHA_RECORDATORIOS) {
      $r1 = Caso 'R-3' '#63' 'Recordatorios generados para el Usuario municipal' municipal GET '/notificaciones?limit=100' -Esperado 200 -Comprobar {
        param($r) if (@($r.body.data | Where-Object { $_.tipo.codigo -eq 'recordatorio_inspeccion' }).Count -lt 1) { 'sin recordatorios' }
      }
      $c1 = @($r1.body.data | Where-Object { $_.tipo.codigo -eq 'recordatorio_inspeccion' }).Count
      $tokM = $script:Tok['municipal']
      $jobs = 1..2 | ForEach-Object -Parallel { Invoke-RestMethod -Uri "$using:api/notificaciones?limit=100" -Headers @{ Authorization = "Bearer $using:tokM" } -SkipHttpErrorCheck } -ThrottleLimit 2
      $tokM = $null
      $r2 = Llamar municipal GET '/notificaciones?limit=100'
      $c2 = @($r2.body.data | Where-Object { $_.tipo.codigo -eq 'recordatorio_inspeccion' }).Count
      Registrar 'R-4' '#63' 'Sin duplicados (consultas repetidas y simultáneas)' ($(if ($c2 -eq $c1 -and $r2.body.recordatorios_generados -eq 0) { 'PASS' } else { 'FAIL' })) "$c1 recordatorios" "$c2 recordatorios; generados $($r2.body.recordatorios_generados)"
      $jobs = $null
      $up = Llamar municipal GET "/projects/$PILOTO/upcoming-inspections?solo_activos=true"
      if ($up.status -eq 200) {
        $arbolesUp = @($up.body.data | ForEach-Object { Valor $_ 'tree_id'; Valor $_ 'arbol.id' } | Where-Object { $_ })
        $arbolesR = @($r2.body.data | Where-Object { $_.tipo.codigo -eq 'recordatorio_inspeccion' } | ForEach-Object { $_.tree_id })
        $falta = @($arbolesUp | Where-Object { $arbolesR -notcontains $_ })
        Registrar 'R-5' '#63' 'Coincide con upcoming-inspections (Piloto)' ($(if ($falta.Count -eq 0) { 'PASS' } else { 'FAIL' })) 'mismos árboles' "faltan $($falta.Count)" (Guardar-Evidencia 'R-5' 'municipal' 'GET' "/projects/$PILOTO/upcoming-inspections?solo_activos=true" $null $up)
      } else { Bloqueado 'R-5' '#63' 'Coincide con upcoming-inspections (Piloto)' "status $($up.status) (¿miembro del Piloto?)" }
    }
  }
} else {
  Write-Host "`n(Parte B omitida: ejecutar con -Modo Escritura para las pruebas que crean datos)" -ForegroundColor DarkGray
  foreach ($c in 'E-1..E-6 (datos)', '034-1..034-5', 'A-2..A-12', 'B6-6', 'L-1..L-8') { Bloqueado $c 'Escritura' $c 'no ejecutado: requiere -Modo Escritura' }
}

# --------------------------------------------------------------------------
# Cierre: resultados y limpieza de tokens
# --------------------------------------------------------------------------
$script:Tok.Clear(); $anon = $null
$script:Resultados | Export-Csv -Path (Join-Path $Salida 'resultados.csv') -NoTypeInformation -Encoding utf8
$script:Resultados | ConvertTo-Json -Depth 6 | Set-Content -Path (Join-Path $Salida 'resultados.json') -Encoding utf8
Guardar-Creados

$cuenta = $script:Resultados | Group-Object resultado | ForEach-Object { "$($_.Name): $($_.Count)" }
$md = @("# Validación por API — $(Get-Date -Format 's')", '', "Modo: $Modo · Hoy (Chile): $($HOY.ToString('yyyy-MM-dd')) · $($cuenta -join ' · ')", '',
        '| Caso | Bloque | Descripción | Resultado | Esperado | Obtenido | Evidencia |', '|---|---|---|---|---|---|---|')
$md += $script:Resultados | ForEach-Object { "| $($_.caso) | $($_.bloque) | $($_.descripcion) | $($_.resultado) | $($_.esperado) | $($_.obtenido) | $($_.evidencia) |" }
$md += '', '## Datos de QA creados', ''
$md += if ($script:Creados.Count) { $script:Creados | ForEach-Object { "- $($_.tipo) $($_.codigo) ``$($_.id)`` ($($_.caso)): $($_.detalle)" } } else { '- Ninguno' }
$md | Set-Content -Path (Join-Path $Salida 'resumen.md') -Encoding utf8

Write-Host "`n=== Resumen: $($cuenta -join ' · ') ===" -ForegroundColor Cyan
Write-Host "Resultados y evidencias en: $Salida"
if ($script:Creados.Count) { Write-Host "Datos de QA creados: $($script:Creados.Count) (ver datos-creados.json)" -ForegroundColor Yellow }
if ($script:Resultados | Where-Object resultado -eq 'FAIL') { exit 1 } else { exit 0 }
