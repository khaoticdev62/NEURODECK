/**
 * Session and message persistence contracts.
 * Mirrors the JSON format written to user_config_dir()/sessions/*.json
 * by src-tauri/src/commands/session.rs.
 * All types are plain data (no Node.js / Electron imports allowed here).
 */

export type MessageRole = 'user' | 'assistant' | 'system';

/** A single message persisted in a session file. */
export interface SessionMessage {
  role: MessageRole;
  /** Full message content. */
  content: string;
  /** ISO-8601 timestamp, e.g. "2026-06-11T14:30:00Z". */
  timestamp?: string;
}

/** A chat session as persisted on disk. */
export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: SessionMessage[];
  /** Agent active when this session was last saved. */
  active_agent_id?: string;
  active_provider?: string;
  active_model?: string;
}

/** List entry returned by POST /api/list_sessions */
export interface SessionListEntry {
  id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  message_count: number;
}

/** Response from POST /api/list_sessions */
export type ListSessionsResponse = SessionListEntry[];

/** Request for POST /api/rename_session */
export interface RenameSessionRequest {
  id: string;
  title: string;
}
