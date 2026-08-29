import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Erro capturado:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '24px',
          fontFamily: 'monospace',
          background: '#1a1a2e',
          color: '#ff6b6b',
          minHeight: '50vh',
          borderRadius: '8px',
          margin: '16px',
        }}>
          <h2 style={{ color: '#ff6b6b', marginBottom: '12px' }}>
            Erro ao renderizar a página
          </h2>
          <details open>
            <summary style={{ cursor: 'pointer', color: '#ffd93d', marginBottom: '8px' }}>
              Detalhes do erro
            </summary>
            <pre style={{
              background: '#0d0d1a',
              padding: '12px',
              borderRadius: '6px',
              overflow: 'auto',
              fontSize: '13px',
              lineHeight: '1.5',
              color: '#e0e0e0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {this.state.error?.toString()}
              {'\n\n'}
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
          <button
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            style={{
              marginTop: '16px',
              padding: '8px 20px',
              background: '#533483',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
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
