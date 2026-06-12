'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { TeamAvatar } from '@/components/TeamAvatar';
import { youTubeId } from '@/data/heroConfig';
import { getTeamMemberBySlug, createLead, TeamMember } from '@/lib/db';

export default function TeamClient({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [member, setMember] = useState<TeamMember | null | undefined>(undefined);

  // "Say hi" lead form
  const [form, setForm] = useState({ name: '', contact: '', message: '' });
  const [sent, setSent] = useState(false);

  useEffect(() => {
    getTeamMemberBySlug(params.slug).then(m => setMember(m && m.active === false ? null : m));
  }, [params.slug]);

  // NOTE: keep all early returns BELOW every hook call (rules of hooks).
  if (member === undefined) {
    return <div className="page fade-in" style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>;
  }

  if (!member) {
    return (
      <div className="page fade-in" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 600 }}>Team member not found</h1>
        <button onClick={() => router.push('/team')} className="btn btn-primary" style={{ marginTop: 24 }}>
          Meet the team <Icon name="arrowRight" size={14} />
        </button>
      </div>
    );
  }

  const firstName = member.name.split(' ')[0];
  const vid = youTubeId(member.videoUrl);

  const sendHi = () => {
    if (!form.name || !form.contact) return;
    createLead({
      type: 'contact',
      name: form.name,
      email: form.contact.includes('@') ? form.contact : undefined,
      phone: form.contact.includes('@') ? undefined : form.contact,
      payload: { for_team_member: member.name, message: form.message, source: 'team page' },
    });
    setSent(true);
  };

  return (
    <div className="page fade-in">
      <div className="container" style={{ maxWidth: 980, padding: '32px 20px 80px' }}>
        <button onClick={() => router.push('/team')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, marginBottom: 24 }}>
          ← Meet the team
        </button>

        {/* Profile header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 28, alignItems: 'center', marginBottom: 36 }}>
          <TeamAvatar name={member.name} photoUrl={member.photoUrl} size={140} radius={28} />
          <div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px', lineHeight: 1.05 }}>
              {member.name}
            </h1>
            <div style={{ fontSize: 16, color: 'var(--teal-2)', fontWeight: 600, marginBottom: 12 }}>{member.role}</div>
            {member.specialties.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {member.specialties.map(s => (
                  <span key={s} style={{ background: 'var(--teal-tint)', color: 'var(--teal-2)', padding: '4px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{s}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 32, alignItems: 'start' }}>
          {/* Left: video + bio + fun facts */}
          <div>
            {vid && (
              <div style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--line)', marginBottom: 24, background: 'var(--ink)' }}>
                <iframe
                  title={`Meet ${member.name}`}
                  src={`https://www.youtube.com/embed/${vid}?rel=0&modestbranding=1`}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                />
              </div>
            )}

            {member.bio && (
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600, letterSpacing: '-.01em', margin: '0 0 12px' }}>About {firstName}</h2>
                <p style={{ fontSize: 15.5, lineHeight: 1.7, color: 'var(--ink)', margin: 0, whiteSpace: 'pre-wrap' }}>{member.bio}</p>
              </div>
            )}

            {member.funFacts.length > 0 && (
              <div style={{ background: 'linear-gradient(135deg, rgba(0,124,146,0.06), rgba(90,138,255,0.04))', border: '1px solid var(--line)', borderRadius: 16, padding: '22px 26px' }}>
                <div className="ai-pill" style={{ marginBottom: 14 }}>
                  <span className="ai-dot" /> Fun facts about {firstName}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {member.funFacts.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, fontSize: 14.5, lineHeight: 1.5 }}>
                      <Icon name="sparkles" size={15} style={{ color: 'var(--teal)', flexShrink: 0, marginTop: 3 }} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: contact card */}
          <aside style={{ position: 'sticky', top: 90 }}>
            <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '24px 26px' }}>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: 19, fontWeight: 600, margin: '0 0 6px' }}>Work with {firstName}</h3>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5, margin: '0 0 16px' }}>
                Looking for your next car? {firstName} will take it from here — no pressure, ever.
              </p>

              {(member.phone || member.email) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {member.phone && (
                    <a href={`tel:${member.phone}`} className="btn btn-dark" style={{ textDecoration: 'none' }}>
                      <Icon name="phone" size={14} /> {member.phone}
                    </a>
                  )}
                  {member.email && (
                    <a href={`mailto:${member.email}`} className="btn btn-ghost" style={{ textDecoration: 'none' }}>
                      <Icon name="mail" size={14} /> Email {firstName}
                    </a>
                  )}
                </div>
              )}

              {sent ? (
                <div style={{ background: 'var(--teal-tint)', borderRadius: 12, padding: '16px 18px', textAlign: 'center' }}>
                  <Icon name="check" size={22} style={{ color: 'var(--teal-2)', marginBottom: 6 }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--teal-2)' }}>Sent! {firstName} will be in touch.</div>
                </div>
              ) : (
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Or leave a note</div>
                  <input className="input" placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  <input className="input" placeholder="Email or phone" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
                  <textarea className="input" placeholder={`Hi ${firstName}, I'm looking for…`} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} style={{ minHeight: 70, fontFamily: 'inherit', resize: 'vertical' }} />
                  <button onClick={sendHi} disabled={!form.name || !form.contact} className="btn btn-primary" style={{ width: '100%' }}>
                    Send to {firstName} <Icon name="arrowRight" size={14} />
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => router.push('/inventory')} className="btn btn-ghost" style={{ width: '100%', marginTop: 12 }}>
              Browse inventory <Icon name="arrowRight" size={14} />
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
