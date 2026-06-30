import { useNavigate } from 'react-router-dom'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { NdxSpatialLockup } from '../../components/workbench'
import { useFocusable } from '../../controller/focus/useFocusable'

interface WelcomeCard {
  title: string
  description: string
}

const CARDS: WelcomeCard[] = [
  {
    title: 'Controller-native AI',
    description: 'Every screen is built for a gamepad first — no mouse or keyboard required.'
  },
  {
    title: 'Private local workspaces',
    description: 'Your projects live on this device. Nothing leaves it without your say.'
  },
  {
    title: 'Review before execution',
    description: 'AI proposes a plan; you approve, modify, or cancel it before anything runs.'
  },
  {
    title: 'Recover every major change',
    description: 'Destructive actions always leave a path back.'
  }
]

/**
 * ND-003 First-Run Welcome. Purely informational/navigational — no backend
 * dependency, so it's fully real today (unlike most of Epic 3's other
 * onboarding screens, which need services Epics 4/5/9/10 haven't built yet).
 */
export function FirstRunWelcome(): React.JSX.Element {
  const navigate = useNavigate()
  const { ref, isFocused } = useFocusable<HTMLButtonElement>({
    id: 'welcome:begin',
    groupId: 'welcome',
    priority: 1,
    initialFocus: true,
    onActivate: () => navigate('/onboarding/providers')
  })

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
      <div>
        <p className="text-display font-semibold text-text-primary">NeuroDeck OS</p>
        <p className="text-body text-text-secondary">Controller-native AI operating harness</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {CARDS.map((card) => (
          <NdxSpatialLockup key={card.title}>
            <div className="w-64 text-left">
              <p className="text-body font-semibold text-text-primary">{card.title}</p>
              <p className="mt-1 text-meta text-text-secondary">{card.description}</p>
            </div>
          </NdxSpatialLockup>
        ))}
      </div>
      <ControllerButton
        ref={ref}
        variant="primary"
        className={isFocused ? 'ring-2 ring-border-focus' : undefined}
        onClick={() => navigate('/onboarding/providers')}
      >
        Begin setup
      </ControllerButton>
    </div>
  )
}
