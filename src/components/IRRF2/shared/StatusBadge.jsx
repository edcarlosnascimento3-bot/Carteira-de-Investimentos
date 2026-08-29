const STYLES = {
  ok: { bg: '#d4edda', color: '#155724', border: '#c3e6cb' },
  warning: { bg: '#fff3cd', color: '#856404', border: '#ffeeba' },
  error: { bg: '#f8d7da', color: '#721c24', border: '#f5c6cb' },
  info: { bg: '#d1ecf1', color: '#0c5460', border: '#bee5eb' },
  pending: { bg: '#e2e3e5', color: '#383d41', border: '#d6d8db' },
};

export default function StatusBadge({ status = 'info', children }) {
  const s = STYLES[status] || STYLES.info;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      {children}
    </span>
  );
}
