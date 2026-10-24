/**
 * Simulado de Aposentadoria — lógica pura e testável (sem dependências de UI).
 *
 * Modelo:
 * - "Aportes (sem rendimentos)": poupador que apenas acumula os aportes, sem rentabilidade.
 * - "Com rendimentos": patrimônio que cresce com a rentabilidade escolhida e continua
 *   recebendo aportes até o fim do horizonte (cenário hipotético).
 * - "Plano de aposentadoria": até atingir a meta, cresce igual à linha anterior; a partir do
 *   mês da meta os aportes param e TODO o rendimento do mês é sacado, de modo que o patrimônio
 *   do plano permanece constante e sustenta a renda desejada (corrigida pela inflação).
 */

function toNumber(valor, padrao = 0) {
  const n = typeof valor === 'number' ? valor : parseFloat(valor);
  return Number.isFinite(n) ? n : padrao;
}

/**
 * Taxa mensal usada pelo simulado.
 * - Renda Fixa: taxa efetiva mensal equivalente à taxa anual contratada (12ª parte composta).
 * - FII: rendimento mensal informado (% a.m.).
 */
export function calcularTaxaMensal(modalidade, taxaJurosAnual = 0, rendimentoMensalPct = 0) {
  if (modalidade === 'fii') {
    return toNumber(rendimentoMensalPct) / 100;
  }
  const anual = Math.max(-99, toNumber(taxaJurosAnual)) / 100; // evita NaN com base negativa
  return Math.pow(1 + anual, 1 / 12) - 1;
}

/** Converte um total de meses em texto pt-BR: "X anos e Y meses". */
export function formatarTempoMeses(totalMeses) {
  const anos = Math.floor(totalMeses / 12);
  const meses = totalMeses % 12;
  const txtAnos = `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
  const txtMeses = `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  return `${txtAnos} e ${txtMeses}`;
}

/**
 * Simula o caminho até a aposentadoria, mês a mês.
 *
 * @param {object} params
 * @param {number} params.salarioAtual      Salário mensal atual (referência para o usuário).
 * @param {number} params.salarioPretendido Renda mensal desejada na aposentadoria (hoje).
 * @param {number} params.inflacaoAnual     Inflação anual conservadora (% a.a.).
 * @param {number} params.aporteMensal      Aporte mensal (R$).
 * @param {number} [params.aporteInicial=0] Aporte inicial (R$).
 * @param {'rf'|'fii'} [params.modalidade='rf']
 * @param {number} params.taxaJurosAnual    Taxa de juros anual da Renda Fixa (% a.a.).
 * @param {number} params.rendimentoMensalPct Rendimento mensal do FII (% a.m.).
 * @param {number} [params.horizonteAnos=40] Horizonte máximo do simulado (anos).
 * @returns {{ meses: Array<{mes:number, semRendimento:number, patrimonio:number, plano:number, rendaMeta:number, ano:number}>, metaMes: number|null, resumo: object }}
 */
export function simularAposentadoria(params = {}) {
  const {
    salarioAtual = 0, // eslint-disable-line no-unused-vars
    salarioPretendido = 0,
    inflacaoAnual = 0,
    aporteMensal = 0,
    aporteInicial = 0,
    modalidade = 'rf',
    taxaJurosAnual = 0,
    rendimentoMensalPct = 0,
    horizonteAnos = 40,
  } = params;

  const salPret = Math.max(0, toNumber(salarioPretendido));
  const aporteM = Math.max(0, toNumber(aporteMensal));
  const aporteI = Math.max(0, toNumber(aporteInicial));
  const taxaMensal = calcularTaxaMensal(modalidade, taxaJurosAnual, rendimentoMensalPct);
  const inflacaoMensal = Math.pow(1 + Math.max(-99, toNumber(inflacaoAnual)) / 100, 1 / 12) - 1;
  const totalMeses = Math.max(0, Math.round(toNumber(horizonteAnos, 40) * 12));

  const meses = [];
  let patrimonio = aporteI; // linha "com rendimentos" (hipótese: continua aportando)
  let plano = aporteI; // linha do plano (deixa de aportar ao atingir a meta)
  let metaMes = null;
  let patrimonioNaMeta = null;
  let rendaNaMeta = null;

  for (let m = 0; m <= totalMeses; m += 1) {
    // Apenas aportes, sem rentabilidade (linha).
    const semRendimento = aporteI + aporteM * m;
    // Meta de renda corrigida pela inflação até o mês m.
    const rendaMeta = salPret * Math.pow(1 + inflacaoMensal, m);

    if (metaMes === null) {
      // Fase de acumulação: rende sobre o patrimônio e recebe o aporte do mês.
      if (m > 0) {
        patrimonio = patrimonio * (1 + taxaMensal) + aporteM;
      }
      plano = patrimonio;

      // Meta atingida: o patrimônio já sustenta a renda pretendida (corrigida).
      // Renda meta > 0 evita o caso degenerado "0 >= 0" quando o salário pretendido é zerado.
      if (m > 0 && rendaMeta > 0 && patrimonio * taxaMensal >= rendaMeta) {
        metaMes = m;
        patrimonioNaMeta = patrimonio;
        rendaNaMeta = rendaMeta;
      }
    } else {
      // Aposentadoria: aportes param e todo o rendimento é sacado → patrimônio constante.
      plano = patrimonioNaMeta;
      // Linha B continua acumulando até o fim do horizonte (cenário hipotético).
      patrimonio = patrimonio * (1 + taxaMensal) + aporteM;
    }

    meses.push({
      mes: m,
      semRendimento,
      patrimonio,
      plano,
      rendaMeta,
      ano: Math.floor(m / 12),
    });
  }

  let resumo;
  if (metaMes === null) {
    resumo = {
      tempoMeses: null,
      tempoFormatado: null,
      patrimonioNecessario: null,
      rendaNaMeta: null,
      totalAportado: null,
      totalRendimento: null,
      patrimonioFinalPlano: null,
      rendaMensalSacada: null,
    };
  } else {
    const totalAportado = aporteI + aporteM * metaMes;
    resumo = {
      tempoMeses: metaMes,
      tempoFormatado: formatarTempoMeses(metaMes),
      patrimonioNecessario: patrimonioNaMeta,
      rendaNaMeta,
      totalAportado,
      totalRendimento: patrimonioNaMeta - totalAportado,
      patrimonioFinalPlano: patrimonioNaMeta,
      rendaMensalSacada: patrimonioNaMeta * taxaMensal,
    };
  }

  return { meses, metaMes, resumo };
}
