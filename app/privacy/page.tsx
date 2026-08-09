import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { LegalBody, LegalSection, LegalList } from '@/components/LegalDoc';
import { fetchSettings } from '@/lib/serverDb';

// Bump this whenever the text below changes — it is the date shown to visitors.
const LAST_UPDATED = 'August 2026';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What Carson Exports collects when you use this website, why, who we share it with, and how to ask us to delete it.',
};

export default async function PrivacyPage() {
  const { contactEmail, contactAddress, contactPhone } = await fetchSettings();
  const email = contactEmail || 'hello@carsonexports.com';
  const address = contactAddress || '550 Windmill Rd, Dartmouth, NS B3B 1B3';

  return (
    <div className="page fade-in">
      <PageHeader
        eyebrow="Privacy"
        title="What we collect, and why."
        subtitle="Plain English, no legalese padding. This describes exactly what this website does with your information."
      />
      <LegalBody updated={LAST_UPDATED}>
        <LegalSection heading="The short version">
          <p style={{ margin: 0 }}>
            We collect what we need to answer your questions, hold your appointments, and keep your
            saved cars where you left them. We don&apos;t sell your information to anyone, and we
            don&apos;t buy lists. If you want your data gone, email us and we&apos;ll delete it.
          </p>
        </LegalSection>

        <LegalSection heading="Information you give us">
          <LegalList items={[
            <><strong>When you contact us or ask about a vehicle</strong> — your name, email address, phone number if you provide one, and whatever you write in the message. This is stored as an enquiry so a salesperson can follow up.</>,
            <><strong>When you book a test drive</strong> — the same contact details plus the appointment time and the vehicle. We use these to confirm the booking, send you a reminder, and let you cancel.</>,
            <><strong>When you create an account (My Garage)</strong> — your email address and a password. The password is handled by our authentication provider and is never visible to us.</>,
            <><strong>When you use the site while signed in</strong> — your saved vehicles, price-drop watches, CarFinder alert criteria, and your email-notification preference, so they follow you between devices.</>,
            <><strong>When you use the trade-in or pre-qualification tools</strong> — the vehicle and budget details you enter. These tools give an estimate only; they do not run a credit check and do not ask for a social insurance number, bank details, or payment card.</>,
            <><strong>When you chat with us</strong> — the messages you send. Chat conversations are stored so our team can pick up where the conversation left off.</>,
          ]}/>
        </LegalSection>

        <LegalSection heading="Information collected automatically">
          <p style={{ margin: 0 }}>
            We use website analytics to understand which pages and vehicles people look at. This
            records things like the pages visited, the referring site, and general device and
            browser information. We also count views on individual vehicle listings so we can show
            which cars are getting attention.
          </p>
          <p style={{ margin: '12px 0 0' }}>
            Two analytics tools are in use: Google Analytics 4, and a self-hosted analytics script
            at shawnryder.site. You can opt out of Google Analytics across every site that uses it
            with Google&apos;s{' '}
            <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal-2)' }}>
              browser opt-out add-on
            </a>.
          </p>
        </LegalSection>

        <LegalSection heading="Who else sees it">
          <p style={{ margin: 0 }}>
            We use a small number of service providers to actually run the website. Each one only
            receives what it needs to do its job:
          </p>
          <LegalList items={[
            <><strong>Supabase</strong> — hosts the database and accounts, so it holds enquiries, bookings, saved cars and chat history.</>,
            <><strong>Netlify</strong> — hosts and serves the website.</>,
            <><strong>Resend</strong> — sends confirmation, reminder and alert emails, so it receives your email address and the contents of those messages.</>,
            <><strong>Twilio</strong> — sends text-message alerts to our sales team. Your name and phone number can appear in those alerts.</>,
            <><strong>OpenAI and OpenRouter</strong> — power the AI assistant, the AI search and the vehicle write-ups. When you ask the assistant a question, the text of your question is sent to one of these providers to generate an answer.</>,
            <><strong>Google</strong> — Analytics, as described above.</>,
          ]}/>
          <p style={{ margin: '14px 0 0' }}>
            Some of these providers process data outside Canada. We do not sell your personal
            information, and we do not share it with advertisers.
          </p>
        </LegalSection>

        <LegalSection heading="Cookies and local storage">
          <p style={{ margin: 0 }}>
            Signing in to My Garage sets a session cookie so you stay signed in. Your browser also
            stores your recently viewed vehicles and comparison list locally on your own device
            when you are not signed in. Analytics tools set their own identifiers. Clearing your
            browser storage removes all of it.
          </p>
        </LegalSection>

        <LegalSection heading="Your choices">
          <LegalList items={[
            <><strong>See or correct your information</strong> — email us and we&apos;ll send you what we hold, or fix anything that&apos;s wrong.</>,
            <><strong>Delete your account and data</strong> — email us and we&apos;ll remove it. Enquiries and bookings connected to a completed sale may be kept where we&apos;re required to keep sales records.</>,
            <><strong>Stop the emails</strong> — every email we send has an unsubscribe link, and you can also change your notification setting in My Garage. Turning off marketing emails does not stop appointment confirmations you asked for.</>,
            <><strong>Manage saved cars and alerts</strong> — you can remove any saved vehicle, price watch or CarFinder alert yourself from My Garage.</>,
          ]}/>
        </LegalSection>

        <LegalSection heading="Children">
          <p style={{ margin: 0 }}>
            This site is meant for people old enough to buy or finance a vehicle. We don&apos;t
            knowingly collect information from children.
          </p>
        </LegalSection>

        <LegalSection heading="Changes to this policy">
          <p style={{ margin: 0 }}>
            If we change how we handle your information, we&apos;ll update this page and change the
            date at the top.
          </p>
        </LegalSection>

        <LegalSection heading="Contact us">
          <p style={{ margin: 0 }}>
            Questions, or want your data removed? Email{' '}
            <a href={`mailto:${email}`} style={{ color: 'var(--teal-2)' }}>{email}</a>
            {contactPhone ? <>, call {contactPhone},</> : ','} or write to us at {address}. You can
            also use the <Link href="/contact" style={{ color: 'var(--teal-2)' }}>contact form</Link>.
          </p>
        </LegalSection>
      </LegalBody>
    </div>
  );
}
