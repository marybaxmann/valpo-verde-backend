# Convenciones de catálogos (LISTAS ↔ DICCIONARIO_CAMPOS)

Origen: CC-004 (aprobado por `marybaxmann`, 2026-10-04). Forma parte del
paquete metodológico 2.0.0, todavía **en preparación**: no está publicado y no
define `rule_version`.

## Propósito

Definir dónde vive cada dominio de valores de un campo, cómo se representa en
la hoja LISTAS del Excel maestro y cómo lo referencia DICCIONARIO_CAMPOS, de
modo que cada catálogo exista en un solo lugar editable (PR-002, principio
"un catálogo, un solo lugar").

## Autoridad

- **Metodológica:** REGLAS_INDICADORES y MATRICES_CALCULO. Son la autoridad
  sobre el significado, la lógica, los rangos y las reglas de cualquier escala.
- **Representación:** LISTAS. Solo representa código, etiqueta, orden y
  jerarquía. No define lógica.
- Si una escala de LISTAS no coincide con REGLAS_INDICADORES o
  MATRICES_CALCULO, se abre un CC. LISTAS nunca prevalece.
- DICCIONARIO_CAMPOS sigue siendo la autoridad sobre el contrato funcional del
  campo; para los dominios migrados, su dominio se define por referencia a
  LISTAS.

## Dónde se ubica un dominio

| Tipo de dominio | Ubicación |
|---|---|
| Exclusivo de un campo y corto | DICCIONARIO_CAMPOS (columna "Unidad / valores") |
| Compartido por varios campos | LISTAS |
| Jerárquico (depende de otro valor) | LISTAS |
| Escala ordinal | LISTAS |

**Sí/No** es un dominio base, no un catálogo: no se migra a LISTAS y sus
celdas en DICCIONARIO_CAMPOS no se modifican.

## Esquema de LISTAS (columnas P:X)

Encabezado en P1; datos desde P2.

| Col | Campo | Obligatorio | Regla |
|---|---|---|---|
| P | `id_catalogo` | Sí | snake_case ASCII |
| Q | `codigo` | Sí | snake_case ASCII (`^[a-z0-9_]+$`); único dentro de su catálogo; persistente |
| R | `etiqueta` | Sí | Texto visible |
| S | `orden` | Solo escalas | Entero; 1 = categoría más baja. Vacío en los demás catálogos |
| T | `catalogo_padre` | Solo jerárquicos | `id_catalogo` existente |
| U | `codigo_padre` | Solo jerárquicos | `codigo` existente en `catalogo_padre` |
| V | `estado_valor` | Sí | `vigente` · `reemplazado` · `descartado` |
| W | `cc` | Sí | CC que creó o modificó la fila |
| X | `observaciones` | No | Texto libre |

## Referencia desde DICCIONARIO_CAMPOS

Sintaxis: `LISTAS:<id_catalogo>`, opcionalmente seguida de una aclaración
entre paréntesis (por ejemplo, `LISTAS:accion (filtrado por tipo_ot)`).

En "Unidad / valores" la referencia reemplaza la enumeración completa. En
"Validación y dependencias" solo se reemplaza la frase de enumeración
("Valores permitidos: …" / "Resultado permitido: …"); el resto del texto se
mantiene.

## Código y etiqueta

- `codigo` es persistente y es lo que se almacena.
- `etiqueta` es solo de presentación. Cambiarla no requiere migrar datos.
- Un código no se reutiliza para otro significado. Un valor que deja de usarse
  se marca `reemplazado` o `descartado`; no se borra.

## Jerarquía de acciones

Hay una sola jerarquía `tipo_ot → accion → subtipo_accion`, compartida por
ORDENES DE TRABAJO, INSPECCIONES y MANTENIMIENTO.

- Una acción sin subtipos (Evaluación inicial, Reparación de alcorque,
  Soporte / tutorado, Otra intervención) guarda el subtipo vacío (null),
  **nunca** su propio nombre.
- El subtipo `otra` existe solo bajo `evaluacion_instrumental`. Si se elige,
  es **obligatorio** especificar en observaciones.
- `retiro_residuos` pertenece a `tala_retiro`.

## Catálogos de CC-004

12 catálogos, 70 valores, todos `vigente`:

| id_catalogo | Valores | Tipo |
|---|---|---|
| `tipo_ot` | 2 | base de la jerarquía |
| `accion` | 12 | jerárquico (padre `tipo_ot`) |
| `subtipo_accion` | 21 | jerárquico (padre `accion`) |
| `confirmacion_cavidad_interna` | 3 | compartido |
| `escala_probabilidad_falla` | 4 | escala |
| `escala_nivel_riesgo` | 4 | escala |
| `escala_consecuencia` | 4 | escala |
| `escala_probabilidad_impacto` | 4 | escala |
| `escala_zona_objetivo` | 4 | escala |
| `escala_tasa_ocupacion` | 4 | escala |
| `escala_clasificacion_infraestructura` | 4 | escala |
| `escala_prioridad` | 4 | escala |

Cada fila de escala indica en `observaciones` la regla o matriz que tiene la
autoridad sobre ella.

### No migrados

- **Tipos_de_conflicto:** descartado. No se migra; queda solo en el bloque
  técnico A:N.
- **Materialidad_infraestructura:** no se migra. Materialidad de vereda y de
  calzada son dominios separados, exclusivos de su campo, y permanecen en
  DICCIONARIO_CAMPOS. Calzada no admite Baldosa.

## Transición del bloque A1:N9

- El bloque A1:N9 de LISTAS y sus 14 rangos con nombre se conservan solo para
  que sigan funcionando los menús actuales del Excel.
- Está rotulado en A11 como técnico, derivado y "no editar". No es fuente de
  valores; la fuente es P:X.
- CC-012 regenerará los menús desde P:X y retirará el bloque. CC-004 no
  corrige menús.

## Diferencia pendiente: etiquetas de zona_objetivo

LISTAS usa la etiqueta larga de DICCIONARIO_CAMPOS ("Entre el límite de la
copa y 1× la altura del árbol"). Las filas de M01 en MATRICES_CALCULO usan la
forma corta ("Entre límite de copa y 1× altura"). La diferencia queda
registrada y se alineará en la sincronización del paquete 2.0.0.
MATRICES_CALCULO no se modifica en CC-004.

## Necesidades para frontend y backend

Solo se documenta la necesidad. No se definen endpoints ni su forma concreta.

- Guardar `codigo` y mostrar `etiqueta`.
- Selects dependientes filtrados por `codigo_padre`.
- Al cambiar el valor padre, limpiar los valores hijos.
- No hardcodear catálogos compartidos en React.
- La validación definitiva de los valores se hace en el backend.
- Se requiere un mecanismo de consulta de catálogos y un contrato funcional
  (qué catálogos, qué columnas y cómo se filtran). Su diseño queda fuera de
  CC-004.

## Relación con versionado

La relación de los catálogos con `rule_version` y `version_paquete` (si los
catálogos se versionan con `rule_version`) está **pendiente de CC-008**. No se
asume ninguna.
