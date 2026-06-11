use std::sync::Arc;

use crate::config;
use crate::llm::{
    GeminiProvider, HuggingFaceProvider, KimiProvider, LlmProvider, OllamaProvider,
    OpenAICompatProvider,
};

/// Build the default LLM provider from the active config.
pub(crate) fn create_provider(config: &config::Config) -> Arc<dyn LlmProvider> {
    // User-configured default_provider takes precedence over env vars.
    // The GEMINI_API_KEY env var is only a key source, not a provider selector.
    match config.llm.default_provider.as_str() {
        "gemini" => Arc::new(GeminiProvider::new(config.llm.gemini_model.clone())),
        "huggingface" => Arc::new(HuggingFaceProvider::new(
            config.llm.hf_model.clone(),
            None,
            config.llm.hf_base_url.clone(),
            config.llm.hf_embed_model.clone(),
        )),
        "kimi" => Arc::new(KimiProvider::new(
            config.llm.kimi_model.clone(),
            config.llm.kimi_base_url.clone(),
        )),
        "openai_compat" => {
            let api_key =
                neurodeck_infrastructure::secrets::get_openai_compat_api_key().unwrap_or_default();
            Arc::new(OpenAICompatProvider::new(
                config.llm.openai_compat_base_url.clone(),
                config.llm.openai_compat_model.clone(),
                api_key,
            ))
        }
        _ => Arc::new(OllamaProvider::new(
            config.llm.ollama_model.clone(),
            config.llm.ollama_base_url.clone(),
            config.llm.ollama_embed_model.clone(),
        )),
    }
}

/// Build a provider Arc directly from an AgentConfig.
pub(crate) fn provider_from_agent(agent: &config::AgentConfig) -> Arc<dyn LlmProvider> {
    match agent.provider.as_str() {
        "gemini" => Arc::new(GeminiProvider::new(agent.model.clone())),
        "huggingface" => Arc::new(HuggingFaceProvider::new(
            agent.model.clone(),
            None,
            agent.base_url.clone(),
            agent.embed_model.clone(),
        )),
        "kimi" => Arc::new(KimiProvider::new(
            agent.model.clone(),
            agent.base_url.clone(),
        )),
        "openai_compat" => {
            let api_key =
                neurodeck_infrastructure::secrets::get_openai_compat_api_key().unwrap_or_default();
            Arc::new(OpenAICompatProvider::new(
                agent.base_url.clone(),
                agent.model.clone(),
                api_key,
            ))
        }
        _ => Arc::new(OllamaProvider::new(
            agent.model.clone(),
            agent.base_url.clone(),
            agent.embed_model.clone(),
        )),
    }
}

/// Build a provider Arc for an explicit provider/model pair, falling back to
/// config defaults for base URL / embed model / API keys.
pub(crate) fn provider_for(
    provider: &str,
    model: &str,
    config: &config::Config,
) -> Arc<dyn LlmProvider> {
    match provider {
        "gemini" => Arc::new(GeminiProvider::new(model.to_string())),
        "huggingface" => Arc::new(HuggingFaceProvider::new(
            model.to_string(),
            None,
            config.llm.hf_base_url.clone(),
            config.llm.hf_embed_model.clone(),
        )),
        "kimi" => Arc::new(KimiProvider::new(
            model.to_string(),
            config.llm.kimi_base_url.clone(),
        )),
        "openai_compat" => {
            let api_key =
                neurodeck_infrastructure::secrets::get_openai_compat_api_key().unwrap_or_default();
            Arc::new(OpenAICompatProvider::new(
                config.llm.openai_compat_base_url.clone(),
                model.to_string(),
                api_key,
            ))
        }
        _ => Arc::new(OllamaProvider::new(
            model.to_string(),
            config.llm.ollama_base_url.clone(),
            config.llm.ollama_embed_model.clone(),
        )),
    }
}

/// Seed default agent profiles when none exist in config.
pub(crate) fn default_agents() -> Vec<config::AgentConfig> {
    let ollama_url = "http://localhost:11434".to_string();
    let hf_url = "https://api-inference.huggingface.co".to_string();
    vec![
        config::AgentConfig {
            id: "gemini-flash-lite".into(),
            name: "Flash Lite".into(),
            provider: "gemini".into(),
            model: "gemini-2.0-flash-lite".into(),
            base_url: String::new(),
            embed_model: String::new(),
            description: "Fastest cloud model — best for quick chat and low-latency tasks.".into(),
        },
        config::AgentConfig {
            id: "gemini-flash".into(),
            name: "Flash".into(),
            provider: "gemini".into(),
            model: "gemini-2.0-flash".into(),
            base_url: String::new(),
            embed_model: String::new(),
            description: "Best all-around cloud model — code, analysis, multi-step reasoning.".into(),
        },
        config::AgentConfig {
            id: "gemini-pro".into(),
            name: "Pro".into(),
            provider: "gemini".into(),
            model: "gemini-1.5-pro".into(),
            base_url: String::new(),
            embed_model: String::new(),
            description: "Highest intelligence — complex research, long context (1M tokens).".into(),
        },
        config::AgentConfig {
            id: "hf-llama-1b".into(),
            name: "HF Llama 1B".into(),
            provider: "huggingface".into(),
            model: "meta-llama/Llama-3.2-1B-Instruct".into(),
            base_url: hf_url.clone(),
            embed_model: String::new(),
            description: "Lightweight open model via Hugging Face Inference API. Fast and free-tier friendly.".into(),
        },
        config::AgentConfig {
            id: "hf-zephyr-7b".into(),
            name: "HF Zephyr 7B".into(),
            provider: "huggingface".into(),
            model: "HuggingFaceH4/zephyr-7b-beta".into(),
            base_url: hf_url.clone(),
            embed_model: String::new(),
            description: "High-quality chat model via Hugging Face. Strong reasoning and instruction following.".into(),
        },
        config::AgentConfig {
            id: "local-gemma2b".into(),
            name: "Gemma 2B".into(),
            provider: "ollama".into(),
            model: "gemma2:2b".into(),
            base_url: ollama_url.clone(),
            embed_model: String::new(),
            description: "Best quality-per-RAM local model. ~20-30 tok/s on Steam Deck. Offline.".into(),
        },
        config::AgentConfig {
            id: "local-llama1b".into(),
            name: "Llama 1B".into(),
            provider: "ollama".into(),
            model: "llama3.2:1b".into(),
            base_url: ollama_url.clone(),
            embed_model: String::new(),
            description: "Ultra-fast local. ~50 tok/s on Steam Deck. Basic tasks. Offline.".into(),
        },
        config::AgentConfig {
            id: "local-phi35".into(),
            name: "Phi 3.5 Mini".into(),
            provider: "ollama".into(),
            model: "phi3.5:mini".into(),
            base_url: ollama_url.clone(),
            embed_model: String::new(),
            description: "Microsoft compact reasoning model. Strong for code. Offline.".into(),
        },
        config::AgentConfig {
            id: "local-hermes3".into(),
            name: "Hermes 3".into(),
            provider: "ollama".into(),
            model: "hermes3:8b".into(),
            base_url: ollama_url,
            embed_model: String::new(),
            description: "Advanced reasoning model by Nous Research. Excellent for complex multi-turn chats. Offline.".into(),
        },
    ]
}
