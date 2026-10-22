# Launch checklist: moving www.carsonexports.com to this site

The site currently runs on a temporary domain and sends `X-Robots-Tag: noindex`
on every page so Google doesn't index a duplicate of the live SM360 site.
Every old carsonexports.com URL already has a 301 redirect here
(`lib/legacyUrls.ts`, served by `app/en` and `app/fr`), so links and rankings
carry over the moment the domain points at Netlify.

## Before switching DNS
- [ ] Run the inventory sync (Admin → Inventory sync → Sync now) so stock matches.
- [ ] Spot-check old URLs on the temp domain: `/en/news/view/<slug>/<id>`,
      `/en/used-inventory/<make>/<model>/<...>-id<N>`, `/en/financing`.
- [ ] Netlify → Domain management: add `carsonexports.com` and `www.carsonexports.com`
      (primary: `www`), keep the temp domain as an alias.
- [ ] Netlify env vars (production):
      - `ALLOW_INDEXING=true` (removes the noindex header)
      - `NEXT_PUBLIC_SITE_URL=https://www.carsonexports.com` (canonicals, sitemap, emails)

## Switch
- [ ] Point DNS for `carsonexports.com` / `www` at Netlify (registrar, or SM360 if they manage DNS).
- [ ] Trigger a deploy so the new env vars take effect; wait for HTTPS.
- [ ] Ask SM360 to stop serving the old site (and its inventory feed only once a
      replacement feed is in place — the nightly sync reads their listing API).

## Right after
- [ ] `curl -I https://www.carsonexports.com/` → no `X-Robots-Tag: noindex`.
- [ ] `https://www.carsonexports.com/robots.txt` and `/sitemap.xml` use the new domain.
- [ ] Google Search Console (existing carsonexports.com property): submit `/sitemap.xml`,
      URL-inspect the homepage, a vehicle page and the driver's-licence article.
- [ ] Watch Search Console → Pages / Crawl stats for 404s over the first two weeks.
- [ ] GA4: confirm real-time traffic on the new site.

## Access to set up (for reporting)
- GA4 Admin → Property Access Management: add the service account (`GA4_CLIENT_EMAIL`) as Viewer.
- Search Console: add the same email as a user on the carsonexports.com property.
