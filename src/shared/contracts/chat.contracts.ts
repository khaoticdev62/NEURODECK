/**
 * Chat pipeline contracts — mirrors the wire format of the Rust sidecar's
 * "send_command" dispatch arm in src-tauri/src/commands/mod.rs.
 * All types are plain data (no Node.js / Electron imports allowed here).
 */

/** What the frontend sends to POST /api/send_command */
export interface SendChatMessageRequest {
  /** The user's prompt text. Required. */
  message: string;
  /** Optional: route this request to a specific agent's provider without
   *  changing the globally active agent. Must match an AgentConfig.id. */
  agent_id?: string;
  /** Base64-encoded image for vision requests (Gemini provider only). */
  image_base64?: string;
  /** MIME type of the image, e.g. "image/png". Defaults to "image/png". */
  image_mime?: string;
  /** Scope RAG retrieval to a specific context pack ID. */
  pack_id?: string;
}

/** Immediate HTTP response body from POST /api/send_command.
 *  The actual LLM response arrives asynchronously via WebSocket events. */
export interface SendChatMessageHttpResponse {
  status: 'streaming';
  message: string;
}

/** Payload of the `command_token` WebSocket event — a streaming text delta. */
export interface CommandTokenPayload {
  token: string;
}

/** Payload of the `command_done` WebSocket event — stream is complete. */
export interface CommandDonePayload {
  status: 'complete';
}

/** Payload of the `command_error` WebSocket event — stream failed. */
export interface CommandErrorPayload {
  error: string;
}

/** One result entry in the `rag_sources` WebSocket event payload. */
export interface RagSourceEntry {
  id: string;
  title: string;
  content_snippet: string;
  role: string;
}

/** Payload of the `rag_sources` WebSocket event — context records injected
 *  into the LLM prompt for this request. Empty array if RAG found nothing. */
export type RagSourcesPayload = RagSourceEntry[];

/** Union of all WebSocket event payloads emitted during a chat request. */
export type ChatStreamEvent =
  | { event: 'command_token'; payload: CommandTokenPayload }
  | { event: 'command_done'; payload: CommandDonePayload }
  | { event: 'command_error'; payload: CommandErrorPayload }
  | { event: 'rag_sources'; payload: RagSourcesPayload };
