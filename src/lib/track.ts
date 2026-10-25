/* Google Analytics 4 events from the browser (does nothing when GA isn't loaded, e.g. blocked).
   Amazon button clicks are already sent as "store_click" by components/Tracking.tsx. */
type Gtag = (...args: unknown[]) => void;

export function track(event: string, params: Record<string, string | number | boolean | undefined> = {}) {
  if (typeof window === "undefined") return;
  (window as unknown as { gtag?: Gtag }).gtag?.("event", event, params);
}
