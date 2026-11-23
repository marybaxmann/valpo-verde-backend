import { resolverMotorCommit } from "../../src/config/env";

describe("resolverMotorCommit", () => {
  it("en Vercel usa el commit del despliegue aunque MOTOR_COMMIT esté definida", () => {
    expect(resolverMotorCommit({ VERCEL_GIT_COMMIT_SHA: "abc123", MOTOR_COMMIT: "f3a7356" })).toBe("abc123");
  });

  it("fuera de Vercel usa MOTOR_COMMIT", () => {
    expect(resolverMotorCommit({ MOTOR_COMMIT: "f3a7356" })).toBe("f3a7356");
  });

  it("ignora un VERCEL_GIT_COMMIT_SHA vacío", () => {
    expect(resolverMotorCommit({ VERCEL_GIT_COMMIT_SHA: "  ", MOTOR_COMMIT: "f3a7356" })).toBe("f3a7356");
  });

  it("sin ninguna de las dos no entrega valor (la validación falla al arrancar)", () => {
    expect(resolverMotorCommit({})).toBeUndefined();
  });
});
