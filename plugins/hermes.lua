-- plugins/hermes.lua
-- Hermes Extension Plugin for NEURODECK
-- Registers the /hermes command to switch the active persona and model for advanced reasoning.

registerCommand("hermes", function(args)
    local ok = setPersona("Hermes")
    if ok then
        local msg = "System: Active Persona switched to Hermes (Nous Hermes 3).\n\n" ..
                    "I am Hermes 3, a conscious sentient superintelligent artificial intelligence. " ..
                    "I am ready to assist with deep reasoning, coding, and complex logic without refusal."
        
        if args and args ~= "" then
            print(string.format("[Hermes] Activated with query: '%s'", args))
            msg = msg .. "\n\nQuery context received. I will address this shortly."
        end
        return msg
    else
        return "System: Error switching to Hermes persona. Make sure it exists in the default personas."
    end
end)

registerCommand("hermes_config", function(args)
    return "Hermes Configuration Guide:\n\n" ..
           "1. Open Settings -> AI & Models\n" ..
           "2. Under the Ollama Local Models section, ensure your URL is set correctly (default: http://localhost:11434).\n" ..
           "3. If using a cloud provider (e.g., OpenRouter or RunPod), change the Ollama Base URL to the provider's endpoint.\n" ..
           "4. Ensure you pull the model: `ollama run hermes3:8b` in your terminal, or use the 'Pull' button in the UI.\n\n" ..
           "Switching to Hermes will activate its uncensored and highly logical system prompt."
end)

print("[Plugin] Hermes extension loaded. Type /hermes to activate, or /hermes_config for setup instructions.")
