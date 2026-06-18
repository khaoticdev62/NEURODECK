#!/usr/bin/env python3
"""
NEURODECK Sync — Live Connection Test Client
============================================
Acts as a minimal TCP peer that can:
1. Connect to NEURODECK's TCP transfer server (port 18338)
2. Send a test file using the NEURODECK wire protocol (JSON header + raw bytes)
3. Wait for acceptance response then stream the file

Usage:
    python sync_live_test.py --host 127.0.0.1 --port 18338 --file <path>

Optionally test mDNS discovery:
    python sync_live_test.py --discover --group-code DEFAULT

Requirements: Python 3.8+ standard library only (no pip installs needed)
"""

import argparse
import json
import os
import socket
import sys
import time
import random
import threading

# ── mDNS Discovery (optional) ─────────────────────────────────────────────────


def try_mdns_discover(group_code: str, timeout: int = 10) -> list[dict]:
    """
    Minimal mDNS PTR query for _neurodeck._tcp.local.
    Falls back gracefully if the platform doesn't cooperate.
    Returns a list of discovered peers: [{hostname, ip, port}]
    """
    try:
        from zeroconf import Zeroconf, ServiceBrowser, ServiceStateChange
    except ImportError:
        print("[DISCOVERY] zeroconf not available — skipping mDNS discovery")
        print("[DISCOVERY] Install with: pip install zeroconf")
        return []

    peers = []
    lock = threading.Lock()

    def on_service_state_change(zeroconf, service_type, name, state_change):
        if state_change is ServiceStateChange.Added:
            info = zeroconf.get_service_info(service_type, name)
            if info:
                addresses = [socket.inet_ntoa(addr) for addr in info.addresses]
                props = {
                    k.decode(): v.decode() if isinstance(v, bytes) else v
                    for k, v in (info.properties or {}).items()
                }
                peer_group = props.get("group_code", "DEFAULT")
                if peer_group.upper() == group_code.upper() and addresses:
                    print(
                        f"[DISCOVERY] Found peer: {name} at {addresses[0]}:{info.port} (group={peer_group})"
                    )
                    with lock:
                        peers.append(
                            {
                                "hostname": props.get("hostname", name),
                                "ip": addresses[0],
                                "port": info.port,
                                "is_warpinator": False,
                            }
                        )

    zc = Zeroconf()
    browser = ServiceBrowser(zc, "_neurodeck._tcp.local.", handlers=[on_service_state_change])
    _ = browser  # keep reference so the browser thread stays alive
    print(
        f"[DISCOVERY] Listening for _neurodeck._tcp.local. peers for {timeout}s (group={group_code})..."
    )
    time.sleep(timeout)
    zc.close()
    return peers


# ── TCP Transfer Protocol ──────────────────────────────────────────────────────


def send_file_to_peer(host: str, port: int, file_path: str) -> bool:
    """
    Connects to NEURODECK's TCP transfer server and sends a file.
    Protocol:
      1. Send JSON header line: {"id": ..., "sender": ..., "filename": ..., "size": ...}
      2. Receive JSON response line: {"status": "accepted" | "rejected"}
      3. If accepted, stream raw file bytes in 16 KB chunks
    Returns True on success.
    """
    if not os.path.isfile(file_path):
        print(f"[ERROR] File not found: {file_path}")
        return False

    file_size = os.path.getsize(file_path)
    filename = os.path.basename(file_path)
    transfer_id = f"test-{int(time.time())}-{random.randint(1000, 9999)}"
    sender = socket.gethostname()

    header = {
        "id": transfer_id,
        "sender": sender,
        "filename": filename,
        "size": file_size,
    }
    header_bytes = (json.dumps(header) + "\n").encode("utf-8")

    print(f"\n[SEND] Connecting to {host}:{port}...")
    try:
        sock = socket.create_connection((host, port), timeout=10)
    except Exception as e:
        print(f"[ERROR] Could not connect: {e}")
        return False

    print(f"[SEND] Connected. Sending header: {json.dumps(header)}")
    sock.sendall(header_bytes)

    # Wait for accept/reject response
    response_buf = b""
    sock.settimeout(30)
    try:
        while b"\n" not in response_buf:
            chunk = sock.recv(1024)
            if not chunk:
                break
            response_buf += chunk
    except socket.timeout:
        print("[ERROR] Timed out waiting for accept/reject response")
        sock.close()
        return False

    resp_line = response_buf.split(b"\n")[0]
    try:
        resp = json.loads(resp_line)
    except json.JSONDecodeError:
        print(f"[ERROR] Bad response: {resp_line}")
        sock.close()
        return False

    print(f"[SEND] Response: {resp}")

    if resp.get("status") != "accepted":
        print(f"[SEND] Transfer was {resp.get('status', 'rejected')}. Aborting.")
        sock.close()
        return False

    # Stream the file
    print(f"[SEND] Transfer accepted! Streaming {filename} ({file_size:,} bytes)...")
    bytes_sent = 0
    chunk_size = 16 * 1024  # 16 KB — matches NEURODECK backend

    try:
        with open(file_path, "rb") as f:
            sock.settimeout(60)
            while True:
                data = f.read(chunk_size)
                if not data:
                    break
                sock.sendall(data)
                bytes_sent += len(data)
                pct = int((bytes_sent / file_size) * 100) if file_size > 0 else 100
                print(f"[SEND] Progress: {bytes_sent:,}/{file_size:,} bytes ({pct}%)", end="\r")
    except Exception as e:
        print(f"\n[ERROR] Transfer failed mid-stream: {e}")
        sock.close()
        return False

    sock.close()
    print(f"\n[SEND] ✅ Transfer complete! {bytes_sent:,} bytes sent for transfer {transfer_id}")
    return True


