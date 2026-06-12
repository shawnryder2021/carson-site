'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { fmtPrice, fmtMiles } from '@/lib/format';
import { complete, generateDescriptionPrompt } from '@/lib/ai';
import { listVehicles, deleteVehicle, importStarterVehicles, syncFromSheet, setVehicleHidden, saveVehicle, isSupabaseConfigured, AdminVehicle } from '@/lib/db';

export default function AdminInventory() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true);
    setVehicles(await listVehicles({ includeHidden: true }));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string, label: string) => {
    if (!confirm(`Delete ${label}? This can’t be undone.`)) return;
    setBusy(true);
    const { error } = await deleteVehicle(id);
    setBusy(false);
    if (error) return alert(error);
    load();
  };

  const importStarter = async () => {
    setBusy(true);
    const { error, count } = await importStarterVehicles();
    setBusy(false);
    if (error) return alert(error);
    alert(`Imported ${count} starter vehicles.`);
    load();
  };

  const toggleHide = async (id: string, hidden: boolean) => {
    setBusy(true);
    const { error } = await setVehicleHidden(id, hidden);
    setBusy(false);
    if (error) return alert(error);
    load();
  };

  // Generate descriptions for vehicles whose summary is missing or thin
  // (sheet-synced cars default to just "year make model").
  const aiFillDescriptions = async () => {
    const thin = vehicles.filter(v => ((v.aiSummary || '').trim().length < 40) && (v as any).status !== 'sold');
    if (thin.length === 0) return alert('All vehicles already have descriptions.');
    if (!confirm(`Write AI descriptions for ${thin.length} vehicle(s) with missing/thin descriptions?`)) return;
    setBusy(true);
    let done = 0;
    const failed: string[] = [];
    for (const v of thin) {
      try {
        const reply = await complete(generateDescriptionPrompt(v));
        const { error } = await saveVehicle({ ...v, aiSummary: reply.trim().replace(/^["']|["']$/g, '') });
        if (error) failed.push(`${v.make} ${v.model}`);
        else done++;
        await new Promise(r => setTimeout(r, 400)); // gentle on rate limits
      } catch {
        failed.push(`${v.make} ${v.model}`);
      }
    }
    setBusy(false);
    alert(`Wrote ${done} description(s).` + (failed.length ? `\nFailed: ${failed.join(', ')}` : ''));
    load();
  };

  const syncSheet = async () => {
    setBusy(true);
    const { error, count, warnings } = await syncFromSheet();
    setBusy(false);
    if (error) return alert('Sync failed: ' + error);
    alert(`Synced ${count} vehicles from the Google Sheet.` + (warnings && warnings.length ? `\n\nNotes:\n- ${warnings.join('\n- ')}` : ''));
    load();
  };

  const filtered = vehicles.filter(v => `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(q.toLowerCase()));

  const statusColor: Record<string, string> = { available: '#0F6B2D', sold: '#A8232C', hidden: '#8A8A8A' };

  return (
    <div style={{ padding: '32px 40px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: 0 }}>Inventory</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={importStarter} disabled={busy || !isSupabaseConfigured} className="btn btn-ghost btn-sm">
            <Icon name="arrowRight" size={13} /> Import starter inventory
          </button>
          <button onClick={aiFillDescriptions} disabled={busy || !isSupabaseConfigured} className="btn btn-ghost btn-sm">
            <Icon name="sparkles" size={13} /> AI-fill missing descriptions
          </button>
          <button onClick={syncSheet} disabled={busy || !isSupabaseConfigured} className="btn btn-dark btn-sm">
            <Icon name="sparkles" size={14} /> {busy ? 'Working…' : 'Sync from Google Sheet'}
          </button>
          <button onClick={() => router.push('/admin/inventory/new')} className="btn btn-primary btn-sm">
            <Icon name="car" size={14} /> Add vehicle
          </button>
        </div>
      </div>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px' }}>{vehicles.length} vehicles</p>

      <input className="input" placeholder="Search make, model, year…" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 360, marginBottom: 18 }} />

      <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No vehicles. Add one or import the starter set.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: 12 }}>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Vehicle</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Price</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Days on lot</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Views</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => {
                const hidden = !!v.hiddenOverride;
                const days = v.createdAt ? Math.max(0, Math.floor((Date.now() - new Date(v.createdAt).getTime()) / 86400000)) : null;
                return (
                <tr key={v.id} style={{ borderBottom: '1px solid var(--line)', opacity: hidden ? 0.55 : 1 }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{v.year} {v.make} {v.model}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{v.body} · {v.fuel} · {v.drive}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{fmtPrice(v.price)}</td>
                  <td style={{ padding: '12px 16px', color: days !== null && days >= 60 ? '#A8232C' : days !== null && days >= 30 ? '#8A5400' : 'var(--ink)' }}>
                    {days === null ? '—' : days === 0 ? 'Today' : `${days}d`}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{v.views ?? 0}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {hidden ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#8A8A8A' }}>HIDDEN (admin)</span>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 700, color: statusColor[(v as any).status || 'available'] }}>
                        {((v as any).status || 'available').toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button onClick={() => toggleHide(v.id, !hidden)} disabled={busy} className="btn btn-ghost btn-sm" style={{ marginRight: 6 }}>
                      {hidden ? 'Show' : 'Hide'}
                    </button>
                    <button onClick={() => router.push(`/admin/inventory/${v.id}`)} className="btn btn-ghost btn-sm" style={{ marginRight: 6 }}>Edit</button>
                    <button onClick={() => remove(v.id, `${v.year} ${v.make} ${v.model}`)} disabled={busy} className="btn btn-ghost btn-sm" style={{ color: '#A8232C' }}>Delete</button>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
