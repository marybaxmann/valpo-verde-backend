import {
  cambiarEstadoProyectoSchema,
  crearProyectoConSectorSchema,
  editarProyectoSchema,
} from "../../../src/schemas/sivu/proyectos.schema";

function proyectoValido() {
  return {
    nombre_proyecto: "Parque Baquedano",
    sector: {
      nombre_sector: "Cerro Baquedano",
      geometria_sector: {
        formato: "geojson" as const,
        geometria: { type: "Polygon" as const, coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]] },
      },
    },
  };
}

describe("crearProyectoConSectorSchema", () => {
  it("acepta un proyecto con sector por GeoJSON", () => {
    expect(crearProyectoConSectorSchema.safeParse(proyectoValido()).success).toBe(true);
  });

  it("acepta un sector por KML", () => {
    const r = crearProyectoConSectorSchema.safeParse({
      ...proyectoValido(),
      sector: { nombre_sector: "Cerro Baquedano", geometria_sector: { formato: "kml", archivoBase64: "PGttbD4=" } },
    });
    expect(r.success).toBe(true);
  });

  it("rechaza nombre_proyecto vacío", () => {
    const r = crearProyectoConSectorSchema.safeParse({ ...proyectoValido(), nombre_proyecto: "  " });
    expect(r.success).toBe(false);
  });

  it("rechaza sin sector", () => {
    const { sector, ...sinSector } = proyectoValido();
    expect(crearProyectoConSectorSchema.safeParse(sinSector).success).toBe(false);
  });

  it("rechaza nombre_sector vacío", () => {
    const r = crearProyectoConSectorSchema.safeParse({
      ...proyectoValido(),
      sector: { ...proyectoValido().sector, nombre_sector: "" },
    });
    expect(r.success).toBe(false);
  });

  it("rechaza geometria_sector con formato no reconocido", () => {
    const r = crearProyectoConSectorSchema.safeParse({
      ...proyectoValido(),
      sector: { nombre_sector: "X", geometria_sector: { formato: "shapefile", archivo: "x" } },
    });
    expect(r.success).toBe(false);
  });

  it("rechaza campos fuera de esquema (.strict())", () => {
    const r = crearProyectoConSectorSchema.safeParse({ ...proyectoValido(), estado_proyecto: "cerrado" });
    expect(r.success).toBe(false);
  });

  it("rechaza project_id en el body (nunca se confía del cliente)", () => {
    const r = crearProyectoConSectorSchema.safeParse({ ...proyectoValido(), project_id: "11111111-1111-1111-1111-111111111111" });
    expect(r.success).toBe(false);
  });
});

describe("editarProyectoSchema", () => {
  it("acepta solo nombre_proyecto", () => {
    expect(editarProyectoSchema.safeParse({ nombre_proyecto: "Nuevo nombre" }).success).toBe(true);
  });
  it("acepta solo sector", () => {
    expect(editarProyectoSchema.safeParse({ sector: { nombre_sector: "Otro sector" } }).success).toBe(true);
  });
  it("rechaza un body vacío", () => {
    expect(editarProyectoSchema.safeParse({}).success).toBe(false);
  });
});

describe("cambiarEstadoProyectoSchema", () => {
  it.each(["activo", "cerrado"])("acepta estado_proyecto = %s", (estado) => {
    expect(cambiarEstadoProyectoSchema.safeParse({ estado_proyecto: estado }).success).toBe(true);
  });
  it("rechaza una etiqueta en vez del código snake_case", () => {
    expect(cambiarEstadoProyectoSchema.safeParse({ estado_proyecto: "Cerrado" }).success).toBe(false);
  });
  it("rechaza un código fuera de dominio", () => {
    expect(cambiarEstadoProyectoSchema.safeParse({ estado_proyecto: "pausado" }).success).toBe(false);
  });
});
