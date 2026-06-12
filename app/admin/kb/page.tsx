'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { listKnowledgeBase, saveKnowledgeEntry, deleteKnowledgeEntry, KnowledgeEntry } from '@/lib/db';

type Category = 'about_carson' | 'inventory_insights' | 'market_data' | 'policies' | 'team' | 'promotions';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'about_carson', label: 'About Carson' },
  { value: 'inventory_insights', label: 'Inventory Insights' },
  { value: 'market_data', label: 'Market Data' },
  { value: 'policies', label: 'Policies' },
  { value: 'team', label: 'Team' },
  { value: 'promotions', label: 'Promotions' },
];

export default function AdminKB() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('about_carson');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<KnowledgeEntry | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const all = await listKnowledgeBase();
    setEntries(all);
    setLoading(false);
  };

  const filtered = entries.filter(e => e.category === activeCategory);

  const save = async () => {
    if (!editing || !editing.title || !editing.content) {
      alert('Title and content required');
      return;
    }
    setBusy(true);
    const { error } = await saveKnowledgeEntry(editing);
    if (error) alert(error);
    else {
      setEditing(null);
      load();
    }
    setBusy(false);
  };

  const del = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    setBusy(true);
    const { error } = await deleteKnowledgeEntry(id);
    if (error) alert(error);
    else load();
    setBusy(false);
  };

  return (
    <div style={{ padding: '32px 40px 60px' }}>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px' }}>AI Knowledge Base</h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px' }}>Train the AI system with dealership, vehicle, market, and policy information.</p>

      {loading ? (
        <div style={{ color: 'var(--muted)' }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }}>
          {/* Sidebar category tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                style={{
                  padding: '12px 14px',
                  background: activeCategory === cat.value ? 'var(--teal)' : 'var(--bg-soft)',
                  color: activeCategory === cat.value ? 'white' : 'var(--ink)',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                {cat.label}
                <span style={{ float: 'right', fontSize: 12, opacity: 0.7 }}>
                  {entries.filter(e => e.category === cat.value).length}
                </span>
              </button>
            ))}
          </div>

          {/* Main content */}
          <div>
            <button
              onClick={() => setEditing({ category: activeCategory, title: '', content: '' })}
              disabled={busy}
              className="btn btn-dark btn-sm"
              style={{ marginBottom: 14 }}
            >
              <Icon name="plus" size={13} /> New entry
            </button>

            {/* Edit modal */}
            {editing && (
              <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{editing.id ? 'Edit entry' : 'New entry'}</h3>
                  <button onClick={() => setEditing(null)} className="btn btn-ghost btn-sm">Close</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>Title</label>
                    <input
                      type="text"
                      className="input"
                      value={editing.title}
                      onChange={e => setEditing({ ...editing, title: e.target.value })}
                      placeholder="e.g., 'Current Financing Rates'"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>Content</label>
                    <textarea
                      className="input"
                      value={editing.content}
                      onChange={e => setEditing({ ...editing, content: e.target.value })}
                      placeholder="Enter content here. You can use markdown formatting."
                      style={{ minHeight: 120, fontFamily: 'inherit', resize: 'vertical' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={save} disabled={busy} className="btn btn-primary btn-sm">
                      {busy ? 'Saving…' : 'Save entry'}
                    </button>
                    <button onClick={() => setEditing(null)} className="btn btn-ghost btn-sm">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Entry list */}
            {filtered.length === 0 ? (
              <div style={{ fontSize: 14, color: 'var(--muted)', padding: '20px', background: 'var(--bg-soft)', borderRadius: 14, textAlign: 'center' }}>
                No entries in {CATEGORIES.find(c => c.value === activeCategory)?.label}. <br />
                <button onClick={() => setEditing({ category: activeCategory, title: '', content: '' })} className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>
                  Create one
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filtered.map(entry => (
                  <div key={entry.id} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12, marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{entry.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.4, whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {entry.content}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button
                          onClick={() => setEditing(entry)}
                          disabled={busy}
                          className="btn btn-ghost btn-sm"
                        >
                          <Icon name="edit" size={13} />
                        </button>
                        <button
                          onClick={() => del(entry.id!)}
                          disabled={busy}
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#A8232C' }}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    </div>
                    {entry.updatedAt && (
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        Updated {new Date(entry.updatedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
