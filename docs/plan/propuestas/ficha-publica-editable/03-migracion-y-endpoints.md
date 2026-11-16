# Migración 037 y endpoints — ficha pública editable (propuesta)

> **Propuesta, versión final del 2026-11-16 para la revisión de Mari. No aplicada en ninguna base.** El SQL está en `037_ficha_publica_editable.sql` y su reversión en `037_ficha_publica_editable.down.sql`, en esta carpeta, fuera de `database/migrations/` a propósito. No hay código de backend escrito: abajo se describe qué se haría.
>
> Orden para aplicarla: CC aprobado → filas incorporadas al Excel → autorización de Mari → base de pruebas `gmlbmyreoxgoqrolhyxo` con el ciclo de siempre (aplicar → pruebas → revertir → reaplicar → pruebas, md5 de up y down). Nunca en `ytcxswbulsmboucardxa`.

## 1. Modelo

| Qué | Dónde | Por qué así |
|---|---|---|
| Contenido ciudadano de la especie (D-280 a D-295) | Tabla nueva `species_public_content`, 1:1 con `species` | La editan otros roles que los datos botánicos. En una tabla aparte, el Inspector no puede escribir textos ciudadanos y el Usuario municipal no puede tocar género, familia, origen, follaje ni hoja. `fn_complete_species` (018i) queda igual. |
| Personalización por árbol (D-296 a D-307) | Tabla nueva `tree_public_content`, 1:1 con `trees`, creada al primer guardado | «Solo lo que difiere». Sin fila, la ficha muestra solo la especie y ninguna medida. |
| Medidas del ejemplar | **No se copian.** Se leen de los valores vigentes de `trees` (`dap_cm`, `altura_total_m`, `diametro_copa_m`, `clase_edad`, `rango_edad_estimada_anios`) | P1: «solo del inventario». Si una OT actualiza la medida, la ficha la muestra sola. |
| Fotos | Bucket nuevo **público** `conecta-publico`, solo WebP, 2 MB | Distinto de `tree-photos` (privado, evidencia técnica con EXIF, D-27). |

Bloques estructurados (aportes, rasgos, estaciones, ciclo, fuentes, textos personalizados) van en JSONB. La base controla el tipo, los máximos de elementos y las exclusiones (año **o** ciclo; artículo con nombre; crédito con foto; fuente con historia). La forma interna la valida Zod en el backend.

## 2. Permisos y RLS

- **Lectura interna:** RLS de SELECT. `species_public_content`, todo usuario autenticado (igual que `species`). `tree_public_content`, el Administrador y los miembros del proyecto del árbol (igual que `trees`).
- **Escritura:** ninguna política de INSERT, UPDATE o DELETE. Se escribe solo con cinco funciones SECURITY DEFINER, `search_path` fijo y `EXECUTE` solo para `service_role`, siguiendo el patrón de `fn_revisar_incidencia` (028):
  - `fn_assert_editor_contenido_publico`: exige Administrador o Usuario municipal, cuenta activa y, para la ficha de un árbol, que el Usuario municipal sea miembro del proyecto.
  - `fn_guardar_contenido_especie` y `fn_fijar_foto_especie`.
  - `fn_guardar_ficha_publica_arbol` y `fn_fijar_foto_ficha_publica`.
- **Proyecto cerrado (D-265):** trigger `fn_check_proyecto_no_cerrado('via_tree')` en `tree_public_content`, igual que el resto de las tablas del árbol.
- **Por qué funciones y no RLS de escritura:** el Administrador está en solo lectura en todo el resto (011, PR-004). Una política de escritura para él abriría un patrón distinto al de las demás tablas. Con funciones, la excepción queda en un solo lugar.
- `anon` sigue sin privilegios.

## 3. Fotos sin EXIF

El backend ya recodifica las fotos ciudadanas con `sharp` sin `.withMetadata()` (`photo.service.ts`, CC-049). Para la ficha se propone una variante:

