import { useCallback, createContext, useContext } from 'react';
import { useStorageSync } from '../hooks/useStorageSync';

const IRRF2Context = createContext(null);

export function useIRRF2() {
  const ctx = useContext(IRRF2Context);
  if (!ctx) throw new Error('useIRRF2 deve ser usado dentro de IRRF2Provider');
  return ctx;
}

const STORAGE_NAME = 'irrf_data';

function getInitialData() {
  try {
    const stored = localStorage.getItem(`investimento_${STORAGE_NAME}`);
    if (stored) {
      const data = JSON.parse(stored);
      if (data && typeof data === 'object') return data;
    }
  } catch {}
  return { declaracoes: {} };
}

function isEmptyIrrfData(value) {
  return !value || typeof value !== 'object' || !value.declaracoes;
}

export function IRRF2Provider({ children }) {
  const { data: irrfData, setData: setIrrfData, loaded } = useStorageSync(STORAGE_NAME, {
    initialValue: getInitialData,
    isEmpty: isEmptyIrrfData,
  });

  const atualizarDeclaracao = useCallback((ano, dados) => {
    setIrrfData((prev) => {
      const declaracoes = { ...prev.declaracoes, [ano]: { ...prev.declaracoes[ano], ...dados } };
      return { ...prev, declaracoes };
    });
  }, []);

  const atualizarBens = useCallback((ano, ticker, dados) => {
    setIrrfData((prev) => {
      const declaracoes = { ...prev.declaracoes };
      if (!declaracoes[ano]) declaracoes[ano] = {};
      declaracoes[ano].bens = { ...declaracoes[ano].bens, [ticker]: dados };
      return { ...prev, declaracoes };
    });
  }, []);

  const atualizarInforme = useCallback((ano, instituicao, dados) => {
    setIrrfData((prev) => {
      const declaracoes = { ...prev.declaracoes };
      if (!declaracoes[ano]) declaracoes[ano] = {};
      declaracoes[ano].informes = { ...declaracoes[ano].informes, [instituicao]: dados };
      return { ...prev, declaracoes };
    });
  }, []);

  const atualizarChecklist = useCallback((ano, item, valor) => {
    setIrrfData((prev) => {
      const declaracoes = { ...prev.declaracoes };
      if (!declaracoes[ano]) declaracoes[ano] = {};
      declaracoes[ano].checklist = { ...declaracoes[ano].checklist, [item]: valor };
      return { ...prev, declaracoes };
    });
  }, []);

  const atualizarNotas = useCallback((ano, notas) => {
    setIrrfData((prev) => {
      const declaracoes = { ...prev.declaracoes };
      if (!declaracoes[ano]) declaracoes[ano] = {};
      declaracoes[ano].notas = notas;
      return { ...prev, declaracoes };
    });
  }, []);

  const valor = {
    irrfData,
    loaded,
    atualizarDeclaracao,
    atualizarBens,
    atualizarInforme,
    atualizarChecklist,
    atualizarNotas,
  };

  return (
    <IRRF2Context.Provider value={valor}>
      {children}
    </IRRF2Context.Provider>
  );
}

export { IRRF2Context };
