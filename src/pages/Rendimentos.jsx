import CalendarioRendimentos from '../components/CalendarioRendimentos';

function Rendimentos() {
  return (
    <div style={{ marginTop: '-70px', marginLeft: 0 }}>
      <h1 style={{ marginBottom: 0 }}>📅 Calendário</h1>
      <p className="subtitle" style={{ marginBottom: '16px', marginTop: '2px' }}>Acompanhe as datas de pagamento dos seus ativos</p>
      <CalendarioRendimentos />
    </div>
  );
}

export default Rendimentos;
