use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::time::sleep;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeviceAuthResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub verification_uri_complete: Option<String>,
    pub expires_in: u64,
    pub interval: u64,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct TokenResponse {
    access_token: String,
    token_type: String,
    expires_in: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct TokenErrorResponse {
    error: String,
    error_description: Option<String>,
}

pub struct OAuthConfig {
    pub client_id: String,
    pub device_auth_url: String,
    pub token_url: String,
}

impl Default for OAuthConfig {
    fn default() -> Self {
        Self {
            client_id: "YOUR_GOOGLE_CLIENT_ID".to_string(),
            device_auth_url: "https://oauth2.googleapis.com/device/code".to_string(),
            token_url: "https://oauth2.googleapis.com/token".to_string(),
        }
    }
}

fn encode_form(pairs: &[(&str, &str)]) -> String {
    pairs
        .iter()
        .map(|(k, v)| format!("{}={}", urlencoding(k), urlencoding(v)))
        .collect::<Vec<_>>()
        .join("&")
}

fn urlencoding(s: &str) -> String {
    s.chars()
        .flat_map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.' || c == '~' {
                vec![c]
            } else {
                format!("%{:02X}", c as u32).chars().collect()
            }
        })
        .collect()
}

pub async fn request_device_code(config: &OAuthConfig) -> Result<DeviceAuthResponse, String> {
    let client = Client::new();
    let body = encode_form(&[("client_id", &config.client_id)]);
    let res = client
        .post(&config.device_auth_url)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(body)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    if res.status().is_success() {
        res.json::<DeviceAuthResponse>()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))
    } else {
        Err(format!("Device auth failed: {:?}", res.text().await))
    }
}

pub async fn poll_for_token(
    config: &OAuthConfig,
    device_code: &str,
    interval: u64,
) -> Result<String, String> {
    let client = Client::new();
    loop {
        let body = encode_form(&[
            ("client_id", config.client_id.as_str()),
            ("client_secret", ""),
            ("device_code", device_code),
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
        ]);
        let res = client
            .post(&config.token_url)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .body(body)
            .send()
            .await
            .map_err(|e| format!("Token request failed: {}", e))?;

        if res.status().is_success() {
            let token_res = res
                .json::<TokenResponse>()
                .await
                .map_err(|e| format!("Failed to parse token response: {}", e))?;
            return Ok(token_res.access_token);
        } else {
            let error_res = res
                .json::<TokenErrorResponse>()
                .await
                .map_err(|e| format!("Failed to parse error response: {}", e))?;
            if error_res.error == "authorization_pending" {
                sleep(Duration::from_secs(interval)).await;
            } else if error_res.error == "slow_down" {
                sleep(Duration::from_secs(interval + 5)).await;
            } else {
                return Err(format!(
                    "OAuth Error: {} - {:?}",
                    error_res.error, error_res.error_description
                ));
            }
        }
    }
}
