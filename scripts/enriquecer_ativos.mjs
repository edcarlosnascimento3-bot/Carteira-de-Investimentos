import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const XLSX_PATH = 'C:/Users/Ed Carlos/Desktop/Codigos/Tabela de ativos.xlsx';
const DB_PATH = new URL('../db_ativos.json', import.meta.url);

const wb = XLSX.readFile(XLSX_PATH);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

const padrao = rows.map((r, i) => ({
  TICKER: String(r.TICKER || '').trim(),
  NOME: String(r.NOME || '').trim(),
  CNPJ: String(r.CNPJ || '').trim(),
  TIPO: String(r.TIPO || '').trim(),
  SEGMENTO: String(r.SEGMENTO || '').trim(),
  IMAGEM: String(r.IMAGEM || '').trim(),
  LINK: ''
}));

const existentesRaw = readFileSync(DB_PATH, 'utf-8');
let existentes = [];
try { existentes = JSON.parse(existentesRaw); } catch {}

const enriched = padrao.map(novo => {
  const old = existentes.find(e => e.TICKER === novo.TICKER);
  return {
    ...novo,
    IMAGEM: novo.IMAGEM || (old?.IMAGEM || ''),
    LINK: old?.LINK || ''
  };
});

const novosTickers = new Set(padrao.map(r => r.TICKER));
const extras = existentes.filter(e => !novosTickers.has(e.TICKER));
const resultado = [...enriched, ...extras];

writeFileSync(DB_PATH, JSON.stringify(resultado, null, 2), 'utf-8');
console.log(`Enriquecido: ${resultado.length} registros (${enriched.length} da planilha + ${extras.length} extras existentes)`);