1. Verificar el formato real con `sharp(...).metadata()`: JPG, PNG o WebP, hasta 10 MB de entrada.
2. `.rotate()` aplica la orientación EXIF **antes** de descartarla. Sin esto, una foto vertical de teléfono puede quedar girada. Hoy `verificarYProcesarFoto` no lo hace.
3. `.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })`.
4. `.webp({ quality: 80 })` sin `withMetadata`: sin EXIF, GPS, datos de cámara ni ICC.
5. Ruta aleatoria: `especies/<uuid>.webp` o `arboles/<uuid>.webp`. Nunca `tree_code`, `tree_id`, `qr_token` ni el nombre original.
6. Orden seguro: subir → llamar a la función → si falla, borrar lo subido. Si funciona, borrar el archivo anterior que devuelve la función.

**Prueba:** leer el archivo **guardado** con `sharp(...).metadata()` y comprobar que `exif`, `icc`, `xmp` e `iptc` vienen vacíos.

## 4. `fn_ficha_publica_arbol` ampliada

`CREATE OR REPLACE`. **Conserva todas las claves de la 028**, así que el frontend desplegado no se rompe, y agrega:

```jsonc
{
  // … claves de la 028 sin cambios …
  "nombre_visualizacion": "Olmo común",          // D-280 → D-14 → null («Un árbol de Valparaíso» en el frontend)
  "articulo": "el",
  "contenido_especie": {                          // null si no hay especie vigente o no tiene contenido
    "curiosidad": "…",                            // la del árbol (D-305) si existe; si no, la de la especie
    "aportes": [{ "icono": "sombra", "titulo": "Sombra en verano" }],
    "quien_soy": "…",
    "rasgos": [{ "etiqueta": "Semillas", "texto": "…", "foto_path": null, "credito": null }],
    "anio_estacional": { "prim": "…", "ver": "…", "oto": "…", "inv": "…" },   // o "ciclo": { titulo, pasos }
    "historia_especie": "…",
    "consejo": "…",
    "fuentes": [{ "bloques": ["quien_soy"], "tema": "Origen", "referencia": "POWO (Kew), Ulmus minor" }]
  },
  "ejemplar": { "historia": "…", "historia_fuente": "…" },          // vacío si no hay
  "foto_principal": { "tipo": "ejemplar" | "referencial_especie", "ruta": "…", "credito": "…" },  // o null
  "medidas": {                                    // solo las activadas con valor vigente
    "altura_total_m": { "valor": 12.5, "unidad": "m", "naturaleza": "medicion_o_estimacion" },
    "rango_edad_estimada_anios": { "codigo": "26_30", "naturaleza": "estimacion" }
  }
}
```

- El backend (`conecta.service.ts`) convierte las rutas en URL públicas del bucket y agrega las etiquetas de `clase_edad` y del rango de edad con `etiquetaDe`, como ya hace con el origen y el follaje.
- `naturaleza` (Valej, 2026-11-16): DAP, altura y copa = `medicion_o_estimacion` («medida en terreno o estimada con escala»); D-26 = `estimacion`; D-25 = `clasificacion` («clasificación del Inspector»). No se agrega un campo de método.
- Sigue sin entregar `tree_code`, `tree_id`, coordenadas, proyecto, riesgo, inspecciones, fotos técnicas, incidencias ni `updated_by`.
- **Límite conocido:** si un árbol tiene textos personalizados pero su especie no tiene contenido, `contenido_especie` sale `null` y la personalización no se ve. Se puede cambiar si Mari prefiere mostrarla igual.

## 5. Endpoints

Todos con `authMiddleware`. Siguen la forma de las rutas de especie que ya existen (`/api/sivu/projects/:id/species/...`), con `assertProjectRole(user, id, ["admin", "usuario_municipal"])`. La función SQL vuelve a verificar rol, cuenta activa y membresía.

