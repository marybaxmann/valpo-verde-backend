# Fotografías de la ficha pública de Valpo Verde Conecta

> Registro de origen y autoría de las fotografías que muestra la ficha pública (CC-078; D-285, D-291 a D-293, D-304). Estado al 2026-11-16, base de pruebas `gmlbmyreoxgoqrolhyxo`.

## Autoría

- **Las fotografías propias pertenecen al equipo de SIVU.** No se acreditan a personas.
- **El crédito no se muestra en la plataforma**, ni en la ficha pública ni en la edición (indicación de la responsable, 2026-11-16). En la base cada foto propia guarda el crédito «SIVU», porque D-285 y D-292 exigen registrar autor y licencia; este documento es el registro de su origen.
- Las fotografías de terceros solo se admiten como **referenciales temporales** marcadas para reemplazo (`foto_referencial_temporal` = Sí, D-293). En la base, su crédito es «Foto de terceros, uso referencial temporal».
- **Antes de retirar «Prototipo» de Conecta**, todas las fotografías deben ser propias del equipo (CC-078, observación f; `docs/registro-pendientes.md`).
- Todas se publican recodificadas a WebP sin metadatos (EXIF, GPS, cámara), con ruta aleatoria en el bucket público `conecta-publico`. Nunca se usan fotografías de inspección (D-27).

## Fotografías cargadas

| Especie | Uso | Origen | Autoría | Archivo en el bucket |
|---|---|---|---|---|
| Arce negundo (*Acer negundo*) | Foto referencial | Levantamiento del 2026-10-01, Plaza Victoria: AV_000009/IMG_9984 (árbol A-000425) | Equipo SIVU | `especies/1a484117-….webp` |
| Arce negundo | Rasgo «Hoja» | Levantamiento del 2026-10-01, Plaza Victoria | Equipo SIVU | `especies/90eb8006-….webp` |
| Falso plátano (*Acer pseudoplatanus*) | Foto referencial | Levantamiento del 2026-10-01, Plaza Victoria: AV_000007/IMG_9947 (árbol A-000423) | Equipo SIVU | `especies/c79c4abc-….webp` |
| Falso plátano | Rasgo «Hoja» | Levantamiento del 2026-10-01, Plaza Victoria | Equipo SIVU | `especies/d1057ad9-….webp` |
| Falso plátano | Rasgo «Flores» | Levantamiento del 2026-10-01, Plaza Victoria | Equipo SIVU | `especies/67ed1132-….webp` |
| Araucaria brasileña (*Araucaria angustifolia*) | Foto referencial y rasgo «Silueta» (la misma imagen) | Plaza Victoria, 2026-11-11 | Equipo SIVU | `especies/262d1460-….webp`, `especies/a96ced06-….webp` |
| Ginkgo (*Ginkgo biloba*) | Foto referencial | Plaza Victoria, 2026-11-11 | Equipo SIVU | `especies/7b742704-….webp` |
| Crespón (*Lagerstroemia indica*) | Rasgo «Hojas» | Levantamiento del 2026-10-01, Plaza Victoria | Equipo SIVU | `especies/a30a9a44-….webp` |
| Crespón | Foto referencial **temporal** | Imagen de terceros, origen no documentado | Terceros | `especies/b273bc81-….webp` |
| Olmo común (*Ulmus minor*) | Foto referencial **temporal** | Imagen de terceros, con marca de agua | Terceros | `especies/84a69345-….webp` |

Las fotografías de «Reconóceme» (rasgos) salen de las carpetas AV_000003, AV_000006, AV_000007 y AV_000012 del levantamiento.

## Por reemplazar

| Especie | Qué falta | Nota |
|---|---|---|
| Olmo común | Foto referencial propia | Hoy es de terceros, con marca de agua. Ningún olmo de la plaza tiene fotos propias todavía. |
| Crespón | Foto referencial propia | Ideal con flores (verano). |
| Varias | Fotos de rasgos sin imagen | Olmo «Semillas»; araucaria «Hojas»; ginkgo «Hoja»; crespón «Flores» y «Tronco». La ficha muestra «Foto próximamente». |

## Cómo se cargaron

- `database/cargas/2026-11-16_contenido_conecta.mjs`: textos, fuentes, fotos de rasgos y foto temporal del olmo.
- `database/cargas/2026-11-16_fotos_referenciales.mjs`: fotos referenciales del arce negundo y del falso plátano, y la temporal del crespón.
- `database/cargas/2026-11-16_fotos_sivu.mjs`: araucaria y ginkgo.
- `database/cargas/2026-11-16_creditos_sivu.sql`: deja el crédito de todas las fotos propias en «SIVU».
- Desde la API: `PUT /api/sivu/projects/:id/species/:speciesId/contenido-publico/fotos/:ranura` no pide crédito; guarda «SIVU», o el de terceros si la foto se marca como temporal.

Al cargar o reemplazar una fotografía, actualizar esta tabla.
