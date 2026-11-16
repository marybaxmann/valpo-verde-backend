# Ficha pública editable de Valpo Verde Conecta — paquete para la revisión de Mari

> **Propuesta del 2026-11-15. CC-073 APROBADO por Mari el 2026-11-16** y registrado en `docs/registro-cambios.md`; filas D-280 a D-307 copiadas al Excel. **La 037 está aplicada en la base de pruebas** (2026-11-16, autorizada por Mari; ahora en `database/migrations/`) con la carga inicial del contenido. Preparada a partir de `docs/relevo/RELEVO_2026-11-15_mari.md` (§1.3 y §3.1), que reescribe la propuesta D6. **No modifica nada:** ni el Excel, ni `docs/registro-cambios.md`, ni la base (de pruebas o real), ni el frontend, ni `release/demo`. La única escritura en la base de pruebas fue la carga aparte de dos especies (`database/cargas/2026-11-16_especies_p9.sql`, autorizada por Mari).

| Archivo | Qué es |
|---|---|
| `01-filas-diccionario.md` | Las 28 filas propuestas para DICCIONARIO_CAMPOS: 16 de CATALOGO_ESPECIES y 12 de la hoja nueva FICHAS_PUBLICAS. Usan las 12 columnas vigentes, verificadas en el `.xlsx`. |
| `01-filas-diccionario.csv` | Las mismas filas, listas para copiar en la hoja (UTF-8). |
| `generar_filas.py` | Genera los dos archivos anteriores desde una sola fuente. No lee ni escribe el Excel. |
| `02-CC-borrador.md` | Borrador del CC con el formato del registro (número provisional CC-073), **sin registrar**. |
| `database/migrations/037_ficha_publica_editable.sql` / `.down.sql` | Migración y su reversión (movidas desde esta carpeta al aplicarla): tablas, RLS, bucket público, funciones de escritura y `fn_ficha_publica_arbol` ampliada. Aplicada solo en la base de pruebas. |
| `03-migracion-y-endpoints.md` | Explicación del modelo, los permisos, las fotos sin EXIF, la función pública ampliada, los endpoints, los datos iniciales y las pruebas. |
| `05-preguntas-para-mari.md` | 12 preguntas, **todas respondidas** (Mari: 2, 3, 5 a 12; Valej: 1 y 4, medidas). |
| `06-fuentes-por-bloque.md` | Asignación de las fuentes de las seis especies a los bloques de la ficha, para la carga inicial, con 3 puntos menores para Mari. |

## Hallazgos de la verificación

1. **Excel:** DICCIONARIO_CAMPOS tiene D-2 a D-279 con 12 columnas. CATALOGO_ESPECIES ocupa D-257 a D-262. FICHAS_PUBLICAS no existe.
2. **P4 contradice PR-004 v7.0:** hoy el Administrador está en solo lectura, incluidas las fichas. El CC propone PR-004 v8.0 (pregunta 2).
3. **CC-062 limitó la ficha** a D-8, D-13, D-14 y D-257 a D-262: «un texto editorial nuevo requiere otro CC». El borrador es ese CC y crea PR-022 v3.0.
4. **Numeración:** CC-072 ya existe en `wip/fichas-qr-especies`. CC-068 tiene 4 filas de CATALOGO_ESPECIES pendientes de entrar al Excel. Los SQLSTATE SV073 a SV077 están en uso. Por eso se usan CC-073, D-280+ y SV080/SV081, todos provisionales.
5. **Fotos:** el procesamiento actual sin metadatos no aplica la orientación EXIF. Se propone `.rotate()` para las fotos públicas.
6. **Medidas:** los valores vigentes ya están en `trees` (`dap_cm`, `altura_total_m`, `diametro_copa_m`, `clase_edad`, `rango_edad_estimada_anios`), así que no se copia ninguna medida.
