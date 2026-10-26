import { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ASTRA_ERROR_BOUNDARY_CAUGHT]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  private handleHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.hash = '';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: '100vw',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#05070A',
            color: '#E2E8F0',
            fontFamily: 'monospace',
            padding: '24px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              maxWidth: '680px',
              width: '100%',
              backgroundColor: '#0B0F17',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '6px',
              padding: '32px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.8), 0 0 30px rgba(239, 68, 68, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <ShieldAlert color="#EF4444" size={24} />
              <h2 style={{ margin: 0, fontSize: '16px', letterSpacing: '0.08em', color: '#F87171' }}>
                {this.props.fallbackTitle || 'MISSION CONTROL FAULT DETECTED'}
              </h2>
            </div>

            <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, marginBottom: '20px' }}>
              An unhandled runtime anomaly occurred while initializing the mission control workspace. The failure was intercepted to prevent system crash.
            </p>

            {this.state.error && (
              <div
                style={{
                  backgroundColor: '#05070A',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  padding: '14px',
                  fontSize: '11px',
                  color: '#CBD5E1',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  marginBottom: '24px',
                  whiteSpace: 'pre-wrap',
                }}
              >
                <strong>Error:</strong> {this.state.error.message}
                {this.state.error.stack && (
                  <div style={{ marginTop: '8px', color: '#64748B', fontSize: '10px' }}>
                    {this.state.error.stack}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  backgroundColor: '#0284C7',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#FFF',
                  fontSize: '12px',
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <RefreshCw size={14} />
                RETRY WORKSPACE
              </button>

              <button
                onClick={this.handleHome}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '4px',
                  color: '#E2E8F0',
                  fontSize: '12px',
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                }}
              >
                <Home size={14} />
                RETURN TO OPERATIONS
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
