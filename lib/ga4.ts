// Server-only Google Analytics 4 Data API client. NEVER import this from a
// 'use client' file — it signs a service-account JWT with Node's crypto
// module and holds an in-memory access token. Callers go through
// app/api/ga4-report/route.ts instead.
//
// Hand-rolled service-account auth (RFC 7523 JWT bearer) instead of the
// `googleapis` package — this needs exactly two HTTPS calls (token exchange +
// runReport), so a multi-MB client library isn't worth the weight.
import { createSign } from 'crypto';

const PROPERTY_ID = process.env.GA4_PROPERTY_ID || '';
const CLIENT_EMAIL = process.env.GA4_CLIENT_EMAIL || '';
const PRIVATE_KEY_RAW = process.env.GA4_PRIVATE_KEY || '';

export const isGa4Configured = !!(PROPERTY_ID && CLIENT_EMAIL && PRIVATE_KEY_RAW);

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function privateKeyPem(): string {
  return PRIVATE_KEY_RAW.replace(/\\n/g, '\n');
}

function buildAssertion(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: CLIENT_EMAIL,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const input = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = createSign('RSA-SHA256').update(input).sign(privateKeyPem());
  return `${input}.${base64url(signature)}`;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const assertion = buildAssertion();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GA4 token exchange failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

async function runReport(body: Record<string, any>): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = json?.error?.message || `HTTP ${res.status}`;
    const err = new Error(`GA4 runReport failed: ${message}`);
    (err as any).ga4Error = json?.error;
    throw err;
  }
  return json;
}

export type Ga4Totals = { sessions: number; pageviews: number; users: number };

export async function getGa4Totals(from: string, to: string): Promise<Ga4Totals> {
  const json = await runReport({
    dateRanges: [{ startDate: from, endDate: to }],
    metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }, { name: 'totalUsers' }],
  });
  const values = json.rows?.[0]?.metricValues || [];
  return {
    sessions: Number(values[0]?.value || 0),
    pageviews: Number(values[1]?.value || 0),
    users: Number(values[2]?.value || 0),
  };
}

const TRACKED_EVENTS = ['generate_lead', 'view_item', 'search', 'price_alert_signup'];

export type Ga4EventCounts = Record<string, number>;

export async function getGa4EventCounts(from: string, to: string): Promise<Ga4EventCounts> {
  const json = await runReport({
    dateRanges: [{ startDate: from, endDate: to }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: { values: TRACKED_EVENTS },
      },
    },
  });
  const out: Ga4EventCounts = {};
  TRACKED_EVENTS.forEach(e => { out[e] = 0; });
  (json.rows || []).forEach((row: any) => {
    const name = row.dimensionValues?.[0]?.value;
    const count = Number(row.metricValues?.[0]?.value || 0);
    if (name) out[name] = count;
  });
  return out;
}

export type Ga4SearchTerm = { term: string; count: number };

export async function getGa4TopSearchTerms(from: string, to: string, limit = 10): Promise<{ terms: Ga4SearchTerm[]; unavailable?: boolean }> {
  try {
    const json = await runReport({
      dateRanges: [{ startDate: from, endDate: to }],
      dimensions: [{ name: 'customEvent:search_term' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: { fieldName: 'eventName', stringFilter: { value: 'search' } },
      },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit,
    });
    const terms = (json.rows || []).map((row: any) => ({
      term: row.dimensionValues?.[0]?.value || '(not set)',
      count: Number(row.metricValues?.[0]?.value || 0),
    }));
    return { terms };
  } catch (e: any) {
    // search_term isn't registered as a GA4 custom dimension yet — degrade
    // gracefully instead of failing the whole report.
    const message = String(e?.ga4Error?.message || e?.message || '');
    if (/dimension|customEvent/i.test(message)) return { terms: [], unavailable: true };
    throw e;
  }
}
