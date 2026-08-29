import { describe, it, expect } from 'vitest';
import {
  CODIGOS_BENS,
  GRUPOS_DIRPF,
  CODIGOS_RENDIMENTOS,
  GRUPO_TIPO_DIRPF,
  CODIGO_TIPO_DIRPF,
  LOCALIZACAO_BENS,
  SITUACAO_BENS,
  TABELA_PROGRESSIVA_RF,
  TABELA_PROGRESSIVA_GANHO_CAPITAL,
  ALIQUOTA_DAY_TRADE,
  ALIQUOTA_JCP,
  ISENCAO_VENDA_ACOES_MENSAL,
  CODIGOS_DARF,
  CODIGO_RECEITA_DARF_ACOES,
  CODIGO_RECEITA_DARF_DAY_TRADE,
  PRAZO_DARF,
  ANO_MINIMO,
  ANO_MAXIMO,
  CHECKLIST_ITENS,
} from './irrfConstants';

describe('CODIGOS_DARF', () => {
  it('não possui chaves corrompidas com caracteres não-ASCII', () => {
    for (const key of Object.keys(CODIGOS_DARF)) {
      expect(key).toMatch(/^[\x00-\x7F]+$/);
    }
  });

  it('renomeou a chave corrompida DARF_PRE司法AL para DARF_PREJUDICIAL', () => {
    expect(CODIGOS_DARF.DARF_PREJUDICIAL).toBe('8045');
    expect(Object.keys(CODIGOS_DARF)).not.toContain('DARF_PRE司法AL');
  });

  it('mantém os códigos de receita esperados', () => {
    expect(CODIGOS_DARF.DARF_NORMAL).toBe('1708');
    expect(CODIGOS_DARF.DARF_SIMPLES).toBe('3317');
  });
});

describe('TABELA_PROGRESSIVA_RF', () => {
  it('tem 4 faixas com limites crescentes', () => {
    expect(TABELA_PROGRESSIVA_RF).toHaveLength(4);
    const limites = TABELA_PROGRESSIVA_RF.map((f) => f.ate);
    expect(limites[0]).toBeLessThan(limites[1]);
    expect(limites[1]).toBeLessThan(limites[2]);
    expect(limites[2]).toBeLessThan(limites[3]);
    expect(limites[3]).toBe(Infinity);
  });

  it('alíquotas são números entre 0 e 25', () => {
    for (const faixa of TABELA_PROGRESSIVA_RF) {
      expect(typeof faixa.aliquota).toBe('number');
      expect(faixa.aliquota).toBeGreaterThan(0);
      expect(faixa.aliquota).toBeLessThanOrEqual(25);
    }
  });
});

describe('TABELA_PROGRESSIVA_GANHO_CAPITAL', () => {
  it('tem 4 faixas com alíquotas de 15 a 22.5', () => {
    expect(TABELA_PROGRESSIVA_GANHO_CAPITAL).toHaveLength(4);
    const alquotas = TABELA_PROGRESSIVA_GANHO_CAPITAL.map((f) => f.aliquota);
    expect(alquotas).toEqual([15.0, 17.5, 20.0, 22.5]);
    expect(TABELA_PROGRESSIVA_GANHO_CAPITAL[3].ate).toBe(Infinity);
  });
});

describe('Alíquotas e limites', () => {
  it('day trade é 20%', () => {
    expect(ALIQUOTA_DAY_TRADE).toBe(20.0);
  });

  it('JCP está parametrizado em constante numérica', () => {
    expect(typeof ALIQUOTA_JCP).toBe('number');
    expect(ALIQUOTA_JCP).toBeGreaterThan(0);
  });

  it('isenção mensal de venda de ações é R$ 20.000', () => {
    expect(ISENCAO_VENDA_ACOES_MENSAL).toBe(20000);
  });
});

