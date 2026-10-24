import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

function formatMonthKey(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function extractMonthFromText(text) {
  const t = (text || '').toLowerCase();
  const months = ['janeiro','fevereiro','março','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  for (let i = 0; i < months.length; i++) {
    if (t.includes(months[i])) {
      const m = String(i+1).padStart(2,'0');
      const yearMatch = t.match(/(20\d{2})/);
      if (yearMatch) return yearMatch[1] + '-' + m;
      return m;
    }
  }
  const dateMatch = t.match(/(\d{2})\/(\d{2})\/(20\d{2})/);
  if (dateMatch) return dateMatch[3] + '-' + dateMatch[2];
  return null;
}

function extractTicker(text) {
  const t = (text || '').toUpperCase();
  const match = t.match(/\b([A-Z]{4}\d{2})\b/);
  if (match) return match[1];
  const match2 = t.match(/\b([A-Z]{3}\d{2})\b/);
  if (match2) return match2[1];
  return null;
}

async function readPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str).join(' ');
    fullText += '\n' + strings;
  }
  return fullText;
}

function extractComparativeInfo(text) {
  const t = text || '';
  const info = {
    cotas: [],
    compras: [],
    vendas: [],
    proventos: [],
    movimentacoes: [],
    dividas: [],
    saldo: [],
    bruto: t.match(/valor bruto[^0-9R$]*([R$\s\d.,]+)/i)?.[1] || null,
    liquido: t.match(/valor líquido[^0-9R$]*([R$\s\d.,]+)/i)?.[1] || null,
  };
  const cotasMatch = t.match(/(?:saldo|posição|cotas)[^\d]*([0-9.,]+)/i);
  if (cotasMatch) info.cotas.push({ label: 'Cotas/Saldo', value: cotasMatch[1] });
  const compraMatch = t.match(/compra[s]?[^\dR$]*([R$\s\d.,]+)/ig);
  if (compraMatch) compraMatch.slice(0,5).forEach(m => info.compras.push(m.trim()));
  const vendaMatch = t.match(/venda[s]?[^\dR$]*([R$\s\d.,]+)/ig);
  if (vendaMatch) vendaMatch.slice(0,5).forEach(m => info.vendas.push(m.trim()));
  const rendMatch = t.match(/(?:rendimento|dividend[oa]|jcp|provento)[^\dR$]*([R$\s\d.,]+)/ig);
  if (rendMatch) rendMatch.slice(0,8).forEach(m => info.proventos.push(m.trim()));
  return info;
}

