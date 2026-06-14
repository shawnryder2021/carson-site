'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { savePage, CustomPage, PageBlock } from '@/lib/db';

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const BODY_OPTIONS = ['', 'SUV', 'Sedan', 'Truck', 'Coupe', 'Wagon'];
const LEAD_FIELDS = ['name', 'email', 'phone', 'message'];

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' };

function HtmlEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const wrap = (before: string, after = '') => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const sel = value.slice(start, end);
    const next = value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(next);
    setTimeout(() => { el.focus(); el.selectionStart = start + before.length; el.selectionEnd = start + before.length + sel.length; }, 0);
  };

  const tools: [string, () => void][] = [
    ['H2', () => wrap('<h2>', '</h2>')],
    ['H3', () => wrap('<h3>', '</h3>')],
    ['Paragraph', () => wrap('<p>', '</p>')],
    ['Bold', () => wrap('<strong>', '</strong>')],
    ['Italic', () => wrap('<em>', '</em>')],
    ['List', () => wrap('<ul>\n  <li>', '</li>\n</ul>')],
    ['Link', () => wrap('<a href="/inventory">', '</a>')],
    ['Image', () => wrap('<img src="https://" alt="" />')],
    ['Divider', () => wrap('<hr />')],
  ];

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {tools.map(([label, fn]) => (
          <button key={label} type="button" onClick={fn} style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', color: 'var(--ink)' }}>
            {label}
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        className="input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="<h2>Heading</h2><p>Your content…</p>"
        style={{ minHeight: 160, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13, resize: 'vertical', lineHeight: 1.5 }}
      />
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Write or paste HTML. Select text then click a button to wrap it. Scripts are stripped automatically.</div>
    </div>
  );
}

export function PageEditor({ initial, isNew }: { initial: CustomPage; isNew: boolean }) {
  const router = useRouter();
  const [page, setPage] = useState<CustomPage>(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<CustomPage>) => setPage(p => ({ ...p, ...patch }));
  const setBlock = (i: number, patch: any) => set({ blocks: page.blocks.map((b, j) => j === i ? { ...b, ...patch } : b) });
  const addBlock = (type: PageBlock['type']) => {
    const fresh: PageBlock = type === 'html' ? { type: 'html', html: '' }
      : type === 'inventory' ? { type: 'inventory', title: 'Available now', body: '', make: '', limit: 6 }
      : { type: 'leadform', title: 'Get in touch', subtitle: '', leadType: 'page', fields: ['name', 'email', 'phone', 'message'], buttonText: 'Submit' };
    set({ blocks: [...page.blocks, fresh] });
  };
  const removeBlock = (i: number) => set({ blocks: page.blocks.filter((_, j) => j !== i) });
  const moveBlock = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= page.blocks.length) return;
    const next = [...page.blocks];
    [next[i], next[j]] = [next[j], next[i]];
    set({ blocks: next });
  };

  const save = async () => {
    setError(null);
    const slug = page.slug || slugify(page.title);
    if (!page.title.trim()) return setError('Add a page title.');
    if (!slug) return setError('Add a URL slug.');
    setBusy(true);
    const { error } = await savePage({ ...page, slug });
    setBusy(false);
    if (error) return setError(error);
    router.push('/admin/pages');
  };

  return (
    <div style={{ padding: '32px 40px 80px', maxWidth: 860 }}>
      <button onClick={() => router.push('/admin/pages')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, marginBottom: 16 }}>← All pages</button>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 20px' }}>{isNew ? 'New page' : `Edit: ${page.title}`}</h1>

      {/* Meta */}
      <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 24px', marginBottom: 18 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Page title</label>
          <input className="input" value={page.title} onChange={e => { const t = e.target.value; set({ title: t, ...(slugTouched ? {} : { slug: slugify(t) }) }); }} placeholder="Service Department" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>URL slug</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>/p/</span>
            <input className="input" value={page.slug} onChange={e => { setSlugTouched(true); set({ slug: slugify(e.target.value) }); }} placeholder="service" />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Meta description (SEO)</label>
          <input className="input" value={page.description} onChange={e => set({ description: e.target.value })} placeholder="A short summary for Google & social shares." />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600 }}>
          <input type="checkbox" checked={page.published !== false} onChange={e => set({ published: e.target.checked })} style={{ accentColor: 'var(--teal)' }} />
          Published (visible to visitors)
        </label>
      </div>

      {/* Blocks */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase', margin: '0 0 12px' }}>Content blocks</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {page.blocks.map((block, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--teal-2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                {block.type === 'html' ? '📝 HTML content' : block.type === 'inventory' ? '🚗 Inventory grid' : '✉️ Lead form'}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => moveBlock(i, -1)} disabled={i === 0} className="btn btn-ghost btn-sm" title="Move up"><Icon name="chevronUp" size={13} /></button>
                <button onClick={() => moveBlock(i, 1)} disabled={i === page.blocks.length - 1} className="btn btn-ghost btn-sm" title="Move down"><Icon name="chevronDown" size={13} /></button>
                <button onClick={() => removeBlock(i)} className="btn btn-ghost btn-sm" style={{ color: '#A8232C' }}><Icon name="trash" size={13} /></button>
              </div>
            </div>

            {block.type === 'html' && <HtmlEditor value={block.html} onChange={v => setBlock(i, { html: v })} />}

            {block.type === 'inventory' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="rg">
                <div><label style={lbl}>Section title</label><input className="input" value={block.title || ''} onChange={e => setBlock(i, { title: e.target.value })} /></div>
                <div><label style={lbl}>Body type</label>
                  <select className="input" value={block.body || ''} onChange={e => setBlock(i, { body: e.target.value })}>
                    {BODY_OPTIONS.map(o => <option key={o} value={o}>{o || 'Any'}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Make (optional)</label><input className="input" value={block.make || ''} onChange={e => setBlock(i, { make: e.target.value })} placeholder="e.g. Toyota" /></div>
                <div><label style={lbl}>Max price (optional)</label><input className="input" type="number" value={block.priceMax || ''} onChange={e => setBlock(i, { priceMax: e.target.value ? +e.target.value : undefined })} /></div>
                <div><label style={lbl}>How many to show</label><input className="input" type="number" value={block.limit || 6} onChange={e => setBlock(i, { limit: +e.target.value || 6 })} /></div>
              </div>
            )}

            {block.type === 'leadform' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><label style={lbl}>Form title</label><input className="input" value={block.title || ''} onChange={e => setBlock(i, { title: e.target.value })} /></div>
                <div><label style={lbl}>Subtitle</label><input className="input" value={block.subtitle || ''} onChange={e => setBlock(i, { subtitle: e.target.value })} /></div>
                <div>
                  <label style={lbl}>Fields to show</label>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {LEAD_FIELDS.map(f => {
                      const on = (block.fields || []).includes(f);
                      return (
                        <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, textTransform: 'capitalize' }}>
                          <input type="checkbox" checked={on} onChange={() => setBlock(i, { fields: on ? (block.fields || []).filter(x => x !== f) : [...(block.fields || []), f] })} style={{ accentColor: 'var(--teal)' }} />
                          {f}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="rg">
                  <div><label style={lbl}>Lead type tag</label><input className="input" value={block.leadType || 'page'} onChange={e => setBlock(i, { leadType: e.target.value })} placeholder="service" /></div>
                  <div><label style={lbl}>Button text</label><input className="input" value={block.buttonText || ''} onChange={e => setBlock(i, { buttonText: e.target.value })} placeholder="Submit" /></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add block */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <button onClick={() => addBlock('html')} className="btn btn-ghost btn-sm"><Icon name="plus" size={13} /> HTML content</button>
        <button onClick={() => addBlock('inventory')} className="btn btn-ghost btn-sm"><Icon name="plus" size={13} /> Inventory grid</button>
        <button onClick={() => addBlock('leadform')} className="btn btn-ghost btn-sm"><Icon name="plus" size={13} /> Lead form</button>
      </div>

      {error && <div style={{ background: '#FDECEC', color: '#A8232C', borderRadius: 10, padding: '12px 14px', fontSize: 13.5, marginTop: 18 }}>{error}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
        <button onClick={save} disabled={busy} className="btn btn-primary"><Icon name="check" size={15} /> {busy ? 'Saving…' : 'Save page'}</button>
        {!isNew && page.slug && (
          <a href={`/p/${page.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>View page ↗</a>
        )}
      </div>
    </div>
  );
}
