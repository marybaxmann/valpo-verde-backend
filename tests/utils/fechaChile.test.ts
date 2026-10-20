import { hoyEnChile } from "../../src/utils/fechaChile";

/** El día debe ser el de Chile, no el de UTC (el día UTC cambia a las 21:00 / 20:00 de Chile). */
describe("hoyEnChile", () => {
  afterEach(() => jest.useRealTimers());

  const en = (isoUtc: string) => {
    jest.useFakeTimers().setSystemTime(new Date(isoUtc));
    return hoyEnChile();
  };

  it.each([
    ["2026-10-10T23:59:00Z", "2026-10-10"], // 20:59 Chile, verano (UTC−3)
    ["2026-10-11T00:00:00Z", "2026-10-10"], // 21:00 Chile: UTC ya es día 11
    ["2026-10-11T02:59:00Z", "2026-10-10"], // 23:59 Chile
    ["2026-10-11T03:00:00Z", "2026-10-11"], // 00:00 Chile
    ["2026-07-11T00:00:00Z", "2026-07-10"], // 20:00 Chile, invierno (UTC−4)
    ["2026-07-11T03:59:00Z", "2026-07-10"], // 23:59 Chile, invierno
    ["2026-07-11T04:00:00Z", "2026-07-11"], // 00:00 Chile, invierno
  ])("a las %s UTC es %s en Chile", (iso, esperado) => {
    expect(en(iso)).toBe(esperado);
  });
});
