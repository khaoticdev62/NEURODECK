//! Cross-platform audio recording for STT.
//!
//! Linux uses `arecord` (existing). Windows and macOS use `cpal` + `hound`.

use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

/// Start recording via `arecord` (Linux only).
pub fn start_arecord(wav_path: &Path) -> Result<std::process::Child, String> {
    std::process::Command::new("arecord")
        .arg("-f")
        .arg("cd")
        .arg("-t")
        .arg("wav")
        .arg(wav_path)
        .spawn()
        .map_err(|e| format!("Error starting arecord: {}", e))
}

/// Start recording via cpal (Windows / macOS).
/// Returns an `Arc<AtomicBool>` that must be set to `true` to stop recording.
pub fn start_cpal_recording(wav_path: &Path) -> Result<Arc<AtomicBool>, String> {
    use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
    use hound::{SampleFormat as HoundSampleFormat, WavSpec, WavWriter};

    let wav_path = wav_path.to_path_buf();
    let stop_flag = Arc::new(AtomicBool::new(false));
    let stop_flag_return = stop_flag.clone();

    // Spawn a dedicated thread that owns the cpal Stream for its entire lifetime.
    // This avoids Send issues on Windows where cpal::Stream is not Send.
    std::thread::spawn(move || {
        let host = cpal::default_host();
        let device = match host.default_input_device() {
            Some(d) => d,
            None => {
                eprintln!("No microphone detected");
                return;
            }
        };
        let config = match device.default_input_config() {
            Ok(c) => c,
            Err(e) => {
                eprintln!("Failed to get default input config: {}", e);
                return;
            }
        };

        let spec = WavSpec {
            channels: config.channels(),
            sample_rate: config.sample_rate().0,
            bits_per_sample: 16,
            sample_format: HoundSampleFormat::Int,
        };

        let writer = match WavWriter::create(&wav_path, spec) {
            Ok(w) => w,
            Err(e) => {
                eprintln!("Failed to create WAV file: {}", e);
                return;
            }
        };
        let writer = Arc::new(std::sync::Mutex::new(Some(writer)));
        let writer_clone = writer.clone();

        let stop_flag_inner = stop_flag.clone();
        let err_fn = |err| eprintln!("cpal error: {}", err);

        let stream = match config.sample_format() {
            cpal::SampleFormat::F32 => device.build_input_stream(
                &config.into(),
                move |data: &[f32], _: &cpal::InputCallbackInfo| {
                    if stop_flag_inner.load(Ordering::Relaxed) {
                        return;
                    }
                    if let Ok(mut guard) = writer_clone.lock() {
                        if let Some(ref mut w) = *guard {
                            for &sample in data {
                                let s = (sample * i16::MAX as f32) as i16;
                                let _ = w.write_sample(s);
                            }
                        }
                    }
                },
                err_fn,
                None,
            ),
            cpal::SampleFormat::I16 => device.build_input_stream(
                &config.into(),
                move |data: &[i16], _: &cpal::InputCallbackInfo| {
                    if stop_flag_inner.load(Ordering::Relaxed) {
                        return;
                    }
                    if let Ok(mut guard) = writer_clone.lock() {
                        if let Some(ref mut w) = *guard {
                            for &sample in data {
                                let _ = w.write_sample(sample);
                            }
                        }
                    }
                },
                err_fn,
                None,
            ),
            cpal::SampleFormat::U16 => device.build_input_stream(
                &config.into(),
                move |data: &[u16], _: &cpal::InputCallbackInfo| {
                    if stop_flag_inner.load(Ordering::Relaxed) {
                        return;
                    }
                    if let Ok(mut guard) = writer_clone.lock() {
                        if let Some(ref mut w) = *guard {
                            for &sample in data {
                                let s = (sample as i16).wrapping_sub(i16::MAX);
                                let _ = w.write_sample(s);
                            }
                        }
                    }
                },
                err_fn,
                None,
            ),
            _ => {
                eprintln!("Unsupported microphone sample format");
                return;
            }
        };

        let stream = match stream {
            Ok(s) => s,
            Err(e) => {
                eprintln!("Failed to build audio input stream: {}", e);
                return;
            }
        };

        if let Err(e) = stream.play() {
            eprintln!("Failed to start recording: {}", e);
            return;
        }

        while !stop_flag.load(Ordering::Relaxed) {
            std::thread::sleep(std::time::Duration::from_millis(100));
        }

        drop(stream);
        let maybe_writer = writer.lock().ok().and_then(|mut g| g.take());
        if let Some(w) = maybe_writer {
            let _ = w.finalize();
        }
    });

    Ok(stop_flag_return)
}
