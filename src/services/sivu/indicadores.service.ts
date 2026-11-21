import { AuthenticatedUser } from "../../types/auth";
import { assertProjectAccess } from "../authorization.service";
import { listarArbolesIndicadores, listarPresencia, listarRasgosEspecie, listarVariablesCrecimiento, obtenerSuperficieProyecto } from "../../repositories/sivu/indicadores.repository";
import { agregarSecuestro } from "../rules/carbono/secuestro";
import { arbolesConEvaluacionCompletaVigente } from "./habilitacionBiometrica";
import { agregarCarbono, ArbolCarbono } from "../rules/carbono/calculo";
import { agregarCarbonoAereoTotal } from "../rules/carbono/carbonoAereoTotal";
import { agregarVariacionAereoTotal } from "../rules/carbono/variacionAereoTotal";
import {
  ArbolEspecie,
  abundanciaRelativa,
  coberturaTaxonomica,
  diversidadShannon,
  diversidadTaxonomica102030,
  proporcionOrigen,
  riquezaEspecies,
} from "../rules/indicadores/especies";
import {
  ArbolIndicador,
  areaProyectadaCopa,
  densidadArborea,
  diametroMedioCopa,
  distribucionClaseDiametrica,
  numeroTotalArboles,
} from "../rules/indicadores/inventario";

/**
 * B19 — GET /api/sivu/projects/:id/indicadores?barrio= (hoja INDICES;
 * CC-016). Miembros y Administrador, como B7. Ámbito: el proyecto o un
 * barrio (ARBOLES.sector, D-7). Fecha de referencia: la de la consulta.
 */
