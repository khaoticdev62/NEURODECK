/**
 * Static mirror of the predefined agents from src-tauri/src/providers.rs
 * default_agents(). Provides instant agent info to the frontend without
 * a round-trip API call.
 *
 * SYNC CONTRACT: If you add, remove, or modify an agent in providers.rs
 * default_agents(), update this file to match. The Rust registry is
 * authoritative — this is a read-only display cache.
 */

import type { NeurodeckAgent, SupportedProvider } from '../contracts/agent.contracts';

const OLLAMA_URL = 'http://localhost:11434';
const HF_URL = 'https://api-inference.huggingface.co';

/** Predefined agents seeded into new installs by providers::default_agents(). */
export const PREDEFINED_AGENTS: NeurodeckAgent[] = [
  {
    id: 'gemini-flash-lite',
    name: 'Flash Lite',
    provider: 'gemini',
    model: 'gemini-2.0-flash-lite',
    base_url: '',
    embed_model: '',
    description: 'Fastest cloud model — best for quick chat and low-latency tasks.',
  },
  {
    id: 'gemini-flash',
    name: 'Flash',
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    base_url: '',
    embed_model: '',
    description: 'Best all-around cloud model — code, analysis, multi-step reasoning.',
  },
  {
    id: 'gemini-pro',
    name: 'Pro',
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    base_url: '',
    embed_model: '',
    description: 'Highest intelligence — complex research, long context (1M tokens).',
  },
  {
    id: 'hf-llama-1b',
    name: 'HF Llama 1B',
    provider: 'huggingface',
    model: 'meta-llama/Llama-3.2-1B-Instruct',
    base_url: HF_URL,
    embed_model: '',
    description: 'Lightweight open model via Hugging Face Inference API. Fast and free-tier friendly.',
  },
  {
    id: 'hf-zephyr-7b',
    name: 'HF Zephyr 7B',
    provider: 'huggingface',
    model: 'HuggingFaceH4/zephyr-7b-beta',
    base_url: HF_URL,
    embed_model: '',
    description: 'High-quality chat model via Hugging Face. Strong reasoning and instruction following.',
  },
  {
    id: 'local-gemma2b',
    name: 'Gemma 2B',
    provider: 'ollama',
    model: 'gemma2:2b',
    base_url: OLLAMA_URL,
    embed_model: '',
    description: 'Best quality-per-RAM local model. ~20-30 tok/s on Steam Deck. Offline.',
  },
  {
    id: 'local-llama1b',
    name: 'Llama 1B',
    provider: 'ollama',
    model: 'llama3.2:1b',
    base_url: OLLAMA_URL,
    embed_model: '',
    description: 'Ultra-fast local. ~50 tok/s on Steam Deck. Basic tasks. Offline.',
  },
  {
    id: 'local-phi35',
    name: 'Phi 3.5 Mini',
    provider: 'ollama',
    model: 'phi3.5:mini',
    base_url: OLLAMA_URL,
    embed_model: '',
    description: 'Microsoft compact reasoning model. Strong for code. Offline.',
  },
  {
    id: 'local-hermes3',
    name: 'Hermes 3',
    provider: 'ollama',
    model: 'hermes3:8b',
    base_url: OLLAMA_URL,
    embed_model: '',
    description: 'Advanced reasoning model by Nous Research. Excellent for complex multi-turn chats. Offline.',
  },
];

/** Find a predefined agent by ID without an API round-trip.
 *  Returns undefined if the ID is not in the predefined list (e.g. user-added agent). */
export function findPredefinedAgent(id: string): NeurodeckAgent | undefined {
  return PREDEFINED_AGENTS.find((a) => a.id === id);
}

/** Human-readable label for a provider ID. */
export function getProviderLabel(provider: string): string {
  const labels: Record<string, string> = {
    gemini: 'Gemini',
    ollama: 'Ollama (Local)',
    huggingface: 'HuggingFace',
    kimi: 'Kimi / Moonshot',
    openai_compat: 'OpenAI-Compatible',
  };
  return labels[provider] ?? provider;
}

/** Returns true if the provider requires an active internet connection. */
export function isCloudProvider(provider: string): boolean {
  return ['gemini', 'huggingface', 'kimi', 'openai_compat'].includes(provider);
}

/** Returns true if the provider runs locally (no internet required). */
export function isLocalProvider(provider: string): boolean {
  return provider === 'ollama';
}

/** Group label for display in the agent selector UI. */
export function getAgentGroupLabel(provider: string): 'Cloud' | 'Local' | 'Custom' {
  if (isCloudProvider(provider)) return 'Cloud';
  if (isLocalProvider(provider)) return 'Local';
  return 'Custom';
}

export type { NeurodeckAgent, SupportedProvider };
