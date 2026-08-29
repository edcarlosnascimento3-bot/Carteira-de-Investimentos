import { describe, it, expect } from 'vitest';
import {
  parseDateBR,
  getYearFromDate,
  getMonthFromDate,
  getOperacao,
  calcularPrecoMedio,
  calcularSaldoPorTicker,
  calcularLucroPrejuizo,
  calcularGanhoCapitalAnual,
  verificarIsencaoVendasMensais,
  calcularAliquotaRF,
  calcularAliquotaGanhoCapital,
  calcularAlíquotaEfetiva,
  calcularRendimentosIsentos,
  calcularRendimentosFIIIsentos,
  calcularJCP,
  calcularRendimentosTributados,
  calcularJCPDevido,
  agruparPorTicker,
  agruparPorInstituicao,
  calcularOperacoesBolsa,
  calcularRendaFixa,
  verificarInconsistencias,
  calcularProgressoChecklist,
  calcularResumoAnual,
  calcularDARFGanhoCapital,
  calcularDARFDayTrade,
  calcularDARFRendaFixa,
  calcularDARFs,
  calcularBeneficiosIRRF,
  mapearParaDirpf,
} from './irrfCalculations';
import { ALIQUOTA_JCP } from './irrfConstants';

describe('parseDateBR', () => {
  it('retorna null para nulo/vazio', () => {
    expect(parseDateBR(null)).toBeNull();
    expect(parseDateBR(undefined)).toBeNull();
    expect(parseDateBR('')).toBeNull();
  });

  it('aceita instância de Date', () => {
    const d = new Date(2024, 0, 15);
    expect(parseDateBR(d)).toBe(d);
  });

  it('retorna null para Date inválida', () => {
    expect(parseDateBR(new Date('invalid'))).toBeNull();
  });

  it('aceita formato ISO', () => {
    const d = parseDateBR('2024-05-10');
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(4);
    expect(d.getUTCDate()).toBe(10);
  });

  it('aceita formato DD/MM/AAAA', () => {
    const d = parseDateBR('10/05/2024');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(4);
    expect(d.getDate()).toBe(10);
  });

  it('aceita dia/mês com 1 dígito', () => {
    const d = parseDateBR('5/3/2024');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(5);
  });

  it('retorna null para string não numérica', () => {
    expect(parseDateBR('abc')).toBeNull();
    expect(parseDateBR('2024-13-40')).toBeNull();
    expect(parseDateBR('123')).toBeNull();
  });
});

describe('getYearFromDate e getMonthFromDate', () => {
  it('extrai ano de formato BR', () => {
    expect(getYearFromDate('10/05/2024')).toBe(2024);
  });

  it('extrai ano de formato ISO', () => {
    expect(getYearFromDate('2024-05-10')).toBe(2024);
  });

  it('extrai mês (1-12) de formato BR', () => {
    expect(getMonthFromDate('10/05/2024')).toBe(5);
    expect(getMonthFromDate('10/12/2024')).toBe(12);
  });

  it('retorna null para datas inválidas', () => {
    expect(getYearFromDate('')).toBeNull();
    expect(getMonthFromDate('abc')).toBeNull();
  });
});

describe('getOperacao', () => {
  it('normaliza Compra/compra para C', () => {
    expect(getOperacao({ operacao: 'Compra' })).toBe('C');
    expect(getOperacao({ operacao: 'compra' })).toBe('C');
    expect(getOperacao({ operation: 'Compra' })).toBe('C');
  });

  it('normaliza Venda/venda para V', () => {
    expect(getOperacao({ operacao: 'Venda' })).toBe('V');
    expect(getOperacao({ operation: 'venda' })).toBe('V');
    expect(getOperacao({ operation: 'sell' })).toBe('V');
  });

  it('trata bonificação como compra', () => {
    expect(getOperacao({ operacao: 'bonificação' })).toBe('C');
    expect(getOperacao({ operacao: 'Bonificação' })).toBe('C');
  });

  it('aceita C/V diretos', () => {
    expect(getOperacao({ operacao: 'C' })).toBe('C');
    expect(getOperacao({ operation: 'V' })).toBe('V');
  });

  it('retorna a string em maiúscula para valores desconhecidos', () => {
    expect(getOperacao({ operacao: 'Dividendo' })).toBe('DIVIDENDO');
  });

  it('retorna string vazia se não houver campo', () => {
    expect(getOperacao({})).toBe('');
  });
});