export async function indicadoresInventario(user: AuthenticatedUser, projectId: string, barrio: string | undefined, token: string) {
  await assertProjectAccess(user, projectId, token);
  const fechaConsulta = new Date().toISOString();

  const filas = await listarArbolesIndicadores(token, projectId);
  const barrios = [...new Set(filas.map((f) => f.sector?.trim()).filter((s): s is string => !!s))].sort((a, b) => a.localeCompare(b, "es"));
  const delAmbito = barrio === undefined ? filas : filas.filter((f) => f.sector?.trim() === barrio);

  const [presencias, superficie] = await Promise.all([
    listarPresencia(token, delAmbito.map((f) => f.id)),
    barrio === undefined ? obtenerSuperficieProyecto(token, projectId) : Promise.resolve(null),
  ]);
  const presentesIds = new Set(presencias.filter((p) => p.estado_presencia === "presente").map((p) => p.tree_id));
  const [rasgos, evaluadosIds, crecimiento] = await Promise.all([
    listarRasgosEspecie(token, [...presentesIds]),
    arbolesConEvaluacionCompletaVigente(token, projectId, [...presentesIds]),
    listarVariablesCrecimiento(token, [...presentesIds]),
  ]);
  const crecimientoPorArbol = new Map(crecimiento.map((c) => [c.tree_id, c]));
  const rasgoPorArbol = new Map(rasgos.map((r) => [r.tree_id, r]));
  const especies: ArbolEspecie[] = delAmbito
    .filter((f) => presentesIds.has(f.id))
    .map((f) => {
      const r = rasgoPorArbol.get(f.id);
      return {
        id: f.id,
        especie_cientifica: f.especie_catalogo ?? f.especie_cientifica,
        genero: r?.genero ?? null,
        familia: r?.familia ?? null,
        origen_biogeografico: r?.origen_biogeografico ?? "no_determinado",
      };
    });

  const presentes: ArbolIndicador[] = delAmbito
    .filter((f) => presentesIds.has(f.id))
    .map((f) => ({
      id: f.id,
      sector: f.sector,
      presente: true,
      dap_cm: f.dap_cm,
      diametro_copa_ns_m: f.diametro_copa_ns_m,
      diametro_copa_eo_m: f.diametro_copa_eo_m,
      diametro_copa_m: f.diametro_copa_m,
      copa_no_presenta: f.copa_no_presenta,
    }));

  const evaluados = presentes.filter((a) => evaluadosIds.has(a.id));

  // Carbono (CC-069 v1): presentes del ámbito; el módulo deja fuera del universo a los no evaluados.
  const arbolesCarbono: ArbolCarbono[] = delAmbito
    .filter((f) => presentesIds.has(f.id))
    .map((f) => ({
      id: f.id,
      presente: true,
      evaluacion_completa_vigente: evaluadosIds.has(f.id),
      especie_cientifica: f.especie_catalogo ?? f.especie_cientifica,
      tipo_hoja: rasgoPorArbol.get(f.id)?.tipo_hoja ?? null,
      multifustal: f.multifustal,
      dap_fustes_cm: f.dap_fustes_cm ?? null,
      dap_cm: f.dap_cm,
      altura_total_m: f.altura_total_m,
    }));

  const arbolesSecuestro = arbolesCarbono.map((a) => ({
    ...a,
    cle: crecimientoPorArbol.get(a.id)?.cle ?? null,
    muerte_regresiva_pct: crecimientoPorArbol.get(a.id)?.muerte_regresiva_pct ?? null,
    poda_intensa: crecimientoPorArbol.get(a.id)?.poda_intensa ?? null,
    tree_code: delAmbito.find((f) => f.id === a.id)?.tree_code ?? null,
  }));

  return {
    fecha_consulta: fechaConsulta,
    ambito: { tipo: barrio === undefined ? ("proyecto" as const) : ("barrio" as const), barrio: barrio ?? null },
    barrios,
    cobertura: {
      arboles_registrados: delAmbito.length,
      arboles_presentes: presentes.length,
      // Universo biométrico (filas 11 a 13): presentes con evaluación completa válida y vigente.
      arboles_con_evaluacion_valida: evaluados.length,
      arboles_sin_evaluacion_valida: presentes.length - evaluados.length,
    },
    numero_total_arboles: numeroTotalArboles(presentes),
    densidad_arborea: densidadArborea(presentes.length, superficie, barrio !== undefined),
    clases_diametricas: distribucionClaseDiametrica(evaluados),
    diametro_medio_copa: diametroMedioCopa(evaluados),
    area_proyectada_copa: areaProyectadaCopa(evaluados),
    cobertura_taxonomica: coberturaTaxonomica(especies),
    riqueza_especies: riquezaEspecies(especies),
    abundancia_relativa: abundanciaRelativa(especies),
    diversidad_shannon: diversidadShannon(especies),
    diversidad_taxonomica_10_20_30: diversidadTaxonomica102030(especies),
    proporcion_origen: proporcionOrigen(especies),
    // Separados: biomasa aérea leñosa, carbono aéreo leñoso y CO₂ equivalente (total en t), con cobertura y motivos.
    estimacion_carbono_aereo_lenoso: agregarCarbono(arbolesCarbono),
    // Carbono aéreo total con follaje (carbono directo, 2026-11-21): indicador aparte, solo cobertura mientras
    // los modelos sean exploratorios; nunca se suma con el carbono aéreo leñoso.
    estimacion_carbono_aereo_total: agregarCarbonoAereoTotal(arbolesCarbono),
    // Secuestro anual (decisiones A a C, 2026-11-20): cobertura por tipo de resultado; el total suma solo
    // estimaciones fundamentadas, nunca simulaciones.
    estimacion_secuestro_anual: agregarSecuestro(arbolesSecuestro),
    // Propuesta experimental (2026-11-21): variación anual proyectada del carbono aéreo total (con hojas) de las
    // especies con carbono directo. Solo cobertura; no es secuestro leñoso ni captura fotosintética.
    estimacion_variacion_anual_carbono_aereo_total: agregarVariacionAereoTotal(arbolesSecuestro),
  };
}
