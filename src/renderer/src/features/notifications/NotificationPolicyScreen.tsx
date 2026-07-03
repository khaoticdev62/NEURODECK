import type { MutableToastCategory } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { NdxEditorShell, NdxSettingsTree, NdxToolWindow } from '../../components/workbench'
import { useNotificationPolicy } from '../../state/useNotificationPolicy'

const CATEGORY_LABELS: Record<MutableToastCategory, string> = {
  information: 'Information',
  success: 'Success',
  warning: 'Warning',
  'background-task-complete': 'Background task complete'
}
const CATEGORIES = Object.keys(CATEGORY_LABELS) as MutableToastCategory[]

/**
 * Epic X14 Notification Policy and Interruption Management
 * (supplemental spec §43). `error` and `approval-required` are
 * deliberately not offered here — spec §43's own "Critical security
 * events remain visible" rule, enforced by never including them in
 * `MutableToastCategory` in the first place rather than disabling a
 * checkbox after the fact.
 */
export function NotificationPolicyScreen(): React.JSX.Element {
  const { policy, quietHoursActiveNow, setMutedCategories, setQuietHours } = useNotificationPolicy()

  function toggleCategory(category: MutableToastCategory): void {
    const next = policy.mutedCategories.includes(category)
      ? policy.mutedCategories.filter((candidate) => candidate !== category)
      : [...policy.mutedCategories, category]
    setMutedCategories(next)
  }

  return (
    <div className="grid h-full grid-cols-1 gap-2 overflow-auto docked:min-w-[76rem] docked:grid-cols-[16rem_minmax(40rem,1fr)_18rem]">
      <NdxSettingsTree>
        <div className="space-y-2 text-meta text-text-secondary">
          <p className="text-text-primary">Notification settings</p>
          <p>Category controls</p>
          <p>Quiet window</p>
        </div>
      </NdxSettingsTree>

      <NdxEditorShell title="Notification Preferences">
        <div className="flex min-h-full min-w-0 flex-col gap-4 p-4">
          <p className="text-title font-semibold text-text-primary">Notification Policy</p>
          <p className="text-meta text-text-secondary">
            Errors and approval requests always stay visible, even when muted categories or quiet
            hours are active.
          </p>

          <section className="flex flex-col gap-2 ndx-settings-section">
            <p className="text-meta font-semibold text-text-primary">Muted categories</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <ControllerButton
                  key={category}
                  variant={policy.mutedCategories.includes(category) ? 'primary' : 'secondary'}
                  onClick={() => toggleCategory(category)}
                >
                  {CATEGORY_LABELS[category]}
                </ControllerButton>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3 ndx-settings-section">
            <div className="flex items-center justify-between">
              <p className="text-meta font-semibold text-text-primary">Quiet hours</p>
              <ControllerButton
                variant={policy.quietHoursEnabled ? 'primary' : 'secondary'}
                onClick={() =>
                  setQuietHours(
                    !policy.quietHoursEnabled,
                    policy.quietHoursStart,
                    policy.quietHoursEnd
                  )
                }
              >
                {policy.quietHoursEnabled ? 'On' : 'Off'}
              </ControllerButton>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-meta text-text-secondary" htmlFor="quiet-hours-start">
                Start
              </label>
              <input
                id="quiet-hours-start"
                type="time"
                value={policy.quietHoursStart}
                onChange={(event) =>
                  setQuietHours(policy.quietHoursEnabled, event.target.value, policy.quietHoursEnd)
                }
                className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
              />
              <label className="text-meta text-text-secondary" htmlFor="quiet-hours-end">
                End
              </label>
              <input
                id="quiet-hours-end"
                type="time"
                value={policy.quietHoursEnd}
                onChange={(event) =>
                  setQuietHours(
                    policy.quietHoursEnabled,
                    policy.quietHoursStart,
                    event.target.value
                  )
                }
                className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
              />
            </div>
            {policy.quietHoursEnabled && (
              <p className="text-meta text-text-secondary">
                Quiet hours are currently {quietHoursActiveNow ? 'active' : 'not active'}.
              </p>
            )}
          </section>
        </div>
      </NdxEditorShell>

      <NdxToolWindow
        title="Interruption Policy"
        subtitle={quietHoursActiveNow ? 'Quiet now' : 'Standard'}
        side="right"
      >
        <div className="space-y-3 text-meta text-text-secondary">
          <p>Error and approval-required categories are immutable and remain visible.</p>
          <p>Presentation Mode can suppress low-priority notifications through this policy.</p>
        </div>
      </NdxToolWindow>
    </div>
  )
}
