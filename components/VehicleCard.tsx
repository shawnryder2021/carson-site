import { Vehicle } from '@/data/inventory';
import { vehicleImageURL } from '@/data/vehicleImage';
import { fmtPrice, fmtMiles, estMonthly } from '@/lib/format';
import { Icon } from './Icon';
import { CardCarousel } from './CardCarousel';
import { SmartImage } from './SmartImage';
import { useSaved } from '@/context/SavedContext';
import { useCompare } from '@/context/CompareContext';
import { usePriceMode } from '@/context/PriceModeContext';
import { useRouter } from 'next/navigation';

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const { saved, toggleSave } = useSaved();
  const { compare, toggleCompare, isFull } = useCompare();
  const { mode } = usePriceMode();
  const router = useRouter();
  const isSaved = saved.includes(vehicle.id);
  const inCompare = compare.includes(vehicle.id);
  const compareBlocked = isFull && !inCompare;
  const monthly = estMonthly(vehicle.price);
  const photo = (vehicle as any).images?.[0] as string | undefined;

  // Cards show a teaser only — full description lives on the vehicle page.
  const full = vehicle.aiSummary || '';
  const shortDesc = full.length > 90 ? full.slice(0, 90).replace(/\s+\S*$/, '') + '…' : full;

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid var(--line)',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 200ms, box-shadow 200ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onClick={() => router.push(`/vehicle/${vehicle.id}`)}
    >
      <div style={{ position: 'relative', background: 'var(--bg-soft)', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <CardCarousel
          photos={((vehicle as any).images as string[]) || []}
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          fallback={
            <SmartImage
              src={photo || vehicleImageURL(vehicle, { size: 300 })}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              sizes="(max-width: 860px) 100vw, 33vw"
              style={{ objectFit: photo ? 'cover' : 'contain' }}
            />}
        />
        {/* Social proof badge (real data: created_at / tracked views) */}
        {(() => {
          const createdAt = (vehicle as any).createdAt as string | undefined;
          const views = ((vehicle as any).views as number) || 0;
          const days = createdAt ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000) : null;
          const badge = days !== null && days <= 7
            ? { text: '🆕 Just arrived', bg: 'var(--teal)', color: 'white' }
            : views >= 40
              ? { text: '🔥 In demand', bg: '#A8232C', color: 'white' }
              : null;
          return badge ? (
            <span style={{ position: 'absolute', top: 12, left: 12, background: badge.bg, color: badge.color, padding: '5px 11px', borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '.03em', boxShadow: '0 2px 8px rgba(0,0,0,.18)' }}>
              {badge.text}
            </span>
          ) : null;
        })()}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleSave(vehicle.id);
          }}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <Icon name="heart" size={18} style={{ color: isSaved ? 'var(--teal)' : 'var(--muted)', fill: isSaved ? 'var(--teal)' : 'none' }} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!compareBlocked) toggleCompare(vehicle.id);
          }}
          title={compareBlocked ? 'Compare list full (3 max)' : inCompare ? 'Remove from compare' : 'Add to compare'}
          aria-label={compareBlocked ? 'Compare list full (3 max)' : inCompare ? 'Remove from compare' : 'Add to compare'}
          style={{
            position: 'absolute',
            top: 60,
            right: 12,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: inCompare ? 'var(--teal)' : 'white',
            border: 'none',
            cursor: compareBlocked ? 'not-allowed' : 'pointer',
            opacity: compareBlocked ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <Icon name={inCompare ? 'check' : 'plus'} size={18} style={{ color: inCompare ? 'white' : 'var(--muted)' }} />
        </button>
      </div>
      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </div>
        {mode === 'monthly' ? (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
              ${monthly}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>/mo</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtPrice(vehicle.price)} · est. 72mo @ 7.2% APR</div>
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
              {fmtPrice(vehicle.price)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>or est. ${monthly}/mo</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
          <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}><Icon name="gauge" size={14} />{fmtMiles(vehicle.mileage)}</span>
          <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}><Icon name="fuel" size={14} />{vehicle.fuel}</span>
          <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}><Icon name="car" size={14} />{vehicle.drive}</span>
        </div>
        <p style={{
          fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
          overflow: 'hidden',
        }}>{shortDesc}</p>
      </div>
    </div>
  );
}
