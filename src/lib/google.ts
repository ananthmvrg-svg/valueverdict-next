import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

/* Google sign-in for our read-only service account, shared by Search Console (lib/gsc.ts) and GA4 (lib/ga4.ts).
   Its JSON key: GSC_SERVICE_ACCOUNT_JSON = the key file's contents (GitHub secret), or GSC_SERVICE_ACCOUNT_FILE =
   its path (local). The same account is added as a Restricted user in Search Console and as a Viewer in GA4. */

type Key = { client_email: string; private_key: string };
const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

export function serviceKey(): Key | null {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON || (process.env.GSC_SERVICE_ACCOUNT_FILE ? readFileSync(process.env.GSC_SERVICE_ACCOUNT_FILE, "utf8") : "");
  if (!raw.trim()) return null;
  const k = JSON.parse(raw) as Key;
  if (!k.client_email || !k.private_key) throw new Error("Google service account key is missing client_email or private_key");
  return k;
}

/* OAuth for service accounts: a signed JWT exchanged for an access token for one read-only scope */
export async function googleToken(k: Key, scope: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({ iss: k.client_email, scope, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const sig = b64url(createSign("RSA-SHA256").update(`${head}.${claim}`).sign(k.private_key));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claim}.${sig}` }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`Google sign-in failed: ${r.status} ${j.error ?? ""}`.trim());
  return j.access_token as string;
}
