# Histórico de Conversas

## 2026-08-26

**Foco:** Correção de bugs na IRRF2 - dados não apareciam (campo e data incorretos)
**Arquivos alterados:**
- `src/services/irrfCalculations.js` (helpers de normalização + todas as funções)
- `src/components/IRRF2/GanhosPanel.jsx` (usa helpers)
- `src/components/IRRF2/ConferenciaPanel.jsx` (usa helpers)

**Decisões:**
- Criadas funções auxiliares: `parseDateBR()`, `getYearFromDate()`, `getMonthFromDate()`, `getOperacao()`
- Bug 1: Campo `operacao` (português) vs `operation` (inglês) - dados salvos usam "Compra"/"Venda", código esperava "C"/"buy"/"V"/"sell"
- Bug 2: Formato de data DD/MM/AAAA não é parseado por `new Date()` do JavaScript
- Helpers exportados para uso nos componentes GanhosPanel e ConferenciaPanel
- Build e deploy realizados com sucesso

---

## 2026-08-28

**Foco:** Auditoria completa do app — ataque de todos os itens pendentes (mandato "pode atacar todas")
**Arquivos alterados:**
- `src/data/constants.js` (criado — constantes extraídas do Graficos)
- `src/pages/Graficos.jsx` (RiscoRetornoCard extraído, MetricTile memoizado, imports de constants, card DY %/ano, card Fluxo de Caixa mensal, SectionErrorBoundary aplicado)
- `src/context/AppProviders.jsx` (grouping dos 5 providers em DataProviders)
- `src/components/SectionErrorBoundary.jsx` (criado — granular, CSS vars, botão "Tentar novamente")
- `src/App.jsx` (loading="lazy" + decoding="async" no avatar)
- `src/services/storage.js` (verificado — write path usa auth.uid(), compatível com RLS)
- `supabase/migrations/0001_rls_app_data.sql` (criado — RLS + índice único + políticas + cleanup)
- `vite.config.js` (manualChunks: vendor-react/router/recharts/xlsx)

**Decisões:**
- #8 já implementado em brapi.js (token bucket 40/min/IP) — nada a fazer; /api/yahoo é proxy público do Yahoo, aceitável
- #2 SQL executado no painel do Supabase (service_role) — RLS ativo em app_data
- #21 setor: adiado (requer dados brapi em runtime, flaky)
- #26 CSS modules: adiado (refactor ~1500 linhas, sem ganho imediato)
- #28 virtualização: adiado (exigiria react-window, tabelas sem paginação)
- #29 PWA/Service Worker: adiado (cache de dados ao vivo = alto risco)

**Validação:** 186/186 testes, build OK (index 459kB < 500kB), deploy Vercel OK, HTTP 200

**Pendências:**
- Nenhuma

---

## 2026-08-26 (sessão anterior)

**Foco:** Correção do bug tela preta (Buffer) + ErrorBoundary + Explicação IRPF2
**Arquivos alterados:**
- `src/main.jsx` (Buffer polyfill)
- `vite.config.js` (define + resolve.alias para buffer)
- `src/components/ErrorBoundary.jsx` (criado)
- `src/App.jsx` (ErrorBoundary wrapping Suspense+Routes)

**Decisões:**
- Tela preta causada por `Buffer is not defined` do xlsx-populate
- Buffer polyfill adicionado antes de imports
- ErrorBoundary criado para capturar erros de render
- Deploy manual via `vercel --prod --yes`

**Pendências:**
- Vercel auto-deploy falha

---

## 2026-08-28 (sessão: reposicionamento + same width/hover)

**Foco:** Mover gráficos "Rentabilidade de Dividendos por Ano" e "Fluxo de Caixa por Mês" para abaixo da row proventos, com mesma largura e efeitos hover
**Arquivos alterados:**
- `src/pages/Graficos.jsx` (reposicionamento para flex row lado a lado com `flex: 1`, adição de `activeBar={{ stroke: '#FFF', strokeWidth: 2, filter: 'brightness(1.15)' }}` nos dois Bar, remoção dos SectionErrorBoundary wrappers, `minHeight: 320`)

**Decisões:**
- Gráficos em flex row (`display: 'flex', gap: 16`) com `flex: 1` cada — mesma largura que proventos
- `activeBar` adicionado nos dois Bar components para hover idêntico aos proventos
- SectionErrorBoundary removido (não se aplica em cards lado a lado)

**Pendências:**
- Nenhuma

---

## 2026-08-28 (sessão: design do gráfico + icones info)

**Foco:** Igualar design do gráfico "Rentabilidade de Dividendos por Ano" ao "Evolução dos Proventos"; adicionar ícone "i" explicativo nos cards de Métricas
**Arquivos alterados:**
- `src/pages/Graficos.jsx` (BarChart Rentabilidade com margin/barSize/fill/radius iguais ao Evolução, LabelList com renderEvolLabel; MetricTile agora aceita `description` com svg "i" clicável e tooltip; 7 descrições adicionadas nos cards Métricas)

