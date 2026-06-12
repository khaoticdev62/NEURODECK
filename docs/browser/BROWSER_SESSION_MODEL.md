# Browser Session & Profile Model

This document outlines the profile-to-partition mapping and session storage rules for **NeuroBrowse**.

## 1. Profile Definitions & Partition Mapping

| Profile | Partition ID | Persistent | Storage Behavior |
|---|---|---|---|
| **Default** | `persist:nb-default` | Yes | Saves cookies, cache, history, and downloads. |
| **Private** | `nb-private` | No | In-memory session. Cache/cookies wiped on tab close. |
| **Research** | `persist:nb-research` | Yes | Isolated persistent profile for safe research. |
| **Developer** | `persist:nb-developer` | Yes | Enables debug tools, logs verbose console messages. |
| **Sandbox** | `persist:nb-sandbox` | Yes | Strict default permission restrictions. Blocks popups. |

## 2. In-Memory Session (Private Mode)
- Uses an in-memory session partition (prefix without `persist:`).
- Disables writing to history.
- Wipes cookies, local storage, and session credentials when the last private tab is destroyed.

## 3. Storage Clearing Rules
The `BrowserSessionService` implements `clearData()` to purge:
- Cache
- Cookies
- Local Storage / IndexedDB
- History records
- Saved permission grants