describe('calcularPrecoMedio', () => {
  it('retorna 0 para lista vazia', () => {
    expect(calcularPrecoMedio([])).toBe(0);
    expect(calcularPrecoMedio(null)).toBe(0);
  });

  it('calcula preço médio ponderado por compras', () => {
    const transacoes = [
      { operacao: 'Compra', quantidade: 10, valorUnitario: 20 },
      { operacao: 'Compra', quantidade: 10, valorUnitario: 30 },
    ];
    const precoMedio = calcularPrecoMedio(transacoes);
    expect(precoMedio).toBe(25);
  });

  it('ignora vendas no cálculo de preço médio', () => {
    const transacoes = [
      { operacao: 'Compra', quantidade: 10, valorUnitario: 20 },
      { operacao: 'Venda', quantidade: 5, valorUnitario: 50 },
    ];
    expect(calcularPrecoMedio(transacoes)).toBe(20);
  });

  it('não divide por zero quando não há compras', () => {
    const transacoes = [{ operacao: 'Venda', quantidade: 5, valorUnitario: 50 }];
    expect(calcularPrecoMedio(transacoes)).toBe(0);
  });

  it('usa campo investido quando presente, somando taxas', () => {
    const transacoes = [
      { operacao: 'Compra', quantidade: 10, valorUnitario: 20, taxas: 5 },
    ];
    expect(calcularPrecoMedio(transacoes)).toBe(20.5);
  });
});

describe('calcularSaldoPorTicker', () => {
  it('agrega saldo por ticker (compras - vendas)', () => {
    const transacoes = [
      { ticker: 'PETR4', operacao: 'Compra', quantidade: 100, valorUnitario: 30 },
      { ticker: 'PETR4', operacao: 'Venda', quantidade: 40, valorUnitario: 35 },
      { ticker: 'VALE3', operacao: 'Compra', quantidade: 50, valorUnitario: 60 },
    ];
    const saldo = calcularSaldoPorTicker(transacoes);
    expect(saldo.PETR4.total).toBe(60);
    expect(saldo.PETR4.compras).toBe(100);
    expect(saldo.PETR4.vendas).toBe(40);
    expect(saldo.VALE3.total).toBe(50);
  });

  it('ignora transações sem ticker', () => {
    expect(calcularSaldoPorTicker([{ operacao: 'Compra', quantidade: 10 }])).toEqual({});
  });

  it('normaliza o ticker para maiúsculas', () => {
    const saldo = calcularSaldoPorTicker([{ ticker: 'petr4', operacao: 'Compra', quantidade: 10 }]);
    expect(saldo.PETR4.total).toBe(10);
  });
});

describe('calcularLucroPrejuizo', () => {
  it('calcula preço médio e lucro nas vendas', () => {
    const transacoes = [
      { ticker: 'PETR4', operacao: 'Compra', quantidade: 10, valorUnitario: 20 },
      { ticker: 'PETR4', operacao: 'Compra', quantidade: 10, valorUnitario: 30 },
      { ticker: 'PETR4', operacao: 'Venda', quantidade: 5, valorUnitario: 50 },
    ];
    const r = calcularLucroPrejuizo(transacoes, 'PETR4');
    // custo médio 25; custo venda 5*25=125; lucro = 250-125 = 125
    expect(r.custoMedio).toBe(25);
    expect(r.lucro).toBe(125);
    expect(r.totalQtd).toBe(20);
    expect(r.investido).toBe(500);
  });

  it('retorna lucro 0 se não há vendas', () => {
    const transacoes = [{ ticker: 'PETR4', operacao: 'Compra', quantidade: 10, valorUnitario: 20 }];
    const r = calcularLucroPrejuizo(transacoes, 'PETR4');
    expect(r.lucro).toBe(0);
    expect(r.custoMedio).toBe(20);
  });

  it('ignora outros tickers', () => {
    const transacoes = [
      { ticker: 'PETR4', operacao: 'Compra', quantidade: 10, valorUnitario: 20 },
      { ticker: 'VALE3', operacao: 'Venda', quantidade: 5, valorUnitario: 100 },
    ];
    const r = calcularLucroPrejuizo(transacoes, 'PETR4');
    expect(r.lucro).toBe(0);
  });
});

