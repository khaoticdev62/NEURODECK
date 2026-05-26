use futures_util::{Stream, StreamExt};
use serde::{Deserialize, Serialize};
use std::pin::Pin;
use base64::prelude::*;

pub trait LlmProvider: Send + Sync {
    fn stream_response(
        &self,
        prompt: &str,
        system_prompt: &str,
    ) -> Pin<Box<dyn Stream<Item = Result<String, String>> + Send>>;

    fn transcribe_audio(
        &self,
        audio_data: &[u8],
    ) -> Pin<Box<dyn std::future::Future<Output = Result<String, String>> + Send + '_>>;

    fn generate_embedding(
        &self,
        text: &str,
    ) -> Pin<Box<dyn std::future::Future<Output = Result<Vec<f32>, String>> + Send + '_>>;

    /// Send a chat message with an optional base64-encoded image attachment.
    /// Returns the model's full text response (non-streaming).
    fn chat_with_image(
        &self,
        prompt: &str,
        system_prompt: &str,
        image_base64: Option<&str>,
        image_mime: Option<&str>,
    ) -> Pin<Box<dyn std::future::Future<Output = Result<String, String>> + Send + '_>>;

    /// Generate a single, non-streaming completion (useful for autocomplete)
    fn generate_oneshot(
        &self,
        prompt: &str,
        max_tokens: u32,
    ) -> Pin<Box<dyn std::future::Future<Output = Result<String, String>> + Send + '_>>;
}

pub struct GeminiProvider {
    pub model: String,
    api_key_override: Option<String>,
}

impl GeminiProvider {
    pub fn new(model: String) -> Self {
        let m = if model.is_empty() {
            "gemini-1.5-flash".to_string()
        } else {
            model
        };
        Self { model: m, api_key_override: None }
    }

    pub fn new_with_key(model: String, key: String) -> Self {
        let m = if model.is_empty() {
            "gemini-1.5-flash".to_string()
        } else {
            model
        };
        Self { model: m, api_key_override: Some(key) }
    }

    fn get_api_key(&self) -> Result<String, String> {
        if let Some(ref k) = self.api_key_override {
            return Ok(k.clone());
        }
        if let Ok(key) = std::env::var("GEMINI_API_KEY") {
            if !key.is_empty() {
                return Ok(key);
            }
        }
        neurodeck_infrastructure::secrets::get_gemini_api_key()
            .map_err(|e| format!("GEMINI_API_KEY environment variable not set and failed to retrieve from OS keychain: {}", e))
    }
}

// Gemini Request / Response JSON Structs
#[derive(Serialize)]
struct GeminiPart {
    text: Option<String>,
    #[serde(rename = "inlineData")]
    inline_data: Option<GeminiInlineData>,
}

#[derive(Serialize)]
struct GeminiInlineData {
    #[serde(rename = "mimeType")]
    mime_type: String,
    data: String,
}

#[derive(Serialize)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
}

#[derive(Serialize)]
struct GeminiSystemInstruction {
    parts: Vec<GeminiPart>,
}

#[derive(Serialize)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
    #[serde(rename = "systemInstruction", skip_serializing_if = "Option::is_none")]
    system_instruction: Option<GeminiSystemInstruction>,
}

#[derive(Deserialize)]
struct GeminiResponsePart {
    text: Option<String>,
}

#[derive(Deserialize)]
struct GeminiResponseContent {
    parts: Option<Vec<GeminiResponsePart>>,
}

#[derive(Deserialize)]
struct GeminiResponseCandidate {
    content: Option<GeminiResponseContent>,
}

#[derive(Deserialize)]
struct GeminiResponse {
    candidates: Option<Vec<GeminiResponseCandidate>>,
}

#[derive(Serialize)]
struct GeminiEmbedRequestContent {
    parts: Vec<GeminiPart>,
}

#[derive(Serialize)]
struct GeminiEmbedRequest {
    model: String,
    content: GeminiEmbedRequestContent,
}

