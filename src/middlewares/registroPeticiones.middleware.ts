import { randomUUID } from "node:crypto";
import { NextFunction, Request, Response } from "express";
import { ejecutarConContexto } from "../utils/contextoPeticion";

/** Un `X-Request-Id` entrante se reutiliza solo si es un identificador simple. */
const ID_ENTRANTE_VALIDO = /^[A-Za-z0-9._-]{8,128}$/;

/**
 * Ruta para el registro sin datos de la petición: sin la consulta (`?…`) y
 * con todo segmento que lleve un dígito reemplazado por `:param`. Así no
 * quedan en el registro identificadores, códigos de árbol ni el `qr_token`
 * de la ficha pública, y las peticiones de una misma ruta se agrupan.
 */
export function rutaSinDatos(urlOriginal: string): string {
  const camino = urlOriginal.split("?")[0].split("#")[0];
  return camino
    .split("/")
    .map((segmento) => (/\d/.test(segmento) ? ":param" : segmento))
    .join("/");
}

/**
 * Registro de peticiones e identificador de correlación (PA-38, hallazgo T3).
 *
 * - Cada petición recibe un `request_id` (o reutiliza un `X-Request-Id`
 *   válido del cliente), que se devuelve en la cabecera `X-Request-Id` y
 *   acompaña a cada línea del registro y a las respuestas 5xx.
 * - Al terminar, escribe una línea JSON con método, ruta sin datos, estado,
 *   duración y si la base agotó su tiempo. **No** registra cuerpo,
 *   cabeceras, consulta, IP, token ni usuario.
 * - En las pruebas (NODE_ENV=test) no escribe nada.
 */
export function registroPeticionesMiddleware(req: Request, res: Response, next: NextFunction): void {
  const entrante = req.get("x-request-id");
  const requestId = entrante && ID_ENTRANTE_VALIDO.test(entrante) ? entrante : randomUUID();
  const contexto = { requestId, tiempoAgotadoBd: false };
  res.locals.requestId = requestId;
  res.set("X-Request-Id", requestId);

  const inicio = process.hrtime.bigint();
  res.on("finish", () => {
    if (process.env.NODE_ENV === "test") return;
    console.log(
      JSON.stringify({
        tipo: "peticion",
        request_id: requestId,
        metodo: req.method,
        ruta: rutaSinDatos(req.originalUrl),
        estado: res.statusCode,
        duracion_ms: Math.round(Number(process.hrtime.bigint() - inicio) / 1e6),
        tiempo_agotado_bd: contexto.tiempoAgotadoBd,
      })
    );
  });

  ejecutarConContexto(contexto, () => next());
}
