import { useMemo, useState, useCallback } from 'react';
import { useTransactions } from '../context/TransactionsContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';

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

const tooltipStyle = {
  background: '#151515', border: '1px solid #2A2A2A', borderRadius: 8,
  fontSize: '0.85em', color: '#E0E0E0',
};

const RADIAN = Math.PI / 180;

function renderLabel({ name, percent, cx, cy, midAngle, outerRadius }) {
  if (percent < 0.04) return null;
  const radius = outerRadius * 1.25;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#BBB" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10}>
      {name} {(percent * 100).toFixed(1)}%
    </text>
  );
}

function renderTickerLabel({ name, percent, cx, cy, midAngle, outerRadius }) {
  const radius = outerRadius * 1.25;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const fs = percent < 0.03 ? 8.5 : percent < 0.06 ? 9 : 10;
  return (
    <text x={x} y={y} fill="#BBB" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={fs}>
      {name} {(percent * 100).toFixed(1)}%
    </text>
  );
}

function Graficos() {
  const { transactions } = useTransactions();
  const [selectedType, setSelectedType] = useState(null);
  const [selectedTicker, setSelectedTicker] = useState(null);

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

  const formatCurrency = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;

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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, height: 'calc(100vh - 180px)' }}>
      {qtdData.length > 0 && (
        <div className="allocation-section" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
          <h2>Quantidade de Ativos</h2>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qtdData} layout="vertical" margin={{ left: 30, right: 50, top: 10, bottom: 10 }}>
                <XAxis type="number" tick={{ fill: '#999', fontSize: 11 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#E0E0E0', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v.toLocaleString('pt-BR'), 'Quantidade']} />
                <Bar dataKey="quantidade" radius={[0, 4, 4, 0]} cursor="pointer">
                  {qtdData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={selColor}
                      fillOpacity={getBarOpacity(entry.name)}
                      onClick={() => handleTickerClick(entry.name)}
                    />
                  ))}
                  <LabelList dataKey="quantidade" position="right" fill={selColor} fontSize={11} fontWeight={700} />
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

      {tipoData.length > 0 && (
        <div className="allocation-section" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
          <h2>Distribuição por Tipo</h2>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tipoData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius="65%"
                  innerRadius="15%"
                  paddingAngle={3}
                  label={renderLabel}
                  labelLine={{ stroke: '#555', strokeWidth: 1 }}
                >
                  {tipoData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={typeColors[entry.name] || '#666'}
                      fillOpacity={getTipoOpacity(entry.name)}
                      stroke={selectedType === entry.name ? selColor : 'transparent'}
                      strokeWidth={selectedType === entry.name ? 2 : 0}
                      cursor="pointer"
                      onClick={() => handleTypeClick(entry.name)}
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
        <div className="allocation-section" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
          <h2>Distribuição por Ativo</h2>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tickerData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius="58%"
                  innerRadius="15%"
                  paddingAngle={2}
                  label={renderTickerLabel}
                  labelLine={{ stroke: '#555', strokeWidth: 1 }}
                >
                  {tickerData.map((entry, idx) => (
                    <Cell
                      key={entry.name}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      fillOpacity={getTickerOpacity(entry.name)}
                      stroke={selectedTicker === entry.name ? selColor : 'transparent'}
                      strokeWidth={selectedTicker === entry.name ? 2 : 0}
                      cursor="pointer"
                      onClick={() => handleTickerClick(entry.name)}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default Graficos;
