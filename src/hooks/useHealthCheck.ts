import { useEffect, useRef, useState } from "react";

export type HealthStatus = "checking" | "online" | "offline";

const BASE_URL = import.meta.env.VITE_AYB_URL ?? "";
const HEALTH_URL = `${BASE_URL}/health`;
const TIMEOUT_MS = 5000;
const INITIAL_RETRY_S = 5;
const MAX_RETRY_S = 60;

export function useHealthCheck(): {
  status: HealthStatus;
  retryIn: number;
  retryNow: () => void;
} {
  const [status, setStatus] = useState<HealthStatus>("checking");
  const [retryIn, setRetryIn] = useState(0);
  const retryDelay = useRef(INITIAL_RETRY_S);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track offline state via ref so async callbacks always see the latest value
  const hadOfflineRef = useRef(false);

  function updateStatus(next: HealthStatus) {
    if (next === "offline") hadOfflineRef.current = true;
    setStatus(next);
  }

  async function check() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const resp = await fetch(HEALTH_URL, { signal: controller.signal });
      clearTimeout(timeout);
      if (resp.ok) {
        const wasOffline = hadOfflineRef.current;
        updateStatus("online");
        hadOfflineRef.current = false;
        retryDelay.current = INITIAL_RETRY_S;
        setRetryIn(0);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        // Dispatch event so other components can react to reconnection
        if (wasOffline) {
          window.dispatchEvent(new CustomEvent("ayb:reconnected"));
        }
      } else {
        startRetry();
      }
    } catch {
      startRetry();
    }
  }

  function startRetry() {
    updateStatus("offline");
    const delay = retryDelay.current;
    retryDelay.current = Math.min(delay * 2, MAX_RETRY_S);
    setRetryIn(delay);
    if (timerRef.current) clearInterval(timerRef.current);
    let remaining = delay;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        check();
      } else {
        setRetryIn(remaining);
      }
    }, 1000);
  }

  function retryNow() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    retryDelay.current = INITIAL_RETRY_S;
    setRetryIn(0);
    updateStatus("checking");
    check();
  }

  useEffect(() => {
    check();

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        check();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return { status, retryIn, retryNow };
}
