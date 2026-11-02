/** Universo biométrico de B19: evaluación completa válida (filtro de fn_refresh_tree_current) y evaluación vigente (tree_assessments). */
jest.mock("../../../src/repositories/sivu/evaluacionValida.repository", () => ({ listarArbolesConInspeccionValida: jest.fn() }));
jest.mock("../../../src/repositories/sivu/diagnostico.repository", () => ({ listarEvaluacionesVigentes: jest.fn() }));

import { arbolesConEvaluacionCompletaVigente } from "../../../src/services/sivu/habilitacionBiometrica";
import { listarArbolesConInspeccionValida } from "../../../src/repositories/sivu/evaluacionValida.repository";
import { listarEvaluacionesVigentes } from "../../../src/repositories/sivu/diagnostico.repository";

const P = "33333333-3333-4333-8333-333333333333";

beforeEach(() => jest.clearAllMocks());

describe("arbolesConEvaluacionCompletaVigente", () => {
  it("exige las dos cosas: evaluación completa válida Y evaluación vigente", async () => {
    (listarArbolesConInspeccionValida as jest.Mock).mockResolvedValue(new Set(["a", "b"]));
    (listarEvaluacionesVigentes as jest.Mock).mockResolvedValue([{ tree_id: "a" }, { tree_id: "c" }]);
    const r = await arbolesConEvaluacionCompletaVigente("tok", P, ["a", "b", "c", "d"]);
    expect([...r]).toEqual(["a"]);
  });

  it("solo los tipos de evaluación completa (CC-056): inicial, reevaluación y levantamiento", async () => {
    (listarArbolesConInspeccionValida as jest.Mock).mockResolvedValue(new Set());
    (listarEvaluacionesVigentes as jest.Mock).mockResolvedValue([]);
    await arbolesConEvaluacionCompletaVigente("tok", P, ["a"]);
    expect(listarArbolesConInspeccionValida).toHaveBeenCalledWith("tok", ["a"], ["evaluacion_inicial", "reevaluacion", "levantamiento"]);
    expect(listarEvaluacionesVigentes).toHaveBeenCalledWith("tok", P, "a");
  });

  it("sin árboles no consulta", async () => {
    expect((await arbolesConEvaluacionCompletaVigente("tok", P, [])).size).toBe(0);
    expect(listarArbolesConInspeccionValida).not.toHaveBeenCalled();
  });
});
