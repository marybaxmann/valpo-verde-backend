# Relevo 2026-11-19 — Respaldo verificado de la base de pruebas antes de 040 y 041

> Evidencia para aplicar las migraciones **040** y **041** (CC-077, D-27 con dos fotos) en la base que usa sivu.cl. Responde a la condición de tener un respaldo recuperable antes de migrar (el plan Free de Supabase no tiene copias programadas).
>
> **Los respaldos completos (`.dump`) no están en el repositorio:** contienen cuentas y datos reales. Están en el equipo del frontend, en `C:\Users\usuario\respaldos-sivu\2026-11-19_0011\`. Si se necesitan, se comparten cifrados por un canal privado (ver «Cómo obtener los archivos»).

## Qué se respaldó

| Dato | Valor |
|---|---|
| Base | Supabase `gmlbmyreoxgoqrolhyxo` («valpo-verde-conecta-pruebas»), PostgreSQL 17.6, sa-east-1 |
| Fecha | 2026-11-19 00:11 (hora de Chile) |
| Herramienta | `pg_dump` 18, formato custom, por el Session pooler; script `scripts/respaldo/respaldar_sivu.ps1` |
| Quién | La responsable, con su contraseña; el agente no tuvo acceso a credenciales |

| Archivo | Contenido | SHA-256 |
|---|---|---|
| `public.dump` (0,65 MB, 475 objetos) | Esquema y datos de `public` y de `supabase_migrations` | `1b01ca74ac1e6ef577c1a9b8b8a6977d6ae77f8d61e44a52f0368d04015c61a2` |
| `auth_storage.dump` (0,14 MB, 38 objetos) | Datos de `auth` (cuentas) y `storage` (metadatos de fotos; los archivos no) | `404310365ac087db140e46259b7538976122cb8e8e58626301e0927c29ab03bc` |
| `fn_finalizar_inspeccion_antes.sql` | Definición vigente de la función de cierre (exige cuatro vistas). Es la vuelta atrás directa de la 040 | en `evidencia/` |
| `conteos_origen.csv` | Filas por tabla de `public` al respaldar | en `evidencia/` |

## Prueba de restauración

Restaurado `public.dump` en una base temporal PostgreSQL 17 + PostGIS 3.5 (Docker `postgis/postgis:17-3.5`), con los roles de Supabase (`anon`, `authenticated`, `service_role`) y un esquema `auth` mínimo:

- **35 de 35 tablas y 9 988 de 9 988 filas coinciden** con `conteos_origen.csv` (entre otras: `trees` 109, `tree_data_versions` 181, `inspections` 60, `evaluations` 60, `photos` 921, `work_orders` 66).
- Se restauraron el historial de migraciones (131 registros, el último `20261117003714`) y `fn_finalizar_inspeccion`.
- **2 errores, ambos esperados:**
  1. `schema "public" already exists`: la base nueva ya lo trae.
  2. La FK `user_profiles → auth.users` no se creó porque la prueba no cargó las cuentas completas (están en `auth_storage.dump`). Los datos de `user_profiles` sí entraron.

Registro completo: `evidencia/2026-11-19_respaldo-pre-040/restauracion_prueba.txt`.

## Restauración conjunta (auth + storage + public): APROBADA

Validación pedida por el equipo del backend: restaurar juntos `auth_storage.dump` y `public.dump`, respetando las dependencias, y comprobar `user_profiles_id_fkey`.

**Procedimiento** (`scripts/respaldo/probar_restauracion.ps1`, reproducible y sin credenciales de Supabase):
1. PostgreSQL 17 + PostGIS 3.5 en un contenedor temporal, con los roles y extensiones que Supabase trae por defecto.
2. Estructura de `auth` y `storage` (`scripts/respaldo/auth_storage_estructura.sql`): columnas, tipos y la secuencia `auth.refresh_tokens_id_seq`, leídas de `pg_catalog` del proyecto (sin datos). `auth_storage.dump` es solo de datos porque Supabase administra esos esquemas; en una recuperación real, el proyecto nuevo ya los trae.
3. Datos de `auth` y `storage`.
4. `public` completo, incluidas sus restricciones.

**Resultado** (dos corridas consecutivas desde cero, ambas aprobadas; `evidencia/2026-11-19_respaldo-pre-040/resultado_restauracion_conjunta.txt`):
- `user_profiles_id_fkey` **existe y está validada**; **0 referencias huérfanas**. Es la única FK hacia `auth.users` y está validada.
- **Sin diferencias de conteo:** `public` 35 tablas y 9 988 filas; `auth` y `storage` 37 tablas y 1 305 filas, contadas en el propio dump (entre ellas 9 cuentas y 932 objetos de Storage).
- Un solo error, esperado: `schema "public" already exists`.
- Corrección de procedimiento durante la prueba: la primera corrida falló porque faltaba crear `auth.refresh_tokens_id_seq` (el dump de datos restaura su valor). Se agregó a la estructura; el respaldo no cambió.

## Comprobación previa de la 040

La función guardada contiene **exactamente una vez** el bloque que la 040 reemplaza (el guardián de cuatro vistas) y la declaración `v_vistas_presentes integer;`. Por lo tanto, la 040 aplicará sin detenerse por «la definición de fn_finalizar_inspeccion no coincide con la esperada».

## Riesgo de 040 y 041

- **040:** reescribe el guardián de D-27 dentro de `fn_finalizar_inspeccion` (de cuatro vistas a dos fotos válidas y distintas). No toca registros. Tiene `.down.sql`.
- **041:** agrega `fn_proteger_retiro_foto_d27` y su trigger en `photos` (impide quitar una foto de una inspección ya finalizada). No toca registros. Tiene `.down.sql`.
- Ambas son transaccionales. Las fotos en Storage no se tocan.

## Cómo obtener los archivos

Si el equipo del backend necesita cotejar los `.dump`, la responsable genera un **zip cifrado (AES-256)** y lo comparte por un canal privado (por ejemplo, Google Drive con acceso solo para esa persona). La clave va **por un canal distinto** al del archivo. Al recibirlo, se cotejan las huellas SHA-256 de esta tabla.

## Siguiente paso

Con autorización de la responsable, aplicar 040 y 041 en `gmlbmyreoxgoqrolhyxo` con el ciclo del proyecto: aplicar → `database/fase6/pruebas_040_d27_minimo_fotografico.sql` → revertir → reaplicar → probar. Después, publicar `release/demo` (PR #81) y el frontend (#19, #20), y probar en sivu.cl un cierre con dos fotos sin etiqueta.

## Resultado: 040 y 041 aplicadas y CC-077 publicado (2026-11-19)

1. **Ciclo completo en una copia aislada** del respaldo (`sivu_f5d_local`, la base que exige `pruebas_040`): aplicar 040 y 041, `pruebas_040`, revertir, comprobar, reaplicar y `pruebas_040` otra vez. **Aprobado:** 6 de 6 casos en las dos rondas (cero, una, dos y varias fotos; Monitoreo; Evaluación instrumental). La reversión vuelve a exigir cuatro vistas sin el trigger, y los conteos no cambian. Registro: `evidencia/2026-11-19_respaldo-pre-040/ciclo_040_041_local.txt`; script: `scripts/respaldo/ciclo_040_041_local.ps1`.
   - Ajuste de procedimiento: al restaurar, los privilegios por defecto de Supabase daban permiso de ejecución de más sobre la función de cierre. La copia se dejó con la ACL de la base real, `{postgres, service_role}`, verificada antes de probar.
2. **Aplicadas en `gmlbmyreoxgoqrolhyxo`** con `apply_migration`, con los mismos archivos del repositorio: `040_d27_minimo_fotografico` (`20261119035144`) y `041_d27_serializar_retiro_foto` (`20261119035206`). Verificado después: la función exige dos fotos válidas y ya no cuatro vistas; el trigger de la 041 está instalado; `service_role` ejecuta y `anon`/`authenticated` no; datos sin cambios (109 árboles, 60 inspecciones, 921 fotos).
3. **Backend:** #81 fusionado en `release/demo` (`6851333`); Vercel `success`.
4. **Frontend:** #19 (`51eff0d`) y #20 (`06036f4`) fusionados en `feature/fase7-maqueta-lab`; Vercel `success`. El bloque publicado del formulario de inspección ya muestra el texto de CC-077.
5. **Pendiente:** la prueba de cierre con dos fotos en sivu.cl, con un Inspector y una OT de prueba en ejecución.
