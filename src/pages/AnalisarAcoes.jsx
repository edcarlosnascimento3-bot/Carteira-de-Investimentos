import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTransactions } from '../context/TransactionsContext';
import { useProventos } from '../context/ProventosContext';
import { fetchBrapiFundamentals, fetchBrapiQuote, fetchBrapiProfilesBatch, fetchAllStocksWithSectors } from '../services/api';
import { formatCurrency } from '../services/format';

const defaultIndicador = null;

const avaliacaoCores = {
  bom: { cor: '#00CC66', label: 'Bom' },
  neutro: { cor: '#C8B800', label: 'Neutro' },
  ruim: { cor: '#FF5555', label: 'Ruim' },
};

const secaoConfig = [
  { key: 'valuation', titulo: 'Indicadores de Valuation', icone: '📊' },
  { key: 'eficiencia', titulo: 'Indicadores de Eficiência', icone: '⚡' },
  { key: 'endividamento', titulo: 'Indicadores de Endividamento', icone: '⚖️' },
  { key: 'rentabilidade', titulo: 'Indicadores de Rentabilidade', icone: '📈' },
  { key: 'crescimento', titulo: 'Indicadores de Crescimento', icone: '🚀' },
];

const selectStyle = {
  background: '#0D0D0D', color: '#E0E0E0', border: '1px solid #C8B800AA',
  borderRadius: 8, padding: '8px 14px', fontSize: '0.9em', fontFamily: 'inherit',
  cursor: 'pointer', outline: 'none', textAlign: 'center', textAlignLast: 'center',
};

const CACHE_KEY = 'brapiSectorCache';
const CACHE_TTL = 24 * 60 * 60 * 1000;
const INDUSTRY_CACHE_KEY = 'brapiIndustryCache';

