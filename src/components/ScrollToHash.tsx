"use client";
import { useEffect } from "react";

/* Category pages stream their picks in after the page opens, so a link like /tvs#55-inch-tvs (home page budget chips)
   can arrive before the 55″ section exists. Once this renders (inside that section's list), it scrolls to the hash,
   and corrects the position while product images above it are still loading, unless the visitor scrolls first. */
export default function ScrollToHash() {
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    const el = id ? document.getElementById(id) : null;
    if (!el) return;
    let stopped = false;
    const stop = () => { stopped = true; };
    const go = () => { if (!stopped) el.scrollIntoView({ block: "start" }); };
    go();
    const timers = [400, 1200, 2500].map((ms) => setTimeout(go, ms));
    window.addEventListener("wheel", stop, { once: true, passive: true });
    window.addEventListener("touchstart", stop, { once: true, passive: true });
    window.addEventListener("keydown", stop, { once: true });
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
  }, []);
  return null;
}
