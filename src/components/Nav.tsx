"use client";
/* One line of category links; scrolls sideways when they don't fit, edges fade where links are hidden. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export default function Nav({ cats }: { cats: { name: string; slug: string }[] }) {
  const active = usePathname().split("/")[1] || "";
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const nl = ref.current;
    if (!nl) return;
    const fade = () => {
      nl.style.setProperty("--fl", nl.scrollLeft > 2 ? "32px" : "0px");
      nl.style.setProperty("--fr", nl.scrollLeft + nl.clientWidth < nl.scrollWidth - 2 ? "32px" : "0px");
    };
    const on = nl.querySelector<HTMLElement>("a.on");
    if (on) nl.scrollLeft = on.offsetLeft - (nl.clientWidth - on.offsetWidth) / 2;
    fade();
    nl.addEventListener("scroll", fade, { passive: true });
    addEventListener("resize", fade);
    return () => { nl.removeEventListener("scroll", fade); removeEventListener("resize", fade); };
  }, [active]);

  return (
    <nav className="nav-links" ref={ref}>
      <Link href="/" className={active ? "" : "on"}>Home</Link>
      <Link href="/top-deals" className={active === "top-deals" ? "on" : ""}>🔥 Top 100</Link>
      {cats.map((c) => <Link key={c.slug} href={`/${c.slug}`} className={active === c.slug ? "on" : ""}>{c.name}</Link>)}
      <Link href="/about" className={active === "about" ? "on" : ""}>About</Link>
    </nav>
  );
}
