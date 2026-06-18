use crate::deckcode::activator::ActivatorType;
use gilrs::{Axis, Button, Event, EventType, Gilrs};
use std::thread;
use std::time::Duration;
use std::time::Instant;

#[derive(Debug, Clone)]
pub struct InputEvent {
    pub source: String,
    pub event_type: ActivatorType,
    pub value: Option<f32>,
    pub timestamp: Instant,
}

pub fn start_input_daemon(tx: std::sync::mpsc::Sender<InputEvent>) {
    thread::spawn(move || {
        let mut gilrs = match Gilrs::new() {
            Ok(g) => g,
            Err(e) => {
                tracing::error!("Failed to initialize gilrs for DeckCode: {}", e);
                return;
            }
        };

        loop {
            while let Some(Event {
                id: _,
                event,
                time: _,
                ..
            }) = gilrs.next_event()
            {
                let input_event = match event {
                    EventType::ButtonPressed(button, _) => Some(InputEvent {
                        source: button_to_string(button),
                        event_type: ActivatorType::Press,
                        value: None,
                        timestamp: Instant::now(),
                    }),
                    EventType::ButtonReleased(button, _) => Some(InputEvent {
                        source: button_to_string(button),
                        event_type: ActivatorType::Release,
                        value: None,
                        timestamp: Instant::now(),
                    }),
                    EventType::AxisChanged(axis, value, _) => {
                        Some(InputEvent {
                            source: axis_to_string(axis),
                            event_type: ActivatorType::SoftPull, // Simplified for now
                            value: Some(value),
                            timestamp: Instant::now(),
                        })
                    }
                    _ => None,
                };

                if let Some(ie) = input_event {
                    if let Err(e) = tx.send(ie) {
                        tracing::warn!("Failed to send InputEvent: {}", e);
                    }
                }
            }
            thread::sleep(Duration::from_millis(4)); // 250Hz polling
        }
    });
}

fn button_to_string(b: Button) -> String {
    match b {
        Button::South => "a".to_string(),
        Button::East => "b".to_string(),
        Button::North => "x".to_string(),
        Button::West => "y".to_string(),
        Button::C => "c".to_string(),
        Button::Z => "z".to_string(),
        Button::LeftTrigger => "lb".to_string(),
        Button::LeftTrigger2 => "lt_analog".to_string(),
        Button::RightTrigger => "rb".to_string(),
        Button::RightTrigger2 => "rt_analog".to_string(),
        Button::Select => "view".to_string(),
        Button::Start => "menu".to_string(),
        Button::Mode => "steam".to_string(),
        Button::LeftThumb => "left_stick_click".to_string(),
        Button::RightThumb => "right_stick_click".to_string(),
        Button::DPadUp => "dpad.up".to_string(),
        Button::DPadDown => "dpad.down".to_string(),
        Button::DPadLeft => "dpad.left".to_string(),
        Button::DPadRight => "dpad.right".to_string(),
        _ => "unknown".to_string(),
    }
}

fn axis_to_string(a: Axis) -> String {
    match a {
        Axis::LeftStickX | Axis::LeftStickY => "left_stick.axis".to_string(),
        Axis::RightStickX | Axis::RightStickY => "right_stick.axis".to_string(),
        Axis::LeftZ => "lt_analog".to_string(),
        Axis::RightZ => "rt_analog".to_string(),
        _ => "unknown_axis".to_string(),
    }
}
