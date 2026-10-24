import { useState, useEffect, useRef } from 'react';
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
  const months = [
    { name: 'janeiro', num: '01' },
    { name: 'fevereiro', num: '02' },
    { name: 'março', num: '03' },
    { name: 'marco', num: '03' },
    { name: 'abril', num: '04' },
    { name: 'maio', num: '05' },
    { name: 'junho', num: '06' },
    { name: 'julho', num: '07' },
    { name: 'agosto', num: '08' },
    { name: 'setembro', num: '09' },
    { name: 'outubro', num: '10' },
    { name: 'novembro', num: '11' },
    { name: 'dezembro', num: '12' }
  ];

  // Procura padrão de mês por extenso com ano (ex: "Janeiro de 2024", "janeiro/2024", "Jan 2024")
  for (const m of months) {
    const regex = new RegExp(`${m.name}[\\s/de]+(20\\d{2})`, 'i');
    const match = t.match(regex);
    if (match) {
      return `${match[1]}-${m.num}`;
    }
  }

  // Procura padrão numérico mm/yyyy ou dd/mm/yyyy
  const dateMatch = t.match(/(\d{2})\/(20\d{2})/);
  if (dateMatch) {
    const monthVal = parseInt(dateMatch[1], 10);
    if (monthVal >= 1 && monthVal <= 12) {
      return `${dateMatch[2]}-${String(monthVal).padStart(2, '0')}`;
    }
  }

  const fullDateMatch = t.match(/(\d{2})\/(\d{2})\/(20\d{2})/);
  if (fullDateMatch) {
    return `${fullDateMatch[3]}-${fullDateMatch[2]}`;
  }

  // Fallback para primeiro mês encontrado
  for (const m of months) {
    if (t.includes(m.name)) {
      const yearMatch = t.match(/(20\d{2})/);
      return yearMatch ? `${yearMatch[1]}-${m.num}` : `2024-${m.num}`;
    }
  }

  return '';
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

