import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../../__tests__/testUtils'
import { FirstRunWelcome } from '../FirstRunWelcome'
import { AIProviderSetup } from '../AIProviderSetup'

function renderWelcome(): ReturnType<typeof renderWithProviders> {
  return renderWithProviders(
    <Routes>
      <Route path="/onboarding/welcome" element={<FirstRunWelcome />} />
      <Route path="/onboarding/providers" element={<AIProviderSetup />} />
    </Routes>,
    { initialEntries: ['/onboarding/welcome'] }
  )
}

describe('FirstRunWelcome', () => {
  it('renders all four spec cards', () => {
    renderWelcome()
    expect(screen.getByText('Controller-native AI')).toBeInTheDocument()
    expect(screen.getByText('Private local workspaces')).toBeInTheDocument()
    expect(screen.getByText('Review before execution')).toBeInTheDocument()
    expect(screen.getByText('Recover every major change')).toBeInTheDocument()
  })

  it('navigates to AI provider setup on "Begin setup"', async () => {
    const user = userEvent.setup()
    renderWelcome()

    await user.click(screen.getByRole('button', { name: 'Begin setup' }))

    expect(screen.getByText('AI Provider Setup')).toBeInTheDocument()
  })
})
