import { createClient } from "@supabase/supabase-js";
import { crearFetchConTiempoMaximo } from "../../src/config/fetchConTiempoMaximo";
import { ContextoPeticion, ejecutarConContexto } from "../../src/utils/contextoPeticion";

/** Un fetch que nunca responde: solo termina si lo abortan. */
const fetchColgado: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
  });

const nuevoContexto = (): ContextoPeticion => ({ requestId: "prueba-0001", tiempoAgotadoBd: false });

describe("crearFetchConTiempoMaximo (PA-29)", () => {
  it("aborta una llamada que no responde y marca la petición", async () => {
    const ctx = nuevoContexto();
    const f = crearFetchConTiempoMaximo(30, fetchColgado);
    await ejecutarConContexto(ctx, async () => {
      await expect(f("https://ejemplo.test/x")).rejects.toMatchObject({ name: "AbortError" });
    });
    expect(ctx.tiempoAgotadoBd).toBe(true);
  });

  it("devuelve la respuesta completa a tiempo y no marca nada", async () => {
    const ctx = nuevoContexto();
    const base: typeof fetch = async () =>
      new Response(JSON.stringify({ ok: 1 }), { status: 201, statusText: "Created", headers: { "content-type": "application/json" } });
    const f = crearFetchConTiempoMaximo(1000, base);
    const r = await ejecutarConContexto(ctx, () => f("https://ejemplo.test/x"));
    expect(r.status).toBe(201);
    expect(r.statusText).toBe("Created");
    expect(r.headers.get("content-type")).toBe("application/json");
    expect(await r.json()).toEqual({ ok: 1 });
    expect(ctx.tiempoAgotadoBd).toBe(false);
  });

  it("acepta respuestas sin cuerpo (204)", async () => {
    const f = crearFetchConTiempoMaximo(1000, async () => new Response(null, { status: 204 }));
    const r = await f("https://ejemplo.test/x");
    expect(r.status).toBe(204);
  });

  it("el tiempo cubre también la lectura del cuerpo", async () => {
    const ctx = nuevoContexto();
    // Cabeceras al instante, cuerpo que nunca termina (salvo que lo aborten).
    const base: typeof fetch = async (_input, init) => {
      const cuerpo = new ReadableStream({
        start(c) {
          init?.signal?.addEventListener("abort", () => c.error(new DOMException("aborted", "AbortError")));
        },
      });
      return new Response(cuerpo, { status: 200 });
    };
    const f = crearFetchConTiempoMaximo(30, base);
    await ejecutarConContexto(ctx, async () => {
      await expect(f("https://ejemplo.test/x")).rejects.toMatchObject({ name: "AbortError" });
    });
    expect(ctx.tiempoAgotadoBd).toBe(true);
  });

  it("respeta la cancelación de quien llama sin marcarla como tiempo agotado", async () => {
    const ctx = nuevoContexto();
    const f = crearFetchConTiempoMaximo(5000, fetchColgado);
    const ac = new AbortController();
    await ejecutarConContexto(ctx, async () => {
      const p = f("https://ejemplo.test/x", { signal: ac.signal });
      ac.abort();
      await expect(p).rejects.toMatchObject({ name: "AbortError" });
    });
    expect(ctx.tiempoAgotadoBd).toBe(false);
  });

  it("con supabase-js: la consulta devuelve error sin reintentar y la petición queda marcada", async () => {
    const ctx = nuevoContexto();
    let llamadas = 0;
    const contando: typeof fetch = (input, init) => {
      llamadas++;
      return fetchColgado(input, init);
    };
    const cliente = createClient("https://ejemplo-test.supabase.co", "clave", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: crearFetchConTiempoMaximo(30, contando) },
    });
    // Como en un repositorio: el `await` ocurre dentro de la petición (el
    // constructor de consultas solo llama a fetch al esperarlo).
    const { error } = await ejecutarConContexto(ctx, async () => await cliente.from("trees").select("id"));
    expect(error).not.toBeNull();
    expect(llamadas).toBe(1);
    expect(ctx.tiempoAgotadoBd).toBe(true);
  });
});
