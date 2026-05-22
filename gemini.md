# Gemini Integration & Development Log

This file documents the development of the NEURODECK project using Gemini and plans for integrating Gemini API as an LLM provider.

## Project Overview

NEURODECK is a native-feeling AI terminal interface for SteamOS Game Mode on the Steam Deck.

## Development with Gemini

I (Antigravity, based on Gemini) am assisting in the development of this project. This file will track my progress and specific instructions.

## Gemini API Integration Plan

The PRD mentions "Ollama / Remote APIs" and "OpenAI provider adapter". We plan to add a Gemini provider adapter to allow the terminal to use Gemini models.

### Proposed Gemini Provider
- **API**: Google Gen AI SDK (or HTTP calls).
- **Authentication**: API Key stored securely.
- **Features**: Streaming responses, system prompts, function calling (for terminal macros).

## Tasks
- [x] Bootstrap repository.
- [x] Implement Gemini provider adapter.
- [x] Test streaming with Gemini.
