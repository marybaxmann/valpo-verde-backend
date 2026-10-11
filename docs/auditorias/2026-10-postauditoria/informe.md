# Informe integral — Auditoría postdemo SIVU (2026-10-10 / 2026-10-11)

Documento de evidencia, no normativo (ver [README](README.md)). Los identificadores (P, S, I, F, A, R, M, T, E, X, C) remiten a [hallazgos.md](hallazgos.md).

## 1. Alcance y origen

Auditorías solicitadas por la autora después de presentar la demo:

1. **Motor de riesgo** (2026-10-10): coincidencia de `treeRisk.ts` con las reglas y matrices. Antecedente ya integrado en `main` (`0397c12`).
2. **Fechas** (2026-10-10): "la aplicación parece mostrar el día siguiente después de las 21:00".
3. **Arquitectura frontend** (2026-10-10): navegación, renderizado, carga diferida, consultas y caché, organización.
4. **Full stack** (2026-10-11), siete áreas:
   - A. frontend;
   - B. backend y lógica de negocio;
   - C. base de datos;
   - D. integración entre capas;
   - E. pruebas, rendimiento y mantenibilidad;
   - F. seguridad y observabilidad;
   - G. forma de presentar.
5. **Profundización** (2026-10-11): S1, I1 y T1; Grupo 2 (I2, I3); recorridos de punta a punta; modelo INSPECCIONES; consolidación documental.

## 2. Fuentes y método

- **Código:**
  - backend `feature/demo-sivu` (`601e9d6`) y `main` (`7913a13`);
  - frontend `feature/demo-sivu` (`8956d6f`) y `main` (`187a90d`).
- **Documentos:** `project-rules.md`, `architecture-decisions.md`, `registro-cambios.md`, `workflow.md`, `methodology/` (versión de `main`, que integra CC-021 a CC-024).
- **Excel maestro:** INSPECCIONES, ORDENES DE TRABAJO, MANTENIMIENTO, INCIDENCIA, USUARIOS, LISTAS (P:X), DICCIONARIO_CAMPOS, más las validaciones de datos de las hojas.
- **Supabase `valpo-verde-conecta`**, solo lectura:
  - políticas (`pg_policies`), permisos de tabla, funciones, restricciones, índices, columnas y valores por defecto;
  - conteos;
  - Advisors de seguridad y de rendimiento;
  - historial de migraciones;
  - escenarios RLS de lectura L1–L5 dentro de transacciones con `ROLLBACK`.
- **Herramientas:** compilación (`tsc`, `vite build`), suite de pruebas del backend y simulación de zona horaria en Node.

## 3. Limitaciones

- **Sin navegador:** quedan pendientes de verificación P3, A3, la cascada real de peticiones, el conteo de renderizados y las correcciones de la rama del 2026-10-11.
- **Sin pruebas de escritura:** W1–W12 no se ejecutaron (decisión de la autora; requieren un entorno de pruebas aislado). La certeza de S1 se basa en la lectura de políticas y permisos.
- Un intento de juntar resultados de lectura en una tabla temporal de sesión falló por permisos. No escribió datos y luego se hicieron consultas separadas.
- **Datos:** la base contiene datos de demo (6 árboles, 4 evaluaciones de riesgo sintéticas, 2 de infraestructura, 1 orden, 1 incidencia); los problemas de escala son inferidos.

## 4. Resumen ejecutivo

| Área | Conclusión | Hallazgos clave |
|---|---|---|
| Gobernanza | El motor de riesgo está en `main` con reglas de un borrador no publicado, contra PR-011 v2.0; ADR-006 contradice CC-022 | **C1, C2** |
| Seguridad | El modelo de dos capas (ADR-014) no protege las escrituras: el navegador tiene el mismo JWT que usa el backend y las políticas de escritura solo verifican la membresía. Las lecturas están bien aisladas por rol (L1–L5) | **S1**, S2–S5 |
| Integridad | Las evaluaciones nuevas no registran autor; la bitácora pierde notas si hay cambios simultáneos; los estados no tienen transiciones; las evaluaciones no cuelgan de inspecciones | **I1**, I1-b, I2, I3, X4 |
| Fechas | Se usaba el día UTC como día local | P1 (corregido en la rama) |
| Frontend | Navegación de cliente sin recargas; carga diferida correcta; consultas repetidas puntuales; componentes grandes; accesibilidad de formularios y modales insuficiente | P2–P7, F1–F4, A1–A2, M3 |
| Backend | Capas bien separadas; reglas en `services/rules/`; traducción de errores frágil | M1, R1 |
| Base de datos | Restricciones y claves foráneas compuestas sólidas; alta atómica de árbol con medición; tablas antiguas sin uso | I4, I5, R2 |
| Pruebas y operación | RLS sin pruebas automáticas; sin CI; observabilidad mínima; migraciones 001–006 fuera del historial | **T1**, T2, T3, E1 |

