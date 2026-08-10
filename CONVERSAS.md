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

## 2026-06-20

**Foco:** Redesign do filtro setor/subsetor em AnalisarAcoes — busca ativos da B3 via brapi API em vez de filtrar transações do usuário
**Arquivos alterados:** `src/pages/AnalisarAcoes.jsx`
**Decisões:**
- `sectorMapENtoPT`/`industryMapENtoPT` mapeiam inglês→português; `sectorPTtoEN`/`subsectorPTtoEN` revertem para filtrar
- `allStocks` carregado uma vez no mount via `fetchAllStocksWithSectors()`
- Perfis (com `industry`) buscados sob demanda apenas quando setor+subsetor selecionados
- `uniqueTickers` (derivado de transações) removido da lógica de filtro
- Sidebar exibe nome da empresa + setor em português; `loadingAllStocks` e `loadingProfiles` controlam loading states
**Pendências:**
- Testar usabilidade: clique em ativo fora do portfólio, loading states, filtro combinado setor+subsetor

## 2026-06-28

**Foco:** Deploy Vercel + correção tela preta pós-login
**Arquivos alterados:** `src/App.jsx`
**Decisões:**
- `signOut` faltava no destructuring de `useAuth()` — causava ReferenceError ao renderizar o app após login
- Env vars do Vercel estavam vazias (causa do Invalid API key) — deletadas e recriadas via API
- Link correto: `https://carteira-de-investimentos-beryl.vercel.app`
**Pendências:**
- Testar login do seed user e confirmar que dados carregam

## 2026-08-04

**Foco:** Conversão de cores hardcoded para variáveis CSS do tema + gráfico Evolução do Patrimônio + ajustes visuais
**Arquivos alterados:** 21 arquivos em `src/` (todas as páginas, componentes e globals.css)
**Decisões:**
- Substituídas 315+ ocorrências de cores hex neutras por `var(--...)` para o toggle claro/escuro valer em todas as telas; mantidas cores de dados/semáforos/paletas e overlay escuro dos gráficos
- Gráfico "Evolução Do Patrimônio Ano a Ano" renomeado para "Investimento Ano a Ano"; criado novo gráfico "Evolução do Patrimônio Ano a Ano" com valor investido acumulado, linha verde `#2E7D32`, círculos maiores e rótulos em amarelo (`var(--gold)`)
- Modal de informações do ativo translúcido (`--modal-bg` 0.72 dark / 0.78 light) com blur; cotas em azul negrito `#1E4FD8` no tema claro
- Commits: c89be12, c9808d1, 98420f9, d21c232, 3d3e9af, 6cd2ee5, 0e8ec98, ce06f9d — todos com push (deploy Vercel)
**Pendências:**
- Nenhuma

## 2026-08-09

**Foco:** Correção da persistência do logo de ativos (VSLH11/BTER11) + precificação de ETFs de renda fixa pelo mercado
**Arquivos alterados:** src/database/TickerCatalogService.js, src/data/etfRendaFixa.js (novo), src/pages/Carteira.jsx, src/pages/Graficos.jsx, src/pages/Principal.jsx, src/pages/Lancamentos.jsx, src/pages/Meta.jsx, src/pages/Recebiveis.jsx, src/context/ProventosContext.jsx, src/context/TransactionsContext.jsx, src/components/Modals/EditTransactionModal.jsx, src/styles/globals.css, db_ativos.json, .gitignore
**Decisões:**
- Causa raiz do bug do logo: `TickerCatalogService.atualizar()` fazia merge minúsculo vs MAIÚSCULO (campos nunca sobrescritos) e match case-sensitive — agora normaliza para `NOME/CNPJ/TIPO/IMAGEM/LINK` e usa `toUpperCase().trim()`
- ETFs de renda fixa (BTER11, LTBX11) via `ETFS_RENDA_FIXA` em `src/data/etfRendaFixa.js`: precificados pelo mercado (preço da cotação) em vez de preço médio/manual na Carteira, Principal e Graficos; tipo exibido como "ETF" nos Lançamentos
- Normalização global de tipo `Fii`→`FII` nos contexts e dados existentes
- Modal do ativo (Principal) ganhou Valor Investido, Valor Atual e Valorização %
- Deploy: `vercel --prod` (alias beryl) após build OK — commit 68a4375
**Pendências:**
- Conferir no deploy se o logo do VSLH11/BTER11 persiste após recarregar a página
