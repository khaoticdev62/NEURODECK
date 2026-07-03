import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NdxMeter } from '../NdxMeter'

function fillBar(label: string): Element {
  const meter = screen.getByRole('meter', { name: label })
  const fill = meter.firstElementChild
  if (!fill) throw new Error(`Expected ${label} meter to render a fill bar`)
  return fill
}

describe('NdxMeter', () => {
  it('renders the label and a computed NN.N% readout by default', () => {
    render(<NdxMeter label="RAM" percent={42} />)

    expect(screen.getByText('RAM')).toBeInTheDocument()
    expect(screen.getByText('42.0%')).toBeInTheDocument()
  })

  it('clamps an out-of-range percent for both the readout and aria-valuenow', () => {
    const { rerender } = render(<NdxMeter label="RAM" percent={150} />)
    expect(screen.getByText('100.0%')).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'RAM' })).toHaveAttribute('aria-valuenow', '100')

    rerender(<NdxMeter label="RAM" percent={-10} />)
    expect(screen.getByText('0.0%')).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'RAM' })).toHaveAttribute('aria-valuenow', '0')
  })

  it('uses the accent tone below the warning threshold', () => {
    render(<NdxMeter label="RAM" percent={74} />)

    expect(fillBar('RAM').className).toContain('bg-[var(--ndx-accent)]')
  })

  it('uses the warning tone at and above 75%', () => {
    render(<NdxMeter label="RAM" percent={75} />)

    expect(fillBar('RAM').className).toContain('bg-status-warning')
  })

  it('uses the error tone at and above 90%', () => {
    render(<NdxMeter label="RAM" percent={90} />)

    expect(fillBar('RAM').className).toContain('bg-status-error')
  })

  it('lets an explicit displayValue override the computed percentage text', () => {
    render(<NdxMeter label="RAM" percent={42} displayValue="24GB / 32GB" />)

    expect(screen.getByText('24GB / 32GB')).toBeInTheDocument()
    expect(screen.queryByText('42.0%')).not.toBeInTheDocument()
  })

  it('lets an explicit tone override the usage-derived tone', () => {
    render(<NdxMeter label="RAM" percent={95} tone="secondary" />)

    expect(fillBar('RAM').className).toContain('bg-[var(--color-secondary)]')
    expect(fillBar('RAM').className).not.toContain('bg-status-error')
  })

  it('exposes correct meter accessibility attributes', () => {
    render(<NdxMeter label="RAM" percent={42} />)

    const meter = screen.getByRole('meter', { name: 'RAM' })
    expect(meter).toHaveAttribute('aria-valuenow', '42')
    expect(meter).toHaveAttribute('aria-valuemin', '0')
    expect(meter).toHaveAttribute('aria-valuemax', '100')
  })
})
