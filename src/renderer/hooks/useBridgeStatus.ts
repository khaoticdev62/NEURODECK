import { useEffect, useState } from "react";
import { listenBridge, getBridgeConnectionState } from "../services/bridgeAdapter";
import type { BridgeStatus } from "../services/bridgeAdapter";

export type { BridgeStatus };

export function useBridgeStatus(): BridgeStatus {
  const [status, setStatus] = useState<BridgeStatus>(getBridgeConnectionState());

  useEffect(() => {
    return listenBridge("bridge:status", (payload) => {
      const p = payload as { state: BridgeStatus };
      setStatus(p.state);
    });
  }, []);

  return status;
}
