import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  label?: string;
  fullHeight?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function LoadingState({ label = 'Loading…', fullHeight = false, size = 'md' }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={[
        'flex flex-col items-center justify-center gap-3 text-nd-text-muted',
        fullHeight ? 'h-full min-h-[200px]' : 'py-10',
      ].join(' ')}
    >
      <Loader2 className={`${sizeMap[size]} animate-spin text-nd-accent`} />
      <span className="text-xs">{label}</span>
    </div>
  );
}
