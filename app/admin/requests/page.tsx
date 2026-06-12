'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { getBrowserClient } from '@/lib/supabase/client';
import { listCarRequests, setCarRequestActive, deleteCarRequest, listVehicles, getAlertWebhookUrl, saveAlertWebhookUrl, isSupabaseConfigured, CarRequest, AdminVehicle } from '@/lib/db';
import { matchesRequest, newMatchesFor, describeRequest } from '@/lib/carMatch';

export default function AdminCarRequests() {
  const [requests, setRequests] = useState<CarRequest[]>([]);
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [webhook, setWebhook] = useState('');
  const [webhookMsg, setWebhookMsg] = useState<string | null>(null);

  const load = async () => {
    const [r, v, w] = await Promise.all([listCarRequests(), listVehicles({ includeHidden: true }), getAlertWebhookUrl()]);
    setRequests(r);
    setVehicles(v);
    setWebhook(w);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (r: CarRequest) => {
    setBusy(true);
    await setCarRequestActive(r.id!, !r.active);
    await load();
    setBusy(false);
  };

  const del = async (r: CarRequest) => {
    if (!confirm(`Delete ${r.name}'s request? They will no longer receive alerts.`)) return;
    setBusy(true);
    await deleteCarRequest(r.id!);
    await load();
    setBusy(false);
  };

  const saveWebhook = async () => {
    setBusy(true);
    setWebhookMsg(null);
    const { error } = await saveAlertWebhookUrl(webhook);
    setWebhookMsg(error ? `Error: ${error}` : 'Saved.');
    setBusy(false);
  };

  const testWebhook = async () => {
    setBusy(true);
    setWebhookMsg(null);
    try {
      const sb = getBrowserClient();
      const { data } = await sb!.auth.getSession();
      const token = data?.session?.access_token;
      const res = await fetch('/api/match-alerts?test=1', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) setWebhookMsg(`Error: ${json.error || res.status}`);
      else setWebhookMsg(json.ok
        ? '✓ Test payload delivered — check your automation tool for a "Test Shopper / 2021 Toyota RAV4" alert.'
        : 'Webhook responded with an error — double-check the URL.');
    } catch (e: any) {
      setWebhookMsg(`Error: ${e?.message || 'failed'}`);
    }
    setBusy(false);
  };

  const runAlerts = async () => {
    setBusy(true);
    setRunResult(null);
    try {
      const sb = getBrowserClient();
      const { data } = await sb!.auth.getSession();
      const token = data?.session?.access_token;
      const res = await fetch('/api/match-alerts', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) setRunResult(`Error: ${json.error || res.status}`);
      else {
        const channels = [
          json.webhookConfigured && 'webhook',
          json.emailConfigured && 'email',
          json.smsConfigured && 'SMS',
        ].filter(Boolean).join(', ') || 'none configured';
        setRunResult(`Checked ${json.requestsChecked} request(s) · ${json.requestsWithNewMatches} with new matches · ${json.alertsSent} alert(s) sent (channels: ${channels}).`);
      }
    } catch (e: any) {
      setRunResult(`Error: ${e?.message || 'failed'}`);
    }
    await load();
    setBusy(false);
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading…</div>;

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 6 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px' }}>CarFinder requests</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
            Shoppers waiting for a specific vehicle. Alerts go out automatically after every inventory sync.
          </p>
        </div>
        <button onClick={runAlerts} disabled={busy || !isSupabaseConfigured} className="btn btn-dark btn-sm">
          <Icon name="sparkles" size={13} /> {busy ? 'Working…' : 'Run alerts now'}
        </button>
      </div>

      {/* Alert delivery webhook */}
      <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 18px', marginTop: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 6 }}>
          Alert delivery webhook
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.5 }}>
          Paste a webhook URL from Zapier, Make, or GoHighLevel — every match is POSTed there with the shopper&apos;s
          contact info, preferred channel (email/text), and the matched vehicles. Your automation sends the actual message.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="input"
            value={webhook}
            onChange={e => setWebhook(e.target.value)}
            placeholder="https://hooks.zapier.com/hooks/catch/…"
            style={{ flex: 1, minWidth: 280 }}
          />
          <button onClick={saveWebhook} disabled={busy} className="btn btn-primary btn-sm">Save</button>
          <button onClick={testWebhook} disabled={busy || !webhook} className="btn btn-ghost btn-sm">Send test webhook</button>
        </div>
        {webhookMsg && (
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 10, color: webhookMsg.startsWith('Error') || webhookMsg.startsWith('Webhook') ? '#A8232C' : 'var(--teal-2)' }}>
            {webhookMsg}
          </div>
        )}
      </div>

      {runResult && (
        <div style={{ background: runResult.startsWith('Error') ? '#FDECEC' : 'var(--teal-tint)', color: runResult.startsWith('Error') ? '#A8232C' : 'var(--teal-2)', borderRadius: 10, padding: '12px 14px', fontSize: 13.5, margin: '14px 0' }}>
          {runResult}
        </div>
      )}

      {requests.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: 40, textAlign: 'center', marginTop: 20 }}>
          <Icon name="search" size={30} style={{ opacity: 0.3, marginBottom: 10 }} />
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>No requests yet</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>
            Requests submitted at <strong>/carfinder</strong> will appear here.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
          {requests.map(r => {
            const current = vehicles.filter(v => matchesRequest(v as any, r));
            const fresh = newMatchesFor(vehicles as any[], r);
            return (
              <div key={r.id} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 18px', opacity: r.active ? 1 : 0.55 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{r.name}</span>
                      <span style={{ background: 'var(--bg-soft)', borderRadius: 999, padding: '2px 10px', fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                        {r.contactPref === 'sms' ? '💬 text' : '✉️ email'}
                      </span>
                      {!r.active && <span style={{ fontSize: 11.5, fontWeight: 700, color: '#8A5400' }}>paused</span>}
                    </div>
                    <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 600, marginBottom: 4 }}>{describeRequest(r)}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                      {[r.email, r.phone].filter(Boolean).join(' · ')}
                      {r.createdAt && <> · requested {new Date(r.createdAt).toLocaleDateString()}</>}
                    </div>
                    {r.notes && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>&ldquo;{r.notes}&rdquo;</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: fresh.length > 0 ? 'var(--teal)' : 'var(--ink)' }}>
                        {current.length} match{current.length === 1 ? '' : 'es'} in stock
                      </div>
                      <div style={{ fontSize: 11.5, color: fresh.length > 0 ? 'var(--teal)' : 'var(--muted)', fontWeight: 600 }}>
                        {fresh.length > 0 ? `${fresh.length} not yet alerted` : 'all alerted'}
                      </div>
                    </div>
                    <button onClick={() => toggle(r)} disabled={busy} className="btn btn-ghost btn-sm">{r.active ? 'Pause' : 'Resume'}</button>
                    <button onClick={() => del(r)} disabled={busy} className="btn btn-ghost btn-sm" style={{ color: '#A8232C' }}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', fontSize: 12.5, color: 'var(--muted)', marginTop: 22, lineHeight: 1.6 }}>
        <strong>How it works:</strong> alerts run automatically after every scheduled inventory sync (and via &ldquo;Run alerts now&rdquo;).
        Each shopper is only alerted once per vehicle. If no webhook is set, the system falls back to
        <code> RESEND_API_KEY</code> (email) / <code>TWILIO_*</code> (SMS) env vars if configured.
      </div>
    </div>
  );
}
