/** Placas QR (CC-062 punto 2): PDF solo para el Usuario municipal; cada QR, a la ficha por qr_token. */
jest.mock("../../../src/config/env", () => ({
  env: { ...jest.requireActual("../../../src/config/env").env, CONECTA_URL_BASE: "https://conecta.example.test/arbol" },
}));
jest.mock("../../../src/services/authorization.service");
jest.mock("../../../src/repositories/sivu/conecta.repository");

import { generarPlacasQr } from "../../../src/services/sivu/placasQr.service";
import { assertProjectRole } from "../../../src/services/authorization.service";
import { listarArbolesParaPlacas } from "../../../src/repositories/sivu/conecta.repository";

const mRol = assertProjectRole as jest.Mock;
const mArboles = listarArbolesParaPlacas as jest.Mock;
const user = { id: "u1", email: undefined, nombre: null, role: "usuario_municipal", activo: true };

describe("generarPlacasQr", () => {
  it("exige el rol Usuario municipal en el proyecto y genera un PDF con 7 placas en 2 páginas", async () => {
    mRol.mockResolvedValue(undefined);
    mArboles.mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => ({ tree_code: `A-00000${i}`, qr_token: `00000000-0000-4000-8000-00000000000${i}`, especie_cientifica: "Acer pseudoplatanus", nombre_comun: "Falso plátano" }))
    );

    const pdf = await generarPlacasQr(user, "p1", "token");

    expect(mRol).toHaveBeenCalledWith(user, "p1", ["usuario_municipal"], "token");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect((pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length).toBe(2);
  });

  it("sin árboles activos: 404", async () => {
    mRol.mockResolvedValue(undefined);
    mArboles.mockResolvedValue([]);
    await expect(generarPlacasQr(user, "p1", "token")).rejects.toMatchObject({ statusCode: 404 });
  });
});
