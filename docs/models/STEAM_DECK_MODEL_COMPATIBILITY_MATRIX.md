# NEURODECK Steam Deck Model Compatibility Matrix

## 1. Compatibility Tiers

| Tier | Description |
|---|---|
| `deck_default` | Safe default local models (≤3B, Q4/Q5). Fast, low battery/thermal. |
| `deck_balanced` | Better reasoning/coding (3B–4B, Q4/Q5). Acceptable local usage. |
| `deck_heavy` | Capable but costly (7B–8B, Q4). Requires explicit opt-in. |
| `remote_or_docked_only` | Too large for reliable Deck local use (12B+). Remote/docked only. |
| `unsupported` | Known to cause OOM/crash/thermal issues. |
| `unknown` | Insufficient data; requires verification. |

## 2. deck_default Models

| Model | Family | Parameters | Quantization | Notes |
|---|---|---|---|---|
| `llama3.2:1b` | Llama | 1B | Q4_K_M | Fast general chat |
| `llama3.2:3b` | Llama | 3B | Q4_K_M | Balanced default |
| `gemma3:1b` | Gemma | 1B | Q4_K_M | Google small model |
| `gemma3n:e2b` | Gemma | 2B | Q4_K_M | Efficient edge variant |
| `qwen3:0.6b` | Qwen | 0.6B | Q4_K_M | Tiny, very fast |
| `qwen3:1.7b` | Qwen | 1.7B | Q4_K_M | Fast coding/chat |
| `qwen2.5-coder:0.5b` | Qwen Coder | 0.5B | Q4_K_M | Tiny code helper |
| `qwen2.5-coder:1.5b` | Qwen Coder | 1.5B | Q4_K_M | Lightweight coding |
| `deepseek-r1:1.5b` | DeepSeek | 1.5B | Q4_K_M | Small reasoning |

## 3. deck_balanced Models

| Model | Family | Parameters | Quantization | Notes |
|---|---|---|---|---|
| `gemma3:4b` | Gemma | 4B | Q4_K_M | Strong edge reasoning |
| `gemma3n:e4b` | Gemma | 4B | Q4_K_M | Efficient 4B |
| `qwen3:4b` | Qwen | 4B | Q4_K_M | Good coding/chat |
| `qwen2.5-coder:3b` | Qwen Coder | 3B | Q4_K_M | Better code |
| `phi4-mini:3.8b` | Phi | 3.8B | Q4_K_M | Microsoft compact |
| `phi4-mini-reasoning:3.8b` | Phi | 3.8B | Q4_K_M | Reasoning variant |

## 4. deck_heavy Models

| Model | Family | Parameters | Quantization | Notes |
|---|---|---|---|---|
| `qwen3:8b` | Qwen | 8B | Q4_K_M | Requires opt-in |
| `qwen2.5-coder:7b` | Qwen Coder | 7B | Q4_K_M | Heavy coding |
| `deepseek-r1:7b` | DeepSeek | 7B | Q4_K_M | Heavy reasoning |
| `deepseek-r1:8b` | DeepSeek | 8B | Q4_K_M | Heavy reasoning |
| `mistral:7b` | Mistral | 7B | Q4_K_M | General heavy |
| `llama3:8b` | Llama | 8B | Q4_K_M | General heavy |

## 5. remote_or_docked_only Models

| Model | Family | Parameters | Notes |
|---|---|---|---|
| `gemma3:12b` | Gemma | 12B | Exceeds Deck local budget |
| `gemma3:27b` | Gemma | 27B | Exceeds Deck local budget |
| `qwen3:14b` | Qwen | 14B | Exceeds Deck local budget |
| `qwen3:30b` | Qwen | 30B | Exceeds Deck local budget |
| `qwen3:32b` | Qwen | 32B | Exceeds Deck local budget |
| `qwen3:235b` | Qwen | 235B | Exceeds Deck local budget |
| `qwen2.5-coder:14b` | Qwen Coder | 14B | Exceeds Deck local budget |
| `qwen2.5-coder:32b` | Qwen Coder | 32B | Exceeds Deck local budget |
| `deepseek-r1:14b` | DeepSeek | 14B | Exceeds Deck local budget |
| `deepseek-r1:32b` | DeepSeek | 32B | Exceeds Deck local budget |
| `deepseek-r1:70b` | DeepSeek | 70B | Exceeds Deck local budget |
| `deepseek-r1:671b` | DeepSeek | 671B | Exceeds Deck local budget |
| `llama3:70b` | Llama | 70B | Exceeds Deck local budget |

## 6. Scoring Inputs

| Input | Weight | Source |
|---|---|---|
| Parameter class | High | Parsed from model ID or registry |
| Quantization | Medium | Discovered or registry |
| Context window | Medium | Registry or runtime |
| File size | Medium | Provider runtime |
| Runtime type | High | Provider configuration |
| Local vs remote | High | Provider configuration |
| Host memory | Medium | `get_system_health` |
| User performance profile | Medium | Settings |
| Recent OOM/crash history | High | Recovery event store |

## 7. Default Policies

- `deck_default`: allow autoload.
- `deck_balanced`: allow if user setting `allowBalancedModels` is true.
- `deck_heavy`: require `allowHeavyModels` opt-in.
- `remote_or_docked_only`: do not local autoload; allow remote if user enabled `allowRemoteFallback`.
- `unsupported`: block.
- `unknown`: require verification probe.
