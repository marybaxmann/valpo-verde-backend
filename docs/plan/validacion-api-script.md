# Validación por API con script (PowerShell 7, Windows)

> Script: `scripts/validacion/validar-bloques.ps1`. Automatiza los casos de `plan-validacion-bloques-2026-11-02.md` §2 y la cancelación desde Pendiente (migración 034).
> **Estado:** preparado, **no ejecutado**: no se pudo correr PowerShell en la sesión en la nube. La primera ejecución de Valej es también la prueba del script. Si un caso falla por el propio script (no por la API), mándame el `resumen.md` y lo corrijo.
> Alternativa manual: `validacion-local-powershell.md`.

## 1. Qué hace

| Parte | Cuándo corre | Qué hace |
|---|---|---|
| 0. Entorno | Siempre | **V-1:** `.env` con URL y claves de `gmlbmyreoxgoqrolhyxo` (se detiene si menciona la base real). **V-2:** `/health`. **V-3:** el backend acepta los tokens del proyecto de pruebas y lee el proyecto QA, que solo existe en esa base. **V-4:** la API de avisos responde. Si algo falla, **se detiene** sin probar nada. |
| A. Solo lectura | Siempre | B8 (B8-1 a B8-9), B6 (B6-1 a B6-5 y B6-7), #63 (R-1, R-2; R-3 a R-5 BLOCKED hasta el 2026-11-13), validaciones de CC-051 (A-0, A-11). No crea ni modifica datos. |
| B. Crea datos | Solo con `-Modo Escritura` y escribiendo `CREAR` | 034 (034-1 a 034-5), CC-051 (A-2 a A-12), B6-6, CC-052 (L-1, L-2, L-3, L-5 a L-8). |

**Datos de QA que crea la parte B** (permanentes en la base de pruebas; se registran en `datos-creados.json` con id y código):
- 2 OT de monitoreo sobre A-000346: una para reasignar y otra para cancelar desde Pendiente;
- 1 OT de Levantamiento;
- 1 árbol nuevo, en el centroide del sector QA, con nombre común «Jacarandá»;
- su inspección en borrador.

**Garantías:**
- Nunca toca árboles ni OT preexistentes: solo actúa sobre las OT que crea, y tiene un bloqueo explícito que lo impide.
- No altera fechas ni elimina nada.
- El caso L-4 (fuera del sector) y el L-9 (finalizar y completar) quedan BLOCKED, porque requieren más datos.

**Seguridad:**
- Las contraseñas se piden con `Get-Credential` (ventana o consola con entrada oculta).
- Los tokens viven solo en memoria y se borran al terminar.
- Ni las evidencias ni los resultados guardan cabeceras, tokens ni contraseñas.
- Cada sesión se verifica: el token debe ser del proyecto de pruebas y de la cuenta de QA esperada para ese rol (por su id). Si no, se detiene.

## 2. Requisitos

1. Windows 10 u 11 con **PowerShell 7.4 o superior** (`pwsh`). Instalar: `winget install --id Microsoft.PowerShell`. Comprobar: `pwsh -v`.
2. Node.js 20 o superior y Git.
3. El repositorio `valpo-verde-backend` en la rama `feature/fase6-backend-api` **con el script** (publicado el 2026-11-02, commit `aaaaeb7`): `git pull origin feature/fase6-backend-api`.
4. El `.env` de pruebas en la carpeta del backend (guía manual §2) y el backend corriendo con `npm run dev` en otra ventana (guía manual §4).
5. Las contraseñas de las cuatro cuentas de QA: Usuario municipal, Inspector 1, Inspector 2 y Encargado. Opcional: un Administrador (`-ConAdmin`) y un usuario no miembro del proyecto QA (`-ConNoMiembro`). Sin ellos, B8-3 y B8-4 quedan BLOCKED.

## 3. Comandos (PowerShell 7, en la carpeta del backend)

Comprobar la sintaxis sin ejecutar nada (debe decir `Cantidad de errores: 0`):

```powershell
$t = $null; $e = $null; [void][System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path .\scripts\validacion\validar-bloques.ps1).Path, [ref]$t, [ref]$e); "Cantidad de errores: $($e.Count)"; $e | Select-Object -First 10 | ForEach-Object { "Linea $($_.Extent.StartLineNumber): $($_.ErrorId) - $($_.Message)" }
```