describe('calcularGanhoCapitalAnual', () => {
  const base = [
    { ticker: 'PETR4', operacao: 'Compra', quantidade: 100, valorUnitario: 20, data: '10/01/2024' },
    { ticker: 'PETR4', operacao: 'Venda', quantidade: 50, valorUnitario: 30, data: '15/03/2024' },
    { ticker: 'VALE3', operacao: 'Compra', quantidade: 100, valorUnitario: 60, data: '10/01/2024' },
    { ticker: 'VALE3', operacao: 'Venda', quantidade: 100, valorUnitario: 70, data: '20/06/2024' },
  ];

  it('soma lucro das vendas do ano', () => {
    const r = calcularGanhoCapitalAnual(base, 2024);
    // PETR4: preço médio 20, custo 50*20=1000, venda 50*30=1500 → lucro 500
    // VALE3: preço médio 60, custo 100*60=6000, venda 100*70=7000 → lucro 1000
    expect(r.totalLucro).toBe(1500);
    expect(r.vendasCount).toBe(2);
    expect(r.totalVendas).toBe(8500);
  });

  it('filtra vendas de outros anos', () => {
    const r = calcularGanhoCapitalAnual(base, 2023);
    expect(r.totalLucro).toBe(0);
    expect(r.vendasCount).toBe(0);
  });

  it('agrupa lucro por mês', () => {
    const r = calcularGanhoCapitalAnual(base, 2024);
    expect(r.lucroMesAMes[3]).toBeDefined();
    expect(r.lucroMesAMes[6]).toBeDefined();
    expect(r.lucroMesAMes[3].lucro).toBe(500);
    expect(r.lucroMesAMes[6].lucro).toBe(1000);
  });
});

describe('verificarIsencaoVendasMensais', () => {
  it('marca isento se total mensal <= R$ 20.000', () => {
    const transacoes = [
      { ticker: 'PETR4', operacao: 'Venda', quantidade: 10, valorUnitario: 1000, data: '15/03/2024' },
    ];
    const r = verificarIsencaoVendasMensais(transacoes, 2024);
    expect(r[3].total).toBe(10000);
    expect(r[3].isento).toBe(true);
    expect(r[3].excedente).toBe(0);
  });

  it('marca excedente se total mensal > R$ 20.000', () => {
    const transacoes = [
      { ticker: 'PETR4', operacao: 'Venda', quantidade: 30, valorUnitario: 1000, data: '15/03/2024' },
    ];
    const r = verificarIsencaoVendasMensais(transacoes, 2024);
    expect(r[3].total).toBe(30000);
    expect(r[3].isento).toBe(false);
    expect(r[3].excedente).toBe(10000);
  });

  it('retorna todos os 12 meses', () => {
    const r = verificarIsencaoVendasMensais([], 2024);
    expect(Object.keys(r)).toHaveLength(12);
  });
});

describe('calcularAliquotaRF', () => {
  it('aplica 22.5% até 180 dias', () => {
    expect(calcularAliquotaRF(1)).toBe(22.5);
    expect(calcularAliquotaRF(180)).toBe(22.5);
  });

  it('aplica 20% até 360 dias', () => {
    expect(calcularAliquotaRF(181)).toBe(20);
    expect(calcularAliquotaRF(360)).toBe(20);
  });

  it('aplica 17.5% até 720 dias', () => {
    expect(calcularAliquotaRF(361)).toBe(17.5);
    expect(calcularAliquotaRF(720)).toBe(17.5);
  });

  it('aplica 15% acima de 720 dias', () => {
    expect(calcularAliquotaRF(721)).toBe(15);
    expect(calcularAliquotaRF(9999)).toBe(15);
  });
});

