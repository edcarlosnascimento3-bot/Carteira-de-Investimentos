import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { formatCurrency } from '../services/format';
import { calcularAporteNecessario, simularAposentadoria } from '../utils/simuladoAposentadoria';

const inputStyle = {
  background: 'var(--surface-dark)',
  border: '1px solid #C8B800AA',
  borderRadius: 8,
  padding: '8px 14px',
  color: 'var(--text)',
  fontFamily: 'inherit',
  fontSize: '0.95em',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: '0.8em',
  fontWeight: 600,
  color: 'var(--text-soft)',
};

const cardStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  minWidth: 170,
};

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: '0.85em',
  color: 'var(--text)',
};

const compactoBR = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const formatarEixo = (v) => `R$ ${compactoBR.format(v)}`;

const numero = (valor, padrao = 0) => {
  const n = parseFloat(valor);
  return Number.isFinite(n) ? n : padrao;
};

function CardResultado({ label, valor, detalhe, cor }) {
  return (
    <div className="card-stats" style={cardStyle}>
      <div
        className="stat-label"
        style={{ fontSize: '0.72em', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 700 }}
      >
        {label}
      </div>
      <div
        className="stat-value"
        style={{ fontSize: '1.12em', fontWeight: 700, color: cor || 'var(--text)', lineHeight: 1.35, wordBreak: 'break-word' }}
      >
        {valor}
      </div>
      {detalhe ? (
        <div style={{ fontSize: '0.74em', color: 'var(--text-faint)' }}>{detalhe}</div>
      ) : null}
    </div>
  );
}

