import {
  TABELA_PROGRESSIVA_RF,
  TABELA_PROGRESSIVA_GANHO_CAPITAL,
  ALIQUOTA_DAY_TRADE,
  ALIQUOTA_JCP,
  ISENCAO_VENDA_ACOES_MENSAL,
  CODIGO_RECEITA_DARF_ACOES,
  PRAZO_DARF,
  CODIGOS_RENDIMENTOS,
  GRUPO_TIPO_DIRPF,
  CODIGO_TIPO_DIRPF,
  LOCALIZACAO_BENS,
} from './irrfConstants';
import { normalizeTipo } from '../utils/helpers';

// ─── Helpers para normalizar dados ───────────────────────────────────────────
// Os dados salvos usam "operacao" (portugues: Compra/Venda)
// e datas no formato DD/MM/AAAA. O código original esperava
// "operation" (ingles) e datas ISO.

export function parseDateBR(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr) ? null : dateStr;
  const str = String(dateStr).trim();
  // Tenta ISO primeiro
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    return isNaN(d) ? null : d;
  }
  // Formato DD/MM/AAAA
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, dia, mes, ano] = match;
    const d = new Date(Number(ano), Number(mes) - 1, Number(dia));
    return isNaN(d) ? null : d;
  }
  return null;
}

export function getYearFromDate(dateStr) {
  const d = parseDateBR(dateStr);
  return d ? d.getFullYear() : null;
}

export function getMonthFromDate(dateStr) {
  const d = parseDateBR(dateStr);
  return d ? d.getMonth() + 1 : null;
}

// Normaliza o campo de operação: "Compra"/"Venda" → "C"/"V"
export function getOperacao(t) {
  const raw = (t.operation || t.operacao || '').trim().toLowerCase();
  if (raw === 'c' || raw === 'compra' || raw === 'buy' || raw === 'bonificação' || raw === 'bonificacao') return 'C';
  if (raw === 'v' || raw === 'venda' || raw === 'sell') return 'V';
  return raw.toUpperCase();
}

export function calcularPrecoMedio(transacoesTicker) {
  if (!transacoesTicker || transacoesTicker.length === 0) return 0;
  let totalInvestido = 0;
  let totalQtd = 0;
  for (const t of transacoesTicker) {
    if (getOperacao(t) === 'C') {
      const investido = t.investido || (t.valorUnitario || t.price || 0) * (t.quantidade || t.qtd || 0) + (t.taxas || 0);
      const qtd = t.quantidade || t.qtd || 0;
      totalInvestido += investido;
      totalQtd += qtd;
    }
  }
  return totalQtd > 0 ? totalInvestido / totalQtd : 0;
}

export function calcularSaldoPorTicker(transacoes) {
  const porTicker = {};
  for (const t of transacoes) {
    const ticker = (t.ticker || '').toUpperCase();
    if (!ticker) continue;
    if (!porTicker[ticker]) porTicker[ticker] = { compras: 0, vendas: 0, investidoCompra: 0, investidoVenda: 0, total: 0 };
    const qtd = t.quantidade || t.qtd || 0;
    const investido = t.investido || (t.valorUnitario || t.price || 0) * qtd + (t.taxas || 0);
    if (getOperacao(t) === 'C') {
      porTicker[ticker].compras += qtd;
      porTicker[ticker].investidoCompra += investido;
    } else if (getOperacao(t) === 'V') {
      porTicker[ticker].vendas += qtd;
      porTicker[ticker].investidoVenda += investido;
    }
    porTicker[ticker].total = porTicker[ticker].compras - porTicker[ticker].vendas;
  }
  return porTicker;
}

export function calcularLucroPrejuizo(transacoes, ticker) {
  const tickerTransacoes = transacoes.filter(
    (t) => (t.ticker || '').toUpperCase() === (ticker || '').toUpperCase()
  );
  const compras = [];
  const vendas = [];
  for (const t of tickerTransacoes) {
    const qtd = t.quantidade || t.qtd || 0;
    const valor = t.investido || (t.valorUnitario || t.price || 0) * qtd + (t.taxas || 0);
    if (getOperacao(t) === 'C') {
      compras.push({ qtd, valor });
    } else if (getOperacao(t) === 'V') {
      vendas.push({ qtd, valor });
    }
  }
  let lucro = 0;
  let custoMedio = 0;
  let qtdAcumulada = 0;
  let investidoAcumulado = 0;
  for (const c of compras) {
    investidoAcumulado += c.valor;
    qtdAcumulada += c.qtd;
  }
  custoMedio = qtdAcumulada > 0 ? investidoAcumulado / qtdAcumulada : 0;
  for (const v of vendas) {
    const custoVenda = v.qtd * custoMedio;
    lucro += v.valor - custoVenda;
  }
  return { lucro, custoMedio, investido: investidoAcumulado, totalQtd: qtdAcumulada };
}

