# Relevo 2026-11-15 — Mari

> **Relevo personal de Mari**, separado del `HANDOFF.md` del equipo. Registra el trabajo del 2026-11-14 y 2026-11-15 sobre **Valpo Verde Conecta**: QR geométrico para impresión 3D y fichas públicas de las seis especies (diseño V5). Termina con lo que **el backend** tiene que resolver para que ese trabajo avance, y con un prompt listo para copiar.
>
> Fuente de verdad metodológica: el Excel del repositorio (PR-002). Nada de lo que sigue modifica el Excel, y ninguna propuesta se aplica sin autorización de Mari.

---

## 1. Qué quedó hecho y dónde está

### 1.1 Backend — QR geométrico para impresión 3D

| Qué | Commit | Rama |
|---|---|---|
| Geometría del QR: módulos cuadrados fundidos en un solo contorno, margen de 4 módulos y corrección Q (`src/services/sivu/qrGeometria.ts`) | `e71871b` | `feature/fase6-backend-api` |
| `GET /api/sivu/projects/:id/trees/:treeId/qr?formato=svg\|stl&lado_mm&base_mm&relieve_mm&modo=relieve\|grabado` (solo Usuario municipal y árboles activos; módulo mínimo de 1 mm) | `e71871b` | `feature/fase6-backend-api` |
| El PDF de placas usa la misma geometría | `e71871b` | `feature/fase6-backend-api` |
| Fuentes de pdfkit incluidas para Vercel (antes solo estaban en `release/demo`) | `c63f423` | `feature/fase6-backend-api` |
| Lo mismo, desplegado en la API publicada | `20a2526` | `release/demo` (sivu-api.vercel.app) |

- **Pruebas:** pasan las 1688 de Jest, incluidas 12 nuevas (`tests/services/sivu/qrGeometria.test.ts` y casos en `sivuConecta.routes.test.ts`). Además, el SVG y el PDF se decodificaron con jsQR.
- **Los QR no cambian:** siguen apuntando a `CONECTA_URL_BASE/<qr_token>`, así que las placas ya impresas siguen funcionando. Solo cambió el dibujo de las placas nuevas (más margen y más corrección de errores).

### 1.2 Frontend — Valpo Verde Conecta (desplegado en sivu-plataforma.vercel.app)

| Qué | Commit |
|---|---|
| Vista previa real del QR en «Placas QR» y descargas SVG / STL relieve / STL grabado | `e172bd5` |
| Vista previa compacta y sin parpadeo | `a31e480` |
| **Ficha pública V5** de las seis especies: diseño y textos aprobados por Mari | `d2534b4` |
| Ver en grande la foto de la especie (visor a pantalla completa) | `edb7e9b` |

Rama `feature/fase7-maqueta-lab` del repositorio `valpo-verde-frontend`, que es la que despliega Vercel.

- **Dónde está el contenido:** los textos por especie están en `src/components/conecta/contenidoEspecie.ts`, con sus fuentes en el campo `fuentes`. Las fotos de «Reconóceme» están en `src/assets/especies/reconocer/` (WebP, sin GPS).
- **Estado provisional:** este contenido vive en el frontend **de forma provisional**, hasta que el backend tenga su lugar (§3.1).

### 1.3 Decisiones de Mari sobre la ficha pública (2026-11-14)

Las respuestas completas están en `C:\Users\usuario\code\RESPUESTAS_FICHA_PUBLICA.md`, en el equipo de Mari, fuera del repositorio. Lo esencial:

