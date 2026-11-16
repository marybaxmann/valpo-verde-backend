import { marcarTiempoAgotadoBd } from "../utils/contextoPeticion";

/** Estados HTTP que no admiten cuerpo al construir un `Response`. */
const SIN_CUERPO = new Set([101, 204, 205, 304]);

/**
 * `fetch` con tiempo máximo para los clientes de Supabase (PA-29, hallazgo
 * F2): sin esto, una base que no responde deja la petición colgada hasta
 * que la plataforma la corta, y el frontend en «Cargando…».
 *
 * - El tiempo cubre la llamada completa, cuerpo incluido: la respuesta se
 *   lee entera antes de devolverla. Las respuestas de Supabase en este
 *   backend son JSON o fotos de pocos MB.
 * - Al agotarse, aborta la llamada (`AbortError`: supabase-js no la
 *   reintenta) y marca la petición en curso para que el middleware de
 *   errores responda 504.
 * - Respeta la señal de cancelación que traiga la llamada original.
 */
export function crearFetchConTiempoMaximo(tiempoMaximoMs: number, fetchBase: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const controlador = new AbortController();
    const externa = init?.signal ?? undefined;
    const alAbortarExterna = () => controlador.abort(externa?.reason);
    if (externa) {
      if (externa.aborted) controlador.abort(externa.reason);
      else externa.addEventListener("abort", alAbortarExterna, { once: true });
    }
    const temporizador = setTimeout(() => {
      marcarTiempoAgotadoBd();
      controlador.abort();
    }, tiempoMaximoMs);
    try {
      const respuesta = await fetchBase(input, { ...init, signal: controlador.signal });
      const cuerpo = SIN_CUERPO.has(respuesta.status) ? null : await respuesta.arrayBuffer();
      return new Response(cuerpo, {
        status: respuesta.status,
        statusText: respuesta.statusText,
        headers: respuesta.headers,
      });
    } finally {
      clearTimeout(temporizador);
      externa?.removeEventListener("abort", alAbortarExterna);
    }
  };
}
