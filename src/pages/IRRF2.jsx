import { useState, useMemo } from 'react';
import { useTransactions } from '../context/TransactionsContext';
import { useProventos } from '../context/ProventosContext';
import { useRfManual } from '../context/RfManualContext';
import { useIRRF2 } from '../context/IRRF2Context';
import YearSelector from '../components/IRRF2/shared/YearSelector';
import InfoCard from '../components/IRRF2/shared/InfoCard';
import ResumoPanel from '../components/IRRF2/ResumoPanel';
import ChecklistPanel from '../components/IRRF2/ChecklistPanel';
import BensPanel from '../components/IRRF2/BensPanel';
import IsentosPanel from '../components/IRRF2/IsentosPanel';
import TributacaoPanel from '../components/IRRF2/TributacaoPanel';
import GanhosPanel from '../components/IRRF2/GanhosPanel';
import OperacoesPanel from '../components/IRRF2/OperacoesPanel';
import ProventosPanel from '../components/IRRF2/ProventosPanel';
import ConferenciaPanel from '../components/IRRF2/ConferenciaPanel';
import InformesPanel from '../components/IRRF2/InformesPanel';
import CalendarioPanel from '../components/IRRF2/CalendarioPanel';
import RelatoriosPanel from '../components/IRRF2/RelatoriosPanel';
import DarfPanel from '../components/IRRF2/DarfPanel';
import { calcularResumoAnual, calcularProgressoChecklist } from '../services/irrfCalculations';

const TABS = [
  { id: 'resumo', label: 'Resumo', icone: '📊' },
  { id: 'checklist', label: 'Checklist', icone: '✅' },
  { id: 'bens', label: 'Bens e Direitos', icone: '🏠' },
  { id: 'isentos', label: 'Isentos', icone: '💚' },
  { id: 'tributacao', label: 'Tributação', icone: '💰' },
  { id: 'ganhos', label: 'Ganhos de Capital', icone: '📈' },
  { id: 'operacoes', label: 'Operações', icone: '📋' },
  { id: 'proventos', label: 'Proventos', icone: '💵' },
  { id: 'darf', label: 'DARF', icone: '🏦' },
  { id: 'conferencia', label: 'Conferência', icone: '🔍' },
  { id: 'informes', label: 'Informes', icone: '📄' },
  { id: 'calendario', label: 'Calendário', icone: '📅' },
  { id: 'relatorios', label: 'Relatórios', icone: '📑' },
];

export default function IRRF2() {
  const [ano, setAno] = useState(new Date().getFullYear() - 1);
  const [activeTab, setActiveTab] = useState('resumo');
  const { transactions: transactionsRaw } = useTransactions();
  const { proventos } = useProventos();
  const { rfManual } = useRfManual();
  const { irrfData, atualizarChecklist, atualizarNotas } = useIRRF2();

  const transactions = useMemo(() => Array.isArray(transactionsRaw) ? transactionsRaw : [], [transactionsRaw]);
  const proventosList = useMemo(() => Array.isArray(proventos) ? proventos : [], [proventos]);

  const resumo = useMemo(
    () => calcularResumoAnual(transactions, proventosList, rfManual, ano),
    [transactions, proventosList, rfManual, ano]
  );

  const progresso = useMemo(
    () => calcularProgressoChecklist(transactions, proventosList, rfManual, []),
    [transactions, proventosList, rfManual]
  );

  const checklistData = irrfData?.declaracoes?.[ano]?.checklist || {};
  const percentualChecklist = useMemo(() => {
    const itens = Object.keys(progresso);
    const concluidos = itens.filter((k) => progresso[k] || checklistData[k]);
    return Math.round((concluidos.length / itens.length) * 100);
  }, [progresso, checklistData]);

  const renderPanel = () => {
    const common = { ano, transactions, proventos: proventosList, rfManual, resumo };
    switch (activeTab) {
      case 'resumo': return <ResumoPanel {...common} percentualChecklist={percentualChecklist} />;
      case 'checklist': return <ChecklistPanel {...common} progresso={progresso} checklistData={checklistData} onToggle={(item, val) => atualizarChecklist(ano, item, val)} />;
      case 'bens': return <BensPanel {...common} />;
      case 'isentos': return <IsentosPanel {...common} />;
      case 'tributacao': return <TributacaoPanel {...common} />;
      case 'ganhos': return <GanhosPanel {...common} />;
      case 'operacoes': return <OperacoesPanel {...common} />;
      case 'proventos': return <ProventosPanel {...common} />;
      case 'darf': return <DarfPanel {...common} />;
      case 'conferencia': return <ConferenciaPanel {...common} />;
      case 'informes': return <InformesPanel {...common} />;
      case 'calendario': return <CalendarioPanel {...common} />;
      case 'relatorios': return <RelatoriosPanel {...common} />;
      default: return <ResumoPanel {...common} percentualChecklist={percentualChecklist} />;
    }
  };

  return (
    <div style={{ padding: '0 0 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text, #333)' }}>
          🧾 Centro de Preparação — IRPF {ano}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary, #888)', margin: '4px 0 0' }}>
          Organize, conferencie e prepare sua declaração de Imposto de Renda
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <YearSelector ano={ano} onChange={setAno} />
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
          <InfoCard titulo="Patrimônio RF" valor={formatBRL(resumo.totalPatrimonioRendaFixa)} icone="🔒" />
          <InfoCard titulo="Compras" valor={formatBRL(resumo.investidoCompras)} icone="🛒" />
          <InfoCard titulo="Dividendos" valor={formatBRL(resumo.totalDividendos)} icone="💰" />
          <InfoCard titulo="JCP" valor={formatBRL(resumo.totalJCP)} icone="📑" />
          <InfoCard titulo="IR Devido (JCP)" valor={formatBRL(resumo.irDevidoJCP)} icone="🏦" cor="#cc3333" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border, #eee)', marginBottom: 16, overflowX: 'auto' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 14px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 700 : 400,
              color: activeTab === tab.id ? 'var(--accent, #007bff)' : 'var(--text-secondary, #888)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent, #007bff)' : '2px solid transparent',
              marginBottom: -2,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.15s',
            }}
          >
            <span>{tab.icone}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div style={{ minHeight: 300 }}>
        {renderPanel()}
      </div>
    </div>
  );
}

function formatBRL(v) {
  if (typeof v !== 'number' || isNaN(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