function PdfCanvasPreview({ file, previewUrl }) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    if (!file) return;

    setLoading(true);
    setRenderError(false);

    file.arrayBuffer().then(buffer => {
      if (isCancelled) return;
      return pdfjsLib.getDocument({ data: buffer }).promise;
    }).then(pdf => {
      if (isCancelled || !pdf) return;
      return pdf.getPage(1);
    }).then(page => {
      if (isCancelled || !page) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const viewport = page.getViewport({ scale: 0.6 });
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      return page.render(renderContext).promise;
    }).then(() => {
      if (!isCancelled) setLoading(false);
    }).catch(err => {
      console.warn('Erro ao renderizar canvas do PDF:', err);
      if (!isCancelled) {
        setRenderError(true);
        setLoading(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [file]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {loading && <span style={{ fontSize: 11, color: '#888' }}>Carregando visualização...</span>}
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          display: loading || renderError ? 'none' : 'block',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
        }}
      />
      {renderError && (
        <div style={{ textAlign: 'center', padding: 8 }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>📄</div>
          <div style={{ fontSize: 11, color: '#666' }}>PDF Carregado</div>
        </div>
      )}
      {previewUrl && (
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            background: 'rgba(0,0,0,0.65)',
            color: '#fff',
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 4,
            textDecoration: 'none'
          }}
          title="Abrir PDF em nova aba"
        >
          ↗ Abrir
        </a>
      )}
    </div>
  );
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
  const [aviso, setAviso] = useState('');

  const handleUpload1 = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading1(true);
    setErro('');
    setAviso('');
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
    setAviso('');
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
        setAviso(`Atenção: Os ativos parecem ser diferentes (Mês 1: ${doc1.ticker}, Mês 2: ${ticker}). Você ainda pode comparar.`);
      }

      if (doc1.month && month && month <= doc1.month) {
        setAviso(`Aviso de competência: O Mês 2 (${month}) não parece posterior ao Mês 1 (${doc1.month}). Você pode ajustar o mês manualmente abaixo se desejar.`);
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
    setComparando(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 16 }}>Comparativo de Relatórios Gerenciais</h2>

      {/* Quadrantes compactos: largura reduzida e altura proporcional */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 320px))', gap: 16, marginBottom: 20, justifyContent: 'start' }}>
        <div style={{ border: '1px solid var(--border, #ddd)', borderRadius: 8, padding: 12, background: 'var(--card-bg, #fff)' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>Relatório Mês 1</h4>
          <div style={{ width: '100%', height: 130, border: '1px dashed var(--border, #ccc)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 8, background: '#f9f9f9' }}>
            {doc1?.file ? (
              <PdfCanvasPreview file={doc1.file} previewUrl={preview1} />
            ) : (
              <span style={{ color: '#888', fontSize: 11 }}>Preview do PDF</span>
            )}
          </div>
          <label style={{ display: 'inline-block', padding: '6px 12px', background: 'var(--accent, #007bff)', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
            {loading1 ? 'Lendo...' : 'Upload Mês 1 (PDF)'}
            <input type="file" accept="application/pdf" onChange={handleUpload1} style={{ display: 'none' }} />
          </label>
          {doc1 && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#666', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div><b>Arquivo:</b> {doc1.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <b>Ativo:</b>
                <input
                  type="text"
                  value={doc1.ticker || ''}
                  onChange={(e) => setDoc1(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
                  placeholder="Ex: HGLG11"
                  style={{ width: 80, padding: '2px 4px', fontSize: 11, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <b>Mês:</b>
                <input
                  type="text"
                  value={doc1.month || ''}
                  onChange={(e) => setDoc1(prev => ({ ...prev, month: e.target.value }))}
                  placeholder="AAAA-MM"
                  style={{ width: 80, padding: '2px 4px', fontSize: 11, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
            </div>
          )}
        </div>

        <div style={{ border: '1px solid var(--border, #ddd)', borderRadius: 8, padding: 12, background: 'var(--card-bg, #fff)' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>Relatório Mês 2 (Posterior)</h4>
          <div style={{ width: '100%', height: 130, border: '1px dashed var(--border, #ccc)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 8, background: '#f9f9f9' }}>
            {doc2?.file ? (
              <PdfCanvasPreview file={doc2.file} previewUrl={preview2} />
            ) : (
              <span style={{ color: '#888', fontSize: 11 }}>Preview do PDF</span>
            )}
          </div>
          <label style={{ display: 'inline-block', padding: '6px 12px', background: doc1 ? 'var(--accent, #007bff)' : '#999', color: '#fff', borderRadius: 6, cursor: doc1 ? 'pointer' : 'not-allowed', fontSize: 12 }}>
            {loading2 ? 'Lendo...' : 'Upload Mês 2 (PDF)'}
            <input type="file" accept="application/pdf" onChange={handleUpload2} style={{ display: 'none' }} disabled={!doc1} />
          </label>
          {doc2 && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#666', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div><b>Arquivo:</b> {doc2.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <b>Ativo:</b>
                <input
                  type="text"
                  value={doc2.ticker || ''}
                  onChange={(e) => setDoc2(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
                  placeholder="Ex: HGLG11"
                  style={{ width: 80, padding: '2px 4px', fontSize: 11, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <b>Mês:</b>
                <input
                  type="text"
                  value={doc2.month || ''}
                  onChange={(e) => setDoc2(prev => ({ ...prev, month: e.target.value }))}
                  placeholder="AAAA-MM"
                  style={{ width: 80, padding: '2px 4px', fontSize: 11, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {erro && <div style={{ color: '#d33', marginBottom: 12, fontSize: 13, background: '#ffebee', padding: '8px 12px', borderRadius: 6 }}>{erro}</div>}
      {aviso && <div style={{ color: '#856404', marginBottom: 12, fontSize: 13, background: '#fff3cd', padding: '8px 12px', borderRadius: 6, border: '1px solid #ffeeba' }}>{aviso}</div>}

      <button onClick={ativarComparacao} disabled={!doc1 || !doc2 || comparando} style={{ padding: '8px 16px', background: doc1 && doc2 ? '#28a745' : '#999', color: '#fff', border: 'none', borderRadius: 6, cursor: doc1 && doc2 ? 'pointer' : 'not-allowed', marginBottom: 18, fontWeight: 600, fontSize: 13 }}>
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

