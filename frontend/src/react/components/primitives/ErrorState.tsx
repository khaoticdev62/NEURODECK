import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  fullHeight?: boolean;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  fullHeight = false,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={[
        'flex flex-col items-center justify-center gap-3 text-center',
        fullHeight ? 'h-full min-h-48' : 'py-10',
      ].join(' ')}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-nd-accent-error/20 bg-nd-accent-error/10">
        <AlertCircle className="h-6 w-6 text-nd-accent-error" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-semibold text-nd-text-primary">{title}</p>
        {message && <p className="mt-1 max-w-sm text-xs text-nd-text-secondary">{message}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
