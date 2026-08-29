# 📋 RELATÓRIO MESTRE DE AUDITORIA — InvestPro v2.0.0

**Data:** 2026-08-27
**Escopo:** Auditoria completa do projeto Carteira de Investimentos (frontend, backend, segurança, dados, performance)
**Stack:** React 18 + Vite 5 + Supabase + Recharts + Plotly
**URL Produção:** https://carteira-de-investimentos-beryl.vercel.app/

---

## 1. SUMÁRIO EXECUTIVO

O InvestPro é uma aplicação de gestão de carteira de investimentos com **22 páginas lazy-loaded**, **7 context providers** aninhados em cascata, integração com Supabase (auth + realtime + storage), e consultas a APIs externas (Brapi, Yahoo Finance, CoinGecko). A aplicação possui funcionalidades financeiras robustas (cálculos IRRF completos, 13 gráficos interativos, suporte a ações/FIIs/renda fixa/cripto/moedas), mas sofre de **vulnerabilidades de segurança críticas** (token BRAPI exposto no bundle, UUID placeholder no RLS), **duplicação massiva de código** (~550 linhas repetidas em 5 providers), **ausência total de testes**, e **gargalos de performance** (provider cascade, comparações JSON.stringify em tempo real, chamadas de API sem debounce). As melhorias de maior impacto com menor esforço são: (1) migrar token para proxy server-side, (2) extrair lógica comum de providers para hook genérico, (3) implementar testes unitários nos services, e (4) adicionar métricas financeiras faltantes (CAGR, HHI, Beta, Tracking Error).

---

## 2. TABELA DE AUDITORIA POR PÁGINA

| Página | Rota | UX/UI | Finanças | Análise | Visualização | Performance | Qualidade | Arquitetura | Segurança | Potencial | Score Geral |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Principal** | `/principal` | 8 | 6 | 5 | 4 | 7 | 7 | 8 | 8 | 9 | **6.8** |
| **Compra** | `/compra` | 7 | 8 | 3 | 2 | 7 | 6 | 7 | 7 | 7 | **5.9** |
| **Venda** | `/venda` | 7 | 8 | 3 | 2 | 7 | 6 | 7 | 7 | 7 | **5.9** |
| **Bonificação** | `/bonificacao` | 7 | 7 | 2 | 1 | 7 | 6 | 7 | 7 | 6 | **5.4** |
| **Lançamentos** | `/lancamentos` | 8 | 7 | 6 | 3 | 6 | 6 | 7 | 7 | 8 | **6.3** |
| **Carteira** | `/carteira` | 8 | 9 | 7 | 5 | 6 | 7 | 8 | 8 | 9 | **7.5** |
| **Proventos** | `/recebiveis` | 7 | 8 | 6 | 4 | 6 | 7 | 7 | 8 | 8 | **6.8** |
| **Renda Fixa** | `/renda-fixa` | 7 | 7 | 4 | 3 | 7 | 7 | 7 | 8 | 7 | **6.2** |
| **Calendário** | `/rendimentos` | 7 | 6 | 4 | 5 | 7 | 6 | 7 | 8 | 7 | **6.3** |
| **Ranking** | `/ranking` | 8 | 7 | 6 | 6 | 7 | 7 | 7 | 8 | 8 | **7.1** |
| **Gráficos** | `/graficos` | 9 | 7 | 7 | 9 | 5 | 6 | 7 | 8 | 9 | **7.5** |
| **IRRF** | `/irrf` | 7 | 9 | 8 | 4 | 7 | 7 | 7 | 8 | 8 | **7.3** |
| **IRPF Centro** | `/irrf2` | 7 | 8 | 8 | 4 | 7 | 7 | 7 | 8 | 8 | **7.1** |
| **Relatórios** | `/relatorios` | 7 | 6 | 5 | 4 | 7 | 6 | 7 | 7 | 8 | **6.3** |
| **MIDI** | `/midi` | 6 | 5 | 4 | 3 | 7 | 6 | 6 | 7 | 7 | **5.6** |
| **Meta** | `/meta` | 7 | 7 | 5 | 4 | 7 | 7 | 7 | 8 | 8 | **6.7** |
| **Analítico** | `/analitico` | 8 | 8 | 8 | 6 | 6 | 7 | 7 | 8 | 9 | **7.4** |
| **Analisar Ações** | `/analisar-acoes` | 8 | 8 | 8 | 7 | 5 | 7 | 7 | 7 | 9 | **7.4** |
| **Analisar FIIs** | `/analisar-fiis` | 8 | 8 | 8 | 7 | 5 | 7 | 7 | 7 | 9 | **7.4** |
| **Conferência** | `/conferencia` | 7 | 7 | 7 | 5 | 7 | 7 | 7 | 8 | 8 | **7.0** |
| **Ordens** | `/ordens` | 7 | 7 | 5 | 4 | 7 | 7 | 7 | 8 | 7 | **6.6** |
| **Login** | `/login` | 7 | — | — | — | 8 | 7 | 8 | 7 | 6 | **7.1** |

