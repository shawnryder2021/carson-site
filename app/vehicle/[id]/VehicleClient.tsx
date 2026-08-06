'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { VehicleCard } from '@/components/VehicleCard';
import { GallerySkeleton, SkeletonBox } from '@/components/Skeleton';
import { Lightbox } from '@/components/Lightbox';
import { SmartImage } from '@/components/SmartImage';
import { DotsAnim } from '@/components/DotsAnim';
import { Modal } from '@/components/Modal';
import { INVENTORY } from '@/data/inventory';
import { vehicleImageURL } from '@/data/vehicleImage';
import { fmtPrice, fmtMiles, estMonthly } from '@/lib/format';
import { complete } from '@/lib/ai';
import { useSaved } from '@/context/SavedContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { getVehicleById, listVehicles, createLead, recordVehicleView, createVehicleWatch, AdminVehicle } from '@/lib/db';
import { getBrowserClient } from '@/lib/supabase/client';
import { similarToVehicle } from '@/lib/recommend';
import { monthlyPayment, financedAmount, CREDIT_TIERS, TERM_OPTIONS, DEFAULT_TERMS } from '@/lib/payment';
import { createCarRequest } from '@/lib/db';
import { SoldOverlay } from '@/components/SoldBadge';
import { recordRecentlyViewed } from '@/lib/recentlyViewed';
import { gaEvent } from '@/lib/gtag';

const PRESET_QUESTIONS = [
  'Is this a fair price?',
  'How reliable is this model?',
  'What should I check at the test drive?',
  'What are the typical maintenance costs?',
];