**Decisões:**
- Rentabilidade: `margin={{ left: 30, right: 30, top: 30, bottom: 10 }} barSize={60}`, `fill="#FFD700"`, `radius={[8,8,0,0]}`, `LabelList content={renderEvolLabel}` — idêntico a Evolução, sem activeBar (sem efeito hover branco)
- MetricTile: `description` opcional → svg "i" (circle+letter) que togga tooltip explicativo com `boxShadow` e `zIndex: 20`
- Tooltips por card independentes (cada um gerencia seu próprio `showDesc`)

**Validação:** Build OK, deploy Vercel OK, HTTP 200

**Pendências:**
- Nenhuma

---

## 2026-08-28 (sessão: ativoBar + cursor tooltip)

**Foco:** Copiar configuração exata do gráfico "Evolução dos Proventos Ano a Ano" para "Rentabilidade de Dividendos por Ano"
**Arquivos alterados:**
- `src/pages/Graficos.jsx` (adicionado `activeBar={{ stroke: '#FFF', strokeWidth: 2, filter: 'brightness(1.15)' }}` no Bar e `cursor={false}` no Tooltip do gráfico Rentabilidade)

**Decisões:**
- Configuração do Bar e Tooltip idêntica ao Evolução para consistência visual

**Validação:** Build OK, deploy Vercel OK, HTTP 200

**Pendências:**
- Nenhuma

---

## 2026-08-28 (sessão: rótulos percentuais)

**Foco:** Corrigir rótulos do gráfico "Rentabilidade de Dividendos por Ano" para formato percentual
**Arquivos alterados:**
- `src/pages/Graficos.jsx` (LabelList trocou `content={renderEvolLabel}` por `position="top" formatter={(v) => \`${Number(v).toFixed(1)}%\`}` — evita formatação moeda do renderEvolLabel)

**Decisões:**
- `renderEvolLabel` usa `formatCurrency()` (moeda), incompatível com dados percentuais
- `position="top"` + `formatter` mantém posicionamento e exibe `%`

**Validação:** Build OK, deploy Vercel OK, HTTP 200

**Pendências:**
- Nenhuma

---

## 2026-08-28 (sessão: IRRF 2 Proventos tab data fix)

**Foco:** Corrigir aba Proventos do IRRF 2 que não exibia dados lançados na página Proventos
**Arquivos alterados:**
- `src/components/IRRF2/ProventosPanel.jsx` (linhas 6, 17: `p.date` → `p.date || p.data`)
- `src/components/IRRF2/InformesPanel.jsx` (linha 9: `p.date` → `p.date || p.data`)

**Decisões:**
- Dados armazenados com campo `data` (português), mas código do IRRF 2 lia `date` (inglês)
- Padrão do restante do codebase é `p.date || p.data` (visto em irrfCalculations.js, ConferenciaPanel.jsx, Recebiveis.jsx)

**Validação:** Build OK, deploy Vercel OK, HTTP 200

**Pendências:**
- Nenhuma

---

## 2026-08-28 (sessão: form Compras sutil + SEGMENTO dropdown)

**Foco:** Tornar form de Compras sutil (padrão Renda Fixa) e adicionar campo dropdown SEGMENTO ao form, inserindo na tabela de Lançamentos
**Arquivos alterados:**
- `src/pages/Compra.jsx` (estilo sutil: grid layout, labels block uppercase, botões flex end; adicionado `segmento: ''` ao state, dropdown SEGMENTO com array `segmentos`, validação, `segmento: form.segmento` no addTransaction, reset no clear e submit)
- `src/styles/globals.css` (`.compra-form`, `.compra-total`, `.compra-actions`, `.compra-btn`, `.compra-btn-clear`, `.compra-btn-save`, `.compra-error` reestilizados)

**Decisões:**
- Form Compras segue mesmo padrão visual do form Renda Fixa (grid `repeat(auto-fill, minmax(200px, 1fr))`, gap 12px, labels uppercase 12px, inputs 100%)
- SEGMENTO dropdown segue padrão de Venda/Bonificação: array de opções, `<select>` com placeholder "Selecione o segmento", validação obrigatória
- `segmentos` = ['Agronegócio', 'Consumo', 'Energia', 'Financeiro', 'Imobiliário', 'Infraestrutura', 'Mineração', 'Saneamento', 'Tecnologia', 'Transporte']

**Validação:** Build OK, deploy Vercel OK, HTTP 200

**Pendências:**
- Nenhuma

---

## 2026-08-28 (sessão: BensPanel DIRPF tipo fix)

