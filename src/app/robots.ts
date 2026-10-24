import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

/* robots.txt: everything except the data endpoints may be crawled */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
