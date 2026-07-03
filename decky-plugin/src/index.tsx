import { useEffect, useState } from 'react'
import { callable, definePlugin, staticClasses } from '@decky/api'
import { ButtonItem, PanelSection, PanelSectionRow } from '@decky/ui'
import { FaBolt } from 'react-icons/fa'

interface QuickAction {
  id: string
  label: string
}

interface BridgeResult {
  available: boolean
  reason?: string
  appVersion?: string
  actions?: QuickAction[]
}

const getStatus = callable<[], BridgeResult>('get_status')
const listQuickActions = callable<[], BridgeResult>('list_quick_actions')
const focusNeurodeck = callable<[], BridgeResult>('focus_neurodeck')
const triggerQuickAction = callable<[string], BridgeResult>('trigger_quick_action')

function Content(): JSX.Element {
  const [status, setStatus] = useState<BridgeResult | null>(null)
  const [actions, setActions] = useState<QuickAction[]>([])

  useEffect(() => {
    void getStatus().then(setStatus)
    void listQuickActions().then((result) => {
      if (result.available && result.actions) setActions(result.actions)
    })
  }, [])

  return (
    <PanelSection title="NeuroDeck">
      <PanelSectionRow>
        {status === null
          ? 'Checking connection...'
          : status.available
            ? `Connected — NeuroDeck ${status.appVersion ?? ''}`.trim()
            : `Not connected${status.reason ? `: ${status.reason}` : ''}`}
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" disabled={!status?.available} onClick={() => void focusNeurodeck()}>
          Bring to front
        </ButtonItem>
      </PanelSectionRow>
      {actions.map((action) => (
        <PanelSectionRow key={action.id}>
          <ButtonItem
            layout="below"
            disabled={!status?.available}
            onClick={() => void triggerQuickAction(action.id)}
          >
            {action.label}
          </ButtonItem>
        </PanelSectionRow>
      ))}
    </PanelSection>
  )
}

export default definePlugin(() => {
  return {
    name: 'NeuroDeck Bridge',
    titleView: <div className={staticClasses.Title}>NeuroDeck</div>,
    content: <Content />,
    icon: <FaBolt />,
    onDismount() {}
  }
})
