"use client";

import { useSyncExternalStore } from "react";

// True below Tailwind's md breakpoint. Only for values JavaScript needs (widths, handlers);
// layout switching uses md: classes so the first paint is right on every device.
const QUERY = "(max-width: 767px)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
