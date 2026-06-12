# Browser Diagnostics Plan

This document details the telemetry metrics and crash reporting capabilities of **NeuroBrowse**.

## 1. Diagnostics Schema
The `BrowserDiagnosticsService` collects state metrics for each active tab:
- **Load Time (ms)**: Time taken from navigation start to `did-finish-load`.
- **Process ID (PID)**: Associated renderer process PID.
- **Memory Usage**: Estimated memory consumed by the web contents.
- **Failures / Blocked Attempts**: Count of blocked popups, dangerous schemes, or cancelled downloads.
- **Crash Count**: Incremental counter monitoring page instability.

## 2. Health Probe Rules
- **Green (Production Ready)**: Active tab has loaded successfully. Navigation is functional.
- **Yellow (Degraded)**: Pending permission prompts, active high-priority downloads, or minor connectivity warnings.
- **Red (Critical Error)**: Guest renderer crash detected, security policy violation caught, or local filesystem access attempts blocked.
