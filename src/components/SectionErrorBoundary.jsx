import { Component } from 'react';

export default class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[SectionErrorBoundary]${this.props.name ? ` ${this.props.name}` : ''} Erro capturado:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: 'var(--surface-dark)', border: '1px solid var(--border)', borderRadius: 10,
          padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          gridColumn: this.props.gridColumn,
        }}>
          <span style={{ fontSize: '0.9em', color: 'var(--text-muted)', fontWeight: 600 }}>
            Seção indisponível
          </span>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              padding: '4px 14px', background: 'var(--surface)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}