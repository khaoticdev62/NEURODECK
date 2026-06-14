interface DeckButtonHintProps {
  button: string;
  label: string;
  className?: string;
}

export function DeckButtonHint({ button, label, className = '' }: DeckButtonHintProps) {
  return (
    <span
      data-testid="deck-button-hint"
      className={`inline-flex items-center gap-1 rounded border border-border-subtle bg-surface-secondary/40 px-1.5 py-0.5 text-2xs text-text-secondary ${className}`}
    >
      <b className="font-semibold text-text-muted">{button}</b> {label}
    </span>
  );
}
