# Decisiones — Auditoría del modelo de datos 2026-10-18

Todas aprobadas por `marybaxmann` el 2026-10-18 durante la auditoría. Se registran en CC-026. Entre paréntesis, la referencia interna de la sesión.

## 1. Roles y responsabilidades

| ID | Decisión | Reemplaza / afecta |
|---|---|---|
| AMD-01 | El modelo tiene cuatro roles: **Administrador**, **Usuario municipal**, **Inspector** y **Encargado de mantención**. El término único del rol técnico es "Inspector" (se elimina "Inspector Municipal"). (Acuerdos previos; C1, D1, E1, F1, G1, H2) | CC-015 (decide el modelo de roles); ADR-006 v1.1; PR-009 v2.0 |
| AMD-02 | **Administrador:** crea proyectos, gestiona sus miembros y la delimitación territorial (polígono o multipolígono, importable desde KML/KMZ); no realiza evaluaciones técnicas. (Acuerdos previos) | Compatible con PR-004 v5.0; agrega la delimitación |
| AMD-03 | **Usuario municipal:** en el alta solo ingresa el nombre común o científico y la ubicación (coordenadas, sector y descripción del lugar). Crea las OT, gestiona `estado_ot` y define si una OT de Mantenimiento requiere revisión del Inspector. **No ingresa datos técnicos** (origen biogeográfico, fustes, DAP, altura, clase de edad, evaluaciones). (Acuerdos previos; B1–B7, I8, N1 de mantenimiento) | PR-003 v6.0 (que le permitía registrar mediciones) |
| AMD-04 | **Inspector:** registra y modifica todos los datos técnicos mediante OT; puede registrar árboles nuevos durante una OT de Levantamiento sin alta municipal previa; confirma o corrige la especie; es el único que incorpora especies al catálogo; aprueba o rechaza las ejecuciones de mantenimiento que requieren revisión. (Acuerdos previos; D9, K) | PR-003 v6.0; PR-006 v7.0 |
| AMD-05 | **Encargado de mantención:** registra la ejecución de mantenimiento y su evidencia fotográfica. (K) | CC-015 (pendiente "Encargado de mantención") |

## 2. Árbol, historial y vigencia

| ID | Decisión | Reemplaza / afecta |
|---|---|---|
| AMD-06 | Se conserva el historial de todos los datos técnicos del árbol: ARBOLES muestra el valor vigente y la plataforma conserva cada versión anterior vinculada a la inspección que la registró. No se sobrescribe el historial. (D1) | ADR-016 v1.0 (relación medición ↔ inspección: la inspección registra la medición) |
| AMD-07 | En una nueva inspección pueden precargarse valores anteriores; solo se conservan si el Inspector los confirma, y entonces cuentan como mediciones de esa inspección. (Acuerdos previos) | ADR-016 v1.0 |
| AMD-08 | Los valores nuevos se hacen vigentes al completar **toda** la OT. La evaluación vigente es la de la OT completada más recientemente según `fecha_completada_ot` (campo nuevo, asignado por el Sistema), aunque su `fecha_inspeccion` sea anterior a la de otra inspección. Sin evaluación vigente se muestra "Evaluación pendiente". (D2) | ADR-016 v1.0 punto 8 y PR-006 v7.0 ("última medición válida por `fecha_medicion`") |
| AMD-09 | El alta municipal **no exige medición**: el árbol registrado se considera presente aunque su evaluación técnica esté pendiente. (Acuerdos previos) | ADR-016 v1.0 punto 4; PR-006 v7.0 (medición inicial obligatoria en el alta) |
| AMD-10 | Si el árbol ya existe, se reutiliza su identificador y se agrega una nueva evaluación; no se duplica. (Acuerdos previos) | — |
| AMD-11 | `especie_cientifica` y `nombre_comun` son obligatorios para finalizar la inspección; el alta municipal se acepta con uno solo. No se admiten "Género sp." ni "No determinado". (D8, D18, A3–A4) | PR-006 v7.0 (`nombre_comun` resuelto solo desde el catálogo): ver pendiente P2 |
| AMD-12 | Las coordenadas UTM del árbol se ingresan manualmente. (D17, A1–A2) | ADR-010 v2.0 / PR-006 v7.0 (ubicación canónica WGS84): ver pendiente P1 |
| AMD-13 | `altura_total_m` > 0; una medición aplicable que no pudo obtenerse deja la inspección preguardada y no se registra como 0 ni vacía. (B9, B10, C4, F3) | — |

## 3. Preguardado e inspección

