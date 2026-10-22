import { altaMunicipalArbolSchema, altaPorLevantamientoSchema } from "../../../src/schemas/sivu/arboles.schema";

function altaValida() {
  return {
    sector: "Barrio Puerto",
    ubicacion_descriptiva: "Frente a la plaza",
    utm_este: 256000,
    utm_norte: 6348000,
    especie_cientifica: "Robinia pseudoacacia",
  };
}

describe("altaMunicipalArbolSchema", () => {
  it("acepta el alta mínima con solo especie_cientifica", () => {
    expect(altaMunicipalArbolSchema.safeParse(altaValida()).success).toBe(true);
  });

  it("acepta el alta mínima con solo nombre_comun", () => {
    const { especie_cientifica, ...resto } = altaValida();
    const r = altaMunicipalArbolSchema.safeParse({ ...resto, nombre_comun: "Falsa acacia" });
    expect(r.success).toBe(true);
  });

  it("rechaza sin especie_cientifica ni nombre_comun (D-13/D-14)", () => {
    const { especie_cientifica, ...resto } = altaValida();
    expect(altaMunicipalArbolSchema.safeParse(resto).success).toBe(false);
  });

  it("rechaza sin sector", () => {
    const { sector, ...resto } = altaValida();
    expect(altaMunicipalArbolSchema.safeParse(resto).success).toBe(false);
  });

  it("rechaza sector vacío", () => {
    expect(altaMunicipalArbolSchema.safeParse({ ...altaValida(), sector: "   " }).success).toBe(false);
  });

  it("rechaza sin ubicacion_descriptiva", () => {
    const { ubicacion_descriptiva, ...resto } = altaValida();
    expect(altaMunicipalArbolSchema.safeParse(resto).success).toBe(false);
  });

  it("rechaza utm_este no numérico", () => {
    expect(altaMunicipalArbolSchema.safeParse({ ...altaValida(), utm_este: "256000" }).success).toBe(false);
  });

  it("rechaza utm_norte = 0 (no es > 0)", () => {
    expect(altaMunicipalArbolSchema.safeParse({ ...altaValida(), utm_norte: 0 }).success).toBe(false);
  });

  it("rechaza utm_este = NaN/Infinity", () => {
    expect(altaMunicipalArbolSchema.safeParse({ ...altaValida(), utm_este: Infinity }).success).toBe(false);
  });

  it("rechaza datos técnicos fuera de alcance del alta municipal (.strict()): multifustal, dap_cm", () => {
    expect(altaMunicipalArbolSchema.safeParse({ ...altaValida(), dap_cm: 30 }).success).toBe(false);
  });

  it("rechaza sector_id en el body (lo resuelve el servidor desde el proyecto, nunca el cliente)", () => {
    expect(altaMunicipalArbolSchema.safeParse({ ...altaValida(), sector_id: "11111111-1111-1111-1111-111111111111" }).success).toBe(false);
  });
});

describe("altaPorLevantamientoSchema", () => {
  it("usa exactamente las mismas reglas que el alta municipal (PR-019 v1.2)", () => {
    expect(altaPorLevantamientoSchema).toBe(altaMunicipalArbolSchema);
  });
});
