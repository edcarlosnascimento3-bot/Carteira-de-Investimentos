import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTransactions } from '../context/TransactionsContext';
import { fetchBrapiFundamentals, fetchBrapiQuote, fetchBrapiProfilesBatch, fetchAllStocksWithSectors } from '../services/api';
import { formatCurrency } from '../services/format';
import { sectoresList, subsectorsBySector } from '../data/Setores';

const sectorMapENtoPT = {
  'Basic Materials': 'Materiais Básicos',
  'Communication Services': 'Comunicações',
  'Consumer Cyclical': 'Consumo Cíclico',
  'Consumer Defensive': 'Consumo Não Cíclico',
  'Energy': 'Petróleo, Gás e Biocombustíveis',
  'Financial Services': 'Financeiro',
  'Financial': 'Financeiro',
  'Healthcare': 'Saúde',
  'Industrials': 'Bens Industriais',
  'Real Estate': 'Financeiro',
  'Technology': 'Tecnologia da Informação',
  'Utilities': 'Utilidade Pública',
  'Consumer Goods': 'Consumo Cíclico',
  'Services': 'Comunicações',
  'Industrial': 'Bens Industriais',
  'Conglomerates': 'Bens Industriais',
};

const industryMapENtoPT = {
  'Banks': 'Bancos',
  'Financial Data & Stock Exchanges': 'Serviços Financeiros Diversos',
  'Credit Services': 'Serviços Financeiros Diversos',
  'Asset Management': 'Serviços Financeiros Diversos',
  'Capital Markets': 'Intermediários Financeiros',
  'Insurance - Life': 'Previdência e Seguros',
  'Insurance - Property & Casualty': 'Previdência e Seguros',
  'Insurance - Reinsurance': 'Previdência e Seguros',
  'Insurance - Diversified': 'Previdência e Seguros',
  'Insurance Brokers': 'Previdência e Seguros',
  'Mortgage Finance': 'Serviços Financeiros Diversos',
  'Financial Conglomerates': 'Serviços Financeiros Diversos',
  'Shell Companies': 'Serviços Financeiros Diversos',
  'Oil & Gas Exploration & Production': 'Extração e Produção',
  'Oil & Gas E&P': 'Extração e Produção',
  'Oil & Gas Refining & Marketing': 'Refino e Distribuição',
  'Oil & Gas Integrated': 'Extração e Produção',
  'Oil & Gas Midstream': 'Refino e Distribuição',
  'Oil & Gas Equipment & Services': 'Extração e Produção',
  'Oil & Gas Storage & Transportation': 'Refino e Distribuição',
  'Petrochemicals': 'Petroquímica',
  'Industrial Metals & Mining': 'Mineração',
  'Diversified Metals & Mining': 'Mineração',
  'Copper': 'Mineração',
  'Other Industrial Metals & Mining': 'Mineração',
  'Steel': 'Siderurgia e Metalurgia',
  'Steel Works': 'Siderurgia e Metalurgia',
  'Metal Fabrication': 'Siderurgia e Metalurgia',
  'Aluminum': 'Siderurgia e Metalurgia',
  'Paper & Paper Products': 'Madeira e Papel',
  'Lumber & Wood Production': 'Madeira e Papel',
  'Chemicals': 'Química',
  'Specialty Chemicals': 'Química',
  'Agricultural Inputs': 'Química',
  'Packaging & Containers': 'Embalagens',
  'Building Materials': 'Construção e Engenharia',
  'Packaged Foods': 'Alimentos Processados',
  'Meat Products': 'Alimentos Processados',
  'Food - Meat': 'Alimentos Processados',
  'Food - Confectioners': 'Alimentos Processados',
  'Food - Diversified': 'Alimentos Processados',
  'Food - Specialty': 'Alimentos Processados',
  'Dairy Products': 'Alimentos Processados',
  'Farm Products': 'Agropecuária',
  'Beverages - Alcoholic': 'Bebidas',
  'Beverages - Non-Alcoholic': 'Bebidas',
  'Beverages - Brewers': 'Bebidas',
  'Beverages - Wineries & Distilleries': 'Bebidas',
  'Beverages - Soft Drinks': 'Bebidas',
  'Pharmaceuticals': 'Produtos Farmacêuticos e de Saúde',
  'Drug Manufacturers - General': 'Produtos Farmacêuticos e de Saúde',
  'Drug Manufacturers - Specialty & Generic': 'Produtos Farmacêuticos e de Saúde',
  'Tobacco': 'Tabaco',
  'Household & Personal Products': 'Produtos de Limpeza e Uso Pessoal',
  'Utilities - Renewable': 'Energia Elétrica',
  'Utilities - Independent Power Producers': 'Energia Elétrica',
  'Utilities - Regulated Electric': 'Energia Elétrica',
  'Utilities - Regulated Water': 'Água e Saneamento',
  'Utilities - Regulated Gas': 'Gás',
  'Utilities - Diversified': 'Energia Elétrica',
  'Medical Devices': 'Equipamentos e Materiais',
  'Medical Care Facilities': 'Serviços Médicos, Hospitalares, Análises e Diagnósticos',
  'Health Information Services': 'Programas e Serviços',
  'Healthcare Plans': 'Serviços Médicos, Hospitalares, Análises e Diagnósticos',
  'Diagnostics & Research': 'Serviços Médicos, Hospitalares, Análises e Diagnósticos',
  'Medical Distribution': 'Comércio e Distribuição',
  'Health Care Plans': 'Serviços Médicos, Hospitalares, Análises e Diagnósticos',
  'Medical Instruments & Supplies': 'Equipamentos e Materiais',
  'Biotechnology': 'Medicamentos e Outros',
  'Pharmaceutical Retailers': 'Comércio e Distribuição',
  'Software - Application': 'Programas e Serviços',
  'Software - Infrastructure': 'Programas e Serviços',
  'Information Technology Services': 'Programas e Serviços',
  'Data Storage': 'Programas e Serviços',
  'Semiconductors': 'Computadores e Equipamentos',
  'Semiconductor Equipment & Materials': 'Computadores e Equipamentos',
  'Computer Hardware': 'Computadores e Equipamentos',
  'Consumer Electronics': 'Computadores e Equipamentos',
  'Communication Equipment': 'Computadores e Equipamentos',
  'Internet Content & Information': 'Programas e Serviços',
  'Scientific & Technical Instruments': 'Computadores e Equipamentos',
  'Electronic Gaming & Multimedia': 'Programas e Serviços',
  'Telecom Services': 'Telecomunicações',
  'Telecom - Domestic': 'Telefonia Fixa',
  'Telecom - Wireless': 'Telecomunicações',
  'Entertainment': 'Lazer e Entretenimento',
  'Broadcasting': 'Mídia',
  'Publishing': 'Mídia',
  'Advertising Agencies': 'Mídia',
  'Auto Manufacturers': 'Automóveis e Motocicletas',
  'Recreational Vehicles': 'Automóveis e Motocicletas',
  'Auto Parts': 'Material de Transporte',
  'Auto & Truck Dealerships': 'Comércio',
  'Apparel Manufacturing': 'Tecidos, Vestuário e Calçados',
  'Footwear & Accessories': 'Tecidos, Vestuário e Calçados',
  'Apparel Retail': 'Comércio',
  'Specialty Retail': 'Comércio',
  'Department Stores': 'Comércio',
  'Internet Retail': 'Comércio',
  'Restaurants': 'Hotéis e Restaurantes',
  'Lodging': 'Hotéis e Restaurantes',
  'Leisure': 'Lazer e Entretenimento',
  'Travel Services': 'Lazer e Entretenimento',
  'Resorts & Casinos': 'Lazer e Entretenimento',
  'Gambling': 'Lazer e Entretenimento',
  'Home Improvement Retail': 'Comércio',
  'Furnishings, Fixtures & Appliances': 'Mobiliário',
  'Residential Construction': 'Construção Civil',
  'Home Builders': 'Construção Civil',
  'Textile Manufacturing': 'Tecidos, Vestuário e Calçados',
  'Specialty Industrial Machinery': 'Máquinas e Equipamentos',
  'Electrical Equipment & Parts': 'Máquinas e Equipamentos',
  'Farm & Heavy Construction Machinery': 'Máquinas e Equipamentos',
  'Pollution & Treatment Controls': 'Máquinas e Equipamentos',
  'Tools & Accessories': 'Máquinas e Equipamentos',
  'Aerospace & Defense': 'Material de Transporte',
  'Railroads': 'Serviços e Transportes Diversos',
  'Trucking': 'Serviços e Transportes Diversos',
  'Airports & Air Services': 'Serviços e Transportes Diversos',
  'Rental & Leasing Services': 'Serviços e Transportes Diversos',
  'Freight & Logistics Services': 'Serviços e Transportes Diversos',
  'Engineering & Construction': 'Construção e Engenharia',
  'Infrastructure Operations': 'Construção e Engenharia',
  'Building Products & Equipment': 'Construção e Engenharia',
  'Waste Management': 'Serviços e Transportes Diversos',
  'Security & Protection Services': 'Serviços e Transportes Diversos',
  'Staffing & Employment Services': 'Serviços e Transportes Diversos',
  'Consulting Services': 'Serviços e Transportes Diversos',
  'Education & Training Services': 'Serviços e Transportes Diversos',
  'Business Equipment & Supplies': 'Máquinas e Equipamentos',
  'Personal Services': 'Diversos',
  'Conglomerates': 'Diversos',
  'Real Estate - Development': 'Construção Civil',
  'Real Estate - Diversified': 'Serviços Financeiros Diversos',
  'Real Estate Services': 'Serviços Financeiros Diversos',
  'REIT - Industrial': 'Serviços Financeiros Diversos',
  'REIT - Office': 'Serviços Financeiros Diversos',
  'REIT - Retail': 'Serviços Financeiros Diversos',
  'REIT - Residential': 'Serviços Financeiros Diversos',
  'REIT - Healthcare Facilities': 'Serviços Financeiros Diversos',
  'REIT - Diversified': 'Serviços Financeiros Diversos',
  'REIT - Specialty': 'Serviços Financeiros Diversos',
  'REIT - Hotel & Motel': 'Serviços Financeiros Diversos',
  'REIT - Mortgage': 'Serviços Financeiros Diversos',
};

