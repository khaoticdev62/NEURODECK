import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NdxDeckLayout } from '../NdxDeckLayout'

describe('NdxDeckLayout', () => {
  it('marks optional rails for responsive Deck-first CSS', () => {
    const { container } = render(
      <NdxDeckLayout left={<aside>Left tools</aside>} right={<aside>Right tools</aside>}>
        <main>Main surface</main>
      </NdxDeckLayout>
    )

    const grid = container.querySelector('.ndx-deck-grid')
    expect(grid).toHaveAttribute('data-left', 'true')
    expect(grid).toHaveAttribute('data-right', 'true')
    expect(screen.getByText('Main surface')).toBeInTheDocument()
    expect(screen.getByText('Left tools')).toBeInTheDocument()
    expect(screen.getByText('Right tools')).toBeInTheDocument()
  })
})
