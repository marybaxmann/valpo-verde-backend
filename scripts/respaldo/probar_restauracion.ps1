# Prueba de restauración CONJUNTA del respaldo de SIVU (auth + storage + public) en un PostgreSQL aislado (Docker).
# No usa credenciales de Supabase ni toca ninguna base real.
#
# Orden de dependencias:
#   1. Roles y extensiones que Supabase trae por defecto.
#   2. Estructura de auth y storage (auth_storage_estructura.sql, leída de pg_catalog; el dump es solo de datos).
#   3. Datos de auth y storage (auth_storage.dump).
#   4. public completo (public.dump): esquema, datos y restricciones, incluida user_profiles_id_fkey -> auth.users.
#
# Uso:  powershell -ExecutionPolicy Bypass -File probar_restauracion.ps1 [-Carpeta <carpeta del respaldo>]
param([string]$Carpeta)

# 'Continue': en PowerShell 5.1, con 'Stop' cualquier mensaje por stderr de psql/docker corta el script.
# Cada paso revisa su código de salida y lanza el error explícitamente.
$ErrorActionPreference = 'Continue'
$bin = 'C:\Program Files\PostgreSQL\18\bin'
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Carpeta) { $Carpeta = (Get-ChildItem "$HOME\respaldos-sivu" -Directory | Sort-Object Name -Descending | Select-Object -First 1).FullName }
$env:PGPASSWORD = 'restore_local'   # solo para el contenedor temporal
$env:LC_MESSAGES = 'C'
$u = 'postgresql://postgres@127.0.0.1:55432/postgres'
$res = Join-Path $Carpeta 'resultado_restauracion_conjunta.txt'
$log = Join-Path $Carpeta 'restauracion_conjunta_registro.txt'
Remove-Item $res, $log -ErrorAction SilentlyContinue

function Invoke-Nativo([string]$titulo, [scriptblock]$accion) {
  Write-Host "-> $titulo" -ForegroundColor Cyan
  "== $titulo" | Add-Content -Encoding utf8 $log
  $prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  & $accion 2>&1 | ForEach-Object { "$_" } | Where-Object { $_ -notmatch 'RemoteException' } | Add-Content -Encoding utf8 $log
  $c = $LASTEXITCODE; $ErrorActionPreference = $prev
  return $c
}
function Get-Consulta([string]$sql) { & "$bin\psql.exe" $u -At -F ',' -v ON_ERROR_STOP=1 -c $sql }

# Filas esperadas por tabla de auth y storage: se cuentan en el propio dump (una línea por fila en cada COPY).
$esperadoAuth = @{}
$tabla = $null
foreach ($linea in (& "$bin\pg_restore.exe" -f - (Join-Path $Carpeta 'auth_storage.dump'))) {
  if ($linea -match '^COPY (\S+) ') { $tabla = $Matches[1]; $esperadoAuth[$tabla] = 0; continue }
  if ($tabla) { if ($linea -eq '\.') { $tabla = $null } else { $esperadoAuth[$tabla]++ } }
}

Write-Host '-> Levantar PostgreSQL 17 + PostGIS en un contenedor temporal' -ForegroundColor Cyan
docker rm -f sivu-restore 2>$null | Out-Null
docker run -d --name sivu-restore -e POSTGRES_PASSWORD=restore_local -p 55432:5432 postgis/postgis:17-3.5 | Out-Null
$listo = $false
for ($i = 0; $i -lt 40; $i++) { Start-Sleep -Seconds 2; & "$bin\psql.exe" $u -At -c 'select 1' 2>$null | Out-Null; if ($LASTEXITCODE -eq 0) { $listo = $true; break } }
if (-not $listo) { throw 'El contenedor no respondió.' }
Start-Sleep -Seconds 3   # la imagen reinicia una vez tras crear PostGIS

