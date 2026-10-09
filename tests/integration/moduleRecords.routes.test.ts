import request from "supertest";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/project.repository");
jest.mock("../../src/repositories/projectMember.repository");
jest.mock("../../src/repositories/tree.repository");
jest.mock("../../src/repositories/treeMeasurement.repository");
jest.mock("../../src/repositories/moduleRecords.repository");

import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import { findProjectById } from "../../src/repositories/project.repository";
import { findMembership } from "../../src/repositories/projectMember.repository";
import { findTreeById, findTreesPage } from "../../src/repositories/tree.repository";
import { findValidMeasurementsByTreeIds } from "../../src/repositories/treeMeasurement.repository";
import {
  findIncidentById,
  findIncidentsByProjectId,
  findInfrastructureAssessmentsByTreeIds,
  findMaintenanceById,
  findMaintenanceByTreeIds,
  insertIncident,
  insertInfrastructureAssessment,
  insertMaintenanceOrder,
  updateIncidentState,
  updateMaintenanceState,
} from "../../src/repositories/moduleRecords.repository";
import { FAKE_TOKEN, MUNICIPAL_ID, adminProfileRow, fakeAuthUser, municipalProfileRow } from "../helpers/authFixtures";

const m = (fn: unknown) => fn as jest.Mock;

const authHeader = { Authorization: `Bearer ${FAKE_TOKEN}` };
const PROJECT_ID = "33333333-3333-3333-3333-333333333333";
const OTHER_PROJECT_ID = "44444444-4444-4444-4444-444444444444";
const TREE_ID = "55555555-5555-5555-5555-555555555555";
const RECORD_ID = "66666666-6666-6666-6666-666666666666";

function authAsAdmin() {
  m(getAuthUserByToken).mockResolvedValue(fakeAuthUser());
  m(findUserProfileById).mockResolvedValue(adminProfileRow());
}

function authAsMunicipal(member = true) {
  m(getAuthUserByToken).mockResolvedValue(fakeAuthUser({ id: MUNICIPAL_ID }));
  m(findUserProfileById).mockResolvedValue(municipalProfileRow());
  m(findMembership).mockResolvedValue(member ? { project_id: PROJECT_ID, user_id: MUNICIPAL_ID } : null);
}

function treeInProject(projectId = PROJECT_ID) {
  m(findTreeById).mockResolvedValue({ id: TREE_ID, project_id: projectId });
}

