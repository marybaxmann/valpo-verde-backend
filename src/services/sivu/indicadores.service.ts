import { AuthenticatedUser } from "../../types/auth";
import { assertProjectAccess } from "../authorization.service";
import { listarArbolesIndicadores, listarPresencia, listarRasgosEspecie, listarVariablesCrecimiento, obtenerSuperficieProyecto } from "../../repositories/sivu/indicadores.repository";
import { agregarSecuestro, MEDICIONES_EN_REVISION } from "../rules/carbono/secuestro";
import { ArbolDescriptivo, diagnosticoDescriptivo } from "../rules/indicadores/descriptivos";
import { coberturaArborea, resumenAportesAmbientales } from "../rules/indicadores/aportesAmbientales";
import { agregarAportesFoliares } from "../rules/indicadores/aportesFoliares";
import { CATALOGO } from "../rules/engine/catalogs";
import { arbolesConEvaluacionCompletaVigente } from "./habilitacionBiometrica";
import { agregarCarbono, ArbolCarbono } from "../rules/carbono/calculo";
import { agregarCarbonoAereoTotal } from "../rules/carbono/carbonoAereoTotal";
import { agregarCarbonoIntegrado } from "../rules/carbono/carbonoIntegrado";
import { agregarVariacionAereoTotal, resumirProyeccionAnual } from "../rules/carbono/variacionAereoTotal";
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
  coberturaCopa,
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

  // Propuesta experimental: diagnóstico descriptivo con datos medidos y vigentes (sin ecuaciones).
  const etiqueta = (catalogo: string, codigo: string | null | undefined) =>
    codigo ? { codigo, etiqueta: CATALOGO.find((c) => c.catalogo === catalogo && c.codigo === codigo)?.etiqueta ?? null } : null;
  const arbolesDescriptivos: ArbolDescriptivo[] = delAmbito
    .filter((f) => presentesIds.has(f.id))
    .map((f) => {
      const r = rasgoPorArbol.get(f.id);
      const c = crecimientoPorArbol.get(f.id);
      return {
        id: f.id,
        tree_code: f.tree_code ?? null,
        sector: f.sector,
        presente: true,
        evaluacion_completa_vigente: evaluadosIds.has(f.id),
        especie_cientifica: f.especie_catalogo ?? f.especie_cientifica,
        especie_en_catalogo: f.species_id !== null,
        genero: r?.genero ?? null,
        familia: r?.familia ?? null,
        origen_biogeografico: r?.origen_biogeografico ?? null,
        multifustal: f.multifustal,
        dap_fustes_cm: f.dap_fustes_cm ?? null,
        dap_cm: f.dap_cm,
        altura_total_m: f.altura_total_m,
        diametro_copa_m: f.diametro_copa_m,
        altura_primera_rama_m: f.altura_primera_rama_m ?? null,
        altura_base_copa_viva_m: f.altura_base_copa_viva_m ?? null,
        clase_edad: etiqueta("clase_edad", f.clase_edad),
        cle: c?.cle ?? null,
        muerte_regresiva_pct: c?.muerte_regresiva_pct ?? null,
        defoliacion_pct: c?.defoliacion_pct ?? null,
        clorosis_pct: c?.clorosis_pct ?? null,
        necrosis_pct: c?.necrosis_pct ?? null,
        copa_faltante_pct: c?.copa_faltante_pct ?? null,
        vitalidad: etiqueta("clasificacion_vitalidad", c?.vitalidad),
      };
    });

  const arbolesSecuestro = arbolesCarbono.map((a) => ({
    ...a,
    cle: crecimientoPorArbol.get(a.id)?.cle ?? null,
    muerte_regresiva_pct: crecimientoPorArbol.get(a.id)?.muerte_regresiva_pct ?? null,
    poda_intensa: crecimientoPorArbol.get(a.id)?.poda_intensa ?? null,
    tree_code: delAmbito.find((f) => f.id === a.id)?.tree_code ?? null,
  }));

  // Propuesta experimental (2026-11-23): aportes ambientales del marco de Nowak (2024).
  const porBarrio = barrio !== undefined;
  const coberturaUnida = coberturaArborea(
    delAmbito
      .filter((f) => evaluadosIds.has(f.id))
      .map((f) => ({
        id: f.id,
        utm_este: f.utm_este ?? null,
        utm_norte: f.utm_norte ?? null,
        diametro_copa_ns_m: f.diametro_copa_ns_m,
        diametro_copa_eo_m: f.diametro_copa_eo_m,
        copa_no_presenta: f.copa_no_presenta,
      })),
    superficie,
    porBarrio
  );
  const carbonoIntegrado = agregarCarbonoIntegrado(
    arbolesCarbono.map((a) => ({ ...a, tree_code: delAmbito.find((f) => f.id === a.id)?.tree_code ?? null }))
  );
  const secuestro = agregarSecuestro(arbolesSecuestro);
  // Propuesta experimental (2026-11-23): área foliar, remoción de contaminantes e interceptación (i-Tree simplificado).
  const aportesFoliares = agregarAportesFoliares(
    delAmbito
      .filter((f) => evaluadosIds.has(f.id))
      .map((f) => {
        const r = rasgoPorArbol.get(f.id);
        return {
          id: f.id,
          tree_code: f.tree_code ?? null,
          especie_cientifica: f.especie_catalogo ?? f.especie_cientifica,
          tipo_hoja: r?.tipo_hoja ?? null,
          persistencia_follaje: r?.persistencia_follaje ?? null,
          genero: r?.genero ?? null,
          altura_total_m: f.altura_total_m,
          altura_base_copa_viva_m: f.altura_base_copa_viva_m ?? null,
          altura_primera_rama_m: f.altura_primera_rama_m ?? null,
          diametro_copa_ns_m: f.diametro_copa_ns_m,
          diametro_copa_eo_m: f.diametro_copa_eo_m,
          copa_no_presenta: f.copa_no_presenta,
          muerte_regresiva_pct: crecimientoPorArbol.get(f.id)?.muerte_regresiva_pct ?? null,
        };
      })
  );
  const aportesAmbientales = resumenAportesAmbientales({
    foliares: aportesFoliares,
    presentes: arbolesDescriptivos.map((a) => ({
      especie: a.especie_cientifica !== null,
      dap: a.dap_cm !== null,
      altura: a.altura_total_m !== null,
      condicion: a.muerte_regresiva_pct !== null || a.vitalidad !== null,
    })),
    cobertura: coberturaUnida,
    carbono: {
      aprobados: carbonoIntegrado.aprobados,
      exploratorios: carbonoIntegrado.exploratorios,
      no_estimables: carbonoIntegrado.no_estimables,
      carbono_kg_aprobado: carbonoIntegrado.aereo.carbono_kg_aprobado,
      carbono_kg_exploratorio: carbonoIntegrado.aereo.carbono_kg_exploratorio,
    },
    secuestro: {
      fundamentadas: secuestro.cobertura.estimacion_fundamentada,
      simulaciones: secuestro.cobertura.simulacion_exploratoria,
      no_estimables: secuestro.cobertura.no_estimable,
    },
  });

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
    // Cobertura de copa del sector: área de copa / superficie del sector (Valej, 2026-11-22).
    cobertura_copa: coberturaCopa(areaProyectadaCopa(evaluados), superficie, barrio !== undefined),
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
    // Propuesta experimental (Valej, 2026-11-22): mejor modelo por árbol, aéreo y total separados, con su traza.
    estimacion_carbono_integrada: carbonoIntegrado,
    // Secuestro anual (decisiones A a C, 2026-11-20): cobertura por tipo de resultado; el total suma solo
    // estimaciones fundamentadas, nunca simulaciones.
    estimacion_secuestro_anual: secuestro,
    // Propuesta experimental (2026-11-21): variación anual proyectada del carbono aéreo total (con hojas) de las
    // especies con carbono directo. Solo cobertura; no es secuestro leñoso ni captura fotosintética.
    estimacion_variacion_anual_carbono_aereo_total: agregarVariacionAereoTotal(arbolesSecuestro),
    // Propuesta experimental: una sola clase por árbol (secuestro leñoso, variación aérea total o no estimable).
    resumen_proyeccion_anual: resumirProyeccionAnual(arbolesSecuestro),
    // Propuesta experimental: indicadores descriptivos (no registrados en INDICES).
    diagnostico_descriptivo: diagnosticoDescriptivo(arbolesDescriptivos, MEDICIONES_EN_REVISION),
    // Propuesta experimental (2026-11-23): cobertura arbórea sin contar dos veces las copas superpuestas.
    cobertura_arborea: coberturaUnida,
    // Propuesta experimental (2026-11-23): qué aporte del marco de Nowak (2024) se estima y qué falta.
    aportes_ambientales: aportesAmbientales,
    // Propuesta experimental (2026-11-23): detalle por árbol de área foliar, remoción e interceptación.
    aportes_foliares: aportesFoliares,
  };
}
