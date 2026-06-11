'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { saveVehicle, uploadImage, isSupabaseConfigured, AdminVehicle } from '@/lib/db';

const EMPTY: AdminVehicle = {
  id: '', year: new Date().getFullYear(), make: '', model: '', price: 0, mileage: 0,
  body: 'Sedan', fuel: 'Gas', drive: 'FWD', exterior: '', interior: '', aiSummary: '',
  images: [], status: 'available', featured: false,
};

function Field({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) {
  return (
    <div style={{ gridColumn: half ? 'span 1' : '1 / -1' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

export function VehicleForm({ initial, isNew }: { initial?: AdminVehicle; isNew: boolean }) {
  const router = useRouter();
  const [v, setV] = useState<AdminVehicle>(initial || EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<AdminVehicle>) => setV(prev => ({ ...prev, ...patch }));

  const slugId = () => `cx-${v.make}-${v.model}-${v.year}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  const submit = async () => {
    setError(null);
    const id = v.id || slugId();
    if (!v.make || !v.model || !v.year) { setError('Year, make, and model are required.'); return; }
    setSaving(true);
    const { error } = await saveVehicle({ ...v, id });
    setSaving(false);
    if (error) { setError(error); return; }
    router.push('/admin/inventory');
    router.refresh();
  };

  const inputStyle = { width: '100%' };
  const images = v.images || [];

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: 760 }}>
      <button onClick={() => router.push('/admin/inventory')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, marginBottom: 16 }}>← Back to inventory</button>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 24px' }}>
        {isNew ? 'Add vehicle' : `Edit ${v.year} ${v.make} ${v.model}`}
      </h1>

      <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '26px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <Field label="Year" half><input className="input" type="number" value={v.year} onChange={e => set({ year: +e.target.value })} style={inputStyle} /></Field>
          <Field label="Make" half><input className="input" value={v.make} onChange={e => set({ make: e.target.value })} placeholder="Toyota" style={inputStyle} /></Field>
          <Field label="Model" half><input className="input" value={v.model} onChange={e => set({ model: e.target.value })} placeholder="Corolla" style={inputStyle} /></Field>

          <Field label="Price ($)" half><input className="input" type="number" value={v.price} onChange={e => set({ price: +e.target.value })} style={inputStyle} /></Field>
          <Field label="Mileage" half><input className="input" type="number" value={v.mileage} onChange={e => set({ mileage: +e.target.value })} style={inputStyle} /></Field>
          <Field label="Status" half>
            <select className="select" value={v.status} onChange={e => set({ status: e.target.value })} style={inputStyle}>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
              <option value="hidden">Hidden</option>
            </select>
          </Field>

          <Field label="Body" half>
            <select className="select" value={v.body} onChange={e => set({ body: e.target.value as any })} style={inputStyle}>
              {['Sedan', 'Coupe', 'SUV', 'Truck', 'Wagon'].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Fuel" half>
            <select className="select" value={v.fuel} onChange={e => set({ fuel: e.target.value as any })} style={inputStyle}>
              {['Gas', 'Hybrid', 'Electric'].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Drive" half>
            <select className="select" value={v.drive} onChange={e => set({ drive: e.target.value as any })} style={inputStyle}>
              {['FWD', 'RWD', 'AWD'].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>

          <Field label="Exterior color" half><input className="input" value={v.exterior} onChange={e => set({ exterior: e.target.value })} placeholder="Pearl White" style={inputStyle} /></Field>
          <Field label="Interior color" half><input className="input" value={v.interior} onChange={e => set({ interior: e.target.value })} placeholder="Black" style={inputStyle} /></Field>
          <Field label="Featured" half>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, fontSize: 14 }}>
              <input type="checkbox" checked={!!v.featured} onChange={e => set({ featured: e.target.checked })} style={{ accentColor: 'var(--teal)' }} /> Show as featured
            </label>
          </Field>

          <Field label="AI summary / description">
            <textarea className="input" value={v.aiSummary} onChange={e => set({ aiSummary: e.target.value })} placeholder="Reliable sedan, great for daily commute" style={{ ...inputStyle, minHeight: 70, fontFamily: 'inherit', resize: 'vertical' }} />
          </Field>

          <Field label="Photos">
            {/* Thumbnails with reorder + delete */}
            {images.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                {images.map((url, idx) => (
                  <div key={idx} style={{ position: 'relative', width: 110, height: 82, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--bg-soft)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {idx === 0 && <span style={{ position: 'absolute', top: 4, left: 4, background: 'var(--teal)', color: 'white', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999 }}>MAIN</span>}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.55)', padding: '2px 4px' }}>
                      <button type="button" onClick={() => { if (idx === 0) return; const a = [...images]; [a[idx-1], a[idx]] = [a[idx], a[idx-1]]; set({ images: a }); }} disabled={idx === 0} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: idx === 0 ? 0.3 : 1, fontSize: 13 }}>←</button>
                      <button type="button" onClick={() => set({ images: images.filter((_, j) => j !== idx) })} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 13 }}>🗑</button>
                      <button type="button" onClick={() => { if (idx === images.length-1) return; const a = [...images]; [a[idx+1], a[idx]] = [a[idx], a[idx+1]]; set({ images: a }); }} disabled={idx === images.length-1} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: idx === images.length-1 ? 0.3 : 1, fontSize: 13 }}>→</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={async e => {
                const files = Array.from(e.target.files || []);
                if (!files.length) return;
                setUploading(true); setUploadErr(null);
                const added: string[] = [];
                for (const f of files) {
                  const { url, error } = await uploadImage(f);
                  if (error) { setUploadErr(error); break; }
                  if (url) added.push(url);
                }
                if (added.length) set({ images: [...images, ...added] });
                setUploading(false);
                if (fileRef.current) fileRef.current.value = '';
              }}
            />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || !isSupabaseConfigured} className="btn btn-ghost btn-sm">
              <Icon name="sparkles" size={14} /> {uploading ? 'Uploading…' : 'Upload photos'}
            </button>
            {!isSupabaseConfigured && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 10 }}>Connect Supabase to upload.</span>}
            {uploadErr && <div style={{ color: '#A8232C', fontSize: 12, marginTop: 6 }}>{uploadErr}</div>}

            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '14px 0 6px' }}>…or paste image URLs (one per line)</div>
            <textarea
              className="input"
              value={images.join('\n')}
              onChange={e => set({ images: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
              placeholder="https://…/photo-1.jpg&#10;https://…/photo-2.jpg"
              style={{ ...inputStyle, minHeight: 60, fontFamily: 'inherit', resize: 'vertical', fontSize: 13 }}
            />
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>First photo is the main image. Leave empty to use the generated illustration.</div>
          </Field>
        </div>

        {error && <div style={{ background: '#FDECEE', color: '#A8232C', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginTop: 18 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={submit} disabled={saving} className="btn btn-primary">
            {saving ? 'Saving…' : <><Icon name="check" size={14} /> {isNew ? 'Create vehicle' : 'Save changes'}</>}
          </button>
          <button onClick={() => router.push('/admin/inventory')} className="btn btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  );
}