function AnalisarAcoes() {
  const { transactions } = useTransactions();
  const { proventos } = useProventos();
  const [ticker, setTicker] = useState('');
  const [indicadores, setIndicadores] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [cotacao, setCotacao] = useState(null);

  // allStocks: array de { stock, sector, name } — todas as ações da bolsa
  const [allStocks, setAllStocks] = useState([]);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [sectorFilter, setSectorFilter] = useState('');
  const [subsectorFilter, setSubsectorFilter] = useState('');

  // industryData: { ticker: { industry: string } } — carregado sob demanda por setor
  const [industryData, setIndustryData] = useState({});
  const [industryLoading, setIndustryLoading] = useState(false);

  const tickersDisponiveis = useMemo(() => {
    const acoes = [...new Set(transactions
      .filter(t => /[0-9]/.test(t.ticker) && !t.ticker.endsWith('11'))
      .map(t => t.ticker))].sort();
    return acoes;
  }, [transactions]);

  // Setores únicos extraídos da lista de ações da bolsa
  const sectors = useMemo(() => {
    const set = new Set(allStocks.map(s => s.sector).filter(Boolean));
    return [...set].sort();
  }, [allStocks]);

  // Subsectors: carregados sob demanda quando um setor é selecionado
  const subsectors = useMemo(() => {
    if (!sectorFilter) return [];
    const tickersInSector = allStocks.filter(s => s.sector === sectorFilter).map(s => s.stock);
    const industries = new Set();
    for (const tk of tickersInSector) {
      const ind = industryData[tk]?.industry;
      if (ind) industries.add(ind);
    }
    return [...industries].sort();
  }, [sectorFilter, allStocks, industryData]);

  // Mapa rápido de ticker → setor
  const sectorByTicker = useMemo(() => {
    const map = {};
    for (const s of allStocks) {
      map[s.stock] = s.sector;
    }
    return map;
  }, [allStocks]);

  const filteredTickers = useMemo(() => {
    let list = tickersDisponiveis;
    if (sectorFilter) {
      list = list.filter(tk => sectorByTicker[tk] === sectorFilter);
    }
    if (subsectorFilter) {
      list = list.filter(tk => industryData[tk]?.industry === subsectorFilter);
    }
    return list;
  }, [tickersDisponiveis, sectorByTicker, industryData, sectorFilter, subsectorFilter]);

  // 1) Carrega todas as ações com setores (UMA única chamada à API)
  useEffect(() => {
    let cancelled = false;
    const loadStocks = async () => {
      // Verifica cache
      let cached;
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Date.now() - parsed.timestamp < CACHE_TTL) {
            cached = parsed.data;
          }
        }
      } catch {}

      if (cached && cached.length > 0) {
        if (!cancelled) setAllStocks(cached);
        return;
      }

      setStocksLoading(true);
      const stocks = await fetchAllStocksWithSectors();
      if (cancelled) return;

      setAllStocks(stocks);
      setStocksLoading(false);

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: stocks, timestamp: Date.now() }));
      } catch {}
    };

    loadStocks();
    return () => { cancelled = true; };
  }, []);

  // 2) Quando um setor é selecionado, busca os subsetores (industry) das ações daquele setor
  useEffect(() => {
    if (!sectorFilter) return;
    let cancelled = false;

    const tickersInSector = allStocks
      .filter(s => s.sector === sectorFilter)
      .map(s => s.stock);

    // Filtra apenas os que ainda não temos industry
    const missing = tickersInSector.filter(tk => !industryData[tk]);
    if (missing.length === 0) return;

    const loadIndustries = async () => {
      setIndustryLoading(true);

      const profiles = await fetchBrapiProfilesBatch(missing);
      if (cancelled) return;

      const newIndustry = {};
      for (const [tk, profile] of Object.entries(profiles)) {
        newIndustry[tk] = { industry: profile.industry || '' };
      }

      setIndustryData(prev => ({ ...prev, ...newIndustry }));
      setIndustryLoading(false);

      // Salva no cache
      try {
        const raw = localStorage.getItem(INDUSTRY_CACHE_KEY);
        const existing = raw ? JSON.parse(raw) : {};
        localStorage.setItem(INDUSTRY_CACHE_KEY, JSON.stringify({ ...existing, ...newIndustry }));
      } catch {}
    };

    loadIndustries();
    return () => { cancelled = true; };
  }, [sectorFilter, allStocks]);

  // 3) Restaura cache de industries ao carregar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(INDUSTRY_CACHE_KEY);
      if (raw) {
        setIndustryData(JSON.parse(raw));
      }
    } catch {}
  }, []);

  const clearFilters = useCallback(() => {
    setSectorFilter('');
    setSubsectorFilter('');
  }, []);

  const handleSectorChange = useCallback((value) => {
    setSectorFilter(value);
    setSubsectorFilter('');
  }, []);

  useEffect(() => {
    if (!ticker) {
      setIndicadores(null);
      setCotacao(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setApiError(null);
    Promise.all([
      fetchBrapiFundamentals(ticker),
      fetchBrapiQuote(ticker),
    ]).then(([fundData, quote]) => {
      if (cancelled) return;
      if (fundData) {
        setIndicadores(fundData);
      } else {
        setApiError('Dados fundamentalistas não disponíveis para este ativo.');
      }
      setCotacao(quote);
      setLoading(false);
    }).catch(err => {
      if (!cancelled) {
        setApiError(err.message);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [ticker]);

  const totalProventos = useMemo(() => {
    if (!ticker) return 0;
    return proventos
      .filter(p => p.ticker === ticker)
      .reduce((s, p) => s + (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0), 0);
  }, [proventos, ticker]);

  const ativo = useMemo(() => {
    if (!ticker) return null;
    const t = transactions.find(t => t.ticker === ticker);
    return t || null;
  }, [transactions, ticker]);

  return (
    <div>
      <h1>Analisar Ações</h1>

      
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ color: '#CCC', fontSize: '0.9em' }}>Setor:</span>
        <select
          value={sectorFilter}
          onChange={e => handleSectorChange(e.target.value)}
          style={{ ...selectStyle, minWidth: 180 }}
        >
          <option value="">Todos os setores</option>
          {sectors.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <span style={{ color: '#CCC', fontSize: '0.9em' }}>Subsetor:</span>
        <select
          value={subsectorFilter}
          onChange={e => setSubsectorFilter(e.target.value)}
          style={{ ...selectStyle, minWidth: 180 }}
          disabled={!sectorFilter}
        >
          <option value="">Todos os subsetores</option>
          {subsectors.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {(stocksLoading || industryLoading) && <span style={{ color: '#C8B800', fontSize: '0.85em' }}>Carregando dados...</span>}

        {(sectorFilter || subsectorFilter) && (
          <button
            onClick={clearFilters}
            style={{
              background: 'transparent', color: '#C8B800', border: '1px solid #C8B80066',
              borderRadius: 6, padding: '5px 12px', fontSize: '0.75em', fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.5px',
              transition: 'all 0.2s ease',
            }}
          >
            ✕ Limpar Filtros
          </button>
        )}
      </div>

      {filteredTickers.length > 0 && filteredTickers.length < tickersDisponiveis.length && (
        <div style={{ marginBottom: 16, color: '#666', fontSize: '0.85em' }}>
          {filteredTickers.length} de {tickersDisponiveis.length} ativo(s) exibidos
        </div>
      )}

      {ticker && ativo && (
        <div style={{
          background: '#151515', border: '1px solid #2A2A2A', borderRadius: 10,
          padding: '14px 20px', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: '1.3em', fontWeight: 700, color: '#C8B800' }}>{ticker}</span>
            <span style={{ color: '#888', fontSize: '0.85em' }}>{ativo.ativo}</span>
            <span style={{
              fontSize: '0.75em', padding: '3px 10px', borderRadius: 6,
              background: '#2A2A2A', color: '#CCC',
            }}>{ativo.tipo}</span>
            <span style={{
              fontSize: '0.75em', padding: '3px 10px', borderRadius: 6,
              background: ativo.segmento ? '#2A2A2A' : 'transparent',
              color: '#888',
            }}>{ativo.segmento || ativo.cnpj ? `CNPJ: ${ativo.cnpj}` : ''}</span>
            {cotacao && (
              <span style={{
                marginLeft: 'auto', fontSize: '1.1em', fontWeight: 700,
                color: cotacao.change >= 0 ? '#00CC66' : '#FF5555',
              }}>
                {formatCurrency(cotacao.price)}
                <span style={{ fontSize: '0.75em', marginLeft: 6 }}>
                  {cotacao.change >= 0 ? '+' : ''}{cotacao.change.toFixed(2)}%
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {ticker && !loading && indicadores && secaoConfig.map(secao => {
        const itens = indicadores[secao.key];
        if (!itens || itens.length === 0) return null;
        return (
          <div key={secao.key} style={{
            background: '#151515', border: '1px solid #2A2A2A', borderRadius: 10,
            marginBottom: 14, overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 20px', borderBottom: '1px solid #2A2A2A',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>{secao.icone}</span>
              <span style={{ color: '#C8B800', fontWeight: 700, fontSize: '0.9em', letterSpacing: '1px' }}>
                {secao.titulo}
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0D0D0D' }}>
                  <th style={{ padding: '8px 20px', textAlign: 'left', color: '#888', fontSize: '0.8em', fontWeight: 600, borderBottom: '1px solid #2A2A2A' }}>
                    Indicador
                  </th>
                  <th style={{ padding: '8px 20px', textAlign: 'center', color: '#888', fontSize: '0.8em', fontWeight: 600, borderBottom: '1px solid #2A2A2A', width: 120 }}>
                    Valor
                  </th>
                  <th style={{ padding: '8px 20px', textAlign: 'center', color: '#888', fontSize: '0.8em', fontWeight: 600, borderBottom: '1px solid #2A2A2A', width: 100 }}>
                    Avaliação
                  </th>
                </tr>
              </thead>
              <tbody>
                {itens.map((ind, i) => {
                  const aval = avaliacaoCores[ind.avaliacao] || avaliacaoCores.neutro;
                  return (
                    <tr key={i} style={{
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                      transition: 'background 0.2s',
                    }}>
                      <td style={{ padding: '8px 20px', color: '#E0E0E0', fontSize: '0.88em', borderBottom: '1px solid #1A1A1A' }}>
                        {ind.nome}
                      </td>
                      <td style={{
                        padding: '8px 20px', textAlign: 'center', color: '#FFF',
                        fontSize: '0.9em', fontWeight: 700, fontFamily: "'Consolas', monospace",
                        borderBottom: '1px solid #1A1A1A',
                      }}>
                        {ind.valor}
                      </td>
                      <td style={{
                        padding: '8px 20px', textAlign: 'center', borderBottom: '1px solid #1A1A1A',
                      }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 12px', borderRadius: 6,
                          fontSize: '0.78em', fontWeight: 700,
                          background: `${aval.cor}22`, color: aval.cor,
                          border: `1px solid ${aval.cor}44`,
                        }}>
                          {aval.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      {ticker && !loading && !indicadores && !apiError && (
        <div className="page-placeholder" style={{ height: '40%' }}>
          <div className="icon">📊</div>
          <h2>Sem dados disponíveis</h2>
          <p>Não foi possível carregar os indicadores fundamentalistas para {ticker}.</p>
        </div>
      )}
    </div>
  );
}

export default AnalisarAcoes;