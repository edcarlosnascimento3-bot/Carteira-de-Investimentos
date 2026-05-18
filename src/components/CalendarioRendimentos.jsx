import React, { useMemo, useState } from 'react';
import { useTransactions } from '../context/TransactionsContext';
import { useProventos } from '../context/ProventosContext';
import { usePrices } from '../hooks/usePrices';
import '../styles/globals.css';

// Categorias canônicas de proventos e suas cores
const TIPO_CONFIG = {
  'Rendimento':  { cor: '#00CC66', bg: 'rgba(0,204,102,0.12)' },
  'JCP':         { cor: '#3399FF', bg: 'rgba(51,153,255,0.12)' },
  'Dividendos':  { cor: '#C8B800', bg: 'rgba(200,184,0,0.12)'  },
  'Reembolso':   { cor: '#CC8800', bg: 'rgba(204,136,0,0.12)'  },
  'Outros':      { cor: '#AA88CC', bg: 'rgba(170,136,204,0.12)' },
};

const TIPOS_ORDEM = ['Rendimento', 'JCP', 'Dividendos', 'Reembolso', 'Outros'];

function normalizaTipo(tipo) {
  if (!tipo) return 'Outros';
  const t = tipo.toLowerCase();
  if (t.includes('rendimento')) return 'Rendimento';
  if (t.includes('jcp'))        return 'JCP';
  if (t.includes('dividendo'))  return 'Dividendos';
  if (t.includes('reembolso'))  return 'Reembolso';
  return 'Outros';
}

