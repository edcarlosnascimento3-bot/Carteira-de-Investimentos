# Instruções para o agente

**Idioma:** Responda sempre em português brasileiro.

## Preferência de execução

Quando o usuário pedir para "abrir o projeto", "abrir no navegador" ou similar, SEMPRE abrir a versão publicada: **https://carteira-de-investimentos-beryl.vercel.app/** (produção na Vercel). Não usar o servidor de desenvolvimento local (localhost:5173) a menos que o usuário peça explicitamente para desenvolver/testar localmente.

## Ao final de cada sessão (quando o usuário se despedir ou encerrar)

Salve um resumo da conversa em `CONVERSAS.md` no seguinte formato:

```markdown
## YYYY-MM-DD

**Foco:** [o que foi feito]
**Arquivos alterados:** [lista de arquivos]
**Decisões:**
- [decisão 1]
- [decisão 2]
**Pendências:**
- [pendência 1]
- [pendência 2]
```

### Regras
- Sempre adicione o resumo ao final do arquivo (mais recente por último).
- Seja conciso — máximo 10 linhas por sessão.
- Não repita informações já salvas em sessões anteriores.
- Se a sessão não teve alterações de código, salve mesmo assim (ex: "apenas consulta").

## Tópicos de troubleshooting

### ajustar filtros
Se os filtros da página Lançamentos pararem de funcionar (selecionar um valor no dropdown não filtra a tabela):
1. O código em `src/pages/Lancamentos.jsx` está correto — filtros usam `useState` + cálculo direto de `filtered` (sem `useMemo`).
2. O problema provavelmente é cache corrompido do Vite. Solução: reiniciar o servidor Vite (matar o processo e iniciar de novo).
3. O servidor Vite pode ser iniciado via `Start-Process` com `npm.cmd run dev` ou `cmd /c start /B ...vite.cmd` no diretório do projeto.
