import {
  buscarEspeciesQuerySchema,
  completarEspecieSchema,
  especieIdParamSchema,
  renombrarEspecieSchema,
} from "../../../src/schemas/sivu/especies.schema";

describe("buscarEspeciesQuerySchema", () => {
  it("acepta nombre no vacío", () => {
    expect(buscarEspeciesQuerySchema.safeParse({ nombre: "robinia" }).success).toBe(true);
  });

  it("rechaza sin nombre", () => {
    expect(buscarEspeciesQuerySchema.safeParse({}).success).toBe(false);
  });

  it("rechaza nombre vacío o solo espacios", () => {
    expect(buscarEspeciesQuerySchema.safeParse({ nombre: "   " }).success).toBe(false);
  });

  it("rechaza parámetros extra (.strict())", () => {
    expect(buscarEspeciesQuerySchema.safeParse({ nombre: "robinia", limite: 50 }).success).toBe(false);
  });
});

describe("especieIdParamSchema", () => {
  it("acepta un uuid válido", () => {
    expect(especieIdParamSchema.safeParse({ id: "11111111-1111-1111-1111-111111111111" }).success).toBe(true);
  });

  it("rechaza un id no-uuid", () => {
    expect(especieIdParamSchema.safeParse({ id: "no-es-un-uuid" }).success).toBe(false);
  });
});

describe("completarEspecieSchema (CC-053 punto 4)", () => {
  it("acepta completar solo genero", () => {
    expect(completarEspecieSchema.safeParse({ genero: "Robinia" }).success).toBe(true);
  });

  it("acepta los 5 campos juntos", () => {
    const r = completarEspecieSchema.safeParse({
      genero: "Robinia",
      familia: "Fabaceae",
      origen_biogeografico: "introducida",
      persistencia_follaje: "caducifolia",
      tipo_hoja: "latifoliada",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza un body vacío (nada que completar)", () => {
    expect(completarEspecieSchema.safeParse({}).success).toBe(false);
  });

  it("acepta null explícito (borrar un campo ya completado)", () => {
    expect(completarEspecieSchema.safeParse({ genero: null }).success).toBe(true);
    expect(completarEspecieSchema.safeParse({ origen_biogeografico: null }).success).toBe(true);
  });

  it("rechaza un origen_biogeografico fuera del dominio del Excel (D-259)", () => {
    expect(completarEspecieSchema.safeParse({ origen_biogeografico: "exotica" }).success).toBe(false);
  });

  it("rechaza una persistencia_follaje fuera del dominio del Excel (D-261)", () => {
    expect(completarEspecieSchema.safeParse({ persistencia_follaje: "siempreverde" }).success).toBe(false);
  });

  it("rechaza un tipo_hoja fuera del dominio del Excel (D-262)", () => {
    expect(completarEspecieSchema.safeParse({ tipo_hoja: "compuesta" }).success).toBe(false);
  });

  it("rechaza campos fuera de alcance (.strict()): especie_cientifica no se corrige aquí (va en /nombre)", () => {
    expect(completarEspecieSchema.safeParse({ genero: "Robinia", especie_cientifica: "Otra" }).success).toBe(false);
  });
});

describe("renombrarEspecieSchema (CC-053 punto 5)", () => {
  it("acepta un nombre no vacío", () => {
    expect(renombrarEspecieSchema.safeParse({ especie_cientifica: "Robinia pseudoacacia" }).success).toBe(true);
  });

  it("rechaza sin especie_cientifica", () => {
    expect(renombrarEspecieSchema.safeParse({}).success).toBe(false);
  });

  it("rechaza especie_cientifica vacía", () => {
    expect(renombrarEspecieSchema.safeParse({ especie_cientifica: "   " }).success).toBe(false);
  });
});