#[derive(Deserialize)]
struct GeminiEmbedResponseEmbedding {
    values: Vec<f32>,
}

#[derive(Deserialize)]
struct GeminiEmbedResponse {
    embedding: Option<GeminiEmbedResponseEmbedding>,
}

impl LlmProvider for GeminiProvider {
    fn stream_response(
        &self,
        prompt: &str,
        system_prompt: &str,
    ) -> Pin<Box<dyn Stream<Item = Result<String, String>> + Send>> {
        let api_key = match self.get_api_key() {
            Ok(key) => key,
            Err(e) => return Box::pin(futures_util::stream::once(async move { Err(e) })),
        };

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?alt=sse&key={}",
            self.model, api_key
        );

        let system_instruction = if !system_prompt.is_empty() {
            Some(GeminiSystemInstruction {
                parts: vec![GeminiPart {
                    text: Some(system_prompt.to_string()),
                    inline_data: None,
                }],
            })
        } else {
            None
        };

        let request_body = GeminiRequest {
            contents: vec![GeminiContent {
                parts: vec![GeminiPart {
                    text: Some(prompt.to_string()),
                    inline_data: None,
                }],
            }],
            system_instruction,
        };

        let client = reqwest::Client::new();

        let stream = async_stream::try_stream! {
            let res = client.post(&url)
                .json(&request_body)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            let mut byte_stream = if !res.status().is_success() {
                let status = res.status();
                let err_text = res.text().await.unwrap_or_default();
                Err(format!("Gemini API error ({}): {}", status, err_text))?
            } else {
                res.bytes_stream()
            };
            let mut buffer = String::new();

            while let Some(chunk_res) = byte_stream.next().await {
                let chunk_bytes = chunk_res.map_err(|e| format!("Stream error: {}", e))?;
                let chunk_str = String::from_utf8_lossy(&chunk_bytes);
                buffer.push_str(&chunk_str);

                while let Some(line_idx) = buffer.find('\n') {
                    let line = buffer[..line_idx].trim().to_string();
                    buffer.drain(..=line_idx);

                    if let Some(stripped) = line.strip_prefix("data:") {
                        let json_str = stripped.trim();
                        if let Ok(gemini_res) = serde_json::from_str::<GeminiResponse>(json_str) {
                            if let Some(candidates) = gemini_res.candidates {
                                for candidate in candidates {
                                    if let Some(content) = candidate.content {
                                        if let Some(parts) = content.parts {
                                            for part in parts {
                                                if let Some(text) = part.text {
                                                    yield text;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        Box::pin(stream.map(|res| res.map_err(|e: String| e)))
    }

    fn transcribe_audio(
        &self,
        audio_data: &[u8],
    ) -> Pin<Box<dyn std::future::Future<Output = Result<String, String>> + Send + '_>> {
        let api_key = match self.get_api_key() {
            Ok(key) => key,
            Err(e) => return Box::pin(async move { Err(e) }),
        };
        let model = self.model.clone();
        let audio_vec = audio_data.to_vec();
        Box::pin(async move {
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
                model, api_key
            );

            let base64_data = BASE64_STANDARD.encode(&audio_vec);
            let request_body = GeminiRequest {
                contents: vec![GeminiContent {
                    parts: vec![
                        GeminiPart {
                            text: None,
                            inline_data: Some(GeminiInlineData {
                                mime_type: "audio/wav".to_string(),
                                data: base64_data,
                            }),
                        },
                        GeminiPart {
                            text: Some("Transcribe this audio. Output only the transcription, nothing else.".to_string()),
                            inline_data: None,
                        }
                    ],
                }],
                system_instruction: None,
            };

            let client = reqwest::Client::new();
            let res = client.post(&url)
                .json(&request_body)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            if !res.status().is_success() {
                let status = res.status();
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("Gemini transcription error ({}): {}", status, err_text));
            }

            let response_body = res.json::<GeminiResponse>()
                .await
                .map_err(|e| format!("Failed to parse response: {}", e))?;

            if let Some(candidates) = response_body.candidates {
                if let Some(candidate) = candidates.first() {
                    if let Some(content) = &candidate.content {
                        if let Some(parts) = &content.parts {
                            let text: String = parts.iter()
                                .filter_map(|p| p.text.clone())
                                .collect();
                            return Ok(text);
                        }
                    }
                }
            }

            Err("No text returned from transcription".to_string())
        })
    }

    fn generate_embedding(
        &self,
        text: &str,
    ) -> Pin<Box<dyn std::future::Future<Output = Result<Vec<f32>, String>> + Send + '_>> {
        let api_key = match self.get_api_key() {
            Ok(key) => key,
            Err(e) => return Box::pin(async move { Err(e) }),
        };
        let text_str = text.to_string();
        Box::pin(async move {
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={}",
                api_key
            );

            let request_body = GeminiEmbedRequest {
                model: "models/text-embedding-004".to_string(),
                content: GeminiEmbedRequestContent {
                    parts: vec![GeminiPart {
                        text: Some(text_str),
                        inline_data: None,
                    }],
                },
            };

            let client = reqwest::Client::new();
            let res = client.post(&url)
                .json(&request_body)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            if !res.status().is_success() {
                let status = res.status();
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("Gemini embedding error ({}): {}", status, err_text));
            }

            let response_body = res.json::<GeminiEmbedResponse>()
                .await
                .map_err(|e| format!("Failed to parse response: {}", e))?;

            if let Some(embed) = response_body.embedding {
                return Ok(embed.values);
            }

            Err("No embedding values returned".to_string())
        })
    }

    fn chat_with_image(
        &self,
        prompt: &str,
        system_prompt: &str,
        image_base64: Option<&str>,
        image_mime: Option<&str>,
    ) -> Pin<Box<dyn std::future::Future<Output = Result<String, String>> + Send + '_>> {
        let api_key = match self.get_api_key() {
            Ok(key) => key,
            Err(e) => return Box::pin(async move { Err(e) }),
        };
        let model = self.model.clone();
        let prompt_str = prompt.to_string();
        let sys_str = system_prompt.to_string();
        let img_b64 = image_base64.map(|s| s.to_string());
        let img_mime = image_mime.map(|s| s.to_string()).unwrap_or_else(|| "image/jpeg".to_string());

        Box::pin(async move {
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
                model, api_key
            );

            // Build parts: optionally include image first, then text prompt
            let mut parts: Vec<GeminiPart> = Vec::new();
            if let Some(b64) = img_b64 {
                parts.push(GeminiPart {
                    text: None,
                    inline_data: Some(GeminiInlineData {
                        mime_type: img_mime,
                        data: b64,
                    }),
                });
            }
            parts.push(GeminiPart {
                text: Some(prompt_str),
                inline_data: None,
            });

            let system_instruction = if !sys_str.is_empty() {
                Some(GeminiSystemInstruction {
                    parts: vec![GeminiPart {
                        text: Some(sys_str),
                        inline_data: None,
                    }],
                })
            } else {
                None
            };

            let request_body = GeminiRequest {
                contents: vec![GeminiContent { parts }],
                system_instruction,
            };

            let client = reqwest::Client::new();
            let res = client.post(&url)
                .json(&request_body)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            if !res.status().is_success() {
                let status = res.status();
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("Gemini vision error ({}): {}", status, err_text));
            }

            let response_body = res.json::<GeminiResponse>()
                .await
                .map_err(|e| format!("Failed to parse response: {}", e))?;

            if let Some(candidates) = response_body.candidates {
                if let Some(candidate) = candidates.first() {
                    if let Some(content) = &candidate.content {
                        if let Some(parts) = &content.parts {
                            let text: String = parts.iter()
                                .filter_map(|p| p.text.clone())
                                .collect();
                            return Ok(text);
                        }
                    }
                }
            }

            Err("No text returned from vision request".to_string())
        })
    }

    fn generate_oneshot(
        &self,
        prompt: &str,
        max_tokens: u32,
    ) -> Pin<Box<dyn std::future::Future<Output = Result<String, String>> + Send + '_>> {
        let api_key = match self.get_api_key() {
            Ok(key) => key,
            Err(e) => return Box::pin(async move { Err(e) }),
        };
        let model = self.model.clone();
        let prompt_str = prompt.to_string();

        Box::pin(async move {
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
                model, api_key
            );

            // Gemini maxOutputTokens configuration
            #[derive(Serialize)]
            struct GeminiGenerationConfig {
                #[serde(rename = "maxOutputTokens")]
                max_output_tokens: u32,
            }

            #[derive(Serialize)]
            struct GeminiOneshotRequest {
                contents: Vec<GeminiContent>,
                #[serde(rename = "generationConfig")]
                generation_config: GeminiGenerationConfig,
            }

            let request_body = GeminiOneshotRequest {
                contents: vec![GeminiContent {
                    parts: vec![GeminiPart {
                        text: Some(prompt_str),
                        inline_data: None,
                    }],
                }],
                generation_config: GeminiGenerationConfig {
                    max_output_tokens: max_tokens,
                },
            };

            let client = reqwest::Client::new();
            let res = client.post(&url)
                .json(&request_body)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            if !res.status().is_success() {
                let status = res.status();
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("Gemini oneshot error ({}): {}", status, err_text));
            }

            let response_body = res.json::<GeminiResponse>()
                .await
                .map_err(|e| format!("Failed to parse response: {}", e))?;

            if let Some(candidates) = response_body.candidates {
                if let Some(candidate) = candidates.first() {
                    if let Some(content) = &candidate.content {
                        if let Some(parts) = &content.parts {
                            let text: String = parts.iter()
                                .filter_map(|p| p.text.clone())
                                .collect();
                            return Ok(text);
                        }
                    }
                }
            }

            Err("No text returned from oneshot request".to_string())
        })
    }
}

