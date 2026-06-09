import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  stack?: string;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'Unknown renderer error.' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[neurodeck:renderer-boundary]', error, info.componentStack);
    this.setState({ stack: info.componentStack || undefined });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-[#0A0D10] p-6 text-slate-100">
        <div className="max-w-2xl rounded-[2rem] border border-danger/30 bg-[#170B10]/90 p-8 shadow-2xl shadow-danger/10">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-danger/30 bg-danger/10 p-3 text-danger">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.3em] text-danger">Renderer Recovery</p>
              <h1 className="mt-2 text-2xl font-bold">NEURODECK hit a renderer fault.</h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                The app shell stayed contained. Reload the renderer, then export diagnostics from Settings or Diagnostics if the issue repeats.
              </p>
              <pre className="mt-4 max-h-48 overflow-auto rounded-2xl border border-white/10 bg-black/25 p-4 text-xs text-slate-500">
                {this.state.message}
                {this.state.stack ? `\n\n${this.state.stack}` : ''}
              </pre>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-danger/25 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger/15"
              >
                <RotateCcw className="h-4 w-4" /> Reload Renderer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
