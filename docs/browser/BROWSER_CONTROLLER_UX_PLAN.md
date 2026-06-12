# Browser Controller UX Plan

This document details the handheld layout configurations and gamepad control maps for **NeuroBrowse** operating at 1280×800.

## 1. Mappings (Steam Deck Game Mode)

- **A**: Click / Focus element.
- **B**: Close overlays / Go back in history.
- **X**: Reload page / Stop loading.
- **Y**: Focus address bar.
- **L1 / R1**: Navigate tabs (previous/next).
- **L2 / R2**: Zoom page out/in.
- **Left Stick**: Scroll page vertically/horizontally.
- **Right Stick**: Virtual mouse cursor mode (emulates trackpad cursor).
- **D-Pad**: UI element focus navigation.
- **L4**: Open Bookmarks Quick View.
- **R4**: Open New Tab.
- **L5**: Security / Permissions status display.
- **R5**: Open Downloads Drawer.

## 2. Handheld Layout Tuning (1280×800)
- **Compact Toolbar**: Combine the address bar and core buttons to fit on a single line, maximizing viewport height.
- **Touch Targets**: Min 44px height for tab elements and address bar control buttons.
- **Virtual Keyboard**: When the address bar is focused, trigger the OS virtual keyboard helper via preload hooks if available.