pub struct OllamaProvider {
    pub model: String,
    pub base_url: String,
}

impl OllamaProvider {
    pub fn new(model: String, base_url: String) -> Self {
        let m = if model.is_empty() {
            "llama2".to_string()
        } else {
            model
        };
        let url = if base_url.is_empty() {
            "http://localhost:11434".to_string()
        } else {
            base_url
        };
        Self { model: m, base_url: url }
    }
}

// Ollama JSON Structs
#[derive(Serialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    system: String,
    stream: bool,
}

#[derive(Deserialize)]
struct OllamaResponse {
    response: String,
    done: bool,
}

impl LlmProvider for OllamaProvider {
    fn stream_response(
        &self,
        prompt: &str,
        system_prompt: &str,
    ) -> Pin<Box<dyn Stream<Item = Result<String, String>> + Send>> {
        let url = format!("{}/api/generate", self.base_url.trim_end_matches('/'));

        let request_body = OllamaRequest {
            model: self.model.clone(),
            prompt: prompt.to_string(),
            system: system_prompt.to_string(),
            stream: true,
        };

        let client = reqwest::Client::new();

        let stream = async_stream::try_stream! {
            let res = client.post(&url)
                .json(&request_body)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            let mut byte_stream = if !res.status().is_success() {
                let status = res.status();
                let err_text = res.text().await.unwrap_or_default();
                Err(format!("Ollama error ({}): {}", status, err_text))?
            } else {
                res.bytes_stream()
            };
            let mut buffer = String::new();

            while let Some(chunk_res) = byte_stream.next().await {
                let chunk_bytes = chunk_res.map_err(|e| format!("Stream error: {}", e))?;
                let chunk_str = String::from_utf8_lossy(&chunk_bytes);
                buffer.push_str(&chunk_str);

                while let Some(line_idx) = buffer.find('\n') {
                    let line = buffer[..line_idx].trim().to_string();
                    buffer.drain(..=line_idx);

                    if !line.is_empty() {
                        if let Ok(ollama_res) = serde_json::from_str::<OllamaResponse>(&line) {
                            yield ollama_res.response;
                            if ollama_res.done {
                                break;
                            }
                        }
                    }
                }
            }
        };

        Box::pin(stream.map(|res| res.map_err(|e: String| e)))
    }

