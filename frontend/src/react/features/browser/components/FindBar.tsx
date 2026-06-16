import { Search, X } from "lucide-react";
import { Button } from "../../../components/primitives/Button";
import { FocusTrapContainer } from "../../../components/primitives/FocusTrapContainer";
import { IconButton } from "../../../components/primitives/IconButton";

interface FindBarProps {
  findOpen: boolean;
  findText: string;
  onFindTextChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (next: boolean) => void;
}

export function FindBar({
  findOpen,
  findText,
  onFindTextChange,
  onClose,
  onSubmit,
}: FindBarProps) {
  if (!findOpen) return null;

  return (
    <FocusTrapContainer
      active={findOpen}
      onEscape={onClose}
      className="flex items-center gap-3 border-b border-nd-accent-primary/20 bg-nd-accent-primary/5 px-4 py-2 shrink-0"
      role="dialog"
      aria-label="Find in page"
    >
      <Search className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />
      <input
        type="text"
        value={findText}
        onChange={(e) => onFindTextChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit(true)}
        placeholder="Search text in page..."
        aria-label="Find text in page"
        className="flex-1 bg-transparent text-xs text-nd-text-primary outline-none"
        autoFocus
      />
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="xs" onClick={() => onSubmit(false)}>
          Find Previous
        </Button>
        <Button variant="primary" size="xs" onClick={() => onSubmit(true)}>
          Find Next
        </Button>
        <IconButton
          aria-label="Close find bar"
          variant="ghost"
          size="md"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </div>
    </FocusTrapContainer>
  );
}
