'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { VehicleCard } from '@/components/VehicleCard';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { matchesRequest } from '@/lib/carMatch';
import { getPageBySlug, listVehicles, createLead, CustomPage, PageBlock, AdminVehicle } from '@/lib/db';

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
          <div key={i} style={{ marginBottom: 36 }}>
            {block.type === 'html' && (
              <div className="page-html" dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.html) }} />
            )}
            {block.type === 'inventory' && <InventoryBlock block={block} />}
            {block.type === 'leadform' && <LeadFormBlock block={block} pageTitle={page.title} />}
          </div>
        ))}
      </div>
    </div>
  );
}
