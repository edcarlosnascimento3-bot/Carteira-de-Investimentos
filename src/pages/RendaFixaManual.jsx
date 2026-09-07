import { useState, useMemo } from 'react';
import { useRfManual } from '../context/RfManualContext';
import { useTransactions } from '../context/TransactionsContext';
import { formatCurrency } from '../services/format';

const IPCA2032_TICKER = 'IPCA+2032';
const IPCA2032_CONFIG = {
  tipo: 'NTN-B',
  instituicao: 'SOFISA',
  vencimento: '2026-03-18',
  rentabilidade: '8,3',
};

function brToIso(value) {
  const m = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return value || '';
}

const TIPOS_RF = [
  { value: 'CDB', label: 'CDB', cor: '#2979FF' },
  { value: 'LCI', label: 'LCI', cor: '#00C853' },
  { value: 'LCA', label: 'LCA', cor: '#00BFA5' },
  { value: 'Debênture', label: 'Debênture', cor: '#FF6D00' },
  { value: 'CRI', label: 'CRI', cor: '#AA00FF' },
  { value: 'CRA', label: 'CRA', cor: '#6200EA' },
  { value: 'Lf', label: 'Lf (Tesouro)', cor: '#C8B800' },
  { value: 'LFT', label: 'LFT (Tesouro)', cor: '#FFD600' },
  { value: 'NTN-A', label: 'NTN-A (Tesouro)', cor: '#FF9100' },
  { value: 'NTN-B', label: 'NTN-B (Tesouro)', cor: '#FF3D00' },
  { value: 'Previdência', label: 'Previdência', cor: '#78909C' },
  { value: 'Outro', label: 'Outro', cor: '#90A4AE' },
];

const TIPO_OPTIONS = Object.fromEntries(TIPOS_RF.map(t => [t.value, t]));
const EMPTY = { nome: '', tipo: 'CDB', valor: '', instituicao: '', data: '', vencimento: '', rentabilidade: '' };

function normalize(str) {
  return (str || '').trim();
}

