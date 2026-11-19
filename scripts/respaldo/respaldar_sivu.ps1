# Respaldo de la base de pruebas de SIVU (valpo-verde-conecta-pruebas, gmlbmyreoxgoqrolhyxo)
# antes de aplicar las migraciones 040 y 041 (CC-077).
#
# Qué guarda (en $HOME\respaldos-sivu\<fecha>\, FUERA de los repositorios):
#   public.dump            esquema y datos de public y del historial de migraciones (pg_dump, formato custom)
#   auth_storage.dump      datos de auth (cuentas) y storage (metadatos de fotos; los archivos no)
#   fn_finalizar_inspeccion_antes.sql   definición actual de la función que cambia la 040
#   conteos_origen.csv     filas por tabla de public, para comparar al restaurar
#   manifiesto.txt         huellas SHA-256 y resultado de la lectura de cada archivo
#
# La contraseña se pide oculta, solo vive en esta ventana mientras corre y no se guarda.
# Uso:  powershell -ExecutionPolicy Bypass -File C:\Users\usuario\code\tools\respaldo-sivu\respaldar_sivu.ps1

$ErrorActionPreference = 'Stop'
$bin = 'C:\Program Files\PostgreSQL\18\bin'
$ref = 'gmlbmyreoxgoqrolhyxo'

Write-Host ''
Write-Host 'Respaldo de la base de pruebas de SIVU' -ForegroundColor Green
Write-Host 'En Supabase: proyecto valpo-verde-conecta-pruebas > Connect > "Session pooler".'
Write-Host 'Copia la cadena tal cual (con [YOUR-DATABASE-PASSWORD] dentro; la contraseña se pide aparte).'
Write-Host ''
$cadena = (Read-Host 'Cadena de conexión').Trim()
if ($cadena -notmatch $ref) { throw "La cadena no es de la base de pruebas ($ref). Me detengo sin hacer nada." }
if ($cadena -notmatch ':\[YOUR-[A-Z-]*PASSWORD\]@') { throw 'La cadena debe traer [YOUR-DATABASE-PASSWORD] (o [YOUR-PASSWORD]) en lugar de la contraseña. Cópiala de nuevo desde Connect.' }
$cadena = $cadena -replace ':\[YOUR-[A-Z-]*PASSWORD\]@', '@'

$seguro = Read-Host -AsSecureString 'Contraseña de la base (no se muestra)'
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro)
$env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
$env:PGSSLMODE = 'require'
$env:LC_MESSAGES = 'C'   # mensajes de PostgreSQL en inglés simple (en español salen con letras rotas en esta consola)

$destino = Join-Path $HOME ('respaldos-sivu\' + (Get-Date -Format 'yyyy-MM-dd_HHmm'))
New-Item -ItemType Directory -Force $destino | Out-Null

$registro = Join-Path $destino 'registro.txt'
function Invoke-Paso($titulo, [scriptblock]$accion) {
  Write-Host "-> $titulo" -ForegroundColor Cyan
  "== $titulo" | Add-Content -Encoding utf8 $registro
  # Los mensajes de pg_dump y psql salen por stderr: se muestran y se guardan en registro.txt sin cortar el script.
  $anterior = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & $accion 2>&1 | ForEach-Object { "$_" } | Tee-Object -FilePath $registro -Append | Out-Host
  $codigo = $LASTEXITCODE
  $ErrorActionPreference = $anterior
  if ($codigo -ne 0) { throw "Falló: $titulo (código $codigo). El detalle quedó en $registro" }
}

try {
  Invoke-Paso 'Probar la conexión' {
    & "$bin\psql.exe" $cadena -At -c "select current_database() || ' | ' || version()"
  }
  Invoke-Paso 'Respaldar public y el historial de migraciones' {
    & "$bin\pg_dump.exe" $cadena --verbose -Fc --no-owner --no-privileges -n public -n supabase_migrations -f (Join-Path $destino 'public.dump')
  }
  Invoke-Paso 'Respaldar datos de auth y storage' {
    & "$bin\pg_dump.exe" $cadena --verbose -Fc --no-owner --no-privileges --data-only -n auth -n storage -f (Join-Path $destino 'auth_storage.dump')
  }
  Invoke-Paso 'Guardar la definición actual de fn_finalizar_inspeccion' {
    & "$bin\psql.exe" $cadena -At -o (Join-Path $destino 'fn_finalizar_inspeccion_antes.sql') -c "select pg_get_functiondef('public.fn_finalizar_inspeccion(uuid,uuid,jsonb,jsonb,date,date,date,date,text)'::regprocedure)"
  }
  Invoke-Paso 'Contar filas por tabla' {
    $sql = "select table_name, (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from public.%I', table_name), false, true, '')))[1]::text::bigint from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1"
    & "$bin\psql.exe" $cadena -At -F ',' -o (Join-Path $destino 'conteos_origen.csv') -c $sql
  }
}
catch {
  # Sin respaldos a medias: se borran los .dump incompletos y queda solo registro.txt para revisar el error.
  Get-ChildItem $destino -Filter '*.dump' | Remove-Item -Force -ErrorAction SilentlyContinue
  Write-Host ''
  Write-Host 'El respaldo NO se completó. Revisa (o envía) este archivo:' -ForegroundColor Red
  Write-Host "  $registro"
  throw
}
finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host '-> Verificar que los archivos se pueden leer' -ForegroundColor Cyan
$manifiesto = @("Respaldo SIVU · $ref · $(Get-Date -Format 's')", '')
foreach ($f in 'public.dump', 'auth_storage.dump') {
  $ruta = Join-Path $destino $f
  $entradas = (& "$bin\pg_restore.exe" --list $ruta | Where-Object { $_ -notmatch '^;' -and $_.Trim() }).Count
  if ($LASTEXITCODE -ne 0 -or $entradas -eq 0) { throw "El archivo $f no se pudo leer." }
  $hash = (Get-FileHash $ruta -Algorithm SHA256).Hash
  $mb = [math]::Round((Get-Item $ruta).Length / 1MB, 2)
  $manifiesto += "$f · $mb MB · $entradas objetos · SHA-256 $hash"
}
$tablas = (Get-Content (Join-Path $destino 'conteos_origen.csv')).Count
$manifiesto += "conteos_origen.csv · $tablas tablas de public"
$manifiesto | Set-Content -Encoding utf8 (Join-Path $destino 'manifiesto.txt')

Write-Host ''
Write-Host 'Respaldo listo en:' -ForegroundColor Green
Write-Host "  $destino"
$manifiesto | ForEach-Object { Write-Host "  $_" }
Write-Host ''
Write-Host 'No subas esta carpeta a ningún repositorio: contiene datos y cuentas reales.'
