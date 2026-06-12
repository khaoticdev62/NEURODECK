# NEURODECK Chat Readiness Report

**Generated:** 2026-06-12T21:56:19.889Z  
**Score:** 100%  
**Gate:** ✅ PASSED

## Summary

| Area | Status | Notes |
|---|---|---|
| Chat Pipeline | ✅ Pass | verify-ai-chat.ts |
| Agent Selection | ✅ Pass | verify-agent-selection.ts |
| No Mock Data | ✅ Pass | 0 violations |
| Security | ✅ Pass | 0 critical findings |

## Predefined Agents

| ID | Name | Provider | Model |
|---|---|---|---|
| gemini-flash-lite | Flash Lite | gemini | gemini-2.0-flash-lite |
| gemini-flash | Flash | gemini | gemini-2.0-flash |
| gemini-pro | Pro | gemini | gemini-1.5-pro |
| hf-llama-1b | HF Llama 1B | huggingface | meta-llama/Llama-3.2-1B-Instruct |
| hf-zephyr-7b | HF Zephyr 7B | huggingface | HuggingFaceH4/zephyr-7b-beta |
| local-gemma2b | Gemma 2B | ollama | gemma2:2b |
| local-llama1b | Llama 1B | ollama | llama3.2:1b |
| local-phi35 | Phi 3.5 Mini | ollama | phi3.5:mini |
| local-hermes3 | Hermes 3 | ollama | hermes3:8b |

## How to Re-run

```bash
npm run verify:ai-chat
npm run verify:agent-selection
npm run verify:no-mock-chat
npm run verify:chat-security
npm run report:chat
```

> Source of truth: `src-tauri/src/providers.rs` default_agents() + `src-tauri/src/commands/mod.rs` send_command arm.