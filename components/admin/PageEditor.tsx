'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { savePage, CustomPage, PageBlock } from '@/lib/db';
import { complete } from '@/lib/ai';

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const BODY_OPTIONS = ['', 'SUV', 'Sedan', 'Truck', 'Coupe', 'Wagon'];
const LEAD_FIELDS = ['name', 'email', 'phone', 'message'];

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' };
const card: React.CSSProperties = { background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px' };

const BLOCK_TYPES: { type: PageBlock['type']; label: string; icon: string; desc: string }[] = [
  { type: 'html', label: 'Rich text', icon: '📝', desc: 'Headings, paragraphs, lists, links' },
  { type: 'hero', label: 'Hero banner', icon: '🖼️', desc: 'Full-width image with headline overlay' },
  { type: 'image', label: 'Image', icon: '🌄', desc: 'Photo or graphic with caption' },
  { type: 'video', label: 'Video', icon: '🎬', desc: 'YouTube or Vimeo embed' },
  { type: 'inventory', label: 'Inventory grid', icon: '🚗', desc: 'Filtered vehicle listings' },
  { type: 'cta', label: 'Call to action', icon: '🔘', desc: 'Headline + button banner' },
  { type: 'testimonial', label: 'Testimonial', icon: '💬', desc: 'Customer quote with attribution' },
  { type: 'faq', label: 'FAQ accordion', icon: '❓', desc: 'Questions & answers (SEO-friendly)' },
  { type: 'leadform', label: 'Lead form', icon: '✉️', desc: 'Contact / inquiry form' },
  { type: 'spacer', label: 'Spacer', icon: '↕️', desc: 'Vertical spacing between sections' },
];

function HtmlEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [preview, setPreview] = useState(false);

  const wrap = (before: string, after = '') => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const sel = value.slice(start, end);
    const next = value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(next);
    setTimeout(() => { el.focus(); el.selectionStart = start + before.length; el.selectionEnd = start + before.length + sel.length; }, 0);
  };

  const aiWrite = async () => {
    const topic = prompt('What should this section be about?\n\nExample: "Why buy from Carson Exports" or "Our service department capabilities"');
    if (!topic) return;
    setAiLoading(true);
    try {
      const html = await complete(`Write HTML content for a car dealership website section about: "${topic}"

Rules:
- Use semantic HTML: <h2>, <h3>, <p>, <ul>/<li>, <strong>, <em>
- Write 2-4 paragraphs, warm and professional dealer tone
- Include relevant details a car buyer would care about
- No <script>, no inline styles, no classes
- Do NOT wrap in <div> or <section> — just the inner content
- No markdown, only valid HTML`);
      onChange(value ? value + '\n\n' + html : html);
    } catch { alert('AI generation failed — check your API key.'); }
    setAiLoading(false);
  };

  const tools: [string, () => void][] = [
    ['H2', () => wrap('<h2>', '</h2>')],
    ['H3', () => wrap('<h3>', '</h3>')],
    ['P', () => wrap('<p>', '</p>')],
    ['Bold', () => wrap('<strong>', '</strong>')],
    ['Italic', () => wrap('<em>', '</em>')],
    ['List', () => wrap('<ul>\n  <li>', '</li>\n</ul>')],
    ['Link', () => { const url = prompt('Link URL:', '/inventory'); if (url) wrap(`<a href="${url}">`, '</a>'); }],
    ['Image', () => { const url = prompt('Image URL:', 'https://'); if (url) wrap(`<img src="${url}" alt="" style="max-width:100%;border-radius:12px" />`); }],
    ['Divider', () => wrap('<hr />')],
  ];

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, alignItems: 'center' }}>
        {tools.map(([label, fn]) => (
          <button key={label} type="button" onClick={fn} style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', color: 'var(--ink)' }}>
            {label}
          </button>
        ))}
        <span style={{ width: 1, height: 20, background: 'var(--line)', margin: '0 4px' }} />
        <button type="button" onClick={aiWrite} disabled={aiLoading} style={{ background: 'var(--teal-tint)', border: '1px solid var(--teal)', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', color: 'var(--teal-2)' }}>
          <Icon name="sparkles" size={12} /> {aiLoading ? 'Writing…' : 'Write with AI'}
        </button>
        <button type="button" onClick={() => setPreview(!preview)} style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--line)', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', color: preview ? 'var(--teal-2)' : 'var(--muted)' }}>
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>
      {preview ? (
        <div className="page-html" style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '16px 20px', minHeight: 120, background: 'white' }} dangerouslySetInnerHTML={{ __html: value }} />
      ) : (
        <textarea
          ref={ref}
          className="input"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="<h2>Heading</h2>\n<p>Your content…</p>"
          style={{ minHeight: 160, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13, resize: 'vertical', lineHeight: 1.5 }}
        />
      )}
    </div>
  );
}

