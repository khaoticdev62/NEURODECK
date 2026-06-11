/**
 * Runtime type guards for chat pipeline contracts.
 * No external dependencies — follows the pattern of backendHealth.schemas.ts.
 */

import type {
  CommandTokenPayload,
  CommandDonePayload,
  CommandErrorPayload,
  RagSourceEntry,
  SendChatMessageRequest,
} from '../contracts/chat.contracts';
import type { AgentChangedPayload } from '../contracts/agent.contracts';

export function isCommandTokenPayload(v: unknown): v is CommandTokenPayload {
  return (
    typeof v === 'object' &&
    v !== null &&
    'token' in v &&
    typeof (v as Record<string, unknown>).token === 'string'
  );
}

export function isCommandDonePayload(v: unknown): v is CommandDonePayload {
  return (
    typeof v === 'object' &&
    v !== null &&
    'status' in v &&
    (v as Record<string, unknown>).status === 'complete'
  );
}

export function isCommandErrorPayload(v: unknown): v is CommandErrorPayload {
  return (
    typeof v === 'object' &&
    v !== null &&
    'error' in v &&
    typeof (v as Record<string, unknown>).error === 'string'
  );
}

export function isRagSourceEntry(v: unknown): v is RagSourceEntry {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.title === 'string' &&
    typeof r.content_snippet === 'string' &&
    typeof r.role === 'string'
  );
}

export function isAgentChangedPayload(v: unknown): v is AgentChangedPayload {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    typeof r.provider === 'string' &&
    typeof r.model === 'string'
  );
}

export function isSendChatMessageRequest(v: unknown): v is SendChatMessageRequest {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  if (typeof r.message !== 'string' || r.message.trim() === '') return false;
  if ('agent_id' in r && typeof r.agent_id !== 'string') return false;
  if ('image_base64' in r && typeof r.image_base64 !== 'string') return false;
  if ('pack_id' in r && typeof r.pack_id !== 'string') return false;
  return true;
}

/**
 * Throws if the chat response payload has `realData: false`, which would
 * indicate mock data slipped into the production pipeline.
 */
export function assertRealChatResponse(payload: unknown, context: string): void {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'realData' in payload &&
    (payload as Record<string, unknown>).realData === false
  ) {
    throw new Error(
      `[chat.schemas] Mock data violation in ${context}: realData is false. ` +
        'This must not reach the production chat pipeline.'
    );
  }
}
