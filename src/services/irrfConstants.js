export const CODIGOS_BENS = {
  IMOVEL_URBANO: '01',
  IMOVEL_RURAL: '02',
  PARTICIPACOES_SOCIEDADE: '03',
  PARTICIPACOES_FII: '07',
  TITULOS_PUBLICOS: '08',
  ACOES: '01',
  OUTROS_BENS: '99',
};

export const GRUPOS_DIRPF = {
  IMOVEIS: '01',
  PARTICIPACOES_SOCIEDADE: '03',
  PARTICIPACOES_FII: '07',
  TITULOS_PUBLICOS: '08',
  VALORES_EM_CONTA: '12',
  OUTROS_BENS: '99',
};

export const CODIGOS_RENDIMENTOS = {
  DIVIDENDOS: '09',
  JCP: '10',
  RENDIMENTOS_RF: '06',
  OUTROS: '99',
};

export const GRUPO_TIPO_DIRPF = {
  'Ação': GRUPOS_DIRPF.PARTICIPACOES_SOCIEDADE,
  'FII': GRUPOS_DIRPF.PARTICIPACOES_FII,
  'Renda Fixa': GRUPOS_DIRPF.VALORES_EM_CONTA,
  'ETF': GRUPOS_DIRPF.OUTROS_BENS,
  'Cripto': GRUPOS_DIRPF.OUTROS_BENS,
  'Internacional': GRUPOS_DIRPF.OUTROS_BENS,
  'BDR': GRUPOS_DIRPF.PARTICIPACOES_SOCIEDADE,
};

export const CODIGO_TIPO_DIRPF = {
  'Ação': CODIGOS_BENS.PARTICIPACOES_SOCIEDADE,
  'FII': CODIGOS_BENS.PARTICIPACOES_FII,
  'Renda Fixa': CODIGOS_BENS.TITULOS_PUBLICOS,
  'ETF': CODIGOS_BENS.OUTROS_BENS,
  'Cripto': CODIGOS_BENS.OUTROS_BENS,
  'Internacional': CODIGOS_BENS.OUTROS_BENS,
  'BDR': CODIGOS_BENS.PARTICIPACOES_SOCIEDADE,
};

export const LOCALIZACAO_BENS = {
  BRASIL: '105',
  EXTERIOR: '223',
};

export const SITUACAO_BENS = {
  NAO_DISPONivel: 'N',
};

export const TABELA_PROGRESSIVA_RF = [
  { ate: 180, aliquota: 22.5 },
  { ate: 360, aliquota: 20.0 },
  { ate: 720, aliquota: 17.5 },
  { ate: Infinity, aliquota: 15.0 },
];

export const TABELA_PROGRESSIVA_GANHO_CAPITAL = [
  { ate: 5000000, aliquota: 15.0 },
  { ate: 10000000, aliquota: 17.5 },
  { ate: 30000000, aliquota: 20.0 },
  { ate: Infinity, aliquota: 22.5 },
];

export const ALIQUOTA_DAY_TRADE = 20.0;

// Alíquota de IRRF sobre JCP — parametrizada para facilitar revisão.
// ATENÇÃO: base legal para PF é 15% (Lei 9.249/95, art. 9º). O valor original
// era 17,5% fixo — corrigir requer confirmação do usuário (muda relatórios).
export const ALIQUOTA_JCP = 17.5;

export const ISENCAO_VENDA_ACOES_MENSAL = 20000;

export const CODIGOS_DARF = {
  DARF_NORMAL: '1708',
  DARF_PREJUDICIAL: '8045',
  DARF_SIMPLES: '3317',
};

export const CODIGO_RECEITA_DARF_ACOES = '1708';
export const CODIGO_RECEITA_DARF_DAY_TRADE = '1708';

export const PRAZO_DARF = {
  MES: 15,
  ANO: 15,
};

export const ANO_MINIMO = 2020;
export const ANO_MAXIMO = new Date().getFullYear();

export const CHECKLIST_ITENS = [
  { id: 'contas_bancarias', label: 'Contas bancárias e investimentos informados', categoria: 'bens' },
  { id: 'bolsa_de_valores', label: 'Operações em Bolsa (ações, FII, ETF, BDR)', categoria: 'operacoes' },
  { id: 'renda_fixa', label: 'Aplicações de Renda Fixa (CDB, LCI, LCA, LC, debêntures)', categoria: 'renda_fixa' },
  { id: 'fundos_investimento', label: 'Fundos de Investimento (multimercado, ações, etc.)', categoria: 'fundos' },
  { id: 'imoveis', label: 'Imóveis e direitos sobre imóveis', categoria: 'bens' },
  { id: 'criptoativos', label: 'Criptoativos', categoria: 'cripto' },
  { id: 'exterior', label: 'Investimentos no exterior', categoria: 'exterior' },
  { id: 'proventos', label: 'Proventos recebidos (dividendos, JCP, rendimentos)', categoria: 'proventos' },
  { id: 'bens_direitos', label: 'Bens e Direitos declarados', categoria: 'bens' },
  { id: 'rendimentos_isentos', label: 'Rendimentos isentos preenchidos', categoria: 'isentos' },
  { id: 'darf_paga', label: 'DARF de ganho de capital paga (se aplicável)', categoria: 'darf' },
  { id: 'informes_recebidos', label: 'Informes de rendimento recebidos e conferidos', categoria: 'informes' },
];
