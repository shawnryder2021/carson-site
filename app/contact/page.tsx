'use client';

import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { createLead } from '@/lib/db';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: any) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    createLead({ type: 'contact', name: form.name, email: form.email, phone: form.phone, payload: { subject: form.subject, message: form.message } });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
    setForm({ name: '', email: '', phone: '', subject: '', message: '' });
  };

  return (
    <div className="page fade-in">
      <PageHeader eyebrow="Get in touch" title="Let's talk cars." subtitle="Have a question? Want to schedule a test drive? Just want to chat about what makes Carson different? We'd love to hear from you."/>
      <div className="container" style={{ maxWidth: 1200, paddingBottom: 80 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'start' }}>

          {/* Contact Form */}
          <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 18, padding: '32px 36px' }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ width: 56, height: 56, margin: '0 auto 20px', borderRadius: '50%', background: 'var(--teal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="check" size={24} style={{ color: 'var(--teal-2)' }}/>
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Message sent!</div>
                <div style={{ fontSize: 14, color: 'var(--muted)' }}>We'll get back to you within 24 hours.</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.02em' }}>Name</label>
                  <input type="text" name="name" value={form.name} onChange={handleChange} required className="input" placeholder="Your name"/>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.02em' }}>Email</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required className="input" placeholder="your@email.com"/>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.02em' }}>Phone (optional)</label>
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="input" placeholder="(555) 234-9090"/>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.02em' }}>Subject</label>
                  <input type="text" name="subject" value={form.subject} onChange={handleChange} required className="input" placeholder="What's this about?"/>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.02em' }}>Message</label>
                  <textarea name="message" value={form.message} onChange={handleChange} required className="input" placeholder="Tell us what's on your mind..." style={{ minHeight: 120, fontFamily: 'inherit', resize: 'none' }}/>
                </div>
                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  Send message
                </button>
              </form>
            )}
          </div>

          {/* Contact Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 600, margin: '0 0 16px', letterSpacing: '-.02em' }}>Find us</h3>
              <div style={{ display: 'grid', gap: 14 }}>
                {[
                  { icon: 'location', label: 'Showroom', value: '550 Windmill Rd, Dartmouth, NS B3B 1B3' },
                  { icon: 'phone', label: 'Call us', value: '(555) 234-9090' },
                  { icon: 'mail', label: 'Email', value: 'hello@carsonexports.com' },
                ].map(c => (
                  <div key={c.label} style={{ display: 'flex', gap: 12 }}>
                    <Icon name={c.icon as any} size={20} style={{ color: 'var(--teal)', flexShrink: 0, marginTop: 2 }}/>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 2 }}>{c.label}</div>
                      <div style={{ fontSize: 15, color: 'var(--ink)' }}>{c.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 600, margin: '0 0 16px', letterSpacing: '-.02em' }}>Hours</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  { day: 'Mon–Fri', time: '9 AM–7 PM' },
                  { day: 'Saturday', time: '10 AM–6 PM' },
                  { day: 'Sunday', time: '11 AM–5 PM' },
                ].map(h => (
                  <div key={h.day} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ fontWeight: 600 }}>{h.day}</span>
                    <span style={{ color: 'var(--muted)' }}>{h.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <Icon name="sparkles" size={16} style={{ color: 'var(--teal)', flexShrink: 0 }}/>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Talk to Carson AI anytime</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>Our AI concierge is available 24/7 to answer questions about cars, financing, trade-ins, and more. No wait, no judgment.</p>
            </div>
          </div>
        </div>

        {/* Map */}
        <div style={{ marginTop: 60 }}>
          <h3 style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 600, margin: '0 0 16px', letterSpacing: '-.02em' }}>Visit our showroom</h3>
          <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid var(--line)', lineHeight: 0 }}>
            <iframe
              title="Carson Exports — 550 Windmill Rd, Dartmouth, NS"
              src="https://www.google.com/maps?q=550+Windmill+Rd,+Dartmouth,+NS+B3B+1B3&output=embed"
              width="100%"
              height="420"
              style={{ border: 0, display: 'block' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
          <a
            href="https://www.google.com/maps/dir/?api=1&destination=550+Windmill+Rd,+Dartmouth,+NS+B3B+1B3"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 14 }}
          >
            <Icon name="location" size={14}/> Get directions
          </a>
        </div>
      </div>
    </div>
  );
}
