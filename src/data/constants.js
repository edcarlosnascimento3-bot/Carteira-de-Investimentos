export const C_ACAO = '#FF3333';
export const C_FII = '#00CC66';
export const C_RF = '#C8B800';
export const C_VERDE = '#4CAF50';
export const C_VERDE_ESCURO = '#2E7D32';
export const C_AZUL = '#4285F4';
export const C_VERMELHO_ESCURO = '#990000';

export const typeColors = {
  'Ação': C_ACAO,
  'FII': C_FII,
  'Renda Fixa': C_RF,
  'Dólar': '#008844',
  'Criptoativo': '#333333',
  'Ouro': '#FFD700',
  'Euro': '#9933FF',
};

export const CHART_COLORS = [C_RF,'#CC8800','#0099CC','#CC44CC','#00BB66','#FF5555','#3399FF','#FF8800','#66CC00','#9933FF','#FFD700','#00CCCC'];
export const INTL_COLORS = ['#3E1F00','#90EE90','#4A2800','#77DD77','#2D1B00','#A5D6A7','#5C3317','#81C784'];

export const corretoraPorTicker = {
  BBAS3: 'C6', TRXF11: 'C6', GARE11: 'C6', LTBX11: 'C6', XPML11: 'C6',
  SOFISA: 'SOFISA',
  RBOP11: 'XP', FGAA11: 'XP',
  MXRF11: 'XP', VSLH11: 'XP',
  VGHF11: 'XP', VGIP11: 'XP',
  KNCR11: 'XP',
  TAEE3: 'RICO', ITSA4: 'RICO', PETR4: 'RICO', VALE3: 'RICO',
  AMER3: 'RICO', BBDC3: 'RICO', BBDC4: 'RICO', BBSE3: 'RICO',
  BEES3: 'RICO', BRAP3: 'RICO', CMIN3: 'RICO', COCA34: 'RICO',
  ELET3: 'RICO', GOAU3: 'RICO', GOAU4: 'RICO', OIBR3: 'RICO',
  SANB3: 'RICO', SAPR3: 'RICO', TAEE11: 'RICO',
  DÓLAR: 'WISE', EURO: 'WISE',
};

export const INDEX_HISTORY = {
  IBOVESPA: { cor: '#3399FF', dados: { 2018: 15.0, 2019: 31.6, 2020: 2.9, 2021: -11.9, 2022: 4.7, 2023: 22.3, 2024: -10.4, 2025: 8.0 } },
  IFIX: { cor: C_FII, dados: { 2018: 8.2, 2019: 15.7, 2020: 0.8, 2021: -4.9, 2022: 8.2, 2023: 18.5, 2024: 12.0, 2025: 5.0 } },
  IPCA: { cor: C_RF, dados: { 2018: 3.75, 2019: 4.31, 2020: 4.52, 2021: 10.06, 2022: 5.79, 2023: 4.62, 2024: 4.83, 2025: 5.0 } },
  CDI: { cor: '#9933FF', dados: { 2018: 6.42, 2019: 5.96, 2020: 2.76, 2021: 4.43, 2022: 12.38, 2023: 13.04, 2024: 10.80, 2025: 8.0 } },
};