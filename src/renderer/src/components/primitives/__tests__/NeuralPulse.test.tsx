import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NeuralPulse } from '../NeuralPulse'

describe('NeuralPulse', () => {
  it('defaults to an idle state with an accessible status label', () => {
    render(<NeuralPulse />)

    expect(screen.getByRole('status', { name: 'AI idle' })).toBeInTheDocument()
  })

  it('reflects the streaming state in its accessible name', () => {
    render(<NeuralPulse state="streaming" />)

    expect(screen.getByRole('status', { name: 'AI streaming a reply' })).toBeInTheDocument()
  })

  it('accepts a custom label override', () => {
    render(<NeuralPulse state="analyzing" label="Reviewing your request" />)

    expect(screen.getByRole('status', { name: 'Reviewing your request' })).toBeInTheDocument()
  })
})
