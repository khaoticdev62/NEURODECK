/**
 * Provider health and routing contracts.
 * All types are plain data (no Node.js / Electron imports allowed here).
 */

import type { SupportedProvider } from './agent.contracts';

/** Health status returned by POST /api/test_llm_connection */
export interface ProviderHealth {
  status: 'healthy' | 'offline' | 'not_configured' | 'degraded';
  provider: string;
  model?: string;
  latency_ms?: number;
  error?: string;
}

/** Result of resolving which provider/model to use for a chat request.
 *  Used internally by the agent routing logic. */
export type ProviderRouteResult =
  | {
      ok: true;
      provider_id: SupportedProvider;
      model_id: string;
      /** Human-readable explanation of why this route was chosen. */
      reason: string;
      health: 'healthy' | 'degraded';
    }
  | {
      ok: false;
      status: 'not_configured' | 'offline' | 'missing_model' | 'missing_provider';
      /** Human-readable explanation shown in the UI. */
      reason: string;
      /** What the user should do to fix this. */
      user_action: string;
    };

/** Information about a model available on a provider. */
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  context_length?: number;
  supports_vision?: boolean;
  supports_tools?: boolean;
  is_local: boolean;
}
