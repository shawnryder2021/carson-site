'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { listNav, saveNav, DEFAULT_NAV, isSupabaseConfigured, NavItem } from '@/lib/db';

export default function AdminNavigation() {
  const [items, setItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { listNav().then(n => { setItems(n); setLoading(false); }); }, []);

  const update = (i: number, patch: Partial<NavItem>) => setItems(it => it.map((x, j) => j === i ? { ...x, ...patch } : x));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setItems(copy);
  };
  const addTop = () => setItems(it => [...it, { label: 'New item', href: '/', children: [] }]);
  const removeTop = (i: number) => setItems(it => it.filter((_, j) => j !== i));

  const addChild = (i: number) => update(i, { children: [...(items[i].children || []), { label: 'New link', href: '/' }] });
  const updateChild = (i: number, ci: number, patch: any) => update(i, { children: (items[i].children || []).map((c, j) => j === ci ? { ...c, ...patch } : c) });
  const removeChild = (i: number, ci: number) => update(i, { children: (items[i].children || []).filter((_, j) => j !== ci) });

  const save = async () => {
    setError(null); setSaving(true);
    const { error } = await saveNav(items);
    setSaving(false);
    if (error) { setError(error); return; }
    setSaved(true); setTimeout(() => setSaved(false), 2200);
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading…</div>;

  return (
    <div style={{ padding: '32px 40px 80px', maxWidth: 820 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: 0 }}>Navigation</h1>
        <button onClick={() => setItems(DEFAULT_NAV)} className="btn btn-ghost btn-sm">Reset to default</button>
      </div>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '6px 0 24px' }}>Edit the top menu and its dropdowns. Use <code>/inventory</code>, <code>/finder</code>, or full <code>https://</code> links.</p>

      {!isSupabaseConfigured && (
        <div style={{ background: '#FFF4E5', color: '#8A5400', borderRadius: 12, padding: '14px 16px', fontSize: 14, marginBottom: 20 }}>Connect Supabase to save navigation changes.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((item, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <button onClick={() => move(i, -1)} disabled={i === 0} className="icon-btn" style={{ opacity: i === 0 ? 0.3 : 1 }}><Icon name="chevronUp" size={16} /></button>
                <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="icon-btn" style={{ opacity: i === items.length - 1 ? 0.3 : 1 }}><Icon name="chevronDown" size={16} /></button>
              </div>
              <input className="input" value={item.label} onChange={e => update(i, { label: e.target.value })} placeholder="Label" style={{ flex: 1 }} />
              <input className="input" value={item.href} onChange={e => update(i, { href: e.target.value })} placeholder="/path" style={{ flex: 1 }} />
              <button onClick={() => removeTop(i)} className="btn btn-ghost btn-sm" style={{ color: '#A8232C' }}>Remove</button>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 10, paddingLeft: 36 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--muted)' }}>
                <input type="checkbox" checked={!!item.autoCategories} onChange={e => update(i, { autoCategories: e.target.checked })} style={{ accentColor: 'var(--teal)' }} />
                Auto "browse by type" dropdown (SUVs, Sedans…)
              </label>
            </div>

            {/* Children */}
            <div style={{ paddingLeft: 36, marginTop: 10 }}>
              {(item.children || []).map((c, ci) => (
                <div key={ci} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <Icon name="arrowRight" size={13} style={{ color: 'var(--muted)' }} />
                  <input className="input" value={c.label} onChange={e => updateChild(i, ci, { label: e.target.value })} placeholder="Sub-item label" style={{ flex: 1 }} />
                  <input className="input" value={c.href} onChange={e => updateChild(i, ci, { href: e.target.value })} placeholder="/path" style={{ flex: 1 }} />
                  <button onClick={() => removeChild(i, ci)} className="btn btn-ghost btn-sm" style={{ color: '#A8232C' }}>×</button>
                </div>
              ))}
              <button onClick={() => addChild(i)} className="btn btn-ghost btn-sm">+ Add sub-item</button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addTop} className="btn btn-ghost" style={{ marginTop: 14 }}><Icon name="sparkles" size={14} /> Add menu item</button>

      {error && <div style={{ background: '#FDECEE', color: '#A8232C', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginTop: 16 }}>{error}</div>}

      <div style={{ position: 'sticky', bottom: 0, marginTop: 24, padding: '16px 0' }}>
        <button onClick={save} disabled={saving || !isSupabaseConfigured} className="btn btn-primary btn-lg">
          {saved ? <><Icon name="check" size={16} /> Saved!</> : saving ? 'Saving…' : 'Save navigation'}
        </button>
      </div>
    </div>
  );
}