function parseBRL(text) {
  if (typeof text === 'number') return text;
  const digits = (text || '').replace(/[^\d]/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

function formatBRLInput(value) {
  if (!value && value !== 0) return '';
  const cents = Math.round(value * 100);
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateBR(value) {
  if (!value) return '—';
  const [ano, mes, dia] = String(value).split('-');
  if (!ano || !mes || !dia) return value;
  return `${dia}/${mes}/${ano}`;
}

export default function RendaFixaManual() {
  const { rfManual, updateRfManual } = useRfManual();
  const { transactions } = useTransactions();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [showForm, setShowForm] = useState(false);
  const [busca, setBusca] = useState('');
  const [importMsg, setImportMsg] = useState(null);

  const itens = useMemo(() => {
    if (!rfManual || typeof rfManual !== 'object') return [];
    return Object.entries(rfManual)
      .filter(([k, v]) => v && typeof v === 'object' && v.valor !== undefined)
      .map(([key, v]) => ({ key, ...v }))
      .filter(item => {
        if (!busca) return true;
        const q = busca.toLowerCase();
        return (
          (item.nome || '').toLowerCase().includes(q) ||
          (item.tipo || '').toLowerCase().includes(q) ||
          (item.instituicao || '').toLowerCase().includes(q) ||
          (item.key || '').toLowerCase().includes(q)
        );
      });
  }, [rfManual, busca]);

  const totalPatrimonio = useMemo(() => {
    if (!rfManual || typeof rfManual !== 'object') return 0;
    return Object.values(rfManual)
      .filter(v => v && typeof v === 'object')
      .reduce((s, v) => s + (typeof v.valor === 'number' ? v.valor : 0), 0);
  }, [rfManual]);

  const totalPorTipo = useMemo(() => {
    const mapa = {};
    for (const item of itens) {
      const tipo = item.tipo || 'Outro';
      mapa[tipo] = (mapa[tipo] || 0) + (item.valor || 0);
    }
    return mapa;
  }, [itens]);

  const importarIpca2032 = () => {
    if (!transactions || !Array.isArray(transactions)) {
      setImportMsg({ tipo: 'erro', msg: 'Nenhum lançamento encontrado na planilha.' });
      return;
    }

    const compras = transactions.filter(t =>
      t.operacao === 'Compra' &&
      (t.ticker || '').toUpperCase().includes('IPCA') &&
      (t.ticker || t.ativo || '').toUpperCase().includes('2032')
    );

    if (compras.length === 0) {
      setImportMsg({ tipo: 'erro', msg: 'Nenhuma compra de IPCA+2032 encontrada na planilha.' });
      return;
    }

    const jaImportados = new Set(
      Object.values(rfManual)
        .filter(v => v && typeof v === 'object' && v.origemId)
        .map(v => v.origemId)
    );

    const novos = [];
    for (const t of compras) {
      if (jaImportados.has(t.id)) continue;
      const valor = Number(t.investido ?? t.valor) || 0;
      novos.push({
        origemId: t.id,
        nome: t.ticker || IPCA2032_TICKER,
        tipo: IPCA2032_CONFIG.tipo,
        valor,
        instituicao: IPCA2032_CONFIG.instituicao,
        data: brToIso(t.data),
        vencimento: IPCA2032_CONFIG.vencimento,
        rentabilidade: IPCA2032_CONFIG.rentabilidade,
      });
    }

    if (novos.length === 0) {
      setImportMsg({ tipo: 'info', msg: `Todas as ${compras.length} compra(s) de IPCA+2032 já estão na Renda Fixa.` });
      return;
    }

    updateRfManual(prev => {
      const next = { ...prev };
      for (const n of novos) {
        const key = `rf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
        next[key] = n;
      }
      return next;
    });

    setImportMsg({ tipo: 'sucesso', msg: `${novos.length} compra(s) de IPCA+2032 importada(s) para a Renda Fixa.` });
  };

  const startAdd = () => {
    setForm({ ...EMPTY, data: new Date().toISOString().slice(0, 10) });
    setEditing(null);
    setShowForm(true);
  };

  const startEdit = (item) => {
    setForm({
      nome: item.nome || '',
      tipo: item.tipo || 'CDB',
      valor: item.valor || '',
      instituicao: item.instituicao || '',
      data: item.data || '',
      vencimento: item.vencimento || '',
      rentabilidade: item.rentabilidade || '',
      origemId: item.origemId || '',
    });
    setEditing(item.key);
    setShowForm(true);
  };

  const save = () => {
    const nome = normalize(form.nome);
    if (!nome) return;
    const key = editing || `rf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    const dados = {
      nome,
      tipo: form.tipo || 'CDB',
      valor: typeof form.valor === 'string' ? parseBRL(form.valor) : (form.valor || 0),
      instituicao: normalize(form.instituicao),
      data: form.data || '',
      vencimento: form.vencimento || '',
      rentabilidade: normalize(form.rentabilidade),
      origemId: form.origemId || '',
    };
    updateRfManual(prev => ({
      ...prev,
      [key]: dados,
    }));
    setShowForm(false);
    setEditing(null);
    setForm({ ...EMPTY });
  };

  const remove = (key) => {
    if (!confirm('Remover este investimento?')) return;
    updateRfManual(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const cancel = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ ...EMPTY });
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ padding: '0 0 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text, #333)' }}>
          🔒 Renda Fixa Manual
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary, #888)', margin: '4px 0 0' }}>
          Cadastre seus investimentos de renda fixa para cálculo do IR e patrimônio
        </p>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{
          background: 'var(--card-bg, #fff)',
          border: '1px solid var(--border, #eee)',
          borderRadius: 10,
          padding: '14px 20px',
          flex: '1 1 200px',
          minWidth: 180,
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary, #888)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Patrimônio Total
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#C8B800' }}>
            {formatCurrency(totalPatrimonio)}
          </div>
        </div>
        <div style={{
          background: 'var(--card-bg, #fff)',
          border: '1px solid var(--border, #eee)',
          borderRadius: 10,
          padding: '14px 20px',
          flex: '1 1 120px',
          minWidth: 100,
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary, #888)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Investimentos
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text, #333)' }}>
            {itens.length}
          </div>
        </div>
      </div>

      {/* Resumo por tipo */}
      {Object.keys(totalPorTipo).length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {Object.entries(totalPorTipo).sort((a, b) => b[1] - a[1]).map(([tipo, total]) => {
            const config = TIPO_OPTIONS[tipo] || { cor: '#90A4AE' };
            return (
              <div key={tipo} style={{
                background: 'var(--card-bg, #fff)',
                border: `2px solid ${config.cor}`,
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 13,
              }}>
                <span style={{ color: config.cor, fontWeight: 700 }}>{tipo}</span>
                <span style={{ color: 'var(--text-secondary, #888)', margin: '0 6px' }}>·</span>
                <span style={{ color: 'var(--text, #333)', fontWeight: 600 }}>{formatCurrency(total)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Barra de ações */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{
            background: 'var(--card-bg, #fff)',
            color: 'var(--text, #333)',
            border: '1px solid var(--border, #eee)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 13,
            minWidth: 200,
            outline: 'none',
          }}
        />
        <div style={{ flex: 1 }} />
        {importMsg && (
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: importMsg.tipo === 'sucesso' ? '#1E7A34' : importMsg.tipo === 'erro' ? '#E53935' : 'var(--text-secondary, #888)',
          }}>
            {importMsg.msg}
          </span>
        )}
        <button
          onClick={importarIpca2032}
          style={{
            background: 'transparent',
            color: 'var(--text, #333)',
            border: '1px solid var(--border, #ddd)',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
          title="Importa as compras de IPCA+2032 da página Lançamentos para esta tabela"
        >
          📥 Importar IPCA+2032
        </button>
        <button onClick={startAdd} style={{
          background: '#C8B800',
          color: '#121212',
          border: 'none',
          borderRadius: 8,
          padding: '8px 18px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}>
          + Adicionar
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div style={{
          background: 'var(--card-bg, #fff)',
          border: '2px solid #C8B800',
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
        }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 15, color: 'var(--text, #333)' }}>
            {editing ? 'Editar Investimento' : 'Novo Investimento'}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={labelStyle}>Nome / Ticker *</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => updateField('nome', e.target.value)}
                placeholder="Ex: CDB Banco XPTO"
                style={inputStyle}
                autoFocus
              />
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select
                value={form.tipo}
                onChange={e => updateField('tipo', e.target.value)}
                style={inputStyle}
              >
                {TIPOS_RF.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Valor Investido (R$) *</label>
              <input
                type="text"
                inputMode="decimal"
                value={typeof form.valor === 'number' ? formatBRLInput(form.valor) : form.valor}
                onChange={e => {
                  const raw = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
                  updateField('valor', raw);
                }}
                onBlur={() => {
                  if (form.valor) {
                    updateField('valor', parseBRL(form.valor));
                  }
                }}
                placeholder="0,00"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Instituição</label>
              <input
                type="text"
                value={form.instituicao}
                onChange={e => updateField('instituicao', e.target.value)}
                placeholder="Ex: BTG, Itaú, XP"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Data Aplicação</label>
              <input
                type="date"
                value={form.data}
                onChange={e => updateField('data', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Vencimento</label>
              <input
                type="date"
                value={form.vencimento}
                onChange={e => updateField('vencimento', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Rentabilidade</label>
              <input
                type="text"
                value={form.rentabilidade}
                onChange={e => updateField('rentabilidade', e.target.value)}
                placeholder="Ex: CDI+1,2%, 12% a.a."
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <button onClick={cancel} style={{
              background: 'transparent',
              color: 'var(--text-secondary, #888)',
              border: '1px solid var(--border, #eee)',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              Cancelar
            </button>
            <button onClick={save} style={{
              background: '#C8B800',
              color: '#121212',
              border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              {editing ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {itens.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-secondary, #888)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
          <h3 style={{ margin: '0 0 8px', color: 'var(--text, #333)' }}>
            {busca ? 'Nenhum resultado' : 'Nenhum investimento cadastrado'}
          </h3>
          <p style={{ margin: 0, fontSize: 14 }}>
            {busca ? 'Tente outro termo de busca' : 'Clique em "+ Adicionar" para cadastrar sua renda fixa'}
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--card-bg, #fff)',
          border: '1px solid var(--border, #eee)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--card-header, #f5f5f5)' }}>
                <th style={th}>Nome</th>
                <th style={th}>Tipo</th>
                <th style={{ ...th, textAlign: 'right' }}>Valor</th>
                <th style={th}>Instituição</th>
                <th style={th}>Aplicação</th>
                <th style={th}>Vencimento</th>
                <th style={th}>Rentab.</th>
                <th style={{ ...th, textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {itens
                .sort((a, b) => (b.valor || 0) - (a.valor || 0))
                .map(item => {
                  const config = TIPO_OPTIONS[item.tipo] || { cor: '#90A4AE' };
                  return (
                    <tr key={item.key} style={{ borderBottom: '1px solid var(--border, #eee)' }}>
                      <td style={td}>
                        <span style={{ fontWeight: 600, color: 'var(--text, #333)' }}>{item.nome || item.key}</span>
                      </td>
                      <td style={td}>
                        <span style={{
                          background: config.cor + '22',
                          color: config.cor,
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                        }}>
                          {item.tipo || '—'}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#C8B800' }}>
                        {formatCurrency(item.valor || 0)}
                      </td>
                      <td style={td}>{item.instituicao || '—'}</td>
                      <td style={td}>{formatDateBR(item.data)}</td>
                      <td style={td}>{formatDateBR(item.vencimento)}</td>
                      <td style={td}>{item.rentabilidade || '—'}</td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <button
                          onClick={() => startEdit(item)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontSize: 14 }}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => remove(item.key)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontSize: 14 }}
                          title="Remover"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  color: 'var(--text-secondary, #888)',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: 0.3,
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--surface-dark, #f8f8f8)',
  color: 'var(--text, #333)',
  border: '1px solid var(--border, #ddd)',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
};

const th = {
  textAlign: 'left',
  padding: '10px 12px',
  fontWeight: 600,
  fontSize: 12,
  color: 'var(--text-secondary, #888)',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const td = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--border, #eee)',
};