describe('calcularAliquotaGanhoCapital', () => {
  it('aplica 15% até 5M', () => {
    expect(calcularAliquotaGanhoCapital(1000)).toBe(15);
    expect(calcularAliquotaGanhoCapital(5000000)).toBe(15);
  });

  it('aplica 17.5% até 10M', () => {
    expect(calcularAliquotaGanhoCapital(5000001)).toBe(17.5);
  });

  it('aplica 20% até 30M', () => {
    expect(calcularAliquotaGanhoCapital(10000001)).toBe(20);
  });

  it('aplica 22.5% acima de 30M', () => {
    expect(calcularAliquotaGanhoCapital(30000001)).toBe(22.5);
  });
});

describe('calcularAlíquotaEfetiva', () => {
  it('retorna 0 para rendimento nulo/zero', () => {
    expect(calcularAlíquotaEfetiva(0, 10)).toBe(0);
    expect(calcularAlíquotaEfetiva(null, 10)).toBe(0);
  });

  it('calcula ir / rendimento * 100', () => {
    expect(calcularAlíquotaEfetiva(1000, 175)).toBe(17.5);
  });
});

describe('Filtros de rendimentos por ano e tipo', () => {
  const proventos = [
    { ticker: 'PETR4', tipo: 'Dividendo', dividendos: 100, data: '10/05/2024' },
    { ticker: 'PETR4', tipo: 'dividendo', dividendos: 200, data: '10/06/2024' },
    { ticker: 'PETR4', tipo: 'JCP', jcp: 150, data: '10/07/2024' },
    { ticker: 'HGLG11', tipo: 'Rendimento FII', dividendos: 300, data: '10/08/2024' },
    { ticker: 'CDB', tipo: 'Rendimento', rendimento: 50, data: '10/09/2024' },
    { ticker: 'PETR4', tipo: 'Dividendo', dividendos: 1000, data: '10/05/2023' },
  ];

  it('calcularRendimentosIsentos filtra dividendos do ano', () => {
    const r = calcularRendimentosIsentos(proventos, 2024);
    expect(r).toHaveLength(2);
  });

  it('calcularRendimentosIsentos não filtra outros anos', () => {
    const r = calcularRendimentosIsentos(proventos, 2023);
    expect(r).toHaveLength(1);
  });

  it('calcularRendimentosFIIIsentos filtra rendimentos FII com dividendos', () => {
    const r = calcularRendimentosFIIIsentos(proventos, 2024);
    expect(r).toHaveLength(1);
    expect(r[0].ticker).toBe('HGLG11');
  });

  it('calcularJCP filtra JCP do ano', () => {
    const r = calcularJCP(proventos, 2024);
    expect(r).toHaveLength(1);
    expect(r[0].ticker).toBe('PETR4');
  });

  it('calcularRendimentosTributados filtra tipo Rendimento com valor', () => {
    const r = calcularRendimentosTributados(proventos, 2024);
    expect(r).toHaveLength(1);
    expect(r[0].ticker).toBe('CDB');
  });
});

describe('calcularJCPDevido', () => {
  it('calcula IR sobre JCP usando ALIQUOTA_JCP parametrizada', () => {
    const proventos = [
      { ticker: 'PETR4', tipo: 'JCP', jcp: 1000, data: '10/07/2024' },
      { ticker: 'PETR4', tipo: 'JCP', jcp: 500, data: '10/08/2024' },
    ];
    const r = calcularJCPDevido(proventos, 2024);
    expect(r.totalBruto).toBe(1500);
    expect(r.aliquota).toBe(ALIQUOTA_JCP);
    expect(r.ir).toBeCloseTo(1500 * (ALIQUOTA_JCP / 100), 6);
  });

  it('retorna IR 0 quando não há JCP', () => {
    const r = calcularJCPDevido([], 2024);
    expect(r.totalBruto).toBe(0);
    expect(r.ir).toBe(0);
  });
});

describe('agruparPorTicker e agruparPorInstituicao', () => {
  const proventos = [
    { ticker: 'PETR4', corretora: 'XP', dividendos: 100, jcp: 50 },
    { ticker: 'petr4', corretora: 'XP', dividendos: 100 },
    { ticker: 'VALE3', corretora: 'Inter', jcp: 200 },
  ];

  it('agrupa por ticker normalizado', () => {
    const r = agruparPorTicker(proventos);
    expect(r.PETR4.dividendos).toBe(200);
    expect(r.PETR4.jcp).toBe(50);
    expect(r.PETR4.total).toBe(250);
    expect(r.VALE3.total).toBe(200);
  });

  it('agrupa por instituição normalizada', () => {
    const r = agruparPorInstituicao(proventos);
    expect(r.XP.total).toBe(250);
    expect(r.INTER.total).toBe(200);
  });

  it('usa "Desconhecida" quando não há corretora', () => {
    const r = agruparPorInstituicao([{ ticker: 'PETR4', dividendos: 10 }]);
    expect(r.DESCONHECIDA.total).toBe(10);
  });
});

