import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BrowserPermissionDialog } from '../BrowserPermissionDialog'

const request = {
  requestId: 'r1',
  tabId: 't1',
  origin: 'https://example.com',
  permission: 'notifications'
}

describe('BrowserPermissionDialog', () => {
  it('renders the origin and permission', () => {
    render(<BrowserPermissionDialog request={request} onAllow={vi.fn()} onDeny={vi.fn()} />)
    expect(screen.getByText('Permission request')).toBeInTheDocument()
    expect(screen.getByText('https://example.com')).toBeInTheDocument()
    expect(screen.getByText('Show notifications')).toBeInTheDocument()
  })

  it('calls onAllow when Allow is clicked', async () => {
    const onAllow = vi.fn()
    const onDeny = vi.fn()
    render(<BrowserPermissionDialog request={request} onAllow={onAllow} onDeny={onDeny} />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Allow' }))

    expect(onAllow).toHaveBeenCalledTimes(1)
    expect(onDeny).not.toHaveBeenCalled()
  })

  it('calls onDeny when Cancel is clicked', async () => {
    const onAllow = vi.fn()
    const onDeny = vi.fn()
    render(<BrowserPermissionDialog request={request} onAllow={onAllow} onDeny={onDeny} />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onDeny).toHaveBeenCalledTimes(1)
    expect(onAllow).not.toHaveBeenCalled()
  })

  it('is not rendered when request is null', () => {
    const { container } = render(
      <BrowserPermissionDialog request={null} onAllow={vi.fn()} onDeny={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })
})