function Conferencia() {
  const [modoCalculo, setModoCalculo] = useState('tempo'); // 'tempo' | 'aporte'
  const [salarioAtual, setSalarioAtual] = useState('5000');
  const [salarioPretendido, setSalarioPretendido] = useState('4000');
  const [inflacaoAnual, setInflacaoAnual] = useState('3');
  const [aporteMensal, setAporteMensal] = useState('1000');
  const [aporteInicial, setAporteInicial] = useState('0');
  const [taxaJurosAnual, setTaxaJurosAnual] = useState('10');
  const [horizonteAnos, setHorizonteAnos] = useState('40');
  const [tempoDesejadoAnos, setTempoDesejadoAnos] = useState('25');

  const aporteNecessarioCalc = useMemo(() => {
    if (modoCalculo !== 'aporte') return null;
    return calcularAporteNecessario({
      salarioAtual: numero(salarioAtual),
      salarioPretendido: numero(salarioPretendido),
      inflacaoAnual: numero(inflacaoAnual),
      aporteInicial: numero(aporteInicial),
      taxaJurosAnual: numero(taxaJurosAnual),
      tempoDesejadoAnos: numero(tempoDesejadoAnos, 0),
    });
  }, [modoCalculo, salarioAtual, salarioPretendido, inflacaoAnual, aporteInicial, taxaJurosAnual, tempoDesejadoAnos]);

  const aporteParaSimulacao = useMemo(() => {
    if (modoCalculo === 'aporte') {
      return aporteNecessarioCalc?.aporteMensalNecessario != null ? aporteNecessarioCalc.aporteMensalNecessario : 0;
    }
    return numero(aporteMensal);
  }, [modoCalculo, aporteNecessarioCalc, aporteMensal]);

  const sim = useMemo(
    () =>
      simularAposentadoria({
        salarioAtual: numero(salarioAtual),
        salarioPretendido: numero(salarioPretendido),
        inflacaoAnual: numero(inflacaoAnual),
        aporteMensal: aporteParaSimulacao,
        aporteInicial: numero(aporteInicial),
        taxaJurosAnual: numero(taxaJurosAnual),
        horizonteAnos: modoCalculo === 'aporte' ? numero(tempoDesejadoAnos, 0) || 40 : numero(horizonteAnos, 40) || 40,
      }),
    [salarioAtual, salarioPretendido, inflacaoAnual, aporteParaSimulacao, aporteInicial, taxaJurosAnual, horizonteAnos, modoCalculo, tempoDesejadoAnos]
  );

  const { meses, metaMes, resumo } = sim;

  // Trunca o gráfico: até a meta + 6 anos (ou o horizonte total, se a meta não existir).
  const ultimoMes = meses.length > 0 ? meses[meses.length - 1].mes : 0;
  const limite = metaMes != null ? Math.min(metaMes + 72, ultimoMes) : ultimoMes;
  const dados = meses.slice(0, limite + 1);

  // Rótulos do eixo X em anos, com no máximo ~10 marcações.
  const passoAnos = Math.max(1, Math.ceil((limite / 12) / 10));
  const ticks = [];
  for (let ano = 0; ano * 12 <= limite; ano += passoAnos) ticks.push(ano * 12);

  const pontoMeta = metaMes != null && metaMes <= limite ? meses[metaMes] : null;

  const aporteNum = modoCalculo === 'aporte' ? (aporteNecessarioCalc?.aporteMensalNecessario || 0) : numero(aporteMensal);
  const salarioAtualNum = numero(salarioAtual);
  const pctDoSalario =
    salarioAtualNum > 0 && aporteNum > 0 ? `${Math.round((aporteNum / salarioAtualNum) * 100)}% do salário atual` : null;

  const botaoModo = (chave, texto) => {
    const ativo = modoCalculo === chave;
    return (
      <button
        key={chave}
        type="button"
        onClick={() => setModoCalculo(chave)}
        style={{
          flex: 1,
          cursor: 'pointer',
          background: ativo ? '#C8B800' : 'var(--surface-dark)',
          color: ativo ? '#121212' : 'var(--text)',
          border: ativo ? '1px solid #C8B800' : '1px solid #C8B800AA',
          borderRadius: 8,
          padding: '8px 12px',
          fontFamily: 'inherit',
          fontSize: '0.85em',
          fontWeight: ativo ? 700 : 500,
          outline: 'none',
        }}
      >
        {texto}
      </button>
    );
  };

  return (
    <div>
      <h1>Simulado</h1>
      <p className="subtitle">Descubra quanto tempo falta para sua aposentadoria ou quanto precisa aportar</p>

      {/* Modo de cálculo */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          maxWidth: 520,
        }}
      >
        {botaoModo('tempo', 'Descobrir tempo')}
        {botaoModo('aporte', 'Descobrir aporte necessário')}
      </div>

      {/* Parâmetros do simulado — cálculo ao vivo, sem botão */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 14,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 18,
          marginBottom: 18,
        }}
      >
        <label style={labelStyle}>
          Salário atual (mensal)
          <input
            type="number"
            step="any"
            min="0"
            value={salarioAtual}
            onChange={(e) => setSalarioAtual(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Salário pretendido na aposentadoria (mensal)
          <input
            type="number"
            step="any"
            min="0"
            value={salarioPretendido}
            onChange={(e) => setSalarioPretendido(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Inflação anual conservadora (% a.a.)
          <input
            type="number"
            step="any"
            min="0"
            value={inflacaoAnual}
            onChange={(e) => setInflacaoAnual(e.target.value)}
            style={inputStyle}
          />
        </label>

        {modoCalculo === 'tempo' ? (
          <label style={labelStyle}>
            Aporte mensal
            <input
              type="number"
              step="any"
              min="0"
              value={aporteMensal}
              onChange={(e) => setAporteMensal(e.target.value)}
              style={inputStyle}
            />
            {pctDoSalario ? (
              <span style={{ fontSize: '0.72em', color: 'var(--text-faint)', fontWeight: 400 }}>{pctDoSalario}</span>
            ) : null}
          </label>
        ) : (
          <div style={{ ...labelStyle }}>
            <span>Aporte mensal necessário</span>
            <div
              style={{
                ...inputStyle,
                background: 'var(--surface)',
                color: '#C8B800',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                minHeight: 38,
              }}
            >
              {aporteNecessarioCalc?.aporteMensalNecessario != null ? formatCurrency(aporteNecessarioCalc.aporteMensalNecessario) : '—'}
            </div>
            {aporteNecessarioCalc?.aporteMensalNecessario != null && pctDoSalario ? (
              <span style={{ fontSize: '0.72em', color: 'var(--text-faint)', fontWeight: 400 }}>{pctDoSalario}</span>
            ) : aporteNecessarioCalc?.mensagem ? (
              <span style={{ fontSize: '0.72em', color: '#FF5555', fontWeight: 400 }}>{aporteNecessarioCalc.mensagem}</span>
            ) : null}
          </div>
        )}

        <label style={labelStyle}>
          Aporte inicial
          <input
            type="number"
            step="any"
            min="0"
            value={aporteInicial}
            onChange={(e) => setAporteInicial(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Taxa de juros contratada (% a.a.) - Renda Fixa
          <input
            type="number"
            step="any"
            min="0"
            value={taxaJurosAnual}
            onChange={(e) => setTaxaJurosAnual(e.target.value)}
            style={inputStyle}
          />
        </label>

        {modoCalculo === 'tempo' ? (
          <label style={labelStyle}>
            Horizonte máximo (anos)
            <input
              type="number"
              step="1"
              min="1"
              value={horizonteAnos}
              onChange={(e) => setHorizonteAnos(e.target.value)}
              style={inputStyle}
            />
          </label>
        ) : (
          <label style={labelStyle}>
            Tempo desejado para se aposentar (anos inteiros)
            <input
              type="number"
              step="1"
              min="1"
              value={tempoDesejadoAnos}
              onChange={(e) => setTempoDesejadoAnos(e.target.value)}
              style={inputStyle}
            />
          </label>
        )}
      </div>

      {/* Resultados */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 16,
        }}
      >
        <CardResultado
          label={modoCalculo === 'tempo' ? 'Tempo necessário' : 'Tempo informado'}
          valor={modoCalculo === 'tempo' ? (resumo.tempoFormatado || 'Meta não atingida') : `${numero(tempoDesejadoAnos, 0)} anos`}
          cor={modoCalculo === 'tempo' ? (resumo.tempoFormatado ? 'var(--text)' : '#FF5555') : 'var(--text)'}
          detalhe={
            resumo.tempoMeses != null
              ? `Mês ${resumo.tempoMeses} — Ano ${Math.floor(resumo.tempoMeses / 12)}`
              : modoCalculo === 'tempo'
                ? `Não atingida em até ${numero(horizonteAnos, 40) || 40} anos`
                : `Baseado em ${numero(tempoDesejadoAnos, 0)} anos inteiros`
          }
        />
        <CardResultado
          label="Patrimônio necessário"
          valor={resumo.patrimonioNecessario != null ? formatCurrency(resumo.patrimonioNecessario) : '—'}
          detalhe={
            resumo.totalRendimento != null
              ? `Rendimento acumulado: ${formatCurrency(resumo.totalRendimento)}`
              : null
          }
        />
        <CardResultado
          label="Renda mensal na meta (corrigida)"
          valor={resumo.rendaNaMeta != null ? formatCurrency(resumo.rendaNaMeta) : '—'}
          cor={resumo.rendaNaMeta != null ? '#C8B800' : 'var(--text)'}
          detalhe={
            resumo.rendaMensalSacada != null
              ? `Saca-se por mês: ${formatCurrency(resumo.rendaMensalSacada)}`
              : null
          }
        />
        <CardResultado
          label={numero(salarioAtual) > 0 && aporteNum > 0 && aporteNum < numero(salarioAtual) ? 'Total aportado até fim do horizonte' : 'Total aportado até meta'}
          valor={resumo.totalAportado != null ? formatCurrency(resumo.totalAportado) : '—'}
          detalhe={
            resumo.patrimonioFinalPlano != null
              ? numero(salarioAtual) > 0 && aporteNum > 0 && aporteNum < numero(salarioAtual)
                ? `Patrimônio final (continuando aportes): ${formatCurrency(resumo.patrimonioFinalPlano)}`
                : `Patrimônio parado no plano: ${formatCurrency(resumo.patrimonioFinalPlano)}`
              : null
          }
        />
      </div>

      <div
        style={{
          background: 'rgba(200, 184, 0, 0.08)',
          border: '1px solid #C8B80066',
          borderRadius: 8,
          padding: '8px 12px',
          color: 'var(--text-soft)',
          fontSize: '0.8em',
          marginBottom: 12,
        }}
      >
        Regra aplicada: se o aporte mensal for menor que o salário atual, os aportes continuam mesmo após atingir a meta.
      </div>

      {modoCalculo === 'tempo' && metaMes == null ? (
        <div
          style={{
            background: 'rgba(255, 85, 85, 0.08)',
            border: '1px solid #FF5555',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#FF5555',
            fontSize: '0.9em',
            marginBottom: 16,
          }}
        >
          ⚠️ Meta não atingida no horizonte. Aumente o aporte mensal, reduza a renda pretendida ou estenda o
          horizonte máximo.
        </div>
      ) : modoCalculo === 'tempo' && metaMes != null ? (
        <div
          style={{
            background: 'rgba(0, 204, 102, 0.08)',
            border: '1px solid #00CC66',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#00CC66',
            fontSize: '0.9em',
            marginBottom: 16,
          }}
        >
          🎯 Aposentadoria atingida em {resumo.tempoFormatado} (mês {resumo.tempoMeses} — Ano{' '}
          {Math.floor(resumo.tempoMeses / 12)}) com patrimônio de {formatCurrency(resumo.patrimonioNecessario)}.
        </div>
      ) : modoCalculo === 'aporte' && aporteNecessarioCalc?.atingivel === false ? (
        <div
          style={{
            background: 'rgba(255, 85, 85, 0.08)',
            border: '1px solid #FF5555',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#FF5555',
            fontSize: '0.9em',
            marginBottom: 16,
          }}
        >
          ⚠️ {aporteNecessarioCalc.mensagem}
        </div>
      ) : modoCalculo === 'aporte' && aporteNecessarioCalc?.atingivel === true ? (
        <div
          style={{
            background: 'rgba(0, 204, 102, 0.08)',
            border: '1px solid #00CC66',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#00CC66',
            fontSize: '0.9em',
            marginBottom: 16,
          }}
        >
          ✅ Para se aposentar em {numero(tempoDesejadoAnos, 0)} anos inteiros, você precisa aportar aproximadamente {formatCurrency(aporteNecessarioCalc.aporteMensalNecessario)} por mês.
        </div>
      ) : null}

      {/* Gráfico */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 18,
        }}
      >
        <h2 style={{ margin: '0 0 12px', fontSize: '1em', color: 'var(--text)' }}>Evolução do patrimônio</h2>
        <div style={{ width: '100%', height: 380 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dados} margin={{ top: 24, right: 28, left: 4, bottom: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" strokeOpacity={0.6} />
              <XAxis
                dataKey="mes"
                type="number"
                domain={[0, Math.max(limite, 1)]}
                ticks={ticks}
                tickFormatter={(v) => `Ano ${v / 12}`}
                tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatarEixo}
                tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
                width={72}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(valor) => formatCurrency(valor)}
                labelFormatter={(l) => `Mês ${l} — Ano ${Math.floor(l / 12)}`}
              />
              <Legend verticalAlign="top" height={36} iconType="line" />
              <Line
                type="monotone"
                dataKey="semRendimento"
                name="Aportes (sem rendimentos)"
                stroke="#888888"
                strokeDasharray="6 4"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="patrimonio"
                name="Com rendimentos"
                stroke="#C8B800"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="plano"
                name="Plano de aposentadoria"
                stroke="#00CC66"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
              {pontoMeta ? (
                <>
                  <ReferenceLine
                    x={pontoMeta.mes}
                    stroke="#00CC66"
                    strokeDasharray="5 5"
                    strokeOpacity={0.7}
                  />
                  <ReferenceDot
                    x={pontoMeta.mes}
                    y={pontoMeta.plano}
                    r={7}
                    fill="#00CC66"
                    stroke="#121212"
                    strokeWidth={2}
                    label={{
                      value: `🎯 Aposentadoria atingida (mês ${pontoMeta.mes} / Ano ${pontoMeta.ano})`,
                      position: 'top',
                      style: { fill: '#00CC66', fontSize: 13, fontWeight: 700 },
                    }}
                  />
                </>
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default Conferencia;