try {
  $prep = @'
do $$ begin
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create role authenticator noinherit login;
exception when duplicate_object then null; end $$;
create schema if not exists extensions;
create extension if not exists postgis;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
'@
  $prep | & "$bin\psql.exe" $u -q -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) { throw 'Falló la preparación de roles y extensiones.' }

  & "$bin\psql.exe" $u -q -v ON_ERROR_STOP=1 -f (Join-Path $aqui 'auth_storage_estructura.sql')
  if ($LASTEXITCODE -ne 0) { throw 'Falló la estructura de auth y storage.' }
  $funciones = @'
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
'@
  $funciones | & "$bin\psql.exe" $u -q -v ON_ERROR_STOP=1

  $cAuth = Invoke-Nativo 'Restaurar datos de auth y storage' { & "$bin\pg_restore.exe" -h 127.0.0.1 -p 55432 -U postgres -d postgres --data-only --no-owner --no-privileges (Join-Path $Carpeta 'auth_storage.dump') }
  $cPub = Invoke-Nativo 'Restaurar public completo' { & "$bin\pg_restore.exe" -h 127.0.0.1 -p 55432 -U postgres -d postgres --no-owner --no-privileges (Join-Path $Carpeta 'public.dump') }

  Write-Host '-> Verificar' -ForegroundColor Cyan
  $errores = @(Select-String -Path $log -Pattern 'error:' | ForEach-Object { $_.Line })
  $erroresInesperados = @($errores | Where-Object { $_ -notmatch 'schema "public" already exists' })

  $fk = Get-Consulta "select count(*), coalesce(bool_and(convalidated), false) from pg_constraint where conname = 'user_profiles_id_fkey' and conrelid = 'public.user_profiles'::regclass and confrelid = 'auth.users'::regclass"
  $fkExiste = ($fk -split ',')[0] -eq '1'; $fkValidada = ($fk -split ',')[1] -eq 't'
  $huerfanos = [int](Get-Consulta 'select count(*) from public.user_profiles p left join auth.users u on u.id = p.id where u.id is null')
  $fksAuth = Get-Consulta "select count(*), coalesce(bool_and(convalidated), false) from pg_constraint where contype = 'f' and confrelid = 'auth.users'::regclass"

  $sqlConteo = "select table_schema || '.' || table_name, (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from %I.%I', table_schema, table_name), false, true, '')))[1]::text::bigint from information_schema.tables where table_schema in ('public','auth','storage') and table_type = 'BASE TABLE'"
  $rest = @{}; Get-Consulta $sqlConteo | ForEach-Object { $p = $_ -split ','; $rest[$p[0]] = [int64]$p[1] }

  $dif = @()
  $orig = Import-Csv (Join-Path $Carpeta 'conteos_origen.csv') -Header tabla, filas
  foreach ($o in $orig) { $k = "public.$($o.tabla)"; if ($rest[$k] -ne [int64]$o.filas) { $dif += "$k esperado $($o.filas), restaurado $($rest[$k])" } }
  foreach ($k in $esperadoAuth.Keys) { if ($rest[$k] -ne $esperadoAuth[$k]) { $dif += "$k esperado $($esperadoAuth[$k]), restaurado $($rest[$k])" } }
  $filasPublic = ($orig | Measure-Object -Property filas -Sum).Sum
  $filasAuth = ($esperadoAuth.Values | Measure-Object -Sum).Sum
  $usuarios = $rest['auth.users']; $objetos = $rest['storage.objects']

  $ok = ($erroresInesperados.Count -eq 0) -and $fkExiste -and $fkValidada -and ($huerfanos -eq 0) -and ($dif.Count -eq 0)
  $lineas = @(
    "Restauración conjunta (auth + storage + public) · $(Get-Date -Format 's')",
    "Respaldo: $(Split-Path $Carpeta -Leaf) · PostgreSQL 17 + PostGIS 3.5 en Docker (postgis/postgis:17-3.5)",
    '',
    "Resultado: $(if ($ok) { 'APROBADA' } else { 'FALLIDA' })",
    "  user_profiles_id_fkey existe: $fkExiste · validada: $fkValidada · referencias huérfanas: $huerfanos",
    "  FK hacia auth.users en total: $(($fksAuth -split ',')[0]) · todas validadas: $(($fksAuth -split ',')[1] -eq 't')",
    "  public: $($orig.Count) tablas, $filasPublic filas esperadas · auth y storage: $($esperadoAuth.Count) tablas con datos, $filasAuth filas esperadas (contadas en el dump)",
    "  auth.users restaurados: $usuarios · storage.objects restaurados: $objetos",
    "  Diferencias de conteo: $(if ($dif.Count) { $dif -join '; ' } else { 'ninguna' })",
    "  Errores de pg_restore: $($errores.Count) ($($erroresInesperados.Count) inesperados)"
  )
  foreach ($e in $errores) { $lineas += "    - $e" }
  $lineas += '', 'Procedimiento reproducible: tools/respaldo-sivu/probar_restauracion.ps1 (en el repositorio: scripts/respaldo/).'
  $lineas | Set-Content -Encoding utf8 $res
  $lineas | ForEach-Object { Write-Host "  $_" }
  if (-not $ok) { exit 1 }
}
finally {
  docker rm -f sivu-restore 2>$null | Out-Null
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
