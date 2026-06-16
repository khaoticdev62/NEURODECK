import { BookOpen, Globe, Search, Terminal } from "lucide-react";
import { Button } from "../../../../components/primitives/Button";

interface NewTabScreenProps {
  onNavigate: (url: string) => void;
  onClearData: (scope: "currentTab" | "all") => void;
}

export function NewTabScreen({ onNavigate, onClearData }: NewTabScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-nd-surface-app text-center select-none overflow-y-auto scrollbar-thin">
      <div className="max-w-md w-full flex flex-col items-center gap-6">
        <Globe
          className="h-12 w-12 text-nd-accent-primary animate-pulse"
          aria-hidden="true"
        />
        <div>
          <h3 className="text-lg font-bold text-nd-text-primary">New Session Tab</h3>
          <p className="text-xs text-nd-text-muted mt-1.5 leading-relaxed">
            Start browsing by typing a URL or searching Google. Your session is fully
            isolated.
          </p>
        </div>

        <div className="flex w-full items-center gap-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-3 py-2 focus-within:border-nd-accent-primary/40 focus-within:ring-2 focus-within:ring-nd-accent-primary/25 transition">
          <Search className="h-4 w-4 text-nd-text-muted" aria-hidden="true" />
          <input
            id="new-tab-search-input"
            type="text"
            placeholder="Search Google or enter web address..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const val = (e.target as HTMLInputElement).value;
                if (val.trim()) onNavigate(val.trim());
              }
            }}
            className="flex-1 bg-transparent text-xs text-nd-text-primary outline-none animate-none"
          />
          <Button
            variant="primary"
            size="xs"
            onClick={() => {
              const input = document.getElementById(
                "new-tab-search-input"
              ) as HTMLInputElement;
              if (input && input.value.trim()) onNavigate(input.value.trim());
            }}
          >
            Search
          </Button>
        </div>

        <div className="w-full flex flex-col gap-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-nd-text-muted text-left">
            Quick Access
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onNavigate("https://github.com")}
              className="flex flex-col items-center gap-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3 text-nd-text-primary transition hover:border-nd-accent-primary/30 hover:bg-nd-accent-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/60"
            >
              <Globe className="h-5 w-5 text-nd-accent-primary" aria-hidden="true" />
              <span className="text-[10px] font-semibold">GitHub</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("https://stackoverflow.com")}
              className="flex flex-col items-center gap-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3 text-nd-text-primary transition hover:border-nd-accent-primary/30 hover:bg-nd-accent-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/60"
            >
              <BookOpen className="h-5 w-5 text-nd-accent-primary" aria-hidden="true" />
              <span className="text-[10px] font-semibold">StackOverflow</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("https://github.com/khaoticdev62/NEURODECK")}
              className="flex flex-col items-center gap-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3 text-nd-text-primary transition hover:border-nd-accent-primary/30 hover:bg-nd-accent-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/60"
            >
              <Terminal className="h-5 w-5 text-nd-accent-primary" aria-hidden="true" />
              <span className="text-[10px] font-semibold">Repository</span>
            </button>
          </div>
        </div>

        <div className="w-full flex flex-col gap-2.5 mt-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-nd-text-muted text-left">
            Privacy Actions
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="xs"
              fullWidth
              onClick={() => onClearData("currentTab")}
            >
              Clear Current Tab Data
            </Button>
            <Button
              variant="danger"
              size="xs"
              fullWidth
              onClick={() => onClearData("all")}
            >
              Purge All Sessions Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
