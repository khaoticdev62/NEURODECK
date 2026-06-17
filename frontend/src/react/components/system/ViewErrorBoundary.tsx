import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import type { ViewId } from "../../types/neurodeck";

interface State {
  hasError: boolean;
  message: string;
}

interface Props {
  children: React.ReactNode;
  viewId: ViewId;
}

export class ViewErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || "Unknown error." };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[neurodeck:view-boundary:${this.props.viewId}]`, error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-2xl border border-nd-accent-error/30 bg-nd-surface/60 p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-nd-accent-error/30 bg-nd-accent-error/10 text-nd-accent-error">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="text-sm font-semibold text-nd-text-primary">View crashed</h2>
          <p className="mt-1 text-xs text-nd-text-muted">
            This view encountered an error and has been isolated.
          </p>
          <pre className="mt-3 max-h-24 overflow-auto rounded-xl border border-nd-border-subtle bg-nd-surface-base/40 px-3 py-2 text-left text-[10px] text-nd-text-muted">
            {this.state.message}
          </pre>
          <button
            type="button"
            onClick={this.reset}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-nd-accent-primary/25 bg-nd-accent-primary/10 px-4 py-2 text-xs font-semibold text-nd-accent-primary transition hover:bg-nd-accent-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry view
          </button>
        </div>
      </div>
    );
  }
}