    fn transcribe_audio(
        &self,
        _audio_data: &[u8],
    ) -> Pin<Box<dyn std::future::Future<Output = Result<String, String>> + Send + '_>> {
        Box::pin(async move {
            Err("Audio transcription not supported by Ollama provider".to_string())
        })
    }

    fn generate_embedding(
        &self,
        _text: &str,
    ) -> Pin<Box<dyn std::future::Future<Output = Result<Vec<f32>, String>> + Send + '_>> {
        Box::pin(async move {
            Err("Embeddings not supported by Ollama provider yet".to_string())
        })
    }

    fn chat_with_image(
        &self,
        prompt: &str,
        system_prompt: &str,
        _image_base64: Option<&str>,
        _image_mime: Option<&str>,
    ) -> Pin<Box<dyn std::future::Future<Output = Result<String, String>> + Send + '_>> {
        let prompt_str = prompt.to_string();
        let sys_str = system_prompt.to_string();
        let url = format!("{}/api/generate", self.base_url.trim_end_matches('/'));
        let model = self.model.clone();
        Box::pin(async move {
            // Text-only for Ollama (no vision support); system prompt forwarded
            let request_body = OllamaRequest {
                model,
                prompt: prompt_str,
                system: sys_str,
                stream: false,
            };
            let client = reqwest::Client::new();
            let res = client.post(&url)
                .json(&request_body)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;
            if !res.status().is_success() {
                let status = res.status();
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("Ollama error ({}): {}", status, err_text));
            }
            let response = res.json::<OllamaResponse>()
                .await
                .map_err(|e| format!("Failed to parse response: {}", e))?;
            Ok(response.response)
        })
    }

    fn generate_oneshot(
        &self,
        prompt: &str,
        _max_tokens: u32,
    ) -> Pin<Box<dyn std::future::Future<Output = Result<String, String>> + Send + '_>> {
        let prompt_str = prompt.to_string();
        let url = format!("{}/api/generate", self.base_url.trim_end_matches('/'));
        let model = self.model.clone();
        
        Box::pin(async move {
            let request_body = OllamaRequest {
                model,
                prompt: prompt_str,
                system: "".to_string(), // No system prompt for autocomplete
                stream: false,
            };
            
            let client = reqwest::Client::new();
            let res = client.post(&url)
                .json(&request_body)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;
                
            if !res.status().is_success() {
                let status = res.status();
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("Ollama oneshot error ({}): {}", status, err_text));
            }
            
            let response = res.json::<OllamaResponse>()
                .await
                .map_err(|e| format!("Failed to parse response: {}", e))?;
                
            Ok(response.response)
        })
    }
}

