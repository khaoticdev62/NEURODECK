import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { DiagnosticsPanel, type DiagnosticItem } from '../DiagnosticsPanel'

function renderPanel(props: Parameters<typeof DiagnosticsPanel>[0]): ReturnType<typeof render> {
  return render(
    <FocusEngineProvider adapters={[new TestAdapter()]}>
      <DiagnosticsPanel {...props} />
    </FocusEngineProvider>
  )
}

describe('DiagnosticsPanel', () => {
  it('shows the real empty state when there are no diagnostics', () => {
    renderPanel({ diagnostics: [], onSelect: vi.fn() })
    expect(screen.getByText('No problems')).toBeInTheDocument()
  })

  it('groups real diagnostics by severity, errors before warnings', () => {
    const diagnostics: DiagnosticItem[] = [
      { severity: 'warning', message: 'unused var', code: 6133, line: 2, path: 'a.ts' },
      { severity: 'error', message: 'type mismatch', code: 2322, line: 10, path: 'b.ts' }
    ]
    renderPanel({ diagnostics, onSelect: vi.fn() })

    const headings = screen.getAllByText(/error \(1\)|warning \(1\)/)
    expect(headings[0]).toHaveTextContent('error (1)')
    expect(headings[1]).toHaveTextContent('warning (1)')
    expect(screen.getByText('type mismatch')).toBeInTheDocument()
    expect(screen.getByText('unused var')).toBeInTheDocument()
  })

  it('calls onSelect with the exact diagnostic when a row is activated', async () => {
    const onSelect = vi.fn()
    const diagnostic: DiagnosticItem = {
      severity: 'error',
      message: 'type mismatch',
      code: 2322,
      line: 10,
      path: 'b.ts'
    }
    renderPanel({ diagnostics: [diagnostic], onSelect })

    const user = userEvent.setup()
    await user.click(screen.getByText('type mismatch'))

    expect(onSelect).toHaveBeenCalledWith(diagnostic)
  })
})