| ID | Decisión | Reemplaza / afecta |
|---|---|---|
| AMD-14 | Campo nuevo `estado_registro` en INSPECCIONES (`Preguardado` / `Finalizado`, asignado por el Sistema). La OT no puede pasar a Completada mientras alguna inspección vinculada esté Preguardada. (D3, D5, J3) | PR-009 v2.0 (`borrador` → `Preguardado`; `completada` → `Finalizado`) |
| AMD-15 | Las reglas generales (preguardado, "No presenta", historial, roles, raíces y cuello, cavidades, infraestructura, revisión de mantenimiento) viven en una hoja nueva `REGLAS_GENERALES` (Sección / Regla / Campos afectados / Hojas afectadas; 23 reglas), no repetidas campo por campo. (D4, bloque R) | — |
| AMD-16 | "Requiere evaluación instrumental" en cavidades permite finalizar la inspección visual; las mediciones y cálculos dependientes quedan vacíos, no en cero. Si no hay raíces expuestas, `necrosis_radicular` y `raices_cortadas` se desactivan. (C2, C5, D2) | — |
| AMD-17 | Se exigen cuatro fotografías nuevas por inspección (árbol completo, base, tronco y copa); las anteriores no cumplen el requisito; se conserva el historial fotográfico. El campo se renombra `fotografias_arbol`. (Acuerdos previos; D19) | PR-010 v1.0 |
| AMD-18 | `clasificacion_vitalidad` no exige fundamento escrito: el formulario muestra la definición de cada categoría. `observaciones_copa` es opcional. (D21, E3–E7) | — |

## 4. Órdenes de trabajo y mantenimiento

| ID | Decisión | Reemplaza / afecta |
|---|---|---|
| AMD-19 | Nueva acción de inspección **"Levantamiento"**: una OT puede abarcar varios árboles aún no identificados; `ID_Árbol` pasa a Condicional (vacío en Levantamiento) y el árbol se vincula en cada inspección. El área de trabajo se describe en `observaciones` de la OT. (D6, D7, I2–I7, J1–J2) | — |
| AMD-20 | Campo nuevo `requiere_revision_inspector` en ORDENES DE TRABAJO (Sí / No; lo define el Usuario municipal al crear una OT de Mantenimiento; valor inicial No). Tala y Retiro_tocón exigen siempre revisión (Sí fijo). (D24, M1, N1, N2) | CC-022 / PR-009 v2.0 en lo relativo a la revisión |
| AMD-21 | Cierre de OT de Mantenimiento por el Sistema: sin revisión, al registrarse la ejecución y la evidencia; con revisión, cuando el Inspector registra Aprobado. Si se rechaza, la OT vuelve a En ejecución y la corrección es un nuevo registro de MANTENIMIENTO con el mismo `id_ot`. La evidencia fotográfica de MANTENIMIENTO es obligatoria. Las OT de Inspección las cierra el Usuario municipal. (D24, M5, K) | DA-04 (transiciones) en lo indicado |
| AMD-22 | `estado_presencia` cambia a Talado o Retirado solo después de la aprobación del Inspector. (Acuerdos previos; N1) | — |

## 5. Evaluación (campos, no metodología)

| ID | Decisión | Reemplaza / afecta |
|---|---|---|
| AMD-23 | Infraestructura vertical y redes: una sola fila de evaluación con selección múltiple de tipos; se registra Sí si al menos un elemento presenta la condición, la menor distancia y el detalle en `observaciones_infraestructura` (Condicional). Queda **sin efecto** el acuerdo anterior de una evaluación independiente por tipo. (D10, D11, G5–G9) | CC-017: ver pendiente P6 |
| AMD-24 | Campos nuevos: `dano_interferencia_red_aerea`, `dano_interferencia_alcorque` y `observaciones_tutorado`. (F5, F6, H3) | — |
| AMD-25 | La compactación, el suelo sellado, los obstáculos y `condicion_radicular_entorno` se evalúan siempre (Obligatorio), haya o no alcorque. (D14, G3) | — |
| AMD-26 | Tutorado: catálogos sin "No determinado"; `presenta_tutorado` Condicional (`dap_cm` < 10 cm). (D12, D13, H1) | — |
| AMD-27 | Validación de abertura de cavidad: `Cc < C` (basal y tronco). (C7, D3, D4) | — |

## 6. Nombres, catálogos y diccionario

| ID | Decisión | Reemplaza / afecta |
|---|---|---|
| AMD-28 | Renombres: `levantamiento_del_plato_radicular`, `condicion_heridas_tronco`, `infraestructura_inmediata`, `dano_interferencia_vereda` (antes `dano_interferencia_infraestructura`), `tipo_red_aerea`, `tipo_red_subterranea`, `ot_creado_por`, `fotografias_arbol`. Las referencias en MATRICES_CALCULO se actualizan solo en el nombre. (D15, D19, C3, F4) | CC-013 (convención de nombres, parcial) |
| AMD-29 | "Condicionante" se unifica a "Condicional" en la obligatoriedad. Se eliminan las filas duplicadas de `especie_cientifica` (ARBOLES y CATALOGO_ESPECIES). (D20, A5–A6) | — |
| AMD-30 | LISTAS se mantiene como hoja auxiliar de los menús: se agrega Levantamiento; `Retiro_residuos` queda bajo Manejo fitosanitario; `Otra` bajo Evaluación instrumental; se elimina `Tipos_de_conflicto`; la validación de `clase_edad` pasa a su columna con 5 valores. (L1–L5) | CC-004, CC-009, CC-012 (parcial) |

