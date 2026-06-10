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
      className={[
        'flex flex-col items-center justify-center gap-3 text-center',
        fullHeight ? 'h-full min-h-[200px]' : 'py-10',
      ].join(' ')}
    >
      <AlertCircle className="h-8 w-8 text-nd-danger/70" />
      <div>
        <p className="text-sm font-semibold text-nd-text">{title}</p>
        {message && <p className="mt-1 max-w-sm text-xs text-nd-text-muted">{message}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCcw className="h-3.5 w-3.5" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