| Método y ruta | Qué hace | Respuesta |
|---|---|---|
| `GET /api/sivu/conecta/arboles/:qrToken` | **Pública, ya existe.** Misma ruta y mismo límite, con la respuesta ampliada. | 200 / 404 igual para QR inexistente o mal formado |
| `GET /api/sivu/projects/:id/species/:speciesId/contenido-publico` | Contenido ciudadano de la especie, con quién y cuándo editó. | 200 (vacío si no hay) |
| `PUT /api/sivu/projects/:id/species/:speciesId/contenido-publico` | Guarda todo el contenido (reemplazo). Publica al guardar. Las fotos no se mandan aquí. | 200 / 400 Zod / 403 / 404 |
| `PUT /api/sivu/projects/:id/species/:speciesId/contenido-publico/fotos/:ranura` | Sube la foto referencial (`ranura = referencial`) o la de un rasgo (`ranura = <id del rasgo>`). Multipart: `foto` + `credito` (obligatorio). | 200 con la URL pública |
| `DELETE …/contenido-publico/fotos/:ranura` | Quita la foto y borra el archivo. | 204 |
| `GET /api/sivu/projects/:id/trees/:treeId/ficha-publica` | Lo propio del árbol + los valores vigentes de las 5 medidas (para que el formulario muestre qué se publicaría) + vista previa de la ficha completa. | 200 |
| `PUT /api/sivu/projects/:id/trees/:treeId/ficha-publica` | Guarda interruptores, «Mi historia», su fuente y textos personalizados. Publica al guardar. | 200 / 400 / 403 / 409 proyecto cerrado |
| `PUT /api/sivu/projects/:id/trees/:treeId/ficha-publica/foto` | Sube o reemplaza la foto pública del ejemplar. | 200 con la URL pública |
| `DELETE /api/sivu/projects/:id/trees/:treeId/ficha-publica/foto` | Quita la foto pública y borra el archivo. | 204 |

- **Límites:** `upload.middleware.ts` (10 MB, un archivo). Escritura con sesión: sin límite por IP adicional.
- **Errores:** SV080 y SV081 se traducen a 403 (rol o membresía) o 400 (datos), como SV070 y SV071 en `conecta.service.ts`. «está cerrado» → 409.
- **El árbol debe ser del proyecto `:id`:** se verifica antes de llamar a la función, como en `qrArbolController`.

## 6. Datos iniciales (después de aplicar y con autorización)

1. Script de carga en la base de pruebas: los textos aprobados de `contenidoEspecie.ts` (6 especies) a `species_public_content`. Las fuentes se cargan **por bloque** con la asignación de `06-fuentes-por-bloque.md` (respuesta 5 de Mari); «General» solo para lo que no tenga bloque claro. El nombre de visualización y el artículo salen de P11.
2. Fotos de `src/assets/especies/` y `src/assets/especies/reconocer/`, recodificadas por el mismo camino del punto 3. Hay que recodificarlas aunque ya sean WebP sin GPS. Cada una con autor y licencia; **no se carga la foto del olmo con marca de agua**: el olmo queda sin foto referencial hasta tener una propia (respuesta 8).
3. *Acer negundo* y *Lagerstroemia indica* **ya existen** en `species` de la base de pruebas: carga autorizada por Mari el 2026-11-16 (`database/cargas/2026-11-16_especies_p9.sql`).
4. **No se borra nada del frontend** hasta comprobar que la ficha desplegada lee todo desde la API.

## 7. Pruebas propuestas

- **SQL** (`database/fase6/pruebas_037_ficha_publica.sql`, a escribir): rol, cuenta activa, membresía, proyecto cerrado, CHECK de límites y exclusiones, conservación de fotos de rasgos al guardar, rutas devueltas para borrar, claves de la 028 iguales, medidas solo si interruptor en Sí y valor vigente, nada técnico en la respuesta, `anon`/`authenticated` sin `EXECUTE`.
- **Jest:** esquemas Zod, recodificación sin EXIF con orientación, URL pública, controladores con 403/404/409, regresión de `sivuConecta.routes.test.ts`.
