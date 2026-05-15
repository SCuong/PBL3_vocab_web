import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Top-level error boundary. Prevents an uncaught render error from blanking
 * the entire SPA. Use at the root of the tree (wrap the router); nested
 * boundaries can be added later for finer-grained recovery.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = { hasError: false, error: null };

    public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, info: ErrorInfo): void {
        // Surface the error to the console; production should pipe to Sentry / log sink.
        console.error('[ErrorBoundary] Render crash:', error, info.componentStack);
    }

    private handleReload = (): void => {
        window.location.reload();
    };

    public render(): ReactNode {
        if (!this.state.hasError) {
            return this.props.children;
        }

        if (this.props.fallback) {
            return this.props.fallback;
        }

        return (
            <div
                role="alert"
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    textAlign: 'center',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                }}
            >
                <h1 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>
                    Đã xảy ra lỗi hiển thị
                </h1>
                <p style={{ maxWidth: '32rem', color: '#cbd5e1', marginBottom: '1.5rem' }}>
                    Ứng dụng gặp sự cố không mong muốn. Vui lòng tải lại trang. Nếu lỗi
                    vẫn tiếp diễn, hãy thử đăng xuất rồi đăng nhập lại.
                </p>
                {this.state.error?.message && (
                    <pre
                        style={{
                            maxWidth: '40rem',
                            padding: '0.75rem 1rem',
                            background: '#1e293b',
                            color: '#fda4af',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            marginBottom: '1.5rem',
                            whiteSpace: 'pre-wrap',
                            overflowWrap: 'break-word',
                        }}
                    >
                        {this.state.error.message}
                    </pre>
                )}
                <button
                    type="button"
                    onClick={this.handleReload}
                    style={{
                        padding: '0.65rem 1.5rem',
                        background: '#22d3ee',
                        color: '#0f172a',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    Tải lại trang
                </button>
            </div>
        );
    }
}
