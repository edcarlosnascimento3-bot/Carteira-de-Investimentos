import { describe, it, expect } from 'vitest';
import {
  mean,
  varianceSample,
  stdSample,
  covarianceSample,
  annualize,
  cagr,
  hhi,
  trackingError,
  beta,
  jensenAlpha,
} from './analytics';

describe('mean', () => {
  it('calcula média', () => {
    expect(mean([1, 2, 3])).toBe(2);
  });
  it('retorna null para lista vazia', () => {
    expect(mean([])).toBeNull();
  });
});

describe('varianceSample / stdSample', () => {
  it('variância amostral', () => {
    expect(varianceSample([2, 4, 6])).toBe(4);
  });
  it('desvio padrão amostral', () => {
    expect(stdSample([2, 4, 6])).toBe(2);
  });
  it('null com menos de 2 pontos', () => {
    expect(varianceSample([5])).toBeNull();
    expect(stdSample([])).toBeNull();
  });
});

describe('covarianceSample', () => {
  it('covariância entre séries paralelas', () => {
    expect(covarianceSample([1, 2, 3], [2, 4, 6])).toBe(2);
  });
  it('null se tamanhos diferentes ou vazios', () => {
    expect(covarianceSample([1, 2], [1, 2, 3])).toBeNull();
    expect(covarianceSample([], [])).toBeNull();
  });
});

describe('annualize', () => {
  it('anualiza retorno médio', () => {
    expect(annualize(0.1, 1)).toBeCloseTo(0.1);
    expect(annualize(0, 252)).toBe(0);
  });
  it('null para entradas inválidas', () => {
    expect(annualize(null)).toBeNull();
    expect(annualize(0.1, 0)).toBeNull();
    expect(annualize(0.1, -1)).toBeNull();
  });
});

describe('cagr', () => {
  it('CAGR básico', () => {
    expect(cagr(100, 121, 2)).toBeCloseTo(0.1);
  });
  it('CAGR com anos fracionários', () => {
    expect(cagr(100, 200, 10)).toBeCloseTo(Math.pow(2, 0.1) - 1, 12);
  });
  it('retorno zero quando VF == VI', () => {
    expect(cagr(100, 100, 1)).toBe(0);
  });
  it('null para entradas inválidas', () => {
    expect(cagr(0, 100, 1)).toBeNull();
    expect(cagr(100, 0, 1)).toBeNull();
    expect(cagr(100, 100, 0)).toBeNull();
    expect(cagr(100, 100, -1)).toBeNull();
  });
});

describe('hhi', () => {
  it('dois ativos iguais → 0.5', () => {
    expect(hhi([10, 10])).toBeCloseTo(0.5);
  });
  it('um ativo → 1 (concentração total)', () => {
    expect(hhi([10])).toBe(1);
  });
  it('três ativos iguais → 1/3', () => {
    expect(hhi([1, 1, 1])).toBeCloseTo(1 / 3);
  });
  it('ativos nulos não contam', () => {
    expect(hhi([100, 0])).toBe(1);
  });
  it('null para lista vazia ou total zero', () => {
    expect(hhi([])).toBeNull();
    expect(hhi([0, 0])).toBeNull();
  });
});

describe('trackingError', () => {
  const p = [0.1, 0.12];
  const b = [0.05, 0.06];
  it('desvio padrão anualizado da diferença', () => {
    expect(trackingError(p, b, 1)).toBeCloseTo(Math.sqrt(0.00005), 6);
  });
  it('null com tamanhos diferentes', () => {
    expect(trackingError([0.1], [0.05, 0.06])).toBeNull();
  });
});

describe('beta', () => {
  it('beta = Cov/Var', () => {
    expect(beta([1, 2, 3], [2, 4, 6])).toBeCloseTo(0.5);
  });
  it('null sem variação no benchmark', () => {
    expect(beta([1, 2, 3], [2, 2, 2])).toBeNull();
  });
  it('null com tamanhos diferentes', () => {
    expect(beta([1, 2], [1, 2, 3])).toBeNull();
  });
});

describe('jensenAlpha', () => {
  it('alpha de Jensen anualizado', () => {
    const p = [0.1, 0.12];
    const b = [0.05, 0.06];
    expect(jensenAlpha(p, b, 0.1, 1)).toBeCloseTo(0.1);
  });
  it('alpha zero para carteira espelhando o mercado', () => {
    const p = [0.05, 0.06];
    const b = [0.05, 0.06];
    expect(jensenAlpha(p, b, 0.05, 1)).toBeCloseTo(0);
  });
  it('null sem variação no benchmark', () => {
    expect(jensenAlpha([1, 2, 3], [2, 2, 2], 0.1)).toBeNull();
  });
});