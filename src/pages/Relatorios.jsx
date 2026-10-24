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
    // Agrupa itens preservando espaços e saltos
    let lastY = null;
    let pageStr = '';
    for (const item of content.items) {
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
        pageStr += '\n';
      } else if (pageStr.length > 0 && !pageStr.endsWith(' ') && !pageStr.endsWith('\n')) {
        pageStr += ' ';
      }
      pageStr += item.str;
      lastY = item.transform[5];
    }
    fullText += '\n\n' + pageStr;
  }
  return fullText;
}

function parseCurrencyBr(str) {
  if (!str) return null;
  const clean = String(str).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

function parsePercentBr(str) {
  if (!str) return null;
  const clean = String(str).replace(/[%\s]/g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

function formatMoMVariation(val1, val2, isPercent = false) {
  if (val1 === null || val2 === null || val1 === undefined || val2 === undefined) return null;
  const diff = val2 - val1;
  const pct = val1 !== 0 ? ((diff / Math.abs(val1)) * 100) : 0;
  return {
    diff,
    pct,
    formattedDiff: isPercent ? `${diff >= 0 ? '+' : ''}${diff.toFixed(2)} p.p.` : `${diff >= 0 ? '+R$ ' : '-R$ '}${Math.abs(diff).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    formattedPct: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral'
  };
}

function extractComparativeInfo(text) {
  const t = text || '';
  // Versão plana (tudo na mesma linha com espaços únicos) para buscas cross-line
  const flat = t.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ');

  // 1. Rendimento por cota (ex: "R$ 0,85", "0,085 por cota", "Rendimento: 0,90")
  const rendMatch = flat.match(/(?:dividendo(?:s)?|rendimento(?:s)?|provento(?:s)?|distribui[çc][ãa]o(?: por cota)?|rendimento declarado|distribui[çc][ãa]o de rendimentos)[\s:=-]{1,25}(?:R\$\s*)?([0-9]+[.,][0-9]{2,4})/i)
    || flat.match(/(?:R\$\s*)([0-9]+[.,][0-9]{2,4})\s*(?:\/|\s*por\s*)\s*cota/i);

  // 2. Dividend Yield (DY) (ex: "Dividend Yield: 9,5%", "DY 12M: 10,2%", "DY Anualizado: 11,4%", "DY: 0,85%")
  const dyMatch = flat.match(/(?:dividend yield|yield|dy(?:\s*(?:anualizado|mensal|12m|ano))?)[\s:=-]{1,25}([0-9]+[.,][0-9]{1,2})\s*%/i)
    || flat.match(/([0-9]+[.,][0-9]{1,2})\s*%\s*(?:ao ano|a\.a\.|a\.m\.)/i);

  // 3. Valor Patrimonial da Cota (VP/Cota) (ex: "Valor Patrimonial: R$ 98,50", "VP da cota: 102,30", "VP/cota: R$ 10,20")
  const vpMatch = flat.match(/(?:valor patrimonial(?:\s*da\s*cota|\s*\/cota|\s*por\s*cota)?|vp\s*da\s*cota|vp\/cota|vpc)[\s:=-]{1,25}(?:R\$\s*)?([0-9]+[.,][0-9]{2})/i)
    || flat.match(/(?:cota patrimonial)[\s:=-]{1,25}(?:R\$\s*)?([0-9]+[.,][0-9]{2})/i);

  // 4. P/VP (Preço / Valor Patrimonial) (ex: "P/VP: 0,95", "P/VP 0.98", "P/VPA: 1,02")
  const pvpMatch = flat.match(/(?:p\/vp|p\/vpa|pre[çc]o\s*\/\s*valor\s*patrimonial)[\s:=-]{1,25}([0-9]+[.,][0-9]{2})/i);

  // 5. Vacância Física (ex: "Vacância Física: 5,4%", "Vacância Física de 3%", "Vac. Física: 0%")
  const vacFisMatch = flat.match(/(?:vac[âa]ncia f[íi]sica|vac\.\s*f[íi]sica|taxa de vac[âa]ncia f[íi]sica)[\s:=-]{1,25}([0-9]+[.,][0-9]{1,2})\s*%/i)
    || flat.match(/([0-9]+[.,][0-9]{1,2})\s*%\s*(?:de vac[âa]ncia f[íi]sica)/i);

  // 6. Vacância Financeira (ex: "Vacância Financeira: 2,1%", "Vac. Financeira: 4%")
  const vacFinMatch = flat.match(/(?:vac[âa]ncia financeira|vac\.\s*financeira|taxa de vac[âa]ncia financeira)[\s:=-]{1,25}([0-9]+[.,][0-9]{1,2})\s*%/i)
    || flat.match(/([0-9]+[.,][0-9]{1,2})\s*%\s*(?:de vac[âa]ncia financeira)/i);

  // 7. Patrimônio Líquido (PL)
  const plMatch = flat.match(/(?:patrim[ôo]nio l[íi]quido|pl total)[\s:=-]{1,25}(?:R\$\s*)?([0-9.,]+(?:\s*(?:milh[õo]es|bilh[õo]es|mi|bi|m))?)/i);

  // 8. Base de Cotistas
  const cotistasMatch = flat.match(/(?:n[úu]mero de cotistas|cotistas|investidores)[\s:=-]{1,25}([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]{4,7})/i);

  // 9. Comentários do Gestor / Destaques
  const destaques = [];
  // Procura seções típicas de comentários
  const gestorRegex = /(?:coment[áa]rio(?:s)? do gestor|vis[ãa]o da gest[ãa]o|mensagem do gestor|destaques do m[êe]s|panorama operacional)([\s\S]{30,600}?)(?=(?:coment[áa]rio|vis[ãa]o|destaque|portf[óo]lio|rentabilidade|demonstra|informa[çc]|contato|$))/gi;
  let gMatch;
  while ((gMatch = gestorRegex.exec(t)) !== null && destaques.length < 3) {
    const trecho = gMatch[1].replace(/\s+/g, ' ').trim();
    if (trecho.length > 40) {
      destaques.push(trecho.slice(0, 300) + '...');
    }
  }

  // Fallback caso não encontre seção explícita
  if (destaques.length === 0) {
    const frasesInteressantes = t.match(/(?:[A-Z][^\.\n\r]{25,200}(?:loca[çc][ãa]o|inadimpl[êe]ncia|aquisi[çc][ãa]o|gestor|pipeline|alavancagem|reajuste)[^\.\n\r]{20,200}\.)/gi);
    if (frasesInteressantes) {
      frasesInteressantes.slice(0, 3).forEach(f => destaques.push(f.replace(/\s+/g, ' ').trim()));
    }
  }

  return {
    rendimentoCota: rendMatch ? rendMatch[1] : null,
    dividendYield: dyMatch ? dyMatch[1] : null,
    valorPatrimonial: vpMatch ? vpMatch[1] : null,
    pvp: pvpMatch ? pvpMatch[1] : null,
    totalCotas: null,
    patrimonioLiquido: plMatch ? plMatch[1] : null,
    numeroCotistas: cotistasMatch ? cotistasMatch[1] : null,
    vacanciaFisica: vacFisMatch ? vacFisMatch[1] : null,
    vacanciaFinanceira: vacFinMatch ? vacFinMatch[1] : null,
    destaques
  };
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
      {loading && <span style={{ fontSize: 11, color: '#4A5568', fontWeight: 500 }}>Carregando visualização...</span>}
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
          <div style={{ fontSize: 11, color: '#2D3748', fontWeight: 600 }}>PDF Carregado</div>
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
            background: 'rgba(15,23,42,0.85)',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 600,
            padding: '2px 7px',
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

    const d1 = doc1.info;
    const d2 = doc2.info;

    // Métricas técnicas MoM
    const metricas = [
      {
        label: 'Rendimento por Cota',
        val1: d1.rendimentoCota ? `R$ ${d1.rendimentoCota}` : '-',
        val2: d2.rendimentoCota ? `R$ ${d2.rendimentoCota}` : '-',
        mom: formatMoMVariation(parseCurrencyBr(d1.rendimentoCota), parseCurrencyBr(d2.rendimentoCota))
      },
      {
        label: 'Dividend Yield (DY)',
        val1: d1.dividendYield ? `${d1.dividendYield}%` : '-',
        val2: d2.dividendYield ? `${d2.dividendYield}%` : '-',
        mom: formatMoMVariation(parsePercentBr(d1.dividendYield), parsePercentBr(d2.dividendYield), true)
      },
      {
        label: 'Valor Patrimonial (VP/Cota)',
        val1: d1.valorPatrimonial ? `R$ ${d1.valorPatrimonial}` : '-',
        val2: d2.valorPatrimonial ? `R$ ${d2.valorPatrimonial}` : '-',
        mom: formatMoMVariation(parseCurrencyBr(d1.valorPatrimonial), parseCurrencyBr(d2.valorPatrimonial))
      },
      {
        label: 'P/VP (Preço / VP)',
        val1: d1.pvp || '-',
        val2: d2.pvp || '-',
        mom: formatMoMVariation(parsePercentBr(d1.pvp), parsePercentBr(d2.pvp))
      },
      {
        label: 'Vacância Física',
        val1: d1.vacanciaFisica ? `${d1.vacanciaFisica}%` : '-',
        val2: d2.vacanciaFisica ? `${d2.vacanciaFisica}%` : '-',
        mom: formatMoMVariation(parsePercentBr(d1.vacanciaFisica), parsePercentBr(d2.vacanciaFisica), true),
        invertSentiment: true // Queda na vacância é positiva
      },
      {
        label: 'Vacância Financeira',
        val1: d1.vacanciaFinanceira ? `${d1.vacanciaFinanceira}%` : '-',
        val2: d2.vacanciaFinanceira ? `${d2.vacanciaFinanceira}%` : '-',
        mom: formatMoMVariation(parsePercentBr(d1.vacanciaFinanceira), parsePercentBr(d2.vacanciaFinanceira), true),
        invertSentiment: true
      },
      {
        label: 'Patrimônio Líquido',
        val1: d1.patrimonioLiquido || '-',
        val2: d2.patrimonioLiquido || '-',
        mom: null
      },
      {
        label: 'Base de Cotistas',
        val1: d1.numeroCotistas || '-',
        val2: d2.numeroCotistas || '-',
        mom: formatMoMVariation(parsePercentBr(d1.numeroCotistas), parsePercentBr(d2.numeroCotistas))
      }
    ];

    // Diagnóstico técnico automático
    const avaliacoes = [];
    const rDiff = formatMoMVariation(parseCurrencyBr(d1.rendimentoCota), parseCurrencyBr(d2.rendimentoCota));
    if (rDiff) {
      if (rDiff.diff > 0) {
        avaliacoes.push(`Distribuição de Proventos: Alta de ${rDiff.formattedDiff} (${rDiff.formattedPct}) indicando expansão de caixa ou receitas extraordinárias.`);
      } else if (rDiff.diff < 0) {
        avaliacoes.push(`Distribuição de Proventos: Recuo de ${rDiff.formattedDiff} (${rDiff.formattedPct}). Avaliar se houve retenção de reservas ou impacto sazonal.`);
      } else {
        avaliacoes.push(`Distribuição de Proventos: Estabilidade mantida em relação ao mês anterior.`);
      }
    }

    const vpDiff = formatMoMVariation(parseCurrencyBr(d1.valorPatrimonial), parseCurrencyBr(d2.valorPatrimonial));
    if (vpDiff) {
      if (vpDiff.diff > 0) {
        avaliacoes.push(`Patrimônio por Cota: Valorização de ${vpDiff.formattedDiff} no valor patrimonial de um mês para o outro.`);
      } else if (vpDiff.diff < 0) {
        avaliacoes.push(`Patrimônio por Cota: Variação patrimonial negativa de ${vpDiff.formattedDiff} entre os períodos.`);
      }
    }

    const vacDiff = formatMoMVariation(parsePercentBr(d1.vacanciaFisica), parsePercentBr(d2.vacanciaFisica), true);
    if (vacDiff) {
      if (vacDiff.diff < 0) {
        avaliacoes.push(`Ocupação Imobiliária: Melhora operacional com queda na vacância física em ${Math.abs(vacDiff.diff).toFixed(2)} p.p.`);
      } else if (vacDiff.diff > 0) {
        avaliacoes.push(`Ocupação Imobiliária: Atenção para o aumento da vacância física de +${vacDiff.diff.toFixed(2)} p.p.`);
      }
    }

    setComparativo({
      ativo: doc1.ticker || doc2.ticker,
      mes1: doc1.month,
      mes2: doc2.month,
      arquivo1: doc1.name,
      arquivo2: doc2.name,
      doc1: d1,
      doc2: d2,
      metricas,
      avaliacoes
    });
    setComparando(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 16, color: '#0F172A', fontWeight: 700 }}>Comparativo de Relatórios Gerenciais</h2>

      {/* Quadrantes compactos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 320px))', gap: 16, marginBottom: 20, justifyContent: 'start' }}>
        <div style={{ border: '1px solid #CBD5E1', borderRadius: 8, padding: 12, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#1E293B', fontWeight: 600 }}>Relatório Mês 1</h4>
          <div style={{ width: '100%', height: 130, border: '1px dashed #94A3B8', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 8, background: '#F8FAFC' }}>
            {doc1?.file ? (
              <PdfCanvasPreview file={doc1.file} previewUrl={preview1} />
            ) : (
              <span style={{ color: '#64748B', fontSize: 11, fontWeight: 500 }}>Preview do PDF</span>
            )}
          </div>
          <label style={{ display: 'inline-block', padding: '6px 12px', background: '#0284C7', color: '#FFFFFF', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            {loading1 ? 'Lendo...' : 'Upload Mês 1 (PDF)'}
            <input type="file" accept="application/pdf" onChange={handleUpload1} style={{ display: 'none' }} />
          </label>
          {doc1 && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#334155', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div><b>Arquivo:</b> {doc1.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <b>Ativo:</b>
                <input
                  type="text"
                  value={doc1.ticker || ''}
                  onChange={(e) => setDoc1(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
                  placeholder="Ex: HGLG11"
                  style={{ width: 85, padding: '2px 6px', fontSize: 11, border: '1px solid #94A3B8', borderRadius: 4, color: '#0F172A', background: '#FFFFFF', fontWeight: 600 }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <b>Mês:</b>
                <input
                  type="text"
                  value={doc1.month || ''}
                  onChange={(e) => setDoc1(prev => ({ ...prev, month: e.target.value }))}
                  placeholder="AAAA-MM"
                  style={{ width: 85, padding: '2px 6px', fontSize: 11, border: '1px solid #94A3B8', borderRadius: 4, color: '#0F172A', background: '#FFFFFF', fontWeight: 600 }}
                />
              </div>

              {/* Indicadores Chave Detectados / Editáveis */}
              <details style={{ marginTop: 6, border: '1px solid #E2E8F0', borderRadius: 4, padding: 6, background: '#F8FAFC' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#0284C7', outline: 'none' }}>
                  ⚙️ Indicadores do Mês 1
                </summary>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
                  <div>
                    <label style={{ fontSize: 10, color: '#64748B', display: 'block' }}>Rend. Cota (R$)</label>
                    <input
                      type="text"
                      value={doc1.info?.rendimentoCota || ''}
                      onChange={(e) => setDoc1(prev => ({ ...prev, info: { ...prev.info, rendimentoCota: e.target.value } }))}
                      placeholder="Ex: 0,85"
                      style={{ width: '100%', padding: '2px 4px', fontSize: 11, border: '1px solid #CBD5E1', borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: '#64748B', display: 'block' }}>DY (% ao ano)</label>
                    <input
                      type="text"
                      value={doc1.info?.dividendYield || ''}
                      onChange={(e) => setDoc1(prev => ({ ...prev, info: { ...prev.info, dividendYield: e.target.value } }))}
                      placeholder="Ex: 10,5"
                      style={{ width: '100%', padding: '2px 4px', fontSize: 11, border: '1px solid #CBD5E1', borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: '#64748B', display: 'block' }}>VP / Cota (R$)</label>
                    <input
                      type="text"
                      value={doc1.info?.valorPatrimonial || ''}
                      onChange={(e) => setDoc1(prev => ({ ...prev, info: { ...prev.info, valorPatrimonial: e.target.value } }))}
                      placeholder="Ex: 98,50"
                      style={{ width: '100%', padding: '2px 4px', fontSize: 11, border: '1px solid #CBD5E1', borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: '#64748B', display: 'block' }}>P / VP</label>
                    <input
                      type="text"
                      value={doc1.info?.pvp || ''}
                      onChange={(e) => setDoc1(prev => ({ ...prev, info: { ...prev.info, pvp: e.target.value } }))}
                      placeholder="Ex: 0,98"
                      style={{ width: '100%', padding: '2px 4px', fontSize: 11, border: '1px solid #CBD5E1', borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: '#64748B', display: 'block' }}>Vac. Física (%)</label>
                    <input
                      type="text"
                      value={doc1.info?.vacanciaFisica || ''}
                      onChange={(e) => setDoc1(prev => ({ ...prev, info: { ...prev.info, vacanciaFisica: e.target.value } }))}
                      placeholder="Ex: 4,5"
                      style={{ width: '100%', padding: '2px 4px', fontSize: 11, border: '1px solid #CBD5E1', borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: '#64748B', display: 'block' }}>Vac. Financeira (%)</label>
                    <input
                      type="text"
                      value={doc1.info?.vacanciaFinanceira || ''}
                      onChange={(e) => setDoc1(prev => ({ ...prev, info: { ...prev.info, vacanciaFinanceira: e.target.value } }))}
                      placeholder="Ex: 3,2"
                      style={{ width: '100%', padding: '2px 4px', fontSize: 11, border: '1px solid #CBD5E1', borderRadius: 4 }}
                    />
                  </div>
                </div>
              </details>
            </div>
          )}
        </div>

        <div style={{ border: '1px solid #CBD5E1', borderRadius: 8, padding: 12, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#1E293B', fontWeight: 600 }}>Relatório Mês 2 (Posterior)</h4>
          <div style={{ width: '100%', height: 130, border: '1px dashed #94A3B8', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 8, background: '#F8FAFC' }}>
            {doc2?.file ? (
              <PdfCanvasPreview file={doc2.file} previewUrl={preview2} />
            ) : (
              <span style={{ color: '#64748B', fontSize: 11, fontWeight: 500 }}>Preview do PDF</span>
            )}
          </div>
          <label style={{ display: 'inline-block', padding: '6px 12px', background: doc1 ? '#0284C7' : '#94A3B8', color: '#FFFFFF', borderRadius: 6, cursor: doc1 ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 600 }}>
            {loading2 ? 'Lendo...' : 'Upload Mês 2 (PDF)'}
            <input type="file" accept="application/pdf" onChange={handleUpload2} style={{ display: 'none' }} disabled={!doc1} />
          </label>
          {doc2 && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#334155', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div><b>Arquivo:</b> {doc2.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <b>Ativo:</b>
                <input
                  type="text"
                  value={doc2.ticker || ''}
                  onChange={(e) => setDoc2(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
                  placeholder="Ex: HGLG11"
                  style={{ width: 85, padding: '2px 6px', fontSize: 11, border: '1px solid #94A3B8', borderRadius: 4, color: '#0F172A', background: '#FFFFFF', fontWeight: 600 }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <b>Mês:</b>
                <input
                  type="text"
                  value={doc2.month || ''}
                  onChange={(e) => setDoc2(prev => ({ ...prev, month: e.target.value }))}
                  placeholder="AAAA-MM"
                  style={{ width: 85, padding: '2px 6px', fontSize: 11, border: '1px solid #94A3B8', borderRadius: 4, color: '#0F172A', background: '#FFFFFF', fontWeight: 600 }}
                />
              </div>

              {/* Indicadores Chave Detectados / Editáveis */}
              <details style={{ marginTop: 6, border: '1px solid #E2E8F0', borderRadius: 4, padding: 6, background: '#F8FAFC' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#0284C7', outline: 'none' }}>
                  ⚙️ Indicadores do Mês 2
                </summary>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
                  <div>
                    <label style={{ fontSize: 10, color: '#64748B', display: 'block' }}>Rend. Cota (R$)</label>
                    <input
                      type="text"
                      value={doc2.info?.rendimentoCota || ''}
                      onChange={(e) => setDoc2(prev => ({ ...prev, info: { ...prev.info, rendimentoCota: e.target.value } }))}
                      placeholder="Ex: 0,85"
                      style={{ width: '100%', padding: '2px 4px', fontSize: 11, border: '1px solid #CBD5E1', borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: '#64748B', display: 'block' }}>DY (% ao ano)</label>
                    <input
                      type="text"
                      value={doc2.info?.dividendYield || ''}
                      onChange={(e) => setDoc2(prev => ({ ...prev, info: { ...prev.info, dividendYield: e.target.value } }))}
                      placeholder="Ex: 10,5"
                      style={{ width: '100%', padding: '2px 4px', fontSize: 11, border: '1px solid #CBD5E1', borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: '#64748B', display: 'block' }}>VP / Cota (R$)</label>
                    <input
                      type="text"
                      value={doc2.info?.valorPatrimonial || ''}
                      onChange={(e) => setDoc2(prev => ({ ...prev, info: { ...prev.info, valorPatrimonial: e.target.value } }))}
                      placeholder="Ex: 98,50"
                      style={{ width: '100%', padding: '2px 4px', fontSize: 11, border: '1px solid #CBD5E1', borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: '#64748B', display: 'block' }}>P / VP</label>
                    <input
                      type="text"
                      value={doc2.info?.pvp || ''}
                      onChange={(e) => setDoc2(prev => ({ ...prev, info: { ...prev.info, pvp: e.target.value } }))}
                      placeholder="Ex: 0,98"
                      style={{ width: '100%', padding: '2px 4px', fontSize: 11, border: '1px solid #CBD5E1', borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: '#64748B', display: 'block' }}>Vac. Física (%)</label>
                    <input
                      type="text"
                      value={doc2.info?.vacanciaFisica || ''}
                      onChange={(e) => setDoc2(prev => ({ ...prev, info: { ...prev.info, vacanciaFisica: e.target.value } }))}
                      placeholder="Ex: 4,5"
                      style={{ width: '100%', padding: '2px 4px', fontSize: 11, border: '1px solid #CBD5E1', borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: '#64748B', display: 'block' }}>Vac. Financeira (%)</label>
                    <input
                      type="text"
                      value={doc2.info?.vacanciaFinanceira || ''}
                      onChange={(e) => setDoc2(prev => ({ ...prev, info: { ...prev.info, vacanciaFinanceira: e.target.value } }))}
                      placeholder="Ex: 3,2"
                      style={{ width: '100%', padding: '2px 4px', fontSize: 11, border: '1px solid #CBD5E1', borderRadius: 4 }}
                    />
                  </div>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>

      {erro && <div style={{ color: '#991B1B', marginBottom: 12, fontSize: 13, background: '#FEE2E2', padding: '10px 14px', borderRadius: 6, fontWeight: 500, border: '1px solid #FCA5A5' }}>{erro}</div>}
      {aviso && <div style={{ color: '#92400E', marginBottom: 12, fontSize: 13, background: '#FEF3C7', padding: '10px 14px', borderRadius: 6, border: '1px solid #FCD34D', fontWeight: 500 }}>{aviso}</div>}

      <button onClick={ativarComparacao} disabled={!doc1 || !doc2 || comparando} style={{ padding: '9px 18px', background: doc1 && doc2 ? '#16A34A' : '#94A3B8', color: '#FFFFFF', border: 'none', borderRadius: 6, cursor: doc1 && doc2 ? 'pointer' : 'not-allowed', marginBottom: 20, fontWeight: 700, fontSize: 13, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        {comparando ? 'Analisando e Comparando...' : 'Ativar Comparação Técnica'}
      </button>

      {comparativo && (
        <div style={{ border: '1px solid #CBD5E1', borderRadius: 8, padding: 20, background: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {/* Cabeçalho do Comparativo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #E2E8F0', paddingBottom: 12, marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, color: '#0F172A', fontSize: 18, fontWeight: 700 }}>
                Comparativo MoM — {comparativo.ativo || 'Ativo'}
              </h3>
              <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>
                {comparativo.mes1 || 'Mês 1'} ({comparativo.arquivo1}) vs {comparativo.mes2 || 'Mês 2'} ({comparativo.arquivo2})
              </span>
            </div>
            <div style={{ background: '#F1F5F9', padding: '6px 12px', borderRadius: 6, fontSize: 12, color: '#0F172A', fontWeight: 600, border: '1px solid #CBD5E1' }}>
              Competência: {comparativo.mes1 || '-'} → {comparativo.mes2 || '-'}
            </div>
          </div>

          {/* Tabela Técnica de Métricas MoM */}
          <div style={{ marginBottom: 20, overflowX: 'auto' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: 14, color: '#0F172A', fontWeight: 700 }}>
              📊 Indicadores Financeiros e Operacionais (Mês a Mês)
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #CBD5E1', color: '#0F172A' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Indicador Chave</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Mês 1 ({comparativo.mes1 || '-'})</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Mês 2 ({comparativo.mes2 || '-'})</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Variação Nominal</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Variação % (MoM)</th>
                </tr>
              </thead>
              <tbody>
                {comparativo.metricas.map((m, idx) => {
                  const hasMom = !!m.mom;
                  const isUp = m.mom?.direction === 'up';
                  const isDown = m.mom?.direction === 'down';
                  const isGood = m.invertSentiment ? isDown : isUp;
                  const isBad = m.invertSentiment ? isUp : isDown;
                  const badgeColor = isGood ? '#15803D' : isBad ? '#B91C1C' : '#475569';
                  const badgeBg = isGood ? '#DCFCE7' : isBad ? '#FEE2E2' : '#F1F5F9';

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1E293B' }}>{m.label}</td>
                      <td style={{ padding: '10px 12px', color: '#334155', fontWeight: 500 }}>{m.val1}</td>
                      <td style={{ padding: '10px 12px', color: '#0F172A', fontWeight: 700 }}>{m.val2}</td>
                      <td style={{ padding: '10px 12px', color: hasMom ? badgeColor : '#64748B', fontWeight: 600 }}>
                        {hasMom ? m.mom.formattedDiff : '-'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {hasMom ? (
                          <span style={{ background: badgeBg, color: badgeColor, padding: '3px 8px', borderRadius: 4, fontWeight: 700, fontSize: 12 }}>
                            {m.mom.formattedPct}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Avaliação Técnica Sintética */}
          <div style={{ marginBottom: 20, background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 8, padding: 14 }}>
            <h4 style={{ margin: '0 0 10px', fontSize: 14, color: '#0F172A', fontWeight: 700 }}>
              🧠 Avaliação Técnica e Diagnóstico de Performance
            </h4>
            {comparativo.avaliacoes.length > 0 ? (
              comparativo.avaliacoes.map((av, idx) => (
                <div key={idx} style={{ padding: '8px 12px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, marginBottom: 8, fontSize: 13, color: '#0F172A', fontWeight: 500, lineHeight: 1.5 }}>
                  📌 {av}
                </div>
              ))
            ) : (
              <div style={{ fontSize: 13, color: '#334155' }}>
                Os relatórios apresentam métricas dentro do padrão. Verifique a tabela quantitativa acima para detalhamento numérico.
              </div>
            )}
          </div>

          {/* Eventos Operacionais: Compras, Vendas e Atos Relevantes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, background: '#F8FAFC' }}>
              <h5 style={{ margin: '0 0 8px', fontSize: 13, color: '#0F172A', fontWeight: 700 }}>
                🏢 Movimentações e Destaques — Mês 1 ({comparativo.mes1 || '-'})
              </h5>
              {comparativo.doc1.destaques?.length > 0 ? (
                comparativo.doc1.destaques.map((d, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#1E293B', padding: '6px 8px', background: '#FFFFFF', borderRadius: 4, marginBottom: 6, border: '1px solid #E2E8F0', lineHeight: 1.4 }}>
                    • {d}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: '#64748B' }}>Nenhum destaque textual identificado no período.</div>
              )}
            </div>

            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, background: '#F8FAFC' }}>
              <h5 style={{ margin: '0 0 8px', fontSize: 13, color: '#0F172A', fontWeight: 700 }}>
                🏢 Movimentações e Destaques — Mês 2 ({comparativo.mes2 || '-'})
              </h5>
              {comparativo.doc2.destaques?.length > 0 ? (
                comparativo.doc2.destaques.map((d, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#1E293B', padding: '6px 8px', background: '#FFFFFF', borderRadius: 4, marginBottom: 6, border: '1px solid #E2E8F0', lineHeight: 1.4 }}>
                    • {d}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: '#64748B' }}>Nenhum destaque textual identificado no período.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Relatorios;