export function calcularGanhoCapitalAnual(transacoes, ano) {
  const vendasAno = transacoes.filter((t) => {
    if (getOperacao(t) !== 'V') return false;
    return getYearFromDate(t.date || t.data) === ano;
  });
  let totalLucro = 0;
  let totalVendas = 0;
  let totalIsento = 0;
  let lucroMesAMes = {};
  for (const v of vendasAno) {
    const ticker = (v.ticker || '').toUpperCase();
    const resultado = calcularLucroPrejuizo(transacoes, ticker);
    const mes = getMonthFromDate(v.date || v.data);
    if (!lucroMesAMes[mes]) lucroMesAMes[mes] = { vendas: 0, lucro: 0, isento: 0 };
    lucroMesAMes[mes].vendas += v.investido || (v.valorUnitario || v.price || 0) * (v.quantidade || v.qtd || 0) + (v.taxas || 0);
    lucroMesAMes[mes].lucro += resultado.lucro;
    if (resultado.lucro < 0) {
      lucroMesAMes[mes].isento += resultado.lucro;
    } else if (lucroMesAMes[mes].vendas <= ISENCAO_VENDA_ACOES_MENSAL) {
      lucroMesAMes[mes].isento += Math.min(resultado.lucro, lucroMesAMes[mes].vendas <= ISENCAO_VENDA_ACOES_MENSAL ? resultado.lucro : 0);
    }
    totalLucro += resultado.lucro;
    totalVendas += v.investido || (v.valorUnitario || v.price || 0) * (v.quantidade || v.qtd || 0) + (v.taxas || 0);
  }
  return { totalLucro, totalVendas, lucroMesAMes, vendasCount: vendasAno.length };
}

export function verificarIsencaoVendasMensais(transacoes, ano) {
  const resultado = {};
  for (let m = 1; m <= 12; m++) {
    const vendasMes = transacoes.filter((t) => {
      if (getOperacao(t) !== 'V') return false;
      return getYearFromDate(t.date || t.data) === ano && getMonthFromDate(t.date || t.data) === m;
    });
    let totalVendasMes = 0;
    for (const v of vendasMes) {
      totalVendasMes += v.investido || (v.valorUnitario || v.price || 0) * (v.quantidade || v.qtd || 0) + (v.taxas || 0);
    }
    resultado[m] = {
      total: totalVendasMes,
      isento: totalVendasMes <= ISENCAO_VENDA_ACOES_MENSAL,
      excedente: Math.max(0, totalVendasMes - ISENCAO_VENDA_ACOES_MENSAL),
    };
  }
  return resultado;
}

export function calcularAliquotaRF(dias) {
  for (const faixa of TABELA_PROGRESSIVA_RF) {
    if (dias <= faixa.ate) return faixa.aliquota;
  }
  return 15;
}

export function calcularAliquotaGanhoCapital(lucro) {
  for (const faixa of TABELA_PROGRESSIVA_GANHO_CAPITAL) {
    if (lucro <= faixa.ate) return faixa.aliquota;
  }
  return 22.5;
}

export function calcularAlíquotaEfetiva(rendimento, ir) {
  if (!rendimento || rendimento === 0) return 0;
  return (ir / rendimento) * 100;
}

export function calcularRendimentosIsentos(proventos, ano) {
  return proventos.filter((p) => {
    const pAno = getYearFromDate(p.date || p.data);
    return pAno === ano && (p.tipo === 'Dividendo' || p.tipo === 'dividendo');
  });
}

export function calcularRendimentosFIIIsentos(proventos, ano) {
  return proventos.filter((p) => {
    const pAno = getYearFromDate(p.date || p.data);
    return pAno === ano && ((p.tipo === 'FII' || p.tipo === 'Rendimento FII' || p.tipo === 'Reembolso') && p.dividendos > 0);
  });
}

export function calcularJCP(proventos, ano) {
  return proventos.filter((p) => {
    const pAno = getYearFromDate(p.date || p.data);
    return pAno === ano && (p.jcp > 0 || (p.tipo && p.tipo.toLowerCase().includes('jcp')));
  });
}