### Legenda dos Scores
- **UX/UI (0-10):** Design, responsividade, acessibilidade, usabilidade
- **Finanças (0-10):** Precisão dos cálculos, completude dos indicadores
- **Análise (0-10):** Profundidade analítica, filtros, cruzamentos
- **Visualização (0-10):** Gráficos, dashboards, representação visual
- **Performance (0-10):** Velocidade de carregamento, re-renders, otimização
- **Qualidade (0-10):** Testes, tipagem, legibilidade, padrões
- **Arquitetura (0-10):** Separação de responsabilidades, escalabilidade
- **Segurança (0-10):** Auth, proteção de dados, RLS, tokens
- **Potencial (0-10):** Capacidade de evolução, valor agregável

---

## 3. TOP 30 MELHORIAS RANKED POR PRIORIDADE

### 🔴 CRÍTICAS (Ação imediata)

| # | Melhoria | Prioridade | Impacto | Esforço | Arquivos Afetados |
|---|---|---|---|---|---|
| 1 | **Migrar token BRAPI para proxy server-side** — Token `VITE_BRAPI_TOKEN` está exposto no bundle do cliente via `import.meta.env.VITE_*`. Qualquer pessoa pode inspecionar o JS e roubar o token. Criar endpoint `/api/brapi/*` no Vercel que injeta o token server-side e remove `VITE_` prefix. | 🔴CRÍTICA | 💥MUITO ALTO | 🟡MÉDIO | `api.js`, `vite.config.js`, `vercel.json` |
| 2 | **Remover UUID placeholder do RLS** — `PLACEHOLDER_UUID = '00000000-0000-0000-0000-000000000000'` no `storage.js` permite que qualquer usuário autenticado leia/escreva dados de usuários que ainda migraram para o Supabase Auth. Adicionar constraint `CHECK (user_id = auth.uid())` no Supabase e limpar dados legacy. | 🔴CRÍTICA | 💥MUITO ALTO | 🟡MÉDIO | `storage.js`, SQL migrations |
| 3 | **Adicionar debounce no `db.write()`** — Cada mudança de estado dispara `db.write()` que faz 3 operações (localStorage + Supabase + IndexedDB) sem debounce. Em keystrokes ou atualizações rápidas, isso causa thundering herd. Implementar debounce de 500ms com cancelamento. | 🔴CRÍTICA | 💥MUITO ALTO | 🟢BAIXO | `storage.js`, todos os providers |
| 4 | **Extrair lógica comum dos providers** — ~550 linhas duplicadas entre `TransactionsContext`, `ProventosContext`, `RfManualContext`, `MetasContext`, `IRRF2Context`. Criar hook `useStorageSync(storageName, options)` e `useStorageRealtime(storageName, callback)` para eliminar duplicação. | 🔴CRÍTICA | ⚡ALTO | 🟡MÉDIO | 5 context files |

### 🟠 ALTAS (Próximo sprint)

| # | Melhoria | Prioridade | Impacto | Esforço | Arquivos Afetados |
|---|---|---|---|---|---|
| 5 | **Implementar testes unitários** — Zero testes escritos apesar de vitest + @testing-library/react já configurados no package.json. Começar por services (irrfCalculations, storage, api) e hooks (usePrices, useFinancialData). | 🟠ALTA | ⚡ALTO | 🟡MÉDIO | `__tests__/`, todos os services |
| 6 | **Desaninhar provider cascade** — 7 providers aninhados em cascata (`AppProviders.jsx`) causam re-renders desnecessários. Usar `useReducer` ou combinar providers relacionados com `compound pattern`. | 🟠ALTA | ⚡ALTO | 🟡MÉDIO | `AppProviders.jsx`, todos os contexts |
| 7 | **Remover polling em aba oculta** — `visibilitychange` handler já existe mas o `subscribeToChanges` continua ativo mesmo quando a aba está oculta. Implementar pausa de subscriptions em `document.hidden`. | 🟠ALTA | 📊MÉDIO | 🟢BAIXO | `storage.js`, todos os providers |
| 8 | **Adicionar rate limiting nos endpoints proxy** — `/api/yahoo/*` e `/api/brapi/*` não têm rate limiting. Qualquer cliente pode fazer requests infinitos. Implementar rate limit via Vercel Edge Functions ou middleware. | 🟠ALTA | ⚡ALTO | 🟡MÉDIO | `vercel.json`, serverless functions |
| 9 | **Otimizar comparação JSON.stringify** — Providers usam `JSON.stringify(currentRef) !== JSON.stringify(newData)` para detectar mudanças em listas potencialmente grandes. Usar hash library ou shallow comparison por ID + versão. | 🟠ALTA | 📊MÉDIO | 🟢BAIXO | Todos os providers |
| 10 | **Implementar useMemo/useCallback em Graficos.jsx** — Arquivo de 1100+ linhas com funções inline e cálculos que poderiam ser memoizados. Extrair sub-componentes e colapsar memoizations. | 🟠ALTA | 📊MÉDIO | 🟡MÉDIO | `Graficos.jsx` |
| 11 | **Corrigir `setSelectedAno` dentro de useMemo** — `Graficos.jsx:243` chama `setSelectedAno()` dentro de `useMemo`, o que é anti-pattern (side effect em render). Mover para `useEffect`. | 🟠ALTA | 📊MÉDIO | 🟢BAIXO | `Graficos.jsx:241-245` |
| 12 | **Extrair constantes de Graficos.jsx** — `INDEX_HISTORY`, `typeColors`, `CHART_COLORS`, `corretoraPorTicker` são hardcoded no componente. Mover para `data/constants.js`. | 🟠ALTA | 📊MÉDIO | 🟢BAIXO | `Graficos.jsx`, novo `data/constants.js` |
| 13 | **Adicionar tratamento de erro global nos fetches de API** — Todas as chamadas `fetchYahoo`, `fetchBrapiQuote`, etc. engolem erros silenciosamente (`catch {}`). Adicionar error reporting e fallback visível. | 🟠ALTA | 📊MÉDIO | 🟢BAIXO | `api.js` |
| 14 | **Lazy load de imagens/corretora logos** — Imagens de corretoras são carregadas sem `loading="lazy"`. Adicionar native lazy loading para imagens abaixo do fold. | 🟠ALTA | 📊MÉDIO | 🟢BAIXO | `Graficos.jsx` |
| 15 | **Implementar `useStorageSync` hook customizado** — Criar hook que encapsula padrão `useState + db.write + localStorage.setItem + beforeunload`. Elimina repetição em todos os providers. | 🟠ALTA | ⚡ALTO | 🟡MÉDIO | Novo `hooks/useStorageSync.js` |