function Relatorios() {
  const [doc1, setDoc1] = useState(null);
  const [doc2, setDoc2] = useState(null);
  const [preview1, setPreview1] = useState(null);
  const [preview2, setPreview2] = useState(null);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [comparando, setComparando] = useState(false);
  const [comparativo, setComparativo] = useState(null);
  const [erro, setErro] = useState('');

  const handleUpload1 = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading1(true);
    setErro('');
    try {
      const text = await readPdf(file);
      const ticker = extractTicker(text);
      const month = extractMonthFromText(text);
      const info = extractComparativeInfo(text);
      setDoc1({ file, text, ticker, month, info, name: file.name });
      setPreview1(URL.createObjectURL(file));
    } catch (err) {
      setErro('Erro ao ler PDF do relatório 1: ' + err.message);
    }
    setLoading1(false);
  };

  const handleUpload2 = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro('');
    if (!doc1) {
      setErro('Faça o upload do relatório do primeiro quadrante primeiro.');
      return;
    }
    setLoading2(true);
    try {
      const text = await readPdf(file);
      const ticker = extractTicker(text);
      const month = extractMonthFromText(text);
      const info = extractComparativeInfo(text);
      if (doc1.ticker && ticker && doc1.ticker !== ticker) {
        setErro(`Ativo diferente. Relatório 1: ${doc1.ticker}, Relatório 2: ${ticker}`);
        setLoading2(false);
        return;
      }
      if (doc1.month && month && month <= doc1.month) {
        setErro('O segundo relatório precisa ser do mês posterior ao primeiro.');
        setLoading2(false);
        return;
      }
      setDoc2({ file, text, ticker, month, info, name: file.name });
      setPreview2(URL.createObjectURL(file));
    } catch (err) {
      setErro('Erro ao ler PDF do relatório 2: ' + err.message);
    }
    setLoading2(false);
  };

  const ativarComparacao = () => {
    if (!doc1 || !doc2) {
      setErro('É necessário fazer upload dos dois relatórios.');
      return;
    }
    setComparando(true);
    setErro('');
    const result = {
      ativo: doc1.ticker || doc2.ticker,
      mes1: doc1.month,
      mes2: doc2.month,
      arquivo1: doc1.name,
      arquivo2: doc2.name,
      doc1: doc1.info,
      doc2: doc2.info,
      observacoes: []
    };
    if (doc1.info.cotas?.[0]?.value && doc2.info.cotas?.[0]?.value) {
      result.observacoes.push(`Variação de cotas/saldo: ${doc1.info.cotas[0].value} → ${doc2.info.cotas[0].value}`);
    }
    if (doc1.info.compras?.length || doc2.info.compras?.length) {
      result.observacoes.push(`Compras: Mês 1: ${doc1.info.compras.length || 0} ocorrência(s) | Mês 2: ${doc2.info.compras.length || 0} ocorrência(s)`);
    }
    if (doc1.info.vendas?.length || doc2.info.vendas?.length) {
      result.observacoes.push(`Vendas: Mês 1: ${doc1.info.vendas.length || 0} ocorrência(s) | Mês 2: ${doc2.info.vendas.length || 0} ocorrência(s)`);
    }
    if (doc1.info.proventos?.length || doc2.info.proventos?.length) {
      result.observacoes.push(`Proventos/Rendimentos: Mês 1: ${doc1.info.proventos.length || 0} | Mês 2: ${doc2.info.proventos.length || 0}`);
    }
    setComparativo(result);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 16 }}>Comparativo de Relatórios Gerenciais</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ border: '1px solid var(--border, #ddd)', borderRadius: 8, padding: 16, background: 'var(--card-bg, #fff)' }}>
          <h4 style={{ margin: '0 0 10px' }}>Relatório Mês 1</h4>
          <div style={{ width: '100%', height: 220, border: '1px dashed var(--border, #ccc)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 10, background: '#f9f9f9' }}>
            {preview1 ? (
              <iframe src={preview1} title="preview1" style={{ width: '100%', height: '100%', border: 'none' }} />
            ) : (
              <span style={{ color: '#888' }}>Preview do PDF</span>
            )}
          </div>
          <label style={{ display: 'inline-block', padding: '8px 14px', background: 'var(--accent, #007bff)', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            {loading1 ? 'Lendo...' : 'Upload Relatório Gerencial (PDF)'}
            <input type="file" accept="application/pdf" onChange={handleUpload1} style={{ display: 'none' }} />
          </label>
          {doc1 && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
              <div><b>Arquivo:</b> {doc1.name}</div>
              <div><b>Ativo:</b> {doc1.ticker || 'Não identificado'}</div>
              <div><b>Mês/Referência:</b> {doc1.month || 'Não identificado'}</div>
            </div>
          )}
        </div>

        <div style={{ border: '1px solid var(--border, #ddd)', borderRadius: 8, padding: 16, background: 'var(--card-bg, #fff)' }}>
          <h4 style={{ margin: '0 0 10px' }}>Relatório Mês 2 (Posterior)</h4>
          <div style={{ width: '100%', height: 220, border: '1px dashed var(--border, #ccc)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 10, background: '#f9f9f9' }}>
            {preview2 ? (
              <iframe src={preview2} title="preview2" style={{ width: '100%', height: '100%', border: 'none' }} />
            ) : (
              <span style={{ color: '#888' }}>Preview do PDF</span>
            )}
          </div>
          <label style={{ display: 'inline-block', padding: '8px 14px', background: doc1 ? 'var(--accent, #007bff)' : '#999', color: '#fff', borderRadius: 6, cursor: doc1 ? 'pointer' : 'not-allowed', fontSize: 13 }}>
            {loading2 ? 'Lendo...' : 'Upload Relatório Gerencial (PDF)'}
            <input type="file" accept="application/pdf" onChange={handleUpload2} style={{ display: 'none' }} disabled={!doc1} />
          </label>
          {doc2 && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
              <div><b>Arquivo:</b> {doc2.name}</div>
              <div><b>Ativo:</b> {doc2.ticker || 'Não identificado'}</div>
              <div><b>Mês/Referência:</b> {doc2.month || 'Não identificado'}</div>
            </div>
          )}
        </div>
      </div>

      {erro && <div style={{ color: '#d33', marginBottom: 12, fontSize: 13 }}>{erro}</div>}

      <button onClick={ativarComparacao} disabled={!doc1 || !doc2 || comparando} style={{ padding: '10px 18px', background: doc1 && doc2 ? '#28a745' : '#999', color: '#fff', border: 'none', borderRadius: 6, cursor: doc1 && doc2 ? 'pointer' : 'not-allowed', marginBottom: 18, fontWeight: 600 }}>
        {comparando ? 'Comparando...' : 'Ativar Comparação'}
      </button>

      {comparativo && (
        <div style={{ border: '1px solid var(--border, #ddd)', borderRadius: 8, padding: 18, background: 'var(--card-bg, #fff)' }}>
          <h3 style={{ margin: '0 0 12px' }}>Comparativo entre relatórios</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div style={{ background: '#f7f7f7', padding: 12, borderRadius: 6 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Mês 1 ({comparativo.mes1 || '-'}) - {comparativo.arquivo1}</div>
              <div style={{ fontSize: 12 }}>Ativo: {comparativo.ativo || '-'}</div>
              <div style={{ fontSize: 12, marginTop: 6 }}><b>Compras encontradas:</b> {comparativo.doc1.compras.length}</div>
              <div style={{ fontSize: 12 }}><b>Vendas encontradas:</b> {comparativo.doc1.vendas.length}</div>
              <div style={{ fontSize: 12 }}><b>Proventos:</b> {comparativo.doc1.proventos.length}</div>
            </div>
            <div style={{ background: '#f7f7f7', padding: 12, borderRadius: 6 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Mês 2 ({comparativo.mes2 || '-'}) - {comparativo.arquivo2}</div>
              <div style={{ fontSize: 12 }}>Ativo: {comparativo.ativo || '-'}</div>
              <div style={{ fontSize: 12, marginTop: 6 }}><b>Compras encontradas:</b> {comparativo.doc2.compras.length}</div>
              <div style={{ fontSize: 12 }}><b>Vendas encontradas:</b> {comparativo.doc2.vendas.length}</div>
              <div style={{ fontSize: 12 }}><b>Proventos:</b> {comparativo.doc2.proventos.length}</div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <h4 style={{ margin: '0 0 8px' }}>Comparativo detalhado</h4>
            {comparativo.observacoes.map((o, idx) => (
              <div key={idx} style={{ padding: '6px 10px', background: '#eef6ff', borderRadius: 4, marginBottom: 6, fontSize: 13 }}>• {o}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <h5 style={{ margin: '0 0 6px' }}>Compras/Vendas - Mês 1</h5>
              {[...comparativo.doc1.compras, ...comparativo.doc1.vendas].map((c, i) => <div key={i} style={{ fontSize: 12, padding: '4px 6px', borderBottom: '1px solid #eee' }}>{c}</div>)}
              {comparativo.doc1.compras.length === 0 && comparativo.doc1.vendas.length === 0 && <div style={{ fontSize: 12, color: '#888' }}>Nenhuma movimentação identificada</div>}
            </div>
            <div>
              <h5 style={{ margin: '0 0 6px' }}>Compras/Vendas - Mês 2</h5>
              {[...comparativo.doc2.compras, ...comparativo.doc2.vendas].map((c, i) => <div key={i} style={{ fontSize: 12, padding: '4px 6px', borderBottom: '1px solid #eee' }}>{c}</div>)}
              {comparativo.doc2.compras.length === 0 && comparativo.doc2.vendas.length === 0 && <div style={{ fontSize: 12, color: '#888' }}>Nenhuma movimentação identificada</div>}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <h5 style={{ margin: '0 0 6px' }}>Proventos/Rendimentos</h5>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>{comparativo.doc1.proventos.map((p, i) => <div key={i} style={{ fontSize: 12, padding: '4px 6px', borderBottom: '1px solid #eee' }}>{p}</div>) || <div style={{ fontSize: 12, color: '#888' }}>-</div>}</div>
              <div>{comparativo.doc2.proventos.map((p, i) => <div key={i} style={{ fontSize: 12, padding: '4px 6px', borderBottom: '1px solid #eee' }}>{p}</div>) || <div style={{ fontSize: 12, color: '#888' }}>-</div>}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Relatorios;

