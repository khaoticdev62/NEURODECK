# NEURODECK Chat Connection Matrix

## Send Message Flow

```
frontend/src/chat.js
  _sendNormalMode(text, imageAttachment)
    │
    ├─ Build invokeArgs = { message: text }
    ├─ Add image_base64 / image_mime if attachment present
    ├─ Add agent_id = state.activeAgentId (if set)
    │
    └─ invoke('send_command', invokeArgs)
         │
         └─ neurobridge.js
              │  POST http://127.0.0.1:9477/api/send_command
              │  Body: { message, agent_id?, image_base64?, pack_id? }
              │
              └─ src-tauri/src/bridge.rs
                   │  dispatch_command("send_command", args)
                   │
                   └─ src-tauri/src/commands/mod.rs  "send_command" arm
                        │
                        ├─ Extract message (with "prompt" fallback)
                        ├─ Extract optional agent_id, image_base64, pack_id
                        ├─ Permission check (Network capability)
                        │
                        ├─ Per-request provider resolution:
                        │    agent_id → config.llm.agents[agent_id]
                        │             → providers::provider_from_agent()
                        │    fallback: AppState.provider (global)
                        │
                        ├─ Return HTTP 200 { status: "streaming" } immediately
                        │
                        └─ [tokio::spawn] async task:
                             ├─ Store user message in AppState.messages
                             ├─ Build system prompt from active persona
                             ├─ RAG: embed message → search memory DB → inject top-3
                             ├─ provider.stream_response(prompt, system_prompt)
                             │    OR chat_with_image() for image requests
                             │
                             └─ WsBroadcaster.emit():
                                  ├─ "command_token" { token } — per chunk
                                  ├─ "command_done" { status: "complete" }
                                  └─ "rag_sources" [ RagSourceEntry... ]
```

## Agent Switch Flow

```
frontend/src/main.js
  handleAgentSwitch(agentId)
    │
    └─ invoke('switch_agent', { id: agentId })
         │
         └─ src-tauri/src/commands/mod.rs  "switch_agent" arm
              │
              ├─ Find agent in config.llm.agents
              ├─ Update config.llm.active_agent_id
              ├─ Rebuild AppState.provider = provider_from_agent(agent)
              ├─ Save config to disk
              │
              └─ WsBroadcaster.emit("agent_changed", { id, name, provider, model })
                   │
                   └─ neurobridge.js WebSocket → frontend
                        │
                        └─ main.js listen("agent_changed")
                             ├─ state.activeAgentId = id
                             ├─ state.activeProvider = provider
                             └─ Update model name badge UI
```

## Receive Stream Flow

```
src-tauri WsBroadcaster
  │
  └─ WebSocket ws://127.0.0.1:9477/ws
       │  { event: "command_token", payload: { token: "..." } }
       │
       └─ neurobridge.js _wsDispatchMessage()
            │
            └─ listeners.get("command_token").forEach(fn)
                 │
                 └─ chat.js stream_chunk handler
                      ├─ state.currentAIText += token
                      ├─ Update DOM (streaming message bubble)
                      └─ Auto-scroll chat viewport
```

## Provider Health Check Flow

```
frontend/src/settings.js
  handleTestConnection()
    │
    └─ invoke('test_llm_connection', { provider, model, url, key })
         │
         └─ src-tauri/src/commands/config.rs  test_llm_connection()
              │
              └─ Construct test provider → send probe message
                   └─ Return { status: "ok" | "error", latency_ms }
```
