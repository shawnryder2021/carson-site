'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { VehicleCard } from '@/components/VehicleCard';
import { DotsAnim } from '@/components/DotsAnim';
import { INVENTORY, Vehicle } from '@/data/inventory';
import { fmtPrice, fmtMiles, estMonthly } from '@/lib/format';
import { complete } from '@/lib/ai';
import { useSaved } from '@/context/SavedContext';
import { PriceModeToggle } from '@/context/PriceModeContext';
import { listVehicles, AdminVehicle } from '@/lib/db';
import { getRecentlyViewed } from '@/lib/recentlyViewed';
import { vehicleImageURL } from '@/data/vehicleImage';

type Filters = {
  body: string[];
  make: string[];
  fuel: string[];
  drive: string[];
  priceMax: number;
  monthlyMax: number;
  milesMax: number;
  savedOnly: boolean;
};

const MONTHLY_CAP = 2000;

const DEFAULT_FILTERS: Filters = {
  body: [],
  make: [],
  fuel: [],
  drive: [],
  priceMax: 100000,
  monthlyMax: MONTHLY_CAP,
  milesMax: 100000,
  savedOnly: false,
};

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 999,
        background: active ? 'var(--ink)' : 'white',
        color: active ? 'white' : 'var(--ink)',
        border: '1px solid ' + (active ? 'var(--ink)' : 'var(--line)'),
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

function InventoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { saved } = useSaved();

  const aiQuery = searchParams.get('aiQuery');
  const bodyParam = searchParams.get('body');
  const makeParam = searchParams.get('make');
  const maxPriceParam = searchParams.get('maxPrice');
  const maxMonthlyParam = searchParams.get('maxMonthly');

  const [inventory, setInventory] = useState<AdminVehicle[]>(INVENTORY as AdminVehicle[]);
  useEffect(() => { listVehicles().then(v => { if (v.length) setInventory(v); }); }, []);

  const [recentIds, setRecentIds] = useState<string[]>([]);
  useEffect(() => { setRecentIds(getRecentlyViewed()); }, []);

  const [filters, setFilters] = useState<Filters>({
    ...DEFAULT_FILTERS,
    body: bodyParam ? [bodyParam] : [],
    make: makeParam ? [makeParam] : [],
    priceMax: maxPriceParam ? +maxPriceParam : 100000,
    monthlyMax: maxMonthlyParam ? +maxMonthlyParam : MONTHLY_CAP,
  });

  // Makes present in the current inventory, by frequency (for the filter list).
  const availableMakes = useMemo(() => {
    const counts = new Map<string, number>();
    inventory.forEach(v => counts.set(v.make, (counts.get(v.make) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
  }, [inventory]);
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [aiThinking, setAiThinking] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [topPickId, setTopPickId] = useState<string | null>(null);

  // Process AI query on mount
  useEffect(() => {
    if (!aiQuery) return;
    setAiThinking(true);

    const vehicleList = inventory
      .filter(v => v.status !== 'sold')
      .map(v => `${v.id}=${v.year} ${v.make} ${v.model} $${v.price} ${v.mileage}km ${v.body} ${v.fuel} ${v.drive}`)
      .slice(0, 24)
      .join(', ');

    const prompt = `Parse this car shopping query into JSON filters. Reply ONLY with valid JSON, no markdown:
Query: "${aiQuery}"
{"body":["Sedan"|"Coupe"|"SUV"|"Truck"|"Wagon"],"fuel":["Gas"|"Hybrid"|"Electric"],"drive":["FWD"|"RWD"|"AWD"],"priceMax":<number or 100000>,"milesMax":<number or 100000>,"topPickId":"<exact vehicle id from the list below that best matches the query>","topPickReason":"<1 sentence explaining why this specific vehicle is your top pick for the customer>"}

Available vehicles: ${vehicleList}

Rules:
- topPickId MUST be an exact id from the list above.
- topPickReason should mention the vehicle by name, year, make, model and price.
- Only fill filter arrays if the query specifically mentions that filter. Return empty arrays for unmentioned filters.`;

    complete(prompt)
      .then(reply => {
        const json = JSON.parse(reply.replace(/```json|```/g, '').trim());
        setFilters(f => ({
          ...f,
          body: json.body || [],
          fuel: json.fuel || [],
          drive: json.drive || [],
          priceMax: json.priceMax || 100000,
          milesMax: json.milesMax || 100000,
        }));
        const pickedId = json.topPickId || null;
        const matchedVehicle = pickedId ? inventory.find(v => v.id === pickedId) : null;
        setTopPickId(matchedVehicle ? pickedId : null);
        setAiInsight(matchedVehicle ? (json.topPickReason || null) : (json.topPickReason || "Here's what matches your search. Use filters to narrow down."));
      })
      .catch(() => {
        setAiInsight("I'll show you everything that might match. Use filters to narrow down.");
      })
      .finally(() => setAiThinking(false));
  }, [aiQuery]);

  // Apply filters
  const filtered = useMemo(() => {
    let results = inventory.filter(v => {
      if (filters.body.length && !filters.body.includes(v.body)) return false;
      if (filters.make.length && !filters.make.includes(v.make)) return false;
      if (filters.fuel.length && !filters.fuel.includes(v.fuel)) return false;
      if (filters.drive.length && !filters.drive.includes(v.drive)) return false;
      if (v.price > filters.priceMax) return false;
      if (filters.monthlyMax < MONTHLY_CAP && estMonthly(v.price) > filters.monthlyMax) return false;
      if (v.mileage > filters.milesMax) return false;
      if (filters.savedOnly && !saved.includes(v.id)) return false;
      return true;
    });

    if (sortBy === 'price-asc') results = [...results].sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') results = [...results].sort((a, b) => b.price - a.price);
    else if (sortBy === 'miles-asc') results = [...results].sort((a, b) => a.mileage - b.mileage);
    else if (sortBy === 'year-desc') results = [...results].sort((a, b) => b.year - a.year);

    // Move top pick to front if set
    if (topPickId) {
      const topPick = results.find(v => v.id === topPickId);
      if (topPick) {
        results = [topPick, ...results.filter(v => v.id !== topPickId)];
      }
    }

    return results;
  }, [inventory, filters, sortBy, saved, topPickId]);

  const toggleArrayFilter = (key: 'body' | 'make' | 'fuel' | 'drive', value: string) => {
    setFilters(f => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter(v => v !== value) : [...f[key], value],
    }));
  };

  const clearFilters = () => setFilters(DEFAULT_FILTERS);
  const activeFilterCount = filters.body.length + filters.make.length + filters.fuel.length + filters.drive.length +
    (filters.priceMax < 100000 ? 1 : 0) + (filters.monthlyMax < MONTHLY_CAP ? 1 : 0) + (filters.milesMax < 100000 ? 1 : 0) + (filters.savedOnly ? 1 : 0);

  return (
    <div className="page fade-in">
      {/* Header */}
      <div style={{ background: 'var(--bg-soft)', padding: '40px 0' }}>
        <div className="container" style={{ maxWidth: 1400 }}>
          {aiQuery && (
            <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', background: 'white', padding: '6px 14px', borderRadius: 20, marginBottom: 16, border: '1px solid var(--line)' }}>
              <Icon name="sparkles" size={14} style={{ color: 'var(--teal)' }} />
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>You searched:</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>"{aiQuery}"</span>
            </div>
          )}
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 8px' }}>
            {aiQuery ? `${filtered.length} matches` : 'Browse our inventory'}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--muted)', margin: 0 }}>
            {inventory.length} vehicles · Live market pricing · 142-point inspected
          </p>

          {aiThinking && (
            <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', color: 'var(--teal-2)' }}>
              <Icon name="sparkles" size={14} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Carson AI is finding your matches<DotsAnim /></span>
            </div>
          )}

          {aiInsight && !aiThinking && (() => {
            const pick = topPickId ? inventory.find(v => v.id === topPickId) : null;
            const pickPhoto = pick ? ((pick as any).images?.[0] || vehicleImageURL(pick, { size: 200 })) : '';
            return (
              <div style={{ marginTop: 20, background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 22px', maxWidth: 800 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Icon name="sparkles" size={18} style={{ color: 'var(--teal)', flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal-2)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 4 }}>Carson AI's pick for you</div>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--ink)', lineHeight: 1.5 }}>{aiInsight}</p>
                  </div>
                </div>
                {pick && (
                  <button
                    onClick={() => router.push(`/vehicle/${pick.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                      marginTop: 14, padding: '10px 14px', background: 'var(--bg-soft)',
                      border: '1px solid var(--line)', borderRadius: 10, cursor: 'pointer',
                      fontFamily: 'inherit', textAlign: 'left',
                    }}
                  >
                    <div style={{ width: 72, height: 54, borderRadius: 8, overflow: 'hidden', background: 'var(--line)', flexShrink: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pickPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                        {pick.year} {pick.make} {pick.model}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                        {fmtPrice(pick.price)} · {fmtMiles(pick.mileage)}
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal-2)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                      View <Icon name="arrowRight" size={13} />
                    </span>
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Quick filter chips */}
      <div style={{ borderBottom: '1px solid var(--line)', background: 'white' }}>
        <div className="container" style={{ maxWidth: 1400, padding: '12px 20px', display: 'flex', gap: 8, overflowX: 'auto', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap', marginRight: 4 }}>Quick:</span>
          {([
            { label: 'SUVs', apply: () => setFilters(f => ({ ...f, body: f.body.includes('SUV') ? f.body.filter(b => b !== 'SUV') : [...f.body, 'SUV'] })), active: filters.body.includes('SUV') },
            { label: 'Trucks', apply: () => setFilters(f => ({ ...f, body: f.body.includes('Truck') ? f.body.filter(b => b !== 'Truck') : [...f.body, 'Truck'] })), active: filters.body.includes('Truck') },
            { label: 'Sedans', apply: () => setFilters(f => ({ ...f, body: f.body.includes('Sedan') ? f.body.filter(b => b !== 'Sedan') : [...f.body, 'Sedan'] })), active: filters.body.includes('Sedan') },
            { label: 'Under $25k', apply: () => setFilters(f => ({ ...f, priceMax: f.priceMax === 25000 ? 100000 : 25000 })), active: filters.priceMax === 25000 },
            { label: 'Under $35k', apply: () => setFilters(f => ({ ...f, priceMax: f.priceMax === 35000 ? 100000 : 35000 })), active: filters.priceMax === 35000 },
            { label: 'AWD', apply: () => setFilters(f => ({ ...f, drive: f.drive.includes('AWD') ? f.drive.filter(d => d !== 'AWD') : [...f.drive, 'AWD'] })), active: filters.drive.includes('AWD') },
            { label: 'Low KM', apply: () => setFilters(f => ({ ...f, milesMax: f.milesMax === 30000 ? 100000 : 30000 })), active: filters.milesMax === 30000 },
            { label: 'Hybrid / EV', apply: () => { const has = filters.fuel.includes('Hybrid') && filters.fuel.includes('Electric'); setFilters(f => ({ ...f, fuel: has ? [] : ['Hybrid', 'Electric'] })); }, active: filters.fuel.includes('Hybrid') || filters.fuel.includes('Electric') },
            { label: 'Under $400/mo', apply: () => setFilters(f => ({ ...f, monthlyMax: f.monthlyMax === 400 ? MONTHLY_CAP : 400 })), active: filters.monthlyMax === 400 },
          ]).map(chip => (
            <button
              key={chip.label}
              onClick={chip.apply}
              style={{
                padding: '7px 14px', borderRadius: 999, whiteSpace: 'nowrap',
                background: chip.active ? 'var(--ink)' : 'var(--bg-soft)',
                color: chip.active ? 'white' : 'var(--ink)',
                border: '1px solid ' + (chip.active ? 'var(--ink)' : 'var(--line)'),
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                transition: 'all 150ms',
              }}
            >
              {chip.label}
            </button>
          ))}
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              style={{
                padding: '7px 14px', borderRadius: 999, whiteSpace: 'nowrap',
                background: 'transparent', color: 'var(--teal-2)',
                border: '1px solid var(--teal)', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              }}
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Recently viewed */}
      {(() => {
        const recentVehicles = recentIds
          .map(id => inventory.find(v => v.id === id))
          .filter((v): v is AdminVehicle => !!v && v.status !== 'sold')
          .slice(0, 6);
        if (recentVehicles.length < 2) return null;
        const photo = (v: AdminVehicle) => (v as any).images?.[0] || vehicleImageURL(v, { size: 200 });
        return (
          <div style={{ background: 'white', borderBottom: '1px solid var(--line)' }}>
            <div className="container" style={{ maxWidth: 1400, padding: '14px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  <Icon name="car" size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />Recently viewed
                </span>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', flex: 1, paddingBottom: 2 }}>
                  {recentVehicles.map(v => (
                    <button
                      key={v.id}
                      onClick={() => router.push(`/vehicle/${v.id}`)}
                      style={{
                        flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 10,
                        background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 10,
                        padding: '6px 12px 6px 6px', cursor: 'pointer', fontFamily: 'inherit',
                        textAlign: 'left', whiteSpace: 'nowrap',
                      }}
                    >
                      <div style={{ width: 40, height: 30, borderRadius: 6, overflow: 'hidden', background: 'var(--line)', flexShrink: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo(v)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{v.year} {v.make} {v.model}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtPrice(v.price)} · {fmtMiles(v.mileage)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main */}
      <div className="container" style={{ maxWidth: 1400, padding: '32px 20px 80px' }}>
        <div className="rg" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32 }}>
          {/* Sidebar */}
          <aside style={{ position: 'sticky', top: 90, height: 'fit-content' }}>
            <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Filters</h3>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: 'var(--teal-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Clear all</button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Body type</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {['Sedan', 'Coupe', 'SUV', 'Truck', 'Wagon'].map(b => (
                      <FilterChip key={b} active={filters.body.includes(b)} onClick={() => toggleArrayFilter('body', b)}>{b}</FilterChip>
                    ))}
                  </div>
                </div>

                {availableMakes.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Make</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {availableMakes.map(m => (
                        <FilterChip key={m} active={filters.make.includes(m)} onClick={() => toggleArrayFilter('make', m)}>{m}</FilterChip>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Fuel</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {['Gas', 'Hybrid', 'Electric'].map(f => (
                      <FilterChip key={f} active={filters.fuel.includes(f)} onClick={() => toggleArrayFilter('fuel', f)}>{f}</FilterChip>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Drive</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {['FWD', 'RWD', 'AWD'].map(d => (
                      <FilterChip key={d} active={filters.drive.includes(d)} onClick={() => toggleArrayFilter('drive', d)}>{d}</FilterChip>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Max price: {fmtPrice(filters.priceMax)}</div>
                  <input type="range" min={15000} max={100000} step={1000} value={filters.priceMax}
                    onChange={e => setFilters(f => ({ ...f, priceMax: +e.target.value }))}
                    style={{ width: '100%', accentColor: 'var(--teal)' }} />
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
                    Max monthly: {filters.monthlyMax >= MONTHLY_CAP ? 'Any' : '$' + filters.monthlyMax + '/mo'}
                  </div>
                  <input type="range" min={150} max={MONTHLY_CAP} step={25} value={filters.monthlyMax}
                    onChange={e => setFilters(f => ({ ...f, monthlyMax: +e.target.value }))}
                    style={{ width: '100%', accentColor: 'var(--teal)' }} />
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Est. at 10% down, 72 mo, 7.2% APR</div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Max kilometres: {filters.milesMax.toLocaleString()}</div>
                  <input type="range" min={5000} max={100000} step={5000} value={filters.milesMax}
                    onChange={e => setFilters(f => ({ ...f, milesMax: +e.target.value }))}
                    style={{ width: '100%', accentColor: 'var(--teal)' }} />
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    <input type="checkbox" checked={filters.savedOnly}
                      onChange={e => setFilters(f => ({ ...f, savedOnly: e.target.checked }))}
                      style={{ accentColor: 'var(--teal)' }} />
                    <Icon name="heart" size={14} style={{ color: 'var(--teal)' }} />
                    Saved only ({saved.length})
                  </label>
                </div>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                Showing <strong style={{ color: 'var(--ink)' }}>{filtered.length}</strong> of {inventory.length} vehicles
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <PriceModeToggle />
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="select" style={{ width: 'auto', minWidth: 180 }}>
                <option value="relevance">Best match</option>
                <option value="price-asc">Price: Low to high</option>
                <option value="price-desc">Price: High to low</option>
                <option value="miles-asc">Lowest kilometres</option>
                <option value="year-desc">Newest first</option>
                </select>
              </div>
            </div>

            {/* Top pick callout */}
            {topPickId && filtered[0]?.id === topPickId && (
              <div style={{ background: 'linear-gradient(135deg, var(--teal), #5a8aff)', color: 'white', borderRadius: 14, padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                <Icon name="sparkles" size={20} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.04em', opacity: 0.9, textTransform: 'uppercase' }}>Carson AI's top pick</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>This vehicle best matches what you're looking for</div>
                </div>
              </div>
            )}

            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--bg-soft)', borderRadius: 14 }}>
                <Icon name="search" size={40} style={{ color: 'var(--muted)', marginBottom: 16 }} />
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>No matches found</h3>
                <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 20px' }}>Try adjusting your filters or browse all vehicles.</p>
                <button onClick={clearFilters} className="btn btn-dark">Clear filters</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                {filtered.map(v => (
                  <VehicleCard key={v.id} vehicle={v} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="page fade-in" style={{ padding: 80, textAlign: 'center' }}>Loading...</div>}>
      <InventoryContent />
    </Suspense>
  );
}