const sectorPTtoEN = {};
for (const [en, pt] of Object.entries(sectorMapENtoPT)) {
  if (!sectorPTtoEN[pt]) sectorPTtoEN[pt] = [];
  sectorPTtoEN[pt].push(en);
}

const subsectorPTtoEN = {};
for (const [en, pt] of Object.entries(industryMapENtoPT)) {
  if (!subsectorPTtoEN[pt]) subsectorPTtoEN[pt] = [];
  subsectorPTtoEN[pt].push(en);
}

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



function AnalisarAcoes() {
  const { transactions } = useTransactions();
  const [ticker, setTicker] = useState('');
  const [indicadores, setIndicadores] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [cotacao, setCotacao] = useState(null);

  const [sectorFilter, setSectorFilter] = useState('');
  const [subsectorFilter, setSubsectorFilter] = useState('');

  const sectors = sectoresList;

  const subsectors = useMemo(() => {
    if (!sectorFilter) return [];
    return subsectorsBySector(sectorFilter);
  }, [sectorFilter]);

  const clearFilters = useCallback(() => {
    setSectorFilter('');
    setSubsectorFilter('');
  }, []);

  const handleSectorChange = useCallback((value) => {
    setSectorFilter(value);
    setSubsectorFilter('');
  }, []);

  const [allStocks, setAllStocks] = useState([]);
  const [loadingAllStocks, setLoadingAllStocks] = useState(true);

  const stockLookup = useMemo(() => {
    const map = {};
    for (const s of allStocks) map[s.stock] = s;
    return map;
  }, [allStocks]);

  useEffect(() => {
    setLoadingAllStocks(true);
    fetchAllStocksWithSectors().then(data => {
      setAllStocks(data || []);
      setLoadingAllStocks(false);
    }).catch(() => {
      setAllStocks([]);
      setLoadingAllStocks(false);
    });
  }, []);

  const [profiles, setProfiles] = useState({});
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  useEffect(() => {
    if (sectorFilter && subsectorFilter) {
      const englishSectors = sectorPTtoEN[sectorFilter] || [];
      const sectorStocks = allStocks.filter(s => englishSectors.includes(s.sector));
      const tickers = sectorStocks.map(s => s.stock);
      if (tickers.length === 0) {
        setProfiles({});
        setLoadingProfiles(false);
        return;
      }
      setLoadingProfiles(true);
      fetchBrapiProfilesBatch(tickers).then(data => {
        setProfiles(data || {});
        setLoadingProfiles(false);
      }).catch(() => {
        setProfiles({});
        setLoadingProfiles(false);
      });
    } else {
      setProfiles({});
      setLoadingProfiles(false);
    }
  }, [sectorFilter, subsectorFilter, allStocks]);

  const filteredTickers = useMemo(() => {
    if (!sectorFilter || loadingAllStocks) return [];

    const englishSectors = sectorPTtoEN[sectorFilter] || [];
    if (englishSectors.length === 0) return [];

    const sectorStocks = allStocks.filter(s => englishSectors.includes(s.sector));

    if (!subsectorFilter) {
      return sectorStocks.map(s => s.stock);
    }

    const englishIndustries = subsectorPTtoEN[subsectorFilter] || [];
    if (englishIndustries.length === 0) return [];

    return sectorStocks
      .filter(s => {
        const p = profiles[s.stock];
        return p && englishIndustries.includes(p.industry);
      })
      .map(s => s.stock);
  }, [sectorFilter, subsectorFilter, allStocks, profiles, loadingAllStocks]);

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

  const ativo = useMemo(() => {
    if (!ticker) return null;
    const t = transactions.find(t => t.ticker === ticker);
    return t || null;
  }, [transactions, ticker]);

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <aside style={{ width: 260, flexShrink: 0 }}>
        <div style={{
          background: '#151515', border: '1px solid #2A2A2A', borderRadius: 10, overflow: 'hidden',
          position: 'sticky', top: 16, maxHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid #2A2A2A',
            color: '#888', fontSize: '0.72em', fontWeight: 700, letterSpacing: '1px',
            background: '#0D0D0D',
          }}>
            ATIVOS ({filteredTickers.length})
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: 6 }}>
            {loadingAllStocks ? (
              <div style={{ padding: '12px', color: '#666', fontSize: '0.85em', textAlign: 'center' }}>
                Carregando ativos...
              </div>
            ) : sectorFilter && subsectorFilter && loadingProfiles ? (
              <div style={{ padding: '12px', color: '#666', fontSize: '0.85em', textAlign: 'center' }}>
                Carregando...
              </div>
            ) : filteredTickers.length === 0 ? (
              <div style={{ padding: '12px', color: '#666', fontSize: '0.85em', textAlign: 'center' }}>
                {sectorFilter ? 'Nenhum ativo encontrado' : 'Selecione um setor'}
              </div>
            ) : filteredTickers.map(t => {
              const info = stockLookup[t];
              const isActive = ticker === t;
              const ptSector = info && sectorMapENtoPT[info.sector];
              return (
                <div
                  key={t}
                  onClick={() => setTicker(t)}
                  style={{
                    padding: '9px 12px', borderRadius: 6, cursor: 'pointer',
                    background: isActive ? '#C8B80018' : 'transparent',
                    border: isActive ? '1px solid #C8B80033' : '1px solid transparent',
                    marginBottom: 2, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#222' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ color: isActive ? '#C8B800' : '#E0E0E0', fontWeight: 700, fontSize: '0.88em' }}>
                    {t}
                  </div>
                  {info && (
                    <div style={{ color: '#AAA', fontSize: '0.72em', marginTop: 1 }}>
                      {info.name}
                    </div>
                  )}
                  {ptSector && (
                    <div style={{ color: '#666', fontSize: '0.68em', marginTop: 2 }}>
                      {ptSector}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0 }}>
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
      }      )}

        {ticker && !loading && !indicadores && !apiError && (
          <div className="page-placeholder" style={{ height: '40%' }}>
            <div className="icon">📊</div>
            <h2>Sem dados disponíveis</h2>
            <p>Não foi possível carregar os indicadores fundamentalistas para {ticker}.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default AnalisarAcoes;