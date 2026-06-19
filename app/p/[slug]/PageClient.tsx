'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { VehicleCard } from '@/components/VehicleCard';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { matchesRequest } from '@/lib/carMatch';
import { getPageBySlug, listVehicles, createLead, CustomPage, PageBlock, AdminVehicle } from '@/lib/db';

function toEmbedUrl(url: string): string {
  if (!url) return '';
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}

function HeroBlock({ block }: { block: Extract<PageBlock, { type: 'hero' }> }) {
  return (
    <div style={{ position: 'relative', minHeight: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 20, overflow: 'hidden', margin: '-40px -20px 0' }}>
      {block.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={block.imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: block.overlay === 'light' ? 'rgba(255,255,255,0.55)' : block.overlay === 'dark' ? 'rgba(0,0,0,0.5)' : 'transparent' }} />
      <div style={{ position: 'relative', textAlign: 'center', padding: '60px 24px', maxWidth: 700 }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(28px,5vw,48px)', fontWeight: 700, color: block.overlay === 'light' ? 'var(--ink)' : 'white', margin: 0, lineHeight: 1.1, letterSpacing: '-.02em' }}>
          {block.headline}
        </h1>
        {block.subhead && <p style={{ fontSize: 'clamp(15px,2vw,18px)', color: block.overlay === 'light' ? 'var(--muted)' : 'rgba(255,255,255,0.85)', marginTop: 12, lineHeight: 1.5 }}>{block.subhead}</p>}
        {block.ctaLabel && block.ctaUrl && (
          <a href={block.ctaUrl} className="btn btn-primary btn-lg" style={{ marginTop: 24, textDecoration: 'none' }}>{block.ctaLabel}</a>
        )}
      </div>
    </div>
  );
}

function ImageBlock({ block }: { block: Extract<PageBlock, { type: 'image' }> }) {
  const maxW = block.width === 'full' ? '100%' : block.width === 'medium' ? 480 : 720;
  return (
    <figure style={{ margin: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={block.url} alt={block.alt || ''} loading="lazy" style={{ width: '100%', maxWidth: maxW, borderRadius: 14, display: 'block' }} />
      {block.caption && <figcaption style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, fontStyle: 'italic' }}>{block.caption}</figcaption>}
    </figure>
  );
}

function VideoBlock({ block }: { block: Extract<PageBlock, { type: 'video' }> }) {
  const src = toEmbedUrl(block.embedUrl);
  if (!src) return null;
  return (
    <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 14, overflow: 'hidden', background: 'var(--bg-soft)' }}>
      <iframe src={src} title={block.title || 'Video'} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
    </div>
  );
}