function FaqEditor({ items, onChange }: { items: { q: string; a: string }[]; onChange: (v: { q: string; a: string }[]) => void }) {
  const add = () => onChange([...items, { q: '', a: '' }]);
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));
  const update = (i: number, field: 'q' | 'a', val: string) => onChange(items.map((item, j) => j === i ? { ...item, [field]: val } : item));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: 'var(--bg-soft)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>Q&A #{i + 1}</span>
            <button type="button" onClick={() => remove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A8232C', fontSize: 12 }}>Remove</button>
          </div>
          <input className="input" value={item.q} onChange={e => update(i, 'q', e.target.value)} placeholder="Question" style={{ marginBottom: 8 }} />
          <textarea className="input" value={item.a} onChange={e => update(i, 'a', e.target.value)} placeholder="Answer" style={{ minHeight: 60, fontFamily: 'inherit', resize: 'vertical' }} />
        </div>
      ))}
      <button type="button" onClick={add} className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>
        <Icon name="plus" size={13} /> Add question
      </button>
    </div>
  );
}

function SeoScoreHints({ page }: { page: CustomPage }) {
  const hints: { ok: boolean; text: string }[] = [];
  const kw = page.focusKeyword?.toLowerCase().trim();

  hints.push({ ok: page.title.length >= 10 && page.title.length <= 70, text: `Title length: ${page.title.length}/70 chars` });
  hints.push({ ok: page.description.length >= 50 && page.description.length <= 160, text: `Meta description: ${page.description.length}/160 chars` });
  hints.push({ ok: !!page.ogImage, text: page.ogImage ? 'OG image set' : 'No OG image — social shares will lack a visual' });
  hints.push({ ok: !!page.slug, text: page.slug ? `URL: /p/${page.slug}` : 'No URL slug set' });

  if (kw) {
    const titleHas = page.title.toLowerCase().includes(kw);
    const descHas = page.description.toLowerCase().includes(kw);
    const bodyText = page.blocks.filter(b => b.type === 'html').map(b => (b as any).html).join(' ').toLowerCase();
    const bodyHas = bodyText.includes(kw);
    hints.push({ ok: titleHas, text: titleHas ? `Keyword "${kw}" in title` : `Keyword "${kw}" missing from title` });
    hints.push({ ok: descHas, text: descHas ? `Keyword in description` : `Keyword missing from description` });
    hints.push({ ok: bodyHas, text: bodyHas ? `Keyword found in body content` : `Keyword not found in body content` });
  }

  const hasFaq = page.blocks.some(b => b.type === 'faq' && (b as any).items?.length > 0);
  if (hasFaq) hints.push({ ok: true, text: 'FAQ block present — enables FAQ rich results' });

  const score = Math.round((hints.filter(h => h.ok).length / hints.length) * 100);
  const color = score >= 80 ? '#16a766' : score >= 50 ? '#e6a700' : '#A8232C';

  return (
    <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--teal-2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>SEO score</span>
        <span style={{ fontSize: 20, fontWeight: 800, color }}>{score}%</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {hints.map((h, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: h.ok ? '#16a766' : '#e6a700', flexShrink: 0 }} />
            <span style={{ color: h.ok ? 'var(--ink)' : 'var(--muted)' }}>{h.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockAddMenu({ onAdd }: { onAdd: (type: PageBlock['type']) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} className="btn btn-ghost" style={{ width: '100%', border: '2px dashed var(--line)', borderRadius: 14, padding: '16px 0', fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>
        <Icon name="plus" size={16} /> Add block
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 4, background: 'white', border: '1px solid var(--line)', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,.12)', padding: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {BLOCK_TYPES.map(bt => (
            <button key={bt.type} onClick={() => { onAdd(bt.type); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'none', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-soft)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{bt.icon}</span>
              <span>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{bt.label}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)' }}>{bt.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PageEditor({ initial, isNew }: { initial: CustomPage; isNew: boolean }) {
  const router = useRouter();
  const [page, setPage] = useState<CustomPage>({ ...initial, ogImage: initial.ogImage || '', focusKeyword: initial.focusKeyword || '' });
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seoOpen, setSeoOpen] = useState(false);

  const set = (patch: Partial<CustomPage>) => setPage(p => ({ ...p, ...patch }));
  const setBlock = (i: number, patch: any) => set({ blocks: page.blocks.map((b, j) => j === i ? { ...b, ...patch } : b) });

  const freshBlock = (type: PageBlock['type']): PageBlock => {
    switch (type) {
      case 'html': return { type: 'html', html: '' };
      case 'hero': return { type: 'hero', headline: '', subhead: '', imageUrl: '', ctaLabel: '', ctaUrl: '', overlay: 'dark' };
      case 'image': return { type: 'image', url: '', alt: '', caption: '', width: 'wide' };
      case 'video': return { type: 'video', embedUrl: '', title: '' };
      case 'inventory': return { type: 'inventory', title: 'Available now', body: '', make: '', limit: 6 };
      case 'cta': return { type: 'cta', headline: '', subhead: '', buttonText: 'Learn more', buttonUrl: '/contact', style: 'filled' };
      case 'testimonial': return { type: 'testimonial', quote: '', author: '', role: '' };
      case 'faq': return { type: 'faq', items: [{ q: '', a: '' }] };
      case 'leadform': return { type: 'leadform', title: 'Get in touch', subtitle: '', leadType: 'page', fields: ['name', 'email', 'phone', 'message'], buttonText: 'Submit' };
      case 'spacer': return { type: 'spacer', size: 'md' };
      default: return { type: 'html', html: '' };
    }
  };

  const addBlock = (type: PageBlock['type']) => set({ blocks: [...page.blocks, freshBlock(type)] });
  const removeBlock = (i: number) => set({ blocks: page.blocks.filter((_, j) => j !== i) });
  const duplicateBlock = (i: number) => {
    const clone = JSON.parse(JSON.stringify(page.blocks[i]));
    const next = [...page.blocks];
    next.splice(i + 1, 0, clone);
    set({ blocks: next });
  };
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

  const blockLabel = (type: string) => BLOCK_TYPES.find(b => b.type === type)?.label || type;
  const blockIcon = (type: string) => BLOCK_TYPES.find(b => b.type === type)?.icon || '📦';

  return (
    <div style={{ padding: '32px 40px 80px', maxWidth: 900 }}>
      <button onClick={() => router.push('/admin/pages')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, marginBottom: 16 }}>← All pages</button>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 20px' }}>{isNew ? 'New page' : `Edit: ${page.title}`}</h1>

      {/* Page settings */}
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="rg">
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>Page title</label>
            <input className="input" value={page.title} onChange={e => { const t = e.target.value; set({ title: t, ...(slugTouched ? {} : { slug: slugify(t) }) }); }} placeholder="Service Department" style={{ fontSize: 16, fontWeight: 600 }} />
          </div>
          <div>
            <label style={lbl}>URL slug</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>/p/</span>
              <input className="input" value={page.slug} onChange={e => { setSlugTouched(true); set({ slug: slugify(e.target.value) }); }} placeholder="service" />
            </div>
          </div>
          <div>
            <label style={lbl}>Status</label>
            <select className="input" value={page.published === false ? 'draft' : 'published'} onChange={e => set({ published: e.target.value === 'published' })}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>Meta description (SEO)</label>
            <textarea className="input" value={page.description} onChange={e => set({ description: e.target.value })} placeholder="A short summary for Google & social shares (50–160 chars recommended)." style={{ minHeight: 56, fontFamily: 'inherit', resize: 'vertical' }} />
            <div style={{ fontSize: 11, color: page.description.length > 160 ? '#A8232C' : 'var(--muted)', marginTop: 4, textAlign: 'right' }}>{page.description.length}/160</div>
          </div>
        </div>

        {/* Expandable SEO panel */}
        <button type="button" onClick={() => setSeoOpen(!seoOpen)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'var(--teal-2)', marginTop: 12, padding: 0 }}>
          <Icon name={seoOpen ? 'chevronDown' : 'arrowRight'} size={14} /> Advanced SEO & social
        </button>
        {seoOpen && (
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }} className="rg">
            <div>
              <label style={lbl}>Focus keyword</label>
              <input className="input" value={page.focusKeyword || ''} onChange={e => set({ focusKeyword: e.target.value })} placeholder="e.g. used cars dartmouth" />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>The main keyword you want this page to rank for</div>
            </div>
            <div>
              <label style={lbl}>OG image URL</label>
              <input className="input" value={page.ogImage || ''} onChange={e => set({ ogImage: e.target.value })} placeholder="https://… (1200×630 recommended)" />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Shown when shared on Facebook, Twitter, LinkedIn</div>
            </div>
            {page.ogImage && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ width: 240, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={page.ogImage} alt="OG preview" style={{ width: '100%', display: 'block' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SEO Score */}
      <div style={{ marginTop: 14 }}>
        <SeoScoreHints page={page} />
      </div>

      {/* Content blocks */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase', margin: '24px 0 12px' }}>Content blocks</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {page.blocks.map((block, i) => (
          <div key={i} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--teal-2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                {blockIcon(block.type)} {blockLabel(block.type)}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => moveBlock(i, -1)} disabled={i === 0} className="btn btn-ghost btn-sm" title="Move up"><Icon name="chevronUp" size={13} /></button>
                <button onClick={() => moveBlock(i, 1)} disabled={i === page.blocks.length - 1} className="btn btn-ghost btn-sm" title="Move down"><Icon name="chevronDown" size={13} /></button>
                <button onClick={() => duplicateBlock(i)} className="btn btn-ghost btn-sm" title="Duplicate"><Icon name="plus" size={13} /></button>
                <button onClick={() => removeBlock(i)} className="btn btn-ghost btn-sm" style={{ color: '#A8232C' }} title="Delete"><Icon name="trash" size={13} /></button>
              </div>
            </div>

            {/* HTML block */}
            {block.type === 'html' && <HtmlEditor value={block.html} onChange={v => setBlock(i, { html: v })} />}

            {/* Hero banner block */}
            {block.type === 'hero' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {block.imageUrl && (
                  <div style={{ borderRadius: 12, overflow: 'hidden', position: 'relative', height: 160 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={block.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: block.overlay === 'light' ? 'rgba(255,255,255,0.5)' : block.overlay === 'dark' ? 'rgba(0,0,0,0.45)' : 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                      <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, color: block.overlay === 'light' ? 'var(--ink)' : 'white', textAlign: 'center' }}>{block.headline || 'Headline preview'}</div>
                      {block.subhead && <div style={{ fontSize: 14, color: block.overlay === 'light' ? 'var(--muted)' : 'rgba(255,255,255,0.85)', marginTop: 4 }}>{block.subhead}</div>}
                    </div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="rg">
                  <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Headline</label><input className="input" value={block.headline} onChange={e => setBlock(i, { headline: e.target.value })} placeholder="Find your perfect ride" /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Subheadline</label><input className="input" value={block.subhead || ''} onChange={e => setBlock(i, { subhead: e.target.value })} placeholder="Browse our latest arrivals" /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Background image URL</label><input className="input" value={block.imageUrl || ''} onChange={e => setBlock(i, { imageUrl: e.target.value })} placeholder="https://..." /></div>
                  <div><label style={lbl}>CTA button text</label><input className="input" value={block.ctaLabel || ''} onChange={e => setBlock(i, { ctaLabel: e.target.value })} placeholder="Browse inventory" /></div>
                  <div><label style={lbl}>CTA link</label><input className="input" value={block.ctaUrl || ''} onChange={e => setBlock(i, { ctaUrl: e.target.value })} placeholder="/inventory" /></div>
                  <div>
                    <label style={lbl}>Overlay</label>
                    <select className="input" value={block.overlay || 'dark'} onChange={e => setBlock(i, { overlay: e.target.value as any })}>
                      <option value="dark">Dark scrim</option>
                      <option value="light">Light scrim</option>
                      <option value="none">No overlay</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Image block */}
            {block.type === 'image' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {block.url && (
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)', maxWidth: block.width === 'medium' ? 480 : block.width === 'full' ? '100%' : 720 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={block.url} alt={block.alt || ''} style={{ width: '100%', display: 'block' }} />
                  </div>
                )}
                <div><label style={lbl}>Image URL</label><input className="input" value={block.url} onChange={e => setBlock(i, { url: e.target.value })} placeholder="https://..." /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="rg">
                  <div><label style={lbl}>Alt text (SEO)</label><input className="input" value={block.alt || ''} onChange={e => setBlock(i, { alt: e.target.value })} placeholder="Describe the image" /></div>
                  <div>
                    <label style={lbl}>Width</label>
                    <select className="input" value={block.width || 'wide'} onChange={e => setBlock(i, { width: e.target.value as any })}>
                      <option value="full">Full width</option>
                      <option value="wide">Wide (720px)</option>
                      <option value="medium">Medium (480px)</option>
                    </select>
                  </div>
                </div>
                <div><label style={lbl}>Caption (optional)</label><input className="input" value={block.caption || ''} onChange={e => setBlock(i, { caption: e.target.value })} placeholder="Photo credit or description" /></div>
              </div>
            )}

            {/* Video embed block */}
            {block.type === 'video' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><label style={lbl}>YouTube or Vimeo URL</label><input className="input" value={block.embedUrl} onChange={e => setBlock(i, { embedUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..." /></div>
                <div><label style={lbl}>Title (accessibility)</label><input className="input" value={block.title || ''} onChange={e => setBlock(i, { title: e.target.value })} placeholder="Vehicle walkthrough video" /></div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Paste a YouTube or Vimeo URL. It will embed automatically on the page.</div>
              </div>
            )}

            {/* CTA block */}
            {block.type === 'cta' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: block.style === 'outline' ? 'white' : 'var(--teal)', border: block.style === 'outline' ? '2px solid var(--teal)' : 'none', borderRadius: 14, padding: '24px 28px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 700, color: block.style === 'outline' ? 'var(--ink)' : 'white' }}>{block.headline || 'Headline'}</div>
                  {block.subhead && <div style={{ fontSize: 14, color: block.style === 'outline' ? 'var(--muted)' : 'rgba(255,255,255,0.85)', marginTop: 4 }}>{block.subhead}</div>}
                  <div style={{ marginTop: 14 }}>
                    <span style={{ background: block.style === 'outline' ? 'var(--teal)' : 'white', color: block.style === 'outline' ? 'white' : 'var(--teal-2)', padding: '8px 20px', borderRadius: 999, fontSize: 13, fontWeight: 700 }}>{block.buttonText}</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="rg">
                  <div><label style={lbl}>Headline</label><input className="input" value={block.headline} onChange={e => setBlock(i, { headline: e.target.value })} placeholder="Ready for your next ride?" /></div>
                  <div><label style={lbl}>Subheadline</label><input className="input" value={block.subhead || ''} onChange={e => setBlock(i, { subhead: e.target.value })} placeholder="We make it easy." /></div>
                  <div><label style={lbl}>Button text</label><input className="input" value={block.buttonText} onChange={e => setBlock(i, { buttonText: e.target.value })} /></div>
                  <div><label style={lbl}>Button link</label><input className="input" value={block.buttonUrl} onChange={e => setBlock(i, { buttonUrl: e.target.value })} placeholder="/contact" /></div>
                  <div>
                    <label style={lbl}>Style</label>
                    <select className="input" value={block.style || 'filled'} onChange={e => setBlock(i, { style: e.target.value as any })}>
                      <option value="filled">Filled (brand color)</option>
                      <option value="outline">Outline</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Testimonial block */}
            {block.type === 'testimonial' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: 'var(--bg-soft)', borderRadius: 12, padding: '20px 24px', borderLeft: '4px solid var(--teal)' }}>
                  <div style={{ fontSize: 15, fontStyle: 'italic', lineHeight: 1.6, color: 'var(--ink)' }}>"{block.quote || 'Customer quote goes here…'}"</div>
                  <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700 }}>{block.author || 'Customer Name'}{block.role && <span style={{ fontWeight: 400, color: 'var(--muted)' }}> — {block.role}</span>}</div>
                </div>
                <div><label style={lbl}>Quote</label><textarea className="input" value={block.quote} onChange={e => setBlock(i, { quote: e.target.value })} placeholder="What the customer said…" style={{ minHeight: 70, fontFamily: 'inherit', resize: 'vertical' }} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="rg">
                  <div><label style={lbl}>Author name</label><input className="input" value={block.author} onChange={e => setBlock(i, { author: e.target.value })} placeholder="Jane Smith" /></div>
                  <div><label style={lbl}>Role / location (optional)</label><input className="input" value={block.role || ''} onChange={e => setBlock(i, { role: e.target.value })} placeholder="Halifax, NS" /></div>
                </div>
              </div>
            )}

            {/* FAQ block */}
            {block.type === 'faq' && <FaqEditor items={block.items || []} onChange={items => setBlock(i, { items })} />}

            {/* Inventory block */}
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

            {/* Lead form block */}
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
                          <input type="checkbox" checked={on} onChange={() => setBlock(i, { fields: on ? (block.fields || []).filter((x: string) => x !== f) : [...(block.fields || []), f] })} style={{ accentColor: 'var(--teal)' }} />
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

            {/* Spacer block */}
            {block.type === 'spacer' && (
              <div>
                <label style={lbl}>Spacer size</label>
                <select className="input" value={block.size || 'md'} onChange={e => setBlock(i, { size: e.target.value as any })} style={{ maxWidth: 200 }}>
                  <option value="sm">Small (24px)</option>
                  <option value="md">Medium (48px)</option>
                  <option value="lg">Large (80px)</option>
                </select>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add block */}
      <div style={{ marginTop: 16 }}>
        <BlockAddMenu onAdd={addBlock} />
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
