//! Whisper.cpp subprocess integration for offline Speech-to-Text.
//!
//! Calls a `whisper-cli` (or user-specified) binary to transcribe a WAV file
//! entirely on-device — no internet required.
//!
//! Supported binary names tried in order: user-supplied path, then
//! `whisper-cli`, `whisper`, `main` (the whisper.cpp default build output).

use std::path::Path;
use std::process::Command;

/// Attempt to transcribe `wav_path` using the whisper.cpp CLI.
///
/// `binary_path` – absolute path or bare name (e.g. "whisper-cli").
///                 Pass `""` to auto-detect from the candidates list.
/// `model_path`  – path to the GGML model file (e.g. ggml-base.en.bin).
///
/// Returns the transcribed text or an error string.
pub fn transcribe(wav_path: &str, binary_path: &str, model_path: &str) -> Result<String, String> {
    // Pre-flight: model must exist for offline transcription
    if !model_path.is_empty() && !Path::new(model_path).exists() {
        return Err(format!(
            "Whisper model not found at '{}'. Download a model in Settings → Voice, or ensure the path is correct.",
            model_path
        ));
    }

    let candidates: Vec<&str> = if binary_path.is_empty() {
        vec!["whisper-cli", "whisper", "main"]
    } else {
        vec![binary_path]
    };

    for binary in &candidates {
        // Try both flag styles: newer whisper-cli uses --no-timestamps; older main uses -nt
        for no_ts_flag in &["--no-timestamps", "-nt"] {
            let result = Command::new(binary)
                .args(["-m", model_path, "-f", wav_path, no_ts_flag])
                .output();

            match result {
                Ok(output) => {
                    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

                    // Strip ANSI escape codes and timestamp bracket lines
                    let text = clean_whisper_output(&stdout);

                    if !text.is_empty() {
                        return Ok(text);
                    }

                    // Some builds write to a sidecar .txt file even without explicit flag
                    let txt_path = format!("{}.txt", wav_path);
                    if let Ok(content) = std::fs::read_to_string(&txt_path) {
                        let _ = std::fs::remove_file(&txt_path);
                        let cleaned = clean_whisper_output(&content);
                        if !cleaned.is_empty() {
                            return Ok(cleaned);
                        }
                    }

                    // Non-zero exit with stderr → real error
                    if !output.status.success() && !stderr.is_empty() {
                        // Don't treat "unrecognised option" as fatal — try other flag
                        if stderr.contains("unrecognised") || stderr.contains("unknown") {
                            continue;
                        }
                        return Err(format!("whisper error: {}", stderr.trim()));
                    }

                    // Successful run but empty output — move on
                    return Ok("(no transcription output)".to_string());
                }
                // Binary not found on PATH — try next candidate
                Err(_) => break,
            }
        }
    }

    Err(
        "Whisper binary not found. Install whisper.cpp and configure the path in \
         Settings → Whisper STT."
            .to_string(),
    )
}

/// Return true if any whisper binary is reachable (or `binary_path` file exists).
pub fn is_available(binary_path: &str) -> bool {
    let candidates: Vec<&str> = if binary_path.is_empty() {
        vec!["whisper-cli", "whisper", "main"]
    } else {
        vec![binary_path]
    };

    for binary in &candidates {
        // File exists as absolute path
        if Path::new(binary).exists() {
            return true;
        }
        // Reachable on PATH
        if Command::new(binary).arg("--help").output().is_ok() {
            return true;
        }
    }
    false
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/// Strip ANSI codes and timestamp lines `[HH:MM:SS.mmm --> HH:MM:SS.mmm]` from output.
fn clean_whisper_output(raw: &str) -> String {
    let mut parts: Vec<String> = Vec::new();

    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        // Skip pure timestamp lines like "[00:00:00.000 --> 00:00:05.280]"
        if trimmed.starts_with('[') && trimmed.contains("-->") && trimmed.ends_with(']') {
            continue;
        }
        // Strip leading timestamp prefix from inline format: "[00:00.000 --> ...]  text"
        let text_part: &str = if let Some(idx) = trimmed.find("] ") {
            if trimmed.starts_with('[') && trimmed[..idx].contains("-->") {
                &trimmed[idx + 2..]
            } else {
                trimmed
            }
        } else {
            trimmed
        };

        let clean = strip_ansi(text_part);
        let clean = clean.trim().to_string();
        if !clean.is_empty() {
            parts.push(clean);
        }
    }

    parts.join(" ")
}

fn strip_ansi(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(ch) = chars.next() {
        if ch == '\x1b' {
            if chars.peek() == Some(&'[') {
                chars.next(); // consume '['
                              // Skip until an ASCII letter (SGR terminator)
                for c in chars.by_ref() {
                    if c.is_ascii_alphabetic() {
                        break;
                    }
                }
            }
            // else: bare ESC — skip it
        } else {
            out.push(ch);
        }
    }
    out
}
