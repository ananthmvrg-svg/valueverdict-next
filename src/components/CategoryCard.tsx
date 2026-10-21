"use client";
/* Home page category card: the whole card opens the category; budget chips inside still go to their budget. */
import { useRouter } from "next/navigation";

export default function CategoryCard({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="cat" data-href={href} onClick={(e) => { if (!(e.target as Element).closest("a")) router.push(href); }}>
      {children}
    </div>
  );
}
