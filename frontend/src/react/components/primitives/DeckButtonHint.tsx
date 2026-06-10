interface DeckButtonHintProps {
  button: string;
  label: string;
  className?: string;
}

export function DeckButtonHint({ button, label, className = '' }: DeckButtonHintProps) {
  return (
    <span data-testid="deck-button-hint" className={`rounded-lg border border-nd-text-muted/15 px-2 py-1 text-[11px] text-nd-text0 ${className}`}>
      <b className="font-semibold text-nd-text-muted">{button}</b> {label}
    </span>
  );
}