pub struct HuggingFaceProvider {
    pub model: String,
    api_key: Option<String>,
    base_url: String,
}

#[derive(Serialize)]
struct HfRequest {
    inputs: String,
    parameters: HfParameters,
}

#[derive(Serialize)]
struct HfParameters {
    #[serde(rename = "max_new_tokens")]
    max_new_tokens: u32,
    #[serde(rename = "return_full_text")]
    return_full_text: bool,
    temperature: f32,
}

#[derive(Deserialize)]
struct HfResponse {
    generated_text: String,
}

impl HuggingFaceProvider {
    pub fn new(model: String, api_key: Option<String>, base_url: String) -> Self {
        let m = if model.is_empty() {
            "meta-llama/Llama-3.2-1B-Instruct".to_string()
        } else {
            model
        };
        let url = if base_url.is_empty() {
            "https://api-inference.huggingface.co".to_string()
        } else {
            base_url.trim_end_matches('/').to_string()
        };
        Self { model: m, api_key, base_url: url }
    }

    fn get_api_key(&self) -> Result<String, String> {
        if let Some(ref k) = self.api_key {
            if !k.is_empty() {
                return Ok(k.clone());
            }
        }
        if let Ok(key) = std::env::var("HF_API_KEY") {
            if !key.is_empty() {
                return Ok(key);
            }
        }
        neurodeck_infrastructure::secrets::get_hf_api_key()
            .map_err(|e| format!("HF_API_KEY not set and keychain retrieval failed: {}", e))
    }

