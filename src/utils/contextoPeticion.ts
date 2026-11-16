import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Datos de la petición en curso, disponibles en cualquier capa sin pasarlos
 * como parámetro (PA-38). Los crea `registroPeticionesMiddleware` al inicio
 * de cada petición.
 */
export interface ContextoPeticion {
  /** Identificador de correlación: va en `X-Request-Id` y en cada registro. */
  requestId: string;
  /**
   * `true` si alguna llamada a Supabase de esta petición superó el tiempo
   * máximo (PA-29). Es una marca explícita: el error de Supabase no trae
   * un código para este caso, solo un texto, y no se decide el status
   * buscando texto (PA-35).
   */
  tiempoAgotadoBd: boolean;
}

const almacen = new AsyncLocalStorage<ContextoPeticion>();

export function ejecutarConContexto<T>(contexto: ContextoPeticion, fn: () => T): T {
  return almacen.run(contexto, fn);
}

export function contextoActual(): ContextoPeticion | undefined {
  return almacen.getStore();
}

export function marcarTiempoAgotadoBd(): void {
  const contexto = almacen.getStore();
  if (contexto) contexto.tiempoAgotadoBd = true;
}
