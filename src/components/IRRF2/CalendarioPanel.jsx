export default function CalendarioPanel({ ano }) {
  const IRPF_ANO = ano + 1;
  const PRAZO_ENTREGA = `${IRPF_ANO}-05-30`;
  const hoje = new Date();
  const dataEntrega = new Date(PRAZO_ENTREGA + 'T12:00:00');
  const diasRestantes = Math.ceil((dataEntrega - hoje) / (1000 * 60 * 60 * 24));

  const eventos = [
    {
      titulo: `Entrega da DIRPF ${IRPF_ANO}`,
      data: PRAZO_ENTREGA,
      descricao: `Declaração do Imposto de Renda Pessoa Física referente ao ano-calendário ${ano}`,
      tipo: 'obrigatorio',
      prazo: true,
    },
    {
      titulo: `Início da Malha Fiscal`,
      data: `${IRPF_ANO}-06-15`,
      descricao: 'Receita Federal inicia processamento e eventual malha da DIRPF',
      tipo: 'info',
    },
    {
      titulo: `1º Parcela do IR ${IRPF_ANO}`,
      data: `${IRPF_ANO}-05-30`,
      descricao: 'Primeira parcela do imposto de renda (se aplicável)',
      tipo: 'financeiro',
    },
    {
      titulo: `2º Parcela do IR ${IRPF_ANO}`,
      data: `${IRPF_ANO}-06-30`,
      descricao: 'Segunda parcela do imposto de renda (se aplicável)',
      tipo: 'financeiro',
    },
    {
      titulo: 'DARF — Ganho de Capital',
      data: null,
      descricao: 'Prazo: até o 15º dia útil do mês seguinte ao da operação de venda com ganho',
      tipo: 'darf',
    },
    {
      titulo: 'DARF — Day Trade',
      data: null,
      descricao: 'Prazo: até o 15º dia útil do mês seguinte ao da operação de day trade com ganho',
      tipo: 'darf',
    },
    {
      titulo: 'Informe de Rendimentos — Bolsa',
      data: `${ano + 1}-02-28`,
      descricao: 'Prazo para as corretoras/bolsas disponibilizarem informes de rendimento',
      tipo: 'info',
    },
    {
      titulo: 'Informe de Rendimentos — Bancos',
      data: `${ano + 1}-02-28`,
      descricao: 'Prazo para bancos e instituições financeiras disponibilizarem informes',
      tipo: 'info',
    },
  ];

  const eventosOrdenados = [...eventos].sort((a, b) => {
    if (!a.data) return 1;
    if (!b.data) return -1;
    return new Date(a.data) - new Date(b.data);
  });

  const formatarData = (dataStr) => {
    if (!dataStr) return 'Conforme apuração';
    const d = new Date(dataStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const tipoCores = {
    obrigatorio: { bg: '#f8d7da', color: '#721c24', border: '#f5c6cb' },
    financeiro: { bg: '#fff3cd', color: '#856404', border: '#ffeeba' },
    darf: { bg: '#d1ecf1', color: '#0c5460', border: '#bee5eb' },
    info: { bg: '#e2e3e5', color: '#383d41', border: '#d6d8db' },
  };

  return (
    <div>
      <div style={{ padding: '14px 16px', background: diasRestantes > 30 ? '#d4edda' : diasRestantes > 0 ? '#fff3cd' : '#f8d7da', borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 24 }}>{diasRestantes > 30 ? '✅' : diasRestantes > 0 ? '⏰' : '🚨'}</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: diasRestantes > 30 ? '#155724' : diasRestantes > 0 ? '#856404' : '#721c24' }}>
            {diasRestantes > 0 ? `${diasRestantes} dias restantes para entrega` : 'Prazo encerrado!'}
          </div>
          <div style={{ fontSize: 13, color: diasRestantes > 30 ? '#155724' : diasRestantes > 0 ? '#856404' : '#721c24' }}>
            Prazo de entrega: {formatarData(PRAZO_ENTREGA)}
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8, overflow: 'hidden' }}>
        {eventosOrdenados.map((ev, i) => {
          const cor = tipoCores[ev.tipo] || tipoCores.info;
          const isPast = ev.data && new Date(ev.data + 'T12:00:00') < hoje;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderBottom: i < eventosOrdenados.length - 1 ? '1px solid var(--border, #eee)' : 'none', opacity: isPast ? 0.5 : 1 }}>
              <div style={{ minWidth: 100, fontSize: 12, color: 'var(--text-secondary, #888)', paddingTop: 2 }}>
                {ev.data ? formatarData(ev.data) : 'Flexível'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #333)' }}>{ev.titulo}</span>
                  {ev.prazo && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: cor.bg, color: cor.color, fontWeight: 600 }}>OBRIGATÓRIO</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary, #888)' }}>{ev.descricao}</div>
              </div>
              {isPast && <span style={{ fontSize: 11, color: 'var(--text-secondary, #888)' }}>Passou</span>}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#d1ecf1', borderRadius: 8, fontSize: 12, color: '#0c5460' }}>
        💡 <strong>Lembre-se:</strong> Guarde todos os comprovantes e informes de rendimento por pelo menos 5 anos.
        O prazo de prescrição da Receita Federal é de 5 anos para fiscalização.
      </div>
    </div>
  );
}
