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
import { construirInspectionFormSchema, CATALOGO_DE_CAMPO_FORMULARIO, dominioExcel } from "../../src/services/sivu/inspectionFormSchema.service";
import { METADATOS_DICCIONARIO } from "../../src/schemas/sivu/completitudInspeccion";
import { entradasVigentesDe } from "../../src/services/rules/engine/catalogs";
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
  expect(res.body.data.variables[0]).toMatchObject({ etiqueta_pendiente: false });
});
it("metadatos del diccionario conservan tipo y unidad literales", async () => {
  auth.mockResolvedValue(fakeAuthUser({ id: MUNICIPAL_ID })); profile.mockResolvedValue(municipalProfileRow()); membership.mockResolvedValue({});
  const res = await request(app).get(url).set("Authorization", `Bearer ${FAKE_TOKEN}`);
  const altura = res.body.data.campos_arbol.find((x: any) => x.identificador === "altura_total_m");
  expect(altura).toMatchObject({tipo: "Decimal", tipo_entrada: "decimal", unidad: "m", unidad_valores_excel: "m", etiqueta: "Altura total (m)", seccion: { codigo: "arbol", etiqueta: "Árbol", propuesta: false }});
  const red = res.body.data.variables.find((x: any) => x.identificador === "tipo_red_aerea");
  expect(red).toMatchObject({tipo: "Categoría", tipo_entrada: "seleccion_multiple", unidad: null});
});

describe("tipo de entrada y opciones (columnas G y H)", () => {
  const schema = construirInspectionFormSchema();
  const todos = [...schema.variables, ...schema.campos_arbol];
  it("todo campo tiene tipo de entrada", () => {
    expect(todos.filter(c => c.tipo_entrada === null).map(c => c.identificador)).toEqual([]);
  });
  it("todo campo Categoría tiene opciones", () => {
    expect(todos.filter(c => c.tipo === "Categoría" && !c.opciones?.length).map(c => c.identificador)).toEqual([]);
  });
  it("las opciones de selección única son el dominio literal del Excel, en orden", () => {
    for (const [campo, catalogo] of Object.entries(CATALOGO_DE_CAMPO_FORMULARIO)) {
      const meta = METADATOS_DICCIONARIO.find(m => m.campo === campo);
      expect(meta).toBeDefined();
      expect([campo, entradasVigentesDe(catalogo).map(c => c.etiqueta)]).toEqual([campo, dominioExcel(meta!.unidadValores)]);
    }
  });
  it("Sí / No se entrega como booleano", () => {
    const c = schema.variables.find(x => x.identificador === "raices_expuestas")!;
    expect(c).toMatchObject({ tipo_entrada: "booleano", opciones: [{ codigo: true, etiqueta: "Sí" }, { codigo: false, etiqueta: "No" }] });
  });
  it("clase_edad usa los códigos que acepta el borrador", () => {
    const c = schema.campos_arbol.find(x => x.identificador === "clase_edad")!;
    expect(c.opciones!.map(o => o.codigo)).toEqual(["joven", "semimaduro", "tempranamente_maduro", "maduro", "sobremaduro"]);
  });
});

describe("secciones y orden (orden de columnas del Excel)", () => {
  const schema = construirInspectionFormSchema();
  const todos = [...schema.variables, ...schema.campos_arbol];
  it("todo campo tiene sección y orden", () => {
    expect(todos.filter(c => c.seccion === null || c.orden === null).map(c => c.identificador)).toEqual([]);
  });
  it("los campos del árbol van en «Árbol» y las variables en las seis secciones de REGISTRO_EVALUACION", () => {
    expect(new Set(schema.campos_arbol.map(c => c.seccion!.codigo))).toEqual(new Set(["arbol"]));
    expect(new Set(schema.variables.map(c => c.seccion!.codigo))).toEqual(
      new Set(["raices_cuello", "tronco", "copa_ramas", "infraestructura", "tutorado", "objetivo_consecuencias"])
    );
  });
  it("cada sección termina en su campo observaciones_*", () => {
    const ultimo = (codigo: string) => schema.variables.filter(c => c.seccion!.codigo === codigo).at(-1)!.identificador;
    expect(ultimo("raices_cuello")).toBe("observaciones_radicular");
    expect(ultimo("tronco")).toBe("observaciones_tronco");
    expect(ultimo("copa_ramas")).toBe("observaciones_copa");
    expect(ultimo("infraestructura")).toBe("observaciones_infraestructura");
    expect(ultimo("tutorado")).toBe("observaciones_tutorado");
  });
  it("los campos sin columna propia van junto al campo que acompañan", () => {
    // superficie_alcorque_m2 (calculada) no está en el formulario: se compara con su columna.
    const manual = schema.variables.find(c => c.identificador === "superficie_alcorque_m2_manual")!;
    expect(manual.seccion!.codigo).toBe("infraestructura");
    expect(manual.orden! % 1).toBe(0.5);
  });
  it("todos los nombres de sección están aprobados", () => {
    expect(schema.secciones.filter(s => s.propuesta)).toEqual([]);
  });
});

describe("etiquetas visibles (aprobadas 2026-10-28)", () => {
  const schema = construirInspectionFormSchema();
  const todos = [...schema.variables, ...schema.campos_arbol];
  it("solo obstaculos_crecimiento_radicular queda pendiente", () => {
    expect(todos.filter(c => c.etiqueta_pendiente).map(c => c.identificador)).toEqual(["obstaculos_crecimiento_radicular"]);
  });
  it("aplica la corrección de la responsable", () => {
    expect(todos.find(c => c.identificador === "suelo_sellado_impermeabilizado")!.etiqueta).toBe("Suelo sellado o impermeabilizado");
  });
});
