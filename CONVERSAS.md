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

## 2026-06-16

**Foco:** Fallback de valor para Renda Fixa quando manualAtual é nulo
**Arquivos alterados:** src/pages/Carteira.jsx, src/pages/Compra.jsx
**Decisões:**
- Carteira.jsx: mesmo fallback de Principal.jsx — Renda Fixa sem manualAtual usa precoMedio (atual = investido)
- Compra.jsx: se manual[ticker] já existe, acumula novo total; senão, calcula soma de todas as compras do ativo
**Pendências:**
- Nenhuma

## 2026-06-16 (2)

**Foco:** Corretora no EditTransactionModal + gráfico Por Corretora reativo
**Arquivos alterados:** src/components/Modals/EditTransactionModal.jsx, src/pages/Graficos.jsx
**Decisões:**
- EditTransactionModal: campo Corretora usa `<datalist>` populado de `CorretoraService.listar()`
- Graficos.jsx: `portfolioBase` agora captura `corretora` da transação; `corretoraData` usa `a.corretora || corretoraPorTicker[a.ticker] || 'Outros'`
- Gráfico agora reflete edições no campo corretora em vez de depender apenas do mapa estático
**Pendências:**
- Nenhuma

## 2026-06-16 (3)

**Foco:** Logo da corretora no popup do gráfico Por Corretora
**Arquivos alterados:** src/pages/Graficos.jsx
**Decisões:**
- Popup exibe logo da corretora (se cadastrada) antes do nome
- Botão "Editar Logo" permite salvar URL de logo via CorretoraService
- Corretoras carregadas com useEffect para popular logo/escolha
**Pendências:**
- Nenhuma

## 2026-06-18

**Foco:** Fallback de logos — phantom pixel detection + companyDomains
**Arquivos alterados:** `src/components/LogoImage.jsx`, `src/data/companyDomains.js`
**Decisões:**
- Phantom pixel detection scoped apenas a Clearbit (evita falsos positivos em imagens pequenas reais)
- Todos os URL sources usam `sanitizeTicker()` (remove caracteres não alfanuméricos)
- Fallback chain: catalog → overrides → Clearbit → TV → StatusInvest → colored hash
- FIIs excluídos de companyDomains (logos vêm do DB ou TV/StatusInvest)
**Pendências:**
- Nenhuma

## 2026-06-17

**Foco:** Correção dos 4 filtros na página de Lançamentos
**Arquivos alterados:** `src/pages/Lancamentos.jsx`
**Decisões:**
- Refatoração da lógica de filtragem da tabela para usar sanitização de strings (`.trim()`) evitando que espaços em branco quebrem a igualdade estrita.
- Manutenção do sistema "cascading" (filtros interativos), mas agora blindados contra retornos `undefined` ou nulos nas opções.
- Correção no `.sort()` das datas para utilizar `.getTime()`, prevenindo falhas silenciosas na ordenação que poderiam congelar a tabela.
**Pendências:**
- Nenhuma

## 2026-06-17 (2)

**Foco:** Reordenação de blocos de gráfico + paleta exclusiva para Internacional
**Arquivos alterados:** `src/pages/Graficos.jsx`
**Decisões:**
- Blocos Proventos Mensais e Proventos por Tipo movidos para o topo (antes de Investimento e Evolução)
- Criado array `INTL_COLORS` separado para o gráfico Internacional (marrom escuro + verde claro)
- `CHART_COLORS` original mantido para os demais gráficos
**Pendências:**
- Nenhuma
