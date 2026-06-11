'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { VehicleCard } from '@/components/VehicleCard';
import { DotsAnim } from '@/components/DotsAnim';
import { INVENTORY, Vehicle } from '@/data/inventory';
import { fmtPrice } from '@/lib/format';
import { complete } from '@/lib/ai';
import { useSaved } from '@/context/SavedContext';
import { PriceModeToggle } from '@/context/PriceModeContext';
import { listVehicles, AdminVehicle } from '@/lib/db';

type Filters = {
  body: string[];
  fuel: string[];
  drive: string[];
  priceMax: number;
  milesMax: number;
  savedOnly: boolean;
};

const DEFAULT_FILTERS: Filters = {
  body: [],
  fuel: [],
  drive: [],
  priceMax: 100000,
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

  const [inventory, setInventory] = useState<AdminVehicle[]>(INVENTORY as AdminVehicle[]);
  useEffect(() => { listVehicles().then(v => { if (v.length) setInventory(v); }); }, []);

  const [filters, setFilters] = useState<Filters>({
    ...DEFAULT_FILTERS,
    body: bodyParam ? [bodyParam] : [],
  });
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [aiThinking, setAiThinking] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [topPickId, setTopPickId] = useState<string | null>(null);

  // Process AI query on mount
  useEffect(() => {
    if (!aiQuery) return;
    setAiThinking(true);

    const prompt = `Parse this car shopping query into JSON filters. Reply ONLY with JSON:
Query: "${aiQuery}"
{"body":["Sedan"|"Coupe"|"SUV"|"Truck"|"Wagon"],"fuel":["Gas"|"Hybrid"|"Electric"],"drive":["FWD"|"RWD"|"AWD"],"priceMax":<number or 100000>,"milesMax":<number or 100000>,"insight":"1 friendly sentence about what you understood and your top pick approach.","topPickId":"vehicle id from this list: ${inventory.map(v => v.id + '=' + v.year + ' ' + v.make + ' ' + v.model + ' $' + v.price).slice(0, 24).join(', ')}"}

Only fill arrays if the query specifically mentions that filter. Return empty arrays for unmentioned filters.`;

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
        setAiInsight(json.insight || null);
        setTopPickId(json.topPickId || null);
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
      if (filters.fuel.length && !filters.fuel.includes(v.fuel)) return false;
      if (filters.drive.length && !filters.drive.includes(v.drive)) return false;
      if (v.price > filters.priceMax) return false;
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

  const toggleArrayFilter = (key: 'body' | 'fuel' | 'drive', value: string) => {
    setFilters(f => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter(v => v !== value) : [...f[key], value],
    }));
  };

  const clearFilters = () => setFilters(DEFAULT_FILTERS);
  const activeFilterCount = filters.body.length + filters.fuel.length + filters.drive.length +
    (filters.priceMax < 100000 ? 1 : 0) + (filters.milesMax < 100000 ? 1 : 0) + (filters.savedOnly ? 1 : 0);

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

          {aiInsight && !aiThinking && (
            <div style={{ marginTop: 20, background: 'white', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start', maxWidth: 800 }}>
              <Icon name="sparkles" size={18} style={{ color: 'var(--teal)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal-2)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 4 }}>Carson AI says</div>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--ink)', lineHeight: 1.5 }}>{aiInsight}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main */}
      <div className="container" style={{ maxWidth: 1400, padding: '32px 20px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32 }}>
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
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Max miles: {filters.milesMax.toLocaleString()}</div>
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
                <option value="miles-asc">Lowest miles</option>
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
