import { useState, useMemo, useEffect } from 'react';
import { formatCurrency, formatNumber } from '../services/format';
import { useProventos } from '../context/ProventosContext';
import { useTransactions } from '../context/TransactionsContext';
import LogoImage from '../components/LogoImage';

const typeIcons = {
  'Ação': '📈',
  'FII': '🏗️',
  'Renda Fixa': '🔒',
};

const typeBorders = {
  'Ação': '#FF3333',        // Vermelho
  'FII': '#00CC66',         // Verde
  'Renda Fixa': '#FFD700',  // Amarelo
};

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function normalizeTipo(tipo) {
  const t = String(tipo || '').trim();
  return /^fii/i.test(t) ? 'FII' : t;
}

function proventoTotal(p) {
  return (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0);
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

const META_STORAGE = 'investimento_metas';

function loadMetas() {
  try {
    const raw = localStorage.getItem(META_STORAGE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function Meta() {
  const { proventos } = useProventos();
  const { transactions } = useTransactions();
  const isLight = useLightTheme();
  const [anoFiltro, setAnoFiltro] = useState(() => String(new Date().getFullYear()));
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [metas, setMetas] = useState(loadMetas);
  const [focusedInput, setFocusedInput] = useState(null);

  const uniqueAnos = useMemo(() => {
    return [...new Set(proventos.map(p => p.ano))].sort((a, b) => b - a);
  }, [proventos]);

  const uniqueTipos = useMemo(() => {
    return [...new Set(proventos.map(p => normalizeTipo(p.tipo)))].sort();
  }, [proventos]);

  const effectiveTipo = tipoFiltro || uniqueTipos[0] || '';

  const quantidades = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (!map[t.ticker]) map[t.ticker] = 0;
      if (t.operacao === 'Compra') map[t.ticker] += t.quantidade;
      else if (t.operacao === 'Venda') map[t.ticker] -= t.quantidade;
    });
    return map;
  }, [transactions]);

  const cards = useMemo(() => {
    const selectedAno = String(anoFiltro);
    const groups = {};
    proventos.forEach(p => {
      const tipo = normalizeTipo(p.tipo);
      if (tipo !== effectiveTipo) return;
      if (String(p.ano) !== selectedAno) return;
      if (!groups[p.ticker]) groups[p.ticker] = { ticker: p.ticker, nome: p.nome || p.ticker, tipo, meses: new Array(12).fill(0) };
      const partes = (p.data || '').split('/');
      const mesIdx = partes.length >= 2 ? parseInt(partes[1], 10) - 1 : -1;
      const total = proventoTotal(p);
      if (mesIdx >= 0 && mesIdx < 12) {
        groups[p.ticker].meses[mesIdx] += total;
      }
    });
    return Object.values(groups)
      .map(g => {
        const total = g.meses.reduce((s, v) => s + v, 0);
        const mesesComValor = g.meses.filter(v => v > 0).length;
        const media = mesesComValor > 0 ? total / mesesComValor : 0;
        return { ...g, total, mesesComValor, media };
      })
      .sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [proventos, anoFiltro, effectiveTipo, quantidades]);

  const handleTipoClick = (tipo) => setTipoFiltro(tipo);

  const currentMedia = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    let total = 0;
    proventos.forEach(p => {
      if (Number(p.ano) === currentYear) {
        total += proventoTotal(p);
      }
    });
    return Math.round((total / currentMonth) * 100) / 100;
  }, [proventos]);

  const metasGlobal = metas['__global__'] || {};
  const desejadoGlobal = parseFloat(metasGlobal.recebimento) || 0;
  const atingidoPct = desejadoGlobal > 0 ? (currentMedia / desejadoGlobal) * 100 : 0;
  const summaryBorder = typeBorders[effectiveTipo] || '#C8B800';

  const metaKey = (ticker) => ticker;

  const handleMetaChange = (ticker, campo, valor) => {
    setMetas(prev => {
      const next = { ...prev, [metaKey(ticker)]: { ...prev[metaKey(ticker)], [campo]: valor } };
      try {
        localStorage.setItem(META_STORAGE, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const inputStyle = {
    background: 'var(--surface-dark)',
    color: 'var(--text)',
    border: '1px solid #C8B800AA',
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: '0.82em',
    fontFamily: 'inherit',
    outline: 'none',
    width: 90,
    textAlign: 'right',
  };

  const barStyle = (pct, cor) => ({
    height: 12,
    borderRadius: 6,
    background: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginTop: 5,
  });

  const progressColor = (pct) => {
    if (pct <= 0) return null;
    if (pct <= 25) return '#FF3333';
    if (pct <= 50) return '#2979FF';
    if (pct <= 75) return '#FF9800';
    if (pct <= 95) return '#FFD700';
    return '#00E676';
  };

  const formatDesejadoInput = (raw, focused) => {
    if (!raw) return '';
    const num = parseFloat(raw);
    if (isNaN(num)) return '';
    return focused ? num.toFixed(2) : formatCurrency(num);
  };

  const parseDesejadoInput = (text) => {
    const digits = text.replace(/\D/g, '');
    if (!digits) return '';
    const cents = parseInt(digits, 10);
    return (cents / 100).toFixed(2);
  };

  const globalDesejadoFocused = focusedInput === 'global-desejado';
  const globalDesejadoDisplay = formatDesejadoInput(metasGlobal.recebimento, globalDesejadoFocused);

  return (
    <div className="page-meta">
      <h1>Meta</h1>
      <p className="subtitle">
        Definição e acompanhamento de metas financeiras
      </p>

      <div className="summary-widgets">
        <div className="widget-card">
          <div className="card-content">
            <div className="label" style={{ color: '#C8B800', whiteSpace: 'nowrap' }}>MÉDIA MENSAL DOS PROVENTOS</div>
            <div className="value" style={{ color: '#00E676' }}>{formatCurrency(currentMedia)}</div>
          </div>
          <div className="card-icon icon-pulse" style={{ fontSize: 36 }}>💵</div>
        </div>

        <div className="widget-card">
          <div className="card-content" style={{ flex: 1 }}>
            <div className="label">VALOR MENSAL DESEJADO</div>
            <input
              type="text"
              inputMode="decimal"
              value={globalDesejadoDisplay}
              placeholder="R$ 0,00"
              onChange={e => handleMetaChange('__global__', 'recebimento', parseDesejadoInput(e.target.value))}
              onFocus={() => setFocusedInput('global-desejado')}
              onBlur={() => setFocusedInput(null)}
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', fontSize: '1.1em', padding: '6px 10px', textAlign: 'left' }}
            />
          </div>
          <div className="card-icon icon-float" style={{ fontSize: 36 }}>🎯</div>
        </div>

        <div className="widget-card">
          <div className="card-content">
            <div className="label">PERCENTUAL ATINGIDO</div>
            <div className="value" style={{ color: '#C8B800' }}>
              {desejadoGlobal > 0 ? `${formatNumber(atingidoPct, 0)}%` : '—'}
            </div>
            {desejadoGlobal > 0 && atingidoPct > 0 && (
              <div style={{ ...barStyle(Math.min(100, atingidoPct), summaryBorder), height: 8, marginTop: 6 }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, atingidoPct)}%`,
                  borderRadius: 4,
                  background: progressColor(atingidoPct),
                  transition: 'width 0.4s ease',
                }} />
              </div>
            )}
          </div>
          <div className="card-icon icon-bounce" style={{ fontSize: 36 }}>📊</div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
      }}>
        <span style={{ color: 'var(--text)', fontSize: '0.9em' }}>
          Selecione o ano desejado
        </span>
        <span style={{ color: '#FF3333', fontSize: '1.2em', lineHeight: 1 }}>➡</span>
        <select
          value={anoFiltro}
          onChange={e => setAnoFiltro(e.target.value)}
          style={{
            background: 'var(--surface-dark)',
            color: 'var(--text)',
            border: '1px solid #C8B800AA',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: '0.85em',
            fontFamily: 'inherit',
            cursor: 'pointer',
            outline: 'none',
            minWidth: 100,
            textAlign: 'center',
            textAlignLast: 'center',
          }}
        >
          {uniqueAnos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <span style={{ color: 'var(--text)', fontSize: '0.9em' }}>
          Selecione o tipo
        </span>
        <span style={{ color: '#FF3333', fontSize: '1.2em', lineHeight: 1 }}>➡</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {uniqueTipos.map(tipo => {
            const selected = effectiveTipo === tipo;
            return (
              <button
                key={tipo}
                onClick={() => handleTipoClick(tipo)}
                style={{
                  background: selected ? '#C8B800' : 'var(--surface-dark)',
                  color: selected ? '#000' : 'var(--text)',
                  border: selected ? '1px solid #C8B800' : '1px solid #C8B800AA',
                  borderRadius: 999,
                  padding: '5px 14px',
                  fontSize: '0.82em',
                  fontFamily: 'inherit',
                  fontWeight: selected ? 700 : 500,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {tipo}
              </button>
            );
          })}
        </div>
      </div>

      {proventos.length === 0 ? (
        <div className="page-placeholder" style={{ height: '60%' }}>
          <div className="icon">🎯</div>
          <h2>Meta</h2>
          <p>Nenhum provento encontrado. Adicione registros na página Proventos.</p>
        </div>
      ) : cards.length === 0 ? (
        <div className="page-placeholder" style={{ height: '60%' }}>
          <div className="icon">🎯</div>
          <h2>Meta</h2>
          <p>Sem proventos para {effectiveTipo} em {anoFiltro}.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 14,
          marginTop: 20,
          marginBottom: 20,
        }}>
          {cards.map(card => {
            const border = typeBorders[card.tipo] || 'var(--text-faint)';
            const cardBorder = effectiveTipo === 'FII' ? '#375623' : border;
            const metasCard = metas[metaKey(card.ticker)] || {};
            const metaVal = parseFloat(metasCard.meta) || 0;
            const cotas = quantidades[card.ticker] || 0;
            const metaPct = metaVal > 0 ? Math.min(100, (cotas / metaVal) * 100) : 0;
            const cotasFaltando = metaVal > 0 ? Math.max(0, metaVal - cotas) : 0;
            return (
              <div key={card.ticker} style={{
                background: 'var(--card-bg)',
                border: `3px solid ${cardBorder}`,
                borderRadius: 18,
                padding: 16,
                boxShadow: 'var(--card-shadow)',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 12,
                }}>
                  <LogoImage
                    ticker={card.ticker}
                    fallback={typeIcons[card.tipo] || '📄'}
                    size={46}
                    style={{ borderRadius: 10 }}
                  />
                  <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1em' }}>
                    {card.ticker}
                  </div>
                </div>

                <div>
                  {monthNames.map((nome, i) => {
                    const valor = card.meses[i];
                    return (
                      <div key={nome} style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 6,
                        padding: '2.5px 0',
                        fontSize: '0.82em',
                      }}>
                        <span style={{ color: 'var(--text-muted)' }}>{nome}</span>
                        <span style={{
                          flex: 1,
                          borderBottom: '1px dotted var(--text-muted)',
                          margin: '0 2px',
                        }} />
                        <span style={{
                          color: valor > 0 ? '#00E676' : 'var(--text-faint)',
                          fontWeight: valor > 0 ? 700 : 400,
                          whiteSpace: 'nowrap',
                        }}>
                          {formatCurrency(valor)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 14 }} />

                <div style={{ borderBottom: '1px dotted var(--text-muted)', width: '100%' }} />

                <div style={{ marginTop: 14 }} />

                  <div style={{ fontSize: '0.82em' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', flexWrap: 'wrap', marginBottom: 14 }}>
                      <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '1.1em' }}>Cotas</span>
                      <span style={{ color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '1.1em' }}>
                        {formatNumber(quantidades[card.ticker] || 0, 0)}
                      </span>
                      <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>Meta</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={metasCard.meta || ''}
                        placeholder="0"
                        onChange={e => handleMetaChange(card.ticker, 'meta', e.target.value.replace(/\D/g, ''))}
                        style={{ ...inputStyle, minWidth: 48, maxWidth: 72 }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ ...barStyle(metaPct, border), flex: 1, marginTop: 0 }}>
                        {metaPct > 0 && (
                          <div style={{
                            height: '100%',
                            width: `${metaPct}%`,
                            borderRadius: 6,
                            background: progressColor(metaPct),
                            transition: 'width 0.4s ease',
                          }} />
                        )}
                      </div>
                      <span style={{
                        color: '#C8B800',
                        fontWeight: 700,
                        fontSize: '0.85em',
                        whiteSpace: 'nowrap',
                      }}>
                        {metaVal > 0 ? `${formatNumber(metaPct, 0)}%` : ''}
                      </span>
                    </div>
                    {metaVal > 0 && (
                      <div style={{ fontSize: '0.72em', color: 'var(--text-faint)', marginTop: 3 }}>
                        {cotasFaltando > 0
                          ? `Faltam ${formatNumber(cotasFaltando, 0)} cotas para atingir a meta`
                          : 'Meta atingida'}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '3px 0' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Média recebida</span>
                    <span style={{ color: '#00E676', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {formatCurrency(card.media)}
                    </span>
                  </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Meta;
