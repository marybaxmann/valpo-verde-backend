/** CC-052: árboles cercanos a una coordenada UTM (para no duplicar en un Levantamiento). */
jest.mock("../../../src/services/authorization.service");
jest.mock("../../../src/repositories/sivu/arbolesCercanos.repository");

import { buscarArbolesCercanos } from "../../../src/services/sivu/arbolesCercanos.service";
import { assertProjectAccess } from "../../../src/services/authorization.service";
import { listarArbolesEnCuadrado } from "../../../src/repositories/sivu/arbolesCercanos.repository";

const user = { id: "u", email: undefined, nombre: null, role: "inspector", activo: true };
const arbol = (id: string, este: number, norte: number) => ({
  id, tree_code: `A-${id}`, especie_cientifica: null, nombre_comun: "Peumo", ubicacion_descriptiva: "Plaza",
  utm_este: String(este), utm_norte: String(norte), estado_ciclo_vida: "activo",
});

beforeEach(() => {
  (assertProjectAccess as jest.Mock).mockResolvedValue(undefined);
  (listarArbolesEnCuadrado as jest.Mock).mockResolvedValue([
    arbol("3", 256010, 6341010), // 14,1 m
    arbol("1", 256003, 6341004), // 5 m
    arbol("2", 256019, 6341019), // 26,9 m: dentro del cuadrado, fuera del círculo de 20 m
  ]);
});

describe("buscarArbolesCercanos", () => {
  it("verifica el acceso, consulta el cuadrado y devuelve solo los del círculo, del más cercano al más lejano", async () => {
    const r = await buscarArbolesCercanos(user, "p1", { utm_este: 256000, utm_norte: 6341000, radio_m: 20, limit: 20 }, "tk");

    expect(assertProjectAccess).toHaveBeenCalledWith(user, "p1", "tk");
    expect(listarArbolesEnCuadrado).toHaveBeenCalledWith("tk", "p1", { este: 256000, norte: 6341000 }, 20);
    expect(r.map((a) => [a.id, a.distancia_m])).toEqual([["1", 5], ["3", 14.1]]);
    expect(r[0]).toMatchObject({ utm_este: 256003, estado_ciclo_vida: { codigo: "activo", etiqueta: "Presente" } });
  });

  it("respeta el límite de resultados", async () => {
    const r = await buscarArbolesCercanos(user, "p1", { utm_este: 256000, utm_norte: 6341000, radio_m: 50, limit: 1 }, "tk");
    expect(r.map((a) => a.id)).toEqual(["1"]);
  });
});
