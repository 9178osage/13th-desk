import { useEffect, useState } from "react";
import { resolveNow } from "@/lib/calendar";

// A null server snapshot prevents timezone/date hydration mismatches.
export function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(resolveNow());
    tick();
    const timer = window.setInterval(tick, 30_000);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", tick);
    };
  }, []);
  return now;
}