# ── Diagnostics Check ─────────────────────────────────────────────────────────


def check_bridge_diagnostics(bridge_port: int = 9477) -> None:
    """
    Calls the NEURODECK bridge's transfer_diagnostics HTTP endpoint
    and prints the result.
    """
    import urllib.request
    import urllib.error

    # Auto-detect port if not given — try all ports in 9477–9480 range
    ports_to_try = [bridge_port] if bridge_port != 9477 else list(range(9477, 9485))

    for port in ports_to_try:
        url = f"http://127.0.0.1:{port}/api/transfer_diagnostics"
        payload = json.dumps({}).encode()
        req = urllib.request.Request(
            url, data=payload, headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=3) as resp:
                result = json.loads(resp.read())
                print(f"\n[DIAGNOSTICS] Bridge at port {port} responded:")
                print(json.dumps(result, indent=2))
                return
        except urllib.error.HTTPError as e:
            print(f"[DIAGNOSTICS] Port {port}: HTTP {e.code}")
        except Exception:
            pass  # Try next port

    print(f"[DIAGNOSTICS] Could not reach NEURODECK bridge on ports {ports_to_try}")
    print("[DIAGNOSTICS] Make sure NEURODECK is running (npm run dev from project root)")


# ── Main ──────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="NEURODECK Sync Live Test Client",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Check diagnostics of a running NEURODECK instance
  python sync_live_test.py --diagnostics

  # Send a test file to NEURODECK on localhost
  python sync_live_test.py --host 127.0.0.1 --port 18338 --file test.txt

  # Discover NEURODECK peers via mDNS and send a file to the first one
  python sync_live_test.py --discover --group-code DEFAULT --file test.txt

  # Send to a custom port (for dual-instance testing)
  python sync_live_test.py --host 127.0.0.1 --port 18339 --file test.txt
        """,
    )
    parser.add_argument(
        "--host", default="127.0.0.1", help="Target NEURODECK IP (default: 127.0.0.1)"
    )
    parser.add_argument(
        "--port", type=int, default=18338, help="TCP transfer port (default: 18338)"
    )
    parser.add_argument("--file", help="Path to file to send")
    parser.add_argument("--discover", action="store_true", help="Discover peers via mDNS first")
    parser.add_argument(
        "--group-code", default="DEFAULT", help="Group code to match (default: DEFAULT)"
    )
    parser.add_argument(
        "--diagnostics", action="store_true", help="Query NEURODECK bridge diagnostics"
    )
    parser.add_argument(
        "--bridge-port", type=int, default=9477, help="NEURODECK bridge HTTP port (default: 9477)"
    )
    parser.add_argument(
        "--create-test-file",
        action="store_true",
        help="Create a small test file 'neurodeck_test.txt' and send it",
    )

    args = parser.parse_args()

    if args.diagnostics:
        check_bridge_diagnostics(args.bridge_port)

    if args.create_test_file:
        test_path = "neurodeck_test.txt"
        with open(test_path, "w") as f:
            f.write("NEURODECK Sync Live Test\n")
            f.write(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"From: {socket.gethostname()}\n")
            f.write(f"Transfer Port: {args.port}\n")
            f.write("=" * 60 + "\n")
            f.write("This file was sent via the NEURODECK TCP transfer protocol.\n")
        print(f"[CREATE] Created test file: {test_path}")
        args.file = test_path

    target_host = args.host
    target_port = args.port

    if args.discover:
        peers = try_mdns_discover(args.group_code, timeout=10)
        if peers:
            target_host = peers[0]["ip"]
            target_port = peers[0]["port"]
            print(f"[DISCOVERY] Using first discovered peer: {target_host}:{target_port}")
        elif not args.file:
            print("[DISCOVERY] No peers found and no --host given. Exiting.")
            sys.exit(1)

    if args.file:
        success = send_file_to_peer(target_host, target_port, args.file)
        if not success:
            sys.exit(1)
    elif not args.diagnostics:
        parser.print_help()
        print("\n[INFO] No action specified. Use --file, --diagnostics, or --create-test-file.")


if __name__ == "__main__":
    main()
