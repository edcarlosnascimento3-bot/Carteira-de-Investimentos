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

## 2026-08-10

**Foco:** Correção de deploy Vercel abrindo em branco (dados "sumidos")
**Arquivos alterados:** src/context/TransactionsContext.jsx, src/context/RfManualContext.jsx, src/context/UserContext.jsx, src/services/storage.js
**Decisões:**
- Providers (Transactions, RfManual, User) passam a depender de [user] e só carregam após login — antes liam no mount com deps [] e nunca re-buscavam
- db.read agora trata []/{} (vazios) como "sem dados" via hasData() — cache local vazio não mascara mais o Supabase
- storage.js reescrito limpo (IndexedDB real, sem stubs) com export default db
**Pendências:**
- Verificação manual pelo usuário: hard refresh (Ctrl+Shift+R) e login

## 2026-08-10 (2)

**Foco:** Investigação de "Renda Fixa ainda aparece na faixa de tickers" (apenas diagnóstico, sem alteração de código)
**Arquivos alterados:** Nenhum
**Decisões:**
- Código do filtro está correto: `Principal.jsx:176-182` filtra `rfTickers` (tipo exato 'Renda Fixa') da faixa; não há outra faixa/scroll no app
- `db_transactions.json` (via IPC Electron) tem 56 transações RF (IPCA+ 2032, 99 PAY, XP INVEST, SOFISA, RESERVA, LTBX11) com tipo exato — seriam todas removidas
- Bundle `dist` (construído 10/08 20:57) já contém o filtro; `TransactionsContext` normaliza só `fii`→`FII`, guardando tipo verbatim
**Pendências:**
- Confirmar com usuário: quais tickers aparecem na faixa e como o app é executado (Vite dev vs Electron) — suspeitas: build stale/Electron sem rebuild ou dados vivos (localStorage/Supabase) com tipo divergente
- Se necessário, endurecer filtro (trim/case-insensitive + excluir `ETFS_RENDA_FIXA` BTER11/LTBX11 independente do tipo)

## 2026-08-11

**Foco:** Corrigir logo do TRXF11 voltando à versão antiga (chaves minúsculas duplicadas) + deploy
**Arquivos alterados:** src/components/LogoImage.jsx, src/database/TickerCatalogService.js, db_ativos.json, CONVERSAS.md
**Decisões:**
- Causa raiz: ativos no runtime guardavam `imagem` (minúsculo) duplicado de `IMAGEM`; `LogoImage` só lia `a.IMAGEM`. Corrigido para `a.IMAGEM || a.imagem`
- `TickerCatalogService` ganhou `LEGACY_KEYS`/`stripLegacyKeys`/`mergeWith` em `adicionar`/`atualizar`/`importarRegistros` para eliminar chaves minúsculas no merge (evita recorrência)
- `db_ativos.json`: removidas chaves legadas de BBAS3, GARE11, TRXF11, IPCA+ 2032; diff de 2 linhas; 946 ativos
- Deploy feito via `vercel --prod` a partir de checkout limpo do commit `cde101d` (working tree tinha mudanças não commitadas de outra sessão que não deveriam ir) — publicado em carteira-de-investimentos-beryl.vercel.app (17s, status 200)
- Supabase `app_data` retorna 0 registros com anon key (provável RLS) — runtime lê localStorage/Supabase, não `db_ativos.json`
**Pendências:**
- Commit `cde101d` NÃO pushado para origin/main (deploy via CLI, não via GitHub)
- Mudanças de outras sessões seguem sem commit (auth/metas/filtro RF): RfManualContext, TransactionsContext, UserContext, MetasContext (novo), main.jsx, Meta.jsx, Principal.jsx, storage.js, AGENTS.md
- Para o outro computador ver o logo corrigido: salvar o link do TRXF11 uma vez pela UI (modal "Link da Imagem / Logo do Ativo")


## 2026-08-12

**Foco:** Card VALOR MENSAL DESEJADO (página Meta) trocou input direto por exibição de valor + popover de edição com lápis
**Arquivos alterados:** src/pages/Meta.jsx
**Decisões:**
- Valor exibido como texto formatado (R$ X) com botão lápis; input agora vive em popover (Salvar/Cancelar) que fecha ao clicar fora
- Popover pré-carrega valor atual e mantém máscara parseDesejadoInput/formatDesejadoInput; persistência continua via handleMetaChange('__global__', 'recebimento', ...) (MetasContext)
- Removidos estado focusedInput e helpers globalDesejadoFocused/globalDesejadoDisplay (sem uso); adicionado estilo smallBtnStyle
- Build de produção OK (apenas warnings pré-existentes de chunk size)
**Pendências:**
- Mesmas do dia 2026-08-11 (commits não pushados)


