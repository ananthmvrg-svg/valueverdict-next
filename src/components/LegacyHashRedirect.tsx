"use client";
/* Old links like valueverdict.in/#/c/washing-machines/under-25k go to the clean URL. */
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LegacyHashRedirect() {
  const router = useRouter();
  useEffect(() => {
    const m = location.hash.match(/^#\/c\/([^/]+)(?:\/([^/?#]+))?/);
    if (m) router.replace("/" + m[1] + (m[2] ? "/" + m[2] : ""));
    else if (location.hash === "#/") router.replace("/");
  }, [router]);
  return null;
}
