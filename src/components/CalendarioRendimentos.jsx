import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useTransactions } from '../context/TransactionsContext';
import { useProventos } from '../context/ProventosContext';
import { fetchYahooDividends } from '../services/api';
import '../styles/globals.css';

const TIPO_CONFIG = {
  'Rendimento':  { cor: '#00CC66', bg: 'rgba(0,204,102,0.12)' },
  'JCP':         { cor: '#3399FF', bg: 'rgba(51,153,255,0.12)' },
  'Dividendos':  { cor: '#C8B800', bg: 'rgba(200,184,0,0.12)'  },
  'Reembolso':   { cor: '#CC8800', bg: 'rgba(204,136,0,0.12)'  },
  'Outros':      { cor: '#AA88CC', bg: 'rgba(170,136,204,0.12)' },
};

const TIPOS_ORDEM = ['Rendimento', 'JCP', 'Dividendos', 'Reembolso', 'Outros'];

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function CalendarioRendimentos() {
  const { transactions } = useTransactions();
  const { proventos } = useProventos();
  const [selectedDate, setSelectedDate] = useState(null);
  const [apiDividends, setApiDividends] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const mountedRef = useRef(true);

  const hoje = new Date();
  const [mesAtual, setMesAtual] = useState(hoje.getMonth());
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());

  const mesAnoPrefix = `${anoAtual}-${(mesAtual + 1).toString().padStart(2, '0')}`;

  const ehMesPassado = anoAtual < hoje.getFullYear() || (anoAtual === hoje.getFullYear() && mesAtual < hoje.getMonth());

  function prevMonth() {
    setSelectedDate(null);
    if (mesAtual === 0) {
      setMesAtual(11);
      setAnoAtual(anoAtual - 1);
    } else {
      setMesAtual(mesAtual - 1);
    }
  }

  function nextMonth() {
    setSelectedDate(null);
    if (mesAtual === 11) {
      setMesAtual(0);
      setAnoAtual(anoAtual + 1);
    } else {
      setMesAtual(mesAtual + 1);
    }
  }

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
    return [...new Set(transactions.map(t => t.ticker))].sort();
  }, [transactions]);

  const tipoMap = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (t.tipo && !map[t.ticker]) map[t.ticker] = t.tipo;
    });
    return map;
  }, [transactions]);

  const fetchDividends = useCallback(async () => {
    const tickers = meusAtivos.filter(t => !['Dólar', 'Euro'].includes(t));
    if (tickers.length === 0) return;

    setApiLoading(true);
    setApiError(null);

    const results = [];
    const concurrency = 5;
    for (let i = 0; i < tickers.length; i += concurrency) {
      const batch = tickers.slice(i, i + concurrency);
      const promises = batch.map(async (ticker) => {
        try {
          const data = await fetchYahooDividends(ticker);
          return { ticker, data };
        } catch {
          return { ticker, data: [] };
        }
      });
      const settled = await Promise.allSettled(promises);
      for (const s of settled) {
        if (s.status === 'fulfilled' && s.value.data) {
          results.push(...s.value.data.map(d => ({ ...d, ticker: s.value.ticker })));
        }
      }
      if (i + concurrency < tickers.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    if (mountedRef.current) {
      setApiDividends(results);
      setApiLoading(false);
    }
  }, [meusAtivos]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    fetchDividends();
  }, [fetchDividends, mesAtual, anoAtual]);

  const eventosAgrupados = useMemo(() => {
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

    const daApi = apiDividends.flatMap(d => {
      if (!d.date) return [];
      const parts = d.date.split('/');
      if (parts.length !== 3) return [];
      const data = `${parts[2]}-${parts[1]}-${parts[0]}`;
      const tipoCanon =
        d.type === 'JCP' ? 'JCP' :
        d.type === 'Dividendo' ? 'Dividendos' :
        d.type === 'Rendimento' ? 'Rendimento' :
        'Dividendos';
      return { data, ativo: d.ticker, tipoCanon, valor: d.value, fonte: 'api' };
    });

    const todos = [...lancados, ...daApi].filter(e => e.data.startsWith(mesAnoPrefix));
    const mapa = {};

    todos.forEach(e => {
      const key = `${e.data}_${e.ativo}`;
      if (!mapa[key]) mapa[key] = { data: e.data, ativo: e.ativo, proventos: {}, fontes: {} };
      if (mapa[key].proventos[e.tipoCanon] === undefined) {
        mapa[key].proventos[e.tipoCanon] = e.valor;
        mapa[key].fontes[e.tipoCanon] = e.fonte || 'manual';
      } else {
        const manual = e.fonte !== 'api';
        const existente = mapa[key].fontes[e.tipoCanon];
        if (manual || existente === 'api') {
          mapa[key].proventos[e.tipoCanon] = (mapa[key].proventos[e.tipoCanon] || 0) + (e.valor || 0);
          if (manual) mapa[key].fontes[e.tipoCanon] = 'manual';
        }
      }
    });

    return Object.values(mapa).sort((a, b) => new Date(a.data) - new Date(b.data));
  }, [proventos, apiDividends, mesAnoPrefix]);

  const primeiroDiaDoMes = new Date(anoAtual, mesAtual, 1);
  const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const primeiroDiaSemana = primeiroDiaDoMes.getDay();
  const TOTAL_CELULAS = 42;
  const dias = [];
  for (let i = 0; i < primeiroDiaSemana; i++) dias.push(null);
  for (let i = 1; i <= diasNoMes; i++) dias.push(i);
  while (dias.length < TOTAL_CELULAS) dias.push(null);

  const eventosNoDia = (dia) => {
    if (!dia) return [];
    const dataStr = `${mesAnoPrefix}-${dia.toString().padStart(2, '0')}`;
    return eventosAgrupados.filter(e => e.data === dataStr);
  };

  const btnStyle = {
    background: 'none',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#ccc',
    fontSize: '1.1em',
    padding: '4px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    lineHeight: 1,
    transition: 'all 0.2s',
  };

  const tituloTabela = ehMesPassado ? 'Pagamentos Realizados' : 'Próximos Pagamentos';

  return (
    <div className="calendario-container">
      <div className="calendario-main">
        <div className="calendario-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={prevMonth} style={btnStyle}>&lt;</button>
            <h3 style={{ margin: 0, minWidth: 160, textAlign: 'center' }}>{MESES[mesAtual]} {anoAtual}</h3>
            <button onClick={nextMonth} style={btnStyle}>&gt;</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {apiError && (
              <span style={{
                fontSize: '0.72em', color: '#FF5555', background: 'rgba(255,85,85,0.08)',
                padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,85,85,0.2)',
              }}>
                API de dividendos indisponível
              </span>
            )}
            <span style={{
              fontSize: '0.78em',
              color: apiLoading ? '#C8B800' : '#00CC66',
              background: 'rgba(255,255,255,0.03)',
              padding: '5px 12px',
              borderRadius: '12px',
              border: `1px solid ${apiLoading ? 'rgba(200,184,0,0.2)' : 'rgba(0,204,102,0.2)'}`,
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
                background: apiLoading ? '#C8B800' : '#00CC66',
                boxShadow: `0 0 8px ${apiLoading ? '#C8B800' : '#00CC66'}`,
                display: 'inline-block',
                animation: apiLoading ? 'pulse 1.2s infinite' : 'none'
              }} />
              {apiLoading ? 'Buscando dividendos...' : apiError ? 'API off-line' : 'Dividendos sincronizados'}
            </span>
          </div>
        </div>

        <div className="calendario-grid" onClick={() => setSelectedDate(null)}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
            <div key={dia} className="calendario-dia-semana">{dia}</div>
          ))}

          {dias.map((dia, index) => {
            const evts = eventosNoDia(dia);
            const hasEvent = evts.length > 0;
            const dataStr = dia ? `${mesAnoPrefix}-${dia.toString().padStart(2, '0')}` : '';
            return (
              <div
                key={index}
                className={`calendario-celula ${dia ? 'dia-ativo' : 'dia-vazio'} ${hasEvent ? 'tem-evento' : ''} ${dia && selectedDate === dataStr ? 'celula-selecionada' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasEvent) {
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
                      const isRendaFixa = tipoMap[evt.ativo] === 'Renda Fixa';
                      const badgeClass = isRendaFixa ? 'renda-fixa' : isFii ? 'fii' : 'acao';
                      return (
                        <span key={idx} className={`evento-badge ${badgeClass}`} title={evt.ativo}>
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

      <div className="eventos-lista">
        <h4>{tituloTabela}</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: '0.75em', color: '#888' }}>
            {eventosAgrupados.filter(e => Object.values(e.fontes || {}).every(f => f === 'api')).length > 0
              ? '🔄 Dados automáticos via brapi.dev'
              : ''}
          </span>
          {eventosAgrupados.length > 0 && (
            <button
              onClick={fetchDividends}
              disabled={apiLoading}
              style={{
                background: 'transparent', border: '1px solid #444', color: '#aaa',
                borderRadius: 6, padding: '3px 10px', fontSize: '0.7em', cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 600,
              }}
            >
              {apiLoading ? 'Atualizando...' : '🔄 Atualizar'}
            </button>
          )}
        </div>
        {eventosAgrupados.length === 0 ? (
          <p style={{ color: '#888', fontSize: '0.9em' }}>
            {apiLoading ? 'Buscando dividendos da internet...' : 'Nenhum provento neste mês.'}
          </p>
        ) : (
          <ul>
            {eventosAgrupados.map((evt, idx) => {
              const [, mes, dia] = evt.data.split('-');
              const isSelected = selectedDate === evt.data;
              const isDimmed = selectedDate && !isSelected;
              const tiposPresentes = TIPOS_ORDEM.filter(t => evt.proventos[t] !== undefined);
              const isFromApi = Object.values(evt.fontes || {}).every(f => f === 'api');

              return (
                <li
                  key={idx}
                  className={`evento-card${isSelected ? ' evento-selecionado' : ''}${isDimmed ? ' evento-diminido' : ''}`}
                  style={isFromApi ? { borderLeft: '2px solid rgba(0,204,102,0.2)' } : {}}
                >
                  <div className="evento-card-header">
                    <span className="evento-data">{dia}/{mes}</span>
                    <span className="evento-ativo">{evt.ativo}</span>
                    {isFromApi && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.65em', color: '#00CC66', opacity: 0.6 }}>
                        automático
                      </span>
                    )}
                  </div>

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
