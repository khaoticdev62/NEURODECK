interface DeckButtonHintProps {
  button: string;
  label: string;
  className?: string;
}

export function DeckButtonHint({ button, label, className = "" }: DeckButtonHintProps) {
  return (
    <span
      data-testid="deck-button-hint"
      className={`inline-flex min-h-touch items-center gap-1 rounded border border-nd-border-subtle bg-nd-surface-secondary/40 px-1.5 py-0.5 text-2xs text-nd-text-secondary ${className}`}
    >
      <b className="font-semibold text-nd-text-muted">{button}</b> {label}
    </span>
  );
}