| Tema | Decisión |
|---|---|
| **Enfoque** | Ficha ciudadana **breve, visual y entretenida**, principalmente **por especie**, con estilo mixto (primera persona y botánica clara). Fuentes asociadas a cada contenido, pero sin citas en pantalla. |
| **Datos por árbol (P1)** | El Usuario municipal activa o desactiva, árbol por árbol, la clase de edad (D-25), la altura (D-19), el DAP (D-18), el diámetro de copa (D-22) y el rango de edad (D-26). Los valores salen **solo del inventario**. Si no hay dato, no se muestra nada. Hay que diferenciar lo medido de lo estimado. |
| **Contenido propio del árbol (P2)** | «Mi historia» de hasta 1.000 caracteres, con **fuente opcional** (obligatoria si hay una afirmación histórica concreta). Una **foto pública propia** por árbol, distinta de las fotos técnicas. |
| **Publicación (P3)** | **Al guardar**, sin borrador, aprobación ni versionado. |
| **Quién edita (P4)** | El **Usuario municipal** y el **Administrador**. El Inspector mantiene los datos botánicos del catálogo (CC-053), pero no edita el contenido ciudadano. |
| **Textos por especie (P5)** | En el **catálogo de especies**, reutilizados por todos sus árboles; un árbol puede personalizarse. |
| **Fotos (P6)** | Una foto referencial por especie, en Supabase Storage. La **foto principal definitiva es la del ejemplar del QR**. |
| **Rótulo «Prototipo» (P7)** | Se quita cuando Conecta esté operativo, con fichas correctas, QR que funcionan y reportes que funcionan. |
| **Excel (P8)** | Claude **prepara las filas** para `DICCIONARIO_CAMPOS` y no modifica el Excel sin autorización. Se crea una hoja nueva **`FICHAS_PUBLICAS`** vinculada a ARBOLES. El contenido general de la especie va en `CATALOGO_ESPECIES`. |
| **Catálogo (P9)** | Se aprueba agregar *Acer negundo* (Acer, Sapindaceae, introducida, caducifolia, latifoliada) y *Lagerstroemia indica* (Lagerstroemia, Lythraceae, introducida, caducifolia, latifoliada). |
| **Categorías (P10)** | No se cambian todavía. Las observaciones sobre la araucaria (hoja lanceolada) y el ginkgo (gimnosperma de hoja ancha) quedan anotadas. |
| **Nombres comunes de visualización (P11)** | Olmo común, Falso plátano, Arce negundo, Crespón, Araucaria brasileña y Ginkgo. Corregir la tilde de «Falso platano» en A-000346 por la vía del inventario. |
| **Historia** | **Historia de la especie** (en el catálogo) y **«Mi historia» del ejemplar** (en `FICHAS_PUBLICAS`) van separadas y no se duplican. |
| **Diseño V5** | **Aprobado** como referencia (maqueta: https://claude.ai/artifact/BetWYyWpKA5RjZKZNmUZMg). Textos de las seis especies **aprobados**. |

---

## 2. Pendiente que no es del backend

- **Fotos** (inventario detallado en `C:\Users\usuario\code\FOTOS_FICHAS_INVENTARIO.md`):
  - **Foto propia del olmo:** la ficha usa hoy una foto de terceros con marca de agua.
  - **Fotos de «Reconóceme»:** sámaras del olmo, hoja del ginkgo, hojas de la araucaria, y flores y tronco del crespón.
  - **Originales** de la araucaria y del ginkgo.
  - **Foto de cada ejemplar:** solo existe para A-000417 a A-000427.
- **Validaciones de Mari:**
  - Escanear una placa impresa (P21).
  - Revisar `CONECTA_URL_BASE` y `CORS_ORIGIN` en Vercel (P22).
- **Cuestionario de la ficha:** P13 a P23 quedaron en pausa por decisión de Mari.

---

## 3. Lo que este trabajo necesita del backend

> Orden sugerido. Todo lo que toca el modelo de datos requiere **CC + filas del Excel aprobadas por Mari + autorización para migrar**. Nada se aplica en la base real (`ytcxswbulsmboucardxa`, pausada).

### 3.1 Ficha pública editable (reescritura de la propuesta D6)

La propuesta original está en `valpo-verde-frontend/docs/propuestas-cc/D6-ficha-publica-editable-por-arbol.md` y quedó **superada por las decisiones del §1.3**.

**Cambios respecto de D6:**
- Sin estados borrador/publicada.
- El Administrador también edita.
- Contenido por especie en el catálogo y por árbol solo lo que difiere.

**Pasos:**

1. **Filas del Excel (preparar, no aplicar):**
   - `CATALOGO_ESPECIES`: textos ciudadanos de la especie, siguiendo la estructura de `contenidoEspecie.ts`:
     - curiosidad;
     - dos aportes (ícono + título);
     - quién soy;
     - rasgos de reconocimiento (etiqueta, texto, foto);
     - estaciones o ciclo;
     - historia de la especie;
     - consejo;
     - fuentes por bloque;
     - nombre de visualización (P11);
     - foto referencial.
   - Hoja nueva `FICHAS_PUBLICAS`, una fila por árbol:
     - interruptores para D-25, D-19, D-18, D-22 y D-26;
     - `historia` (≤1.000) y `historia_fuente`;
     - foto pública propia;
     - textos que reemplacen a los de la especie (opcional);
     - quién y cuándo editó.
   - La foto pública del árbol es un campo **distinto** de D-27 `fotografias_arbol`.
2. **CC** en `docs/registro-cambios.md`, con el procedimiento de `docs/workflow.md` §14.
3. **Migración**, después de la autorización:
   - columnas o tabla de contenido ciudadano en `species`;
   - tabla `tree_public_content` (o el nombre que se acuerde);
   - bucket público de fotos sin EXIF;
   - RLS para el Usuario municipal y el Administrador.
4. **Ampliar `fn_ficha_publica_arbol`:** contenido de la especie y, si existen, lo propio del árbol y las medidas activadas.
5. **Endpoints con sesión:** leer y guardar el contenido de la especie y de la ficha por árbol, y subir y quitar la foto.
6. **Datos iniciales:** pasar el contenido de `contenidoEspecie.ts` y las fotos de `src/assets/especies/` a la base y a Storage. **No se borra nada del frontend** hasta comprobar que la ficha los lee desde la API.

### 3.2 Catálogo de especies

- Agregar *Acer negundo* y *Lagerstroemia indica* con los datos de P9 (§1.3).
  - **Falta decidir el camino:** que lo haga un Inspector (CC-053) o una carga autorizada en la base de pruebas.
  - Hoy 60 de los 61 árboles no tienen `species_id` y se vinculan por el texto del nombre.
- **Pregunta abierta para Mari:** el DAP (D-18) y la altura (D-19) admiten «medición o estimación con escala», pero ningún campo registra el método usado en cada árbol. ¿Se agrega un campo de método, o basta con marcar como estimado el D-26?

### 3.3 Inventario

- **A-000346:** corregir «Falso platano» → «Falso plátano» por la vía vigente de corrección del inventario (no a mano en la base).
- **Árboles sin especie:** A-000507, 508, 509, 512 y 513 (P18). La ficha muestra «un árbol de Valparaíso».

### 3.4 Código territorial de los árboles (pedido inicial de Mari, sin decidir)

- **Propuesta evaluada:**
  - **Se mantiene `tree_code`** (A-000421) como `id_arbol` estable (D-2).
  - **Se agrega un código territorial** aparte (por ejemplo `PLA-VIC-PM-001`), con CC y una fila en el Excel.
- **Decisiones pendientes de Mari:**
  - Si se agrega el campo.
  - De dónde sale la referencia de la calle: una tabla de tramos o calles por sector, o que la elija el Inspector.
- **Lo que se puede usar:** todos los árboles tienen punto y UTM; `lugar_referencia` y `direccion` están vacíos.

### 3.5 Ramas y despliegue

- **Ramas separadas:** `release/demo` y `feature/fase6-backend-api` tienen cambios distintos. Antes del próximo despliegue hay que reconciliarlas sin perder el QR 3D ni las fuentes del PDF, que ya están en las dos.
- **`.env` local:** el worktree `valpo-verde-backend-qr3d` tiene un `.env` local con `CONECTA_URL_BASE=http://localhost:5173/arbol` para pruebas en el navegador. Con ese archivo, la prueba «placas QR sin CONECTA_URL_BASE» falla; sin él, pasan todas.

---

## 4. Prompt para la sesión del backend

```
Lee docs/relevo/RELEVO_2026-11-15_mari.md (rama feature/fase6-backend-api) antes de empezar.
Es un relevo de Mari, separado del HANDOFF del equipo.

Objetivo: preparar, sin aplicar nada, la ficha pública editable de Valpo Verde Conecta
según las decisiones del §1.3 (reescritura de la propuesta D6).

1. Verifica en el Excel vigente (docs/excel/Base de Datos Valpo Verde.xlsx) la estructura de
   DICCIONARIO_CAMPOS y CATALOGO_ESPECIES. Los D-n son filas del xlsx, no líneas del CSV.
2. Redacta las filas propuestas para DICCIONARIO_CAMPOS (CATALOGO_ESPECIES y la hoja nueva
   FICHAS_PUBLICAS) en un documento aparte, respetando las 12 columnas existentes.
   No modifiques el Excel.
3. Redacta el CC correspondiente como borrador (no lo registres como aprobado).
4. Propón la migración (tablas, RLS, bucket público sin EXIF, función fn_ficha_publica_arbol
   ampliada) y los endpoints, sin aplicarla.
5. Lista las preguntas que Mari debe responder antes de aplicar (incluida la de medido vs estimado del §3.2).

No toques el frontend, la base real ni release/demo. Entrega todo para la revisión de Mari.
```