function CtaBlock({ block }: { block: Extract<PageBlock, { type: 'cta' }> }) {
  const filled = block.style !== 'outline';
  return (
    <div style={{ background: filled ? 'var(--teal)' : 'white', border: filled ? 'none' : '2px solid var(--teal)', borderRadius: 20, padding: 'clamp(28px,4vw,48px)', textAlign: 'center' }}>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(22px,3vw,32px)', fontWeight: 700, color: filled ? 'white' : 'var(--ink)', margin: 0, letterSpacing: '-.02em' }}>{block.headline}</h2>
      {block.subhead && <p style={{ fontSize: 16, color: filled ? 'rgba(255,255,255,0.85)' : 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>{block.subhead}</p>}
      <a href={block.buttonUrl} className={filled ? 'btn btn-lg' : 'btn btn-primary btn-lg'} style={{ marginTop: 20, textDecoration: 'none', ...(filled ? { background: 'white', color: 'var(--teal-2)' } : {}) }}>
        {block.buttonText}
      </a>
    </div>
  );
}

function TestimonialBlock({ block }: { block: Extract<PageBlock, { type: 'testimonial' }> }) {
  return (
    <blockquote style={{ background: 'var(--bg-soft)', borderRadius: 18, padding: 'clamp(20px,3vw,36px)', borderLeft: '4px solid var(--teal)', margin: 0 }}>
      <p style={{ fontSize: 'clamp(15px,2vw,18px)', fontStyle: 'italic', lineHeight: 1.7, color: 'var(--ink)', margin: 0 }}>"{block.quote}"</p>
      <footer style={{ marginTop: 14, fontSize: 14, fontWeight: 700 }}>
        {block.author}
        {block.role && <span style={{ fontWeight: 400, color: 'var(--muted)' }}> — {block.role}</span>}
      </footer>
    </blockquote>
  );
}

function FaqBlock({ block }: { block: Extract<PageBlock, { type: 'faq' }> }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const items = block.items || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {items.map((item, i) => (
        <div key={i} style={{ borderBottom: '1px solid var(--line)' }}>
          <button onClick={() => setOpenIdx(openIdx === i ? null : i)} style={{ width: '100%', background: 'none', border: 'none', padding: '18px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{item.q}</span>
            <Icon name={openIdx === i ? 'chevronUp' : 'chevronDown'} size={16} style={{ color: 'var(--muted)', flexShrink: 0, marginLeft: 12 }} />
          </button>
          {openIdx === i && (
            <div style={{ padding: '0 4px 18px', fontSize: 15, color: 'var(--muted)', lineHeight: 1.7 }}>{item.a}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function InventoryBlock({ block }: { block: Extract<PageBlock, { type: 'inventory' }> }) {
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  useEffect(() => { listVehicles().then(setVehicles); }, []);
  const req: any = { body: block.body || '', make: block.make || '', model: '', yearMin: null, priceMax: block.priceMax || null, mileageMax: null, fuel: '', drive: '' };
  const matched = vehicles.filter(v => matchesRequest(v as any, req)).slice(0, block.limit || 6);
  if (vehicles.length === 0) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      {block.title && <h2 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(22px,3vw,30px)', fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 20px' }}>{block.title}</h2>}
      {matched.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>No matching vehicles in stock right now.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
          {matched.map(v => <VehicleCard key={v.id} vehicle={v as any} />)}
        </div>
      )}
    </div>
  );
}

function LeadFormBlock({ block, pageTitle }: { block: Extract<PageBlock, { type: 'leadform' }>; pageTitle: string }) {
  const fields = block.fields && block.fields.length ? block.fields : ['name', 'email', 'phone', 'message'];
  const [form, setForm] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!form.name?.trim()) return setErr('Please enter your name.');
    if (!form.email?.trim() && !form.phone?.trim()) return setErr('Please add an email or phone number.');
    await createLead({
      type: (block.leadType as any) || 'page',
      name: form.name, email: form.email, phone: form.phone,
      payload: { ...form, source: pageTitle },
    });
    setSent(true);
  };

  if (sent) {
    return (
      <div style={{ background: 'var(--teal-tint)', borderRadius: 16, padding: '28px 30px', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, margin: '0 auto 12px', borderRadius: '50%', background: 'var(--teal)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={26} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--teal-2)' }}>Thanks — we got it!</div>
        <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 4 }}>Our team will be in touch shortly.</div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 16, padding: '26px 30px' }}>
      {block.title && <h2 style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px' }}>{block.title}</h2>}
      {block.subtitle && <p style={{ fontSize: 14.5, color: 'var(--muted)', margin: '0 0 18px', lineHeight: 1.5 }}>{block.subtitle}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {fields.includes('name') && <input className="input" placeholder="Your name" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />}
        <div className="rg" style={{ display: 'grid', gridTemplateColumns: fields.includes('email') && fields.includes('phone') ? '1fr 1fr' : '1fr', gap: 12 }}>
          {fields.includes('email') && <input className="input" type="email" placeholder="Email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />}
          {fields.includes('phone') && <input className="input" type="tel" placeholder="Phone" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />}
        </div>
        {fields.includes('message') && <textarea className="input" placeholder="How can we help?" value={form.message || ''} onChange={e => setForm({ ...form, message: e.target.value })} style={{ minHeight: 90, fontFamily: 'inherit', resize: 'vertical' }} />}
        {err && <div style={{ color: '#A8232C', fontSize: 13.5 }}>{err}</div>}
        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>{block.buttonText || 'Submit'}</button>
      </div>
    </form>
  );
}

function SpacerBlock({ block }: { block: Extract<PageBlock, { type: 'spacer' }> }) {
  const h = block.size === 'sm' ? 24 : block.size === 'lg' ? 80 : 48;
  return <div style={{ height: h }} />;
}

export default function PageClient({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [page, setPage] = useState<CustomPage | null | undefined>(undefined);

  useEffect(() => {
    getPageBySlug(params.slug).then(p => setPage(p && p.published === false ? null : p));
  }, [params.slug]);

  if (page === undefined) {
    return <div className="page fade-in" style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>;
  }
  if (!page) {
    return (
      <div className="page fade-in" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 600 }}>Page not found</h1>
        <button onClick={() => router.push('/')} className="btn btn-primary" style={{ marginTop: 24 }}>Back home <Icon name="arrowRight" size={14} /></button>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div className="container" style={{ maxWidth: 920, padding: '40px 20px 80px' }}>
        {page.blocks.map((block, i) => (
          <div key={i} style={{ marginBottom: block.type === 'spacer' ? 0 : 36 }}>
            {block.type === 'html' && <div className="page-html" dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.html) }} />}
            {block.type === 'hero' && <HeroBlock block={block} />}
            {block.type === 'image' && <ImageBlock block={block} />}
            {block.type === 'video' && <VideoBlock block={block} />}
            {block.type === 'cta' && <CtaBlock block={block} />}
            {block.type === 'testimonial' && <TestimonialBlock block={block} />}
            {block.type === 'faq' && <FaqBlock block={block} />}
            {block.type === 'inventory' && <InventoryBlock block={block} />}
            {block.type === 'leadform' && <LeadFormBlock block={block} pageTitle={page.title} />}
            {block.type === 'spacer' && <SpacerBlock block={block} />}
          </div>
        ))}
      </div>
    </div>
  );
}