export function calcularRendimentosTributados(proventos, ano) {
  return proventos.filter((p) => {
    const pAno = getYearFromDate(p.date || p.data);
    return pAno === ano && (p.tipo === 'Rendimento' || p.tipo === 'rendimento') && p.rendimento > 0;
  });
}

export function calcularJCPDevido(proventos, ano) {
  const jcps = calcularJCP(proventos, ano);
  let totalBruto = 0;
  for (const j of jcps) {
    totalBruto += j.jcp || j.rendimento || 0;
  }
  const ir = totalBruto * (ALIQUOTA_JCP / 100);
  return { totalBruto, ir, aliquota: ALIQUOTA_JCP };
}

export function agruparPorTicker(proventos) {
  const agrupado = {};
  for (const p of proventos) {
    const ticker = (p.ticker || '').toUpperCase();
    if (!ticker) continue;
    if (!agrupado[ticker]) agrupado[ticker] = { dividendos: 0, jcp: 0, rendimento: 0, reembolso: 0, total: 0 };
    agrupado[ticker].dividendos += p.dividendos || 0;
    agrupado[ticker].jcp += p.jcp || 0;
    agrupado[ticker].rendimento += p.rendimento || 0;
    agrupado[ticker].reembolso += p.reembolso || 0;
    agrupado[ticker].total += (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0);
  }
  return agrupado;
}

export function agruparPorInstituicao(proventos) {
  const agrupado = {};
  for (const p of proventos) {
    const inst = (p.corretora || p.instituicao || 'Desconhecida').toUpperCase();
    if (!agrupado[inst]) agrupado[inst] = { dividendos: 0, jcp: 0, rendimento: 0, reembolso: 0, total: 0 };
    agrupado[inst].dividendos += p.dividendos || 0;
    agrupado[inst].jcp += p.jcp || 0;
    agrupado[inst].rendimento += p.rendimento || 0;
    agrupado[inst].reembolso += p.reembolso || 0;
    agrupado[inst].total += (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0);
  }
  return agrupado;
}

export function calcularOperacoesBolsa(transacoes, ano) {
  const opsAno = transacoes.filter((t) => {
    return getYearFromDate(t.date || t.data) === ano;
  });
  const porMes = {};
  for (let m = 1; m <= 12; m++) {
    porMes[m] = { compras: 0, vendas: 0, investidoCompra: 0, investidoVenda: 0, quantidade: 0 };
  }
  for (const t of opsAno) {
    const m = getMonthFromDate(t.date || t.data);
    const qtd = t.quantidade || t.qtd || 0;
    const valor = t.investido || (t.valorUnitario || t.price || 0) * qtd + (t.taxas || 0);
    if (getOperacao(t) === 'C') {
      porMes[m].compras += 1;
      porMes[m].investidoCompra += valor;
      porMes[m].quantidade += qtd;
    } else if (getOperacao(t) === 'V') {
      porMes[m].vendas += 1;
      porMes[m].investidoVenda += valor;
    }
  }
  return porMes;
}

export function calcularRendaFixa(rfManual, ativos) {
  if (!rfManual || typeof rfManual !== 'object') return [];
  const resultado = [];
  for (const [ticker, valor] of Object.entries(rfManual)) {
    const ativo = ativos?.find((a) => a.ticker?.toUpperCase() === ticker.toUpperCase());
    resultado.push({
      ticker,
      nome: ativo?.nome || ticker,
      valor,
      tipo: ativo?.tipo || 'Renda Fixa',
      cnpj: ativo?.cnpj || '',
    });
  }
  return resultado;
}

export function verificarInconsistencias(transacoes, proventos) {
  const alertas = [];
  const tickersComprados = new Set(transacoes.filter((t) => getOperacao(t) === 'C').map((t) => (t.ticker || '').toUpperCase()));
  const tickersVendidos = new Set(transacoes.filter((t) => getOperacao(t) === 'V').map((t) => (t.ticker || '').toUpperCase()));
  for (const ticker of tickersVendidos) {
    if (!tickersComprados.has(ticker)) {
      alertas.push({ tipo: 'warning', mensagem: `Venda de ${ticker} sem compra registrada` });
    }
  }
  for (const p of proventos) {
    if (!p.date && !p.data) {
      alertas.push({ tipo: 'error', mensagem: `Provento ${p.ticker || 'desconhecido'} sem data` });
    }
    if (!p.ticker) {
      alertas.push({ tipo: 'error', mensagem: `Provento sem ticker: ${p.date || p.data}` });
    }
  }
  return alertas;
}

