/** @type {import('next').NextConfig} */

// Content-Security-Policy for this site's real dependencies:
//  • inline styles everywhere (style-src 'unsafe-inline')
//  • Next.js hydration inline scripts + GA/GTM + shawnryder.site analytics
//  • YouTube hero embeds (frame-src)
//  • images from Supabase Storage, YouTube thumbs, and dealer-hosted photos
//    (img-src https: — broad, since inventory photos can live anywhere; images
//    are not a script-execution vector)
//  • Supabase auth/db/storage/realtime + GA beacons (connect-src, incl. wss)
// Shipped as Report-Only so it cannot break the live site. After deploying,
// check the browser console for CSP violation reports; if clean, rename the
// header key to 'Content-Security-Policy' to enforce.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://shawnryder.site",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://shawnryder.site https://www.google-analytics.com https://region1.google-analytics.com",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy-Report-Only', value: csp },
];

// Pre-launch: this site will become www.carsonexports.com. Until then it runs
// on a temporary domain that must stay out of Google (it duplicates the live
// site). Every response gets `noindex` unless ALLOW_INDEXING=true. robots.txt
// stays open on purpose — Google has to crawl a page to see its noindex.
// Launch day: set ALLOW_INDEXING=true and NEXT_PUBLIC_SITE_URL, then redeploy.
const allowIndexing = process.env.ALLOW_INDEXING === 'true';

const nextConfig = {
  async headers() {
    return [{
      source: '/:path*',
      headers: allowIndexing ? securityHeaders : [...securityHeaders, { key: 'X-Robots-Tag', value: 'noindex' }],
    }];
  },
  async redirects() {
    // /inventory-search was a second, near-identical AI search page. Folded
    // into /finder; the redirect keeps any inbound links working.
    return [
      { source: '/inventory-search', destination: '/finder', permanent: true },
      // The sample buying guides were replaced by the imported News & Guides articles.
      { source: '/guides', destination: '/news', permanent: true },
      { source: '/guides/:slug', destination: '/news', permanent: true },
    ];
  },
};

module.exports = nextConfig;
