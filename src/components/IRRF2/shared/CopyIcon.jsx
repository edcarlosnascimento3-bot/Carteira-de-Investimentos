import { useState } from 'react';

export default function CopyIcon({ text, label = 'Copiar' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(text));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const el = document.createElement('textarea');
      el.value = String(text);
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copiado!' : label}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 2,
        fontSize: 14,
        color: copied ? '#00cc66' : 'var(--text-secondary, #888)',
        transition: 'color 0.2s',
      }}
    >
      {copied ? '✓' : '📋'}
    </button>
  );
}
