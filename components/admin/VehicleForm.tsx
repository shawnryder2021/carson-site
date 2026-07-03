'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { fmtPrice } from '@/lib/format';
import { complete, generateDescriptionPrompt } from '@/lib/ai';
import { getBrowserClient } from '@/lib/supabase/client';
import { saveVehicle, uploadImage, getPriceHistory, isSupabaseConfigured, AdminVehicle, PricePoint, VehicleDisplayOptions } from '@/lib/db';

const OR_MODELS = [
  // OpenAI
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
  { id: 'openai/gpt-4.1', label: 'GPT-4.1' },
  { id: 'openai/gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { id: 'openai/gpt-4.1-nano', label: 'GPT-4.1 Nano' },
  { id: 'openai/o4-mini', label: 'o4-mini' },
  // Anthropic
  { id: 'anthropic/claude-opus-4', label: 'Claude Opus 4' },
  { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
  { id: 'anthropic/claude-haiku-4', label: 'Claude Haiku 4' },
  { id: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku' },
  // Google
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { id: 'google/gemma-3-27b-it', label: 'Gemma 3 27B' },
  // Meta
  { id: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick' },
  { id: 'meta-llama/llama-4-scout', label: 'Llama 4 Scout' },
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
  // DeepSeek
  { id: 'deepseek/deepseek-chat-v3-0324', label: 'DeepSeek V3' },
  { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1' },
  // Mistral
  { id: 'mistralai/mistral-large-2', label: 'Mistral Large 2' },
  { id: 'mistralai/mistral-small-3.2', label: 'Mistral Small 3.2' },
  // Qwen
  { id: 'qwen/qwen3-235b-a22b', label: 'Qwen 3 235B' },
  { id: 'qwen/qwen3-32b', label: 'Qwen 3 32B' },
  // xAI
  { id: 'x-ai/grok-3-mini', label: 'Grok 3 Mini' },
  // Cohere
  { id: 'cohere/command-a', label: 'Command A' },
  // Amazon
  { id: 'amazon/nova-pro-v1', label: 'Nova Pro' },
];

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
  const [writing, setWriting] = useState(false);
  const [aiSource, setAiSource] = useState<'default' | 'openrouter'>('openrouter');
  const [orModel, setOrModel] = useState(OR_MODELS[0].id);
  const [lastModel, setLastModel] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const set = (patch: Partial<AdminVehicle>) => setV(prev => ({ ...prev, ...patch }));

  useEffect(() => {
    if (!isNew && initial?.id) getPriceHistory(initial.id).then(setHistory);
  }, [isNew, initial?.id]);

  const daysOnLot = initial?.createdAt
    ? Math.max(0, Math.floor((Date.now() - new Date(initial.createdAt).getTime()) / 86400000))
    : null;

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

      {/* Performance stats (existing vehicles) */}
      {!isNew && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Days on lot', value: daysOnLot === null ? '—' : daysOnLot === 0 ? 'Today' : `${daysOnLot}` },
            { label: 'Page views', value: String(initial?.views ?? 0) },
            { label: 'Price changes', value: String(Math.max(0, history.length - 1)) },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Price history */}
      {!isNew && history.length > 0 && (
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 10 }}>Price history</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {history.map((p, i) => {
              const prev = i > 0 ? history[i - 1].price : null;
              const delta = prev !== null ? p.price - prev : 0;
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>{new Date(p.recordedAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  <span>
                    <strong>{fmtPrice(p.price)}</strong>
                    {prev !== null && delta !== 0 && (
                      <span style={{ marginLeft: 8, fontWeight: 700, color: delta < 0 ? '#0F6B2D' : '#A8232C' }}>
                        {delta < 0 ? '▼' : '▲'} {fmtPrice(Math.abs(delta))}
                      </span>
                    )}
                    {i === 0 && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--muted)' }}>listed</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

          <Field label="Page sections">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {([
                { key: 'showPros', label: 'Pros' },
                { key: 'showThingsToKnow', label: 'Things to know' },
                { key: 'showIncluded', label: 'Included with every Carson' },
              ] as { key: keyof VehicleDisplayOptions; label: string }[]).map(opt => (
                <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={!!(v.displayOptions?.[opt.key])}
                    onChange={e => set({ displayOptions: { ...v.displayOptions, [opt.key]: e.target.checked } })}
                    style={{ accentColor: 'var(--teal)' }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Toggle which sections appear on the public vehicle page.</div>
          </Field>

          <Field label="Description">
            <textarea className="input" value={v.aiSummary} onChange={e => set({ aiSummary: e.target.value })} placeholder="Reliable sedan, great for daily commute" style={{ ...inputStyle, minHeight: 70, fontFamily: 'inherit', resize: 'vertical' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <select
                className="select"
                value={aiSource}
                onChange={e => setAiSource(e.target.value as 'default' | 'openrouter')}
                style={{ width: 'auto', fontSize: 13 }}
              >
                <option value="default">Default (OpenAI)</option>
                <option value="openrouter">OpenRouter</option>
              </select>

              {aiSource === 'openrouter' && (
                <select
                  className="select"
                  value={orModel}
                  onChange={e => setOrModel(e.target.value)}
                  style={{ width: 'auto', fontSize: 13 }}
                >
                  {OR_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={async () => {
                  if (!v.make || !v.model) { setError('Add year, make, and model first so the AI has something to work with.'); return; }
                  setWriting(true); setError(null); setLastModel(null);
                  try {
                    const prompt = generateDescriptionPrompt(v);
                    let reply: string;
                    if (aiSource === 'openrouter') {
                      const { data: sess } = await getBrowserClient()!.auth.getSession();
                      const token = sess?.session?.access_token;
                      const res = await fetch('/api/openrouter', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                        body: JSON.stringify({ prompt, model: orModel }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.reply || 'OpenRouter error');
                      reply = data.reply;
                      setLastModel(data.model || orModel);
                    } else {
                      reply = await complete(prompt);
                      setLastModel('OpenAI');
                    }
                    set({ aiSummary: reply.trim().replace(/^["']|["']$/g, '') });
                  } catch {
                    setError('AI writing failed — try again in a moment.');
                  }
                  setWriting(false);
                }}
                disabled={writing}
                className="btn btn-primary btn-sm"
              >
                <Icon name="sparkles" size={13} /> {writing ? 'Writing…' : 'Generate'}
              </button>
            </div>

            {lastModel && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                Generated by {lastModel} — edit before saving.
              </div>
            )}
            {!lastModel && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                Pick a model and generate a description from the vehicle specs.
              </div>
            )}
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
