import { useMemo, useState } from 'react';
import { calcularDARFs } from '../../services/irrfCalculations';
import CopyIcon from './shared/CopyIcon';
import StatusBadge from './shared/StatusBadge';

export default function DarfPanel({ ano, transactions, proventos, rfManual }) {
  const darfs = useMemo(() => calcularDARFs(transactions, proventos, rfManual, ano), [transactions, proventos, rfManual, ano]);
  const [datasPagamento, setDatasPagamento] = useState({});

  const atualizarData = (idx, data) => {
    setDatasPagamento((prev) => ({ ...prev, [idx]: data }));
  };

  const totalDARFs = darfs.reduce((s, d) => s + (d.imposto || 0), 0);

  const formatarData = (dataStr) => {
    if (!dataStr) return 'Não informada';
    const d = new Date(dataStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR');
  };

  const calcularProximoVencimento = (dataPagamento) => {
    if (!dataPagamento) return null;
    const d = new Date(dataPagamento + 'T12:00:00');
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ padding: '10px 14px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)', textTransform: 'uppercase' }}>Total DARFs</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#cc3333' }}>{fmt(totalDARFs)}</div>
          <div style={{ fontSize: 11 }}>{darfs.length} DARF(s) a emitir</div>
        </div>
      </div>

      {darfs.length === 0 ? (
        <div style={{ padding: 20, background: '#d4edda', borderRadius: 8, textAlign: 'center', color: '#155724' }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Nenhuma DARF a emitir para {ano}</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Não houve ganho de capital ou day trade tributável neste período.</div>
        </div>
      ) : (
        darfs.map((d, idx) => {
          const dataPgto = datasPagamento[idx];
          const proximoVencimento = calcularProximoVencimento(dataPgto);
          const estaAtrasado = proximoVencimento && new Date(proximoVencimento) < new Date();

          return (
            <div key={idx} style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, color: 'var(--text, #333)' }}>{d.referencia}</h4>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary, #888)', marginTop: 2 }}>
                    Código de Receita: <code>{d.codigoReceita}</code>
                  </div>
                </div>
                <StatusBadge status={d.imposto > 0 ? 'error' : 'ok'}>
                  {d.imposto > 0 ? ' DARF a Emitir' : ' Sem DARF'}
                </StatusBadge>
              </div>

              {d.imposto > 0 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)' }}>Base de Cálculo</div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{fmt(d.lucro)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)' }}>Alíquota</div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{d.aliquota}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)' }}>IR Devido</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#cc3333' }}>{fmt(d.imposto)}</div>
                    </div>
                  </div>

                  {d.observacao && (
                    <div style={{ padding: 8, background: '#fff3cd', borderRadius: 6, fontSize: 12, color: '#856404', marginBottom: 12 }}>
                      ⚠️ {d.observacao}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-secondary, #888)', display: 'block', marginBottom: 2 }}>Data do Pagamento</label>
                      <input
                        type="date"
                        value={dataPgto || ''}
                        onChange={(e) => atualizarData(idx, e.target.value)}
                        style={{
                          padding: '6px 10px',
                          border: '1px solid var(--border, #ddd)',
                          borderRadius: 6,
                          fontSize: 13,
                          background: 'var(--card-bg, #fff)',
                          color: 'var(--text, #333)',
                        }}
                      />
                    </div>
                    {dataPgto && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary, #888)' }}>
                        Próximo vencimento: <strong>{formatarData(proximoVencimento)}</strong>
                        {estaAtrasado && <span style={{ color: '#cc3333', marginLeft: 4 }}> (Atrasado!)</span>}
                      </div>
                    )}
                    <CopyIcon
                      text={`DARF ${d.codigoReceita}\nReferência: ${d.referencia}\nBase: ${fmt(d.lucro)}\nAlíquota: ${d.aliquota}%\nIR: ${fmt(d.imposto)}\nData Pgto: ${formatarData(dataPgto)}`}
                      label="Copiar dados da DARF"
                    />
                  </div>
                </>
              )}
            </div>
          );
        })
      )}

      <div style={{ marginTop: 16, padding: 12, background: '#d1ecf1', borderRadius: 8, fontSize: 12, color: '#0c5460' }}>
        💡 <strong>Como emitir DARF:</strong> Acesse o site da Receita Federal (receita.fazenda.gov.br) → Serviços → DARF.
        Informe o código de receita, período de apuração e o valor. O DARF deve ser pago até o 15º dia útil do mês seguinte ao da apuração.
      </div>
    </div>
  );
}

function fmt(v) {
  if (typeof v !== 'number' || isNaN(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
