# Conversas do Projeto - Carteira de Investimentos

## 2026-06-01

## 2026-06-10

**Foco:** Persistência de valores manuais de renda fixa via IndexedDB
**Arquivos alterados:** src/pages/Carteira.jsx
**Decisões:**
- Renda fixa manual salva via `db.write('rf_manual', data)` no IndexedDB + localStorage
- Ao carregar, tenta IndexedDB primeiro com fallback para localStorage
**Pendências:**
- Nenhuma

## 2026-06-15

**Foco:** Gráfico Por Corretora com mapeamento ticker→corretora, rótulos em duas linhas, popup ao clicar
**Arquivos alterados:** src/pages/Graficos.jsx
**Decisões:**
- `corretoraPorTicker` duplicado em Lancamentos.jsx e Graficos.jsx (manter sincronizado manualmente)
- Rótulos do gráfico: nome+percentual em branco negrito na linha 1, valor em verde na linha 2
- Popup ao clicar na fatia lista tickers + valores + total + botão fechar
- Gráfico ajustado para mesmo tamanho do Internacional (55%/15%)
**Pendências:**
- Nenhuma

