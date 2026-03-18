"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { DraftState } from "@/lib/types";
import { subscribeToDraft } from "@/lib/pusher-client";

const FALLBACK_POLL_MS = 30000; // 30s safety-net poll

export function useDraftState() {
  const [state, setState] = useState<DraftState | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/draft");
      const data = await res.json();
      setState(data);
    } catch {
      // Silently retry on next poll
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();

    // Subscribe to Pusher events
    const unsub = subscribeToDraft((eventName, data) => {
      if (eventName === "draft-updated" || eventName === "draft-reset") {
        setState(data as DraftState);
      } else if (eventName === "settings-updated") {
        // Settings changed — refetch draft state to be safe
        fetchState();
      }
      setConnected(true);
    });

    if (unsub) {
      unsubRef.current = unsub;
      setConnected(true);
    }

    // Fallback poll (30s if Pusher connected, faster if not)
    const interval = setInterval(fetchState, unsub ? FALLBACK_POLL_MS : 5000);

    return () => {
      clearInterval(interval);
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [fetchState]);

  return { state, loading, refetch: fetchState, connected };
}
