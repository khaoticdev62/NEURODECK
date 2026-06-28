import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { HelpHub } from '../HelpHub'

describe('HelpHub', () => {
  it('renders route-derived help topics and filters them', async () => {
    render(
      <MemoryRouter>
        <HelpHub />
      </MemoryRouter>
    )

    expect(screen.getAllByText('Help Hub').length).toBeGreaterThan(0)
    expect(screen.getByText('AI Command Canvas')).toBeInTheDocument()

    await userEvent.type(screen.getByPlaceholderText('Search screens, epics, routes...'), 'vault')

    expect(screen.getByText('Secrets Vault')).toBeInTheDocument()
    expect(screen.queryByText('AI Command Canvas')).not.toBeInTheDocument()
  })
})
