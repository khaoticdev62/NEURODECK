export interface FieldStatus<T> {
  available: boolean
  value?: T
}

export interface SystemRailStatus {
  workspace: FieldStatus<string>
  profile: FieldStatus<string>
  model: FieldStatus<string>
  connection: FieldStatus<'online' | 'offline'>
  vpn: FieldStatus<'connected' | 'disconnected'>
  battery: FieldStatus<{ percent: number; charging: boolean }>
  agentActivity: FieldStatus<'idle' | 'active'>
}

/** Honest "no backing service yet" status — real data is wired in by the epics that own each field. */
export const UNAVAILABLE_SYSTEM_RAIL_STATUS: SystemRailStatus = {
  workspace: { available: false },
  profile: { available: false },
  model: { available: false },
  connection: { available: false },
  vpn: { available: false },
  battery: { available: false },
  agentActivity: { available: false }
}
