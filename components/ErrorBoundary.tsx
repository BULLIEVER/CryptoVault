import React from 'react';

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
    constructor(props: React.PropsWithChildren) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // eslint-disable-next-line no-console
        console.error('Uncaught error:', error, errorInfo);
    }

    handleReload = () => {
        location.reload();
    };

    render(): React.ReactNode {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] text-[var(--color-foreground)] p-6">
                    <div className="max-w-md w-full glassmorphism rounded-xl p-6 text-center">
                        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                        <p className="text-sm text-[var(--color-muted-foreground)] mb-4">An unexpected error occurred while rendering the app.</p>
                        <button onClick={this.handleReload} className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Reload</button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}


