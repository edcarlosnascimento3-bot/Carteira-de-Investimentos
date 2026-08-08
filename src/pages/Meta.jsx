import { useState, useMemo } from 'react';
import { formatCurrency } from '../services/format';
import { useProventos } from '../context/ProventosContext';
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

function Meta() {
  const { proventos } = useProventos();
  const [anoFiltro, setAnoFiltro] = useState(() => String(new Date().getFullYear()));
  const [tipoFiltro, setTipoFiltro] = useState('');

  const uniqueAnos = useMemo(() => {
    return [...new Set(proventos.map(p => p.ano))].sort((a, b) => b - a);
  }, [proventos]);

  const uniqueTipos = useMemo(() => {
    return [...new Set(proventos.map(p => normalizeTipo(p.tipo)))].sort();
  }, [proventos]);

  const effectiveTipo = tipoFiltro || uniqueTipos[0] || '';

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
    return Object.values(groups).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [proventos, anoFiltro, effectiveTipo]);

  const handleTipoClick = (tipo) => setTipoFiltro(tipo);

  return (
    <div>
      <h1>Meta</h1>
      <p className="subtitle">
        Definição e acompanhamento de metas financeiras
      </p>

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
          <option value="">Todos os anos</option>
          {uniqueAnos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <span style={{ color: '#FF3333', fontSize: '1.2em', lineHeight: 1 }}>➡</span>
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
            return (
              <div key={card.ticker} style={{
                background: 'var(--card-bg)',
                border: `3px solid ${border}`,
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
                          borderBottom: '1px dotted rgba(255,255,255,0.25)',
                          margin: '0 2px',
                        }} />
                        <span style={{
                          color: valor > 0 ? '#00E676' : 'var(--text-faint)',
                          fontWeight: valor > 0 ? 600 : 400,
                          whiteSpace: 'nowrap',
                        }}>
                          {formatCurrency(valor)}
                        </span>
                      </div>
                    );
                  })}
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
