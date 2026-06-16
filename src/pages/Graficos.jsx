import { useMemo, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { useTransactions } from '../context/TransactionsContext';
import { useProventos } from '../context/ProventosContext';
import { formatCurrency } from '../services/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList, LineChart, Line, CartesianGrid, Sector } from 'recharts';

const typeColors = {
  'Ação': '#FF3333',
  'FII': '#00CC66',
  'Renda Fixa': '#C8B800',
  'Dólar': '#008844',
  'Criptoativo': '#333333',
  'Ouro': '#FFD700',
  'Euro': '#9933FF',
};

const CHART_COLORS = ['#C8B800','#CC8800','#0099CC','#CC44CC','#00BB66','#FF5555','#3399FF','#FF8800','#66CC00','#9933FF','#FFD700','#00CCCC'];

const corretoraPorTicker = {
  BBAS3: 'C6', TRXF11: 'C6', GARE11: 'C6', LTBX11: 'C6', XPML11: 'C6',
  SOFISA: 'SOFISA',
  RBOP11: 'XP INVESTIMENTOS', FGAA11: 'XP INVESTIMENTOS',
  MXRF11: 'XP INVESTIMENTOS', VSLH11: 'XP INVESTIMENTOS',
  VGHF11: 'XP INVESTIMENTOS', VGIP11: 'XP INVESTIMENTOS',
  KNCR11: 'XP INVESTIMENTOS',
  TAEE3: 'RICO', ITSA4: 'RICO', PETR4: 'RICO', VALE3: 'RICO',
  AMER3: 'RICO', BBDC3: 'RICO', BBDC4: 'RICO', BBSE3: 'RICO',
  BEES3: 'RICO', BRAP3: 'RICO', CMIN3: 'RICO', COCA34: 'RICO',
  ELET3: 'RICO', GOAU3: 'RICO', GOAU4: 'RICO', OIBR3: 'RICO',
  SANB3: 'RICO', SAPR3: 'RICO', TAEE11: 'RICO',
  DÓLAR: 'WISE', EURO: 'WISE',
};

const INDEX_HISTORY = {
  IBOVESPA: { cor: '#3399FF', dados: { 2018: 15.0, 2019: 31.6, 2020: 2.9, 2021: -11.9, 2022: 4.7, 2023: 22.3, 2024: -10.4, 2025: 8.0 } },
  IFIX: { cor: '#00CC66', dados: { 2018: 8.2, 2019: 15.7, 2020: 0.8, 2021: -4.9, 2022: 8.2, 2023: 18.5, 2024: 12.0, 2025: 5.0 } },
  IPCA: { cor: '#C8B800', dados: { 2018: 3.75, 2019: 4.31, 2020: 4.52, 2021: 10.06, 2022: 5.79, 2023: 4.62, 2024: 4.83, 2025: 5.0 } },
  CDI: { cor: '#9933FF', dados: { 2018: 6.42, 2019: 5.96, 2020: 2.76, 2021: 4.43, 2022: 12.38, 2023: 13.04, 2024: 10.80, 2025: 8.0 } },
};

const tooltipStyle = {
  background: '#151515', border: '1px solid #2A2A2A', borderRadius: 8,
  fontSize: '0.85em', color: '#E0E0E0',
};

const RADIAN = Math.PI / 180;

function renderLabel({ name, percent, cx, cy, midAngle, outerRadius }) {
  const radius = outerRadius * 1.2;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const pct = (percent * 100).toFixed(1);
  return (
    <text x={x} y={y} fill="#BBB" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
      {`${name} ${pct}%`}
    </text>
  );
}

function renderCorretoraLabel({ name, value, percent, cx, cy, midAngle, outerRadius }) {
  const radius = outerRadius * 1.3;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const pct = (percent * 100).toFixed(1);
  const anchor = x > cx ? 'start' : 'end';
  return (
    <text x={x} y={y} textAnchor={anchor} dominantBaseline="central" fontSize={12}>
      <tspan x={x} dy="-6" fill="#FFF" fontWeight="bold">{`${name} ${pct}%`}</tspan>
      <tspan x={x} dy="14" fill="#4CAF50">{`(${formatCurrency(value)})`}</tspan>
    </text>
  );
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

function renderTickerLabel({ name, percent, cx, cy, midAngle, outerRadius }) {
  const radius = outerRadius * 1.25;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const fs = percent < 0.03 ? 10 : percent < 0.06 ? 11 : 12;
  return (
    <text x={x} y={y} fill="#BBB" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={fs}>
      {name} {(percent * 100).toFixed(1)}%
    </text>
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
      <span style={{ color: '#C8B800', fontWeight: 700, fontSize: '0.9em' }}>{selectedName}</span>
      <span style={{ color: '#FFF', fontSize: '0.85em' }}>
        {formatFn ? formatFn(val) : formatCurrency(val)}
      </span>
    </div>
  );
}

function Graficos() {
  const { transactions } = useTransactions();
  const { proventos } = useProventos();
  const [selectedType, setSelectedType] = useState(null);
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [selectedAno, setSelectedAno] = useState(null);
  const [selectedProventosAno, setSelectedProventosAno] = useState(null);
  const [selectedProventosAnoTipo, setSelectedProventosAnoTipo] = useState(null);
  const [selectedProventosTipos, setSelectedProventosTipos] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(['IBOVESPA', 'IFIX', 'IPCA', 'CDI']);
  const [pieHover, setPieHover] = useState(null);
  const [tickerHover, setTickerHover] = useState(null);
  const [selectedCorretora, setSelectedCorretora] = useState(null);
  const ativoRef = useRef(null);
  const mediaRef = useRef(null);
  const qtdRef = useRef(null);
  const [qtdHeight, setQtdHeight] = useState(null);

  useLayoutEffect(() => {
    if (ativoRef.current && mediaRef.current) {
      const h = ativoRef.current.offsetHeight + 16 + mediaRef.current.offsetHeight;
      setQtdHeight(prev => prev === h ? prev : h);
    }
  });

  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const normalizeTipo = (tipo) => tipo === 'FII Agro' ? 'FII' : tipo;

  const uniqueAnos = useMemo(() => {
    const anos = [...new Set(transactions.map(t => t.ano))].sort((a, b) => b - a);
    if (anos.length > 0 && selectedAno === null) setSelectedAno(anos[0]);
    return anos;
  }, [transactions]);

  const proventosAnos = useMemo(() => {
    const anos = [...new Set(proventos.map(p => p.ano))].sort((a, b) => b - a);
    if (anos.length > 0 && selectedProventosAno === null) setSelectedProventosAno(anos[0]);
    return anos;
  }, [proventos]);

  const proventosTiposAnos = useMemo(() => {
    const anos = [...new Set(proventos.map(p => p.ano))].sort((a, b) => b - a);
    if (anos.length > 0 && selectedProventosAnoTipo === null) setSelectedProventosAnoTipo(anos[0]);
    return anos;
  }, [proventos]);

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


  const selColor = '#C8B800';

  const handleTypeClick = useCallback((type) => {
    setSelectedType(prev => prev === type ? null : type);
    setSelectedTicker(null);
  }, []);

  const handleTickerClick = useCallback((ticker) => {
    setSelectedTicker(prev => prev === ticker ? null : ticker);
  }, []);

  const portfolioBase = useMemo(() => {
    let manualAtual = {};
    try { manualAtual = JSON.parse(localStorage.getItem('investimento_rf_manual')) || {}; } catch {}

    const groups = {};
    transactions.forEach(t => {
      if (!groups[t.ticker]) {
        groups[t.ticker] = {
          ticker: t.ticker, ativo: t.ativo, tipo: t.tipo.replace(/Fii/g, 'FII'),
          qtdCompra: 0, qtdVenda: 0, investidoCompra: 0, investidoVenda: 0,
        };
      }
      const g = groups[t.ticker];
      if (t.operacao === 'Compra') { g.qtdCompra += t.quantidade; g.investidoCompra += t.investido; }
      else { g.qtdVenda += t.quantidade; g.investidoVenda += t.investido; }
    });

    return Object.values(groups).map(g => {
      const quantidade = g.qtdCompra - g.qtdVenda;
      const investido = g.investidoCompra - g.investidoVenda;
      return { ...g, quantidade, investido };
    }).filter(g => g.quantidade > 0);
  }, [transactions]);

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
      .filter(a => a.tipo === 'Renda Fixa')
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
      const nome = corretoraPorTicker[a.ticker] || 'Outros';
      map[nome] = (map[nome] || 0) + a.investido;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }, [portfolioBase]);

  const corretoraTickerMap = useMemo(() => {
    const map = {};
    portfolioBase.forEach(a => {
      const nome = corretoraPorTicker[a.ticker] || 'Outros';
      if (!map[nome]) map[nome] = [];
      map[nome].push({ ticker: a.ticker, value: a.investido, quantidade: a.quantidade, precoMedio: a.precoMedio });
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
      <text x={x} y={y - 10} fill="#FFFFFF" fontSize={11} fontWeight={700} textAnchor="middle">
        {formatCurrency(value)}
      </text>
    );
  };

  const renderEvolLabelRight = (props) => {
    const { x, y, width, value } = props;
    return (
      <text x={x + width + 6} y={y + 8} fill="#FFFFFF" fontSize={13} fontWeight={700} textAnchor="start">
        {formatCurrency(value)}
      </text>
    );
  };

  const renderEvolLabel = (props) => {
    const { x, y, width, value } = props;
    return (
      <text x={x + width / 2} y={y - 8} fill="#FFFFFF" fontSize={13} fontWeight={700} textAnchor="middle">
        {formatCurrency(value)}
      </text>
    );
  };

  const renderProventosLabel = (props) => {
    const { x, y, width, value } = props;
    return (
      <text x={x + width / 2} y={y - 8} fill="#FFFFFF" fontSize={11} fontWeight={700} textAnchor="middle">
        {formatCurrency(value)}
      </text>
    );
  };

  const renderProventosLabelInclinado = (props) => {
    const { x, y, width, value } = props;
    return (
      <text x={x + width / 2} y={y - 8} fill="#FFFFFF" fontSize={11} fontWeight={700} textAnchor="start" transform={`rotate(-45, ${x + width / 2}, ${y - 8})`}>
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

  const comparisonChartData = useMemo(() => {
    const portfolioYears = new Set();
    transactions.forEach(t => portfolioYears.add(t.ano));
    proventos.forEach(p => portfolioYears.add(p.ano));
    if (portfolioYears.size === 0) return [];
    const minPortfolioYear = Math.min(...portfolioYears);
    const maxPortfolioYear = Math.max(...portfolioYears);
    const allYears = new Set();
    Object.values(INDEX_HISTORY).forEach(idx => Object.keys(idx.dados).forEach(y => allYears.add(Number(y))));
    const sorted = [...allYears].sort((a, b) => a - b).filter(y => y >= minPortfolioYear && y <= maxPortfolioYear);
    return sorted.map(year => {
      const entry = { year: String(year) };
      const pfReturn = portfolioYearlyReturn[year];
      if (pfReturn !== undefined && pfReturn !== null) entry['Carteira'] = pfReturn;
      Object.entries(INDEX_HISTORY).forEach(([key, idx]) => {
        if (idx.dados[year] !== undefined) entry[key] = idx.dados[year];
      });
      const hasData = entry['Carteira'] !== undefined || selectedIndices.some(idx => entry[idx] !== undefined);
      return hasData ? entry : null;
    }).filter(Boolean);
  }, [portfolioYearlyReturn, selectedIndices, transactions, proventos]);

  const comparisonAccumulatedData = useMemo(() => {
    if (comparisonChartData.length === 0) return [];
    let portfolioAcc = 100;
    const indexAcc = {};
    Object.keys(INDEX_HISTORY).forEach(key => { indexAcc[key] = 100; });
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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, gridColumn: '1 / -1' }}>
        {tipoData.length > 0 && (
          <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 320 }}>
            <h2 style={{ textAlign: 'center' }}>Distribuição por Tipo</h2>
            <SelectionBadge data={tipoData} selectedName={selectedType} />
            <div style={{ flex: 1, minHeight: 0 }}>
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
                    cy="50%"
                    outerRadius="60%"
                    innerRadius="14%"
                    paddingAngle={3}
                    label={renderLabel}
                    labelLine={{ stroke: '#555', strokeWidth: 1 }}
                    activeIndex={pieHover}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => setPieHover(index)}
                    onMouseLeave={() => setPieHover(null)}
                    onClick={(entry) => handleTypeClick(entry.name)}
                  >
                    {tipoData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={typeColors[entry.name] || '#666'}
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
            {hasFilter && (
              <div style={{
                position: 'absolute', top: 8, right: 8, zIndex: 10,
                background: '#C8B800', color: '#0A0A0A', border: 'none', borderRadius: 6,
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
                    label={renderTickerLabel}
                    labelLine={{ stroke: '#555', strokeWidth: 1 }}
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
          <div ref={qtdRef} className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', gridRow: '1 / 3', gridColumn: '3', minHeight: qtdHeight || undefined }}>
            <h2 style={{ textAlign: 'center' }}>Quantidade de Ativos</h2>
            <SelectionBadge data={qtdData} selectedName={selectedTicker} valueKey="quantidade" formatFn={(v) => `${v.toLocaleString('pt-BR')} un`} />
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={qtdData} layout="vertical" margin={{ left: 24, right: 30, top: 4, bottom: 4 }} barSize={36} barCategoryGap="50%">
                  <XAxis type="number" tick={{ fill: '#999', fontSize: 10 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#E0E0E0', fontSize: 13 }} axisLine={false} tickLine={false} width={40} />
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
                background: '#C8B800', color: '#0A0A0A', border: 'none', borderRadius: 6,
                padding: '3px 10px', fontSize: '0.75em', cursor: 'pointer', fontWeight: 700,
              }} onClick={() => { setSelectedType(null); setSelectedTicker(null); }}>
                ✕ LIMPAR
              </div>
            )}
          </div>
        )}

        {proventosEvolData.length > 0 && (
          <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', gridRow: '2', gridColumn: '1' }}>
            <h2 style={{ textAlign: 'center' }}>Evolução dos Proventos Ano a Ano</h2>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={proventosEvolData} margin={{ left: 30, right: 30, top: 30, bottom: 10 }} barSize={60}>
                  <XAxis dataKey="name" tick={{ fill: '#E0E0E0', fontSize: 12 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} />
                  <YAxis tick={{ fill: '#999', fontSize: 11 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} />
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
          <div ref={mediaRef} className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', gridRow: '2', gridColumn: '2' }}>
            <h2 style={{ textAlign: 'center' }}>Média Mensal dos Proventos Ano a Ano</h2>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={proventosMediaData} layout="vertical" margin={{ left: 30, right: 80, top: 10, bottom: 10 }} barSize={30} barCategoryGap="40%">
                  <XAxis type="number" tick={{ fill: '#999', fontSize: 11 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#E0E0E0', fontSize: 12 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip cursor={false} contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="value" radius={[0, 50, 50, 0]} fill="#2E7D32" activeBar={{ stroke: '#FFF', strokeWidth: 2, filter: 'brightness(1.15)' }}>
                    <LabelList dataKey="value" content={renderEvolLabelRight} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

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
                  label={renderTickerLabel}
                  labelLine={{ stroke: '#555', strokeWidth: 1 }}
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
                  label={renderTickerLabel}
                  labelLine={{ stroke: '#555', strokeWidth: 1 }}
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

        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 320 }}>
          <h2 style={{ textAlign: 'center' }}>Renda Fixa</h2>
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
                  label={renderTickerLabel}
                  labelLine={{ stroke: '#555', strokeWidth: 1 }}
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
                  label={renderTickerLabel}
                  labelLine={{ stroke: '#555', strokeWidth: 1 }}
                  onClick={(entry) => handleTickerClick(entry.name)}
                >
                  {internacionalData.map((entry, idx) => (
                    <Cell
                      key={entry.name}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      fillOpacity={getTickerOpacity(entry.name)}
                      stroke={selectedTicker === entry.name ? selColor : 'transparent'}
                      strokeWidth={selectedTicker === entry.name ? 2 : 0}
                      cursor="pointer"
                      filter="url(#pieShadowIntl)"
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 320 }}>
          <h2 style={{ textAlign: 'center' }}>Por Corretora</h2>
          {selectedCorretora && (
            <div style={{
              position: 'absolute', top: 36, left: 8, zIndex: 10,
              background: 'rgba(0,0,0,0.85)', borderRadius: 8, padding: '8px 14px',
              backdropFilter: 'blur(4px)', maxHeight: 240, overflowY: 'auto',
            }}>
              <div style={{ color: '#C8B800', fontWeight: 700, fontSize: '0.9em', marginBottom: 6 }}>{selectedCorretora}</div>
              {(corretoraTickerMap[selectedCorretora] || []).map(t => (
                <div key={t.ticker} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: '#FFF', fontSize: '0.85em' }}>
                  <span>{t.ticker}</span>
                  <span style={{ color: '#4CAF50' }}>{formatCurrency(t.value)}</span>
                </div>
              ))}
              <div style={{ marginTop: 4, borderTop: '1px solid #444', paddingTop: 4, display: 'flex', justifyContent: 'space-between', gap: 16, color: '#FFF', fontSize: '0.85em', fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ color: '#4CAF50' }}>{formatCurrency(corretoraData.find(d => d.name === selectedCorretora)?.value || 0)}</span>
              </div>
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
                <PieChart>
                  <defs>
                    <filter id="pieShadowCorr" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="3" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.5" />
                    </filter>
                  </defs>
                  <Pie data={corretoraData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="55%" innerRadius="15%" paddingAngle={2} startAngle={-20} label={renderCorretoraLabel} labelLine={{ stroke: '#555', strokeWidth: 1 }} onClick={(entry) => setSelectedCorretora(prev => prev === entry.name ? null : entry.name)}>
                    {corretoraData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} filter="url(#pieShadowCorr)" cursor="pointer" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#666', fontSize: '0.9em' }}>Sem dados de corretora no momento</p>
            </div>
          )}
        </div>
      </div>

      {uniqueAnos.length > 0 && (
        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <span style={{ color: '#E0E0E0', fontSize: '0.95em', fontWeight: 600 }}>
              Selecione o ano desejado
            </span>
            <span style={{ color: '#FF3333', fontSize: '2em', lineHeight: 1 }}>➡</span>
            <select
              value={selectedAno || ''}
              onChange={e => setSelectedAno(Number(e.target.value))}
              style={{
                background: '#0D0D0D', color: '#E0E0E0', border: '1px solid #2A2A2A', borderRadius: 6,
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
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="nome" tick={{ fill: '#E0E0E0', fontSize: 11 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} />
                <YAxis tick={{ fill: '#999', fontSize: 11 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} />
                <Tooltip cursor={false} contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                <Line type="monotone" dataKey="value" stroke="#FF3333" strokeWidth={3} dot={{ r: 6, fill: '#FF3333', strokeWidth: 2, stroke: '#FF3333' }} activeDot={false}>
                  <LabelList dataKey="value" content={renderMonthLabel} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {evolData.length > 0 && (
        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', gridColumn: '1 / -1' }}>
          <h2 style={{ textAlign: 'center' }}>Evolução Do Patrimônio Ano a Ano</h2>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolData} margin={{ left: 30, right: 30, top: 30, bottom: 10 }} barSize={60}>
                <XAxis dataKey="name" tick={{ fill: '#FFD700', fontSize: 13, fontWeight: 700 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} />
                <YAxis tick={{ fill: '#999', fontSize: 11 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} />
                <Tooltip cursor={false} contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#990000" activeBar={{ stroke: '#FFF', strokeWidth: 2, filter: 'brightness(1.15)' }}>
                  <LabelList dataKey="value" content={renderEvolLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {proventosAnos.length > 0 && (
        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <span style={{ color: '#E0E0E0', fontSize: '0.95em', fontWeight: 600 }}>
              Selecione ao lado o período
            </span>
            <span style={{ color: '#FF0000', fontSize: '2em', lineHeight: 1 }}>➡</span>
            <select
              value={selectedProventosAno || ''}
              onChange={e => setSelectedProventosAno(Number(e.target.value))}
              style={{
                background: '#0D0D0D', color: '#E0E0E0', border: '1px solid #2A2A2A', borderRadius: 6,
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
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="nome" tick={{ fill: '#FFD700', fontSize: 13, fontWeight: 700 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} />
                <YAxis tick={{ fill: '#999', fontSize: 11 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} />
                <Tooltip cursor={false} contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} activeBar={{ stroke: '#FFF', strokeWidth: 2, filter: 'brightness(1.15)' }} animationDuration={2000}>
                  {proventosMonthData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.isTotal ? '#FF0000' : '#4285F4'} />
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
            <span style={{ color: '#E0E0E0', fontSize: '0.95em', fontWeight: 600 }}>
              Selecione ao lado o período
            </span>
            <span style={{ color: '#FF0000', fontSize: '2em', lineHeight: 1 }}>➡</span>
            <select
              value={selectedProventosAnoTipo || ''}
              onChange={e => setSelectedProventosAnoTipo(Number(e.target.value))}
              style={{
                background: '#0D0D0D', color: '#E0E0E0', border: '1px solid #2A2A2A', borderRadius: 6,
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
                <label key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: '0.9em', cursor: 'pointer', color: typeColors[tipo] || '#E0E0E0' }}>
                  <input
                    type="checkbox"
                    checked={selectedProventosTipos.includes(tipo)}
                    onChange={() => handleTipoCheckbox(tipo)}
                    style={{ accentColor: typeColors[tipo] || '#4285F4' }}
                  />
                  {tipo}
                </label>
              ))}
            </div>
            {selectedProventosTipos.length > 0 && proventosTipoChartData.length > 0 ? (
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={proventosTipoChartData} margin={{ left: 30, right: 30, top: 30, bottom: 10 }}>
                    <defs>
                      <filter id="bar3dShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="3" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.5" />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                    <XAxis dataKey="nome" tick={{ fill: '#FFD700', fontSize: 13, fontWeight: 700 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} />
                    <YAxis tick={{ fill: '#999', fontSize: 11 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} />
                    <Tooltip cursor={false} contentStyle={tooltipStyle} />
                    {selectedProventosTipos.map(tipo => (
                      <Bar key={tipo} dataKey={tipo} fill={typeColors[tipo] || '#666'} animationDuration={2000} filter="url(#bar3dShadow)">
                        <LabelList dataKey={tipo} position="top" content={renderProventosLabelInclinado} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '0.9em' }}>
                Selecione ao menos um tipo de ativo
              </div>
            )}
          </div>
        </div>
      )}

      {comparisonChartData.length > 1 && (
        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', gridColumn: '1 / -1' }}>
          <h2 style={{ textAlign: 'center' }}>Comparativo Carteira vs Índices (% anual)</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9em', color: '#FF3333', fontWeight: 700 }}>
              <span style={{ width: 16, height: 3, background: '#FF3333', borderRadius: 2, display: 'inline-block' }} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="year" tick={{ fill: '#FFD700', fontSize: 13, fontWeight: 700 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} />
                <YAxis tick={{ fill: '#999', fontSize: 11 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip cursor={false} contentStyle={tooltipStyle} formatter={(v) => [`${v.toFixed(2)}%`]} />
                <Line type="monotone" dataKey="Carteira" stroke="#FF3333" strokeWidth={3} dot={{ r: 5, fill: '#FF3333', strokeWidth: 0 }} filter="url(#lineShadow)" animationDuration={2000} />
                {selectedIndices.map(idx => (
                  <Line key={idx} type="monotone" dataKey={idx} stroke={INDEX_HISTORY[idx]?.cor || '#666'} strokeWidth={2} dot={{ r: 4, fill: INDEX_HISTORY[idx]?.cor || '#666', strokeWidth: 0 }} filter="url(#lineShadow)" animationDuration={2000} />
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
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9em', color: '#FF3333', fontWeight: 700 }}>
              <span style={{ width: 16, height: 3, background: '#FF3333', borderRadius: 2, display: 'inline-block' }} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="year" tick={{ fill: '#FFD700', fontSize: 13, fontWeight: 700 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} />
                <YAxis tick={{ fill: '#999', fontSize: 11 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip cursor={false} contentStyle={tooltipStyle} formatter={(v) => [v.toFixed(2), 'Valor']} />
                <Line type="monotone" dataKey="Carteira" stroke="#FF3333" strokeWidth={3} dot={{ r: 5, fill: '#FF3333', strokeWidth: 0 }} filter="url(#accShadow)" animationDuration={2000} />
                {selectedIndices.map(idx => (
                  <Line key={idx} type="monotone" dataKey={idx} stroke={INDEX_HISTORY[idx]?.cor || '#666'} strokeWidth={2} dot={{ r: 4, fill: INDEX_HISTORY[idx]?.cor || '#666', strokeWidth: 0 }} filter="url(#accShadow)" animationDuration={2000} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default Graficos;
