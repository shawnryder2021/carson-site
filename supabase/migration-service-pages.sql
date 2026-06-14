-- Service department content pages. Run in the Supabase SQL Editor.
-- (Assumes the pages table from migration-pages.sql already exists.)

insert into public.pages (slug, title, description, blocks) values
(
  'tire-centre',
  'Tire & Wheel Centre',
  'Seasonal tire swaps, storage, new tires, TPMS and alignments at Carson Exports, Dartmouth NS.',
  '[
    {"type":"html","html":"<h1>Tire &amp; Wheel Centre</h1><p class=\"lead\">The right tires keep you safe through every Nova Scotia season. We mount, balance, store, and source tires for every make and model.</p>"},
    {"type":"html","html":"<h2>What we offer</h2><ul><li><strong>Seasonal swaps</strong> — winter on, winter off, balanced and torqued</li><li><strong>Tire storage</strong> — keep your off-season set safe with us</li><li><strong>New tires</strong> — all major brands, price-matched</li><li><strong>TPMS service</strong> — sensors diagnosed and replaced</li><li><strong>Alignments</strong> — protect your tread and your fuel economy</li></ul>"},
    {"type":"leadform","title":"Book a tire appointment","subtitle":"Tell us your vehicle and what you need — we will confirm a time.","leadType":"service","fields":["name","phone","email","message"],"buttonText":"Request appointment"}
  ]'::jsonb
),
(
  'service-specials',
  'Service Specials',
  'Current service and maintenance offers at Carson Exports. Save on oil changes, brakes, and seasonal packages.',
  '[
    {"type":"html","html":"<h1>Service Specials</h1><p class=\"lead\">Quality service shouldn''t break the bank. Check back often — we rotate offers throughout the year.</p>"},
    {"type":"html","html":"<h2>This season''s offers</h2><ul><li><strong>Oil &amp; filter change</strong> — includes a complimentary multi-point inspection</li><li><strong>Brake special</strong> — pads and rotors with a free brake inspection</li><li><strong>Winter-ready package</strong> — battery test, fluids, wipers, and tire check</li><li><strong>Detail &amp; protect</strong> — interior + exterior detail packages</li></ul><p><em>Mention you saw it online when you book.</em></p>"},
    {"type":"leadform","title":"Claim a special","subtitle":"Let us know which offer you want and we will get you scheduled.","leadType":"service","fields":["name","phone","email","message"],"buttonText":"Claim offer"}
  ]'::jsonb
),
(
  'parts-accessories',
  'Parts & Accessories',
  'Genuine OEM parts and accessories at Carson Exports, Dartmouth NS. Request a part or quote.',
  '[
    {"type":"html","html":"<h1>Parts &amp; Accessories</h1><p class=\"lead\">From floor mats to brake pads, we source genuine and quality aftermarket parts for your vehicle.</p>"},
    {"type":"html","html":"<h2>How it works</h2><ul><li>Tell us your year, make, model, and the part you need</li><li>We confirm fitment and give you an honest quote</li><li>Pick it up, or have us install it in the service bay</li></ul>"},
    {"type":"leadform","title":"Request a part or quote","subtitle":"Include your vehicle details and the part you''re after.","leadType":"service","fields":["name","phone","email","message"],"buttonText":"Request a quote"}
  ]'::jsonb
)
on conflict (slug) do nothing;

notify pgrst, 'reload schema';
