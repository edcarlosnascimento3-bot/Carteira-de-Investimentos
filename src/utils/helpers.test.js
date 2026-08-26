import { describe, it, expect } from 'vitest';
import { normalizeTipo, typeIcons, typeColors, typeBorders, monthNames, makeId } from './helpers';

describe('normalizeTipo', () => {
  it('returns empty string for falsy values', () => {
    expect(normalizeTipo(null)).toBe('');
    expect(normalizeTipo(undefined)).toBe('');
    expect(normalizeTipo('')).toBe('');
  });

  it('normalizes "fii" to "FII"', () => {
    expect(normalizeTipo('fii')).toBe('FII');
  });

  it('normalizes "FII Agro" to "FII"', () => {
    expect(normalizeTipo('FII Agro')).toBe('FII');
  });

  it('capitalizes first letter', () => {
    expect(normalizeTipo('ação')).toBe('Ação');
    expect(normalizeTipo('RENDA FIXA')).toBe('RENDA FIXA');
  });

  it('trims whitespace', () => {
    expect(normalizeTipo('  ação  ')).toBe('Ação');
  });
});

describe('typeIcons', () => {
  it('has icons for main types', () => {
    expect(typeIcons['Ação']).toBeDefined();
    expect(typeIcons['FII']).toBeDefined();
    expect(typeIcons['Renda Fixa']).toBeDefined();
  });
});

describe('typeColors', () => {
  it('has colors for main types', () => {
    expect(typeColors['Ação']).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(typeColors['FII']).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(typeColors['Renda Fixa']).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

describe('typeBorders', () => {
  it('has borders for crypto variants', () => {
    expect(typeBorders['Criptoativo']).toBeDefined();
    expect(typeBorders['Cripto']).toBeDefined();
    expect(typeBorders['Criptoativos']).toBeDefined();
  });
});

describe('monthNames', () => {
  it('has 12 months in Portuguese', () => {
    expect(monthNames).toHaveLength(12);
    expect(monthNames[0]).toBe('Janeiro');
    expect(monthNames[11]).toBe('Dezembro');
  });
});

describe('makeId', () => {
  it('returns a string', () => {
    expect(typeof makeId()).toBe('string');
  });

  it('returns unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => makeId()));
    expect(ids.size).toBe(100);
  });
});
