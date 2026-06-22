import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('App', () => {
  it('renders the baseline shell status', () => {
    render(<App />)
    expect(screen.getByText('NeuroDeck OS')).toBeInTheDocument()
    expect(screen.getByText('Baseline scaffold — Epic 0')).toBeInTheDocument()
  })
})
