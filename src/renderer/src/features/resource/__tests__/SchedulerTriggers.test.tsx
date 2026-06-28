import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SchedulerTriggers } from '../SchedulerTriggers'

describe('SchedulerTriggers', () => {
  it('renders trigger types and scheduler requirements', () => {
    render(<SchedulerTriggers />)

    expect(screen.getByText('Scheduler and Triggers')).toBeInTheDocument()
    expect(screen.getByText('Workspace open')).toBeInTheDocument()
    expect(screen.getByText('Resume from sleep')).toBeInTheDocument()
    expect(screen.getByText('Persistent schedules')).toBeInTheDocument()
    expect(screen.getByText(/may not inherit broad permissions silently/)).toBeInTheDocument()
  })

  it('refreshes the local health timestamp', async () => {
    const user = userEvent.setup()
    render(<SchedulerTriggers />)

    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(screen.getByText('Scheduler health')).toBeInTheDocument()
  })
})
