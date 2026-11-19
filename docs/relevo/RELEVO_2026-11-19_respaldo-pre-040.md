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