## 7. INCIDENCIA

- Toda incidencia entra por el código QR de un árbol: `id_arbol` es Obligatorio y la ubicación es la del árbol (P10 confirmado).
- La fotografía la carga el ciudadano; al menos una es obligatoria.
- `observaciones_revision` es opcional.
- Los campos de revisión son Condicionales (`estado_incidencia` distinto de Ingresada).
- `origen_reporte` es siempre Comunidad en el alcance actual; las demás categorías quedan reservadas para incidencias de otras instituciones.
- Nombre y RUT del reportante son obligatorios; el nombre admite hasta 100 caracteres.
- `prioridad_municipal` se activa con `resultado_revision = Validada`.
- Campo nuevo `id_incidencia` en ORDENES DE TRABAJO (Condicional).
- Se agrega la columna faltante `estado_incidencia` y se corrigen las validaciones mal aplicadas de la hoja.

## 8. Decisiones complementarias (2026-10-18, registradas por la autora en el Excel auditado)

| ID | Decisión | Reemplaza / afecta |
|---|---|---|
| AMD-31 | Hojas nuevas **PROYECTOS** (`id_proyecto`, `nombre_proyecto`; solo el Administrador crea proyectos) y **MIEMBROS_PROYECTO** (`id_proyecto`, `id_usuario`). Un usuario puede pertenecer a varios proyectos; el rol es global (`USUARIOS.Rol`). `ARBOLES.id_proyecto` referencia PROYECTOS. | Coincide con PR-005 v3.0 (`projects`, `project_members`, rol global). Resuelve P13 y parte de P7 |
| AMD-32 | SECTORES: un único sector por proyecto. | Resuelve P12 |
| AMD-33 | Se elimina Hoja4. | Resuelve P14 |
| AMD-34 | INCIDENCIA: se aplican los textos N1–N11 (QR, fotografía obligatoria del ciudadano, revisión condicional, origen Comunidad, nombre y RUT obligatorios, prioridad con `Validada`). | Resuelve P10 y P11 |
| AMD-35 | La hoja INSPECCIONES pasa a llamarse **INSPECCION**. | Nombre de la entidad en el Excel |
| AMD-36 | El Inspector puede **ajustar** `clasificacion_riesgo`, `clasificacion_infraestructura` y `clasificacion_prioridad` registrando `justificacion_ajuste_clasificacion` (campo nuevo). Se conservan el valor calculado, el valor ajustado, el Inspector y la fecha. Si se ajusta el riesgo o la infraestructura, la prioridad se calcula con el valor ajustado. | PR-008 v1.0 ("no escribir manualmente resultados calculados salvo una regla futura explícita") → PR-008 v2.0 |
| AMD-37 | `INSPECCION.nivel_riesgo` se hereda de `clasificacion_riesgo` (incluido su ajuste), con la escala Bajo / Moderado / Alto / Extremo; no es editable. `resultado_general` es texto libre. | CC-010 |
| AMD-38 | Se elimina `requiere_nueva_inspeccion`. `fecha_proxima_inspeccion` (Obligatoria) y `fecha_proximo_monitoreo` (nueva) las sugiere la plataforma según `nivel_riesgo` y el Inspector puede ajustarlas registrando `justificacion_ajuste_fecha` (nueva). Inicio del rango — inspección: Bajo 24 meses, Moderado 12 meses, Alto 1 a 3 meses, Extremo 1 a 4 semanas; monitoreo: Bajo 12 meses, Moderado 3 a 6 meses, Alto 2 a 4 semanas, Extremo inmediato y continuo. Al llegar la fecha se envía al calendario del módulo. **Ajustado por CC-037 (2026-10-20):** SIVU no agenda automáticamente; al llegar el inicio del rango muestra un recordatorio en la lista de próximas inspecciones y monitoreos del proyecto, desde la cual el Usuario municipal crea y programa la OT. | — |
| AMD-39 | Prioridad de la OT: si el árbol tiene evaluación vigente, se propone por defecto su `clasificacion_prioridad`; el Usuario municipal puede modificarla. | CC-011 |
| AMD-40 | `MANTENIMIENTO.resultado` pasa a catálogo: Ejecutado completamente / Ejecutado parcialmente / No ejecutado. El cierre automático de la OT solo procede con Ejecutado completamente. | AMD-21 |
| AMD-41 | `origen_biogeografico`: el Usuario municipal puede ingresarlo de forma opcional en el alta; el Inspector lo confirma o corrige mediante OT. | Ajusta AMD-03 |
| AMD-42 | Se eliminan los datos de ejemplo de los anexos. | CC-018 |
