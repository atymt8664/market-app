# P13-3-A — Google Search Console Runbook

**Owner:** Mohamed (property verification + sitemap submit)  
**Automation:** `index:p13:validate` (local/CI) · `index:p13:prod` (production read-only)  
**Charter:** [P13-3-index-monitoring-cwv.md](./P13-3-index-monitoring-cwv.md)

No verification tokens, API keys, or DNS record **values** belong in git.

---

## 1. Prerequisites (automated — must PASS before manual steps)

```bash
pnpm --filter @workspace/souq run index:p13:validate
pnpm --filter @workspace/souq run gsc:p13:validate
```

After deploy, with approval:

```bash
pnpm --filter @workspace/souq run index:p13:prod
pnpm --filter @workspace/souq run gsc:p13:prod
```

---

## 2. Create Search Console property

**Recommended:** Domain property for `souq-arab.com` (covers `www` and apex).

Alternative: URL-prefix `https://www.souq-arab.com/`

---

## 3. Verify ownership

**Preferred:** DNS TXT record at domain registrar / Cloudflare.

1. Search Console → Add property → Domain  
2. Copy TXT record name/value from GSC UI  
3. Add TXT at DNS provider  
4. Wait for propagation → Verify in GSC  

**Do not** commit the verification token to the repository.

**Alternative:** HTML `<meta name="google-site-verification" …>` in `index.html` — only if DNS is unavailable; add via approved deploy.

---

## 4. Submit sitemaps

In GSC → Sitemaps, submit:

```
https://www.souq-arab.com/sitemap.xml
https://www.souq-arab.com/sitemap-ads.xml
```

Expect `Success` after crawl. Ads sitemap grows with approved public listings.

---

## 5. URL Inspection spot-check

| URL | Expected |
|-----|----------|
| `https://www.souq-arab.com/` | Indexable; Organization + WebSite JSON-LD |
| `https://www.souq-arab.com/categories` | Indexable |
| `https://www.souq-arab.com/ad/{approved-id}` | Indexable; Product JSON-LD for Googlebot |

Use **URL Inspection → Test live URL** for a recent approved ad id from the public ads API.

---

## 6. Ongoing monitoring (weekly or after deploy)

| Check | Tool |
|-------|------|
| Coverage / Pages | GSC → Pages |
| Structured data | GSC → Enhancements |
| Sitemap errors | GSC → Sitemaps |
| Automated regression | `index:p13:prod` + `gsc:p13:prod` |

---

## 7. Failure response

| Symptom | Action |
|---------|--------|
| `sitemap-ads.xml` returns HTML | Vercel deploy / rewrite regression — run `gsc:p13:prod`, rollback frontend |
| Googlebot ad missing Product JSON-LD | Check `vercel.json` Googlebot rewrite → `/api/og` |
| Sudden noindex on public URLs | Check `seo-foundation.ts`, `index.html`; run `index:p13:validate` |
| Ads not in ads sitemap | Public API `/api/ads` must return approved ads; check API health |

---

## 8. Out of scope (P13-4)

- Bing Webmaster Tools verification and sitemaps

---

*P13-3-A — operational runbook only; secrets stay in DNS/GSC UI.*
