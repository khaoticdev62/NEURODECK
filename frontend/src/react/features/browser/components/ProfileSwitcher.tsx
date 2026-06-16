import { ChevronDown, Lock, Settings, Trash2 } from "lucide-react";
import type { BrowserProfile, BrowserTab } from "../types";
import { Button } from "../../../components/primitives/Button";
import { FocusTrapContainer } from "../../../components/primitives/FocusTrapContainer";

interface ProfileSwitcherProps {
  showProfilesMenu: boolean;
  onToggleProfilesMenu: () => void;
  profiles: BrowserProfile[];
  activeTab?: BrowserTab;
  activeProfile?: BrowserProfile;
  onChangeProfile: (profileId: string) => void;
  onClearProfileData: (profileId: string) => void;
}

export function ProfileSwitcher({
  showProfilesMenu,
  onToggleProfilesMenu,
  profiles,
  activeTab,
  activeProfile,
  onChangeProfile,
  onClearProfileData,
}: ProfileSwitcherProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggleProfilesMenu}
        aria-label="Switch browser profile"
        aria-expanded={showProfilesMenu}
        className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-3 py-2 text-xs font-semibold text-nd-text-muted transition hover:bg-nd-surface-hover hover:text-nd-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/60"
      >
        <Settings className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{activeProfile?.name || "Profile"}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </button>

      {showProfilesMenu && (
        <FocusTrapContainer
          active={showProfilesMenu}
          onEscape={onToggleProfilesMenu}
          className="absolute right-0 top-full z-[var(--z-dropdown)] mt-1.5 w-64 rounded-2xl border border-nd-border-subtle bg-nd-surface-app/98 p-3 shadow-2xl"
          role="dialog"
          aria-label="Switch browser profile"
        >
          <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-nd-text-muted">
            Session Profile Isolation
          </div>
          {profiles.map((p) => {
            const isCurrent = p.id === activeTab?.profileId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onChangeProfile(p.id)}
                className={`flex w-full min-h-[40px] items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/60 ${
                  isCurrent
                    ? "bg-nd-surface-selected text-nd-accent-primary font-semibold"
                    : "hover:bg-nd-surface-hover text-nd-text-primary/80 hover:text-nd-text-primary"
                }`}
              >
                <div className="flex flex-col">
                  <span>{p.name}</span>
                  <span className="text-[10px] text-nd-text-muted">
                    {p.persistent ? "Persistent Session" : "In-Memory/Private"}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {!p.persistent && (
                    <span role="img" aria-label="Private mode">
                      <Lock className="h-3 w-3 text-nd-accent-warning" aria-hidden="true" />
                    </span>
                  )}
                  {isCurrent && (
                    <span className="h-1.5 w-1.5 rounded-full bg-nd-accent-primary" />
                  )}
                </div>
              </button>
            );
          })}
          <div className="my-2 border-t border-nd-border-subtle" />
          {activeProfile && (
            <Button
              variant="danger"
              size="sm"
              fullWidth
              icon={Trash2}
              onClick={() => onClearProfileData(activeProfile.id)}
            >
              Clear Profile Storage
            </Button>
          )}
        </FocusTrapContainer>
      )}
    </div>
  );
}
