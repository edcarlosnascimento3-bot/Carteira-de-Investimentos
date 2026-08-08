import { useState, useMemo } from 'react';
import { useProventos } from '../context/ProventosContext';

function Meta() {
  const { proventos } = useProventos();
  const [anoFiltro, setAnoFiltro] = useState('');

  const uniqueAnos = useMemo(() => {
    return [...new Set(proventos.map(p => p.ano))].sort((a, b) => b - a);
  }, [proventos]);

  return (
    <div>
      <h1>Meta</h1>
      <p className="subtitle">
        Definição e acompanhamento de metas financeiras
      </p>

      <div style={{
        display: 'flex',
        alignItems: 'center',
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
      </div>

      <div className="page-placeholder" style={{ height: '60%' }}>
        <div className="icon">🎯</div>
        <h2>Meta</h2>
        <p>
          {proventos.length === 0
            ? 'Nenhum provento encontrado. Adicione registros na página Proventos.'
            : anoFiltro
              ? `Metas para o ano ${anoFiltro}`
              : 'Definição e acompanhamento de metas financeiras'}
        </p>
      </div>
    </div>
  );
}

export default Meta;