export function calcularProgressoChecklist(transacoes, proventos, rfManual, ativos) {
  const progresso = {};
  progresso.bens = transacoes.length > 0;
  progresso.operacoes = transacoes.some((t) => getOperacao(t) === 'V');
  progresso.renda_fixa = rfManual && Object.keys(rfManual).length > 0;
  progresso.fundos = ativos?.some((a) => normalizeTipo(a.tipo) === 'Fundo') || false;
  progresso.imoveis = ativos?.some((a) => normalizeTipo(a.tipo) === 'Imóvel') || false;
  progresso.cripto = ativos?.some((a) => normalizeTipo(a.tipo) === 'Cripto') || false;
  progresso.exterior = ativos?.some((a) => normalizeTipo(a.tipo) === 'Internacional') || false;
  progresso.proventos = proventos.length > 0;
  progresso.bens_direitos = transacoes.length > 0;
  progresso.rendimentos_isentos = proventos.some((p) => p.tipo === 'Dividendo' || p.tipo === 'dividendo');
  progresso.darf_paga = true;
  progresso.informes_recebidos = false;
  return progresso;
}

export function calcularResumoAnual(transacoes, proventos, rfManual, ano) {
  const vendasAno = transacoes.filter((t) => {
    if (getOperacao(t) !== 'V') return false;
    return getYearFromDate(t.date || t.data) === ano;
  });
  const comprasAno = transacoes.filter((t) => {
    if (getOperacao(t) !== 'C') return false;
    return getYearFromDate(t.date || t.data) === ano;
  });
  let investidoCompras = 0;
  for (const c of comprasAno) {
    investidoCompras += c.investido || (c.valorUnitario || c.price || 0) * (c.quantidade || c.qtd || 0) + (c.taxas || 0);
  }
  let recebidoVendas = 0;
  for (const v of vendasAno) {
    recebidoVendas += v.investido || (v.valorUnitario || v.price || 0) * (v.quantidade || v.qtd || 0) + (v.taxas || 0);
  }
  const proventosAno = proventos.filter((p) => getYearFromDate(p.date || p.data) === ano);
  let totalDividendos = 0;
  let totalJCP = 0;
  let totalRendimentos = 0;
  for (const p of proventosAno) {
    totalDividendos += p.dividendos || 0;
    totalJCP += p.jcp || 0;
    totalRendimentos += p.rendimento || 0;
  }
  const jcpDevido = calcularJCPDevido(proventos, ano);
  const ganhoCapital = calcularGanhoCapitalAnual(transacoes, ano);
  const totalPatrimonio = rfManual && typeof rfManual === 'object' ? Object.values(rfManual).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0) : 0;
  return {
    investidoCompras,
    recebidoVendas,
    totalDividendos,
    totalJCP,
    totalRendimentos,
    irDevidoJCP: jcpDevido.ir,
    ganhoCapital: ganhoCapital.totalLucro,
    totalPatrimonioRendaFixa: totalPatrimonio,
  };
}

export function calcularDARFGanhoCapital(transacoes, ano) {
  const ganho = calcularGanhoCapitalAnual(transacoes, ano);
  if (ganho.totalLucro <= 0) return null;
  const aliquota = calcularAliquotaGanhoCapital(ganho.totalLucro);
  const imposto = ganho.totalLucro * (aliquota / 100);
  return {
    lucro: ganho.totalLucro,
    aliquota,
    imposto,
    codigoReceita: CODIGO_RECEITA_DARF_ACOES,
    referencia: `Ganho de capital ${ano}`,
    dataPagamento: null,
  };
}

export function calcularDARFDayTrade(transacoes, ano) {
  const opsDayTrade = transacoes.filter((t) => {
    if (getOperacao(t) !== 'V') return false;
    return getYearFromDate(t.date || t.data) === ano && (t.tipoOperacao === 'day_trade' || t.tipoOperacao === 'Day Trade');
  });
  if (opsDayTrade.length === 0) return null;
  let lucroTotal = 0;
  for (const v of opsDayTrade) {
    const ticker = (v.ticker || '').toUpperCase();
    const resultado = calcularLucroPrejuizo(transacoes.filter((t) => (t.ticker || '').toUpperCase() === ticker), ticker);
    lucroTotal += resultado.lucro;
  }
  if (lucroTotal <= 0) return null;
  const imposto = lucroTotal * (ALIQUOTA_DAY_TRADE / 100);
  return {
    lucro: lucroTotal,
    aliquota: ALIQUOTA_DAY_TRADE,
    imposto,
    codigoReceita: CODIGO_RECEITA_DARF_ACOES,
    referencia: `Day Trade ${ano}`,
    dataPagamento: null,
  };
}

