"use client";
import { useEffect, useRef, useCallback } from "react";

export function useNotifications() {
  const lastNotifiedPick = useRef(-1);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Request notification permission on mount
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  const playChime = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio not available
    }
  }, []);

  const notifyTurn = useCallback(
    (currentPickIndex: number) => {
      if (currentPickIndex === lastNotifiedPick.current) return;
      lastNotifiedPick.current = currentPickIndex;

      playChime();

      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("March Madness Draft", {
          body: "It's your turn to pick!",
          icon: "/icon-192.png",
          tag: "your-turn",
        });
      }
    },
    [playChime]
  );

  return { notifyTurn };
}
