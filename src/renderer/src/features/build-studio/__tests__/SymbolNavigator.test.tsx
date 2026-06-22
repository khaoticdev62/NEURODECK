import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { SymbolNavigator, type SymbolItem } from '../SymbolNavigator'

function renderNavigator(props: Parameters<typeof SymbolNavigator>[0]): ReturnType<typeof render> {
  return render(
    <FocusEngineProvider adapters={[new TestAdapter()]}>
      <SymbolNavigator {...props} />
    </FocusEngineProvider>
  )
}

describe('SymbolNavigator', () => {
  it('shows an honest unsupported message for languages with no real symbol provider', () => {
    renderNavigator({ symbols: [], supported: false, onJump: vi.fn() })
    expect(screen.getByText('No symbol provider for this language')).toBeInTheDocument()
  })

  it('shows the empty state when the language is supported but the file has no symbols', () => {
    renderNavigator({ symbols: [], supported: true, onJump: vi.fn() })
    expect(screen.getByText('No symbols found')).toBeInTheDocument()
  })

  it('renders nested real symbols and calls onJump with the exact line', async () => {
    const symbols: SymbolItem[] = [
      {
        name: 'WorkspaceGitTab',
        kind: 'function',
        line: 30,
        children: [{ name: 'handleCommit', kind: 'function', line: 95, children: [] }]
      }
    ]
    const onJump = vi.fn()
    renderNavigator({ symbols, supported: true, onJump })

    expect(screen.getByText('WorkspaceGitTab')).toBeInTheDocument()
    expect(screen.getByText('handleCommit')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByText('handleCommit'))

    expect(onJump).toHaveBeenCalledWith(95)
  })
})
