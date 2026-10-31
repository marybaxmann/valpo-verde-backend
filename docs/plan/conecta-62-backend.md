# Valpo Verde Conecta — trabajo del backend (#62)

> Tarea pedida por la responsable el 2026-10-30, después de F-9 del plan de la presentación. **No es parte del plan** del 2026-11-03: se hace después del congelamiento, salvo que la responsable decida otra cosa. La fuente que manda es **CC-062 (PR-022 v2.0)** en `docs/registro-cambios.md`, con CC-036, CC-049 y CC-033; este archivo solo ordena lo que falta construir. Ante cualquier diferencia, manda el CC.
>
> El frontend ya tiene las pantallas en la maqueta visual de la responsable; necesita estos endpoints para conectarlas.

## Lo que ya existe (verificado el 2026-10-30 en `valpo-verde-conecta-pruebas` y en `feature/fase6-backend-api`)

- `trees.qr_token`: `uuid` con `gen_random_uuid()`; los 22 árboles de la base lo tienen. Identifica el QR sin exponer el `tree_code` (CC-062 f).
- `incidents` con `tipo_incidencia`, `descripcion`, `estado_incidencia`, `origen_reporte`, `codigo_incidencia`, `fecha_reporte`, `resultado_revision`, `fecha_revision`, `revisado_por`, `observaciones_revision`, `prioridad_municipal`.
- `photos.incident_id`, el bucket privado `tree-photos` y `verificarYProcesarFoto(buffer, true)`, que recodifica y quita EXIF/GPS (CC-049 punto 6).
- `express-rate-limit` y `sharp` instalados.
- Las rutas `/:id/incidents` de `src/routes/project.routes.ts` son de la demo vieja (fuera de `sivu/`): no cumplen CC-036 ni CC-062 y no se reutilizan.

## Lo que falta

### 1. Migración (mostrarla antes de aplicar; ciclo completo en pruebas)

1. `incidents.nombre_reportante` (D-178) y `incidents.rut_reportante` (D-179): **hoy no existen**.
2. Huella del código de seguimiento (nunca el código en claro) y su borrado 90 días después de Resuelta o Descartada (CC-062 c).
3. Borrado de nombre y RUT al registrar `resultado_revision` Validada o Descartada; se conservan con «Requiere antecedentes» (PR-022 v1.0, puntos 4 y 5).
4. Dos funciones de solo lectura, `SECURITY DEFINER`, `search_path` fijo, `EXECUTE` solo para `service_role`: ficha pública por `qr_token` y estado por código de seguimiento (PR-018 v4.0). `anon` sigue sin privilegios.

### 2. Endpoints públicos (sin sesión)

| Endpoint | Entrega | Reglas |
|---|---|---|
| Ficha pública por `qr_token` | `especie_cientifica` (D-13), `nombre_comun` (D-14), `ubicacion_descriptiva` (D-8) y «Sobre esta especie» (D-257 a D-262, con las reglas de D-260 a D-262 cuando no hay especie vigente) | Nunca `tree_code`, coordenadas, proyecto, riesgo, inspecciones, fotos ni incidencias. Token inexistente o mal formado: misma respuesta. |
| Formulario de reporte | Crea la incidencia (`origen_reporte` ciudadano) y devuelve el código de seguimiento **una sola vez** | Nombre, RUT con dígito verificador, tipo, descripción y al menos una foto (sin metadatos). 10 reportes por hora por IP (CC-049). Código aleatorio criptográfico, ≥ 128 bits. Sin ningún dato de contacto. |
| Seguimiento | Solo `estado_incidencia` (D-184) | Código en el cuerpo, no en la URL. 30 consultas por hora por IP. Inexistente, vencido o mal formado: misma respuesta. |

### 3. Endpoints internos (con sesión)

- **B9:** listado y detalle de incidencias del proyecto. Nombre y RUT solo para el Usuario municipal miembro; los demás roles, sin ellos (CC-036 punto 3; CC-064 a).
- **Revisión:** estado y `resultado_revision` por el Usuario municipal; derivación a inspección u OT.
- **Placas QR:** archivo imprimible, solo para el Usuario municipal del proyecto (CC-062 e). Hace falta una librería de QR/PDF (hoy no está instalada).

### 4. Pruebas que exige CC-062

La ficha no entrega datos técnicos; las tres respuestas de seguimiento inválido son iguales; la consulta 31 por IP en una hora se rechaza; el código tiene ≥ 128 bits y la base no lo guarda en claro; la huella se borra al vencer; las funciones no son ejecutables por `anon` ni `authenticated`; solo el Usuario municipal genera placas; nombre, RUT y fotos siguen CC-036 y CC-049; `anon` sigue sin lectura (verificación sobre la 017). Más el script SQL contra pruebas (lección permanente del HANDOFF).

## Decisiones o datos pendientes antes de empezar

1. **Excel:** el código de seguimiento no está en DICCIONARIO_CAMPOS (AM-15); la responsable lo agrega en la próxima versión del paquete.
2. **Catálogo de especies:** «Sobre esta especie» depende de `species`. Hoy solo tiene *Acer pseudoplatanus*; los árboles del piloto se enlazan en su próxima inspección (F-9, decisión de la responsable). Mientras tanto, su ficha pública sale sin esa sección.
3. **CORS:** si las vistas públicas se sirven desde otro dominio, agregarlo a `CORS_ORIGIN` de la API en Vercel.
4. **Coordinación:** cada endpoint nuevo se anota en `docs/plan/coordinacion.md` el mismo día, como en B-6.

## Estimación

Backend: 1,5 a 2 días con pruebas. Frontend (conectar las vistas de la maqueta): 1 a 1,5 días.
