import React, { useMemo } from 'react';
import { useTransactions } from '../context/TransactionsContext';
import { useProventos } from '../context/ProventosContext';
import '../styles/globals.css';

function CalendarioRendimentos() {
  const { transactions } = useTransactions();
  const { proventos } = useProventos();
  
  // Quantidade total de cada ativo
  const quantidades = useMemo(() => {
    const qtd = {};
    transactions.forEach(t => {
      if (!qtd[t.ticker]) qtd[t.ticker] = 0;
      if (t.operacao === 'Compra') qtd[t.ticker] += Number(t.quantidade) || 0;
      else qtd[t.ticker] -= Number(t.quantidade) || 0;
    });
    return qtd;
  }, [transactions]);

  // Extrai os tickers que o usuário realmente possui
  const meusAtivos = useMemo(() => {
    return Object.keys(quantidades).filter(ticker => quantidades[ticker] > 0);
  }, [quantidades]);

  // Eventos pesquisados na internet
  const eventosBase = [
    { data: '2026-05-04', ativo: 'ITUB4', tipo: 'JCP Mensal', valorCotacao: 0.015 },
    { data: '2026-05-15', ativo: 'HGLG11', tipo: 'Rendimento', valorCotacao: 1.10 },
    { data: '2026-05-20', ativo: 'PETR4', tipo: 'Dividendos (1ª Parc.)', valorCotacao: 0 },
    { data: '2026-05-20', ativo: 'VGIP11', tipo: 'Rendimento', valorCotacao: 1.08 },
    { data: '2026-05-15', ativo: 'VSLH11', tipo: 'Rendimento', valorCotacao: 0.025 },
    { data: '2026-05-10', ativo: 'BBAS3', tipo: 'JCP (Estimado)' },
    { data: '2026-05-15', ativo: 'MXRF11', tipo: 'Rendimento', valorCotacao: 0.10 },
    { data: '2026-05-15', ativo: 'BTLG11', tipo: 'Rendimento' },
    { data: '2026-05-15', ativo: 'KNRI11', tipo: 'Rendimento' },
    { data: '2026-05-15', ativo: 'XPLG11', tipo: 'Rendimento' },
    { data: '2026-05-15', ativo: 'CPTS11', tipo: 'Rendimento' }
  ];

  // Mescla os eventos pesquisados com os que já estão lançados no ProventosContext para o mês atual
  const eventosCombinados = useMemo(() => {
    // 1. Extrai proventos do contexto e converte a data de DD/MM/YYYY para YYYY-MM-DD
    const lancados = proventos.map(p => {
      if (!p.data) return null;
      const [dia, mes, ano] = p.data.split('/');
      if (!dia || !mes || !ano) return null;
      
      let tipo = 'Provento';
      let valor = null;
      
      if (p.dividendos > 0) { tipo = 'Dividendos'; valor = `R$ ${p.dividendos.toFixed(2).replace('.', ',')}`; }
      else if (p.jcp > 0) { tipo = 'JCP'; valor = `R$ ${p.jcp.toFixed(2).replace('.', ',')}`; }
      else if (p.rendimento > 0) { tipo = 'Rendimento'; valor = `R$ ${p.rendimento.toFixed(2).replace('.', ',')}`; }
      else if (p.reembolso > 0) { tipo = 'Reembolso'; valor = `R$ ${p.reembolso.toFixed(2).replace('.', ',')}`; }
      
      return {
        data: `${ano}-${mes}-${dia}`,
        ativo: p.ticker,
        tipo: tipo + (p.observacao ? ` (${p.observacao})` : ''),
        valor: valor
      };
    }).filter(Boolean);

    const ativosLancadosDoMes = new Set(
      lancados.filter(l => l.data.startsWith('2026-05')).map(l => l.ativo)
    );

    // 2. Pega os pesquisados filtrados para a carteira (ignorando os que já têm lançamento manual)
    const pesquisados = eventosBase
      .filter(evt => meusAtivos.includes(evt.ativo) && !ativosLancadosDoMes.has(evt.ativo))
      .map(evt => {
        let valorFormatado = null;
        if (evt.valorCotacao !== undefined && evt.valorCotacao > 0) {
          const total = evt.valorCotacao * (quantidades[evt.ativo] || 0);
          valorFormatado = `R$ ${total.toFixed(2).replace('.', ',')}`;
        } else if (evt.valorCotacao === 0) {
          valorFormatado = 'A definir';
        }
        return { ...evt, valor: valorFormatado };
      });
    
    // 3. Junta tudo (removemos duplicatas de mesma data e ativo por precaução)
    const combined = [...pesquisados, ...lancados];
    const map = new Map();
    combined.forEach(evt => {
      const key = `${evt.data}_${evt.ativo}`;
      map.set(key, evt);
    });
    
    return Array.from(map.values());
  }, [meusAtivos, proventos, quantidades]);

  // Filtra apenas eventos do mês atual (maio 2026) para facilitar a visualização se houver mais dados
  const eventosDoMes = eventosCombinados.filter(evt => evt.data.startsWith('2026-05'));

  const currentDate = new Date(2026, 4, 1); // Maio de 2026
  const diasNoMes = new Date(2026, 5, 0).getDate();
  const primeiroDiaSemana = currentDate.getDay(); // 0 = Domingo, 1 = Segunda, etc.

  const dias = [];
  for (let i = 0; i < primeiroDiaSemana; i++) {
    dias.push(null); // dias vazios no inicio do mês
  }
  for (let i = 1; i <= diasNoMes; i++) {
    dias.push(i);
  }

  // Helper para verificar se tem evento no dia
  const eventosNoDia = (dia) => {
    if (!dia) return [];
    const dataStr = `2026-05-${dia.toString().padStart(2, '0')}`;
    return eventosDoMes.filter(e => e.data === dataStr);
  };

  // Ordena os eventos por data (crescente) para exibir na lista
  const eventosDoMesOrdenados = [...eventosDoMes].sort((a, b) => new Date(a.data) - new Date(b.data));

  return (
    <div className="calendario-container">
      <div className="calendario-main">
        <div className="calendario-header">
          <h3>Maio 2026</h3>
        </div>
        
        <div className="calendario-grid">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
            <div key={dia} className="calendario-dia-semana">{dia}</div>
          ))}
          
          {dias.map((dia, index) => {
            const evts = eventosNoDia(dia);
            const hasEvent = evts.length > 0;
            
            return (
              <div key={index} className={`calendario-celula ${dia ? 'dia-ativo' : 'dia-vazio'} ${hasEvent ? 'tem-evento' : ''}`}>
                {dia && <span className="dia-numero">{dia}</span>}
                {hasEvent && (
                  <div className="eventos-badges">
                    {evts.map((evt, idx) => (
                      <span key={idx} className={`evento-badge ${evt.ativo.toLowerCase()}`} title={`${evt.ativo} - ${evt.tipo}`}>
                        {evt.ativo}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="eventos-lista">
        <h4>Próximos Pagamentos</h4>
        {eventosDoMesOrdenados.length === 0 ? (
          <p style={{ color: '#888', fontSize: '0.9em' }}>Não há dividendos previstos para os ativos que você possui neste mês.</p>
        ) : (
          <ul>
            {eventosDoMesOrdenados.map((evt, idx) => {
              const [, mes, dia] = evt.data.split('-');
              return (
                <li key={idx}>
                  <span className="evento-data">{dia}/{mes}</span>
                  <span className={`evento-ativo ${evt.ativo.toLowerCase()}`}>{evt.ativo}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span className="evento-tipo">{evt.tipo}</span>
                    {evt.valor && <span style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#00CC66' }}>{evt.valor}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default CalendarioRendimentos;