describe('calcularOperacoesBolsa', () => {
  const transacoes = [
    { ticker: 'PETR4', operacao: 'Compra', quantidade: 100, valorUnitario: 30, data: '10/02/2024' },
    { ticker: 'PETR4', operacao: 'Venda', quantidade: 40, valorUnitario: 35, data: '15/02/2024' },
  ];

  it('agrega compras e vendas por mês', () => {
    const r = calcularOperacoesBolsa(transacoes, 2024);
    expect(r[2].compras).toBe(1);
    expect(r[2].vendas).toBe(1);
    expect(r[2].investidoCompra).toBe(3000);
    expect(r[2].investidoVenda).toBe(1400);
    expect(r[2].quantidade).toBe(100);
  });

  it('inicializa os 12 meses', () => {
    const r = calcularOperacoesBolsa([], 2024);
    expect(Object.keys(r)).toHaveLength(12);
    expect(r[1].compras).toBe(0);
  });
});

describe('calcularRendaFixa', () => {
  const rf = { CDB01: 1000, LCI02: 2000 };
  const ativos = [{ ticker: 'CDB01', nome: 'CDB Banco X', tipo: 'Renda Fixa' }];

  it('gera lista com ativo enriquecido', () => {
    const r = calcularRendaFixa(rf, ativos);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ ticker: 'CDB01', nome: 'CDB Banco X', valor: 1000, tipo: 'Renda Fixa' });
  });

  it('usa fallback de nome e tipo sem ativo', () => {
    const r = calcularRendaFixa(rf, ativos);
    expect(r[1]).toMatchObject({ ticker: 'LCI02', nome: 'LCI02', valor: 2000, tipo: 'Renda Fixa' });
  });

  it('retorna [] para entrada inválida', () => {
    expect(calcularRendaFixa(null, [])).toEqual([]);
    expect(calcularRendaFixa('abc', [])).toEqual([]);
  });
});

describe('verificarInconsistencias', () => {
  it('alerta venda sem compra registrada', () => {
    const transacoes = [{ ticker: 'XYZ4', operacao: 'Venda', quantidade: 10 }];
    const alertas = verificarInconsistencias(transacoes, []);
    expect(alertas.some((a) => a.tipo === 'warning' && a.mensagem.includes('XYZ4'))).toBe(true);
  });

  it('não alerta se há compra correspondente', () => {
    const transacoes = [
      { ticker: 'PETR4', operacao: 'Compra', quantidade: 10 },
      { ticker: 'PETR4', operacao: 'Venda', quantidade: 5 },
    ];
    expect(verificarInconsistencias(transacoes, [])).toEqual([]);
  });

  it('alerta provento sem data', () => {
    const alertas = verificarInconsistencias([], [{ ticker: 'PETR4', dividendos: 10 }]);
    expect(alertas.some((a) => a.tipo === 'error')).toBe(true);
  });

  it('alerta provento sem ticker', () => {
    const alertas = verificarInconsistencias([], [{ data: '10/05/2024', dividendos: 10 }]);
    expect(alertas.some((a) => a.tipo === 'error')).toBe(true);
  });
});

