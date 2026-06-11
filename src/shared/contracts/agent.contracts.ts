/**
 * Agent contracts — mirrors the Rust AgentConfig struct in
 * src-tauri/src/config.rs and the wire format of list_agents, switch_agent,
 * add_agent, delete_agent, get_active_agent_id, and the agent_changed
 * WebSocket event in src-tauri/src/commands/mod.rs.
 * All types are plain data (no Node.js / Electron imports allowed here).
 */

/** Supported provider identifiers. Must match the Rust match arms in
 *  src-tauri/src/providers.rs provider_from_agent(). */
export type SupportedProvider =
  | 'gemini'
  | 'ollama'
  | 'huggingface'
  | 'kimi'
  | 'openai_compat';

/** Wire representation of a registered agent.
 *  Mirrors AgentConfig in src-tauri/src/config.rs. */
export interface NeurodeckAgent {
  id: string;
  name: string;
  /** LLM provider identifier. See SupportedProvider. */
  provider: string;
  model: string;
  /** Base URL for local providers (Ollama, OpenAI-compat, Kimi).
   *  Empty string for Gemini and HuggingFace (they use fixed endpoints). */
  base_url: string;
  embed_model: string;
  description: string;
}

/** Response body from POST /api/list_agents */
export type ListAgentsResponse = NeurodeckAgent[];

/** Response body from POST /api/get_active_agent_id */
export interface GetActiveAgentIdResponse {
  active_agent_id: string;
}

/** Response body from POST /api/switch_agent */
export interface SwitchAgentResponse {
  status: 'switched';
  id: string;
  name: string;
  provider: string;
  model: string;
}

/** Request body for POST /api/add_agent.
 *  Frontend wraps this in { agent: AddAgentRequest } — both shapes accepted. */
export interface AddAgentRequest {
  name: string;
  model: string;
  provider?: SupportedProvider;
  base_url?: string;
  embed_model?: string;
  description?: string;
}

/** Response body from POST /api/add_agent */
export interface AddAgentResponse {
  status: 'added';
  id: string;
  name: string;
}

/** Response body from POST /api/delete_agent */
export interface DeleteAgentResponse {
  status: 'deleted';
  id: string;
}

/** Payload of the `agent_changed` WebSocket event.
 *  Emitted by the sidecar after switch_agent completes.
 *  main.js listens for this to update the model name badge. */
export interface AgentChangedPayload {
  id: string;
  name: string;
  provider: string;
  model: string;
}
