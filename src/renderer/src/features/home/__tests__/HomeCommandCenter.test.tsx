import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../../__tests__/testUtils'
import { HomeCommandCenter } from '../HomeCommandCenter'

function renderHome(): ReturnType<typeof renderWithProviders> {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<HomeCommandCenter />} />
      <Route path="/workspaces" element={<p>Workspaces placeholder</p>} />
      <Route path="/learn" element={<p>Learn placeholder</p>} />
    </Routes>
  )
}

describe('HomeCommandCenter', () => {
  it("renders the spec's defined empty state since no workspaces exist yet", () => {
    renderHome()
    expect(screen.getByText('Create or discover a workspace')).toBeInTheDocument()
  })

  it('does not show any fabricated continue cards, pinned workspaces, or recommendations', () => {
    renderHome()
    expect(screen.queryByText(/Continue/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Pinned/)).not.toBeInTheDocument()
  })

  it('"Open folder" navigates to the Workspace Hub', async () => {
    const user = userEvent.setup()
    renderHome()

    await user.click(screen.getByRole('button', { name: 'Open folder' }))

    expect(screen.getByText('Workspaces placeholder')).toBeInTheDocument()
  })
})
