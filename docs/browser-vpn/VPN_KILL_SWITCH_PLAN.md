# VPN Kill Switch Plan

1. Track VPN state by profile in main process.
2. Block browser requests when kill switch is enabled and the profile is not connected or verified.
3. Block downloads and popup paths through the same policy.
4. Preserve browser session state while recovery runs.
5. Resume only after real verification passes.