describe('calcularProgressoChecklist', () => {
  const base = {
    transacoes: [],
    proventos: [],
    rfManual: {},
    ativos: [],
  };

  it('marca bens quando há transações', () => {
    const r = calcularProgressoChecklist(
      [{ ticker: 'PETR4', operacao: 'Compra', quantidade: 1 }],
      [], {}, []
    );
    expect(r.bens).toBe(true);
    expect(r.operacoes).toBe(false);
  });

  it('marca operações quando há venda', () => {
    const r = calcularProgressoChecklist(
      [{ ticker: 'PETR4', operacao: 'Venda', quantidade: 1 }],
      [], {}, []
    );
    expect(r.operacoes).toBe(true);
  });

  it('marca renda_fixa quando há rfManual', () => {
    const r = calcularProgressoChecklist([], [], { CDB: 1000 }, []);
    expect(r.renda_fixa).toBe(true);
  });

  it('marca proventos e rendimentos isentos', () => {
    const r = calcularProgressoChecklist(
      [], [{ tipo: 'Dividendo', dividendos: 10 }], {}, []
    );
    expect(r.proventos).toBe(true);
    expect(r.rendimentos_isentos).toBe(true);
  });

  it('marca informes_recebidos como false default', () => {
    const r = calcularProgressoChecklist(...Object.values(base));
    expect(r.informes_recebidos).toBe(false);
    expect(r.darf_paga).toBe(true);
  });
});

describe('calcularResumoAnual', () => {
  const transacoes = [
    { ticker: 'PETR4', operacao: 'Compra', quantidade: 10, valorUnitario: 100, data: '10/03/2024' },
    { ticker: 'PETR4', operacao: 'Venda', quantidade: 5, valorUnitario: 120, data: '15/06/2024' },
  ];
  const proventos = [
    { ticker: 'PETR4', tipo: 'Dividendo', dividendos: 100, data: '10/05/2024' },
    { ticker: 'PETR4', tipo: 'JCP', jcp: 50, data: '10/07/2024' },
  ];
  const rf = { CDB: 5000 };

  it('agrega compras, vendas e proventos do ano', () => {
    const r = calcularResumoAnual(transacoes, proventos, rf, 2024);
    expect(r.investidoCompras).toBe(1000);
    expect(r.recebidoVendas).toBe(600);
    expect(r.totalDividendos).toBe(100);
    expect(r.totalJCP).toBe(50);
    expect(r.totalPatrimonioRendaFixa).toBe(5000);
  });

  it('calcula irDevidoJCP a partir de ALIQUOTA_JCP', () => {
    const r = calcularResumoAnual(transacoes, proventos, rf, 2024);
    expect(r.irDevidoJCP).toBeCloseTo(50 * (ALIQUOTA_JCP / 100), 6);
  });

  it('ignora transações de outro ano', () => {
    const r = calcularResumoAnual(transacoes, proventos, rf, 2023);
    expect(r.investidoCompras).toBe(0);
    expect(r.recebidoVendas).toBe(0);
  });
});

describe('calcularDARFGanhoCapital', () => {
  const transacoes = [
    { ticker: 'PETR4', operacao: 'Compra', quantidade: 10, valorUnitario: 20, data: '10/01/2024' },
    { ticker: 'PETR4', operacao: 'Venda', quantidade: 10, valorUnitario: 50, data: '15/06/2024' },
  ];

  it('gera DARF com lucro e imposto correto', () => {
    const darf = calcularDARFGanhoCapital(transacoes, 2024);
    expect(darf.lucro).toBe(300); // 500 - 200
    expect(darf.aliquota).toBe(15);
    expect(darf.imposto).toBe(45);
    expect(darf.codigoReceita).toBe('1708');
    expect(darf.referencia).toBe('Ganho de capital 2024');
  });

  it('retorna null sem lucro', () => {
    const prejuizo = [
      { ticker: 'PETR4', operacao: 'Compra', quantidade: 10, valorUnitario: 50, data: '10/01/2024' },
      { ticker: 'PETR4', operacao: 'Venda', quantidade: 10, valorUnitario: 20, data: '15/06/2024' },
    ];
    expect(calcularDARFGanhoCapital(prejuizo, 2024)).toBeNull();
  });
});

describe('calcularDARFDayTrade', () => {
  const transacoes = [
    { ticker: 'PETR4', operacao: 'Compra', quantidade: 10, valorUnitario: 20, data: '10/01/2024' },
    { ticker: 'PETR4', operacao: 'Venda', quantidade: 10, valorUnitario: 50, data: '15/01/2024', tipoOperacao: 'day_trade' },
  ];

  it('aplica alíquota de day trade', () => {
    const darf = calcularDARFDayTrade(transacoes, 2024);
    expect(darf.aliquota).toBe(20);
    expect(darf.lucro).toBe(300);
    expect(darf.imposto).toBe(60);
  });

  it('retorna null sem operações day trade', () => {
    const normais = [{ ticker: 'PETR4', operacao: 'Venda', quantidade: 1, data: '15/01/2024' }];
    expect(calcularDARFDayTrade(normais, 2024)).toBeNull();
  });
});

