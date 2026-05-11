function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirmar Exclusão</h2>
        </div>

        <div className="modal-body" style={{ textAlign: 'center', padding: '30px 20px' }}>
          <div style={{ fontSize: '3em', marginBottom: '16px' }}>🗑️</div>
          <p style={{ color: '#E0E0E0', fontSize: '1.1em', lineHeight: 1.6 }}>
            {message}
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn btn-cancel" onClick={onCancel}>Não, Cancelar</button>
          <button className="btn btn-danger" onClick={onConfirm}>Sim, Excluir</button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