export function calcularDARFRendaFixa(rfManual, ano) {
  if (!rfManual || typeof rfManual !== 'object') return null;
  let totalIR = 0;
  let temRendaFixa = false;
  for (const [ticker, valor] of Object.entries(rfManual)) {
    if (typeof valor !== 'number' || valor <= 0) continue;
    temRendaFixa = true;
  }
  if (!temRendaFixa) return null;
  return {
    lucro: 0,
    aliquota: 0,
    imposto: totalIR,
    codigoReceita: '1708',
    referencia: `Renda Fixa ${ano} (estimativa - informe necessário)`,
    dataPagamento: null,
    observacao: 'Cálculo aproximado. O IR sobre renda fixa é retido na fonte. Verifique o informe de rendimentos.',
  };
}

export function calcularDARFs(transacoes, proventos, rfManual, ano) {
  const darfs = [];
  const ganhoCapital = calcularDARFGanhoCapital(transacoes, ano);
  if (ganhoCapital) darfs.push(ganhoCapital);
  const dayTrade = calcularDARFDayTrade(transacoes, ano);
  if (dayTrade) darfs.push(dayTrade);
  const rendaFixa = calcularDARFRendaFixa(rfManual, ano);
  if (rendaFixa) darfs.push(rendaFixa);
  return darfs;
}

export function calcularBeneficiosIRRF(transacoes, proventos, rfManual, ano) {
  const dividendos = calcularRendimentosIsentos(proventos, ano);
  const fiis = calcularRendimentosFIIIsentos(proventos, ano);
  const jcp = calcularJCP(proventos, ano);
  const totalDividendos = dividendos.reduce((s, p) => s + (p.dividendos || 0), 0);
  const totalFII = fiis.reduce((s, p) => s + (p.dividendos || 0) + (p.reembolso || 0), 0);
  const totalJCP = jcp.reduce((s, p) => s + (p.jcp || 0), 0);
  return {
    dividendos: { itens: dividendos, total: totalDividendos, codigo: CODIGOS_RENDIMENTOS.DIVIDENDOS },
    fiis: { itens: fiis, total: totalFII, codigo: CODIGOS_RENDIMENTOS.OUTROS },
    jcp: { itens: jcp, total: totalJCP, codigo: CODIGOS_RENDIMENTOS.JCP, irRetido: totalJCP * (ALIQUOTA_JCP / 100) },
  };
}

export function mapearParaDirpf(transacoes, ativos) {
  const porTicker = {};
  for (const t of transacoes) {
    const ticker = (t.ticker || '').toUpperCase();
    if (!ticker) continue;
    if (!porTicker[ticker]) porTicker[ticker] = { ticker, operacoes: [], investido: 0, quantidade: 0 };
    porTicker[ticker].operacoes.push(t);
    const qtd = t.quantidade || t.qtd || 0;
    const investido = t.investido || (t.valorUnitario || t.price || 0) * qtd + (t.taxas || 0);
    if (getOperacao(t) === 'C') {
      porTicker[ticker].investido += investido;
      porTicker[ticker].quantidade += qtd;
    } else {
      porTicker[ticker].investido -= investido;
      porTicker[ticker].quantidade -= qtd;
    }
  }
  return Object.values(porTicker).map((item) => {
    const ativo = ativos?.find((a) => (a.ticker || '').toUpperCase() === item.ticker);
    const tipo = normalizeTipo(ativo?.tipo || 'Ação');
    return {
      ticker: item.ticker,
      nome: ativo?.nome || item.ticker,
      tipo,
      grupo: GRUPO_TIPO_DIRPF[tipo] || GRUPO_TIPO_DIRPF['Ação'],
      codigo: CODIGO_TIPO_DIRPF[tipo] || CODIGO_TIPO_DIRPF['Ação'],
      localizacao: LOCALIZACAO_BENS.BRASIL,
      quantidade: item.quantidade,
      investido: item.investido,
      discriminacao: `${item.ticker} - ${ativo?.nome || item.ticker} (${tipo})`,
    };
  });
}
