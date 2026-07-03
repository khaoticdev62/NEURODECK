import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NdxTvShelf } from '../NdxTvShelf'

describe('NdxTvShelf', () => {
  it('renders a title, optional subtitle, action, and its children', () => {
    render(
      <NdxTvShelf
        title="Workspaces"
        subtitle="Controller-ready project targets"
        action={<button>Manage</button>}
      >
        <p>Card one</p>
        <p>Card two</p>
      </NdxTvShelf>
    )

    expect(screen.getByText('Workspaces')).toBeInTheDocument()
    expect(screen.getByText('Controller-ready project targets')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage' })).toBeInTheDocument()
    expect(screen.getByText('Card one')).toBeInTheDocument()
    expect(screen.getByText('Card two')).toBeInTheDocument()
  })

  it('renders without a subtitle or action', () => {
    render(
      <NdxTvShelf title="Next actions">
        <p>Card one</p>
      </NdxTvShelf>
    )

    expect(screen.getByText('Next actions')).toBeInTheDocument()
    expect(screen.getByText('Card one')).toBeInTheDocument()
  })
})