export default function VehicleClient({ params, ssrSimilar = [], initialVehicle }: { params: { id: string }; ssrSimilar?: AdminVehicle[]; initialVehicle?: AdminVehicle | null }) {
  const router = useRouter();
  const { saved, toggleSave } = useSaved();
  const { contactPhone } = useSiteSettings();
  // Seeded from the server so the page (including the sold state and the
  // similar-vehicles rail) is in the initial HTML for crawlers and paints
  // instantly; the client fetch below refreshes it with the full record.
  const [vehicle, setVehicle] = useState<AdminVehicle | null | undefined>(initialVehicle ?? undefined);
  const [allVehicles, setAllVehicles] = useState<AdminVehicle[]>(INVENTORY as AdminVehicle[]);
  const isSaved = saved.includes(params.id);

  useEffect(() => {
    (async () => {
      const [v, all] = await Promise.all([getVehicleById(params.id), listVehicles()]);
      // Admin-hidden vehicles are not publicly viewable, even by direct URL.
      setVehicle(v && (v as any).hiddenOverride ? null : v);
      if (all.length) setAllVehicles(all);
      // Count one view per vehicle per browser session.
      if (v && !(v as any).hiddenOverride) {
        recordRecentlyViewed(params.id);
        gaEvent('view_item', {
          item_id: v.id,
          item_name: `${v.year} ${v.make} ${v.model}`,
          value: v.price,
          currency: 'CAD',
        });
        const key = `cx_viewed_${params.id}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          recordVehicleView(params.id);
        }
      }
    })();
  }, [params.id]);

  const [tab, setTab] = useState<'overview' | 'specs'>('overview');
  const [activeImage, setActiveImage] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [modal, setModal] = useState<null | 'testdrive' | 'video' | 'delivery' | 'otd' | 'watch' | 'interested' | 'alert' | 'payment'>(null);
  const [submitted, setSubmitted] = useState(false);

  // "I'm Interested" state
  const [intName, setIntName] = useState('');
  const [intContact, setIntContact] = useState('');
  const [intMessage, setIntMessage] = useState('');
  const [intBusy, setIntBusy] = useState(false);

  const submitInterest = async () => {
    if (!vehicle || !intName.trim() || !intContact.trim()) return;
    setIntBusy(true);
    const isEmail = intContact.includes('@');
    await createLead({
      type: 'contact',
      name: intName.trim(),
      email: isEmail ? intContact.trim() : '',
      phone: isEmail ? '' : intContact.trim(),
      vehicleId: vehicle.id,
      payload: { vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`, message: intMessage, source: 'interested_button' },
    });
    setIntBusy(false);
    setSubmitted(true);
    setTimeout(() => { setModal(null); setSubmitted(false); setIntName(''); setIntContact(''); setIntMessage(''); }, 2000);
  };

  // Payment calculator state. Shares lib/payment.ts with /finance so the two
  // surfaces can never disagree on a monthly figure.
  const [calcDown, setCalcDown] = useState<number | null>(null); // null → 10% default once the price is known
  const [calcTrade, setCalcTrade] = useState(0);
  const [calcTerm, setCalcTerm] = useState(DEFAULT_TERMS.term);
  const [calcTier, setCalcTier] = useState('good');
  const [calcApr, setCalcApr] = useState(DEFAULT_TERMS.apr);
  const [calcBusy, setCalcBusy] = useState(false);
  const calcFired = useRef(false);

  // Fire the calculator-opened event once per page view (effect, not render).
  useEffect(() => {
    if (modal !== 'payment' || calcFired.current || !vehicle) return;
    calcFired.current = true;
    const down = calcDown ?? Math.round(vehicle.price * DEFAULT_TERMS.downPct);
    gaEvent('calculate_payment', {
      vehicle_id: vehicle.id,
      monthly: monthlyPayment({ price: vehicle.price, down, tradeIn: calcTrade, term: calcTerm, apr: calcApr }),
      term: calcTerm, apr: calcApr, down, trade: calcTrade,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, vehicle]);

  const submitPaymentLead = async () => {
    if (!vehicle) return;
    setCalcBusy(true);
    const down = calcDown ?? Math.round(vehicle.price * DEFAULT_TERMS.downPct);
    const monthly = monthlyPayment({ price: vehicle.price, down, tradeIn: calcTrade, term: calcTerm, apr: calcApr });
    await createLead({
      type: 'finance',
      vehicleId: vehicle.id,
      payload: {
        vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        price: vehicle.price, down, tradeIn: calcTrade, term: calcTerm, apr: calcApr, monthly,
        source: 'payment_calculator',
      },
    });
    setCalcBusy(false);
    router.push(`/finance?vehicleId=${vehicle.id}`);
  };

  // "Alert me when a similar one arrives" (sold vehicles) — creates a real
  // CarFinder request prefilled from this car, so the existing match-alert
  // pipeline notifies them when comparable inventory lands.
  const [alertName, setAlertName] = useState('');
  const [alertContact, setAlertContact] = useState('');
  const [alertBusy, setAlertBusy] = useState(false);

  const submitAlert = async () => {
    if (!vehicle || !alertName.trim() || !alertContact.trim()) return;
    setAlertBusy(true);
    const isEmail = alertContact.includes('@');
    const email = isEmail ? alertContact.trim() : '';
    const phone = isEmail ? '' : alertContact.trim();
    await createCarRequest({
      name: alertName.trim(), email, phone,
      contactPref: isEmail ? 'email' : 'sms',
      body: vehicle.body || '', make: vehicle.make || '', model: '',
      yearMin: null, priceMax: Math.round(vehicle.price * 1.2), mileageMax: null,
      fuel: '', drive: '',
      notes: `Interested in something like the ${vehicle.year} ${vehicle.make} ${vehicle.model} (sold).`,
    });
    await createLead({
      type: 'carfinder', name: alertName.trim(), email, phone, vehicleId: vehicle.id,
      payload: { vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`, source: 'sold_vehicle_alert' },
    });
    setAlertBusy(false);
    setSubmitted(true);
    setTimeout(() => { setModal(null); setSubmitted(false); setAlertName(''); setAlertContact(''); }, 2200);
  };

  // Sticky bar scroll visibility
  const [showStickyBar, setShowStickyBar] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Watch-this-car state
  const { user } = useCustomerAuth();
  const [watchContact, setWatchContact] = useState('');
  const [watching, setWatching] = useState(false);
  const [watchBusy, setWatchBusy] = useState(false);
  useEffect(() => {
    setWatching(typeof window !== 'undefined' && !!localStorage.getItem(`cx_watch_${params.id}`));
  }, [params.id]);
  // Signed-in shoppers shouldn't have to retype their email.
  useEffect(() => {
    if (user?.email) setWatchContact(c => c || user.email!);
  }, [user?.email]);

  const startWatch = async () => {
    if (!vehicle || !watchContact.trim()) return;
    setWatchBusy(true);
    const isEmail = watchContact.includes('@');
    const { error } = await createVehicleWatch({
      vehicleId: vehicle.id,
      name: '',
      email: isEmail ? watchContact.trim() : '',
      phone: isEmail ? '' : watchContact.trim(),
      contactPref: isEmail ? 'email' : 'sms',
      lastNotifiedPrice: vehicle.price,
    });
    setWatchBusy(false);
    if (!error) {
      localStorage.setItem(`cx_watch_${params.id}`, '1');
      setWatching(true);
      setSubmitted(true);
      setTimeout(() => { setModal(null); setSubmitted(false); setWatchContact(''); }, 1800);
    }
  };

  // Test drive state — real slots fetched from the scheduler API
  type TDDay = { dateKey: string; dateLabel: string; slots: { iso: string; timeLabel: string; available: boolean }[] };
  const [tdName, setTdName] = useState('');
  const [tdEmail, setTdEmail] = useState('');
  const [tdPhone, setTdPhone] = useState('');
  const [tdSlotIso, setTdSlotIso] = useState('');
  const [tdDays, setTdDays] = useState<TDDay[]>([]);
  const [tdActiveDate, setTdActiveDate] = useState('');
  const [tdLoadingSlots, setTdLoadingSlots] = useState(false);
  const [tdSubmitting, setTdSubmitting] = useState(false);
  const [tdError, setTdError] = useState<string | null>(null);

  // Load available slots whenever the test-drive modal opens.
  useEffect(() => {
    if (modal !== 'testdrive') return;
    setTdLoadingSlots(true); setTdError(null);
    fetch('/api/testdrive-slots')
      .then(r => r.json())
      .then(d => {
        const days: TDDay[] = (d.days || []).filter((day: TDDay) => day.slots.some(s => s.available));
        setTdDays(days);
        setTdActiveDate(days.length ? days[0].dateKey : '');
      })
      .catch(() => setTdError('Could not load available times. Please call us to book.'))
      .finally(() => setTdLoadingSlots(false));
  }, [modal]);

  const submitTestDrive = async () => {
    if (!vehicle || !tdSlotIso) return;
    setTdSubmitting(true); setTdError(null);
    try {
      const sb = getBrowserClient();
      const token = sb ? (await sb.auth.getSession()).data.session?.access_token : undefined;
      const res = await fetch('/api/book-testdrive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ vehicleId: vehicle.id, slotIso: tdSlotIso, name: tdName, email: tdEmail, phone: tdPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTdError(data.error || 'Could not book that time. Please try another.');
        // A taken slot (409) — refresh availability so the UI reflects it.
        if (res.status === 409) {
          setTdSlotIso('');
          fetch('/api/testdrive-slots').then(r => r.json()).then(d => {
            const days: TDDay[] = (d.days || []).filter((day: TDDay) => day.slots.some(s => s.available));
            setTdDays(days);
          }).catch(() => {});
        }
        setTdSubmitting(false);
        return;
      }
      gaEvent('generate_lead', { lead_type: 'testdrive', vehicle_id: vehicle.id });
      gaEvent('book_test_drive', { vehicle_id: vehicle.id });
      setSubmitted(true);
      setTimeout(() => {
        setModal(null); setSubmitted(false);
        setTdSlotIso(''); setTdName(''); setTdEmail(''); setTdPhone(''); setTdActiveDate('');
      }, 2400);
    } catch {
      setTdError('Could not book right now. Please try again.');
    }
    setTdSubmitting(false);
  };

  // Video request state
  const [videoFocus, setVideoFocus] = useState<string[]>([]);
  const [videoEmail, setVideoEmail] = useState('');
  const [videoNotes, setVideoNotes] = useState('');

  // Delivery state
  const [deliveryZip, setDeliveryZip] = useState('');
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);

  // OTD state
  const [otdState, setOtdState] = useState('NS');

  const finishModal = () => {
    // Capture the lead based on which modal is open
    if (vehicle && modal) {
      const veh = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
      if (modal === 'video') {
        createLead({ type: 'video', email: videoEmail, vehicleId: vehicle.id, payload: { vehicle: veh, focus: videoFocus, notes: videoNotes } });
      } else if (modal === 'delivery') {
        createLead({ type: 'delivery', vehicleId: vehicle.id, payload: { vehicle: veh, zip: deliveryZip, distance: deliveryDistance } });
      }
    }
    setSubmitted(true);
    setTimeout(() => {
      setModal(null);
      setSubmitted(false);
      setVideoFocus([]); setVideoEmail(''); setVideoNotes('');
      setDeliveryZip(''); setDeliveryDistance(null);
    }, 1800);
  };

  // NOTE: keep all early returns BELOW every hook call (rules of hooks).
  if (vehicle === undefined) {
    return (
      <div className="page fade-in">
        <div className="container rg" style={{ maxWidth: 1200, padding: '32px 20px 60px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32 }}>
          <GallerySkeleton />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SkeletonBox w="80%" h={28} />
            <SkeletonBox w="50%" h={36} />
            <SkeletonBox h={120} r={14} />
            <SkeletonBox h={44} r={10} />
            <SkeletonBox h={44} r={10} />
          </div>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="page fade-in" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 600 }}>Vehicle not found</h1>
        <p style={{ color: 'var(--muted)', marginTop: 12 }}>This car may have already been sold.</p>
        <button onClick={() => router.push('/inventory')} className="btn btn-primary" style={{ marginTop: 24 }}>
          Browse inventory <Icon name="arrowRight" size={14}/>
        </button>
      </div>
    );
  }

  const isSold = vehicle.status === 'sold';
  // Recommendations run through the CarFinder matcher, which excludes
  // sold/hidden vehicles — so this rail can never suggest an unbuyable car.
  // The server passes an SSR-rendered list (crawlable); fall back to computing
  // client-side if it wasn't provided.
  const similar = ssrSimilar && ssrSimilar.length > 0 ? ssrSimilar : similarToVehicle(vehicle, allVehicles);
  const opts = vehicle.displayOptions ?? {};

  // Fair price estimate
  const marketLow = Math.round(vehicle.price * 0.96);
  const marketHigh = Math.round(vehicle.price * 1.04);
  const isBelowMarket = vehicle.price < (marketLow + marketHigh) / 2;
  const savings = Math.round((marketLow + marketHigh) / 2) - vehicle.price;

  const askAI = async (question?: string) => {
    const q = question || aiQuestion;
    if (!q.trim()) return;
    setAiThinking(true);
    setAiReply(null);

    const prompt = `You're Carson AI, a helpful car shopping assistant. A customer is looking at this vehicle:
${vehicle.year} ${vehicle.make} ${vehicle.model}
Price: ${fmtPrice(vehicle.price)}
Mileage: ${fmtMiles(vehicle.mileage)}
Body: ${vehicle.body}, Fuel: ${vehicle.fuel}, Drive: ${vehicle.drive}
Exterior: ${vehicle.exterior}, Interior: ${vehicle.interior}

Customer's question: "${q}"

Answer briefly (2-4 sentences) in a friendly, honest, helpful tone. Be specific to this vehicle. Don't be salesy.`;

    try {
      const reply = await complete(prompt);
      setAiReply(reply);
    } catch {
      setAiReply("I'm having trouble thinking right now, but our team can help. Call (555) 234-9090.");
    }
    setAiThinking(false);
    setAiQuestion('');
  };

  const specs = [
    { label: 'Year', value: vehicle.year },
    { label: 'Make', value: vehicle.make },
    { label: 'Model', value: vehicle.model },
    { label: 'Mileage', value: fmtMiles(vehicle.mileage) },
    { label: 'Body Style', value: vehicle.body },
    { label: 'Fuel Type', value: vehicle.fuel },
    { label: 'Drivetrain', value: vehicle.drive },
    { label: 'Exterior', value: vehicle.exterior },
    { label: 'Interior', value: vehicle.interior },
    { label: 'VIN', value: 'CXN' + String(vehicle.id || '').slice(-6).toUpperCase() + 'XXXXXX' },
  ];


  return (
    <div className="page fade-in">
      <div className="container" style={{ maxWidth: 1400, padding: '24px 20px 80px' }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
          <button onClick={() => router.push('/inventory')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
            ← Back to inventory
          </button>
        </div>

        {/* Top bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 12, marginBottom: 20, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(20px,3vw,26px)', fontWeight: 700, letterSpacing: '-.02em', margin: 0, lineHeight: 1.2 }}>
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {fmtPrice(vehicle.price)} · {fmtMiles(vehicle.mileage)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {isSold ? (
              <>
                <button onClick={() => setModal('alert')} className="btn btn-primary btn-sm">
                  <Icon name="mail" size={13} /> Alert me
                </button>
                <a href="#similar" className="btn btn-ghost btn-sm">
                  <Icon name="search" size={13} /> See similar
                </a>
              </>
            ) : (
              <>
                <button onClick={() => setModal('interested')} className="btn btn-primary btn-sm">
                  <Icon name="heart" size={13} /> Interested
                </button>
                <button onClick={() => setModal('testdrive')} className="btn btn-dark btn-sm">
                  <Icon name="car" size={13} /> Test drive
                </button>
                <button onClick={() => setModal('video')} className="btn btn-ghost btn-sm">
                  <Icon name="sparkles" size={13} /> Video
                </button>
              </>
            )}
          </div>
        </div>

        <div className="rg" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 40, alignItems: 'start' }}>
          {/* Left column */}
          <div>
            {/* Gallery */}
            {(() => {
              const photos: string[] = (vehicle as any).images || [];
              const hasPhotos = photos.length > 0;
              const mainSrc = hasPhotos ? photos[Math.min(activeImage, photos.length - 1)] : vehicleImageURL(vehicle, { size: 800 });
              return (
                <>
                  <div
                    onClick={hasPhotos ? () => setLightbox(Math.min(activeImage, photos.length - 1)) : undefined}
                    style={{ background: 'var(--bg-soft)', borderRadius: 18, overflow: 'hidden', marginBottom: 12, aspectRatio: '4/3', position: 'relative', cursor: hasPhotos ? 'zoom-in' : 'default' }}
                  >
                    <SmartImage
                      src={mainSrc}
                      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      sizes="(max-width: 860px) 100vw, 60vw"
                      priority
                      style={{ objectFit: hasPhotos ? 'cover' : 'contain', filter: isSold ? 'grayscale(.6)' : undefined }}
                    />
                    {isSold && <SoldOverlay size="lg" />}
                    {hasPhotos && (
                      <div style={{ position: 'absolute', bottom: 14, left: 14, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 12, fontWeight: 700, padding: '5px 11px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 5, pointerEvents: 'none' }}>
                        <Icon name="search" size={12} /> {photos.length} photo{photos.length === 1 ? '' : 's'}
                      </div>
                    )}
                    <button
                      onClick={() => toggleSave(vehicle.id)}
                      style={{
                        position: 'absolute', top: 20, right: 20, width: 48, height: 48, borderRadius: '50%',
                        background: 'white', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                      }}
                    >
                      <Icon name="heart" size={20} style={{ color: isSaved ? 'var(--teal)' : 'var(--muted)', fill: isSaved ? 'var(--teal)' : 'none' }} />
                    </button>
                  </div>
                  {hasPhotos && photos.length > 1 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
                      {photos.slice(0, 8).map((url, i) => {
                        const isLast = i === 7 && photos.length > 8;
                        return (
                          <button
                            key={i}
                            onClick={() => (isLast ? setLightbox(7) : setActiveImage(i))}
                            style={{
                              background: 'var(--bg-soft)',
                              border: '2px solid ' + (activeImage === i ? 'var(--teal)' : 'transparent'),
                              borderRadius: 10, overflow: 'hidden', padding: 0, cursor: 'pointer', aspectRatio: '4/3', position: 'relative',
                            }}
                          >
                            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {isLast && (
                              <span style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.58)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800 }}>
                                +{photos.length - 8} more
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {!hasPhotos && <div style={{ marginBottom: 32 }} />}
                  {lightbox !== null && (
                    <Lightbox photos={photos} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(null)} />
                  )}
                </>
              );
            })()}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', marginBottom: 24 }}>
              {([['overview', 'AI Overview'], ['specs', 'Specifications']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '14px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: tab === key ? 'var(--teal-2)' : 'var(--muted)',
                    borderBottom: '2px solid ' + (tab === key ? 'var(--teal)' : 'transparent'),
                    marginBottom: -1,
                    fontFamily: 'inherit',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {tab === 'overview' && (
              <div>
                <div style={{ background: 'linear-gradient(135deg, rgba(0,124,146,0.06), rgba(90,138,255,0.04))', border: '1px solid var(--line)', borderRadius: 14, padding: '24px 28px', marginBottom: 20 }}>
                  <div className="ai-pill" style={{ marginBottom: 12 }}>
                    <span className="ai-dot" /> Carson AI Overview
                  </div>
                  <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0, color: 'var(--ink)' }}>
                    The {vehicle.year} {vehicle.make} {vehicle.model} is {(vehicle.aiSummary || 'a great find').toLowerCase()}. With {fmtMiles(vehicle.mileage)} on the clock and a {(vehicle.fuel || 'gas').toLowerCase()} {vehicle.drive} powertrain, it's well-suited for everyday driving. {isBelowMarket ? `At ${fmtPrice(vehicle.price)}, it's priced ${fmtPrice(savings)} below the typical market range for this vehicle in this condition.` : `At ${fmtPrice(vehicle.price)}, it's priced in line with the current market.`}
                  </p>
                </div>

                {(opts.showPros || opts.showThingsToKnow) && (
                  <div className="rg" style={{ display: 'grid', gridTemplateColumns: opts.showPros && opts.showThingsToKnow ? '1fr 1fr' : '1fr', gap: 20 }}>
                    {opts.showPros && (
                      <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '22px 24px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal-2)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 14 }}>
                          <Icon name="check" size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} /> Pros
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: 'var(--ink)', lineHeight: 1.7 }}>
                          <li>Passed 142-point inspection</li>
                          <li>Low mileage for the year</li>
                          <li>{vehicle.fuel === 'Hybrid' ? 'Excellent fuel economy' : vehicle.fuel === 'Electric' ? 'Zero emissions' : 'Trusted powertrain'}</li>
                          <li>{isBelowMarket ? 'Priced below market' : 'Fair market pricing'}</li>
                        </ul>
                      </div>
                    )}
                    {opts.showThingsToKnow && (
                      <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '22px 24px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#8A5400', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 14 }}>
                          <Icon name="info" size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} /> Things to know
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: 'var(--ink)', lineHeight: 1.7 }}>
                          <li>{vehicle.mileage > 30000 ? 'Higher mileage — review service records' : 'Lower mileage may have longer break-in period'}</li>
                          <li>{vehicle.body === 'Truck' ? 'Consider fuel costs for daily commute' : 'Typical of its segment'}</li>
                          <li>Schedule a test drive to confirm fit</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {tab === 'specs' && (
              <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '8px 0' }}>
                {specs.map((s, i) => (
                  <div key={s.label} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', padding: '14px 24px', borderBottom: i < specs.length - 1 ? '1px solid var(--line)' : 'none' }}>
                    <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: 14, color: 'var(--ink)' }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column - sticky sidebar */}
          <aside style={{ position: 'sticky', top: 90 }}>
            <div style={{ marginBottom: 4, fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{vehicle.year}</div>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 14px', lineHeight: 1.1 }}>
              {vehicle.make} {vehicle.model}
            </h2>

            <div style={{ display: 'flex', gap: 14, fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
              <span><Icon name="gauge" size={13} style={{ verticalAlign: '-2px' }}/> {fmtMiles(vehicle.mileage)}</span>
              <span><Icon name="fuel" size={13} style={{ verticalAlign: '-2px' }}/> {vehicle.fuel}</span>
              <span><Icon name="car" size={13} style={{ verticalAlign: '-2px' }}/> {vehicle.drive}</span>
            </div>

            {/* Social proof badges (real data: created_at + tracked views) */}
            {(() => {
              const days = vehicle.createdAt ? Math.floor((Date.now() - new Date(vehicle.createdAt).getTime()) / 86400000) : null;
              const views = vehicle.views || 0;
              const badges: Array<{ icon: string; text: string; hot?: boolean }> = [];
              if (days !== null && days <= 7) badges.push({ icon: '🆕', text: days <= 1 ? 'Just arrived' : `Arrived ${days} days ago` });
              if (views >= 10) badges.push({ icon: '👀', text: `${views} shoppers have viewed this car`, hot: views >= 40 });
              if (badges.length === 0) return null;
              return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {badges.map((b, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: b.hot ? '#FDECEC' : 'var(--teal-tint)',
                      color: b.hot ? '#A8232C' : 'var(--teal-2)',
                      padding: '5px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700,
                    }}>
                      {b.icon} {b.hot ? `In demand — ${b.text.toLowerCase()}` : b.text}
                    </span>
                  ))}
                </div>
              );
            })()}

            {/* Price card */}
            <div style={{ background: 'var(--ink)', color: 'white', borderRadius: 16, padding: '24px 28px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: isSold ? 0.15 : 0.4, background: 'radial-gradient(circle at 100% 0%, var(--teal), transparent 60%)' }} />
              <div style={{ position: 'relative' }}>
                {isSold ? (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9ad', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>This one sold</div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 34, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.05, marginBottom: 10 }}>
                      Sold for {fmtPrice(vehicle.price)}
                    </div>
                    <div style={{ fontSize: 12.5, color: '#9ad', lineHeight: 1.6 }}>
                      Cars like this move quickly. We&apos;ll tell you the moment a similar one lands.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9ad', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>Carson price</div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 42, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1, marginBottom: 12 }}>
                      {fmtPrice(vehicle.price)}
                    </div>
                    {isBelowMarket && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,200,100,0.2)', color: '#7BFFB0', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                        <Icon name="trend" size={12} /> {fmtPrice(savings)} below market
                      </div>
                    )}
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
                      or est. ${estMonthly(vehicle.price)}/mo
                    </div>
                    <button
                      onClick={() => setModal('payment')}
                      style={{ background: 'none', border: 'none', padding: 0, color: '#7ecbff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}
                    >
                      Adjust payment →
                    </button>
                    <div style={{ fontSize: 12, color: '#9ad' }}>Market: {fmtPrice(marketLow)} – {fmtPrice(marketHigh)}</div>
                  </>
                )}
              </div>
            </div>

            {/* CTAs */}
            {isSold ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                <button onClick={() => setModal('alert')} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  <Icon name="mail" size={14} /> Alert me when a similar one arrives
                </button>
                <a href="#similar" className="btn btn-dark" style={{ width: '100%' }}>
                  <Icon name="search" size={14} /> See similar available now
                </a>
                <button onClick={() => router.push('/inventory')} className="btn btn-ghost" style={{ width: '100%' }}>
                  Browse all inventory
                </button>
              </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <button onClick={() => setModal('interested')} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                <Icon name="heart" size={14} /> I'm interested in this car
              </button>
              <button onClick={() => setModal('testdrive')} className="btn btn-dark" style={{ width: '100%' }}>
                <Icon name="car" size={14} /> Book a test drive
              </button>
              <button onClick={() => setModal('otd')} className="btn btn-ghost" style={{ width: '100%' }}>
                <Icon name="dollar" size={14} /> Get out-the-door price
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={() => setModal('video')} className="btn btn-ghost" style={{ width: '100%' }}>
                  <Icon name="sparkles" size={14} /> Request a video
                </button>
                <button onClick={() => setModal('delivery')} className="btn btn-ghost" style={{ width: '100%' }}>
                  <Icon name="location" size={14} /> Have it delivered
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                <button onClick={() => router.push(`/finance?vehicleId=${vehicle.id}`)} className="btn btn-ghost" style={{ width: '100%' }}>
                  Pre-qualify
                </button>
                <button onClick={() => router.push('/tradein')} className="btn btn-ghost" style={{ width: '100%' }}>
                  Trade-in
                </button>
              </div>
              <button
                onClick={() => !watching && setModal('watch')}
                className="btn btn-ghost"
                style={{ width: '100%', marginTop: 4, ...(watching ? { color: 'var(--teal-2)', borderColor: 'var(--teal)', cursor: 'default' } : {}) }}
              >
                <Icon name="trend" size={14} /> {watching ? 'Watching — we’ll alert you on a price drop ✓' : 'Watch this car · get price-drop alerts'}
              </button>
            </div>
            )}

            {/* AI Q&A */}
            <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '20px 22px' }}>
              <div className="ai-pill" style={{ marginBottom: 12 }}>
                <span className="ai-dot" /> Ask Carson AI
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {PRESET_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => askAI(q)}
                    style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 999, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink)' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: aiReply || aiThinking ? 14 : 0 }}>
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={e => setAiQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && askAI()}
                  placeholder="Or type your own question..."
                  className="input"
                  style={{ flex: 1, fontSize: 13 }}
                />
                <button onClick={() => askAI()} disabled={aiThinking || !aiQuestion.trim()} className="btn btn-dark" style={{ padding: '8px 14px' }}>
                  <Icon name="sparkles" size={14} />
                </button>
              </div>
              {aiThinking && (
                <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="sparkles" size={14} style={{ color: 'var(--teal)' }} />
                  Thinking<DotsAnim />
                </div>
              )}
              {aiReply && !aiThinking && (
                <div style={{ background: 'var(--bg-soft)', borderRadius: 10, padding: '12px 14px', fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink)' }}>
                  {aiReply}
                </div>
              )}
            </div>

            {/* Included */}
            {opts.showIncluded && (
              <div style={{ marginTop: 20, padding: '16px 0', borderTop: '1px solid var(--line)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>Included with every Carson</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  {['7-day return policy', '142-point inspection', '30-day powertrain warranty', 'Free CarFax history'].map(item => (
                    <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Icon name="check" size={14} style={{ color: 'var(--teal)' }} /> {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Similar vehicles */}
        {similar.length > 0 && (
          <div id="similar" style={{ marginTop: 80, scrollMarginTop: 90 }}>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 600, letterSpacing: '-.02em', marginBottom: 24 }}>
              {isSold ? 'Similar vehicles available now' : 'Similar vehicles'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
              {similar.map(v => <VehicleCard key={v.id} vehicle={v} />)}
            </div>
          </div>
        )}
      </div>

      {/* ── WATCH THIS CAR ── */}
      <Modal open={modal === 'watch'} onClose={() => setModal(null)} title="Watch this car">
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
            <div style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: '50%', background: 'var(--teal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={26} style={{ color: 'var(--teal-2)' }} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>You&apos;re watching this car 👀</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>If the price drops, you&apos;ll be the first to know.</div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
              Not ready today? We get it. Leave an email or phone number and we&apos;ll automatically alert you if the price of this
              {' '}{vehicle.year} {vehicle.make} {vehicle.model} drops below <strong>{fmtPrice(vehicle.price)}</strong> — or if it&apos;s about to sell.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                className="input"
                placeholder="Email or mobile number"
                value={watchContact}
                onChange={e => setWatchContact(e.target.value)}
              />
              <button onClick={startWatch} disabled={watchBusy || !watchContact.trim()} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                <Icon name="trend" size={14} /> {watchBusy ? 'Saving…' : 'Start watching'}
              </button>
              <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
                <Icon name="shield" size={10} style={{ verticalAlign: '-1px' }} /> One alert per price change. No marketing, no spam.
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── BOOK TEST DRIVE ── */}
      <Modal open={modal === 'testdrive'} onClose={() => setModal(null)} title="Book a test drive">
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
            <div style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: '50%', background: 'var(--teal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={26} style={{ color: 'var(--teal-2)' }} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>You're booked!</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Check your email for the confirmation and calendar link.</div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 18px', lineHeight: 1.5 }}>
              Take the {vehicle.year} {vehicle.make} {vehicle.model} for a spin. We'll have it ready when you arrive — no waiting.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {tdLoadingSlots ? (
                <div style={{ color: 'var(--muted)', fontSize: 14, padding: '10px 0' }}>Loading available times…</div>
              ) : tdDays.length === 0 ? (
                <div style={{ background: 'var(--bg-soft)', borderRadius: 10, padding: '14px 16px', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                  No online times available right now. Please call us and we&apos;ll set one up.
                </div>
              ) : (
                <>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.02em' }}>Pick a day</div>
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                      {tdDays.map(day => (
                        <button key={day.dateKey} onClick={() => { setTdActiveDate(day.dateKey); setTdSlotIso(''); }} style={{
                          padding: '10px 12px', borderRadius: 10, whiteSpace: 'nowrap', flexShrink: 0,
                          background: tdActiveDate === day.dateKey ? 'var(--ink)' : 'white',
                          color: tdActiveDate === day.dateKey ? 'white' : 'var(--ink)',
                          border: '1px solid ' + (tdActiveDate === day.dateKey ? 'var(--ink)' : 'var(--line)'),
                          cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
                        }}>{day.dateLabel}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.02em' }}>Pick a time</div>
                    <div className="rg" style={{ ['--gtc-m' as any]: '1fr 1fr', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {(tdDays.find(d => d.dateKey === tdActiveDate)?.slots || []).map(s => (
                        <button key={s.iso} disabled={!s.available} onClick={() => setTdSlotIso(s.iso)} style={{
                          padding: '10px 6px', borderRadius: 10,
                          background: tdSlotIso === s.iso ? 'var(--ink)' : 'white',
                          color: !s.available ? 'var(--line)' : tdSlotIso === s.iso ? 'white' : 'var(--ink)',
                          border: '1px solid ' + (tdSlotIso === s.iso ? 'var(--ink)' : 'var(--line)'),
                          cursor: s.available ? 'pointer' : 'not-allowed', opacity: s.available ? 1 : 0.5,
                          fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                          textDecoration: s.available ? 'none' : 'line-through',
                        }}>{s.timeLabel}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input className="input" placeholder="Your name" value={tdName} onChange={e => setTdName(e.target.value)} />
                    <input className="input" type="tel" placeholder="Phone" value={tdPhone} onChange={e => setTdPhone(e.target.value)} />
                  </div>
                  <input className="input" type="email" placeholder="Email (for your confirmation)" value={tdEmail} onChange={e => setTdEmail(e.target.value)} />
                  {tdError && <div style={{ background: '#FDECEE', color: '#A8232C', borderRadius: 10, padding: '10px 12px', fontSize: 13 }}>{tdError}</div>}
                  <button onClick={submitTestDrive} disabled={!tdSlotIso || !tdName || !tdEmail || tdSubmitting} className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 4 }}>
                    {tdSubmitting ? 'Booking…' : 'Confirm booking'}
                  </button>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
                    <Icon name="shield" size={10} style={{ verticalAlign: '-1px' }} /> We&apos;ll email a confirmation. Cancel anytime.
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── REQUEST VIDEO ── */}
      <Modal open={modal === 'video'} onClose={() => setModal(null)} title="Request a personalized video">
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
            <div style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: '50%', background: 'var(--teal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={26} style={{ color: 'var(--teal-2)' }} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Request received!</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>We'll send your custom video within 2 hours.</div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 18px', lineHeight: 1.5 }}>
              One of our team will record a 2-3 minute walkaround of <strong style={{ color: 'var(--ink)' }}>this exact vehicle</strong>. Tell us what to show.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }}>What should we focus on? (pick any)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['Exterior', 'Interior', 'Engine bay', 'Trunk space', 'Tech features', 'Undercarriage', 'Tire condition', 'Any wear/damage'].map(opt => {
                    const active = videoFocus.includes(opt);
                    return (
                      <button key={opt} onClick={() => setVideoFocus(f => active ? f.filter(x => x !== opt) : [...f, opt])} style={{
                        padding: '7px 12px', borderRadius: 999,
                        background: active ? 'var(--ink)' : 'white',
                        color: active ? 'white' : 'var(--ink)',
                        border: '1px solid ' + (active ? 'var(--ink)' : 'var(--line)'),
                        cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                      }}>{opt}</button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.02em' }}>Anything specific to ask?</div>
                <textarea
                  className="input"
                  value={videoNotes}
                  onChange={e => setVideoNotes(e.target.value)}
                  placeholder="e.g., Show me how the cargo space looks with the second row folded down"
                  style={{ minHeight: 80, fontFamily: 'inherit', resize: 'none' }}
                />
              </div>
              <input className="input" type="email" placeholder="Your email" value={videoEmail} onChange={e => setVideoEmail(e.target.value)} />
              <button onClick={finishModal} disabled={!videoEmail || videoFocus.length === 0} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                Send my video request
              </button>
              <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
                <Icon name="check" size={10} style={{ verticalAlign: '-1px' }} /> Typical turnaround: under 2 hours.
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── HAVE IT DELIVERED ── */}
      <Modal open={modal === 'delivery'} onClose={() => setModal(null)} title="Have it delivered to you">
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
            <div style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: '50%', background: 'var(--teal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={26} style={{ color: 'var(--teal-2)' }} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Delivery info saved</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>A specialist will reach out to finalize the details.</div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 18px', lineHeight: 1.5 }}>
              We'll bring this {vehicle.make} {vehicle.model} right to your driveway. Free within 100 km of Dartmouth — flat-rate beyond.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.02em' }}>Delivery postal code</div>
                <input
                  className="input"
                  placeholder="e.g., B3B 1B3"
                  value={deliveryZip}
                  onChange={e => {
                    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 7);
                    setDeliveryZip(v);
                    const compact = v.replace(/\s/g, '');
                    // Canadian postal code: A1A1A1 (also accept 5-digit US ZIPs)
                    if (/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(compact) || /^\d{5}$/.test(compact)) {
                      // Deterministic demo distance from the code's characters
                      let h = 0;
                      for (const ch of compact) h = (h * 31 + ch.charCodeAt(0)) % 997;
                      setDeliveryDistance(15 + (h % 280));
                    } else {
                      setDeliveryDistance(null);
                    }
                  }}
                />
              </div>

              {deliveryDistance !== null && (
                <div style={{ background: 'var(--bg-soft)', borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Distance from Carson</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{deliveryDistance} km</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Estimated arrival</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{deliveryDistance < 100 ? '1–2 days' : '3–5 days'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Delivery fee</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: deliveryDistance <= 100 ? 'var(--teal-2)' : 'var(--ink)' }}>
                      {deliveryDistance <= 100 ? 'FREE' : fmtPrice(199 + Math.round((deliveryDistance - 100) * 1.4))}
                    </span>
                  </div>
                </div>
              )}

              <button onClick={finishModal} disabled={deliveryDistance === null} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                Continue with delivery
              </button>
              <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
                <Icon name="check" size={10} style={{ verticalAlign: '-1px' }} /> 7-day return still applies — even if it's delivered.
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── OUT THE DOOR PRICE ── */}
      <Modal open={modal === 'otd'} onClose={() => setModal(null)} title="Your out-the-door price" width={560}>
        {(() => {
          // Canadian sales tax on dealer vehicle purchases (HST, or GST + PST).
          const taxRates: Record<string, { rate: number; label: string }> = {
            NS: { rate: 0.14,    label: 'Nova Scotia — 14% HST' },
            NB: { rate: 0.15,    label: 'New Brunswick — 15% HST' },
            PE: { rate: 0.15,    label: 'Prince Edward Island — 15% HST' },
            NL: { rate: 0.15,    label: 'Newfoundland & Labrador — 15% HST' },
            ON: { rate: 0.13,    label: 'Ontario — 13% HST' },
            QC: { rate: 0.14975, label: 'Quebec — GST + QST (14.975%)' },
            MB: { rate: 0.12,    label: 'Manitoba — GST + PST (12%)' },
            SK: { rate: 0.11,    label: 'Saskatchewan — GST + PST (11%)' },
            AB: { rate: 0.05,    label: 'Alberta — 5% GST' },
            BC: { rate: 0.12,    label: 'British Columbia — GST + PST (12%)' },
          };
          const province = taxRates[otdState] ?? taxRates.NS;
          const taxRate = province.rate;
          const tax = Math.round(vehicle.price * taxRate);
          const docFee = 85;
          const titleReg = 320;
          const inspection = 0;
          const total = vehicle.price + tax + docFee + titleReg + inspection;

          return (
            <div>
              <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 18px', lineHeight: 1.5 }}>
                Real numbers — nothing hidden. Pick your province and we'll show you the all-in price.
              </p>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.02em' }}>Registration province</div>
                <select className="select" value={otdState} onChange={e => setOtdState(e.target.value)}>
                  {Object.entries(taxRates).map(([code, p]) => (
                    <option key={code} value={code}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ background: 'var(--bg-soft)', borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
                {[
                  { label: 'Vehicle price', value: fmtPrice(vehicle.price) },
                  { label: `Tax (${(taxRate * 100).toFixed(2)}%)`, value: fmtPrice(tax) },
                  { label: 'Registration & plates', value: fmtPrice(titleReg) },
                  { label: 'Documentation fee', value: fmtPrice(docFee) },
                  { label: 'Pre-delivery inspection', value: 'FREE', highlight: true },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14 }}>
                    <span style={{ color: 'var(--muted)' }}>{row.label}</span>
                    <span style={{ fontWeight: 600, color: row.highlight ? 'var(--teal-2)' : 'var(--ink)' }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 14, marginTop: 8, borderTop: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>Out-the-door total</span>
                  <span style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>{fmtPrice(total)}</span>
                </div>
              </div>

              <div style={{ background: 'var(--teal-tint)', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: 'var(--teal-2)', display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16 }}>
                <Icon name="check" size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>No surprise fees.</strong> What you see is what you pay. Trade-in credit and any financing terms applied separately.</span>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => router.push(`/finance?vehicleId=${vehicle.id}`)} className="btn btn-primary" style={{ flex: 1 }}>
                  Finance this car
                </button>
                <button onClick={() => setModal('testdrive')} className="btn btn-dark" style={{ flex: 1 }}>
                  Book test drive
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── I'M INTERESTED MODAL ── */}
      <Modal open={modal === 'interested'} onClose={() => setModal(null)} title="I'm interested in this car">
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
            <div style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: '50%', background: 'var(--teal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={26} style={{ color: 'var(--teal-2)' }} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>We got your message!</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Someone from our team will reach out shortly.</div>
          </div>
        ) : (
          <div>
            <div style={{ background: 'var(--bg-soft)', borderRadius: 12, padding: '14px 16px', marginBottom: 18, display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 56, height: 42, borderRadius: 8, overflow: 'hidden', background: 'var(--line)', flexShrink: 0 }}>
                <img
                  src={(vehicle as any).images?.[0] || vehicleImageURL(vehicle, { size: 200 })}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{vehicle.year} {vehicle.make} {vehicle.model}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{fmtPrice(vehicle.price)} · {fmtMiles(vehicle.mileage)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="input" placeholder="Your name" value={intName} onChange={e => setIntName(e.target.value)} />
              <input className="input" placeholder="Email or phone number" value={intContact} onChange={e => setIntContact(e.target.value)} />
              <textarea
                className="input"
                placeholder="Any questions or details? (optional)"
                value={intMessage}
                onChange={e => setIntMessage(e.target.value)}
                style={{ minHeight: 72, fontFamily: 'inherit', resize: 'vertical' }}
              />
              <button onClick={submitInterest} disabled={intBusy || !intName.trim() || !intContact.trim()} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                {intBusy ? 'Sending…' : 'Send my interest'}
              </button>
              <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
                <Icon name="shield" size={10} style={{ verticalAlign: '-1px' }} /> No obligation. We'll respond within the hour during business hours.
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── PAYMENT CALCULATOR ── */}
      <Modal open={modal === 'payment'} onClose={() => setModal(null)} title="Estimate your payment">
        {(() => {
          const down = calcDown ?? Math.round(vehicle.price * DEFAULT_TERMS.downPct);
          const financed = financedAmount(vehicle.price, down, calcTrade);
          const monthly = monthlyPayment({ price: vehicle.price, down, tradeIn: calcTrade, term: calcTerm, apr: calcApr });
          return (
            <div>
              {/* Live result */}
              <div style={{ background: 'var(--ink)', color: 'white', borderRadius: 16, padding: '22px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.4, background: 'radial-gradient(circle at 100% 0%, var(--teal), transparent 55%)' }} />
                <div style={{ position: 'relative' }}>
                  <div style={{ fontSize: 11, color: '#9ad', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Estimated monthly</div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 46, fontWeight: 700, lineHeight: 1 }}>{fmtPrice(monthly)}</div>
                  <div style={{ fontSize: 12.5, color: '#9ad', marginTop: 6 }}>
                    {fmtPrice(financed)} financed · {calcApr.toFixed(1)}% APR · {calcTerm}mo
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>
                    Down payment: {fmtPrice(down)}
                  </div>
                  <input
                    type="range" min={0} max={Math.round(vehicle.price * 0.5)} step={500} value={down}
                    onChange={e => setCalcDown(+e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--teal)' }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Trade-in value</div>
                  <input
                    className="input" type="number" min={0} inputMode="numeric" placeholder="$0"
                    value={calcTrade || ''}
                    onChange={e => setCalcTrade(Math.max(0, +e.target.value || 0))}
                  />
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>
                    Not sure?{' '}
                    <button onClick={() => router.push('/tradein')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--teal-2)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11 }}>
                      Get a free trade-in estimate
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>Loan term</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {TERM_OPTIONS.map(t => (
                      <button key={t} onClick={() => setCalcTerm(t)} style={{
                        flex: 1, padding: '9px 4px', borderRadius: 10,
                        background: calcTerm === t ? 'var(--ink)' : 'white',
                        color: calcTerm === t ? 'white' : 'var(--ink)',
                        border: '1px solid ' + (calcTerm === t ? 'var(--ink)' : 'var(--line)'),
                        cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
                      }}>{t}mo</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>Credit tier</div>
                  <div className="rg" style={{ ['--gtc-m' as any]: '1fr 1fr', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                    {CREDIT_TIERS.map(t => (
                      <button
                        key={t.key}
                        onClick={() => { setCalcTier(t.key); setCalcApr(t.apr); }}
                        style={{
                          padding: '9px 4px', borderRadius: 10,
                          background: calcTier === t.key ? 'var(--ink)' : 'white',
                          color: calcTier === t.key ? 'white' : 'var(--ink)',
                          border: '1px solid ' + (calcTier === t.key ? 'var(--ink)' : 'var(--line)'),
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 12 }}>{t.label}</div>
                        <div style={{ fontSize: 10.5, color: calcTier === t.key ? '#cbd5dc' : 'var(--muted)' }}>{t.range}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
                    Interest rate (APR)
                  </div>
                  <input
                    className="input" type="number" step={0.1} min={0} max={35} inputMode="decimal"
                    value={calcApr}
                    onChange={e => setCalcApr(Math.min(35, Math.max(0, +e.target.value || 0)))}
                  />
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>
                    Prefilled from your credit tier — edit it if you have a quoted rate.
                  </div>
                </div>

                <button onClick={submitPaymentLead} disabled={calcBusy} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  {calcBusy ? 'Sending…' : 'Get pre-approved with these numbers'}
                </button>
                <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
                  <Icon name="shield" size={10} style={{ verticalAlign: '-1px' }} /> Estimate only — taxes and fees not included. Soft check, no impact on your score.
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── ALERT ME (sold vehicles) ── */}
      <Modal open={modal === 'alert'} onClose={() => setModal(null)} title="Alert me when a similar one arrives">
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--teal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Icon name="check" size={26} style={{ color: 'var(--teal-2)' }} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>You&apos;re on the list!</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>We&apos;ll reach out the moment a similar vehicle arrives.</div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 18px', lineHeight: 1.5 }}>
              The {vehicle.year} {vehicle.make} {vehicle.model} has sold — but similar ones come through regularly. Leave your details and we&apos;ll let you know first.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="input" placeholder="Your name" value={alertName} onChange={e => setAlertName(e.target.value)} />
              <input className="input" placeholder="Email or phone number" value={alertContact} onChange={e => setAlertContact(e.target.value)} />
              <button onClick={submitAlert} disabled={alertBusy || !alertName.trim() || !alertContact.trim()} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                {alertBusy ? 'Setting up…' : 'Alert me'}
              </button>
              <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
                <Icon name="shield" size={10} style={{ verticalAlign: '-1px' }} /> We&apos;ll only contact you about matching vehicles. Unsubscribe anytime.
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── STICKY CTA BAR (mobile + desktop) ── */}
      <div className={`vdp-sticky-bar${showStickyBar ? ' vdp-sticky-bar--visible' : ''}`}>
        <div className="vdp-sticky-bar__inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
                {fmtPrice(vehicle.price)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{isSold ? 'Sold' : `est. $${estMonthly(vehicle.price)}/mo`}</div>
            </div>
            <div className="vdp-sticky-bar__title">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {contactPhone && (
              <a href={`tel:${contactPhone}`} className="btn btn-ghost btn-sm vdp-sticky-bar__call">
                <Icon name="phone" size={14} /> Call
              </a>
            )}
            {contactPhone && (
              <a href={`sms:${contactPhone}`} className="btn btn-ghost btn-sm vdp-sticky-bar__call">
                <Icon name="send" size={14} /> Text
              </a>
            )}
            {isSold ? (
              <button onClick={() => setModal('alert')} className="btn btn-primary">
                <Icon name="mail" size={14} /> <span className="vdp-sticky-bar__label">Alert me on similar</span>
              </button>
            ) : (
              <button onClick={() => setModal('interested')} className="btn btn-primary">
                <Icon name="heart" size={14} /> <span className="vdp-sticky-bar__label">I'm interested</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
