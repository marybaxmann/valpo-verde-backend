import { reporteCiudadanoSchema, revisionIncidenciaSchema } from "../../../src/schemas/sivu/conecta.schema";

const reporte = {
  nombre_reportante: "María José Pérez",
  rut_reportante: "12.345.678-5",
  tipo_incidencia: "rama_caida",
  descripcion: "Rama sobre la vereda",
};

describe("reporteCiudadanoSchema (PR-022 v2.0; D-178 a D-181)", () => {
  it("acepta un reporte válido y normaliza el RUT", () => {
    const r = reporteCiudadanoSchema.safeParse(reporte);
    expect(r.success).toBe(true);
    expect(r.success && r.data.rut_reportante).toBe("12345678-5");
  });

  it("nombre: solo letras, espacios y tildes, hasta 100 (D-178)", () => {
    expect(reporteCiudadanoSchema.safeParse({ ...reporte, nombre_reportante: "Juan123" }).success).toBe(false);
    expect(reporteCiudadanoSchema.safeParse({ ...reporte, nombre_reportante: "a".repeat(101) }).success).toBe(false);
    expect(reporteCiudadanoSchema.safeParse({ ...reporte, nombre_reportante: "Ñuñoa Úrsula" }).success).toBe(true);
  });

  it("RUT con dígito verificador incorrecto (D-179)", () => {
    const r = reporteCiudadanoSchema.safeParse({ ...reporte, rut_reportante: "12.345.678-9" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(/dígito verificador/);
  });

  it("tipo fuera de la lista de D-180", () => {
    expect(reporteCiudadanoSchema.safeParse({ ...reporte, tipo_incidencia: "plaga" }).success).toBe(false);
  });

  it("descripción obligatoria (D-181)", () => {
    expect(reporteCiudadanoSchema.safeParse({ ...reporte, descripcion: "  " }).error?.issues[0]?.message).toBe("descripcion es obligatorio");
  });

  it("no acepta campos de más (ningún dato de contacto, PR-022)", () => {
    expect(reporteCiudadanoSchema.safeParse({ ...reporte, telefono: "123" }).success).toBe(false);
  });
});

describe("revisionIncidenciaSchema (D-184 a D-189)", () => {
  it("Ingresada sin resultado es válida", () => {
    expect(revisionIncidenciaSchema.safeParse({ estado_incidencia: "ingresada" }).success).toBe(true);
  });

  it("fuera de Ingresada exige resultado (D-187)", () => {
    expect(revisionIncidenciaSchema.safeParse({ estado_incidencia: "en_revision" }).success).toBe(false);
  });

  it("Validada exige prioridad y la prioridad solo va con Validada (D-189)", () => {
    expect(revisionIncidenciaSchema.safeParse({ estado_incidencia: "derivada", resultado_revision: "validada" }).success).toBe(false);
    expect(revisionIncidenciaSchema.safeParse({ estado_incidencia: "derivada", resultado_revision: "validada", prioridad_municipal: "alta" }).success).toBe(true);
    expect(
      revisionIncidenciaSchema.safeParse({ estado_incidencia: "descartada", resultado_revision: "descartada", prioridad_municipal: "alta" }).success
    ).toBe(false);
  });
});
