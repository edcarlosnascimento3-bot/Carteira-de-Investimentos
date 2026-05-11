import { useState, useEffect } from 'react';

function Toast({ message, visible, onClose, color = '#00CC66', direction = 'left' }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setExiting(false);
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onClose, 2500);
    }, 2000);
    return () => clearTimeout(timer);
  }, [visible, onClose]);

  if (!visible) return null;

  const exitClass = direction === 'right' ? 'toast-exit-right' : 'toast-exit';

  return (
    <div className={`toast-overlay ${exiting ? exitClass : 'toast-enter'}`}>
      <div className="toast-card" style={{ borderColor: color + '66', color }}>
        <span className="toast-icon">✓</span>
        {message}
      </div>
    </div>
  );
}

export default Toast;
