# Propuesta: migración 034 — cancelar una OT Pendiente (CC-050)

> **Estado (2026-11-02):** preparada, **no aplicada**. Espera la autorización de Valej. Solo para la base de pruebas `gmlbmyreoxgoqrolhyxo`, con el ciclo completo (aplicar, probar, revertir, reaplicar, probar, md5).

## 1. Defecto

- **Restricción exacta (014, vigente en la base de pruebas):**
  `chk_work_orders_fecha_programada CHECK (estado_ot = 'pendiente' OR fecha_accion_programada IS NOT NULL)`.
- **Función (025):** `fn_cancel_work_order` acepta cancelar desde Pendiente, Programada o En ejecución (CC-050). Solo cambia `estado_ot`, `motivo_cancelacion`, `cancelado_por`, `fecha_cancelacion` y `updated_at`; no toca la fecha programada.
- **Resultado:** una OT Pendiente no tiene fecha programada (D-241 la pide al pasar a Programada). Al quedar Cancelada viola el CHECK. **Cancelar desde Pendiente falla siempre.**
- **Alcance:** Inspección y Mantenimiento. La misma función sirve a los dos tipos: la 031 no tiene una función propia para cancelar Mantenimiento.
- **En la API:** `POST /work-orders/:id/cancelar` sobre una OT Pendiente responde **400** con el mensaje del CHECK (`cierreOt.service.ts` traduce 23514 a 400). Afecta también a `release/demo`, que usa la misma base.
- **Por qué no se detectó:** C6 de la 025 y N1 de la 033 cancelaron OT que ya estaban Programadas.
- **Reproducido** el 2026-11-02 en la base de pruebas, dentro de una transacción revertida: `23514 … violates check constraint "chk_work_orders_fecha_programada"`.

## 2. Reglas de cancelación revisadas

| Regla | Dónde | ¿Cambia? |
|---|---|---|
| Solo el Usuario municipal activo y miembro del proyecto | `fn_cancel_work_order` (025) | No |
| Desde Pendiente, Programada o En ejecución; Completada y Cancelada se rechazan (SV066) | ídem | No |
| Motivo obligatorio; auditoría completa (`motivo_cancelacion`, `cancelado_por`, `fecha_cancelacion`) | `chk_work_orders_cancelada` (025) | No |
| Aviso `ot_cancelada` al responsable, en la misma transacción | trigger `trg_work_orders_notificar` (033) | No |
| Mantenimiento: mismas reglas, el responsable es el Encargado | 031 (usa la misma función) | No |
| Fecha programada obligatoria desde Programada (D-241) | `chk_work_orders_fecha_programada` (014) | **Sí:** se admite también Cancelada sin fecha |

## 3. Cambio propuesto

```sql
ALTER TABLE public.work_orders DROP CONSTRAINT chk_work_orders_fecha_programada;
ALTER TABLE public.work_orders ADD CONSTRAINT chk_work_orders_fecha_programada
  CHECK (estado_ot IN ('pendiente', 'cancelada') OR fecha_accion_programada IS NOT NULL);
```

| Estado | Antes | Después |
|---|---|---|
| Pendiente | fecha opcional | igual |
| Programada, En ejecución, Completada | fecha obligatoria | igual |
| Cancelada | fecha obligatoria | fecha opcional: la conserva si venía de Programada o En ejecución; queda vacía si venía de Pendiente |

- No se borran ni se rellenan fechas. Ninguna función cambia. Se mantiene el mismo nombre de restricción.
- **Datos actuales:** 13 OT en la base de pruebas, todas cumplen el CHECK nuevo (la única Cancelada tiene fecha).
- **Excel:** coherente con D-241 («obligatoria desde Programada»): una OT cancelada desde Pendiente nunca llegó a Programada. No requiere cambio en el Excel.
- **Límite:** el CHECK no conoce el estado anterior, así que no puede exigir que una OT cancelada desde Programada conserve su fecha. Hoy nada la borra (lo comprueban R3 y R4).
- **Reversión:** restaura el CHECK de la 014. Si ya hay OT canceladas sin fecha, se detiene sin cambiar nada. No borra datos: revertir en ese caso requiere decisión.

## 4. Archivos

| Archivo | md5 |
|---|---|
| `database/migrations/034_cancelar_ot_pendiente.sql` | `f1831659d845d1f79d53d052107d8bf4` |
| `database/migrations/034_cancelar_ot_pendiente.down.sql` | `7e92c5fba6c59ff698b84850275891ff` |
| `database/fase6/pruebas_034_cancelar_ot_pendiente.sql` | `232c898cbe96346e39836508ef4b859a` |

Identificador: **034**. La 032 sigue reservada para la propuesta de especie y la 033 es la de notificaciones.

## 5. Pruebas de regresión (`pruebas_034_cancelar_ot_pendiente.sql`)

R1: cancelar Inspección Pendiente (con aviso). R2: cancelar Mantenimiento Pendiente (con aviso). R3 y R4: Programada y En ejecución conservan su fecha. R5, R6 y R7: Programada, En ejecución y Completada sin fecha siguen rechazadas. R8: Cancelada sin motivo sigue rechazada. R9: cancelar una OT ya cancelada da SV066. R10: definición exacta del CHECK. R11: un Inspector no puede cancelar.

- Las OT de prueba usan un código propio (`OT-I-PRUEBA034-n`), así que **no consumen la numeración**. Todo se revierte.
- **Ya ejecutado, sin aplicar la 034 (2026-11-02):**
  - R1 falla con el CHECK: reproduce el defecto.
  - R3 a R7 y R11 pasan: `PRE034_PARCIAL_OK: R3 R4 R5 R6 R7 R11`.
  - La base quedó intacta: secuencias I=359 y M=21, 13 OT, 0 avisos, md5 de `work_orders` `ab1fc6d8…` sin cambios.
- **Al aplicar (si se autoriza):**
  1. Línea base.
  2. Aplicar. Esperado: `PRUEBAS_034_OK`.
  3. Revertir. Esperado: R1 vuelve a fallar.
  4. Reaplicar. Esperado: `PRUEBAS_034_OK`.
  5. Regresión: `pruebas_025` (C6–C11) y `pruebas_033` (N1–N9).
  6. md5 de lo aplicado igual al archivo; asesor de seguridad; `schema.sql` y CC-050 actualizados.
