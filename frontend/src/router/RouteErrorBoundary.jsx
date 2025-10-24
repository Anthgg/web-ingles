import React from 'react';

class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error en segmento de ruta:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback({ error, onRetry: this.handleRetry });
      }
      return (
        <div className="container py-5">
          <div className="text-center">
            <h2 className="fw-bold text-danger">Algo salió mal</h2>
            <p className="text-muted">{error?.message || 'Error inesperado en esta sección'}</p>
            <button type="button" className="btn btn-outline-primary" onClick={this.handleRetry}>
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default RouteErrorBoundary;
