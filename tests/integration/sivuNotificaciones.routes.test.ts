/** Rutas de avisos (CC-051) y recordatorios (#63): autenticación y validación, con el servicio simulado. */
import request from "supertest";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/services/sivu/notificaciones.service");

import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import { listarNotificaciones, marcarLeida } from "../../src/services/sivu/notificaciones.service";
import { FAKE_TOKEN, MUNICIPAL_ID, fakeAuthUser, municipalProfileRow } from "../helpers/authFixtures";

const auth = { Authorization: `Bearer ${FAKE_TOKEN}` };
const ID = "77777777-7777-4777-8777-777777777777";

beforeEach(() => {
  jest.clearAllMocks();
  (getAuthUserByToken as jest.Mock).mockResolvedValue(fakeAuthUser({ id: MUNICIPAL_ID }));
  (findUserProfileById as jest.Mock).mockResolvedValue(municipalProfileRow());
  (listarNotificaciones as jest.Mock).mockResolvedValue({ data: [], total: 0, no_leidas: 0, limit: 50, offset: 0, recordatorios_generados: 0 });
  (marcarLeida as jest.Mock).mockResolvedValue({ id: ID, leida: true });
});

describe("/api/sivu/notificaciones", () => {
  it("sin token: 401", async () => {
    expect((await request(app).get("/api/sivu/notificaciones")).status).toBe(401);
    expect((await request(app).patch(`/api/sivu/notificaciones/${ID}/leida`)).status).toBe(401);
  });

  it("GET con valores por defecto", async () => {
    const res = await request(app).get("/api/sivu/notificaciones").set(auth);
    expect(res.status).toBe(200);
    expect(listarNotificaciones).toHaveBeenCalledWith(expect.objectContaining({ id: MUNICIPAL_ID }), { solo_no_leidas: false, limit: 50, offset: 0 }, FAKE_TOKEN);
  });

  it.each([[{ solo_no_leidas: "si" }], [{ limit: "0" }], [{ otra: "x" }]])("GET con query inválida %j: 400", async (q) => {
    expect((await request(app).get("/api/sivu/notificaciones").query(q).set(auth)).status).toBe(400);
  });

  it("PATCH leida: 200; id no uuid: 400", async () => {
    expect((await request(app).patch(`/api/sivu/notificaciones/${ID}/leida`).set(auth)).status).toBe(200);
    expect((await request(app).patch("/api/sivu/notificaciones/no-uuid/leida").set(auth)).status).toBe(400);
  });
});
