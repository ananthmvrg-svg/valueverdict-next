"use client";
/* Google Analytics 4, Meta Pixel and X Pixel (each only if its ID is set in config),
   page views on every client-side navigation, and an event for every Amazon/Flipkart button click. */
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { TRACK } from "@/lib/config";

type Fn = (...args: unknown[]) => void;
declare global { interface Window { gtag?: Fn; fbq?: Fn; twq?: Fn } }

export default function Tracking() {
  const path = usePathname();
  const first = useRef(true);

  /* the base snippets count the first page view; later client-side navigations are sent here */
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (TRACK.ga4) window.gtag?.("event", "page_view", { page_path: path, page_location: location.href, page_title: document.title });
    if (TRACK.meta) window.fbq?.("track", "PageView");
  }, [path]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.<HTMLAnchorElement>("a.btn.amz, a.btn.fk");
      if (!a) return;
      const store = a.classList.contains("amz") ? "Amazon" : "Flipkart";
      const product = a.closest(".card")?.querySelector("h4")?.textContent?.trim() || "";
      if (TRACK.ga4) window.gtag?.("event", "store_click", { store, product, link_url: a.href, transport_type: "beacon" });
      if (TRACK.meta) window.fbq?.("trackCustom", "StoreClick", { store, product });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <>
      {TRACK.ga4 && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${TRACK.ga4}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments);};gtag("js",new Date());gtag("config","${TRACK.ga4}");`}</Script>
        </>
      )}
      {TRACK.meta && (
        <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq("init","${TRACK.meta}");fbq("track","PageView");`}</Script>
      )}
      {TRACK.x && (
        <Script id="x-pixel" strategy="afterInteractive">{`!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');twq('config','${TRACK.x}');`}</Script>
      )}
    </>
  );
}
