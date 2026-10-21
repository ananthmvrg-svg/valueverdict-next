import Link from "next/link";

export default function NotFound() {
  return (
    <section>
      <div className="wrap">
        <div className="empty">
          This page doesn&apos;t exist. <Link href="/" style={{ color: "#0b63c5", fontWeight: 700 }}>Browse all categories</Link>
        </div>
      </div>
    </section>
  );
}
