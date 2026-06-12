'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { TeamAvatar } from '@/components/TeamAvatar';
import { listTeam, TeamMember, SAMPLE_TEAM } from '@/lib/db';

export default function TeamPage() {
  const router = useRouter();
  const [team, setTeam] = useState<TeamMember[]>(SAMPLE_TEAM);

  useEffect(() => { listTeam().then(setTeam); }, []);

  return (
    <div className="page fade-in">
      <PageHeader
        eyebrow="Meet the team"
        title="Real people. Zero pressure."
        subtitle="The folks who'll greet you on the lot, find your keys, and remember your name. Click anyone to get to know them."
      />
      <div className="container" style={{ maxWidth: 1100, paddingBottom: 80 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 22 }}>
          {team.map(m => (
            <div
              key={m.slug}
              onClick={() => router.push(`/team/${m.slug}`)}
              style={{
                background: 'white', border: '1px solid var(--line)', borderRadius: 18,
                padding: '28px 24px 24px', textAlign: 'center', cursor: 'pointer',
                transition: 'transform 200ms, box-shadow 200ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, position: 'relative' }}>
                <TeamAvatar name={m.name} photoUrl={m.photoUrl} size={120} />
                {m.videoUrl && (
                  <span style={{
                    position: 'absolute', bottom: 2, right: 'calc(50% - 60px)',
                    background: 'var(--teal)', color: 'white', borderRadius: 999,
                    width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '3px solid white',
                  }} title="Has an intro video">
                    <span style={{ display: 'inline-block', width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '8px solid white', marginLeft: 2 }} />
                  </span>
                )}
              </div>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 600, letterSpacing: '-.01em', margin: '0 0 4px' }}>{m.name}</h3>
              <div style={{ fontSize: 13, color: 'var(--teal-2)', fontWeight: 600, marginBottom: 10 }}>{m.role}</div>
              {m.funFacts[0] && (
                <p style={{
                  fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, margin: '0 0 14px',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden',
                }}>
                  <Icon name="sparkles" size={12} style={{ color: 'var(--teal)', verticalAlign: '-1px', marginRight: 4 }} />
                  {m.funFacts[0]}
                </p>
              )}
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal-2)' }}>Meet {m.name.split(' ')[0]} →</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ background: 'var(--bg-soft)', borderRadius: 18, padding: '32px 36px', marginTop: 48, textAlign: 'center' }}>
          <h3 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600, margin: '0 0 8px', letterSpacing: '-.02em' }}>Come say hi in person</h3>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 16px' }}>550 Windmill Rd, Dartmouth — no appointment needed.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/contact')} className="btn btn-dark">
              <Icon name="location" size={14} /> Visit the showroom
            </button>
            <button onClick={() => router.push('/inventory')} className="btn btn-ghost">
              Browse inventory <Icon name="arrowRight" size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