function CalendarioRendimentos() {
  const { transactions } = useTransactions();
  const { proventos } = useProventos();
  const [selectedDate, setSelectedDate] = useState(null);

  const quantidades = useMemo(() => {
    const qtd = {};
    transactions.forEach(t => {
      if (!qtd[t.ticker]) qtd[t.ticker] = 0;
      if (t.operacao === 'Compra') qtd[t.ticker] += Number(t.quantidade) || 0;
      else qtd[t.ticker] -= Number(t.quantidade) || 0;
    });
    return qtd;
  }, [transactions]);

  const meusAtivos = useMemo(() => {
    return Object.keys(quantidades).filter(ticker => quantidades[ticker] > 0);
  }, [quantidades]);

  const eventosBase = [
    { data: '2026-05-04', ativo: 'ITUB4', tipo: 'JCP', valorCotacao: 0.015 },
    { data: '2026-05-15', ativo: 'HGLG11', tipo: 'Rendimento', valorCotacao: 1.10 },
    { data: '2026-05-20', ativo: 'PETR4', tipo: 'Dividendos', valorCotacao: 0 },
    { data: '2026-05-20', ativo: 'VGIP11', tipo: 'Rendimento', valorCotacao: 1.08 },
    { data: '2026-05-15', ativo: 'VSLH11', tipo: 'Rendimento', valorCotacao: 0.025 },
    { data: '2026-05-10', ativo: 'BBAS3', tipo: 'JCP' },
    { data: '2026-05-15', ativo: 'MXRF11', tipo: 'Rendimento', valorCotacao: 0.10 },
    { data: '2026-05-15', ativo: 'BTLG11', tipo: 'Rendimento' },
    { data: '2026-05-15', ativo: 'KNRI11', tipo: 'Rendimento' },
    { data: '2026-05-15', ativo: 'XPLG11', tipo: 'Rendimento' },
    { data: '2026-05-15', ativo: 'CPTS11', tipo: 'Rendimento' },
  ];

  const allBaseTickers = useMemo(() => {
    return [...new Set([...meusAtivos, ...eventosBase.map(e => e.ativo)])];
  }, [meusAtivos]);

  const { prices, loading } = usePrices(allBaseTickers);

  // Agrupado por data+ativo, com múltiplos tipos de provento por entrada
  const eventosAgrupados = useMemo(() => {
    // 1. Proventos lançados manualmente — cada campo vira um tipo separado
    const lancados = proventos.flatMap(p => {
      if (!p.data) return [];
      const [dia, mes, ano] = p.data.split('/');
      if (!dia || !mes || !ano) return [];
      const data = `${ano}-${mes}-${dia}`;
      const resultados = [];
      if (p.rendimento > 0) resultados.push({ data, ativo: p.ticker, tipoCanon: 'Rendimento', valor: p.rendimento });
      if (p.jcp > 0)        resultados.push({ data, ativo: p.ticker, tipoCanon: 'JCP',        valor: p.jcp });
      if (p.dividendos > 0) resultados.push({ data, ativo: p.ticker, tipoCanon: 'Dividendos', valor: p.dividendos });
      if (p.reembolso > 0)  resultados.push({ data, ativo: p.ticker, tipoCanon: 'Reembolso',  valor: p.reembolso });
      if (resultados.length === 0) resultados.push({ data, ativo: p.ticker, tipoCanon: 'Outros', valor: null });
      return resultados;
    });

    const ativosLancadosDoMes = new Set(
      lancados.filter(l => l.data.startsWith('2026-05')).map(l => l.ativo)
    );

    // 2. Eventos pesquisados filtrados pela carteira do usuário
    const pesquisados = eventosBase
      .filter(evt => meusAtivos.includes(evt.ativo) && !ativosLancadosDoMes.has(evt.ativo))
      .map(evt => {
        const tipoCanon = normalizaTipo(evt.tipo);
        let valor = null;
        if (evt.valorCotacao !== undefined && evt.valorCotacao > 0) {
          valor = evt.valorCotacao * (quantidades[evt.ativo] || 0);
        } else if (evt.valorCotacao === 0) {
          valor = 0;
        } else {
          // Se valorCotacao é undefined, estima o rendimento com base no preço atual da cotação buscado da internet!
          const precoAtual = prices[evt.ativo];
          if (precoAtual) {
            // Estima em ~0.72% para FIIs se for rendimento, ou ~1.25% para Ações se for JCP/Dividendo
            const taxaEstimada = tipoCanon === 'Rendimento' ? 0.0072 : 0.0125;
            valor = precoAtual * taxaEstimada * (quantidades[evt.ativo] || 0);
          }
        }
        return { data: evt.data, ativo: evt.ativo, tipoCanon, valor };
      });

    // 3. Agrupa por data+ativo, somando valores por tipo
    const todos = [...pesquisados, ...lancados].filter(e => e.data.startsWith('2026-05'));
    const mapa = {};
    todos.forEach(e => {
      const key = `${e.data}_${e.ativo}`;
      if (!mapa[key]) mapa[key] = { data: e.data, ativo: e.ativo, proventos: {} };
      if (mapa[key].proventos[e.tipoCanon] === undefined) {
        mapa[key].proventos[e.tipoCanon] = e.valor;
      } else {
        mapa[key].proventos[e.tipoCanon] = (mapa[key].proventos[e.tipoCanon] || 0) + (e.valor || 0);
      }
    });

    return Object.values(mapa).sort((a, b) => new Date(a.data) - new Date(b.data));
  }, [meusAtivos, proventos, quantidades, prices]);

  // Calendário
  const currentDate = new Date(2026, 4, 1);
  const diasNoMes = new Date(2026, 5, 0).getDate();
  const primeiroDiaSemana = currentDate.getDay();
  const dias = [];
  for (let i = 0; i < primeiroDiaSemana; i++) dias.push(null);
  for (let i = 1; i <= diasNoMes; i++) dias.push(i);

  const eventosNoDia = (dia) => {
    if (!dia) return [];
    const dataStr = `2026-05-${dia.toString().padStart(2, '0')}`;
    return eventosAgrupados.filter(e => e.data === dataStr);
  };

  return (
    <div className="calendario-container">
      <div className="calendario-main">
        <div className="calendario-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '8px' }}>
          <h3>Maio 2026</h3>
          <span style={{
            fontSize: '0.78em',
            color: loading ? '#C8B800' : '#00CC66',
            background: 'rgba(255,255,255,0.03)',
            padding: '5px 12px',
            borderRadius: '12px',
            border: `1px solid ${loading ? 'rgba(200,184,0,0.2)' : 'rgba(0,204,102,0.2)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600,
            letterSpacing: '0.5px'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: loading ? '#C8B800' : '#00CC66',
              boxShadow: `0 0 8px ${loading ? '#C8B800' : '#00CC66'}`,
              display: 'inline-block',
              animation: loading ? 'pulse 1.2s infinite' : 'none'
            }} />
            {loading ? 'Sincronizando Bolsa...' : 'Bolsa Sincronizada'}
          </span>
        </div>

        <div className="calendario-grid" onClick={() => setSelectedDate(null)}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
            <div key={dia} className="calendario-dia-semana">{dia}</div>
          ))}

          {dias.map((dia, index) => {
            const evts = eventosNoDia(dia);
            const hasEvent = evts.length > 0;
            return (
              <div
                key={index}
                className={`calendario-celula ${dia ? 'dia-ativo' : 'dia-vazio'} ${hasEvent ? 'tem-evento' : ''} ${dia && selectedDate === `2026-05-${dia.toString().padStart(2, '0')}` ? 'celula-selecionada' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasEvent) {
                    const dataStr = `2026-05-${dia.toString().padStart(2, '0')}`;
                    setSelectedDate(prev => prev === dataStr ? null : dataStr);
                  }
                }}
                style={{ cursor: hasEvent ? 'pointer' : 'default' }}
              >
                {dia && <span className="dia-numero">{dia}</span>}
                {hasEvent && (
                  <div className="eventos-badges">
                    {evts.map((evt, idx) => {
                      const isFii = /11$/.test(evt.ativo);
                      return (
                        <span key={idx} className={`evento-badge ${isFii ? 'fii' : 'acao'}`} title={evt.ativo}>
                          {evt.ativo}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Lista de Próximos Pagamentos ─── */}
      <div className="eventos-lista">
        <h4>Próximos Pagamentos</h4>
        {eventosAgrupados.length === 0 ? (
          <p style={{ color: '#888', fontSize: '0.9em' }}>
            Não há pagamentos previstos para os ativos que você possui neste mês.
          </p>
        ) : (
          <ul>
            {eventosAgrupados.map((evt, idx) => {
              const [, mes, dia] = evt.data.split('-');
              const isSelected = selectedDate === evt.data;
              const isDimmed = selectedDate && !isSelected;
              const tiposPresentes = TIPOS_ORDEM.filter(t => evt.proventos[t] !== undefined);

              return (
                <li
                  key={idx}
                  className={`evento-card${isSelected ? ' evento-selecionado' : ''}${isDimmed ? ' evento-diminido' : ''}`}
                >
                  {/* Linha superior: Data e Ticker */}
                  <div className="evento-card-header">
                    <span className="evento-data">{dia}/{mes}</span>
                    <span className="evento-ativo">{evt.ativo}</span>
                  </div>

                  {/* Tipos de provento com valores */}
                  <div className="evento-card-proventos">
                    {tiposPresentes.map(tipo => {
                      const cfg = TIPO_CONFIG[tipo] || TIPO_CONFIG['Outros'];
                      const valor = evt.proventos[tipo];
                      const valorStr = (valor == null || valor === 0)
                        ? null
                        : `R$ ${valor.toFixed(2).replace('.', ',')}`;
                      return (
                        <div key={tipo} className="evento-provento-item" style={{ borderLeft: `3px solid ${cfg.cor}`, background: cfg.bg }}>
                          <span className="evento-provento-label" style={{ color: cfg.cor }}>{tipo}</span>
                          <span className="evento-provento-valor" style={{ color: cfg.cor }}>
                            {valorStr ?? <em style={{ color: '#555', fontStyle: 'italic', fontWeight: 400 }}>A definir</em>}
                          </span>
                        </div>
                      );
                    })}
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
