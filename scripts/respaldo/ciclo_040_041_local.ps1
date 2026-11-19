# Ciclo completo de 040 y 041 (CC-077) sobre una copia restaurada del respaldo, en una base AISLADA
# llamada sivu_f5d_local (la que exige pruebas_040). No toca Supabase.
#   aplicar 040 -> aplicar 041 -> pruebas_040 -> revertir 041 -> revertir 040 -> comprobar -> reaplicar -> pruebas_040
param([string]$Carpeta)
$ErrorActionPreference = 'Continue'
$bin = 'C:\Program Files\PostgreSQL\18\bin'
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$raiz = Split-Path -Parent $aqui
if (-not $Carpeta) { $Carpeta = (Get-ChildItem "$HOME\respaldos-sivu" -Directory | Sort-Object Name -Descending | Select-Object -First 1).FullName }
$env:PGPASSWORD = 'restore_local'; $env:LC_MESSAGES = 'C'
$base = 'postgresql://postgres@127.0.0.1:55432/postgres'
$u = 'postgresql://postgres@127.0.0.1:55432/sivu_f5d_local'
$log = Join-Path $Carpeta 'ciclo_040_041_local.txt'
Remove-Item $log -ErrorAction SilentlyContinue

function Paso([string]$titulo, [string[]]$argumentos, [switch]$PuedeFallar) {
  Write-Host "-> $titulo" -ForegroundColor Cyan
  "== $titulo" | Add-Content -Encoding utf8 $log
  & "$bin\psql.exe" $u -X -q -v ON_ERROR_STOP=1 @argumentos 2>&1 | ForEach-Object { "$_" } | Where-Object { $_ -notmatch 'RemoteException' } | Tee-Object -FilePath $log -Append | Out-Host
  $c = $LASTEXITCODE
  "   código: $c" | Add-Content -Encoding utf8 $log
  if ($c -ne 0 -and -not $PuedeFallar) { throw "Falló: $titulo" }
}
function Valor([string]$sql) { (& "$bin\psql.exe" $u -X -At -c $sql) }

docker rm -f sivu-restore 2>$null | Out-Null
docker run -d --name sivu-restore -e POSTGRES_PASSWORD=restore_local -p 55432:5432 postgis/postgis:17-3.5 | Out-Null
$listo = $false
for ($i = 0; $i -lt 40; $i++) { Start-Sleep -Seconds 2; & "$bin\psql.exe" $base -At -c 'select 1' 2>$null | Out-Null; if ($LASTEXITCODE -eq 0) { $listo = $true; break } }
if (-not $listo) { throw 'El contenedor no respondió.' }
Start-Sleep -Seconds 3