    fn build_prompt(&self, prompt: &str, system_prompt: &str) -> String {
        if system_prompt.is_empty() {
            prompt.to_string()
        } else {
            format!("<|system|>\n{}\n<|user|>\n{}\n<|assistant|>\n", system_prompt, prompt)
        }
    }
}

impl LlmProvider for HuggingFaceProvider {
    fn stream_response(
        &self,
        prompt: &str,
        system_prompt: &str,
    ) -> Pin<Box<dyn Stream<Item = Result<String, String>> + Send>> {
        let url = format!("{}/models/{}", self.base_url, self.model);
        let api_key = match self.get_api_key() {
            Ok(k) => k,
            Err(e) => return Box::pin(futures_util::stream::once(async move { Err(e) })),
        };
        let request_body = HfRequest {
            inputs: self.build_prompt(prompt, system_prompt),
            parameters: HfParameters {
                max_new_tokens: 2048,
                return_full_text: false,
                temperature: 0.7,
            },
        };

        let stream = async_stream::try_stream! {
            let client = reqwest::Client::new();
            let res = client.post(&url)
                .header("Authorization", format!("Bearer {}", api_key))
                .json(&request_body)
                .send()
                .await
                .map_err(|e| format!("HF request failed: {}", e))?;

            let status = res.status();
            let body = res.text().await.map_err(|e| format!("HF read failed: {}", e))?;

            if !status.is_success() {
                Err(format!("HF error ({}): {}", status, &body[..body.len().min(500)]))?;
            }
            // HF inference API returns an array of objects or a single object
            let text = if body.trim().starts_with('[') {
                let parsed: Vec<HfResponse> = serde_json::from_str(&body)
                    .map_err(|e| format!("HF parse failed: {} — body: {}", e, &body[..body.len().min(200)]))?;
                parsed.into_iter().next().map(|r| r.generated_text).unwrap_or_default()
            } else {
                let parsed: HfResponse = serde_json::from_str(&body)
                    .map_err(|e| format!("HF parse failed: {} — body: {}", e, &body[..body.len().min(200)]))?;
                parsed.generated_text
            };
            yield text;
        };

        Box::pin(stream)
    }