describe('calcularDARFRendaFixa', () => {
  it('retorna estimativa quando há rfManual', () => {
    const darf = calcularDARFRendaFixa({ CDB: 1000 }, 2024);
    expect(darf).toBeTruthy();
    expect(darf.codigoReceita).toBe('1708');
    expect(darf.observacao).toContain('informe');
  });

  it('retorna null sem rfManual', () => {
    expect(calcularDARFRendaFixa(null, 2024)).toBeNull();
    expect(calcularDARFRendaFixa({}, 2024)).toBeNull();
  });
});

describe('calcularDARFs', () => {
  it('combina ganho capital e day trade', () => {
    const transacoes = [
      { ticker: 'PETR4', operacao: 'Compra', quantidade: 10, valorUnitario: 20, data: '10/01/2024' },
      { ticker: 'PETR4', operacao: 'Venda', quantidade: 10, valorUnitario: 50, data: '15/06/2024' },
    ];
    const darfs = calcularDARFs(transacoes, [], null, 2024);
    expect(darfs.length).toBeGreaterThanOrEqual(1);
    expect(darfs[0].referencia).toContain('2024');
  });
});

describe('calcularBeneficiosIRRF', () => {
  const proventos = [
    { ticker: 'PETR4', tipo: 'Dividendo', dividendos: 100, data: '10/05/2024' },
    { ticker: 'PETR4', tipo: 'JCP', jcp: 50, data: '10/07/2024' },
    { ticker: 'HGLG11', tipo: 'Rendimento FII', dividendos: 200, data: '10/08/2024' },
  ];

  it('separa dividendos, FII e JCP', () => {
    const b = calcularBeneficiosIRRF([], proventos, {}, 2024);
    expect(b.dividendos.total).toBe(100);
    expect(b.fiis.total).toBe(200);
    expect(b.jcp.total).toBe(50);
  });

  it('calcula irRetido de JCP usando ALIQUOTA_JCP', () => {
    const b = calcularBeneficiosIRRF([], proventos, {}, 2024);
    expect(b.jcp.irRetido).toBeCloseTo(50 * (ALIQUOTA_JCP / 100), 6);
  });

  it('usa códigos de rendimento corretos', () => {
    const b = calcularBeneficiosIRRF([], proventos, {}, 2024);
    expect(b.dividendos.codigo).toBe('09');
    expect(b.jcp.codigo).toBe('10');
  });
});

describe('mapearParaDirpf', () => {
  const transacoes = [
    { ticker: 'PETR4', operacao: 'Compra', quantidade: 100, valorUnitario: 30, data: '10/01/2024' },
    { ticker: 'PETR4', operacao: 'Venda', quantidade: 40, valorUnitario: 35, data: '15/03/2024' },
  ];

  it('agrupa por ticker e calcula quantidade/investido líquidos', () => {
    const r = mapearParaDirpf(transacoes, []);
    const petr = r.find((i) => i.ticker === 'PETR4');
    expect(petr.quantidade).toBe(60);
    expect(petr.investido).toBe(3000 - 1400);
  });

  it('preenche grupo/código/locação por tipo', () => {
    const r = mapearParaDirpf(transacoes, [{ ticker: 'PETR4', tipo: 'Ação', nome: 'Petrobras' }]);
    const petr = r.find((i) => i.ticker === 'PETR4');
    expect(petr.nome).toBe('Petrobras');
    expect(petr.grupo).toBe('03');
    expect(petr.codigo).toBe('03');
    expect(petr.localizacao).toBe('105');
    expect(petr.discriminacao).toContain('Petrobras');
  });

  it('usa tipo Ação como fallback', () => {
    const r = mapearParaDirpf([{ ticker: 'PETR4', operacao: 'Compra', quantidade: 10, valorUnitario: 1 }], []);
    expect(r[0].tipo).toBe('Ação');
  });
});