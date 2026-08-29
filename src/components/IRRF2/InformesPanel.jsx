import { useState, useMemo } from 'react';
import { agruparPorInstituicao } from '../../services/irrfCalculations';
import { useIRRF2 } from '../../context/IRRF2Context';
import CopyIcon from './shared/CopyIcon';

export default function InformesPanel({ ano, proventos }) {
  const { irrfData, atualizarInforme } = useIRRF2();
  const informesSalvos = irrfData?.declaracoes?.[ano]?.informes || {};
  const proventosAno = useMemo(() => proventos.filter((p) => (p.date || p.data) && new Date(p.date || p.data).getFullYear() === ano), [proventos, ano]);
  const agrupado = useMemo(() => agruparPorInstituicao(proventosAno), [proventosAno]);

  const [valoresInformados, setValoresInformados] = useState(() => {
    const init = {};
    for (const [inst, dados] of Object.entries(informesSalvos)) {
      init[inst] = {
        dividendos: dados.dividendos_informado || '',
        jcp: dados.jcp_informado || '',
        rendimento: dados.rendimento_informado || '',
      };
    }
    return init;
  });

  const [expandedInst, setExpandedInst] = useState(null);

  const toggleExpand = (inst) => {
    setExpandedInst(expandedInst === inst ? null : inst);
  };

  const salvarInforme = (inst) => {
    const vals = valoresInformados[inst] || {};
    atualizarInforme(ano, inst, {
      dividendos_calculado: agrupado[inst]?.dividendos || 0,
      jcp_calculado: agrupado[inst]?.jcp || 0,
      rendimento_calculado: agrupado[inst]?.rendimento || 0,
      dividendos_informado: parseFloat(vals.dividendos) || 0,
      jcp_informado: parseFloat(vals.jcp) || 0,
      rendimento_informado: parseFloat(vals.rendimento) || 0,
      conferido: true,
    });
  };

  const totalCalculado = Object.values(agrupado).reduce((s, v) => s + v.total, 0);
  const totalInformado = Object.values(valoresInformados).reduce((s, v) => {
    return s + (parseFloat(v.dividendos) || 0) + (parseFloat(v.jcp) || 0) + (parseFloat(v.rendimento) || 0);
  }, 0);
  const divergencia = totalInformado > 0 ? Math.abs(totalCalculado - totalInformado) : 0;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ padding: '10px 14px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)', textTransform: 'uppercase' }}>Calculado pelo Sistema</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(totalCalculado)}</div>
        </div>
        <div style={{ padding: '10px 14px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)', textTransform: 'uppercase' }}>Informado pelo Usuário</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{totalInformado > 0 ? fmt(totalInformado) : '—'}</div>
        </div>
        <div style={{ padding: '10px 14px', background: divergencia > 0 ? '#f8d7da' : 'var(--card-bg, #fff)', border: `1px solid ${divergencia > 0 ? '#f5c6cb' : 'var(--border, #eee)'}`, borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)', textTransform: 'uppercase' }}>Divergência</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: divergencia > 0 ? '#cc3333' : '#00cc66' }}>
            {divergencia > 0 ? fmt(divergencia) : '—'}
          </div>
        </div>
      </div>

      {Object.entries(agrupado).map(([inst, vals]) => {
        const expandido = expandedInst === inst;
        const informado = valoresInformados[inst] || {};
        const divLocal = Math.abs(vals.total - ((parseFloat(informado.dividendos) || 0) + (parseFloat(informado.jcp) || 0) + (parseFloat(informado.rendimento) || 0)));

        return (
          <div key={inst} style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
            <div
              onClick={() => toggleExpand(inst)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: expandido ? '1px solid var(--border, #eee)' : 'none' }}
            >
              <span style={{ fontSize: 12, color: 'var(--text-secondary, #888)' }}>{expandido ? '▼' : '▶'}</span>
              <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{inst}</span>
              <span style={{ fontSize: 13 }}>{fmt(vals.total)}</span>
              {divLocal > 0.01 && <span style={{ color: '#cc3333', fontSize: 11 }}>Divergência: {fmt(divLocal)}</span>}
              <CopyIcon text={`${inst}: ${fmt(vals.total)}`} label="Copiar" />
            </div>
            {expandido && (
              <div style={{ padding: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)', marginBottom: 4 }}>Dividendos (Calculado)</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(vals.dividendos)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)', marginBottom: 4 }}>JCP (Calculado)</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(vals.jcp)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)', marginBottom: 4 }}>Rendimento (Calculado)</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(vals.rendimento)}</div>
                  </div>
                </div>

                <div style={{ marginTop: 12, padding: 12, background: 'var(--card-header, #f5f5f5)', borderRadius: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text, #333)' }}>Valores do Informe de Rendimento</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-secondary, #888)', display: 'block', marginBottom: 2 }}>Dividendos</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={fmt(vals.dividendos)}
                        value={informado.dividendos || ''}
                        onChange={(e) => setValoresInformados((prev) => ({ ...prev, [inst]: { ...prev[inst], dividendos: e.target.value } }))}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border, #ddd)', borderRadius: 4, fontSize: 12, background: 'var(--card-bg, #fff)', color: 'var(--text, #333)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-secondary, #888)', display: 'block', marginBottom: 2 }}>JCP</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={fmt(vals.jcp)}
                        value={informado.jcp || ''}
                        onChange={(e) => setValoresInformados((prev) => ({ ...prev, [inst]: { ...prev[inst], jcp: e.target.value } }))}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border, #ddd)', borderRadius: 4, fontSize: 12, background: 'var(--card-bg, #fff)', color: 'var(--text, #333)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-secondary, #888)', display: 'block', marginBottom: 2 }}>Rendimento</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={fmt(vals.rendimento)}
                        value={informado.rendimento || ''}
                        onChange={(e) => setValoresInformados((prev) => ({ ...prev, [inst]: { ...prev[inst], rendimento: e.target.value } }))}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border, #ddd)', borderRadius: 4, fontSize: 12, background: 'var(--card-bg, #fff)', color: 'var(--text, #333)' }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => salvarInforme(inst)}
                    style={{ marginTop: 8, padding: '6px 14px', background: 'var(--accent, #007bff)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                  >
                    Salvar e Conferir
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {Object.keys(agrupado).length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary, #888)', fontSize: 13 }}>
          Nenhum provento encontrado para {ano}. Cadastre proventos na página de Proventos.
        </div>
      )}
    </div>
  );
}

function fmt(v) {
  if (typeof v !== 'number' || isNaN(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