**Foco:** Corrigir aba "Bens e Direitos" do IRRF 2 que classificava todos os tickers como "Ações"
**Arquivos alterados:**
- `src/components/IRRF2/BensPanel.jsx` (passa `ativos` construídos do `getTickerInfo` para `mapearParaDirpf` em vez de `[]`; importa `getTickerInfo` de `tickerRegistry`)

**Decisões:**
- Bug: `mapearParaDirpf(transactions, [])` passava array vazio, então `ativo?.tipo` sempre `undefined`, defaulting para `'Ação'`
- Fix: constrói array `ativos` a partir dos tickers únicos das transações, buscando `getTickerInfo(ticker)` que retorna `{ nome, cnpj, tipo, imagem, link }`
- Cada ativo agora recebe o `tipo` correto (Ação, FII, Renda Fixa, ETF, etc.) e o `grupo`/`código` DIRPF correspondentes via `GRUPO_TIPO_DIRPF[tipo]`

**Validação:** Build OK, deploy Vercel OK, HTTP 200

**Pendências:**
- Nenhuma

---

## 2026-08-30 (sessão: fetch automático de retornos YTD 2026)

**Foco:** Implementar busca automática dos retornos YTD de 2026 dos índices (IBOVESPA, IFIX, IPCA, CDI) para estender os gráficos até o ano corrente
**Arquivos alterados:**
- `src/services/indexApi.js` (criado — `fetchCurrentYearReturns()` com fetch de Yahoo ^BVSP, brapi IFIX, BCB SGS IPCA/CDI)
- `api/bcb.js` (criado — proxy serverless para BCB SGS)
- `src/pages/Graficos.jsx` (import `fetchCurrentYearReturns`, estado `currentYearData`, `useEffect` fetch, `mergedIndexHistory` useMemo estendendo `INDEX_HISTORY` com ano corrente, `useEffect` com catch para fallback)
- `vercel.json` (já possui rewrites para `/api/yahoo/:path*` e `/api/bcb/:path*`)
- `api/brapi.js` (já existente — proxy para brapi.dev)

**Decisões:**
- BCB SGS como fonte primária para IPCA (série 433) e CDI (série 4391) — funciona sem autenticação, retorna dados mensais
- Yahoo `^BVSP` para IBOVESPA — funciona mas está em rate limit (429)
- brapi.dev para IFIX — funciona mas plano gratuito atingiu limite mensal de 15.000 requisições (resume 02/09/2026)
- `fetchCurrentYearReturns()` chama brapi via POST com JSON body (`{path, params}`), não GET com query string (brapi.js só aceita POST)
- Todos os erros são catchados internamente e retornados no campo `errors` — o gráfico funciona com os dados disponíveis mesmo se alguma fonte falhar
- `mergedIndexHistory` estende `INDEX_HISTORY` dinamicamente — se `currentYearData.data[key]` for undefined, o índice não recebe o ano corrente (fallback silencioso)
- `useEffect` com `.catch()` para garantir que `currentYearData` seja sempre setado (mesmo em falha de rede total)

**Validação:** Build OK, deploy Vercel OK, HTTP 200. BCB SGS proxy retorna IPCA 2026 (7 pontos). Yahoo e brapi retornam 429 (rate limit).

**Pendências:**
- IBOVESPA e IFIX não têm dados YTD 2026 devido ao rate limit das APIs externas (Yahoo 429, brapi limite mensal esgotado). Auto-resolve quando as cotas resetam.
- Não há indicador visual de "dados sendo carregados" para o fetch do ano corrente

---

## 2026-09-06

**Foco:** Seguranca e rotacao de credenciais — correcao RLS, troca de senha, novas chaves Supabase (publishable/secret) e atualizacao de producao (Vercel).

**Arquivos alterados:**
- supabase/migrations/0002_fix_rls_recursion.sql (funcao SECURITY DEFINER + politicas sem recursao)
- scripts/seed-user.mjs (senha atualizada, usa SUPABASE_SERVICE_KEY via env)
- .env / .env.production (VITE_SUPABASE_ANON_KEY = nova publishable key)
- public/API Carteira de investimentos.txt (removidos credenciais/segredos)
- CONVERSAS.md (resumo atual)

**Decisoes:**
- Projeto Vercel correto identificado: prj_kCeknBh2aLUUydMJ2EhaNqSteg4N (alias carteira-de-investimentos-beryl.vercel.app).
- Producao confirmada usando nova publishable key no bundle (verificado via fetch do JS).
- Nova env var VITE_SUPABASE_ANON_KEY publicada na Vercel (production+preview) e redeploy realizado.

**Pendencias:**
- Revogar chaves legadas (anon + service_role JWT) no painel Supabase (Settings > API keys > revoke legacy) — aguardar confirmacao de que tudo funciona na producao.
- Rotacionar token Vercel cp_ se nao usado mais (exposto em historico git).
- O segredo nao deve ser commitado; manter apenas em .env/.env.production (gitignored) e painel Vercel.