El script es 100 % ASCII desde la corrección del 2026-11-02 (ver `docs/registro-pendientes.md` §8). Por eso se analiza igual se lea como UTF-8 o como Windows-1252. Si vuelve a aparecer texto como `Ã¡`, la copia local es anterior a esa corrección.

**Paso 1 — solo lectura** (no crea datos):

```powershell
pwsh -NoProfile -File .\scripts\validacion\validar-bloques.ps1 -Modo Lectura
```

**Paso 2 — con escritura** (después de revisar el paso 1; pide escribir `CREAR`):

```powershell
pwsh -NoProfile -File .\scripts\validacion\validar-bloques.ps1 -Modo Escritura
```

Opciones:
- `-ConAdmin -ConNoMiembro`: casos de permisos adicionales.
- `-Api http://localhost:3000`: si el backend corre en otro puerto.
- `-Salida <carpeta>`: dónde se guardan los resultados.

Si Windows bloquea el archivo por venir de internet: `Unblock-File .\scripts\validacion\validar-bloques.ps1`.

## 4. Resultados

Por defecto en `%USERPROFILE%\sivu-validacion\<fecha-hora>\`, fuera del repositorio:

- `resumen.md`: tabla PASS / FAIL / BLOCKED por caso y datos creados. **Este es el archivo para mandarme.**
- `resultados.csv` y `resultados.json`: lo mismo, en tabla.
- `evidencias\<caso>.json`: rol, método, ruta, cuerpo enviado, status y respuesta de cada caso.
- `datos-creados.json`: ids y códigos de lo creado. Se guarda tras cada creación, aunque el script se corte.

El script termina con código 1 si algún caso falla.

## 5. Casos y resultado esperado

| Caso | Esperado |
|---|---|
| B8-1 | 200. A-000346 crítico 100 %, con 6 componentes y etiquetas |
| B8-2 | 200 para Inspector y Encargado, con la misma cobertura |
| B8-3 / B8-4 / B8-5 | Admin 200 / no miembro 403 / sin token 401 |
| B8-6 | Filtros: 200, y el resumen no cambia |
| B8-7 | 400 en los tres casos inválidos |
| B8-8 | La ficha de A-000346 también dice crítico |
| B8-9 | Piloto: A-000419 bajo 13,33; A-000426 y A-000423 bajo 8,33; A-000422 moderado 16,67. BLOCKED si la cuenta no es miembro del Piloto |
| B6-1 / B6-7 | Piloto: solo OT-M-000020, vencida; su ficha la marca vencida (BLOCKED si no es miembro) |
| B6-2 | Toda OT trae `vencida`; ninguna vencida fuera de Programada ni con fecha de hoy o futura |
| B6-3 / B6-4 / B6-5 | 200 solo vencidas / 403 / 400 |
| B6-6 | Una OT programada hoy no está vencida |
| R-1 / R-2 | Antes del 2026-11-13: 0 recordatorios |
| R-3 a R-5 | Desde el 2026-11-13, con `-Modo Escritura`: recordatorios, sin duplicados, y los mismos árboles que `upcoming-inspections` |
| 034-1 / 034-2 | Cancelar una OT **Pendiente**: 200; queda cancelada y sin fecha programada |
| 034-3 / 034-4 / 034-5 | Repetida 422 / Inspector 403 / motivo vacío 400 |
| A-2 a A-4 | Reasignar: 200, con avisos al Inspector nuevo y al anterior |
| A-6 | Aviso `ot_cancelada` al Inspector 1, con el motivo |
| A-7 | El Encargado no recibe avisos ajenos |
| A-8 a A-10 | Marcar leído 200, `no_leidas` baja en 1; otro usuario 404; repetir no cambia `leido_at` |
| A-11 | 400 |
| A-12 | Programar no genera avisos |
| L-1 | Árboles cercanos: 200 |
| L-2 / L-2b / L-2c | 201 con `arbol_nuevo` true; el inventario sube en 1; el árbol tiene ficha |
| L-3 | 200, sin otro árbol |
| L-5 / L-6 / L-7 / L-8 | 400 / 422 / 422 / 403 |
