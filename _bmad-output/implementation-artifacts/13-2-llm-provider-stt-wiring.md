# Story 13.2: Wire Whisper/provider-native STT into Ollama, Hugging Face, Kimi, and OpenAI-compatible providers

Status: pending

## Story

As a User using a non-Gemini LLM provider,
I want voice transcription (STT) to actually work,
so that I am not blocked from using voice input just because I'm not on the Gemini provider.

## Acceptance Criteria

1. `OllamaProvider::transcribe_audio` (`src-tauri/src/llm.rs` ~line 664) no longer returns `Err("Audio transcription not supported by Ollama provider")` — it routes the supplied audio through the existing local Whisper.cpp path (`src-tauri/src/whisper.rs::transcribe`).
2. `HuggingFaceProvider::transcribe_audio` (~line 948) no longer returns a hardcoded "not supported" error — it routes through local Whisper.cpp, OR (if a Hugging Face Inference API STT model is configured) calls the HF Inference API audio-classification/ASR endpoint.
3. `KimiProvider::transcribe_audio` (~line 1315) no longer returns a hardcoded "not supported" error — it routes through local Whisper.cpp.
4. `OpenAiCompatibleProvider::transcribe_audio` (~line 1712) no longer returns a hardcoded "not supported" error — it prefers calling the provider's native `/audio/transcriptions` (Whisper-API-compatible) endpoint when the configured base URL supports it, falling back to local Whisper.cpp otherwise.
5. All four implementations accept the same `&[u8]` raw audio buffer signature already defined by the `LlmProvider` trait — no trait signature changes.
6. If local Whisper.cpp is selected as the fallback and no model is configured/downloaded, the error message returned matches the existing user-facing guidance pattern already used in `commands/system.rs::transcribe_audio_whisper` ("Whisper model path not set. Go to Settings → Voice...") rather than a generic "not supported" message.
7. No provider silently returns mock/fake transcribed text — every success path must be backed by an actual Whisper.cpp invocation or a genuine provider API call.

## Tasks / Subtasks

- [ ] Read `src-tauri/src/whisper.rs::transcribe(wav_path: &str, binary_path: &str, model_path: &str) -> Result<String, String>` and `src-tauri/src/commands/system.rs::transcribe_audio_whisper` to understand the existing working call pattern (binary path + model path sourced from `AppState.whisper_binary` / `AppState.whisper_model`).
- [ ] Determine how to get `&[u8]` audio bytes (as received by the trait method) into a temp `.wav` file, since `whisper::transcribe` takes a file path, not raw bytes — likely write to `user_config_dir().join("temp_provider_stt.wav")` before invoking.
- [ ] Determine how each provider implementation gets access to `AppState` (whisper binary/model paths) given the `LlmProvider` trait's current method signature — may require passing `Arc<Mutex<AppState>>` through provider construction, or reading from a shared config struct already available to providers.
- [ ] `OllamaProvider`: implement `transcribe_audio` to write bytes to temp WAV, call `whisper::transcribe`, clean up temp file, return the transcript.
- [ ] `HuggingFaceProvider`: implement `transcribe_audio` — decide (see Dev Notes open question) between local Whisper-only vs. also supporting an HF-hosted ASR model via `self.base_url`/`self.get_api_key()`.
- [ ] `KimiProvider`: implement `transcribe_audio` to write bytes to temp WAV, call `whisper::transcribe`, clean up temp file, return the transcript.
- [ ] `OpenAiCompatibleProvider`: implement `transcribe_audio` to first attempt `POST {base_url}/audio/transcriptions` (multipart, Whisper-API-compatible — this is the de facto standard for OpenAI-compatible servers like LM Studio, llama.cpp server, etc.), falling back to local Whisper.cpp on 404/unsupported.
- [ ] Update each provider's error message to match the existing Whisper "model not configured" guidance pattern when local Whisper is the fallback and is unconfigured.
- [ ] Update `CLAUDE.md` line 168 (currently states "The STT path does NOT currently use Whisper or any AI model") once at least the local-Whisper fallback path is implemented for all four providers.
- [ ] Manual verification: switch active provider to Ollama, Hugging Face, Kimi, and an OpenAI-compatible endpoint in turn; trigger voice input each time; confirm real transcribed text is returned (not an error) when a Whisper model is configured.

## Dev Notes

- Local Whisper.cpp integration already exists and works for the *default* STT path (`commands/system.rs::transcribe_audio_whisper`, gated by `AppState.whisper_model`/`whisper_binary`, surfaced in Settings → Voice per `ANTIGRAVITY_HANDOFF.md`'s "Whisper.cpp STT (C17)" line). This story is primarily about **routing the per-provider trait method to that existing working path**, not building new STT infrastructure from scratch.
- OPEN QUESTION (needs product decision): should Hugging Face's `transcribe_audio` ever call out to HF's hosted Inference API for ASR (e.g. `openai/whisper-large-v3` hosted on HF), or should all four providers simply delegate to the same local Whisper.cpp binary regardless of which text-generation provider is active? The simplest, most consistent "zero mocked data" interpretation is: all four delegate to local Whisper.cpp (one STT implementation, decoupled from the chat LLM provider choice). Recommend defaulting to this unless there's a specific reason to special-case HF/OpenAI-compatible native endpoints.
- CLAUDE.md (line 168) currently documents that STT is "system-tool-limited" via `arecord`/`espeak` and explicitly does NOT use Whisper for the default path either — confirm whether this story is scoped to just the 4 provider stubs, or should also be the trigger to finally wire Whisper into the default `start_recording`/`stop_recording` flow. As written, this story is scoped narrowly to the 4 named stub lines; flag the broader default-path gap as a follow-up if out of scope.

## Dev Agent Record
### Agent Model Used
[unassigned]
