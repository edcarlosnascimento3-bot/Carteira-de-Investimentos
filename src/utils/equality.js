// Comparações fail-fast para detectar mudanças em dados sincronizados
// (substituem o uso de JSON.stringify para comparar lists grandes).

/**
 * Comparação profunda fail-fast: interrompe no primeiro valor diferente.
 * Semântica próxima de JSON.stringify(a) === JSON.stringify(b):
 *  - ignora ordem de chaves em objetos
 *  - ignora valores undefined (não seriam serializados)
 * @param {any} a
 * @param {any} b
 * @returns {boolean}
 */
export function isEqualDeep(a, b) {
  if (a === b) return true;

  const ta = typeof a;
  const tb = typeof b;
  if (ta !== tb) return false;
  if (a == null || b == null) return a === b;
  if (ta !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqualDeep(a[i], b[i])) return false;
    }
    return true;
  }

  const ak = Object.keys(a).filter((k) => a[k] !== undefined).sort();
  const bk = Object.keys(b).filter((k) => b[k] !== undefined).sort();
  if (ak.length !== bk.length) return false;
  for (let i = 0; i < ak.length; i++) {
    if (ak[i] !== bk[i]) return false;
    if (!isEqualDeep(a[ak[i]], b[bk[i]])) return false;
  }
  return true;
}

/**
 * Chave estável a partir de campos selecionados, para usar em deps de hooks
 * sem depender de referência do objeto nem serializar tudo.
 * @param {Object} options
 * @param {string[]} keys
 * @returns {string}
 */
export function optionsKey(options, keys) {
  return keys
    .map((k) => {
      const v = options[k];
      if (Array.isArray(v)) return v.join(',');
      return v == null ? '' : String(v);
    })
    .join('|');
}