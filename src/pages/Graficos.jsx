import { useMemo, useState, useCallback, useRef, useLayoutEffect, useEffect, memo } from 'react';
import { useTransactions } from '../context/TransactionsContext';
import { useProventos } from '../context/ProventosContext';
import { useRfManual } from '../context/RfManualContext';
import { formatCurrency } from '../services/format';
import { usePrices } from '../hooks/usePrices';
import * as CorretoraService from '../database/CorretoraService';
import { ETFS_RENDA_FIXA } from '../data/etfRendaFixa';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList, LineChart, Line, CartesianGrid, Sector } from 'recharts';
import { normalizeTipo, monthNames } from '../utils/helpers';
import SectionErrorBoundary from '../components/SectionErrorBoundary';
import { mean, stdSample, cagr, hhi, trackingError, beta, jensenAlpha } from '../services/analytics';
import {
  C_ACAO, C_FII, C_RF, C_VERDE, C_VERDE_ESCURO, C_AZUL, C_VERMELHO_ESCURO,
  typeColors, CHART_COLORS, INTL_COLORS, corretoraPorTicker, INDEX_HISTORY,
} from '../data/constants';
import { fetchCurrentYearReturns } from '../services/indexApi';

const defaultTickers = ['PETR4', 'VALE3', 'ITUB4', 'ABEV3', 'BBAS3', 'WEGE3', 'HGLG11', 'KNRI11', 'BTC', 'ETH'];

const tooltipStyle = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
  fontSize: '0.85em', color: 'var(--text)',
};

const RADIAN = Math.PI / 180;

function shadeColor(color, percent) {
  if (!color || color[0] !== '#') return color;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const f = 1 - percent;
  const toHex = (v) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function renderLabel(isLight) {
  const fill = isLight ? '#000000' : '#BBB';
  const sinTilt = Math.sin((32 * Math.PI) / 180);
  return ({ name, percent, cx, cy, midAngle, outerRadius }) => {
    const radius = outerRadius * 1.2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const pct = (percent * 100).toFixed(1);
    const originY = 0.9 * cy;
    const d = y - originY;
    const dRef = 0.1 * cy + radius;
    const fs = (12 * (900 - d * sinTilt)) / (900 - dRef * sinTilt);
    return (
      <text x={x} y={y} fill={fill} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={fs}>
        {`${name} ${pct}%`}
      </text>
    );
  };
}


function renderActiveShape(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} stroke="#FFF" strokeWidth={2} />
      <text x={cx} y={cy - 12} textAnchor="middle" fill="#FFF" fontSize={13}>{payload.name}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#FFF" fontSize={11}>{(percent * 100).toFixed(1)}%</text>
    </g>
  );
}

function renderTickerLabel(isLight) {
  const fill = isLight ? '#000000' : '#BBB';
  return ({ name, percent, cx, cy, midAngle, outerRadius }) => {
    const radius = outerRadius * 1.25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const fs = percent < 0.03 ? 10 : percent < 0.06 ? 11 : 12;
    return (
      <text x={x} y={y} fill={fill} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={fs}>
        {name} {(percent * 100).toFixed(1)}%
      </text>
    );
  };
}

function renderTickerLabelWithValue(isLight) {
  const fill = isLight ? '#000000' : '#BBB';
  return ({ name, percent, cx, cy, midAngle, outerRadius, value }) => {
    const radius = outerRadius * 1.3;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const fs = percent < 0.03 ? 10 : percent < 0.06 ? 11 : 12;
    return (
      <g>
        <text x={x} y={y - 7} fill={fill} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={fs}>
          {name} {(percent * 100).toFixed(1)}%
        </text>
        <text x={x} y={y + 9} fill={C_VERDE} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight="bold">
          {formatCurrency(value)}
        </text>
      </g>
    );
  };
}

const fmtPct = (n) => `${(n * 100).toFixed(2)}%`;

function hhiLabel(value) {
  if (value == null) return 'sem dados';
  if (value < 0.25) return 'Baixa concentração';
  if (value < 0.5) return 'Concentração moderada';
  if (value < 0.75) return 'Carteira concentrada';
  return 'Alta concentração';
}

