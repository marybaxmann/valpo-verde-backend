# Modelo conceptual: ÁRBOL y MEDICIONES_DENDROMETRICAS

Origen: CC-020 (aprobado por `marybaxmann`, 2026-10-05). Forma parte del
paquete metodológico 2.0.0, todavía **en preparación**: no está publicado y no
define `rule_version`. Decisión arquitectónica: ADR-016. Regla funcional:
PR-006 v7.0.

## Propósito

Distinguir lo que el ejemplar **es** (su identidad, relativamente estable) de
lo que se **midió** en él en una fecha (sus dimensiones, que cambian con el
tiempo), para conservar el historial dendrométrico y la trazabilidad de las
evaluaciones.

Este documento describe el modelo conceptual. No es un esquema físico: no
define tablas, claves, constraints ni migraciones (PR-002 v2.2, "Relación con
el modelo de datos").

## Evolución del modelo

- **Antes:** la ficha ARBOLES reunía en un único registro la identidad del
  ejemplar y sus dimensiones (DAP, altura, copa, primera rama, fustes, clase
  de edad), sin fecha de medición propia.
- **Problema:** las dimensiones cambian con el tiempo (crecimiento, poda,
  pérdida de fustes). Sobrescribirlas borra el historial y deja sin
  explicación las evaluaciones pasadas; por ejemplo, la zona del objetivo
  (`zona_objetivo`, M01) se define respecto de la altura total del árbol en
  el momento de evaluar.
- **Decisión:** separar el ÁRBOL de la MEDICIÓN DENDROMÉTRICA, un evento
  fechado. Las mediciones nuevas no reemplazan a las anteriores; corregir no
  es volver a medir; el valor actual se deriva de la última medición válida.
- **Resultado:** cada ejemplar conserva su evolución dendrométrica y cada
  evaluación puede reconstruirse con las dimensiones vigentes en su fecha.

## Entidades

```
ARBOLES  1 ───── N  MEDICIONES_DENDROMETRICAS
```

### ÁRBOL (anexo ARBOLES)

Identidad y caracterización relativamente estable del ejemplar:

- identificación: `id_arbol`, `id_proyecto`, `fecha_registro` (fecha del
  alta), `registrado_por`;
- ubicación: `ubicacion_wgs84` (ubicación canónica, obligatoria para completar
  el alta; ADR-010 v2.0), `sector`, `ubicacion_descriptiva`, y la coordenada
  original de levantamiento (`utm_este`, `utm_norte`, `huso`), pendiente;
- especie: `especie_cientifica`; `nombre_comun` se resuelve desde el catálogo
  de especies (PR-006 v7.0).

### MEDICIÓN DENDROMÉTRICA (anexo MEDICIONES_DENDROMETRICAS)

Registro fechado de las dimensiones y características dendrométricas
observadas, medidas o estimadas de un ejemplar arbóreo:

- identificación y trazabilidad: `id_medicion`, `id_arbol`, `fecha_medicion`,
  `fecha_registro`, `registrado_por`;
- dimensiones: `configuracion_fustes`, `numero_fustes`, `dap_fustes_cm`,
  `dap_cm`, `altura_total_m`, `diametro_copa_m`, `altura_primera_rama_m`,
  `clase_edad`;
- validez: `estado_medicion` (Válida / Anulada), `motivo_anulacion`,
  `anulado_por`, `fecha_anulacion`.

El contrato funcional de cada campo (definición, obligatoriedad, activación,
dominio, ámbito) vive en DICCIONARIO_CAMPOS. Todos los campos de ambas
entidades son de ámbito `operativo` (`docs/workflow.md` §14.12).

## Eventos

| Evento | Qué es | Efecto sobre el historial |
|---|---|---|
| **Medición inicial** | La medición registrada en el alta. Es obligatoria para completar el inventario del árbol. | Primera medición del ejemplar. |
| **Nueva medición** | Nuevo evento dendrométrico realizado al ejemplar. | Se agrega; no sobrescribe ninguna medición anterior. |
| **Corrección** | Se modifica un dato erróneo de la misma medición (p. ej. un error de digitación). | La medición se mantiene; la modificación queda auditada. No es una nueva medición. |
| **Anulación** | La medición completa deja de considerarse válida (anulación lógica). | Permanece en el historial con motivo, autor y fecha de anulación; no participa en el valor actual. |

Una modificación posterior de la especie es una corrección o refinamiento de
la identificación del ÁRBOL, no una nueva medición.

## Alta del árbol

Para el usuario, el alta es un único flujo:

```
Identificación → Ubicación → Especie → Medición dendrométrica inicial → Guardar
```

Conceptualmente produce **ÁRBOL + MEDICIÓN INICIAL**. El alta se completa
cuando el árbol queda georreferenciado (WGS84) y su medición inicial
registrada.

Datos obligatorios de la medición inicial:

- configuración de fustes;
- DAP (ejemplar de un solo fuste) o diámetros por fuste (ejemplar con más de
  un fuste);
- `altura_total_m`;
- `diametro_copa_m`;
- `altura_primera_rama_m`.

`clase_edad` es una estimación opcional: no es obligatoria para completar la
medición inicial.

**Ejemplares con más de un fuste.** Se conservan los datos primarios medidos:
los diámetros individuales de los fustes. El DAP equivalente se calcula
únicamente cuando exista una regla metodológica aprobada aplicable. Mientras
esa regla siga abierta, el DAP equivalente puede quedar pendiente de cálculo,
y su ausencia no impide completar la medición si se registraron los datos
primarios obligatorios.

## Última medición válida y valor actual

- **Última medición válida:** la medición con estado Válida y la
  `fecha_medicion` más reciente.
- `fecha_medicion` indica cuándo se realizó la medición. `fecha_registro`
  indica cuándo se ingresó al sistema; tiene función de trazabilidad
  administrativa y **no** determina cuál medición es la vigente. Una medición
  antigua cargada tarde no desplaza a una más reciente.
- **Valor dendrométrico actual:** se deriva de la última medición válida. No
  existe como un segundo dato editable independiente; para cambiarlo se
  registra una nueva medición, se corrige o se anula una existente.

## Medición e inspección técnica

MEDICIÓN DENDROMÉTRICA e INSPECCIÓN TÉCNICA son conceptos distintos. Registrar
una medición no constituye una inspección técnica (PR-003 v5.0), y el Usuario
municipal puede registrar mediciones.

**La relación entre ambas sigue ABIERTA.** Alternativas en estudio:

- (A) la inspección referencia una medición existente;
- (B) la inspección genera una nueva medición;
- (C) ambas posibilidades.

También queda pendiente qué ocurre si se corrige o anula una medición que ya
usó una inspección completada, que es inmutable (ADR-007).

## Pendientes

- Categorías definitivas de configuración de fustes (monofuste, bifurcado,
  multifuste), su relación con `numero_fustes` y la regla de DAP equivalente.
- Obligatoriedad de cada campo en mediciones posteriores a la inicial.
- Tratamiento metodológico de `clase_edad`.
- Política de especie no determinada, fuente y administración del catálogo de
  especies y nombres comunes.
- UTM, datum, huso y conservación de la coordenada original (ADR-010 v2.0).
- Relación MEDICIÓN ↔ INSPECCIÓN.
- Correspondencia entre `sector` / `ubicacion_descriptiva` y comuna,
  dirección y lugar de referencia (PR-006 v7.0).
- Permisos de anulación y de corrección de mediciones por el Usuario
  municipal.
