import express from "express";
import request from "supertest";
import { MENSAJE_TIEMPO_AGOTADO_BD, errorMiddleware } from "../../src/middlewares/error.middleware";
import { registroPeticionesMiddleware, rutaSinDatos } from "../../src/middlewares/registroPeticiones.middleware";
import { AppError } from "../../src/utils/AppError";
import { marcarTiempoAgotadoBd } from "../../src/utils/contextoPeticion";

function appDePrueba() {
  const app = express();
  app.use(registroPeticionesMiddleware);
  app.get("/ok/:id", (_req, res) => {
    res.json({ ok: true });
  });
  // Simula un getUser que no respondió: el service lo traduce a 401.
  app.get("/bd-lenta", async (_req, _res, next) => {
    await Promise.resolve();
    marcarTiempoAgotadoBd();
    next(new AppError("No autenticado", 401));
  });
  app.get("/no-controlado", () => {
    throw new Error("detalle interno");
  });
  app.get("/controlado", () => {
    throw new AppError("Árbol no encontrado", 404);
  });
  app.use(errorMiddleware);
  return app;
}

describe("rutaSinDatos", () => {
  it("quita la consulta y reemplaza los segmentos con dígitos", () => {
    expect(rutaSinDatos("/api/sivu/projects/8b7c6d5e-4f3a-4b2c-9d1e-0f9a8b7c6d5e/trees/A-000421/qr?formato=svg&lado_mm=80")).toBe(
      "/api/sivu/projects/:param/trees/:param/qr"
    );
    expect(rutaSinDatos("/api/sivu/conecta/arboles/x7Kp2qZ9mN4vR8sT")).toBe("/api/sivu/conecta/arboles/:param");
    expect(rutaSinDatos("/api/sivu/conecta/catalogos")).toBe("/api/sivu/conecta/catalogos");
  });
});

describe("registroPeticionesMiddleware y errorMiddleware (PA-38, PA-29)", () => {
  const app = appDePrueba();

  it("devuelve un X-Request-Id nuevo en cada petición", async () => {
    const a = await request(app).get("/ok/1");
    const b = await request(app).get("/ok/1");
    expect(a.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(a.headers["x-request-id"]).not.toBe(b.headers["x-request-id"]);
  });

  it("reutiliza un X-Request-Id válido del cliente y descarta uno inválido", async () => {
    const valido = await request(app).get("/ok/1").set("X-Request-Id", "front-abc-12345");
    expect(valido.headers["x-request-id"]).toBe("front-abc-12345");
    const invalido = await request(app).get("/ok/1").set("X-Request-Id", "<script>alert(1)</script>");
    expect(invalido.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("responde 504 cuando la base agotó su tiempo, aunque el error traducido sea otro", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const r = await request(app).get("/bd-lenta");
    spy.mockRestore();
    expect(r.status).toBe(504);
    expect(r.body).toEqual({ error: MENSAJE_TIEMPO_AGOTADO_BD, request_id: r.headers["x-request-id"] });
  });

  it("el 500 no filtra el detalle y trae el request_id", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const r = await request(app).get("/no-controlado");
    spy.mockRestore();
    expect(r.status).toBe(500);
    expect(r.body).toEqual({ error: "Error interno del servidor", request_id: r.headers["x-request-id"] });
  });

  it("los errores controlados 4xx no cambian de forma", async () => {
    const r = await request(app).get("/controlado");
    expect(r.status).toBe(404);
    expect(r.body).toEqual({ error: "Árbol no encontrado" });
  });

  it("registra una línea JSON sin consulta, identificadores ni cabeceras", async () => {
    const anterior = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const lineas: string[] = [];
    const spy = jest.spyOn(console, "log").mockImplementation((l: string) => {
      lineas.push(l);
    });
    try {
      const r = await request(app).get("/ok/8b7c6d5e?rut=12345678-9").set("Authorization", "Bearer secreto");
      await new Promise((res) => setImmediate(res));
      expect(lineas).toHaveLength(1);
      const registro = JSON.parse(lineas[0]);
      expect(registro).toEqual({
        tipo: "peticion",
        request_id: r.headers["x-request-id"],
        metodo: "GET",
        ruta: "/ok/:param",
        estado: 200,
        duracion_ms: expect.any(Number),
        tiempo_agotado_bd: false,
      });
      expect(lineas[0]).not.toMatch(/rut=|12345678|secreto|8b7c6d5e/);
    } finally {
      spy.mockRestore();
      process.env.NODE_ENV = anterior;
    }
  });

  it("en las pruebas no escribe el registro", async () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    await request(app).get("/ok/1");
    await new Promise((res) => setImmediate(res));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
