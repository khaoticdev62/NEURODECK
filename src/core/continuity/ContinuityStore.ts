import { randomUUID } from 'node:crypto'
import type {
  ContinuityPowerEvent,
  ContinuityState,
  RecordPowerEventRequest,
  SaveSessionSnapshotRequest
} from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

const MAX_POWER_EVENTS = 100

const DEFAULT_STATE: ContinuityState = {
  safeModeActive: false,
  offlineQueue: [],
  powerEvents: [],
  sessionSnapshot: null
}

/**
 * Real Epic X11 continuity foundation. It persists app-level continuity
 * signals and queue inventory. Existing feature owners still need to enqueue
 * their own offline work explicitly; this store does not fake pending work.
 */
export class ContinuityStore {
  private readonly store: JsonStore<ContinuityState>

  constructor(
    filePath: string,
    private readonly now: () => number = () => Date.now(),
    private readonly generateId: () => string = () => randomUUID()
  ) {
    this.store = new JsonStore(filePath, DEFAULT_STATE)
  }

  async getState(): Promise<ContinuityState> {
    return this.store.read()
  }

  async setSafeMode(active: boolean): Promise<ContinuityState> {
    const state = await this.getState()
    const next = { ...state, safeModeActive: active }
    await this.store.write(next)
    return next
  }

  async recordPowerEvent(request: RecordPowerEventRequest): Promise<ContinuityPowerEvent> {
    const state = await this.getState()
    const event: ContinuityPowerEvent = {
      id: this.generateId(),
      kind: request.kind,
      occurredAt: this.now()
    }
    await this.store.write({
      ...state,
      powerEvents: [...state.powerEvents, event].slice(-MAX_POWER_EVENTS)
    })
    return event
  }

  async saveSessionSnapshot(request: SaveSessionSnapshotRequest): Promise<ContinuityState> {
    const state = await this.getState()
    const next: ContinuityState = {
      ...state,
      sessionSnapshot: { route: request.route, capturedAt: this.now() }
    }
    await this.store.write(next)
    return next
  }
}
