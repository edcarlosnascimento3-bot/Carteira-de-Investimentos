import { CHECKLIST_ITENS } from '../../services/irrfConstants';

export default function ChecklistPanel({ progresso, checklistData, onToggle }) {
  const categorias = {
    bens: { label: 'Bens e Direitos', icone: '🏠' },
    operacoes: { label: 'Operações em Bolsa', icone: '📋' },
    renda_fixa: { label: 'Renda Fixa', icone: '🔒' },
    fundos: { label: 'Fundos', icone: '📊' },
    cripto: { label: 'Criptoativos', icone: '₿' },
    exterior: { label: 'Exterior', icone: '🌎' },
    proventos: { label: 'Proventos', icone: '💰' },
    isentos: { label: 'Rendimentos Isentos', icone: '💚' },
    darf: { label: 'DARF', icone: '🏦' },
    informes: { label: 'Informes', icone: '📄' },
  };

  const agrupado = {};
  for (const item of CHECKLIST_ITENS) {
    const cat = item.categoria;
    if (!agrupado[cat]) agrupado[cat] = [];
    const autoDetectado = progresso[item.id] || false;
    const manualMarcado = checklistData[item.id] || false;
    agrupado[cat].push({ ...item, autoDetectado, manualMarcado, checked: autoDetectado || manualMarcado });
  }

  const totalItens = CHECKLIST_ITENS.length;
  const totalConcluidos = CHECKLIST_ITENS.filter((item) => progresso[item.id] || checklistData[item.id]).length;
  const percentual = Math.round((totalConcluidos / totalItens) * 100);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #333)' }}>
            Progresso: {totalConcluidos}/{totalItens}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: percentual >= 80 ? '#00cc66' : percentual >= 50 ? '#ccaa00' : '#cc3333' }}>
            {percentual}%
          </span>
        </div>
        <div style={{ height: 8, background: 'var(--border, #eee)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${percentual}%`, background: percentual >= 80 ? '#00cc66' : percentual >= 50 ? '#ccaa00' : '#cc3333', borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
      </div>

      {Object.entries(agrupado).map(([catKey, itens]) => {
        const cat = categorias[catKey] || { label: catKey, icone: '📌' };
        return (
          <div key={catKey} style={{ marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-secondary, #888)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{cat.icone}</span> {cat.label}
            </h4>
            {itens.map((item) => (
              <label
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  background: 'var(--card-bg, #fff)',
                  border: '1px solid var(--border, #eee)',
                  borderRadius: 6,
                  marginBottom: 4,
                  cursor: 'pointer',
                  opacity: item.autoDetectado ? 0.7 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => onToggle(item.id, !item.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, color: 'var(--text, #333)', flex: 1 }}>{item.label}</span>
                {item.autoDetectado && (
                  <span style={{ fontSize: 11, color: '#00cc66', fontWeight: 600 }}>Auto-detectado</span>
                )}
              </label>
            ))}
          </div>
        );
      })}
    </div>
  );
}
