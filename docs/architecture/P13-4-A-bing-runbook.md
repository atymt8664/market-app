# P13-4-A — Bing Webmaster Tools runbook

**Scope:** Manual verification on **PRODUCTION** only (`https://www.souq-arab.com`).  
**No secrets** in git, docs, or chat.

---

## 1. Prerequisites

- P13-4 deployed to Vercel (crawler rewrites + `llms.txt`)
- `pnpm --filter @workspace/souq run bing:p13:prod` PASS locally
- Bing Webmaster Tools property access (Mohamed)

---

## 2. Add site property

1. Open [Bing Webmaster Tools](https://www.bing.com/webmasters/)
2. Add site: `https://www.souq-arab.com`
3. Verify via DNS TXT or CNAME (same pattern as GSC — credentials stay off-repo)

---

## 3. Submit sitemaps

| URL | Purpose |
|-----|---------|
| `https://www.souq-arab.com/sitemap.xml` | Static public pages |
| `https://www.souq-arab.com/sitemap-ads.xml` | Approved public ads |

---

## 4. URL inspection checklist

| URL | Expected |
|-----|----------|
| `https://www.souq-arab.com/` | Indexable; Organization + WebSite + WebApplication JSON-LD |
| `https://www.souq-arab.com/categories` | Indexable |
| `https://www.souq-arab.com/ad/{approved-id}` | Indexable; Product JSON-LD for Bingbot |
| `https://www.souq-arab.com/llms.txt` | 200; machine-readable site summary |

**Automated Bingbot check:** `bing:p13:prod`

---

## 5. robots.txt

Confirm Bingbot block allows public paths and blocks `/admin`, `/admin-login`, `/api/`.

---

## 6. Troubleshooting

| Symptom | Check |
|---------|-------|
| Bingbot ad missing Product JSON-LD | `vercel.json` includes `Bingbot` in `/ad/:id` rewrite; redeploy Vercel |
| Homepage missing KG on Bingbot | `api/og?route=home` includes P3 JSON-LD; run `discoverability:p13:prod` |
| Sitemap errors | `index:p13:prod`, live fetch of both sitemaps |

---

## 7. Out of scope

- Google Search Console (P13-1 / P13-3-A)
- IndexNow API keys
- Paid Bing Ads

---

*Last updated: P13-4 implementation.*
