import { randomUUID } from 'node:crypto'
import type {
  CreateProfileRequest,
  OperatingMode,
  ProfileState,
  StartProfileSessionRequest,
  UpdateProfileRequest,
  UserProfile
} from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

interface StoredProfileState {
  profiles: UserProfile[]
  session: {
    activeProfileId: string
    guestModeActive: boolean
    privateModeActive: boolean
    startedAt: number
  }
}

export class ProfileNotFoundError extends Error {}

function createDefaultState(now: number): StoredProfileState {
  const profile: UserProfile = {
    id: 'owner',
    name: 'Owner',
    mode: 'owner',
    color: 'cyan',
    createdAt: now,
    updatedAt: now
  }
  return {
    profiles: [profile],
    session: {
      activeProfileId: profile.id,
      guestModeActive: false,
      privateModeActive: false,
      startedAt: now
    }
  }
}

/**
 * Real Epic X10 profile foundation. This store owns profile metadata and
 * active guest/private session state only. It deliberately does not claim
 * that every existing settings/workspace/memory store is profile-scoped yet.
 */
export class ProfileStore {
  private readonly store: JsonStore<StoredProfileState>

  constructor(
    filePath: string,
    private readonly now: () => number = () => Date.now(),
    private readonly generateId: () => string = () => randomUUID()
  ) {
    this.store = new JsonStore(filePath, createDefaultState(this.now()))
  }

  async getState(): Promise<ProfileState> {
    return this.normalize(await this.store.read())
  }

  async create(request: CreateProfileRequest): Promise<UserProfile> {
    const state = await this.getState()
    const now = this.now()
    const profile: UserProfile = {
      id: this.generateId(),
      name: request.name.trim(),
      mode: request.mode,
      color: request.color,
      createdAt: now,
      updatedAt: now
    }
    await this.store.write({ ...state, profiles: [...state.profiles, profile] })
    return profile
  }

  async update(request: UpdateProfileRequest): Promise<UserProfile> {
    const state = await this.getState()
    const existing = state.profiles.find((profile) => profile.id === request.id)
    if (!existing) throw new ProfileNotFoundError('That profile does not exist.')
    const updated: UserProfile = {
      ...existing,
      name: request.name?.trim() ?? existing.name,
      mode: request.mode ?? existing.mode,
      color: request.color ?? existing.color,
      updatedAt: this.now()
    }
    await this.store.write({
      ...state,
      profiles: state.profiles.map((profile) => (profile.id === updated.id ? updated : profile))
    })
    return updated
  }

  async remove(id: string): Promise<ProfileState> {
    const state = await this.getState()
    const profile = state.profiles.find((candidate) => candidate.id === id)
    if (!profile) throw new ProfileNotFoundError('That profile does not exist.')
    if (profile.mode === 'owner') throw new Error('The owner profile cannot be removed.')
    const profiles = state.profiles.filter((candidate) => candidate.id !== id)
    const fallback = profiles.find((candidate) => candidate.mode === 'owner') ?? profiles[0]
    const session =
      state.session.activeProfileId === id
        ? {
            activeProfileId: fallback.id,
            guestModeActive: fallback.mode === 'guest',
            privateModeActive: false,
            startedAt: this.now()
          }
        : state.session
    const next = { profiles, session }
    await this.store.write(next)
    return next
  }

  async startSession(request: StartProfileSessionRequest): Promise<ProfileState> {
    const state = await this.getState()
    const profile = state.profiles.find((candidate) => candidate.id === request.id)
    if (!profile) throw new ProfileNotFoundError('That profile does not exist.')
    const next: ProfileState = {
      profiles: state.profiles,
      session: {
        activeProfileId: profile.id,
        guestModeActive: profile.mode === 'guest',
        privateModeActive: request.privateMode || profile.mode === 'private',
        startedAt: this.now()
      }
    }
    await this.store.write(next)
    return next
  }

  async endPrivateSession(): Promise<ProfileState> {
    const state = await this.getState()
    const active = this.activeProfile(state)
    const next: ProfileState = {
      profiles: state.profiles,
      session: {
        ...state.session,
        guestModeActive: active.mode === 'guest',
        privateModeActive: false,
        startedAt: this.now()
      }
    }
    await this.store.write(next)
    return next
  }

  private normalize(state: StoredProfileState): ProfileState {
    if (state.profiles.length === 0) return createDefaultState(this.now())
    const active = state.profiles.find((profile) => profile.id === state.session.activeProfileId)
    if (active) return state
    return {
      profiles: state.profiles,
      session: {
        activeProfileId: state.profiles[0].id,
        guestModeActive: state.profiles[0].mode === 'guest',
        privateModeActive: state.profiles[0].mode === 'private',
        startedAt: this.now()
      }
    }
  }

  private activeProfile(state: ProfileState): UserProfile {
    return (
      state.profiles.find((profile) => profile.id === state.session.activeProfileId) ??
      state.profiles[0]
    )
  }
}

export function profileModeLabel(mode: OperatingMode): string {
  return mode[0].toUpperCase() + mode.slice(1)
}