## 5. Resultados por área

### 5.1 Fechas (P1)
- **Causa:** conversión a UTC (`toISOString`, `created_at.slice`). No era una regla horaria explícita ni un problema de formato.
- **Ventana incorrecta:** de 21:00 a 23:59 en verano (UTC−3) y de 20:00 a 23:59 en invierno (UTC−4).
- **Efectos:**
  - Se guardaban datos incorrectos en los campos de solo fecha (`fecha_medicion`, `fecha_evaluacion` de infraestructura) y en la nota de la bitácora.
  - Las marcas de tiempo se guardaban bien (UTC), pero se mostraban mal.
  - Las órdenes aparecían "vencidas" 3 o 4 horas antes.
- **Regla aprobada:** hora de Chile (America/Santiago).
- **Estado:** corregido en `feature/demo-sivu` (`hoyChile`/`fechaChile` en el frontend, `hoyEnChile` en el backend, con 7 pruebas del cambio de día); fuera de `main` (K4). La función de alta de árbol de la base sigue usando `CURRENT_DATE` en UTC (I5).

### 5.2 Arquitectura frontend (P2–P7)

| Pregunta de la autora | Respuesta |
|---|---|
| ¿Se recarga toda la página al cambiar de módulo? | No. `BrowserRouter` y `NavLink`; la estructura general no se remonta |
| ¿Los módulos se cargan cuando se necesitan? | Sí. Rutas con `React.lazy`; ArcGIS solo en las pantallas con mapa; paquete inicial de 141 KB comprimido |
| ¿Responsabilidades claras? | En parte: la capa `src/api` está bien separada; `ModulePage` mezcla dos módulos (M3) |
| ¿Se actualiza solo lo afectado? | No siempre: P2, P4d, P4e |
| ¿Se repiten consultas? | Poco (caché de 60 s que agrupa peticiones simultáneas); duplicados puntuales P4a y P4b |
| ¿Se puede extender sin romper? | Sí, con cuidado en las páginas grandes |

Correcciones P2–P7 en la rama (K4): filtro de vista en ArcGIS sin reconstruir la capa, sincronización secuencial, caché por árbol, resumen de riesgo liviano, menú lateral adaptable y `GET /api/species`.

### 5.3 Seguridad (S1–S5)
- S1 se describe a nivel de tipo de problema (repositorio público). Escenarios en [escenarios-rls.md](escenarios-rls.md).
- **Lo que está bien:**
  - Nadie, ni el administrador, puede borrar datos de los módulos.
  - Ningún usuario puede cambiar su rol ni sumarse a proyectos.
  - La clave de servicio existe solo en el backend.
  - Los `.env` nunca se versionaron.
  - La API key de ArcGIS está en el paquete del navegador, como se espera; su restricción por origen solo se puede verificar en el panel de ArcGIS.

### 5.4 Integridad (I1–I5, X1–X5)
- **El modelo metodológico ya distingue identidades:**
  - INSPECCIONES: `inspector` vs `registrado_por`.
  - OT: `OT_creado_por` vs `responsable_accion_id`.
  - MANTENIMIENTO: `ejecutado_por`, `revisado_por`.
  - INCIDENCIA: `reportado_por` (puede ser "Anónimo") vs quien lo registra.
- **La implementación guarda menos:**
  - `created_by` en riesgo, sin llenar (I1);
  - `responsable` en texto libre;
  - `reportado_por_user_id` = quien registra.
- **I2 e I3** quedan cubiertos por DA-03 (concepto aprobado) y DA-04 (pendiente).

### 5.5 Funcionales y accesibilidad (F1–F4, A1–A3)
Cambios acotados sin decisiones de negocio; se implementarán después de verificar la rama en el navegador.

### 5.6 Rendimiento (R1–R4)
- **Índices:** adecuados para las consultas principales (`tree_id, fecha DESC`; parcial de mediciones válidas).
- **Lo que no escalará:** las consultas con listas de ids en la URL (R1).
- **Avisos de Supabase:** relevantes al crecer (R2).

### 5.7 Mantenibilidad (M1–M3)
- La arquitectura en capas del backend (ADR-002) resuelve bien las responsabilidades; **no** se recomiendan capas adicionales.
- Lo frágil es la traducción de errores por texto (M1) y los comentarios contradictorios (M2).

### 5.8 Pruebas, observabilidad y entorno (T1–T3, E1)
- **Backend:** 195 pruebas en la rama; 185 en `main`.
- **Lo que falta:**
  - Cubrir RLS (T1).
  - Rutas de evaluación de riesgo e índices (T2).
  - CI.
  - Registro de peticiones (T3).
  - Un entorno de pruebas reproducible (E1).

## 6. Recorridos de punta a punta (D)

