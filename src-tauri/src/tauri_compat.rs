//! Compatibility stubs for Tauri types used in dead command functions.
//!
//! NEURODECK is pure Electron + bridge server. The Tauri command wrappers in
//! `commands/` are no longer invoked at runtime, but they must still compile.
//! This module provides minimal stub types so the old signatures and bodies
//! type-check without pulling in the `tauri` crate.

use std::sync::Arc;
// ── State ──────────────────────────────────────────────────────────────────

pub struct State<'a, T: 'a> {
    _inner: Arc<T>,
    _marker: std::marker::PhantomData<&'a T>,
}

impl<'a, T> State<'a, T> {
    pub fn new(value: Arc<T>) -> Self {
        Self {
            _inner: value,
            _marker: std::marker::PhantomData,
        }
    }
    pub fn inner(&self) -> &Arc<T> {
        &self._inner
    }
}

impl<'a, T> std::ops::Deref for State<'a, T> {
    type Target = T;
    fn deref(&self) -> &T {
        &self._inner
    }
}

impl<'a, T> std::ops::DerefMut for State<'a, T> {
    fn deref_mut(&mut self) -> &mut T {
        Arc::get_mut(&mut self._inner).expect("State exclusive borrow failed")
    }
}

// ── Error ──────────────────────────────────────────────────────────────────

#[derive(Debug)]
pub struct Error(pub String);

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for Error {}

impl From<std::io::Error> for Error {
    fn from(e: std::io::Error) -> Self {
        Error(e.to_string())
    }
}

impl From<Box<dyn std::error::Error>> for Error {
    fn from(e: Box<dyn std::error::Error>) -> Self {
        Error(e.to_string())
    }
}

// ── AppHandle ──────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct AppHandle;

impl AppHandle {
    pub fn emit<E: serde::Serialize>(&self, _event: &str, _payload: E) -> Result<(), Error> {
        Ok(())
    }

    pub fn listen<F>(&self, _event: &str, _handler: F) -> u64
    where
        F: Fn(Event) + Send + 'static,
    {
        0
    }

    pub fn get_webview_window(&self, _label: &str) -> Option<Window> {
        None
    }

    pub fn path(&self) -> PathResolver {
        PathResolver
    }

    pub fn default_window_icon(&self) -> Option<Icon> {
        None
    }

    pub fn exit(&self, _code: i32) {}
}

impl crate::bridge::EventEmitter for AppHandle {
    fn emit<E: serde::Serialize + Clone>(&self, _event: &str, _payload: E) {}
}

impl AppHandle {
    pub fn try_state<T>(&self) -> Option<T> {
        None
    }

    pub fn state<T>(&self) -> T {
        panic!("Tauri managed state is not available in pure Electron mode")
    }
}

// ── Window ─────────────────────────────────────────────────────────────────

pub struct Window;

impl Window {
    pub fn show(&self) -> Result<(), Error> {
        Ok(())
    }
    pub fn hide(&self) -> Result<(), Error> {
        Ok(())
    }
    pub fn close(&self) -> Result<(), Error> {
        Ok(())
    }
    pub fn set_fullscreen(&self, _v: bool) -> Result<(), Error> {
        Ok(())
    }
    pub fn set_decorations(&self, _v: bool) -> Result<(), Error> {
        Ok(())
    }
    pub fn is_fullscreen(&self) -> Result<bool, Error> {
        Ok(false)
    }
    pub fn is_decorated(&self) -> Result<bool, Error> {
        Ok(true)
    }
    pub fn get_webview_window(&self, _label: &str) -> Option<Window> {
        None
    }
    pub fn on_window_event<F: Fn(WindowEvent) + Send + 'static>(&self, _f: F) {}
    pub fn scale_factor(&self) -> Result<f64, Error> {
        Ok(1.0)
    }
    pub fn inner_position(&self) -> Result<PhysicalPosition<i32>, Error> {
        Ok(PhysicalPosition::new(0, 0))
    }
    pub fn set_position<P: Into<Position>>(&self, _p: P) -> Result<(), Error> {
        Ok(())
    }
    pub fn set_size<S: Into<Size>>(&self, _s: S) -> Result<(), Error> {
        Ok(())
    }
    pub fn navigate(&self, _url: Url) -> Result<(), Error> {
        Ok(())
    }
    pub fn eval(&self, _js: &str) -> Result<(), Error> {
        Ok(())
    }
    pub fn url(&self) -> Result<Url, Error> {
        Ok(Url(String::new()))
    }
}

// ── Position / Size ────────────────────────────────────────────────────────

#[derive(Clone, Debug)]
pub struct LogicalPosition(pub f64, pub f64);
impl LogicalPosition {
    pub fn new(x: f64, y: f64) -> Self {
        Self(x, y)
    }
}
impl From<LogicalPosition> for Position {
    fn from(p: LogicalPosition) -> Self {
        Position::Logical(p)
    }
}

