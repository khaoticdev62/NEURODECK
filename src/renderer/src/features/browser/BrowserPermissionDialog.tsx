import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import type { BrowserPermissionRequest } from '@shared/contracts'

interface BrowserPermissionDialogProps {
  request: BrowserPermissionRequest | null
  onAllow: () => void
  onDeny: () => void
}

function permissionLabel(permission: string): string {
  switch (permission) {
    case 'media':
      return 'Access your camera and microphone'
    case 'mediaKeySystem':
      return 'Use protected media playback (DRM)'
    case 'geolocation':
      return 'Know your location'
    case 'notifications':
      return 'Show notifications'
    case 'midi':
    case 'midiSysex':
      return 'Access MIDI devices'
    case 'pointerLock':
      return 'Lock your mouse pointer'
    case 'fullscreen':
      return 'Enter full-screen mode'
    case 'openExternal':
      return 'Open external applications'
    case 'display-capture':
      return 'Record your screen'
    case 'clipboard-sanitized-write':
      return 'Write to the clipboard'
    case 'storage':
      return 'Store data locally'
    default:
      return `Use the "${permission}" browser feature`
  }
}

function permissionConsequence(permission: string): string {
  switch (permission) {
    case 'media':
      return 'The site can access camera and microphone input when allowed.'
    case 'geolocation':
      return 'The site can read your approximate physical location.'
    case 'notifications':
      return 'The site can show notification banners even when not active.'
    case 'display-capture':
      return 'The site can record or share your screen contents.'
    default:
      return 'The site will be able to use this browser feature until you revoke it.'
  }
}

export function BrowserPermissionDialog({
  request,
  onAllow,
  onDeny
}: BrowserPermissionDialogProps): React.JSX.Element {
  const origin = request?.origin ?? 'unknown'
  const permission = request?.permission ?? ''
  return (
    <ConfirmationDialog
      open={request !== null}
      title="Permission request"
      action={permissionLabel(permission)}
      scope={origin}
      consequence={permissionConsequence(permission)}
      recovery="You can revoke this decision later in Privacy and Permissions."
      confirmLabel="Allow"
      onConfirm={onAllow}
      onCancel={onDeny}
    />
  )
}
