#!/bin/bash
# launch_sandbox.sh - Bubblewrap sandbox runner for NEURODECK on SteamOS / Linux
# Ensures isolation while preserving UI display, audio (Pipewire), networking, and loopback tunnel capabilities.

# Directory containing this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Identify the binary
if [ -f "$PROJECT_ROOT/neurodeck" ]; then
    BINARY="$PROJECT_ROOT/neurodeck"
elif [ -f "$PROJECT_ROOT/app" ]; then
    BINARY="$PROJECT_ROOT/app"
else
    echo "Error: NEURODECK binary not found in $PROJECT_ROOT"
    exit 1
fi

# Ensure bwrap is installed
if ! command -v bwrap &> /dev/null; then
    echo "Warning: bubblewrap (bwrap) not found. Cannot run in sandbox mode."
    echo "Attempting to run binary directly..."
    exec "$BINARY" "$@"
fi

# Setup sandbox writable directories (data, configuration, cache)
SANDBOX_DATA="$PROJECT_ROOT/data/sandbox"
mkdir -p "$SANDBOX_DATA/home"
mkdir -p "$SANDBOX_DATA/tmp"
mkdir -p "$SANDBOX_DATA/run"

# Prepare variables for GUI / Display / Audio / Network access
BWRAP_ARGS=(
    # Create a new terminal session to prevent TTY-hijack vulnerabilities
    --new-session
    # Create isolated namespaces
    --unshare-user
    --unshare-ipc
    --unshare-pid
    # Note: we do NOT use --unshare-net because S-Term requires networking for the local loopback 
    # TCP connection to the host tunnel server (127.0.0.1:18337).
    
    # Mount essential system libraries and paths (Read-Only)
    --ro-bind /usr /usr
    --ro-bind /bin /bin
    --ro-bind-try /sbin /sbin
    --ro-bind /lib /lib
    --ro-bind-try /lib64 /lib64
    --ro-bind-try /etc/alternatives /etc/alternatives
    --ro-bind-try /etc/resolv.conf /etc/resolv.conf
    --ro-bind-try /etc/fonts /etc/fonts
    --ro-bind-try /etc/ssl /etc/ssl
    --ro-bind-try /etc/pki /etc/pki
    --ro-bind-try /etc/ca-certificates /etc/ca-certificates
    
    # Mount devices and special filesystems
    --dev /dev
    --proc /proc
    --dir /sys --ro-bind-try /sys /sys
    
    # Mount writable sandbox environment areas
    --dir /tmp
    --dir /var
    --dir /run
    
    # Sandbox Home
    --dir /home
    --bind "$SANDBOX_DATA/home" "$HOME"
    
    # X11 display socket access
    --ro-bind-try /tmp/.X11-unix /tmp/.X11-unix
)

# Bind XDG_RUNTIME_DIR and Wayland/Pipewire sockets if they exist
if [ -n "$XDG_RUNTIME_DIR" ]; then
    BWRAP_ARGS+=(
        --dir "$XDG_RUNTIME_DIR"
        --ro-bind-try "$XDG_RUNTIME_DIR/wayland-0" "$XDG_RUNTIME_DIR/wayland-0"
        --ro-bind-try "$XDG_RUNTIME_DIR/wayland-1" "$XDG_RUNTIME_DIR/wayland-1"
        --ro-bind-try "$XDG_RUNTIME_DIR/pipewire-0" "$XDG_RUNTIME_DIR/pipewire-0"
        --ro-bind-try "$XDG_RUNTIME_DIR/pulse" "$XDG_RUNTIME_DIR/pulse"
        --ro-bind-try "$XDG_RUNTIME_DIR/bus" "$XDG_RUNTIME_DIR/bus"
    )
fi

# Run the sandboxed application
echo "Launching NEURODECK in Bubblewrap sandbox..."
exec bwrap "${BWRAP_ARGS[@]}" \
     --bind "$PROJECT_ROOT" "$PROJECT_ROOT" \
     --chdir "$PROJECT_ROOT" \
     "$BINARY" "$@"
