import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { NdxTvCard } from '../NdxTvCard'

function renderCard(props: Partial<React.ComponentProps<typeof NdxTvCard>> = {}): {
  onActivate: ReturnType<typeof vi.fn>
} {
  const onActivate = vi.fn()
  render(
    <FocusEngineProvider adapters={[new TestAdapter()]}>
      <NdxTvCard
        id="card-1"
        groupId="test-shelf"
        title="Terminal"
        subtitle="/home/deck/project"
        onActivate={onActivate}
        {...props}
      />
    </FocusEngineProvider>
  )
  return { onActivate }
}

describe('NdxTvCard', () => {
  it('renders its title and subtitle', () => {
    renderCard()
    expect(screen.getByText('Terminal')).toBeInTheDocument()
    expect(screen.getByText('/home/deck/project')).toBeInTheDocument()
  })

  it('fires onActivate when clicked', async () => {
    const user = userEvent.setup()
    const { onActivate } = renderCard()

    await user.click(screen.getByRole('button', { name: /Terminal/ }))

    expect(onActivate).toHaveBeenCalledTimes(1)
  })

  it('disables the card when disabled is set', () => {
    renderCard({ disabled: true })
    expect(screen.getByRole('button', { name: /Terminal/ })).toBeDisabled()
  })
})
