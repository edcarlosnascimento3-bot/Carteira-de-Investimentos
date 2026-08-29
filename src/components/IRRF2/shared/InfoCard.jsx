export default function InfoCard({ titulo, valor, subtitulo, icone, cor }) {
  return (
    <div
      style={{
        background: 'var(--card-bg, #fff)',
        border: '1px solid var(--border, #eee)',
        borderRadius: 10,
        padding: '14px 16px',
        minWidth: 160,
        flex: '1 1 160px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icone && <span style={{ fontSize: 18 }}>{icone}</span>}
        <span style={{ fontSize: 12, color: 'var(--text-secondary, #888)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {titulo}
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: cor || 'var(--text, #333)' }}>
        {valor}
      </div>
      {subtitulo && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)' }}>
          {subtitulo}
        </div>
      )}
    </div>
  );
}
