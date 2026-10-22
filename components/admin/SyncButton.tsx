'use client';

import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { fmtPrice, fmtMiles } from '@/lib/format';
import { syncFromSm360 } from '@/lib/db';

// "Sync from carsonexports.com": previews what the SM360 feed would change
// (writes nothing), then applies it on "Apply changes". Used on Admin →
// Inventory and Admin → Inventory sync.
export function SyncButton({ onSynced, disabled, label = 'Sync from carsonexports.com' }: { onSynced?: () => void; disabled?: boolean; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [syncPreview, setSyncPreview] = useState<any>(null);

  // Step 1: preview what the carsonexports.com feed would change (writes nothing).
  const previewSync = async () => {
    setBusy(true);
    const { error, data } = await syncFromSm360(false);
    setBusy(false);
    if (error) return alert('Couldn’t read carsonexports.com inventory: ' + error);
    setSyncPreview(data);
  };

  // Step 2: apply the previewed changes.
  const applySync = async () => {
    setBusy(true);
    const { error, data } = await syncFromSm360(true);
    setBusy(false);
    setSyncPreview(null);
    if (error) return alert('Sync failed: ' + error);
    const s = data.summary;
    alert(`Synced from carsonexports.com: ${s.add} added, ${s.update} updated, ${s.markSold} marked sold.`
      + (data.errors?.length ? `\n\nErrors:\n- ${data.errors.join('\n- ')}` : ''));
    onSynced?.();
  };

  return (
    <>
      <button onClick={previewSync} disabled={busy || disabled} className="btn btn-dark btn-sm">
        <Icon name="refresh" size={14} /> {busy ? 'Working…' : label}
      </button>
      <Modal open={!!syncPreview} onClose={() => setSyncPreview(null)} title="Sync from carsonexports.com" width={760}>
        {syncPreview && <SyncPreview data={syncPreview} busy={busy} onApply={applySync} onCancel={() => setSyncPreview(null)} />}
      </Modal>
    </>
  );
}

function SyncPreview({ data, busy, onApply, onCancel }: { data: any; busy: boolean; onApply: () => void; onCancel: () => void }) {
  const { plan, summary, migrationNeeded } = data;
  const fmtChange = (c: { field: string; from: any; to: any }) =>
    c.field === 'price' ? `price ${fmtPrice(c.from)} → ${fmtPrice(c.to)}`
      : c.field === 'mileage' ? `km ${fmtMiles(c.from)} → ${fmtMiles(c.to)}`
      : `${c.field} ${c.from ?? '—'} → ${c.to ?? '—'}`;
  const section = (title: string, color: string, items: { key: string; text: string; sub?: string }[]) => items.length > 0 && (
    <details style={{ marginBottom: 12 }} open={items.length <= 12}>
      <summary style={{ cursor: 'pointer', fontWeight: 700, color }}>{title} ({items.length})</summary>
      <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
        {items.map(i => <li key={i.key}>{i.text}{i.sub && <span style={{ color: 'var(--muted)' }}> — {i.sub}</span>}</li>)}
      </ul>
    </details>
  );
  const blocked = plan.blocked || migrationNeeded;
  return (
    <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
      <p style={{ fontSize: 14, margin: '0 0 14px' }}>
        Found <strong>{summary.fetched}</strong> vehicles on carsonexports.com.
        {' '}{summary.add} new · {summary.update} changed · {summary.markSold} to mark sold · {summary.unchanged} unchanged.
      </p>
      {plan.blocked && <p style={{ color: '#A8232C', fontWeight: 600 }}>{plan.blocked}</p>}
      {migrationNeeded && <p style={{ color: '#A8232C', fontWeight: 600 }}>Run supabase/migration-sm360.sql in Supabase before applying.</p>}
      {section('New vehicles', '#0F6B2D', plan.add.map((a: any) => ({ key: a.row.id, text: a.label, sub: `${fmtPrice(a.row.price)} · ${fmtMiles(a.row.mileage)} · ${a.row.images.length} photos` })))}
      {section('Updated vehicles', '#8A5400', plan.update.filter((u: any) => u.changes.length).map((u: any) => ({ key: u.id, text: u.label, sub: u.changes.map(fmtChange).join(' · ') })))}
      {section('Linked only (no visible change)', 'var(--muted)', plan.update.filter((u: any) => !u.changes.length).map((u: any) => ({ key: u.id, text: u.label })))}
      {section('Mark sold (no longer on carsonexports.com)', '#A8232C', plan.markSold.map((s: any) => ({ key: s.id, text: s.label })))}
      {section('Hidden drafts not in the feed (left alone)', 'var(--muted)', plan.hiddenNotInFeed.map((s: any) => ({ key: s.id, text: s.label })))}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <button onClick={onCancel} className="btn btn-ghost btn-sm">Cancel</button>
        <button onClick={onApply} disabled={busy || !!blocked} className="btn btn-primary btn-sm">
          {busy ? 'Applying…' : 'Apply changes'}
        </button>
      </div>
    </div>
  );
}
