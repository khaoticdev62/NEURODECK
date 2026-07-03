import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { NdxTvTabBar } from '../NdxTvTabBar'

const TABS = [
  { id: 'apps', label: 'Registered Apps' },
  { id: 'steam', label: 'Steam Shortcuts' }
]

function ControlledTabBar({ onSelect }: { onSelect: (id: string) => void }): React.JSX.Element {
  const [activeId, setActiveId] = useState('apps')
  return (
    <NdxTvTabBar
      groupId="test-tabs"
      tabs={TABS}
      activeId={activeId}
      onSelect={(id) => {
        setActiveId(id)
        onSelect(id)
      }}
    />
  )
}

describe('NdxTvTabBar', () => {
  it('marks the active tab via aria-selected', () => {
    render(
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <NdxTvTabBar groupId="test-tabs" tabs={TABS} activeId="apps" onSelect={vi.fn()} />
      </FocusEngineProvider>
    )

    expect(screen.getByRole('tab', { name: 'Registered Apps' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByRole('tab', { name: 'Steam Shortcuts' })).toHaveAttribute(
      'aria-selected',
      'false'
    )
  })

  it('calls onSelect and updates the active tab when clicked', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <ControlledTabBar onSelect={onSelect} />
      </FocusEngineProvider>
    )

    await user.click(screen.getByRole('tab', { name: 'Steam Shortcuts' }))

    expect(onSelect).toHaveBeenCalledWith('steam')
    expect(screen.getByRole('tab', { name: 'Steam Shortcuts' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })
})
