const PORCENTAJES_COPA = ["defoliacion_estimada_pct", "clorosis_pct", "necrosis_pct"] as const;

export function validarFisiologiaCopa(variables: Readonly<Record<string, unknown>>, copaAusente: boolean) {
  const incidencias: { campo: string; motivo: string }[] = [];
  const estacional = variables.sin_follaje_estacional;

  if (copaAusente && estacional != null) {
    incidencias.push({
      campo: "sin_follaje_estacional",
      motivo: "La casilla estacional no aplica cuando se registra copa ausente (D-268).",
    });
  }

  for (const campo of PORCENTAJES_COPA) {
    const valor = variables[campo];
    if (valor == null) continue;
    if (copaAusente || estacional !== false) {
      incidencias.push({
        campo,
        motivo: `${campo} solo aplica con copa evaluable y sin_follaje_estacional = No (CC-071).`,
      });
    } else if (typeof valor !== "number" || !Number.isFinite(valor) || valor < 0 || valor > 100) {
      incidencias.push({ campo, motivo: `${campo} debe ser un número entre 0 y 100.` });
    }
  }

  const { clorosis_pct, necrosis_pct } = variables;
  if (!copaAusente && estacional === false &&
      typeof clorosis_pct === "number" && typeof necrosis_pct === "number" &&
      clorosis_pct + necrosis_pct > 100) {
    incidencias.push({ campo: "necrosis_pct", motivo: "Clorosis y necrosis juntas no pueden superar el 100 % (D-84/D-85)." });
  }

  return incidencias;
}
