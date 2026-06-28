import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, ProfileState, UserProfile } from '@shared/contracts'
import { Profiles } from '../Profiles'

const owner: UserProfile = {
  id: 'owner',
  name: 'Owner',
  mode: 'owner',
  color: 'cyan',
  createdAt: 1,
  updatedAt: 1
}

const work: UserProfile = {
  id: 'work',
  name: 'Work',
  mode: 'work',
  color: 'blue',
  createdAt: 2,
  updatedAt: 2
}

const state: ProfileState = {
  profiles: [owner, work],
  session: {
    activeProfileId: 'owner',
    guestModeActive: false,
    privateModeActive: false,
    startedAt: 1
  }
}

function stubProfiles(overrides: Partial<NdxBridge['profiles']> = {}): void {
  window.ndx = {
    profiles: {
      getState: vi.fn().mockResolvedValue({ ok: true, data: state }),
      create: vi.fn().mockResolvedValue({ ok: true, data: work }),
      update: vi.fn(),
      remove: vi.fn().mockResolvedValue({ ok: true, data: state }),
      startSession: vi.fn().mockResolvedValue({
        ok: true,
        data: { ...state, session: { ...state.session, activeProfileId: 'work' } }
      }),
      endPrivateSession: vi.fn().mockResolvedValue({ ok: true, data: state }),
      ...overrides
    }
  } as Partial<NdxBridge> as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of preload global
  delete window.ndx
})

describe('Profiles', () => {
  it('renders active profile state and the scope boundary', async () => {
    stubProfiles()
    render(<Profiles />)

    expect(await screen.findByText('Profiles and Identity')).toBeInTheDocument()
    expect(screen.getByText('Owner (active)')).toBeInTheDocument()
    expect(screen.getByText(/does not migrate existing workspaces/)).toBeInTheDocument()
  })

  it('starts a private session through the typed bridge', async () => {
    const startSession = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        ...state,
        session: { ...state.session, activeProfileId: 'work', privateModeActive: true }
      }
    })
    stubProfiles({ startSession })
    const user = userEvent.setup()
    render(<Profiles />)

    await screen.findByText('Work')
    await user.click(screen.getAllByRole('button', { name: 'Private session' })[1])

    expect(startSession).toHaveBeenCalledWith({ id: 'work', privateMode: true })
  })

  it('creates a profile through IPC', async () => {
    const create = vi.fn().mockResolvedValue({ ok: true, data: work })
    stubProfiles({ create })
    const user = userEvent.setup()
    render(<Profiles />)

    await screen.findByText('Profiles and Identity')
    await user.click(screen.getByRole('button', { name: 'Add Profile' }))
    await user.type(screen.getByPlaceholderText('Profile name'), 'Lab')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(create).toHaveBeenCalledWith({ name: 'Lab', mode: 'work', color: 'cyan' })
  })
})
