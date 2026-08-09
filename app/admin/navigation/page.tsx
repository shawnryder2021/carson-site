'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { listNav, saveNav, listPages, DEFAULT_NAV, isSupabaseConfigured, NavItem, CustomPage } from '@/lib/db';

function reorder<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

export default function AdminNavigation() {
  const [items, setItems] = useState<NavItem[]>([]);
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drag state
  const [dragTop, setDragTop] = useState<number | null>(null);
  const [dragChild, setDragChild] = useState<{ p: number; c: number } | null>(null);

  useEffect(() => {
    listNav().then(n => { setItems(n); setLoading(false); });
    listPages().then(setPages).catch(() => {});
  }, []);

  const update = (i: number, patch: Partial<NavItem>) => setItems(it => it.map((x, j) => j === i ? { ...x, ...patch } : x));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    setItems(reorder(items, i, j));
  };
  const addTop = () => setItems(it => [...it, { label: 'New item', href: '/', children: [] }]);
  const removeTop = (i: number) => setItems(it => it.filter((_, j) => j !== i));

  const addChild = (i: number) => update(i, { children: [...(items[i].children || []), { label: 'New link', href: '/' }] });
  const updateChild = (i: number, ci: number, patch: any) => update(i, { children: (items[i].children || []).map((c, j) => j === ci ? { ...c, ...patch } : c) });
  const removeChild = (i: number, ci: number) => update(i, { children: (items[i].children || []).filter((_, j) => j !== ci) });

  // ── Drag handlers (top level) ──
  const onTopDrop = (target: number) => {
    if (dragTop === null || dragTop === target) return setDragTop(null);
    setItems(reorder(items, dragTop, target));
    setDragTop(null);
  };
  // ── Drag handlers (children within one parent) ──
  const onChildDrop = (p: number, target: number) => {
    if (!dragChild || dragChild.p !== p || dragChild.c === target) return setDragChild(null);
    update(p, { children: reorder(items[p].children || [], dragChild.c, target) });
    setDragChild(null);
  };

  const save = async () => {
    setError(null); setSaving(true);
    const { error } = await saveNav(items);
    setSaving(false);
    if (error) { setError(error); return; }
    setSaved(true); setTimeout(() => setSaved(false), 2200);
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading…</div>;

  const pagePaths = pages.map(p => `/p/${p.slug}`);

  return (
    <div style={{ padding: '32px 40px 80px', maxWidth: 820 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: 0 }}>Navigation</h1>
        <button onClick={() => setItems(DEFAULT_NAV)} className="btn btn-ghost btn-sm">Reset to default</button>
      </div>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '6px 0 24px' }}>
        <strong>Drag the ⠿ handle</strong> to reorder items and sub-items. Use <code>/inventory</code>, <code>/p/your-page</code>, or full <code>https://</code> links.
      </p>

      {!isSupabaseConfigured && (
        <div style={{ background: '#FFF4E5', color: '#8A5400', borderRadius: 12, padding: '14px 16px', fontSize: 14, marginBottom: 20 }}>Connect Supabase to save navigation changes.</div>
      )}

      {/* datalist of useful link targets, incl. custom pages */}
      <datalist id="nav-paths">
        {['/', '/inventory', '/finder', '/carfinder', '/finance', '/financing-explainer', '/tradein', '/compare', '/guides', '/team', '/social', '/about', '/contact', '/faq', '/testimonials', '/privacy', '/terms', ...pagePaths].map(p => <option key={p} value={p} />)}
      </datalist>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((item, i) => (
          <div
            key={i}
            onDragOver={e => { if (dragTop !== null) e.preventDefault(); }}
            onDrop={() => onTopDrop(i)}
            style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px', opacity: dragTop === i ? 0.4 : 1, transition: 'opacity .15s' }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span
                draggable
                onDragStart={() => setDragTop(i)}
                onDragEnd={() => setDragTop(null)}
                title="Drag to reorder"
                style={{ cursor: 'grab', color: 'var(--muted)', display: 'flex', alignItems: 'center', padding: '0 2px' }}
              >
                <Icon name="grip" size={18} />
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <button onClick={() => move(i, -1)} disabled={i === 0} className="icon-btn" style={{ opacity: i === 0 ? 0.3 : 1 }}><Icon name="chevronUp" size={15} /></button>
                <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="icon-btn" style={{ opacity: i === items.length - 1 ? 0.3 : 1 }}><Icon name="chevronDown" size={15} /></button>
              </div>
              <input className="input" value={item.label} onChange={e => update(i, { label: e.target.value })} placeholder="Label" style={{ flex: 1 }} />
              <input className="input" list="nav-paths" value={item.href} onChange={e => update(i, { href: e.target.value })} placeholder="/path" style={{ flex: 1 }} />
              <button onClick={() => removeTop(i)} className="btn btn-ghost btn-sm" style={{ color: '#A8232C' }}>Remove</button>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 10, paddingLeft: 58 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--muted)' }}>
                <input type="checkbox" checked={!!item.autoCategories} onChange={e => update(i, { autoCategories: e.target.checked })} style={{ accentColor: 'var(--teal)' }} />
                Auto &ldquo;browse by type&rdquo; dropdown (SUVs, Sedans…)
              </label>
            </div>

            {/* Children */}
            <div style={{ paddingLeft: 58, marginTop: 10 }}>
              {(item.children || []).map((c, ci) => (
                <div
                  key={ci}
                  onDragOver={e => { if (dragChild?.p === i) e.preventDefault(); }}
                  onDrop={() => onChildDrop(i, ci)}
                  style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', opacity: dragChild?.p === i && dragChild.c === ci ? 0.4 : 1 }}
                >
                  <span
                    draggable
                    onDragStart={() => setDragChild({ p: i, c: ci })}
                    onDragEnd={() => setDragChild(null)}
                    title="Drag to reorder"
                    style={{ cursor: 'grab', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}
                  >
                    <Icon name="grip" size={14} />
                  </span>
                  <input className="input" value={c.label} onChange={e => updateChild(i, ci, { label: e.target.value })} placeholder="Sub-item label" style={{ flex: 1 }} />
                  <input className="input" list="nav-paths" value={c.href} onChange={e => updateChild(i, ci, { href: e.target.value })} placeholder="/path" style={{ flex: 1 }} />
                  <button onClick={() => removeChild(i, ci)} className="btn btn-ghost btn-sm" style={{ color: '#A8232C' }}>×</button>
                </div>
              ))}
              <button onClick={() => addChild(i)} className="btn btn-ghost btn-sm">+ Add sub-item</button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addTop} className="btn btn-ghost" style={{ marginTop: 14 }}><Icon name="plus" size={14} /> Add menu item</button>

      {error && <div style={{ background: '#FDECEE', color: '#A8232C', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginTop: 16 }}>{error}</div>}

      <div style={{ position: 'sticky', bottom: 0, marginTop: 24, padding: '16px 0' }}>
        <button onClick={save} disabled={saving || !isSupabaseConfigured} className="btn btn-primary btn-lg">
          {saved ? <><Icon name="check" size={16} /> Saved!</> : saving ? 'Saving…' : 'Save navigation'}
        </button>
      </div>
    </div>
  );
}
