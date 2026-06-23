import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('App', () => {
  it('renders the shell with the home route active', () => {
    render(<App />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByText('Create or discover a workspace')).toBeInTheDocument()
  })

  it('renders a real, distinguishable icon for every primary nav destination', () => {
    // Regression guard: the nav rail previously rendered the exact same
    // generic placeholder dot for every destination (no icon library, no
    // per-destination glyph), making the collapsed (icon-only) rail
    // genuinely unusable. Each destination must render its own real <svg>.
    render(<App />)
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    const icons = nav.querySelectorAll('svg')
    const links = nav.querySelectorAll('a')
    const distinctIconShapes = new Set(Array.from(icons).map((icon) => icon.innerHTML))
    expect(icons.length).toBe(links.length)
    expect(icons.length).toBeGreaterThan(0)
    expect(distinctIconShapes.size).toBe(icons.length)
  })

  it('navigates between primary destinations', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('link', { name: /AI/i }))

    // AICommandCanvas (ND-013) is real now and requires an active workspace,
    // same as every other workspace-scoped screen — with none active here,
    // its honest empty state is what should render, not a fabricated title.
    expect(screen.getByText('No active workspace')).toBeInTheDocument()
  })
})