try {
  & "$bin\psql.exe" $base -q -c 'create database sivu_f5d_local' | Out-Null
  $prep = @'
do $$ begin
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create role authenticator noinherit login;
exception when duplicate_object then null; end $$;
create schema if not exists extensions;
create extension if not exists postgis;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
'@
  $prep | & "$bin\psql.exe" $u -q -v ON_ERROR_STOP=1 2>&1 | Out-Null
  & "$bin\psql.exe" $u -q -v ON_ERROR_STOP=1 -f (Join-Path $raiz 'auth_storage_estructura.sql') | Out-Null
  @'
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
'@ | & "$bin\psql.exe" $u -q -v ON_ERROR_STOP=1 | Out-Null
  & "$bin\pg_restore.exe" -h 127.0.0.1 -p 55432 -U postgres -d sivu_f5d_local --data-only --no-owner --no-privileges (Join-Path $Carpeta 'auth_storage.dump') 2>&1 | Out-Null
  # Con permisos (sin --no-privileges): pruebas_040 verifica que la 040 conserve los GRANT de fn_finalizar_inspeccion.
  & "$bin\pg_restore.exe" -h 127.0.0.1 -p 55432 -U postgres -d sivu_f5d_local --no-owner (Join-Path $Carpeta 'public.dump') 2>&1 | Out-Null
  # Al restaurar, los privilegios por defecto de Supabase incluidos en el dump dan EXECUTE a anon y authenticated
  # sobre las funciones recreadas. En la base real la ACL es {postgres, service_role} (verificado el 2026-11-19);
  # se deja la copia igual a la real antes de probar.
  & "$bin\psql.exe" $u -X -q -c "revoke execute on function public.fn_finalizar_inspeccion(uuid,uuid,jsonb,jsonb,date,date,date,date,text) from public, anon, authenticated; grant execute on function public.fn_finalizar_inspeccion(uuid,uuid,jsonb,jsonb,date,date,date,date,text) to service_role" | Out-Null
  "Permisos de fn_finalizar_inspeccion antes de 040: service_role $(Valor "select has_function_privilege('service_role','public.fn_finalizar_inspeccion(uuid,uuid,jsonb,jsonb,date,date,date,date,text)','EXECUTE')"), anon $(Valor "select has_function_privilege('anon','public.fn_finalizar_inspeccion(uuid,uuid,jsonb,jsonb,date,date,date,date,text)','EXECUTE')"), authenticated $(Valor "select has_function_privilege('authenticated','public.fn_finalizar_inspeccion(uuid,uuid,jsonb,jsonb,date,date,date,date,text)','EXECUTE')")" | Tee-Object -FilePath $log -Append | Out-Host
  "Copia restaurada: $(Valor 'select count(*) from public.trees') árboles, $(Valor 'select count(*) from public.inspections') inspecciones" | Tee-Object -FilePath $log -Append | Out-Host

  $fn = "pg_get_functiondef('public.fn_finalizar_inspeccion(uuid,uuid,jsonb,jsonb,date,date,date,date,text)'::regprocedure)"
  Paso 'Aplicar 040' @('-f', (Join-Path $aqui '040_d27_minimo_fotografico.sql'))
  Paso 'Aplicar 041' @('-f', (Join-Path $aqui '041_d27_serializar_retiro_foto.sql'))
  Paso 'pruebas_040 (1.ª ronda)' @('-f', (Join-Path $aqui 'pruebas_040_d27_minimo_fotografico.sql'))
  Paso 'Revertir 041' @('-f', (Join-Path $aqui '041_d27_serializar_retiro_foto.down.sql'))
  Paso 'Revertir 040' @('-f', (Join-Path $aqui '040_d27_minimo_fotografico.down.sql'))
  $vuelta = Valor "select (position('v_vistas_presentes < 4' in $fn) > 0) and not exists (select 1 from pg_trigger where tgname = 'trg_proteger_retiro_foto_d27')"
  "Tras revertir, vuelve a exigir cuatro vistas y sin trigger: $vuelta" | Tee-Object -FilePath $log -Append | Out-Host
  if ($vuelta -ne 't') { throw 'La reversión no dejó el estado anterior.' }
  Paso 'Reaplicar 040' @('-f', (Join-Path $aqui '040_d27_minimo_fotografico.sql'))
  Paso 'Reaplicar 041' @('-f', (Join-Path $aqui '041_d27_serializar_retiro_foto.sql'))
  Paso 'pruebas_040 (2.ª ronda)' @('-f', (Join-Path $aqui 'pruebas_040_d27_minimo_fotografico.sql'))
  $final = Valor "select (position('v_fotos_validas_d27 < 2' in $fn) > 0) and exists (select 1 from pg_trigger where tgname = 'trg_proteger_retiro_foto_d27')"
  "Estado final con 040 y 041: $final" | Tee-Object -FilePath $log -Append | Out-Host
  "Conteos sin cambios tras el ciclo: árboles $(Valor 'select count(*) from public.trees'), inspecciones $(Valor 'select count(*) from public.inspections'), fotos $(Valor 'select count(*) from public.photos')" | Tee-Object -FilePath $log -Append | Out-Host
  if ($final -ne 't') { throw 'El estado final no es el esperado.' }
  'CICLO APROBADO' | Tee-Object -FilePath $log -Append | Out-Host
}
finally {
  docker rm -f sivu-restore 2>$null | Out-Null
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
