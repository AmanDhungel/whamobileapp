import { useCallback, useEffect, useState } from "react";

/** Seconds-remaining countdown (e.g. the 60s "Resend" cooldown on the code step). */
export function useCountdown() {
  const [seconds, setSeconds] = useState(0);
  const active = seconds > 0;

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setSeconds((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(timer);
  }, [active]);

  const start = useCallback((from: number) => setSeconds(from), []);

  return { seconds, active, start };
}
