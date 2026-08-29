import { describe, it, expect } from 'vitest';
import { isEqualDeep, optionsKey } from './equality';

describe('isEqualDeep', () => {
  it('primitivos iguais', () => {
    expect(isEqualDeep('a', 'a')).toBe(true);
    expect(isEqualDeep(42, 42)).toBe(true);
    expect(isEqualDeep(true, true)).toBe(true);
    expect(isEqualDeep(null, null)).toBe(true);
    expect(isEqualDeep(undefined, undefined)).toBe(true);
  });

  it('primitivos diferentes', () => {
    expect(isEqualDeep('a', 'b')).toBe(false);
    expect(isEqualDeep(1, 2)).toBe(false);
    expect(isEqualDeep(1, '1')).toBe(false);
    expect(isEqualDeep(null, undefined)).toBe(false);
    expect(isEqualDeep(null, {})).toBe(false);
  });

  it('array igual', () => {
    expect(isEqualDeep([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(isEqualDeep([{ a: 1 }], [{ a: 1 }])).toBe(true);
    expect(isEqualDeep([], [])).toBe(true);
  });

  it('array com diferença falha cedo', () => {
    expect(isEqualDeep([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(isEqualDeep([1, 2], [1, 2, 3])).toBe(false);
    expect(isEqualDeep([1, 2, 3], [1, 2])).toBe(false);
    expect(isEqualDeep([{ a: 1 }], [{ a: 2 }])).toBe(false);
  });

  it('array vs objeto', () => {
    expect(isEqualDeep([1], { 0: 1 })).toBe(false);
  });

  it('objeto igual independente da ordem das chaves', () => {
    expect(isEqualDeep({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it('objeto com conteúdo diferente', () => {
    expect(isEqualDeep({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    expect(isEqualDeep({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(isEqualDeep({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });

  it('ignora chaves undefined (semântica de JSON.stringify)', () => {
    expect(isEqualDeep({ a: 1, b: undefined }, { a: 1 })).toBe(true);
  });

  it('referência igual', () => {
    const obj = { a: { b: [1] } };
    expect(isEqualDeep(obj, obj)).toBe(true);
  });
});

describe('optionsKey', () => {
  it('gera chave estável para arrays', () => {
    expect(optionsKey({ tickers: ['a', 'b'] }, ['tickers'])).toBe('a,b');
    expect(optionsKey({ tickers: ['b', 'a'] }, ['tickers'])).toBe('b,a');
  });

  it('reflete mudança de conteúdo/ordem', () => {
    expect(optionsKey({ tickers: ['a', 'b'] }, ['tickers'])).not.toBe(
      optionsKey({ tickers: ['a'] }, ['tickers'])
    );
  });

  it('lida com nulos e múltiplas chaves', () => {
    expect(optionsKey({ a: null }, ['a'])).toBe('');
    expect(optionsKey({ a: 1, b: ['x', 'y'] }, ['a', 'b'])).toBe('1|x,y');
  });
});