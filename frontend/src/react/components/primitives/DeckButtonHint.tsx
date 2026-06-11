interface DeckButtonHintProps {
  button: string;
  label: string;
  className?: string;
}

export function DeckButtonHint({ button, label, className = '' }: DeckButtonHintProps) {
  return (
    <span data-testid="deck-button-hint" className={`inline-flex items-center gap-1 rounded border border-nd-text-muted/15 px-1.5 py-0.5 text-[10px] text-nd-text/70 ${className}`}>
      <b className="font-semibold text-nd-text-muted">{button}</b> {label}
    </span>
  );
}
