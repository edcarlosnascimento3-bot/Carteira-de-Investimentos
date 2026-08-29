export default function YearSelector({ ano, onChange, label = 'Ano-Calendário' }) {
  const anoAtual = new Date().getFullYear();
  const anos = [];
  for (let a = anoAtual; a >= 2020; a--) anos.push(a);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <label style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{label}:</label>
      <select
        value={ano}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: 'var(--card-bg, #fff)',
          color: 'var(--text, #333)',
          border: '1px solid var(--border, #ddd)',
          borderRadius: 6,
          padding: '6px 12px',
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        {anos.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
    </div>
  );
}