    fn transcribe_audio(
        &self,
        _audio_data: &[u8],
    ) -> Pin<Box<dyn std::future::Future<Output = Result<String, String>> + Send + '_>> {
        Box::pin(async move {
            Err("Audio transcription not supported by Hugging Face provider".to_string())
        })
    }

    fn generate_embedding(
        &self,
        _text: &str,
    ) -> Pin<Box<dyn std::future::Future<Output = Result<Vec<f32>, String>> + Send + '_>> {
        Box::pin(async move {
            Err("Embeddings not supported by Hugging Face provider yet".to_string())
        })
    }

    fn chat_with_image(
        &self,
        prompt: &str,
        system_prompt: &str,
        _image_base64: Option<&str>,
        _image_mime: Option<&str>,
    ) -> Pin<Box<dyn std::future::Future<Output = Result<String, String>> + Send + '_>> {
        let prompt_str = prompt.to_string();
        let sys_str = system_prompt.to_string();
        let url = format!("{}/models/{}", self.base_url, self.model);
        let api_key = match self.get_api_key() {
            Ok(k) => k,
            Err(e) => return Box::pin(async move { Err(e) }),
        };
        Box::pin(async move {
            let request_body = HfRequest {
                inputs: if sys_str.is_empty() { prompt_str } else { format!("<|system|>\n{}\n<|user|>\n{}\n<|assistant|>\n", sys_str, prompt_str) },
                parameters: HfParameters {
                    max_new_tokens: 2048,
                    return_full_text: false,
                    temperature: 0.7,
                },
            };
            let client = reqwest::Client::new();
            let res = client.post(&url)
                .header("Authorization", format!("Bearer {}", api_key))
                .json(&request_body)
                .send()
                .await
                .map_err(|e| format!("HF request failed: {}", e))?;
            if !res.status().is_success() {
                let status = res.status();
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("HF error ({}): {}", status, err_text));
            }
            let body = res.text().await.map_err(|e| format!("HF read failed: {}", e))?;
            let text = if body.trim().starts_with('[') {
                let parsed: Vec<HfResponse> = serde_json::from_str(&body)
                    .map_err(|e| format!("HF parse failed: {}", e))?;
                parsed.into_iter().next().map(|r| r.generated_text).unwrap_or_default()
            } else {
                let parsed: HfResponse = serde_json::from_str(&body)
                    .map_err(|e| format!("HF parse failed: {}", e))?;
                parsed.generated_text
            };
            Ok(text)
        })
    }

    fn generate_oneshot(
        &self,
        prompt: &str,
        max_tokens: u32,
    ) -> Pin<Box<dyn std::future::Future<Output = Result<String, String>> + Send + '_>> {
        let prompt_str = prompt.to_string();
        let url = format!("{}/models/{}", self.base_url, self.model);
        let api_key = match self.get_api_key() {
            Ok(k) => k,
            Err(e) => return Box::pin(async move { Err(e) }),
        };
        Box::pin(async move {
            let request_body = HfRequest {
                inputs: prompt_str,
                parameters: HfParameters {
                    max_new_tokens: max_tokens,
                    return_full_text: false,
                    temperature: 0.3,
                },
            };
            let client = reqwest::Client::new();
            let res = client.post(&url)
                .header("Authorization", format!("Bearer {}", api_key))
                .json(&request_body)
                .send()
                .await
                .map_err(|e| format!("HF request failed: {}", e))?;
            if !res.status().is_success() {
                let status = res.status();
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("HF oneshot error ({}): {}", status, err_text));
            }
            let body = res.text().await.map_err(|e| format!("HF read failed: {}", e))?;
            let text = if body.trim().starts_with('[') {
                let parsed: Vec<HfResponse> = serde_json::from_str(&body)
                    .map_err(|e| format!("HF parse failed: {}", e))?;
                parsed.into_iter().next().map(|r| r.generated_text).unwrap_or_default()
            } else {
                let parsed: HfResponse = serde_json::from_str(&body)
                    .map_err(|e| format!("HF parse failed: {}", e))?;
                parsed.generated_text
            };
            Ok(text)
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gemini_provider_new() {
        let provider = GeminiProvider::new("custom-model".to_string());
        assert_eq!(provider.model, "custom-model");

        let provider_default = GeminiProvider::new("".to_string());
        assert_eq!(provider_default.model, "gemini-1.5-flash");
    }

    #[test]
    fn test_ollama_provider_new() {
        let provider = OllamaProvider::new("custom-model".to_string(), "http://127.0.0.1:11434".to_string());
        assert_eq!(provider.model, "custom-model");
        assert_eq!(provider.base_url, "http://127.0.0.1:11434");

        let provider_default = OllamaProvider::new("".to_string(), "".to_string());
        assert_eq!(provider_default.model, "llama2");
        assert_eq!(provider_default.base_url, "http://localhost:11434");
    }

    #[test]
    fn test_hf_provider_new() {
        let provider = HuggingFaceProvider::new("custom-model".to_string(), Some("key".to_string()), "https://hf.co".to_string());
        assert_eq!(provider.model, "custom-model");
        assert_eq!(provider.base_url, "https://hf.co");

        let provider_default = HuggingFaceProvider::new("".to_string(), None, "".to_string());
        assert_eq!(provider_default.model, "meta-llama/Llama-3.2-1B-Instruct");
        assert_eq!(provider_default.base_url, "https://api-inference.huggingface.co");
    }
}
