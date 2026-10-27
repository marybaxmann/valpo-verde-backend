import request from "supertest";
jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/projectMember.repository");
import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import { findMembership } from "../../src/repositories/projectMember.repository";
import { FAKE_TOKEN, MUNICIPAL_ID, fakeAuthUser, municipalProfileRow } from "../helpers/authFixtures";
import { CAMPOS_EVALUACION_COMPLETA } from "../../src/schemas/sivu/alcanceInspeccion";
const url = "/api/sivu/projects/11111111-1111-4111-8111-111111111111/inspection-form-schema?tipo=evaluacion_inicial";
const auth = getAuthUserByToken as jest.Mock;
const profile = findUserProfileById as jest.Mock;
const membership = findMembership as jest.Mock;
beforeEach(() => { jest.resetAllMocks(); });
it("exige JWT", async () => { expect((await request(app).get(url)).status).toBe(401); });
it("rechaza JWT inválido", async () => { auth.mockResolvedValue(null); expect((await request(app).get(url).set("Authorization", "Bearer invalid")).status).toBe(401); });
it("rechaza usuario sin acceso", async () => {
  auth.mockResolvedValue(fakeAuthUser({ id: MUNICIPAL_ID })); profile.mockResolvedValue(municipalProfileRow()); membership.mockResolvedValue(null);
  expect((await request(app).get(url).set("Authorization", `Bearer ${FAKE_TOKEN}`)).status).toBe(403);
});
it("entrega alcance, condiciones y opciones vigentes al miembro", async () => {
  auth.mockResolvedValue(fakeAuthUser({ id: MUNICIPAL_ID })); profile.mockResolvedValue(municipalProfileRow()); membership.mockResolvedValue({});
  const res = await request(app).get(url).set("Authorization", `Bearer ${FAKE_TOKEN}`);
  expect(res.status).toBe(200);
  expect(res.body.data.variables.map((x: any) => x.identificador)).toEqual([...CAMPOS_EVALUACION_COMPLETA]);
  expect(res.body.data.campos_arbol.find((x: any) => x.identificador === "numero_fustes").condicion_activacion).toEqual({op:"igual", campo:"multifustal", valor:true});
  expect(res.body.data.variables.find((x: any) => x.identificador === "tipo_red_aerea").opciones).toContainEqual({codigo:"electrica", etiqueta:"Eléctrica"});
  expect(res.body.data.variables[0]).toHaveProperty("etiqueta", null);
});
it("metadatos del diccionario conservan tipo y unidad literales", async () => {
  auth.mockResolvedValue(fakeAuthUser({ id: MUNICIPAL_ID })); profile.mockResolvedValue(municipalProfileRow()); membership.mockResolvedValue({});
  const res = await request(app).get(url).set("Authorization", `Bearer ${FAKE_TOKEN}`);
  const altura = res.body.data.campos_arbol.find((x: any) => x.identificador === "altura_total_m");
  expect(altura).toMatchObject({tipo: "Decimal", unidad: "m", unidad_valores_excel: "m", etiqueta: null, seccion: null});
  const red = res.body.data.variables.find((x: any) => x.identificador === "tipo_red_aerea");
  expect(red).toMatchObject({tipo: "Categoría", unidad: null});
});