### 6.1 Registrar un árbol
1. **Origen:** `CreateTreeModal` (Inventario, con ubicación marcada en el mapa).
2. **Cliente:** coordenadas, especie, alturas ≥ 0, DAP > 0 o polifuste ≥ 2 con sus DAP, fecha no futura.
3. **Petición:** `POST /api/projects/:id/trees`.
4. **Backend:**
   - Zod;
   - `assertProjectWriter`, `assertProjectExists`;
   - función `fn_create_tree_with_measurement`, que vuelve a validar sesión, perfil activo, membresía, especie, espacio público, fecha y DAP;
   - CHECK de la base.
5. **Tablas:** `trees` (código por secuencia; autor `auth.uid()`) + `tree_measurements` (`valida`) en una transacción.
6. **Respuesta:** ficha completa del árbol.
7. **Interfaz:** vacía la caché, limpia filtros, vuelve a pedir el inventario y selecciona el árbol.
8. **Errores y concurrencia:** errores en el modal; botón desactivado mientras guarda; F4 (duplicado al reintentar tras un corte); F1 (si falla la recarga se oculta el mapa). La fecha "no futura" se valida en tres capas; la de la base usa UTC (I5).

### 6.2 Evaluar el riesgo
1. **Origen:** `RiskAssessmentModal`.
2. **Cliente:** `datosFaltantes` por paso (datos condicionales y rangos).
3. **Petición:** `POST /api/trees/:id/risk-assessments`.
4. **Backend:** esquema con `superRefine` (mismas reglas), `findTreeById` bajo RLS, `assertProjectWriter`, **motor `evaluarRiesgo`** y política de inserción.
5. **Tabla:** `tree_risk_assessments`. `rule_version` por defecto de la base (C1); sin `created_by` (I1).
6. **Respuesta:** resultado calculado.
7. **Interfaz:** mapa y panel actualizados sin volver a consultar; caché vaciada.
8. **Riesgos:** las reglas de datos faltantes están duplicadas entre el cliente y el backend, sin una fuente común; la vía directa salta el motor (S1, W1).

### 6.3 Orden de trabajo
1. **Origen:** formulario de `MaintenancePage`.
2. **Cliente:** acción obligatoria; observación obligatoria para "Otra intervención".
3. **Petición:** `POST /api/projects/:id/maintenance`.
4. **Backend:** acción y subtipo del catálogo; `treeProjectFor(write)`; el árbol pertenece al proyecto; política de inserción (autor nulo o el propio).
5. **Tabla:** `maintenance` (estado `pendiente`, `codigo_ot` y autor automáticos; `responsable` en texto libre).
6. **Respuesta:** la fila creada.
7. **Interfaz:** se agrega a la lista.
8. **Cambio de estado:** `PATCH …/estado`. Cualquier transición vale, el último que guarda gana y no queda historial (I2, I3); permite fecha programada pasada (T-11).

### 6.4 Incidencia
1. **Origen:** formulario de `IncidentsPage`.
2. **Cliente:** tipo y descripción obligatorios; árbol opcional.
3. **Petición:** `POST /api/projects/:id/incidents`.
4. **Backend:** `assertProjectWriter`; árbol del proyecto, también garantizado por la FK compuesta `(tree_id, project_id)`.
5. **Tabla:** `incidents` (estado `ingresada`; `reportado_por_user_id` = quien registra; tipo y origen en texto libre, X3).
6. **Respuesta:** la fila creada.
7. **Interfaz:** se agrega a la lista.
8. **Cambio de estado con nota:** la bitácora se lee y se reescribe (I2). Los nombres de otros usuarios no se ven (I1-b). Comentarios contradictorios con CC-022 (M2).

## 7. Lo que funciona bien (no tocar)

- Capas del backend (ADR-002) y reglas aisladas en `services/rules/`.
- Alta atómica de árbol con medición inicial (ADR-016, PR-006 v7.0).
- Aislamiento de lecturas por rol y proyecto, confirmado en L1–L5.
- CC-022 aplicado en el backend y en la base: el administrador no escribe datos del proyecto.
- Nadie borra registros de los módulos (ADR-012).
- Secretos fuera del repositorio; `service_role` solo en el backend.
- Navegación de cliente, carga diferida de rutas y de ArcGIS.
- Caché de lecturas que agrupa peticiones simultáneas y se vacía al cambiar de sesión o al escribir.
- Estadísticas del dashboard e Índices derivadas de datos guardados y de la medición vigente, sin desempates inventados.

## 8. Decisiones, pendientes y continuidad

- **Decisiones y estados:** [decisiones.md](decisiones.md).
- **Contradicciones abiertas:** [contradicciones.md](contradicciones.md).
- **Dependencias y orden:** [dependencias.md](dependencias.md).
- **Tareas:** [`docs/roadmap.md`](../../roadmap.md), sección "Postauditoría 2026-10".
- **Reanudación:** [`HANDOFF.md`](../../../HANDOFF.md).