#[derive(Clone, Debug)]
pub struct LogicalSize(pub f64, pub f64);
impl LogicalSize {
    pub fn new(w: f64, h: f64) -> Self {
        Self(w, h)
    }
}
impl From<LogicalSize> for Size {
    fn from(s: LogicalSize) -> Self {
        Size::Logical(s)
    }
}

#[derive(Clone, Debug)]
pub struct PhysicalPosition<T>(pub T, pub T);
impl<T> PhysicalPosition<T> {
    pub fn new(x: T, y: T) -> Self {
        Self(x, y)
    }
}

pub enum Position {
    Logical(LogicalPosition),
}
pub enum Size {
    Logical(LogicalSize),
}

// ── Url ────────────────────────────────────────────────────────────────────

#[derive(Clone, Debug)]
pub struct Url(pub String);

impl std::str::FromStr for Url {
    type Err = Error;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Url(s.to_string()))
    }
}

impl std::fmt::Display for Url {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

// ── Event ──────────────────────────────────────────────────────────────────

pub struct Event {
    pub payload: String,
}

impl Event {
    pub fn payload(&self) -> &str {
        &self.payload
    }
}

// ── WindowEvent ────────────────────────────────────────────────────────────

pub enum WindowEvent {
    CloseRequested { api: CloseRequestApi },
}

pub struct CloseRequestApi;
impl CloseRequestApi {
    pub fn prevent_close(&self) {}
}

// ── PathResolver ───────────────────────────────────────────────────────────

pub struct PathResolver;

impl PathResolver {
    pub fn resource_dir(&self) -> Result<std::path::PathBuf, Error> {
        Ok(std::env::current_dir().unwrap_or_default())
    }
    pub fn download_dir(&self) -> Result<std::path::PathBuf, Error> {
        Ok(std::env::current_dir()
            .unwrap_or_default()
            .join("Downloads"))
    }
    pub fn app_data_dir(&self) -> Result<std::path::PathBuf, Error> {
        Ok(std::env::current_dir().unwrap_or_default())
    }
}

// ── Tray stubs ─────────────────────────────────────────────────────────────

pub struct TrayIconBuilder;
impl TrayIconBuilder {
    pub fn new() -> Self {
        Self
    }
    pub fn tooltip(self, _s: &str) -> Self {
        self
    }
    pub fn icon(self, _i: Icon) -> Self {
        self
    }
    pub fn menu(self, _m: &Menu) -> Result<Self, Error> {
        Ok(self)
    }
    pub fn on_menu_event<F>(self, _f: F) -> Self {
        self
    }
    pub fn on_tray_icon_event<F>(self, _f: F) -> Self {
        self
    }
    pub fn build(self, _app: &AppHandle) -> Result<(), Error> {
        Ok(())
    }
}

pub struct TrayIconEvent;
pub struct MouseButton;

pub struct Menu;
impl Menu {
    pub fn with_items(_app: &AppHandle, _items: &[&MenuItem]) -> Result<Menu, Error> {
        Ok(Menu)
    }
}

pub struct MenuItem;
impl MenuItem {
    pub fn with_id(
        _app: &AppHandle,
        _id: &str,
        _text: &str,
        _enabled: bool,
        _acc: Option<&str>,
    ) -> Result<MenuItem, Error> {
        Ok(MenuItem)
    }
}

pub struct PredefinedMenuItem;
impl PredefinedMenuItem {
    pub fn separator(_app: &AppHandle) -> Result<MenuItem, Error> {
        Ok(MenuItem)
    }
}

// ── WebviewWindowBuilder / WebviewUrl ──────────────────────────────────────

pub struct WebviewWindowBuilder;
impl WebviewWindowBuilder {
    pub fn new(_app: &AppHandle, _label: &str, _url: WebviewUrl) -> Self {
        Self
    }
    pub fn title(self, _s: &str) -> Self {
        self
    }
    pub fn decorations(self, _v: bool) -> Self {
        self
    }
    pub fn position(self, _x: f64, _y: f64) -> Self {
        self
    }
    pub fn inner_size(self, _w: f64, _h: f64) -> Self {
        self
    }
    pub fn skip_taskbar(self, _v: bool) -> Self {
        self
    }
    pub fn user_agent(self, _s: &str) -> Self {
        self
    }
    pub fn parent(self, _p: &Window) -> Result<Self, Error> {
        Ok(self)
    }
    pub fn build(self) -> Result<Window, Error> {
        Ok(Window)
    }
}

pub enum WebviewUrl {
    External(Url),
}

// ── Icon ───────────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct Icon;

// ── Async runtime helpers ──────────────────────────────────────────────────

pub mod async_runtime {
    pub use tokio::spawn;
    pub use tokio::task::spawn_blocking;
    pub fn block_on<F: std::future::Future>(f: F) -> F::Output {
        tokio::runtime::Handle::current().block_on(f)
    }
}

// ── Re-export module-level items commonly used ─────────────────────────────

pub mod tray {
    pub use super::{MouseButton, TrayIconBuilder, TrayIconEvent};
}

pub mod menu {
    pub use super::{Menu, MenuItem, PredefinedMenuItem};
}