describe('Códigos B3 / DIRPF', () => {
  it('CODIGOS_BENS tem os códigos principais', () => {
    expect(CODIGOS_BENS.IMOVEL_URBANO).toBe('01');
    expect(CODIGOS_BENS.PARTICIPACOES_FII).toBe('07');
    expect(CODIGOS_BENS.TITULOS_PUBLICOS).toBe('08');
    expect(CODIGOS_BENS.OUTROS_BENS).toBe('99');
  });

  it('GRUPOS_DIRPF tem os grupos esperados', () => {
    expect(GRUPOS_DIRPF.IMOVEIS).toBe('01');
    expect(GRUPOS_DIRPF.VALORES_EM_CONTA).toBe('12');
    expect(GRUPOS_DIRPF.OUTROS_BENS).toBe('99');
  });

  it('CODIGOS_RENDIMENTOS tem dividendos, JCP e rendimentos RF', () => {
    expect(CODIGOS_RENDIMENTOS.DIVIDENDOS).toBe('09');
    expect(CODIGOS_RENDIMENTOS.JCP).toBe('10');
    expect(CODIGOS_RENDIMENTOS.RENDIMENTOS_RF).toBe('06');
  });

  it('GRUPO_TIPO_DIRPF cobre todos os tipos', () => {
    const tipos = ['Ação', 'FII', 'Renda Fixa', 'ETF', 'Cripto', 'Internacional', 'BDR'];
    for (const tipo of tipos) {
      expect(GRUPO_TIPO_DIRPF[tipo]).toBeDefined();
    }
    expect(GRUPO_TIPO_DIRPF['Ação']).toBe(GRUPOS_DIRPF.PARTICIPACOES_SOCIEDADE);
    expect(GRUPO_TIPO_DIRPF['FII']).toBe(GRUPOS_DIRPF.PARTICIPACOES_FII);
  });

  it('CODIGO_TIPO_DIRPF mapeia tipos para códigos de bens', () => {
    expect(CODIGO_TIPO_DIRPF['Ação']).toBe(CODIGOS_BENS.PARTICIPACOES_SOCIEDADE);
    expect(CODIGO_TIPO_DIRPF['Cripto']).toBe(CODIGOS_BENS.OUTROS_BENS);
  });

  it('LOCALIZACAO_BENS tem Brasil e exterior', () => {
    expect(LOCALIZACAO_BENS.BRASIL).toBe('105');
    expect(LOCALIZACAO_BENS.EXTERIOR).toBe('223');
  });

  it('SITUACAO_BENS não tem chaves corrompidas', () => {
    for (const key of Object.keys(SITUACAO_BENS)) {
      expect(key).toMatch(/^[\x00-\x7F]+$/);
    }
    expect(SITUACAO_BENS.NAO_DISPONivel).toBe('N');
  });
});

describe('Códigos de receita DARF e prazos', () => {
  it('código de receita para ações e day trade', () => {
    expect(CODIGO_RECEITA_DARF_ACOES).toBe('1708');
    expect(CODIGO_RECEITA_DARF_DAY_TRADE).toBe('1708');
  });

  it('prazo de pagamento é dia 15', () => {
    expect(PRAZO_DARF.MES).toBe(15);
    expect(PRAZO_DARF.ANO).toBe(15);
  });
});

describe('Anos e checklist', () => {
  it('ANO_MINIMO é 2020 e ANO_MAXIMO é o ano atual', () => {
    expect(ANO_MINIMO).toBe(2020);
    expect(ANO_MAXIMO).toBe(new Date().getFullYear());
  });

  it('CHECKLIST_ITENS tem 12 itens com id, label e categoria', () => {
    expect(CHECKLIST_ITENS).toHaveLength(12);
    for (const item of CHECKLIST_ITENS) {
      expect(item.id).toBeTruthy();
      expect(item.label).toBeTruthy();
      expect(item.categoria).toBeTruthy();
    }
  });

  it('nenhuma chave de constantes exportadas contém caracteres corrompidos', () => {
    const constantes = [
      CODIGOS_BENS, GRUPOS_DIRPF, CODIGOS_RENDIMENTOS, GRUPO_TIPO_DIRPF,
      CODIGO_TIPO_DIRPF, LOCALIZACAO_BENS, SITUACAO_BENS, CODIGOS_DARF,
    ];
    for (const obj of constantes) {
      for (const key of Object.keys(obj)) {
        expect(key).not.toMatch(/[\u4E00-\u9FFF\uFFFD]/);
      }
    }
  });
});