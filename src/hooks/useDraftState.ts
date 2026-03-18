"use client";
import { useState, useEffect, useCallback } from "react";
import { DraftState } from "@/lib/types";

export function useDraftState(pollInterval = 2000) {
  const [state, setState] = useState<DraftState | null>(null);
  const [loading, setLoading] = useState(true);

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
    const interval = setInterval(fetchState, pollInterval);
    return () => clearInterval(interval);
  }, [fetchState, pollInterval]);

  return { state, loading, refetch: fetchState };
}
