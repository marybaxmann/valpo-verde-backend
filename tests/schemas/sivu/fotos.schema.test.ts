import { inspectionIdParamSchema, subirFotoInspeccionSchema } from "../../../src/schemas/sivu/fotos.schema";

describe("inspectionIdParamSchema", () => {
  it("acepta un uuid válido", () => {
    expect(inspectionIdParamSchema.safeParse({ inspectionId: "11111111-1111-1111-1111-111111111111" }).success).toBe(true);
  });

  it("rechaza un id no-uuid", () => {
    expect(inspectionIdParamSchema.safeParse({ inspectionId: "no-es-un-uuid" }).success).toBe(false);
  });
});

describe("subirFotoInspeccionSchema (D-27, las 4 vistas obligatorias)", () => {
  it.each(["arbol_completo", "base", "tronco", "copa"])("acepta vista = %s", (vista) => {
    expect(subirFotoInspeccionSchema.safeParse({ vista }).success).toBe(true);
  });

  it("rechaza una vista fuera del dominio del Excel (D-27)", () => {
    expect(subirFotoInspeccionSchema.safeParse({ vista: "hoja_anverso" }).success).toBe(false);
  });

  it("acepta sin vista (opcional en la forma — el service exige o prohíbe según el tipo de inspección, D-27)", () => {
    expect(subirFotoInspeccionSchema.safeParse({}).success).toBe(true);
  });

  it("rechaza campos extra (.strict())", () => {
    expect(subirFotoInspeccionSchema.safeParse({ vista: "base", descripcion: "x" }).success).toBe(false);
  });
});
