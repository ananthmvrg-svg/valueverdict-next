# Value Verdict (Next.js)

Next.js 16 rebuild of valueverdict.in. Same design and URLs as the old single-page site
(`valueverdict-site`), but every category and budget page is pre-built as real HTML for SEO.

## Run locally

```
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (also fetches the catalog)
```

## Where things live

- `src/lib/config.ts` – editable text, tracking IDs, Flipkart switch
- `src/lib/catalog.ts` – loads the catalog (Google Sheet for now; database next), cached 1 hour
- `src/components/` – header menu, product card, filters, live Amazon deals
- `src/app/` – pages: `/`, `/[category]`, `/[category]/[sub]`, `/api/amazon-deals`

Secrets go in `.env.local` / Netlify environment variables; see `.env.example`.
