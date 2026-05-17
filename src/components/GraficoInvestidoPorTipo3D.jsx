import { useMemo, useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist';

const tipoCores = {
  'Ação': '#C8B800',
  'FII': '#CC8800',
  'Renda Fixa': '#0099CC',
};

function makeBar3D(label, value, cor, index, maxVal) {
  const w = 0.6;
  const d = 0.6;
  const h = value > 0 ? (value / maxVal) * 10 : 0.01;
  const x = index;
  const y = 0;

  const xv = [x, x + w, x + w, x, x, x + w, x + w, x];
  const yv = [y, y, y, y, y + d, y + d, y + d, y + d];
  const zv = [0, 0, 0, 0, h, h, h, h];

  return {
    type: 'mesh3d',
    x: xv,
    y: yv,
    z: zv,
    i: [0, 0, 4, 4, 0, 0, 1, 1, 2, 2, 3, 3],
    j: [1, 2, 7, 6, 4, 5, 5, 6, 6, 7, 7, 4],
    k: [2, 3, 6, 5, 5, 1, 6, 2, 7, 3, 4, 0],
    name: label,
    color: cor,
    opacity: 0.9,
    flatshading: true,
    hoverinfo: 'text',
    hovertext: `${label}: R$ ${value.toLocaleString('pt-BR')}`,
    showlegend: true,
  };
}

function GraficoInvestidoPorTipo3D({ portfolio }) {
  const chartRef = useRef(null);

  const agrupado = useMemo(() => {
    const map = {};
    portfolio.forEach(p => {
      map[p.tipo] = (map[p.tipo] || 0) + p.investido;
    });
    return Object.entries(map)
      .map(([tipo, valor]) => ({ tipo, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [portfolio]);

  useEffect(() => {
    if (!chartRef.current || agrupado.length === 0) return;

    const maxVal = Math.max(...agrupado.map(d => d.valor));
    const traces = agrupado.map((d, i) =>
      makeBar3D(d.tipo, d.valor, tipoCores[d.tipo] || '#888888', i, maxVal)
    );

    const layout = {
      title: {
        text: 'Investido por Tipo',
        font: { color: '#E0E0E0', size: 16 },
      },
      scene: {
        xaxis: {
          title: { text: 'Tipo', font: { color: '#999' } },
          tickfont: { color: '#999' },
          gridcolor: '#2A2A2A',
          zerolinecolor: '#2A2A2A',
        },
        yaxis: {
          title: { text: '', font: { color: '#999' } },
          tickfont: { color: '#999' },
          gridcolor: '#2A2A2A',
          zerolinecolor: '#2A2A2A',
        },
        zaxis: {
          title: { text: 'Investido (R$)', font: { color: '#999' } },
          tickfont: { color: '#999' },
          gridcolor: '#2A2A2A',
          zerolinecolor: '#2A2A2A',
        },
        camera: { eye: { x: 1.8, y: 1.8, z: 1.2 } },
        bgcolor: 'rgba(0,0,0,0)',
      },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#E0E0E0' },
      legend: {
        font: { color: '#E0E0E0' },
        bgcolor: 'rgba(0,0,0,0)',
      },
      margin: { l: 0, r: 0, b: 0, t: 40 },
      autosize: true,
    };

    Plotly.newPlot(chartRef.current, traces, layout, {
      responsive: true,
      displayModeBar: false,
    });

    return () => Plotly.purge(chartRef.current);
  }, [agrupado]);

  if (agrupado.length === 0) return null;

  return (
    <div style={{ marginTop: 30 }}>
      <h2 style={{ color: '#E0E0E0', fontSize: '1.2em', marginBottom: 16 }}>
        📊 Investido por Tipo (3D)
      </h2>
      <div
        ref={chartRef}
        style={{ width: '100%', height: 450 }}
      />
    </div>
  );
}

export default GraficoInvestidoPorTipo3D;