### 🟡 MÉDIAS (Próximos 2-3 sprints)

| # | Melhoria | Prioridade | Impacto | Esforço | Arquivos Afetados |
|---|---|---|---|---|---|
| 16 | **Adicionar CAGR do patrimônio** — Calcular Compound Annual Growth Rate do patrimônio total ao longo dos anos. | 🟡MÉDIA | ⚡ALTO | 🟡MÉDIO | `Graficos.jsx`, novo service |
| 17 | **Adicionar HHI (Herfindahl-Hirschman Index)** — Medir concentração da carteira. HHI > 2500 = alta concentração. | 🟡MÉDIA | ⚡ALTO | 🟢BAIXO | Novo `services/analytics.js` |
| 18 | **Adicionar Tracking Error vs benchmark** — Comparar volatilidade da carteira vs IBOVESPA/CDI. | 🟡MÉDIA | ⚡ALTO | 🟡MÉDIO | Novo `services/analytics.js`, `Graficos.jsx` |
| 19 | **Adicionar Beta da carteira** — Medir sensibilidade da carteira ao mercado. | 🟡MÉDIA | ⚡ALTO | 🟡MÉDIO | Novo `services/analytics.js` |
| 20 | **Adicionar Alpha (Jensen's Alpha)** — Medir retorno acima do esperado pelo CAPM. | 🟡MÉDIA | ⚡ALTO | 🟡MÉDIO | Novo `services/analytics.js` |
| 21 | **Gráfico de alocação por setor** — Usar dados de `fetchBrapiProfile` para criar pie chart de setores da B3. | 🟡MÉDIA | ⚡ALTO | 🟡MÉDIO | `Graficos.jsx` |
| 22 | **Gráfico de fluxo de caixa** — Visualizar entradas vs saídas de capital ao longo do tempo. | 🟡MÉDIA | 📊MÉDIO | 🟡MÉDIO | `Graficos.jsx` |
| 23 | **Histórico de Dividend Yield** — Gráfico de DY ao longo dos anos por ativo. | 🟡MÉDIA | ⚡ALTO | 🟡MÉDIO | `Graficos.jsx` |
| 24 | **Análise de contribuição por ativo** — Decomposição da rentabilidade por contribuição individual. | 🟡MÉDIA | ⚡ALTO | 🟡MÉDIO | Novo service + `Graficos.jsx` |
| 25 | **Batch limits em chamadas de API** — `fetchStockQuotes` não limita paralelismo. Para carteiras grandes, causam rate limiting. Implementar concurrency limit de 5-10. | 🟡MÉDIA | 📊MÉDIO | 🟢BAIXO | `api.js` |

### 🟢 BAIXAS (Backlog)

| # | Melhoria | Prioridade | Impacto | Esforço | Arquivos Afetados |
|---|---|---|---|---|---|
| 26 | **Migrar estilos inline para CSS modules** — Misto de inline styles e classes CSS dificulta manutenção. Usar CSS modules ou CSS-in-JS. | 🟢BAIXA | 📊MÉDIO | 🔴ALTO | Todas as páginas |
| 27 | **Adicionar Error Boundaries granulares** — `ErrorBoundary` único em `App.jsx`. Adicionar por seção (gráficos, formulários, tabelas). | 🟢BAIXA | 📊MÉDIO | 🟢BAIXO | `App.jsx`, componentes |
| 28 | **Implementar virtualização de tabelas** — `Lancamentos.jsx` e `Carteira.jsx` renderizam todas as linhas. Usar `react-window` para listas > 100 itens. | 🟢BAIXA | 📊MÉDIO | 🟡MÉDIO | `Lancamentos.jsx`, `Carteira.jsx` |
| 29 | **Adicionar PWA/offline support** — Já usa IndexedDB. Completar com Service Worker para funcionar offline. | 🟢BAIXA | ⚡ALTO | 🔴ALTO | Novo SW, manifest.json |
| 30 | **Code splitting granular por rota** — Já usa `lazy()`, mas poderia dividir Graficos.jsx em sub-chunks. | 🟢BAIXA | 📊MÉDIO | 🟡MÉDIO | `Graficos.jsx`, routes |

---

## 4. TOP 10 NOVOS GRÁFICOS/VISUALIZAÇÕES

| # | Gráfico | Tipo | Dados Necessários | Prioridade | Impacto |
|---|---|---|---|---|---|
| 1 | **Alocação por Setor B3** | Pie/Donut | `fetchBrapiProfile` (já existe) | 🔴ALTA | 💥MUITO ALTO |
| 2 | **Fluxo de Caixa Mensal** | Bar (stacked) | transactions agrupadas por mês | 🔴ALTA | ⚡ALTO |
| 3 | **DY Histórico por Ativo** | Line | `fetchBrapiDividends` (já existe) | 🟠ALTA | ⚡ALTO |
| 4 | **Curva de Acumulação Patrimônio** | Area | transactions acumuladas | 🟠ALTA | ⚡ALTO |
| 5 | **Heatmap de Retorno Mensal** | Heatmap | transactions por mês/ano | 🟡MÉDIA | ⚡ALTO |
| 6 | **Radar de Indicadores Fundamentalistas** | Radar | `fetchBrapiFundamentals` (já existe) | 🟡MÉDIA | 📊MÉDIO |
| 7 | **Decomposição de Retorno (Waterfall)** | Waterfall | CAGR + proventos + capital gains | 🟡MÉDIA | ⚡ALTO |
| 8 | **Evolução do DY Médio da Carteira** | Line | proventos / patrimônio por ano | 🟡MÉDIA | 📊MÉDIO |
| 9 | **Comparativo de Corretoras (ROI)** | Grouped Bar | corretoraData + retornos | 🟢BAIXA | 📊MÉDIO |
| 10 | **Timeline de Operações** | Timeline/Scatter | transactions com datas | 🟢BAIXA | 📊MÉDIO |

---

## 5. TOP 10 NOVAS ANÁLISES FINANCEIRAS

| # | Análise | Métrica | Fonte de Dados | Prioridade | Impacto |
|---|---|---|---|---|---|
| 1 | **CAGR do Patrimônio** | `(Vf/Vi)^(1/n) - 1` | transactions acumuladas | 🔴ALTA | 💥MUITO ALTO |
| 2 | **HHI (Concentração)** | `Σ(wi²)` | portfolio base | 🔴ALTA | ⚡ALTO |
| 3 | **Tracking Error** | `σ(port - bench)` | `INDEX_HISTORY` (já existe) | 🟠ALTA | ⚡ALTO |
| 4 | **Beta (CAPM)** | `Cov(rm, rp) / Var(rm)` | `INDEX_HISTORY` + transactions | 🟠ALTA | ⚡ALTO |
| 5 | **Alpha de Jensen** | `Rp - [Rf + β(Rm - Rf)]` | Beta + CDI + IBOVESPA | 🟠ALTA | ⚡ALTO |
| 6 | **Sharpe Ratio** | `(Rp - Rf) / σp` | Retorno + volatilidade | 🟡MÉDIA | ⚡ALTO |
| 7 | **Retorno por Contribuição** | Decomposição por ativo | transactions + prices | 🟡MÉDIA | ⚡ALTO |
| 8 | **Projeção de Renda Passiva** | DY médio × patrimônio | proventos + portfolio | 🟡MÉDIA | ⚡ALTO |
| 9 | **Drawdown Máximo** | Máxima queda desde pico | `fetchHistoricalData` | 🟡MÉDIA | 📊MÉDIO |
| 10 | **Risco de Concentração** | Máx % em um ativo/setor | portfolio base | 🟡MÉDIA | 📊MÉDIO |

---

## 6. TOP 10 NOVAS FUNCIONALIDADES

| # | Feature | Descrição | Prioridade | Impacto | Esforço |
|---|---|---|---|---|---|
| 1 | **Alertas de Preço** | Notificação quando ativo atinge preço alvo | 🔴ALTA | 💥MUITO ALTO | 🟡MÉDIO |
| 2 | **Importação CNB/Corretora** | Upload de notas de corretora em CSV/PDF | 🔴ALTA | 💥MUITO ALTO | 🔴ALTO |
| 3 | **Comparativo com Benchmark** | Selecionar benchmark customizado (IBOV, CDI, IPCA) | 🟠ALTA | ⚡ALTO | 🟡MÉDIO |
| 4 | **Exportação PDF/Excel de Relatórios** | Gerar relatório formatado para download | 🟠ALTA | ⚡ALTO | 🟡MÉDIO |
| 5 | **Backtesting de Estratégia** | Simular aportes periódicos vs lump sum | 🟡MÉDIA | ⚡ALTO | 🔴ALTO |
| 6 | **Modo Multi-Usuário/Compartilhamento** | Compartilhar carteira read-only com familiar | 🟡MÉDIA | ⚡ALTO | 🔴ALTO |
| 7 | **Notificações Push** | Alertas de proventos pagos, IRRF, metas | 🟡MÉDIA | 📊MÉDIO | 🟡MÉDIO |
| 8 | **Dashboard Mobile-First** | Layout otimizado para smartphone | 🟡MÉDIA | ⚡ALTO | 🟡MÉDIO |
| 9 | **Calculadora de Impostos** | Simulador de DARF e calendário de pagamentos | 🟢BAIXA | 📊MÉDIO | 🟡MÉDIO |
| 10 | **Modo Offline Completo** | Funcionamento total sem internet via SW | 🟢BAIXA | ⚡ALTO | 🔴ALTO |

---

## 7. ROADMAP EM 5 FASES

### FASE 1: Segurança & Estabilidade (Semanas 1-2)
> **Objetivo:** Eliminar vulnerabilidades críticas e estabilizar

| Tarefa | Prioridade | Esforço |
|---|---|---|
| Migrar BRAPI token para proxy server-side | 🔴 | 2h |
| Remover UUID placeholder + fix RLS | 🔴 | 3h |
| Adicionar debounce em db.write | 🔴 | 1h |
| Extrair hook useStorageSync | 🔴 | 4h |
| Adicionar rate limiting nos proxies | 🟠 | 2h |
| Fix: useEffect side effects em useMemo | 🟠 | 1h |

### FASE 2: Qualidade & Performance (Semanas 3-4)
> **Objetivo:** Testes, limpeza de código, performance

| Tarefa | Prioridade | Esforço |
|---|---|---|
| Testes unitários para services (irrfCalculations, storage, api) | 🟠 | 6h |
| Testes para hooks (usePrices, useFinancialData) | 🟠 | 3h |
| Desaninhar provider cascade | 🟠 | 4h |
| Otimizar comparações JSON.stringify | 🟠 | 2h |
| Refatorar Graficos.jsx (extrair componentes, memoizar) | 🟠 | 6h |
| Extrair constantes de Graficos.jsx | 🟠 | 1h |
| Pausar subscriptions em aba oculta | 🟠 | 1h |
| Adicionar batch limits em chamadas API | 🟡 | 2h |

### FASE 3: Análise Financeira (Semanas 5-7)
> **Objetivo:** Métricas profissionais e gráficos novos

| Tarefa | Prioridade | Esforço |
|---|---|---|
| Implementar CAGR do patrimônio | 🟡 | 3h |
| Implementar HHI (concentração) | 🟡 | 2h |
| Implementar Tracking Error + Beta + Alpha | 🟡 | 6h |
| Implementar Sharpe Ratio | 🟡 | 3h |
| Gráfico de alocação por setor | 🟡 | 4h |
| Gráfico de fluxo de caixa | 🟡 | 3h |
| Histórico de DY | 🟡 | 3h |
| Análise de contribuição por ativo | 🟡 | 4h |
| Decomposição de retorno (Waterfall) | 🟡 | 4h |

### FASE 4: Visualização & UX (Semanas 8-10)
> **Objetivo:** Novos gráficos, exportação, mobile

| Tarefa | Prioridade | Esforço |
|---|---|---|
| Dashboard mobile-first | 🟡 | 8h |
| Comparativo com benchmark customizável | 🟡 | 4h |
| Heatmap de retorno mensal | 🟡 | 4h |
| Radar de indicadores fundamentalistas | 🟡 | 3h |
| Exportação PDF/Excel de relatórios | 🟠 | 6h |
| Error Boundaries granulares | 🟢 | 2h |
| Virtualização de tabelas | 🟢 | 3h |

### FASE 5: Funcionalidades Avançadas (Semanas 11-14)
> **Objetivo:** Features diferenciadoras e automação

| Tarefa | Prioridade | Esforço |
|---|---|---|
| Alertas de preço | 🔴 | 6h |
| Importação de notas de corretora | 🔴 | 10h |
| Projeção de renda passiva | 🟡 | 4h |
| Backtesting de estratégia | 🟡 | 12h |
| Calculadora de impostos (DARF) | 🟢 | 6h |
| PWA/offline support | 🟢 | 8h |
| Code splitting granular | 🟢 | 2h |

**Estimativa total:** ~160h de desenvolvimento

---

## 8. RELATÓRIO DE CONFLITOS (Issues que precisam de decisão)

### C1: Token BRAPI — Proxy vs Ambiente
- **Conflito:** O token está em `VITE_BRAPI_TOKEN` (exposto no cliente). Duas opções:
  - **Opção A:** Criar proxy serverless no Vercel que injeta o token (mais seguro, +2h)
  - **Opção B:** Usar apenas APIs que não precisam de token (Yahoo, mFinance) e limitar funcionalidade (mais rápido, -features)
- **Recomendação:** Opção A — o token Brapi é necessário para fundamentais e dividendos

### C2: Provider Architecture — Unificação vs Granularidade
- **Conflito:** 5 providers seguem padrão quase idêntico (useState + db.readForce + subscribeToChanges + visibilitychange + db.write). Unificar em 1 hook genérico?
  - **Opção A:** Hook `useStorageSync(name)` — menos código, mais difícil de customizar
  - **Opção B:** Manter providers separados mas extrair lógica comum — flexível, menos drama
- **Recomendação:** Opção B — manter separação por domínio mas extrair lógica para hook compartilhado

### C3: Graficos.jsx — Refactor vs Rewrite
- **Conflito:** Arquivo com 1100+ linhas. Refatorar incrementalmente ou reescrever?
  - **Opção A:** Extrair sub-componentes (TipoPie, TickerPie, CorretoraBar, etc.) — incremental, menos risco
  - **Opção B:** Reescrever com arquitetura limpa — mais rápido no longo prazo, mais arriscado
- **Recomendação:** Opção A — refactor incremental com extração de componentes

### C4: Testes — Quais primeiro?
- **Conflito:** Zero testes. Onde focar primeiro?
  - **Opção A:** Services (irrfCalculations, storage) — cobre lógica crítica
  - **Opção B:** Components (formulários de compra/venda) — cobre fluxos do usuário
  - **Opção C:** Hooks (usePrices, useFinancialData) — cobre bridge entre dados e UI
- **Recomendação:** Opção A (services) → Opção C (hooks) → Opção B (components)

### C5: Dados Legacy — Quando limpar?
- **Conflito:** Dados sob `PLACEHOLDER_UUID` no Supabase precisam ser migrados/removidos
  - **Opção A:** Migração automática no login (o código já faz isso parcialmente em `storage.js:94-106`)
  - **Opção B:** Script de migração one-shot + depois remover fallback
  - **Opção C:** Manter forever (technical debt permanente)
- **Recomendação:** Opção B — script + remover fallback em versão futura

### C6: Estilos — CSS Modules vs Tailwind vs Manter
- **Conflito:** Mix de inline styles e classes CSS. Migrar?
  - **Opção A:** CSS Modules (padrão React, sem nova dependência)
  - **Opção B:** Tailwind (produtivo mas dependência nova)
  - **Opção C:** Manter como está (technical debt mas funciona)
- **Recomendação:** Opção C para agora, Opção A quando houver tempo

### C7: Graficos.jsx — useEffect com setState dentro de useMemo
- **Conflito:** `Graficos.jsx:243` — `if (anos.length > 0 && selectedAno === null) setSelectedAno(anos[0])` dentro de `useMemo`. Isso causa side effects durante render.
- **Recomendação:** Mover para `useEffect` dedicado. Risco: pode causar flicker no primeiro render.

---

## 9. MATRIZ DE DISPONIBILIDADE DE DADOS

| Dado | Fonte | Status | Endpoint | Taxa | Observação |
|---|---|---|---|---|---|
| **Cotação Ações B3** | Brapi.dev | ✅ Disponível | `/api/brapi/quote/{symbol}` | 20 req/min (free) | Via proxy server-side |
| **Cotação Ações (fallback)** | Yahoo Finance | ✅ Disponível | `/v8/finance/chart/{symbol}` | Ilimitado | CORS pode falhar |
| **Cotação (2º fallback)** | mFinance | ✅ Disponível | `mfinance.com.br/api/v1/stocks/{symbol}` | Desconhecido | Só ações BR |
| **Dividendos** | Brapi.dev | ✅ Disponível | `?dividends=true` | 20 req/min | Dados de pagamento |
| **Dividendos (fallback)** | Yahoo Finance | ✅ Disponível | `?events=div,splits&range=3y` | Ilimitado | 3 anos de histórico |
| **Fundamentais** | Brapi.dev | ⚠️ Parcial | `?modules=...` | 20 req/min | Nem todos os ativos |
| **Perfil/Setor** | Brapi.dev | ⚠️ Parcial | `?modules=summaryProfile` | 20 req/min | Só ações BR listadas |
| **Histórico de Preços** | Brapi.dev | ✅ Disponível | `?range=X&interval=Y` | 20 req/min | 1d a max |
| **Criptomoedas** | CoinGecko | ✅ Disponível | `/simple/price` | 10-30 req/min | Só preço + 24h change |
| **Câmbio (USD/EUR)** | Yahoo Finance | ✅ Disponível | `USDBRL=X`, `EURBRL=X` | Ilimitado | Via symbol map |
| **Tesouro Direto** | — | ❌ Não implementado | `throw Error()` | — | Mock necessário |
| **IFIX** | — | ⚠️ Hardcoded | `INDEX_HISTORY` | — | Dados estáticos até 2025 |
| **IBOVESPA** | — | ⚠️ Hardcoded | `INDEX_HISTORY` | — | Dados estáticos até 2025 |
| **IPCA** | — | ⚠️ Hardcoded | `INDEX_HISTORY` | — | Dados estáticos até 2025 |
| **CDI** | — | ⚠️ Hardcoded | `INDEX_HISTORY` | — | Dados estáticos até 2025 |
| **Supabase Auth** | Supabase | ✅ Disponível | `supabase.auth` | — | Email/password |
| **Supabase Realtime** | Supabase | ✅ Disponível | `subscribeToChanges` | — | Postgres changes |
| **Supabase Storage** | Supabase | ✅ Disponível | `app_data` table | — | CRUD genérico |
| **Notas de Corretora** | Local | ❌ Não existe | — | — | Feature proposta |
| **Alertas de Preço** | Local | ❌ Não existe | — | — | Feature proposta |

### Dados que precisam de atualização periódica:
- `INDEX_HISTORY`: Atualizar a cada trimestre com dados reais do IBOVESPA/IFIX/IPCA/CDI
- Fundamentais Brapi: Dados podem ficar desatualizados entre consultas

### APIs com risco de indisponibilidade:
- Yahoo Finance: CORS pode bloquear em produção (já tem fallback duplo)
- CoinGecko: Rate limit agressivo em horário de pico
- Brapi Free Plan: Limite de 20 requisições/minuto para dados detalhados

---

## 10. AUDITORIA ESPECÍFICA — IRPF CENTRO (`/irrf2`)

Auditoria dedicada em 2026-08-27 após leitura completa de: `IRRF2.jsx` (13 abas), `IRRF2Context.jsx`, `irrfCalculations.js` (600+ linhas), `irrfConstants.js`, 13 painéis e 4 componentes compartilhados.

### Scores detalhados

| Critério | Nota | Justificativa |
|---|---|---|
| UX/UI | 7 | 13 abas com icons, YearSelector, InfoCards com cor de risco, StatusBadge, empty states. Inline styles onipresentes, acessibilidade básica, título "IRPF {ano}" deveria ser "{ano+1}". |
| Finanças | 8 | Cobertura ampla (ganho capital, isenção mensal R$20k, custo médio, JCP, DARF, isentos, bens, conferências). Porém: alíquota JCP fixa em 17,5%, custo médio não sequencial no tempo, sem compensação de prejuízo mensal, bonificação tratada como compra. |
| Análise | 8 | Resumo KPI, tickers, isenção mensal, progresso checklist, conferências automáticas, alertas, calendário DIRPF. |
| Visualização | 4 | Apenas 1 gráfico manual (evolução mensal de proventos em `ProventosPanel`). Todo o resto em tabelas/InfoCards. |
| Performance | 7 | `calcularGanhoCapitalAnual` reexecuta `calcularLucroPrejuizo` (O(n·m)) por venda dentro de `agruparPorTicker`. OK para volumes pequenos; degrada com escala. |
| Qualidade | 7 | Componentes compartilhados sólidos. Constante corrompida com caracteres chineses, comparações case-sensitive de tipo, `fmt` duplicado em 8 painéis. |
| Arquitetura | 7 | Services (cálculos/constantes) + painéis + shared components + context com debounce 300ms. Inconsistência: alguns painéis recebem props, outros leem context direto; `mapearParaDirpf(transactions, [])` fixo. |
| Segurança | 8 | Sem segredos na UI, clipboard com fallback `execCommand`, dados via storage já existente. |
| Potencial | 8 | "Centro de preparação IRPF" é diferencial. Faltam: DARF real/PDF, importação de nota de corretagem, compensação automática de prejuízo, exportação DIRPF. |
| **Geral** | **7.1** | Média aritmética das 9 dimensões. |

### Achados (ordenados por severidade)

- 🔴 **Constante corrompida** — `irrfConstants.js:76` tem chave `DARF_PRE司法AL: '8045'` (contém caracteres chineses). Isso quebra qualquer acesso por nome de chave (ex.: `CODIGOS_DARF.DARF_PREJUIZO_AL`) e indica possível corrupção/encoding em outras chaves. **Auditar todo o arquivo** por caracteres não-ASCII em nomes de chave.
- 🟠 **Alíquota JCP presumida** — `irrfCalculations.js:224,454` usam 17,5% fixo. Base legal para PF é **15%** (Lei 9.249/95, art. 9º). Não foi encontrada referência à fonte da alíquota. **Confirmar com contador/legislação vigente.**
- 🟠 **Custo médio não sequencial** — `calcularLucroPrejuizo` calcula custo médio sobre **todas** as compras do histórico, incluindo compras posteriores à venda analisada. Resultado: o custo médio de uma venda em janeiro incorpora compras de dezembro. **Ordenar por data e considerar apenas posições anteriores à venda.**
- 🟠 **Sem compensação de prejuízo mensal** — a apuração mensal de ganho de capital (regra RF) exige compensar prejuízos de meses anteriores antes de calcular o imposto do mês. O módulo soma lucro/prejuízo por ticker e gera DARF mensal, mas **não carrega prejuízo compensável entre meses**. DARF pode sair maior que o devido.
- 🟠 **Bonificação tratada como compra** — `getOperacao` (`irrfCalculations.js:52`) mapeia `'bonificação'` → `'C'`. Bonificação é distribuição de ações sem custo e **não deve** entrar como compra (infla custo de aquisição e totais de compras).
- 🟠 **Bens ignoram proventos/ativos** — `BensPanel.jsx` e `RelatoriosPanel.jsx` chamam `mapearParaDirpf(transactions, [])` com lista de proventos fixa vazia. **Ativos de renda fixa/outros e proventos não são refletidos** caso existam; o parâmetro `ativos` do calculador não é alimentado (`normalizeTipo(ativo?.tipo)` sempre cai no default 'Ação').
- 🟡 **Parse de data inconsistente entre painéis** — `InformesPanel`/`ProventosPanel` filtram ano com `new Date(p.date).getFullYear()`, enquanto `ConferenciaPanel`/`GanhosPanel`/`ResumoPanel` usam `getYearFromDate(p.date || p.data)` (que trata DD/MM/AAAA). Dados salvos no formato DD/MM/AAAA **não são contabilizados** nos dois primeiros painéis.
- 🟡 **Comparações de tipo case-sensitive** — `calcularRendimentosIsentos`/`calcularRendimentosTributados` usam `p.tipo === 'Dividendo'`/`'Rendimento'`; outras partes usam `includes('jcp')`/`isIn`. Variações de string (ex.: "Dividendos", "JCP " ) divergem entre módulos.
- 🟢 **Validar tabelas legais** — `TABELA_PROGRESSIVA_RF` (22,5/20/17,5/15) e ganho de capital (15/17,5/20/22,5) não têm referência à fonte; ganho de capital está correto vs. legislação, mas renda fixa pós-Lei 14.789/2023 mudou alíquotas/prazos. **Item de conferência periódica.**

### Recomendações (IRRF2)

1. Hickaxe de corrupção de bytes/encodings em `irrfConstants.js` (buscar `[^\x00-\x7F]` em chaves) e corrigir `DARF_PRE司法AL`.
2. Parametrizar alíquota JCP (15%) com constante + fonte legal, e revisar retenções informadas.
3. Ordenar transações por data no cálculo de custo médio; ponderar apenas posições anteriores à operação.
4. Implementar compensação de prejuízo mensal na apuração de ganho de capital antes de gerar DARF.
5. Alimentar `mapearParaDirpf(transactions, proventos, ativos)` com dados reais (incluir renda fixa, FIIs, cripto) em vez de listas vazias fixas.
6. Unificar parse de data via `getYearFromDate` em todos os painéis que hoje usam `new Date(...)`.
7. Adicionar gráficos de evolução mensal de ganho de capital / IR estimado (hoje só 1 gráfico no módulo).

---

## ANEXO A: Inventário de Arquivos

```
src/
├── App.jsx                    (175 linhas) — Roteamento + layout principal
├── context/
│   ├── AppProviders.jsx       (27 linhas)  — Cascata de 7 providers
│   ├── AuthContext.jsx        — Autenticação Supabase
│   ├── UserContext.jsx        — Nome + avatar do usuário
│   ├── TransactionsContext.jsx (174 linhas) — Compras/vendas
│   ├── ProventosContext.jsx   (156 linhas) — Dividendos/JCP/Rendimentos
│   ├── RfManualContext.jsx    (121 linhas) — Renda fixa manual
│   ├── MetasContext.jsx       (121 linhas) — Metas financeiras
│   └── IRRF2Context.jsx       (127 linhas) — Declaração IRPF
├── services/
│   ├── supabaseClient.js      (15 linhas)  — Cliente Supabase
│   ├── storage.js             (259 linhas) — CRUD com fallback chains
│   ├── api.js                 (627 linhas) — APIs externas (Brapi, Yahoo, etc.)
│   ├── irrfCalculations.js    — Cálculos IRRF
│   ├── irrfConstants.js       — Tabelas IRRF
│   ├── format.js              — Formatação monetária
│   └── tickerRegistry.js      — Cache de tickers
├── hooks/
│   ├── usePrices.js           — Hook de cotações
│   └── useFinancialData.js    — Hook de dados financeiros
├── pages/ (22 páginas lazy-loaded)
│   ├── Graficos.jsx           (1135+ linhas) — Maior arquivo do projeto
│   ├── Carteira.jsx           — Visão da carteira
│   ├── Lancamentos.jsx        — Lista de operações
│   ├── Analitico.jsx          — Análise detalhada
│   ├── AnalisarAcoes.jsx      — Análise fundamentalista ações
│   ├── AnalisarFIIs.jsx       — Análise fundamentalista FIIs
│   ├── IRRF.jsx               — Cálculo IRRF
│   ├── IRRF2.jsx              — Centro IRPF
│   └── ... (outras 14 páginas)
└── components/
    └── Layout/Sidebar.jsx     (132 linhas) — Navegação lateral
```

## ANEXO B: Dependências de Segurança

| Dependência | Versão | Status | Risco |
|---|---|---|---|
| `@supabase/supabase-js` | ^2.108.2 | ✅ Atual | BAIXO |
| `react` | ^18.2.0 | ✅ Atual | BAIXO |
| `react-router-dom` | ^7.18.2 | ✅ Atual | BAIXO |
| `recharts` | ^3.8.1 | ✅ Atual | BAIXO |
| `plotly.js-dist` | ^3.5.1 | ✅ Atual | BAIXO |
| `xlsx-populate` | ^1.21.0 | ⚠️ Verificar | MÉDIO |
| `vite` | ^5.0.12 | ✅ Atual | BAIXO |
| `vitest` | ^3.2.4 | ✅ Atual | BAIXO |

---

*Relatório gerado em 2026-08-25 pelo Project Coordinator*
*Próxima revisão: Fase 1 completa*