const MetricTile = memo(function MetricTile({ label, value, color, sub, description }) {
  const [showDesc, setShowDesc] = useState(false);
  return (
    <div style={{
      background: 'var(--surface-dark)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, position: 'relative',
    }}>
      <span style={{
        fontSize: '0.72em', textTransform: 'uppercase', letterSpacing: '0.06em',
        color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {label}
        {description && (
          <span onClick={() => setShowDesc(!showDesc)} style={{ cursor: 'pointer', opacity: 0.6, display: 'inline-flex', alignItems: 'center', transition: 'opacity 0.15s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="6" fill="var(--text-muted)" />
              <text x="6" y="9" textAnchor="middle" fill="var(--surface)" fontSize="8" fontWeight="700">i</text>
            </svg>
          </span>
        )}
      </span>
      {showDesc && description && (
        <span style={{
          fontSize: '0.65em', color: 'var(--text)', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px',
          position: 'absolute', top: '100%', left: 0, zIndex: 20, marginTop: 4,
          whiteSpace: 'normal', maxWidth: '220px', pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.35)', lineHeight: 1.4,
        }}>
          {description}
        </span>
      )}
      <span style={{ fontSize: '1.15em', fontWeight: 700, color: color || 'var(--text)' }}>
        {value}
      </span>
      {sub && <span style={{ fontSize: '0.72em', color: 'var(--text-faint)' }}>{sub}</span>}
    </div>
  );
});

function RiscoRetornoCard({ metricsData, benchmark, onBenchmarkChange }) {
  return (
    <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', gridColumn: '1 / -1' }}>
      <h2 style={{ textAlign: 'center' }}>Métricas de Risco & Retorno</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9em', color: 'var(--text)', fontWeight: 600 }}>
          Benchmark
          <select
            value={benchmark}
            onChange={e => onBenchmarkChange(e.target.value)}
            style={{
              background: 'var(--surface-dark)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6,
              padding: '6px 10px', fontSize: '0.9em', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {Object.keys(INDEX_HISTORY).map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </label>
        <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>
          {metricsData.anos} anos alinhados com {metricsData.benchmark}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <MetricTile
          label="CAGR Carteira"
          value={metricsData.cagrPf == null ? '—' : fmtPct(metricsData.cagrPf)}
          color={C_VERDE_ESCURO}
          sub="acumulado base 100"
          description="Taxa de crescimento anual composta (CAGR) da carteira ao longo do período analisado."
        />
        <MetricTile
          label={`CAGR ${metricsData.benchmark}`}
          value={metricsData.cagrBench == null ? '—' : fmtPct(metricsData.cagrBench)}
          color={INDEX_HISTORY[metricsData.benchmark]?.cor}
          sub="acumulado base 100"
          description={`Taxa de crescimento anual composta do índice ${metricsData.benchmark}.`}
        />
        <MetricTile
          label="Beta"
          value={metricsData.betaVal == null ? '—' : metricsData.betaVal.toFixed(2)}
          color={C_AZUL}
          sub={`vs ${metricsData.benchmark}`}
          description="Sensibilidade da carteira às movimentações do benchmark. Beta > 1 indica mais volatilidade que o benchmark."
        />
        <MetricTile
          label="Tracking Error"
          value={metricsData.trackingErr == null ? '—' : fmtPct(metricsData.trackingErr)}
          color={C_ACAO}
          sub={`vs ${metricsData.benchmark}`}
          description="Desvio padrão dos retornos diferenciais da carteira em relação ao benchmark."
        />
        <MetricTile
          label="Alpha de Jensen"
          value={metricsData.alpha == null ? '—' : fmtPct(metricsData.alpha)}
          color={metricsData.alpha >= 0 ? C_FII : C_VERMELHO_ESCURO}
          sub={`Rf ${fmtPct(metricsData.riskFreeAnnual)} (CDI médio)`}
          description="Retorno excedente da carteira acima do esperado pelo modelo CAPM, ajustado pelo risco sistemático."
        />
        <MetricTile
          label="Sharpe (anual)"
          value={metricsData.sharpe == null ? '—' : metricsData.sharpe.toFixed(2)}
          color={C_AZUL}
          sub="excesso de retorno / volatilidade"
          description="Indica quanto retorno extra se obtém por unidade de risco (volatilidade). Quanto maior, melhor."
        />
        <MetricTile
          label="HHI (concentração)"
          value={metricsData.hhi == null ? '—' : (metricsData.hhi * 10000).toFixed(0)}
          color={C_RF}
          sub={hhiLabel(metricsData.hhi)}
          description="Índice de Herfindahl-Hirschman de concentração de ativos. Valor mais alto indica maior concentração."
        />
      </div>
    </div>
  );
}

function SelectionBadge({ data, selectedName, valueKey, formatFn }) {
  if (!selectedName) return null;
  const item = data.find(d => d.name === selectedName);
  if (!item) return null;
  const val = item[valueKey || 'value'];
  return (
    <div style={{
      position: 'absolute', top: 8, left: 8, zIndex: 10,
      background: 'rgba(0,0,0,0.85)', borderRadius: 8, padding: '6px 14px',
      backdropFilter: 'blur(4px)', display: 'flex', gap: 8, alignItems: 'baseline',
    }}>
      <span style={{ color: C_RF, fontWeight: 700, fontSize: '0.9em' }}>{selectedName}</span>
      <span style={{ color: '#FFF', fontSize: '0.85em' }}>
        {formatFn ? formatFn(val) : formatCurrency(val)}
      </span>
    </div>
  );
}

function useLightTheme() {
  const [isLight, setIsLight] = useState(() =>
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'light'
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.documentElement;
    const update = () => setIsLight(el.getAttribute('data-theme') === 'light');
    update();
    const observer = new MutationObserver(update);
    observer.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return isLight;
}

function Graficos() {
  const isLight = useLightTheme();
  const { transactions } = useTransactions();
  const { proventos } = useProventos();
  const [selectedType, setSelectedType] = useState(null);
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [selectedAno, setSelectedAno] = useState(null);
  const [selectedProventosAno, setSelectedProventosAno] = useState(null);
  const [selectedProventosAnoTipo, setSelectedProventosAnoTipo] = useState(null);
  const [selectedProventosTipos, setSelectedProventosTipos] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(['IBOVESPA', 'IFIX', 'IPCA', 'CDI']);
  const [metricBenchmark, setMetricBenchmark] = useState('IBOVESPA');
  const [pieHover, setPieHover] = useState(null);
  const [tickerHover, setTickerHover] = useState(null);
  const [selectedCorretora, setSelectedCorretora] = useState(null);
  const [corretoras, setCorretoras] = useState([]);
  const [showLogoForm, setShowLogoForm] = useState(false);
  const [logoLinkInput, setLogoLinkInput] = useState('');
  const [currentYearData, setCurrentYearData] = useState(null);
  const ativoRef = useRef(null);
  const mediaRef = useRef(null);
  const qtdRef = useRef(null);
  const [qtdHeight, setQtdHeight] = useState(null);

  const tickers = useMemo(() => {
    const groups = {};
    transactions.forEach(t => {
      if (!groups[t.ticker]) groups[t.ticker] = { qtdCompra: 0, qtdVenda: 0, tipo: t.tipo };
      if (t.operacao === 'Compra') groups[t.ticker].qtdCompra += t.quantidade;
      else groups[t.ticker].qtdVenda += t.quantidade;
    });
    const portfolioTickers = Object.entries(groups)
      .filter(([, g]) => g.qtdCompra - g.qtdVenda > 0 && !['Dólar', 'Euro'].includes(g.tipo))
      .map(([ticker]) => ticker);
    const tipos = new Set(transactions.map(t => t.tipo.replace(/Fii/g, 'FII')));
    if (tipos.has('Dólar') && !portfolioTickers.includes('USDBRL')) portfolioTickers.push('USDBRL');
    if (tipos.has('Euro') && !portfolioTickers.includes('EURBRL')) portfolioTickers.push('EURBRL');
    return [...new Set([...defaultTickers, ...portfolioTickers])];
  }, [transactions]);

  const { prices } = usePrices(tickers);

  useEffect(() => {
    CorretoraService.listar().then(setCorretoras);
  }, []);

  async function handleSaveLogo() {
    if (!selectedCorretora || !logoLinkInput.trim()) return;
    let obj = corretoras.find(c => c.nome.toLowerCase() === selectedCorretora.toLowerCase());
    if (!obj) {
      obj = await CorretoraService.adicionar({ nome: selectedCorretora });
      const updated = await CorretoraService.listar();
      setCorretoras(updated);
    }
    try {
      await CorretoraService.atualizar(obj.id, { logo_url: logoLinkInput.trim() });
      const updated = await CorretoraService.listar();
      setCorretoras(updated);
      setShowLogoForm(false);
      setLogoLinkInput('');
    } catch (err) {
      console.error('Erro ao salvar logo:', err);
    }
  }

  useLayoutEffect(() => {
    if (ativoRef.current && mediaRef.current) {
      const h = ativoRef.current.offsetHeight + 16 + mediaRef.current.offsetHeight;
      setQtdHeight(prev => prev === h ? prev : h);
    }
  });

  const uniqueAnos = useMemo(() => {
    const anos = [...new Set(transactions.map(t => t.ano))].sort((a, b) => b - a);
    return anos;
  }, [transactions]);

  const proventosAnos = useMemo(() => {
    const anos = [...new Set(proventos.map(p => p.ano))].sort((a, b) => b - a);
    return anos;
  }, [proventos]);

  const proventosTiposAnos = useMemo(() => {
    const anos = [...new Set(proventos.map(p => p.ano))].sort((a, b) => b - a);
    return anos;
  }, [proventos]);

  useEffect(() => {
    if (selectedAno === null && uniqueAnos.length > 0) setSelectedAno(uniqueAnos[0]);
  }, [uniqueAnos, selectedAno]);

  useEffect(() => {
    if (selectedProventosAno === null && proventosAnos.length > 0) setSelectedProventosAno(proventosAnos[0]);
  }, [proventosAnos, selectedProventosAno]);

  useEffect(() => {
    if (selectedProventosAnoTipo === null && proventosTiposAnos.length > 0) setSelectedProventosAnoTipo(proventosTiposAnos[0]);
  }, [proventosTiposAnos, selectedProventosAnoTipo]);

  useEffect(() => {
    fetchCurrentYearReturns().then(setCurrentYearData).catch(() => {
      setCurrentYearData({ currentYear: new Date().getFullYear(), data: {}, errors: { network: 'Falha na conexão' } });
    });
  }, []);

  const mergedIndexHistory = useMemo(() => {
    if (!currentYearData) return INDEX_HISTORY;
    const merged = {};
    Object.keys(INDEX_HISTORY).forEach(key => {
      merged[key] = { ...INDEX_HISTORY[key] };
      if (currentYearData.data[key] !== undefined) {
        merged[key].dados = { ...INDEX_HISTORY[key].dados, [currentYearData.currentYear]: currentYearData.data[key] };
      }
    });
    return merged;
  }, [currentYearData]);

  const uniqueProventosTipos = useMemo(() => {
    return [...new Set(proventos.map(p => normalizeTipo(p.tipo)))].sort();
  }, [proventos]);

  const monthData = useMemo(() => {
    if (!selectedAno) return [];
    const map = {};
    for (let m = 1; m <= 12; m++) map[m] = 0;
    transactions
      .filter(t => t.ano === selectedAno)
      .forEach(t => {
        const [, month] = t.data.split('/').map(Number);
        if (t.operacao === 'Compra') map[month] += t.investido;
        else map[month] -= t.investido;
      });
    return Object.entries(map).map(([m, value]) => ({
      month: Number(m),
      nome: monthNames[Number(m) - 1],
      value: Math.round(value * 100) / 100,
    }));
  }, [transactions, selectedAno]);


  const selColor = C_RF;

  const handleTypeClick = useCallback((type) => {
    setSelectedType(prev => prev === type ? null : type);
    setSelectedTicker(null);
  }, []);

  const handleTickerClick = useCallback((ticker) => {
    setSelectedTicker(prev => prev === ticker ? null : ticker);
  }, []);

  const { rfManual } = useRfManual();

  const portfolioBase = useMemo(() => {
    const groups = {};
    transactions.forEach(t => {
      if (!groups[t.ticker]) {
        groups[t.ticker] = {
          ticker: t.ticker, ativo: t.ativo, tipo: t.tipo.replace(/Fii/g, 'FII'),
          qtdCompra: 0, qtdVenda: 0, investidoCompra: 0, investidoVenda: 0,
          corretora: t.corretora || '',
        };
      }
      const g = groups[t.ticker];
      if (t.operacao === 'Compra') { g.qtdCompra += t.quantidade; g.investidoCompra += t.investido; }
      else { g.qtdVenda += t.quantidade; g.investidoVenda += t.investido; }
      if (t.corretora) g.corretora = t.corretora;
    });

    return Object.values(groups).map(g => {
      const quantidade = g.qtdCompra - g.qtdVenda;
      const investido = g.investidoCompra - g.investidoVenda;
      const precoMedio = quantidade > 0 ? investido / quantidade : 0;
      const tipoNorm = g.tipo;
      const precificadoMercado = ETFS_RENDA_FIXA.includes(g.ticker);
      const isManual = ['Renda Fixa', 'Dólar', 'Euro'].includes(tipoNorm) && !precificadoMercado;
      const manualTotal = precificadoMercado ? null : rfManual[g.ticker];
      const cotacao = isManual && manualTotal != null && tipoNorm !== 'Renda Fixa'
        ? manualTotal / quantidade
        : tipoNorm === 'Renda Fixa'
          ? precificadoMercado ? prices[g.ticker] : precoMedio
          : tipoNorm === 'Dólar'
            ? prices['USDBRL']
            : tipoNorm === 'Euro'
              ? prices['EURBRL']
              : prices[g.ticker];
      const atual = tipoNorm === 'Renda Fixa' && manualTotal != null && !precificadoMercado
        ? manualTotal
        : cotacao != null ? quantidade * cotacao : 0;
      return { ...g, quantidade, investido, precoMedio, atual };
    }).filter(g => g.quantidade > 0);
  }, [transactions, prices, rfManual]);

  const qtdData = useMemo(() => {
    return [...portfolioBase]
      .sort((a, b) => a.quantidade - b.quantidade)
      .map(a => ({ name: a.ticker, quantidade: a.quantidade }));
  }, [portfolioBase]);

  const tipoData = useMemo(() => {
    const map = {};
    portfolioBase.forEach(a => {
      map[a.tipo] = (map[a.tipo] || 0) + a.investido;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [portfolioBase]);

  const tickerData = useMemo(() => {
    let filtered = portfolioBase;
    if (selectedType) filtered = filtered.filter(a => a.tipo === selectedType);
    return [...filtered]
      .sort((a, b) => b.investido - a.investido)
      .map(a => ({ name: a.ticker, value: a.investido }));
  }, [portfolioBase, selectedType]);

  const acoesData = useMemo(() => {
    return [...portfolioBase]
      .filter(a => a.tipo === 'Ação')
      .sort((a, b) => b.investido - a.investido)
      .map(a => ({ name: a.ticker, value: a.investido }));
  }, [portfolioBase]);

  const fiisData = useMemo(() => {
    return [...portfolioBase]
      .filter(a => a.tipo === 'FII')
      .sort((a, b) => b.investido - a.investido)
      .map(a => ({ name: a.ticker, value: a.investido }));
  }, [portfolioBase]);

  const rendaFixaData = useMemo(() => {
    return [...portfolioBase]
      .filter(a => a.tipo === 'Renda Fixa' || a.tipo === 'ETF')
      .sort((a, b) => b.investido - a.investido)
      .map(a => ({ name: a.ticker, value: a.investido }));
  }, [portfolioBase]);

  const internacionalData = useMemo(() => {
    return [...portfolioBase]
      .filter(a => a.tipo === 'Dólar' || a.tipo === 'Euro')
      .sort((a, b) => b.investido - a.investido)
      .map(a => ({ name: a.ticker, value: a.investido }));
  }, [portfolioBase]);

  const corretoraData = useMemo(() => {
    const map = {};
    portfolioBase.forEach(a => {
      const nome = a.corretora || corretoraPorTicker[a.ticker] || 'Outros';
      map[nome] = (map[nome] || 0) + a.atual;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }, [portfolioBase]);

  const corretoraTickerMap = useMemo(() => {
    const map = {};
    portfolioBase.forEach(a => {
      const nome = a.corretora || corretoraPorTicker[a.ticker] || 'Outros';
      if (!map[nome]) map[nome] = [];
      map[nome].push({ ticker: a.ticker, value: a.atual, quantidade: a.quantidade, precoMedio: a.precoMedio });
    });
    return map;
  }, [portfolioBase]);

  const evolData = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      const year = t.ano;
      if (!map[year]) map[year] = 0;
      if (t.operacao === 'Compra') map[year] += t.investido;
      else map[year] -= t.investido;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a - b)
      .map(([name, value]) => ({ name: String(name), value: Math.round(value * 100) / 100 }));
  }, [transactions]);

  const patrimonioEvolData = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      const year = t.ano;
      if (!map[year]) map[year] = 0;
      if (t.operacao === 'Compra') map[year] += t.investido;
      else map[year] -= t.investido;
    });
    let acc = 0;
    return Object.entries(map)
      .sort(([a], [b]) => a - b)
      .map(([name, value]) => {
        acc += value;
        return { name: String(name), value: Math.round(acc * 100) / 100 };
      });
  }, [transactions]);

  const proventosEvolData = useMemo(() => {
    const map = {};
    proventos.forEach(p => {
      const year = p.ano;
      if (!map[year]) map[year] = 0;
      map[year] += (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a - b)
      .map(([name, value]) => ({ name: String(name), value: Math.round(value * 100) / 100 }));
  }, [proventos]);

  const proventosMediaData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const map = {};
    proventos.forEach(p => {
      const year = p.ano;
      if (!map[year]) map[year] = 0;
      map[year] += (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a - b)
      .map(([name, value]) => {
        const y = Number(name);
        const months = y < currentYear ? 12 : y === currentYear ? currentMonth : 12;
        return { name, value: Math.round((value / months) * 100) / 100 };
      });
  }, [proventos]);

  const proventosMonthData = useMemo(() => {
    if (!selectedProventosAno) return [];
    const map = {};
    for (let m = 1; m <= 12; m++) map[m] = 0;
    proventos
      .filter(p => p.ano === selectedProventosAno)
      .forEach(p => {
        const month = Number(p.data.split('/')[1]);
        const value = (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0);
        map[month] += value;
      });
    const months = Object.entries(map).map(([m, value]) => ({
      month: Number(m),
      nome: monthNames[Number(m) - 1],
      value: Math.round(value * 100) / 100,
      isTotal: false,
    }));
    const total = months.reduce((sum, m) => sum + m.value, 0);
    return [...months, { month: 13, nome: 'Total', value: Math.round(total * 100) / 100, isTotal: true }];
  }, [proventos, selectedProventosAno]);

  const proventosTipoChartData = useMemo(() => {
    if (!selectedProventosAnoTipo || selectedProventosTipos.length === 0) return [];
    const tipoMonthMap = {};
    selectedProventosTipos.forEach(tipo => {
      tipoMonthMap[tipo] = {};
      for (let m = 1; m <= 12; m++) tipoMonthMap[tipo][m] = 0;
    });
    proventos
      .filter(p => p.ano === selectedProventosAnoTipo && selectedProventosTipos.includes(normalizeTipo(p.tipo)))
      .forEach(p => {
        const month = Number(p.data.split('/')[1]);
        const value = (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0);
        const normTipo = normalizeTipo(p.tipo);
        tipoMonthMap[normTipo][month] += value;
      });
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const entry = { month: m, nome: monthNames[m - 1] };
      selectedProventosTipos.forEach(tipo => {
        entry[tipo] = Math.round(tipoMonthMap[tipo][m] * 100) / 100;
      });
      entry.total = selectedProventosTipos.reduce((sum, tipo) => sum + (entry[tipo] || 0), 0);
      months.push(entry);
    }
    const totalEntry = { month: 13, nome: 'Total' };
    selectedProventosTipos.forEach(tipo => {
      const total = months.reduce((acc, m) => acc + (m[tipo] || 0), 0);
      totalEntry[tipo] = Math.round(total * 100) / 100;
    });
    totalEntry.total = selectedProventosTipos.reduce((sum, tipo) => sum + (totalEntry[tipo] || 0), 0);
    return [...months, totalEntry];
  }, [proventos, selectedProventosAnoTipo, selectedProventosTipos]);

  const handleTipoCheckbox = useCallback((tipo) => {
    setSelectedProventosTipos(prev =>
      prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]
    );
  }, []);

  const renderMonthLabel = (props) => {
    const { x, y, value } = props;
    return (
      <text x={x} y={y - 10} fill={isLight ? '#000000' : '#FFFFFF'} fontSize={11} fontWeight={700} textAnchor="middle">
        {formatCurrency(value)}
      </text>
    );
  };

  const renderEvolLabelRight = (props) => {
    const { x, y, width, value } = props;
    return (
      <text x={x + width + 6} y={y + 8} fill={isLight ? '#000000' : '#FFFFFF'} fontSize={13} fontWeight={700} textAnchor="start">
        {formatCurrency(value)}
      </text>
    );
  };

  const renderEvolLabel = (props) => {
    const { x, y, width, value } = props;
    return (
      <text x={x + width / 2} y={y - 8} fill={isLight ? '#000000' : '#FFFFFF'} fontSize={13} fontWeight={700} textAnchor="middle">
        {formatCurrency(value)}
      </text>
    );
  };

  const renderPatrimonioLabel = (props) => {
    const { x, y, value } = props;
    return (
      <text x={x} y={y - 18} fill="var(--gold)" fontSize={12} fontWeight={700} textAnchor="middle">
        {formatCurrency(value)}
      </text>
    );
  };

  const renderProventosLabel = (props) => {
    const { x, y, width, value } = props;
    return (
      <text x={x + width / 2} y={y - 8} fill={isLight ? '#000000' : '#FFFFFF'} fontSize={11} fontWeight={700} textAnchor="middle">
        {formatCurrency(value)}
      </text>
    );
  };

  const renderCorretoraBarLabel = (props) => {
    const { x, y, width, value, index } = props;
    const nome = corretoraData[index]?.name || '';
    const total = corretoraData.reduce((s, d) => s + d.value, 0);
    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
    const corretora = corretoras.find(c => c.nome.toLowerCase() === nome.toLowerCase());
    const logoUrl = corretora?.logo_url;
    const logoSize = 28;
    const labelY = y - 38;
    return (
      <g>
        {logoUrl && (
          <image href={logoUrl} x={x + width / 2 - logoSize / 2} y={y + 4} width={logoSize} height={logoSize} />
        )}
        <text x={x + width / 2} y={labelY} fill={isLight ? '#000000' : '#FFF'} fontWeight="bold" fontSize={11} textAnchor="middle">
          {`${pct}%`}
        </text>
        <text x={x + width / 2} y={labelY + 16} fill={C_VERDE} fontSize={11} textAnchor="middle" fontWeight="bold">
          {`${formatCurrency(value)}`}
        </text>
      </g>
    );
  };

  const renderProventosLabelInclinado = (props) => {
    const { x, y, width, value } = props;
    return (
      <text x={x + width / 2} y={y - 8} fill={isLight ? '#000000' : '#FFFFFF'} fontSize={11} fontWeight={700} textAnchor="start" transform={`rotate(-45, ${x + width / 2}, ${y - 8})`}>
        {formatCurrency(value)}
      </text>
    );
  };

  const getBarOpacity = useCallback((item) => {
    const entry = portfolioBase.find(p => p.ticker === item);
    if (selectedTicker) return selectedTicker === item ? 1 : 0.2;
    if (selectedType) return entry?.tipo === selectedType ? 1 : 0.2;
    return 1;
  }, [portfolioBase, selectedTicker, selectedType]);

  const getTipoOpacity = useCallback((type) => {
    if (selectedType) return selectedType === type ? 1 : 0.2;
    if (selectedTicker) {
      const entry = portfolioBase.find(p => p.ticker === selectedTicker);
      return entry?.tipo === type ? 1 : 0.2;
    }
    return 1;
  }, [portfolioBase, selectedTicker, selectedType]);

  const getTickerOpacity = useCallback((ticker) => {
    if (selectedTicker) return selectedTicker === ticker ? 1 : 0.2;
    if (selectedType) {
      const entry = portfolioBase.find(p => p.ticker === ticker);
      return entry?.tipo === selectedType ? 1 : 0.2;
    }
    return 1;
  }, [portfolioBase, selectedTicker, selectedType]);

  const hasFilter = selectedType || selectedTicker;

  const portfolioYearlyReturn = useMemo(() => {
    const yearlyNet = {};
    transactions.forEach(t => {
      yearlyNet[t.ano] = (yearlyNet[t.ano] || 0) + (t.operacao === 'Compra' ? t.investido : -t.investido);
    });
    const years = Object.keys(yearlyNet).map(Number).sort((a, b) => a - b);
    const result = {};
    let cum = 0;
    years.forEach(year => {
      // Se cum > 0, usamos o acumulado inicial dos anos anteriores.
      // Se cum === 0 (primeiro ano), usamos o aporte do próprio ano como base para evitar nulo
      // e refletir a rentabilidade inicial sobre o custo do primeiro ano.
      const startCapital = cum > 0 ? cum : (yearlyNet[year] || 0);
      const dividends = proventos
        .filter(p => p.ano === year)
        .reduce((sum, p) => sum + (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0), 0);
      result[year] = startCapital > 0 ? Math.round((dividends / startCapital) * 10000) / 100 : null;
      cum += yearlyNet[year];
    });
    return result;
  }, [transactions, proventos]);

  const dyHistoryData = useMemo(() =>
    Object.entries(portfolioYearlyReturn)
      .map(([year, value]) => ({ year: String(year), dividends: value == null ? 0 : value }))
      .sort((a, b) => Number(a.year) - Number(b.year)),
    [portfolioYearlyReturn]
  );

  const fluxoCaixaMensal = useMemo(() => {
    const fluxo = new Map();
    transactions.forEach(t => {
      if (!t.data) return;
      const [dia, mes, ano] = String(t.data).split('/').map(Number);
      if (!dia || !mes || !ano) return;
      const key = `${ano}-${String(mes).padStart(2, '0')}`;
      const valor = (t.operacao === 'Compra' ? 1 : -1) * (t.investido || 0);
      fluxo.set(key, (fluxo.get(key) || 0) + valor);
    });
    return [...fluxo.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, valor]) => ({
        mes: key,
        label: `${key.slice(5)}/${key.slice(2, 4)}`,
        aporte: Math.round(valor * 100) / 100,
      }));
  }, [transactions]);

  const comparisonChartData = useMemo(() => {
    const portfolioYears = new Set();
    transactions.forEach(t => portfolioYears.add(t.ano));
    proventos.forEach(p => portfolioYears.add(p.ano));
    if (portfolioYears.size === 0) return [];
    const minPortfolioYear = Math.min(...portfolioYears);
    const maxPortfolioYear = Math.max(...portfolioYears, new Date().getFullYear());
    const allYears = new Set();
    Object.values(mergedIndexHistory).forEach(idx => Object.keys(idx.dados).forEach(y => allYears.add(Number(y))));
    const sorted = [...allYears].sort((a, b) => a - b).filter(y => y >= minPortfolioYear && y <= maxPortfolioYear);
    return sorted.map(year => {
      const entry = { year: String(year) };
      const pfReturn = portfolioYearlyReturn[year];
      if (pfReturn !== undefined && pfReturn !== null) entry['Carteira'] = pfReturn;
      Object.entries(mergedIndexHistory).forEach(([key, idx]) => {
        if (idx.dados[year] !== undefined) entry[key] = idx.dados[year];
      });
      const hasData = entry['Carteira'] !== undefined || selectedIndices.some(idx => entry[idx] !== undefined);
      return hasData ? entry : null;
    }).filter(Boolean);
  }, [portfolioYearlyReturn, selectedIndices, transactions, proventos, mergedIndexHistory]);

  const comparisonAccumulatedData = useMemo(() => {
    if (comparisonChartData.length === 0) return [];
    let portfolioAcc = 100;
    const indexAcc = {};
    Object.keys(mergedIndexHistory).forEach(key => { indexAcc[key] = 100; });
    return comparisonChartData.map(entry => {
      const accEntry = { year: entry.year };
      if (entry.Carteira !== undefined) {
        portfolioAcc *= (1 + entry.Carteira / 100);
        accEntry.Carteira = Math.round(portfolioAcc * 100) / 100;
      }
      selectedIndices.forEach(idx => {
        if (entry[idx] !== undefined) {
          indexAcc[idx] *= (1 + entry[idx] / 100);
          accEntry[idx] = Math.round(indexAcc[idx] * 100) / 100;
        }
      });
      return accEntry;
    });
  }, [comparisonChartData, selectedIndices]);

  const handleIndexCheckbox = useCallback((index) => {
    setSelectedIndices(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  }, []);

  const metricsData = useMemo(() => {
    const benchDados = mergedIndexHistory[metricBenchmark]?.dados;
    if (!benchDados) return null;
    const rows = [];
    comparisonChartData.forEach(entry => {
      const year = Number(entry.year);
      const pf = entry['Carteira'];
      const bench = benchDados[year];
      if (pf == null || bench == null) return;
      rows.push({ year, pf: pf / 100, bench: bench / 100 });
    });
    if (rows.length < 2) return null;

    const pfReturns = rows.map(r => r.pf);
    const benchReturns = rows.map(r => r.bench);

    const cdiData = mergedIndexHistory.CDI?.dados || {};
    const rfList = rows.map(r => cdiData[r.year]).filter(v => v != null);
    const riskFreeAnnual = rfList.length ? rfList.reduce((s, v) => s + v, 0) / rfList.length / 100 : 0;

    let accPf = 1;
    let accBench = 1;
    rows.forEach(r => { accPf *= 1 + r.pf; accBench *= 1 + r.bench; });
    const spanYears = rows[rows.length - 1].year - rows[0].year;

    const hhiValues = portfolioBase
      .map(a => (a.atual != null && a.atual > 0 ? a.atual : a.investido))
      .filter(v => v != null && v > 0);

    const meanPf = mean(pfReturns);
    const stdPf = stdSample(pfReturns);

    return {
      benchmark: metricBenchmark,
      anos: rows.length,
      spanYears,
      cagrPf: spanYears > 0 ? cagr(100, accPf * 100, spanYears) : null,
      cagrBench: spanYears > 0 ? cagr(100, accBench * 100, spanYears) : null,
      trackingErr: trackingError(pfReturns, benchReturns, 1),
      betaVal: beta(pfReturns, benchReturns),
      alpha: jensenAlpha(pfReturns, benchReturns, riskFreeAnnual, 1),
      riskFreeAnnual,
      hhi: hhi(hhiValues),
      meanPf,
      stdPf,
      sharpe:
        meanPf != null && stdPf != null && stdPf > 0
          ? (meanPf - riskFreeAnnual) / stdPf
          : null,
    };
  }, [comparisonChartData, portfolioBase, metricBenchmark]);

  return (
    <div className="graficos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: 16 }}>
      <div className="graficos-subgrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, gridColumn: '1 / -1' }}>
        {tipoData.length > 0 && (
          <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 320 }}>
            <h2 style={{ textAlign: 'center' }}>Distribuição por Tipo</h2>
            <SelectionBadge data={tipoData} selectedName={selectedType} />
            <div style={{ flex: 1, minHeight: 0, perspective: '900px', overflow: 'visible' }}>
              <div style={{ width: '100%', height: '100%', transform: 'rotateX(32deg)', transformOrigin: '50% 45%', transformStyle: 'preserve-3d', overflow: 'visible' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <filter id="pieShadowTipo" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="3" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.5" />
                    </filter>
                  </defs>
                  <Pie
                    data={tipoData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="55%"
                    outerRadius="60%"
                    innerRadius="14%"
                    paddingAngle={0}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {tipoData.map((entry) => (
                      <Cell
                        key={`3d-${entry.name}`}
                        fill={shadeColor(typeColors[entry.name] || 'var(--text-muted)', 0.45)}
                      />
                    ))}
                  </Pie>
                  <Pie
                    data={tipoData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="60%"
                    innerRadius="14%"
                    paddingAngle={0}
                    label={renderLabel(isLight)}
                    labelLine={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
                    activeIndex={pieHover}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => setPieHover(index)}
                    onMouseLeave={() => setPieHover(null)}
                    onClick={(entry) => handleTypeClick(entry.name)}
                  >
                    {tipoData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={typeColors[entry.name] || 'var(--text-muted)'}
                        fillOpacity={getTipoOpacity(entry.name)}
                        stroke={selectedType === entry.name ? selColor : 'transparent'}
                        strokeWidth={selectedType === entry.name ? 2 : 0}
                        cursor="pointer"
                        filter="url(#pieShadowTipo)"
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              </div>
            </div>
            {hasFilter && (
              <div style={{
                position: 'absolute', top: 8, right: 8, zIndex: 10,
                background: 'var(--gold)', color: 'var(--ink)', border: 'none', borderRadius: 6,
                padding: '3px 10px', fontSize: '0.75em', cursor: 'pointer', fontWeight: 700,
              }} onClick={() => { setSelectedType(null); setSelectedTicker(null); }}>
                ✕ LIMPAR
              </div>
            )}
          </div>
        )}

        {tickerData.length > 0 && (
          <div ref={ativoRef} className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 320 }}>
            <h2 style={{ textAlign: 'center' }}>Distribuição por Ativo</h2>
            <SelectionBadge data={tickerData} selectedName={selectedTicker} />
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <filter id="pieShadowAtivo" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="3" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.5" />
                    </filter>
                  </defs>
                  <Pie
                    data={tickerData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="55%"
                    innerRadius="15%"
                    paddingAngle={2}
                    label={renderTickerLabel(isLight)}
                    labelLine={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
                    activeIndex={tickerHover}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => setTickerHover(index)}
                    onMouseLeave={() => setTickerHover(null)}
                    onClick={(entry) => handleTickerClick(entry.name)}
                  >
                    {tickerData.map((entry, idx) => (
                      <Cell
                        key={entry.name}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                        fillOpacity={getTickerOpacity(entry.name)}
                        stroke={selectedTicker === entry.name ? selColor : 'transparent'}
                        strokeWidth={selectedTicker === entry.name ? 2 : 0}
                        cursor="pointer"
                        filter="url(#pieShadowAtivo)"
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {qtdData.length > 0 && (
          <div ref={qtdRef} className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', minHeight: qtdHeight || undefined, gridRow: '1 / span 2' }}>
            <h2 style={{ textAlign: 'center' }}>Quantidade de Ativos</h2>
            <SelectionBadge data={qtdData} selectedName={selectedTicker} valueKey="quantidade" formatFn={(v) => `${v.toLocaleString('pt-BR')} un`} />
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={qtdData} layout="vertical" margin={{ left: 8, right: 30, top: 4, bottom: 4 }} barSize={36} barCategoryGap="50%">
                  <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} padding={{ right: 45 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text)', fontSize: 12 }} axisLine={false} tickLine={false} width={100} interval={0} tickFormatter={(n) => String(n).replace(/ /g, '\u00A0')} />
                  <Tooltip cursor={false} contentStyle={tooltipStyle} formatter={(v) => [v.toLocaleString('pt-BR'), 'Quantidade']} />
                  <Bar dataKey="quantidade" radius={[0, 50, 50, 0]} cursor="pointer" activeBar={{ stroke: '#FFF', strokeWidth: 2, filter: 'brightness(1.15)' }}>
                    {qtdData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={selColor}
                        fillOpacity={getBarOpacity(entry.name)}
                        onClick={() => handleTickerClick(entry.name)}
                      />
                    ))}
                    <LabelList dataKey="quantidade" position="right" fill={selColor} fontSize={12} fontWeight={700} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {(hasFilter && !selectedTicker) && (
              <div style={{
                position: 'absolute', top: 8, right: 8, zIndex: 10,
                background: 'var(--gold)', color: 'var(--ink)', border: 'none', borderRadius: 6,
                padding: '3px 10px', fontSize: '0.75em', cursor: 'pointer', fontWeight: 700,
              }} onClick={() => { setSelectedType(null); setSelectedTicker(null); }}>
                ✕ LIMPAR
              </div>
            )}
          </div>
        )}

        {fiisData.length > 0 && (
          <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 320 }}>
            <h2 style={{ textAlign: 'center' }}>FIIs</h2>
            <SelectionBadge data={fiisData} selectedName={selectedTicker} />
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <filter id="pieShadowFiis" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="3" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.5" />
                    </filter>
                  </defs>
                  <Pie
                    data={fiisData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="55%"
                    innerRadius="15%"
                    paddingAngle={2}
                    label={renderTickerLabel(isLight)}
                    labelLine={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
                    onClick={(entry) => handleTickerClick(entry.name)}
                  >
                    {fiisData.map((entry, idx) => (
                      <Cell
                        key={entry.name}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                        fillOpacity={getTickerOpacity(entry.name)}
                        stroke={selectedTicker === entry.name ? selColor : 'transparent'}
                        strokeWidth={selectedTicker === entry.name ? 2 : 0}
                        cursor="pointer"
                        filter="url(#pieShadowFiis)"
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {rendaFixaData.length > 0 && (
          <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 320 }}>
            <h2 style={{ textAlign: 'center' }}>Renda Fixa / ETF</h2>
            <SelectionBadge data={rendaFixaData} selectedName={selectedTicker} />
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <filter id="pieShadowRF" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="3" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.5" />
                    </filter>
                  </defs>
                  <Pie
                    data={rendaFixaData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="55%"
                    innerRadius="15%"
                    paddingAngle={2}
                    label={renderTickerLabelWithValue(isLight)}
                    labelLine={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
                    onClick={(entry) => handleTickerClick(entry.name)}
                  >
                    {rendaFixaData.map((entry, idx) => (
                      <Cell
                        key={entry.name}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                        fillOpacity={getTickerOpacity(entry.name)}
                        stroke={selectedTicker === entry.name ? selColor : 'transparent'}
                        strokeWidth={selectedTicker === entry.name ? 2 : 0}
                        cursor="pointer"
                        filter="url(#pieShadowRF)"
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 320 }}>
          <h2 style={{ textAlign: 'center' }}>Internacional</h2>
          <SelectionBadge data={internacionalData} selectedName={selectedTicker} />
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  <filter id="pieShadowIntl" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="3" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.5" />
                  </filter>
                </defs>
                <Pie
                  data={internacionalData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius="55%"
                  innerRadius="15%"
                  paddingAngle={2}
                  label={renderTickerLabelWithValue(isLight)}
                  labelLine={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
                  onClick={(entry) => handleTickerClick(entry.name)}
                >
                  {internacionalData.map((entry, idx) => {
                    const entryTipo = portfolioBase.find(p => p.ticker === entry.name)?.tipo;
                    const fill = entryTipo === 'Euro' ? typeColors['Euro'] : INTL_COLORS[idx % INTL_COLORS.length];
                    return (
                      <Cell
                        key={entry.name}
                        fill={fill}
                        fillOpacity={getTickerOpacity(entry.name)}
                        stroke={selectedTicker === entry.name ? selColor : 'transparent'}
                        strokeWidth={selectedTicker === entry.name ? 2 : 0}
                        cursor="pointer"
                        filter="url(#pieShadowIntl)"
                      />
                    );
                  })}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 420 }}>
          <h2 style={{ textAlign: 'center' }}>Por Corretora</h2>
          {selectedCorretora && (
            <div style={{
              position: 'absolute', top: 36, left: 8, zIndex: 10,
              background: 'rgba(0,0,0,0.85)', borderRadius: 8, padding: '8px 14px',
              backdropFilter: 'blur(4px)', maxHeight: 300, overflowY: 'auto',
            }}>
              {(corretoras.find(c => c.nome.toLowerCase() === selectedCorretora.toLowerCase()) || {}).logo_url && (
                <div style={{ textAlign: 'center', marginBottom: 6 }}>
                  <img src={(corretoras.find(c => c.nome.toLowerCase() === selectedCorretora.toLowerCase())).logo_url}
                    alt={`Logo da corretora ${selectedCorretora}`} loading="lazy" decoding="async"
                    style={{ maxHeight: 32, objectFit: 'contain' }} />
                </div>
              )}
              <div style={{ color: C_RF, fontWeight: 700, fontSize: '0.9em', marginBottom: 6 }}>{selectedCorretora}</div>
              {(corretoraTickerMap[selectedCorretora] || []).map(t => (
                <div key={t.ticker} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: '#FFF', fontSize: '0.85em' }}>
                  <span>{t.ticker}</span>
                  <span style={{ color: C_VERDE, fontSize: '1.1em' }}>{formatCurrency(t.value)}</span>
                </div>
              ))}
              <div style={{ marginTop: 4, borderTop: '1px solid #444', paddingTop: 4, display: 'flex', justifyContent: 'space-between', gap: 16, color: '#FFF', fontSize: '0.85em', fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ color: C_VERDE, fontSize: '1.2em' }}>{formatCurrency(corretoraData.find(d => d.name === selectedCorretora)?.value || 0)}</span>
              </div>
              {!showLogoForm && (
                <button onClick={() => {
                  const obj = corretoras.find(c => c.nome.toLowerCase() === selectedCorretora.toLowerCase());
                  setLogoLinkInput(obj?.logo_url || '');
                  setShowLogoForm(true);
                }} style={{
                  marginTop: 6, background: 'transparent', border: '1px solid #555',
                  color: '#BBB', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: '0.75em',
                  width: '100%', textAlign: 'center',
                }}>Editar Logo</button>
              )}
              {showLogoForm && (
                <div style={{ marginTop: 6 }}>
                  <input value={logoLinkInput} onChange={e => setLogoLinkInput(e.target.value)}
                    placeholder="URL da logo" style={{
                    width: '100%', background: '#222', border: '1px solid #555', borderRadius: 4,
                    padding: '4px 6px', color: '#FFF', fontSize: '0.8em', boxSizing: 'border-box',
                  }} />
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <button onClick={() => { setShowLogoForm(false); setLogoLinkInput(''); }} style={{
                      flex: 1, background: 'transparent', border: '1px solid #555',
                      color: '#BBB', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: '0.75em',
                    }}>Cancelar</button>
                    <button onClick={handleSaveLogo} style={{
                      flex: 1, background: C_VERDE, border: 'none',
                      color: '#FFF', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: '0.75em',
                    }}>Salvar</button>
                  </div>
                </div>
              )}
              <button onClick={() => setSelectedCorretora(null)} style={{
                marginTop: 6, background: 'transparent', border: '1px solid #555',
                color: '#BBB', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: '0.75em',
                width: '100%', textAlign: 'center',
              }}>Fechar</button>
            </div>
          )}
          {corretoraData.length > 0 ? (
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={corretoraData} margin={{ left: 20, right: 20, top: 60, bottom: 10 }} barSize={90}>
                  <XAxis dataKey="name" tick={{ fill: isLight ? '#000000' : 'var(--gold-soft)', fontSize: 12, fontWeight: 700 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: isLight ? '#000000' : 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                  <Tooltip cursor={false} contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} cursor="pointer" onClick={(entry) => setSelectedCorretora(prev => prev === entry.name ? null : entry.name)}>
                    <LabelList dataKey="value" content={renderCorretoraBarLabel} />
                    {corretoraData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: 'var(--text-faint)', fontSize: '0.9em' }}>Sem dados de corretora no momento</p>
            </div>
          )}
        </div>

        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 320 }}>
          <h2 style={{ textAlign: 'center' }}>Ações</h2>
          <SelectionBadge data={acoesData} selectedName={selectedTicker} />
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  <filter id="pieShadowAcoes" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="3" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.5" />
                  </filter>
                </defs>
                <Pie
                  data={acoesData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius="55%"
                  innerRadius="15%"
                  paddingAngle={2}
                  label={renderTickerLabel(isLight)}
                  labelLine={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
                  onClick={(entry) => handleTickerClick(entry.name)}
                >
                  {acoesData.map((entry, idx) => (
                    <Cell
                      key={entry.name}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      fillOpacity={getTickerOpacity(entry.name)}
                      stroke={selectedTicker === entry.name ? selColor : 'transparent'}
                      strokeWidth={selectedTicker === entry.name ? 2 : 0}
                      cursor="pointer"
                      filter="url(#pieShadowAcoes)"
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, gridColumn: '1 / -1' }}>
          {proventosEvolData.length > 0 && (
            <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', flex: 1, minHeight: 320 }}>
              <h2 style={{ textAlign: 'center' }}>Evolução dos Proventos Ano a Ano</h2>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={proventosEvolData} margin={{ left: 30, right: 30, top: 30, bottom: 10 }} barSize={60}>
                    <XAxis dataKey="name" tick={{ fill: isLight ? '#000000' : 'var(--text)', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                    <YAxis tick={{ fill: isLight ? '#000000' : 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                    <Tooltip cursor={false} contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#1B2A4A" activeBar={{ stroke: '#FFF', strokeWidth: 2, filter: 'brightness(1.15)' }}>
                      <LabelList dataKey="value" content={renderEvolLabel} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {proventosMediaData.length > 0 && (
            <div ref={mediaRef} className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', flex: 1, minHeight: 320 }}>
              <h2 style={{ textAlign: 'center' }}>Média Mensal dos Proventos Ano a Ano</h2>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={proventosMediaData} layout="vertical" margin={{ left: 30, right: 80, top: 10, bottom: 10 }} barSize={30} barCategoryGap="40%">
                    <XAxis type="number" tick={{ fill: isLight ? '#000000' : 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} padding={{ right: 50 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: isLight ? '#000000' : 'var(--text)', fontSize: 12 }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip cursor={false} contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                    <Bar dataKey="value" radius={[0, 50, 50, 0]} fill={C_VERDE_ESCURO} activeBar={{ stroke: '#FFF', strokeWidth: 2, filter: 'brightness(1.15)' }}>
                      <LabelList dataKey="value" content={renderEvolLabelRight} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, gridColumn: '1 / -1' }}>
        {dyHistoryData.length > 0 && (
          <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', flex: 1, minHeight: 320 }}>
            <h2 style={{ textAlign: 'center' }}>Rentabilidade de Dividendos por Ano</h2>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dyHistoryData} margin={{ left: 30, right: 30, top: 30, bottom: 10 }} barSize={60}>
                  <XAxis dataKey="year" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" tickFormatter={t => `${t}%`} />
                  <Tooltip cursor={false} formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Dividendos']} labelFormatter={(l) => `Ano ${l}`} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="dividends" radius={[8, 8, 0, 0]} fill="#FFD700" activeBar={{ stroke: '#FFF', strokeWidth: 2, filter: 'brightness(1.15)' }}>
                    <LabelList dataKey="dividends" position="top" formatter={(v) => `${Number(v).toFixed(1)}%`} fill="#FFFFFF" fontSize={14} fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {fluxoCaixaMensal.length > 0 && (
          <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', flex: 1, minHeight: 320 }}>
            <h2 style={{ textAlign: 'center' }}>Fluxo de Caixa por Mês</h2>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fluxoCaixaMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                  <YAxis stroke="var(--text-muted)" tickFormatter={t => formatCurrency(t)} />
                  <Tooltip
                    formatter={(v) => [formatCurrency(v), v >= 0 ? 'Aporte líquido' : 'Resgate líquido']}
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
                  />
                  <Bar dataKey="aporte" name="Aporte líquido" fill={C_AZUL} radius={[3, 3, 0, 0]} maxBarSize={18} activeBar={{ stroke: '#FFF', strokeWidth: 2, filter: 'brightness(1.15)' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {proventosAnos.length > 0 && (
        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <span style={{ color: 'var(--text)', fontSize: '0.95em', fontWeight: 600 }}>
              Selecione ao lado o período
            </span>
            <span style={{ color: '#FF0000', fontSize: '2em', lineHeight: 1 }}>➡</span>
            <select
              value={selectedProventosAno || ''}
              onChange={e => setSelectedProventosAno(Number(e.target.value))}
              style={{
                background: 'var(--surface-dark)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6,
                padding: '6px 12px', fontSize: '1em', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {proventosAnos.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <h2 style={{ textAlign: 'center' }}>Proventos Mensais - {selectedProventosAno}</h2>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={proventosMonthData} margin={{ left: 30, right: 30, top: 30, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="nome" tick={{ fill: isLight ? '#000000' : 'var(--gold-soft)', fontSize: 13, fontWeight: 700 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tick={{ fill: isLight ? '#000000' : 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <Tooltip cursor={false} contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} activeBar={{ stroke: '#FFF', strokeWidth: 2, filter: 'brightness(1.15)' }} animationDuration={2000}>
                  {proventosMonthData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.isTotal ? '#FF0000' : C_AZUL} />
                  ))}
                  <LabelList dataKey="value" content={renderProventosLabel} />
                </Bar>
                <Line type="monotone" dataKey="value" stroke="#FF0000" strokeWidth={2} dot={false} animationDuration={2000} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {proventosTiposAnos.length > 0 && uniqueProventosTipos.length > 0 && (
        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <span style={{ color: 'var(--text)', fontSize: '0.95em', fontWeight: 600 }}>
              Selecione ao lado o período
            </span>
            <span style={{ color: '#FF0000', fontSize: '2em', lineHeight: 1 }}>➡</span>
            <select
              value={selectedProventosAnoTipo || ''}
              onChange={e => setSelectedProventosAnoTipo(Number(e.target.value))}
              style={{
                background: 'var(--surface-dark)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6,
                padding: '6px 12px', fontSize: '1em', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {proventosTiposAnos.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <h2 style={{ textAlign: 'center' }}>Proventos por Tipo - {selectedProventosAnoTipo}</h2>
          <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 12 }}>
            <div style={{ width: 160, flexShrink: 0, overflowY: 'auto', padding: '8px 0' }}>
              {uniqueProventosTipos.map(tipo => (
                <label key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: '0.9em', cursor: 'pointer', color: typeColors[tipo] || 'var(--text-soft)' }}>
                  <input
                    type="checkbox"
                    checked={selectedProventosTipos.includes(tipo)}
                    onChange={() => handleTipoCheckbox(tipo)}
                    style={{ accentColor: typeColors[tipo] || C_AZUL }}
                  />
                  {tipo}
                </label>
              ))}
            </div>
            {selectedProventosTipos.length > 0 && proventosTipoChartData.length > 0 ? (
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={proventosTipoChartData} margin={{ left: 30, right: 30, top: 70, bottom: 10 }}>
                    <defs>
                      <filter id="bar3dShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="3" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.5" />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="nome" tick={{ fill: isLight ? '#000000' : 'var(--gold-soft)', fontSize: 13, fontWeight: 700 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                    <YAxis tick={{ fill: isLight ? '#000000' : 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                    <Tooltip cursor={false} contentStyle={tooltipStyle} />
                    {selectedProventosTipos.map(tipo => (
                      <Bar key={tipo} dataKey={tipo} fill={typeColors[tipo] || 'var(--text-muted)'} animationDuration={2000} filter="url(#bar3dShadow)">
                        <LabelList dataKey={tipo} position="top" content={renderProventosLabelInclinado} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: '0.9em' }}>
                Selecione ao menos um tipo de ativo
              </div>
            )}
          </div>
        </div>
      )}

      {uniqueAnos.length > 0 && (
        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <span style={{ color: 'var(--text)', fontSize: '0.95em', fontWeight: 600 }}>
              Selecione o ano desejado
            </span>
            <span style={{ color: C_ACAO, fontSize: '2em', lineHeight: 1 }}>➡</span>
            <select
              value={selectedAno || ''}
              onChange={e => setSelectedAno(Number(e.target.value))}
              style={{
                background: 'var(--surface-dark)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6,
                padding: '6px 12px', fontSize: '1em', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {uniqueAnos.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <h2 style={{ textAlign: 'center' }}>Investimento Mês a Mês - {selectedAno}</h2>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthData} margin={{ left: 30, right: 30, top: 30, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="nome" tick={{ fill: isLight ? '#000000' : 'var(--text)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tick={{ fill: isLight ? '#000000' : 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <Tooltip cursor={false} contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                <Line type="monotone" dataKey="value" stroke={C_ACAO} strokeWidth={3} dot={{ r: 6, fill: C_ACAO, strokeWidth: 2, stroke: C_ACAO }} activeDot={false}>
                  <LabelList dataKey="value" content={renderMonthLabel} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {evolData.length > 0 && (
        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', gridColumn: '1 / -1' }}>
          <h2 style={{ textAlign: 'center' }}>Investimento Ano a Ano</h2>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolData} margin={{ left: 30, right: 30, top: 30, bottom: 10 }} barSize={60}>
                <XAxis dataKey="name" tick={{ fill: isLight ? '#000000' : 'var(--gold-soft)', fontSize: 13, fontWeight: 700 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tick={{ fill: isLight ? '#000000' : 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <Tooltip cursor={false} contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#7B1FA2" activeBar={{ stroke: '#FFF', strokeWidth: 2, filter: 'brightness(1.15)' }}>
                  <LabelList dataKey="value" content={renderEvolLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {patrimonioEvolData.length > 0 && (
        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', gridColumn: '1 / -1' }}>
          <h2 style={{ textAlign: 'center' }}>Evolução do Patrimônio Ano a Ano</h2>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={patrimonioEvolData} margin={{ left: 30, right: 30, top: 30, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--gold-soft)', fontSize: 13, fontWeight: 700 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} padding={{ right: 40 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} padding={{ top: 45 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                <Line type="monotone" dataKey="value" stroke={C_VERDE_ESCURO} strokeWidth={3} dot={{ r: 7, fill: C_VERDE_ESCURO, stroke: C_VERDE_ESCURO, strokeWidth: 0 }} animationDuration={2000}>
                  <LabelList dataKey="value" content={renderPatrimonioLabel} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {comparisonChartData.length > 1 && (
        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', gridColumn: '1 / -1' }}>
          <h2 style={{ textAlign: 'center' }}>Comparativo Carteira vs Índices (% anual)</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9em', color: C_ACAO, fontWeight: 700 }}>
              <span style={{ width: 16, height: 3, background: C_ACAO, borderRadius: 2, display: 'inline-block' }} />
              Carteira
            </span>
            {Object.entries(INDEX_HISTORY).map(([key, val]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9em', cursor: 'pointer', color: val.cor, fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={selectedIndices.includes(key)}
                  onChange={() => handleIndexCheckbox(key)}
                  style={{ accentColor: val.cor }}
                />
                <span style={{ width: 12, height: 3, background: val.cor, borderRadius: 2, display: 'inline-block' }} />
                {key}
              </label>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonChartData} margin={{ left: 30, right: 30, top: 30, bottom: 10 }}>
                <defs>
                  <filter id="lineShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.5" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" tick={{ fill: isLight ? '#000000' : 'var(--gold-soft)', fontSize: 13, fontWeight: 700 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tick={{ fill: isLight ? '#000000' : 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip cursor={false} contentStyle={tooltipStyle} formatter={(v) => [`${v.toFixed(2)}%`]} />
                <Line type="monotone" dataKey="Carteira" stroke={C_ACAO} strokeWidth={3} dot={{ r: 5, fill: C_ACAO, strokeWidth: 0 }} filter="url(#lineShadow)" animationDuration={2000} />
                {selectedIndices.map(idx => (
                  <Line key={idx} type="monotone" dataKey={idx} stroke={INDEX_HISTORY[idx]?.cor || 'var(--text-muted)'} strokeWidth={2} dot={{ r: 4, fill: INDEX_HISTORY[idx]?.cor || 'var(--text-muted)', strokeWidth: 0 }} filter="url(#lineShadow)" animationDuration={2000} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {comparisonAccumulatedData.length > 1 && (
        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', gridColumn: '1 / -1' }}>
          <h2 style={{ textAlign: 'center' }}>Rentabilidade Acumulada (base 100)</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9em', color: C_ACAO, fontWeight: 700 }}>
              <span style={{ width: 16, height: 3, background: C_ACAO, borderRadius: 2, display: 'inline-block' }} />
              Carteira
            </span>
            {Object.entries(INDEX_HISTORY).map(([key, val]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9em', cursor: 'pointer', color: val.cor, fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={selectedIndices.includes(key)}
                  onChange={() => handleIndexCheckbox(key)}
                  style={{ accentColor: val.cor }}
                />
                <span style={{ width: 12, height: 3, background: val.cor, borderRadius: 2, display: 'inline-block' }} />
                {key}
              </label>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonAccumulatedData} margin={{ left: 30, right: 30, top: 30, bottom: 10 }}>
                <defs>
                  <filter id="accShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.5" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" tick={{ fill: isLight ? '#000000' : 'var(--gold-soft)', fontSize: 13, fontWeight: 700 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tick={{ fill: isLight ? '#000000' : 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip cursor={false} contentStyle={tooltipStyle} formatter={(v) => [v.toFixed(2), 'Valor']} />
                <Line type="monotone" dataKey="Carteira" stroke={C_ACAO} strokeWidth={3} dot={{ r: 5, fill: C_ACAO, strokeWidth: 0 }} filter="url(#accShadow)" animationDuration={2000} />
                {selectedIndices.map(idx => (
                  <Line key={idx} type="monotone" dataKey={idx} stroke={INDEX_HISTORY[idx]?.cor || 'var(--text-muted)'} strokeWidth={2} dot={{ r: 4, fill: INDEX_HISTORY[idx]?.cor || 'var(--text-muted)', strokeWidth: 0 }} filter="url(#accShadow)" animationDuration={2000} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {metricsData && (
        <SectionErrorBoundary name="Métricas" gridColumn="1 / -1">
          <RiscoRetornoCard
            metricsData={metricsData}
            benchmark={metricBenchmark}
            onBenchmarkChange={setMetricBenchmark}
          />
        </SectionErrorBoundary>
      )}

    </div>
  );
}

export default Graficos;