function infraVariables() {
  return {
    existe_vereda: "Sí",
    materialidad_vereda: "Baldosa",
    presenta_levantamiento_vereda: "Sí",
    presenta_desplazamiento_horizontal_vereda: "No",
    presenta_grieta_vereda: "No",
    presenta_rotura_vereda: "No",
    presenta_hundimiento_vereda: "No",
    reduce_circulacion_peatonal: "No",
    impide_paso_seguro: null,
    existe_calzada: "No",
    materialidad_calzada: null,
    dano_interferencia_calzada: null,
    levantamiento_calzada: null,
    grieta_fisuracion_calzada: null,
    hundimiento_calzada: null,
    rotura_calzada: null,
    afecta_circulacion_vehicular: null,
    existe_alcorque: "Sí",
    forma_alcorque: "Rectangular",
    contacto_interferencia_infraestructura_vertical: "No",
    tipo_infraestructura_vertical: null,
    dano_fisico_observable_infraestructura_vertical: null,
    compromete_estabilidad_funcionalidad: null,
    interferencia_redes_servicios: "No",
    red_aerea_presente: null,
    tipo_red_aerea: null,
    red_subterranea_presente: null,
    tipo_red_subterranea: null,
    afectacion_fisica_red_subterranea: null,
    compromete_funcionalidad_red_subterranea: null,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe("Infraestructura — /api/trees/:treeId/infrastructure-assessments", () => {
  const url = `/api/trees/${TREE_ID}/infrastructure-assessments`;
  const body = () => ({ fecha_evaluacion: "2026-10-01", variables: infraVariables() });

  it("sin Authorization -> 401", async () => {
    const res = await request(app).post(url).send(body());
    expect(res.status).toBe(401);
  });

  it("admin -> 403 al registrar (solo lectura, CC-022) y no inserta", async () => {
    authAsAdmin();
    treeInProject();
    const res = await request(app).post(url).set(authHeader).send(body());
    expect(res.status).toBe(403);
    expect(m(insertInfrastructureAssessment)).not.toHaveBeenCalled();
  });

  it("usuario_municipal miembro crea evaluación con datos crudos -> 201", async () => {
    authAsMunicipal();
    treeInProject();
    m(insertInfrastructureAssessment).mockResolvedValue({
      id: RECORD_ID,
      tree_id: TREE_ID,
      fecha_evaluacion: "2026-10-01",
      variables: infraVariables(),
      observaciones: null,
      created_by: null,
      created_at: "2026-10-01T00:00:00Z",
      user_profiles: { nombre: "Admin de prueba" },
    });

    const res = await request(app).post(url).set(authHeader).send(body());

    expect(res.status).toBe(201);
    expect(res.body.data.inspector_nombre).toBe("Admin de prueba");
    expect(m(insertInfrastructureAssessment).mock.calls[0][1].variables.existe_vereda).toBe("Sí");
  });

  it("valor fuera del dominio de DICCIONARIO_CAMPOS -> 400", async () => {
    authAsAdmin();
    const bad = body();
    (bad.variables as Record<string, unknown>).materialidad_vereda = "Mármol";
    const res = await request(app).post(url).set(authHeader).send(bad);
    expect(res.status).toBe(400);
    expect(m(insertInfrastructureAssessment)).not.toHaveBeenCalled();
  });

  it("usuario_municipal sin membresía -> 403 y no inserta", async () => {
    authAsMunicipal(false);
    treeInProject();
    const res = await request(app).post(url).set(authHeader).send(body());
    expect(res.status).toBe(403);
    expect(m(insertInfrastructureAssessment)).not.toHaveBeenCalled();
  });

  it("lista el historial del árbol -> 200", async () => {
    authAsAdmin();
    treeInProject();
    m(findInfrastructureAssessmentsByTreeIds).mockResolvedValue([]);
    const res = await request(app).get(url).set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe("Mantención — /api/projects/:id/maintenance", () => {
  const url = `/api/projects/${PROJECT_ID}/maintenance`;

  it("admin -> 403 al crear orden (solo lectura, CC-022)", async () => {
    authAsAdmin();
    treeInProject();
    const res = await request(app)
      .post(url)
      .set(authHeader)
      .send({ tree_id: TREE_ID, accion_solicitada: "poda", subtipo_accion: "formacion" });
    expect(res.status).toBe(403);
    expect(m(insertMaintenanceOrder)).not.toHaveBeenCalled();
  });

  it("usuario_municipal miembro crea orden con acción y subtipo de LISTAS -> 201", async () => {
    authAsMunicipal();
    treeInProject();
    m(insertMaintenanceOrder).mockResolvedValue({ id: RECORD_ID, codigo_ot: "OT-M-000001", estado: "pendiente" });
    const res = await request(app)
      .post(url)
      .set(authHeader)
      .send({ tree_id: TREE_ID, accion_solicitada: "poda", subtipo_accion: "formacion", fecha_programada: "2026-10-20" });
    expect(res.status).toBe(201);
    expect(res.body.data.codigo_ot).toBe("OT-M-000001");
    expect(m(insertMaintenanceOrder).mock.calls[0][1].tipo_intervencion).toBe("poda");
  });

  it("subtipo que no corresponde a la acción -> 400", async () => {
    authAsAdmin();
    const res = await request(app)
      .post(url)
      .set(authHeader)
      .send({ tree_id: TREE_ID, accion_solicitada: "poda", subtipo_accion: "emergencia" });
    expect(res.status).toBe(400);
    expect(m(insertMaintenanceOrder)).not.toHaveBeenCalled();
  });

  it("árbol de otro proyecto -> 400", async () => {
    authAsMunicipal();
    treeInProject(OTHER_PROJECT_ID);
    const res = await request(app)
      .post(url)
      .set(authHeader)
      .send({ tree_id: TREE_ID, accion_solicitada: "reparacion_alcorque" });
    expect(res.status).toBe(400);
    expect(m(insertMaintenanceOrder)).not.toHaveBeenCalled();
  });

  it("lista órdenes del proyecto -> 200", async () => {
    authAsAdmin();
    m(findProjectById).mockResolvedValue({ id: PROJECT_ID });
    m(findTreesPage).mockResolvedValue([]);
    m(findMaintenanceByTreeIds).mockResolvedValue([]);
    const res = await request(app).get(url).set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("cambio de estado por admin -> 403 (solo lectura, CC-022) y no actualiza", async () => {
    authAsAdmin();
    m(findMaintenanceById).mockResolvedValue({ id: RECORD_ID, tree_id: TREE_ID, estado: "pendiente" });
    treeInProject();
    const res = await request(app).patch(`${url}/${RECORD_ID}/estado`).set(authHeader).send({ estado: "programada" });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("El Administrador tiene acceso de solo lectura a los datos del proyecto");
    expect(m(updateMaintenanceState)).not.toHaveBeenCalled();
  });

  it("estado fuera de estado_ot -> 400", async () => {
    authAsAdmin();
    const res = await request(app).patch(`${url}/${RECORD_ID}/estado`).set(authHeader).send({ estado: "archivada" });
    expect(res.status).toBe(400);
  });

  it("usuario_municipal miembro cambia estado -> 200 (PR-003 v6.0)", async () => {
    authAsMunicipal();
    m(findMaintenanceById).mockResolvedValue({ id: RECORD_ID, tree_id: TREE_ID, estado: "pendiente" });
    treeInProject();
    m(updateMaintenanceState).mockResolvedValue({ id: RECORD_ID, estado: "en_ejecucion" });
    const res = await request(app).patch(`${url}/${RECORD_ID}/estado`).set(authHeader).send({ estado: "en_ejecucion" });
    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe("en_ejecucion");
  });
});

describe("Incidencias — /api/projects/:id/incidents", () => {
  const url = `/api/projects/${PROJECT_ID}/incidents`;

  it("usuario_municipal miembro reporta incidencia sin árbol -> 201", async () => {
    authAsMunicipal();
    m(insertIncident).mockResolvedValue({ id: RECORD_ID, codigo_incidencia: "INC-000001", estado: "ingresada" });
    const res = await request(app).post(url).set(authHeader).send({ tipo: "Rama quebrada", descripcion: "Sobre la vereda" });
    expect(res.status).toBe(201);
    const row = m(insertIncident).mock.calls[0][1];
    expect(row.project_id).toBe(PROJECT_ID);
    expect(row.tree_id).toBeNull();
    expect(row.reportado_por_user_id).toBe(MUNICIPAL_ID);
  });

  it("sin descripción -> 400", async () => {
    authAsMunicipal();
    const res = await request(app).post(url).set(authHeader).send({ tipo: "Rama quebrada", descripcion: "" });
    expect(res.status).toBe(400);
  });

  it("lista incidencias -> 200", async () => {
    authAsMunicipal();
    m(findIncidentsByProjectId).mockResolvedValue([]);
    const res = await request(app).get(url).set(authHeader);
    expect(res.status).toBe(200);
  });

  it("cambio de estado por admin -> 403 (solo lectura, CC-022)", async () => {
    authAsAdmin();
    const res = await request(app).patch(`${url}/${RECORD_ID}/estado`).set(authHeader).send({ estado: "en_revision" });
    expect(res.status).toBe(403);
    expect(m(updateIncidentState)).not.toHaveBeenCalled();
  });

  it("usuario_municipal miembro cambia estado y agrega nota a la bitácora -> 200", async () => {
    authAsMunicipal();
    m(findIncidentById).mockResolvedValue({ id: RECORD_ID, project_id: PROJECT_ID, estado: "ingresada", observacion: null });
    m(updateIncidentState).mockResolvedValue({ id: RECORD_ID, estado: "en_revision" });
    const res = await request(app)
      .patch(`${url}/${RECORD_ID}/estado`)
      .set(authHeader)
      .send({ estado: "en_revision", observacion: "Se visita en terreno" });
    expect(res.status).toBe(200);
    const bitacora = m(updateIncidentState).mock.calls[0][3] as string;
    expect(bitacora).toContain("En revisión");
    expect(bitacora).toContain("Se visita en terreno");
  });

  it("incidencia de otro proyecto -> 404", async () => {
    authAsMunicipal();
    m(findIncidentById).mockResolvedValue({ id: RECORD_ID, project_id: OTHER_PROJECT_ID, estado: "ingresada" });
    const res = await request(app).patch(`${url}/${RECORD_ID}/estado`).set(authHeader).send({ estado: "resuelta" });
    expect(res.status).toBe(404);
    expect(m(updateIncidentState)).not.toHaveBeenCalled();
  });
});

describe("Índices — GET /api/projects/:id/indices", () => {
  it("agrega conteos y estadísticos descriptivos; polifuste sin DAP agregado", async () => {
    authAsAdmin();
    m(findProjectById).mockResolvedValue({ id: PROJECT_ID });
    const tree = (id: string, especie: string) => ({
      id,
      tree_code: `A-${id.slice(-6)}`,
      legacy_id: null,
      estado_ciclo_vida: "activo",
      direccion: null,
      comuna: null,
      lugar_referencia: null,
      ubicacion: null,
      species: { nombre_cientifico: especie, nombre_comun: null },
    });
    const T1 = "00000000-0000-0000-0000-000000000001";
    const T2 = "00000000-0000-0000-0000-000000000002";
    m(findTreesPage).mockResolvedValueOnce([tree(T1, "Quillaja saponaria"), tree(T2, "Quillaja saponaria")]).mockResolvedValue([]);
    m(findValidMeasurementsByTreeIds).mockResolvedValue([
      { tree_id: T1, fecha_medicion: "2026-10-01", dap_cm: 30, dap_fustes_cm: null, altura_total_m: 8, diametro_copa_m: 5, clase_edad: null },
      { tree_id: T2, fecha_medicion: "2026-10-01", dap_cm: null, dap_fustes_cm: [10, 12], altura_total_m: 6, diametro_copa_m: 4, clase_edad: null },
    ]);

    const res = await request(app).get(`/api/projects/${PROJECT_ID}/indices`).set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.especies).toEqual([{ nombre_cientifico: "Quillaja saponaria", nombre_comun: null, n: 2 }]);
    expect(res.body.data.dendrometria.altura_total_m).toEqual({ n: 2, min: 6, promedio: 7, max: 8 });
    expect(res.body.data.dendrometria.dap_cm_un_fuste.n).toBe(1);
    expect(res.body.data.dendrometria.polifuste_sin_dap_equivalente).toBe(1);
  });
});
