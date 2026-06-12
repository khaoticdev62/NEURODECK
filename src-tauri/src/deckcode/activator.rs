use std::time::{Duration, Instant};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActivatorType {
    Press,
    Release,
    Hold,
    DoublePress,
    Chord,
    SoftPull,
    FullPull,
}

#[derive(Debug)]
pub struct ButtonState {
    pub is_pressed: bool,
    pub last_pressed_at: Option<Instant>,
    pub last_released_at: Option<Instant>,
    pub press_count: u32,
}

impl Default for ButtonState {
    fn default() -> Self {
        Self::new()
    }
}

impl ButtonState {
    pub fn new() -> Self {
        Self {
            is_pressed: false,
            last_pressed_at: None,
            last_released_at: None,
            press_count: 0,
        }
    }

    pub fn update(&mut self, pressed: bool) {
        let now = Instant::now();
        if pressed && !self.is_pressed {
            self.last_pressed_at = Some(now);
            self.press_count += 1;
        } else if !pressed && self.is_pressed {
            self.last_released_at = Some(now);
            // Reset press count after timeout logic handled elsewhere
        }
        self.is_pressed = pressed;
    }

    pub fn held_duration(&self) -> Option<Duration> {
        if self.is_pressed {
            self.last_pressed_at.map(|t| t.elapsed())
        } else {
            None
        }
    }
}