## 2026-08-12 (2)

**Foco:** Refatoração: componente reutilizável EditableField aplicado ao card global e ao campo Meta dos cards de ticker (página Meta)
**Arquivos alterados:** src/pages/Meta.jsx, CONVERSAS.md
**Decisões:**
- Criado `EditableField` em Meta.jsx (fora de `Meta()`): input readOnly + lápis SVG + popover `position:fixed` (evita corte do `overflow:hidden` do .widget-card) posicionado via `getBoundingClientRect`, com props formatCard/formatDraft/parse/initialDraft/placeholder/onSave/inputStyleOverride
- Card global VALOR MENSAL DESEJADO usa `EditableField` com máscara moeda pt-BR (vírgula em tempo real) e `onSave` persistindo em `handleMetaChange('__global__','recebimento', parseDesejadoInput(d))`
- Campo Meta dos cards de ticker usa `EditableField` com parse só-dígitos (`.replace(/\D/g,'')`) e `onSave` → `handleMetaChange(card.ticker,'meta', ...)`
- Removidos estado/funções antigos do popover global (`draftValor`, `popoverPos`, `editRef`, `openMetaEditor`, `closeMetaEditor`, `saveMetaEditor`) e estilos `inputStyle`/`smallBtnStyle` do corpo de `Meta()` (componente tem o seu próprio)
- Build de produção OK; deploy via `vercel --prod` pendente após essa sessão
**Pendências:**
- Mesmas do dia 2026-08-11 (commits não pushados)

## 2026-08-13

**Foco:** Ajuste de cache no navegador (Edge) e correção de overflow dos rótulos nos gráficos da página Gráficos
**Arquivos alterados:** src/pages/Graficos.jsx, CONVERSAS.md
**Decisões:**
- Logos de ativos: usuário confirmou que o problema era cache; solução `Ctrl+F5` (instruções de limpeza do Edge fornecidas). `db_ativos.json` já continha 99 logos não-bastter.
- Gráficos com rótulo cortado (Quantidade de Ativos, Média Mensal dos Proventos, Evolução do Patrimônio): adicionado `padding` nos eixos — XAxis `right` nos gráficos de barra horizontal e YAxis `top` + XAxis `right` no de linha.
- Push agora usa `git -c credential.helper=manager push` (o `gh` não está instalado e não há credential helper global).

## 2026-08-12 (3)

**Foco:** Ajuste de layout do campo Meta nos cards de ticker (página Meta)
**Arquivos alterados:** src/pages/Meta.jsx, CONVERSAS.md
**Decisões:**
- No card de ticker, o rótulo "Meta" e o campo de preenchimento agora ficam na mesma linha, abaixo da linha "Cotas" (antes tudo numa única linha com `flexWrap: wrap` e `marginLeft: auto`)
- Estrutura: linha 1 = "Cotas" + valor; linha 2 = "Meta" + `EditableField` (sem quebra)
- Build de produção OK; deploy feito via `vercel --prod` (alias carteira-de-investimentos-beryl.vercel.app, 19s)
**Pendências:**
- Mesmas do dia 2026-08-11 (commits não pushados)

## 2026-08-14

**Foco:** Logos vindos 100% do `db_ativos.json` (links da planilha) — corrigido MXRF11 e ativos que mostravam imagens não cadastradas
**Arquivos alterados:** src/components/LogoImage.jsx, CONVERSAS.md
**Decisões:**
- Usuário esclareceu que subiu planilha para popular o `db_ativos` e que as imagens devem vir desses links (incluindo as automáticas do Bastter) — não são só as manuais
- Diagnóstico: Supabase `app_data` NÃO tem o catálogo `ativos` (0 registros com anon key) → o navegador lia dados antigos do localStorage/IndexedDB com imagens de StatusInvest/TradingView etc. salvas pelo código anterior; o MXRF11 estava sim no `db_ativos.json` com `files.bastter.com/fii/MXRF11.gif`
- `LogoImage` reescrito para importar **diretamente** `db_ativos.json` (`import dbAtivos`) e montar `ativosMap` TICKER→IMAGEM, eliminando a dependência do storage persistido; mantido evento `ticker-logo-updated` para edição via UI e fallback letra inicial
- Removidas todas as fontes externas (Clearbit, TradingView, StatusInvest, cryptologos, favicons) — já não existiam desde o commit 7942d33, agora nem o storage é consultado
- Build OK (826 módulos; bundle 1.486 kB por causa do JSON embutido); commit `e919de6` + push `7942d33..e919de6` → deploy Vercel ● Ready
**Pendências:**
- Usuário deve abrir https://carteira-de-investimentos-beryl.vercel.app/ e fazer hard refresh (Ctrl+F5)/limpar dados do site para descartar caches antigos
