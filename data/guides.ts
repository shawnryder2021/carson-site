export type Guide = {
  slug: string;
  title: string;
  category: 'Buying' | 'Financing' | 'Ownership' | 'Trade-in' | 'EV & Hybrid';
  excerpt: string;
  readMins: number;
  body: { heading: string; text: string }[];
  // Optional inventory tie-in: filter applied when "see matching cars" is clicked
  matchQuery?: string;
};

export const GUIDES: Guide[] = [
  {
    slug: 'best-suvs-under-30k',
    title: 'The best used SUVs under $30,000',
    category: 'Buying',
    excerpt: 'Roomy, reliable, and within reach. Here are the SUVs that give you the most for a sub-$30k budget — and what to watch for.',
    readMins: 5,
    matchQuery: 'SUV under $30,000',
    body: [
      { heading: 'Why an SUV at this price?', text: 'A used SUV under $30k hits the sweet spot for families: more cargo and seating than a sedan, better visibility, and — if you buy a year or two old — someone else has already absorbed the steepest depreciation. The trick is picking models that hold up past 60,000 miles.' },
      { heading: 'What to prioritize', text: 'Look for one-owner vehicles with full service records, AWD if you see snow, and a recent timing-belt or major-service stamp. Crossovers like the CR-V, RAV4, CX-5, and Tucson are known for low cost of ownership. Avoid anything with a salvage title at this budget.' },
      { heading: 'Hidden costs to budget for', text: 'A bigger vehicle means bigger tires and slightly worse fuel economy. Factor ~$1,200/year in fuel and a tire set every 40k miles. Hybrids (RAV4 Hybrid, Tucson Hybrid) cost a touch more up front but pay it back if you drive 12k+ miles a year.' },
      { heading: 'Carson AI tip', text: 'Use the AI finder and say "SUV under $30k, low miles, good on gas." It will surface the best-value matches on our lot and flag any that are priced below market.' },
    ],
  },
  {
    slug: 'how-much-car-can-i-afford',
    title: 'How much car can you actually afford?',
    category: 'Financing',
    excerpt: 'The 20/4/10 rule, what your monthly payment really includes, and how to avoid being "car poor."',
    readMins: 4,
    matchQuery: '',
    body: [
      { heading: 'Start with the payment, not the sticker', text: 'Most buyers think in monthly terms — and that\'s fine, as long as you account for the full cost. Your real monthly number is the loan payment plus insurance, fuel, and a maintenance cushion. A $400 loan payment is closer to $650 all-in.' },
      { heading: 'The 20/4/10 guideline', text: 'A solid rule of thumb: put 20% down, finance for no more than 4 years, and keep total car costs (payment + insurance) under 10% of your gross income. If the numbers only work at 72 or 84 months, you\'re probably reaching for too much car.' },
      { heading: 'Why loan term matters', text: 'Stretching to 72 or 84 months lowers the monthly payment but you pay far more interest and stay "underwater" (owing more than the car is worth) for years. If you can swing 48–60 months, you\'ll own it free and clear much sooner.' },
      { heading: 'Carson AI tip', text: 'Our financing tool does a soft credit check and tells you honestly whether a payment is Comfortable, Manageable, or a Stretch for your income — no judgment, just the math.' },
    ],
  },
  {
    slug: 'hybrid-vs-gas-real-math',
    title: 'Hybrid vs. gas: does the math actually work?',
    category: 'EV & Hybrid',
    excerpt: 'Hybrids cost more up front. We break down exactly how many miles it takes to break even — and when gas still wins.',
    readMins: 6,
    matchQuery: 'hybrid',
    body: [
      { heading: 'The up-front premium', text: 'A hybrid version of the same model typically runs $2,000–$4,000 more used. To decide if it\'s worth it, you only need two numbers: how many miles you drive per year, and the MPG difference.' },
      { heading: 'A worked example', text: 'Say the gas version gets 28 MPG and the hybrid gets 40 MPG. At 15,000 miles/year and $3.80/gal, the gas car burns ~$2,036 in fuel; the hybrid ~$1,425. That\'s ~$611 saved per year. On a $3,000 premium, you break even in just under 5 years — sooner if you drive more or gas gets pricier.' },
      { heading: 'When gas still wins', text: 'If you drive under 8,000 miles a year, or plan to keep the car only 2–3 years, the gas version usually comes out ahead. Hybrids also shine in stop-and-go city driving and lose some advantage on long highway hauls.' },
      { heading: 'Carson AI tip', text: 'Ask Carson AI on any hybrid\'s page: "How long until this pays off for my commute?" Give it your annual mileage and it will run the break-even for that exact car.' },
    ],
  },
  {
    slug: 'test-drive-checklist',
    title: 'The 12-point test drive checklist',
    category: 'Buying',
    excerpt: 'What to actually do during a test drive — beyond just "does it feel nice." A printable checklist from our inspection team.',
    readMins: 4,
    body: [
      { heading: 'Before you turn the key', text: 'Walk around in good light. Check that panel gaps are even, look for paint that doesn\'t quite match (a sign of past bodywork), and press each tire — uneven wear hints at alignment or suspension issues. Pop the hood and look for fluid leaks or corrosion.' },
      { heading: 'On the road', text: 'Test on varied surfaces and at highway speed if you can. Listen for clunks over bumps (suspension), feel for a shudder when braking (warped rotors), and watch for hesitation or harsh shifts (transmission). Try the AC, every window, the infotainment, and the backup camera.' },
      { heading: 'After you stop', text: 'Leave it idling and check underneath for new drips. Look at the exhaust — blue or white smoke is a red flag. Restart it warm to confirm it cranks cleanly.' },
      { heading: 'Carson AI tip', text: 'Every Carson car has already passed a 142-point inspection, so most of this is done for you. But a test drive is still about fit — ask the AI "what should I check on this specific model?" for model-known quirks.' },
    ],
  },
  {
    slug: 'maximize-trade-in-value',
    title: 'How to maximize your trade-in value',
    category: 'Trade-in',
    excerpt: 'Small things that add real dollars at appraisal time — and the myths that don\'t move the needle.',
    readMins: 3,
    matchQuery: '',
    body: [
      { heading: 'What actually adds value', text: 'A clean car shows better and appraises higher — a $20 wash and vacuum can return far more. Gather your service records; documented maintenance reassures the appraiser and supports a higher offer. Round up the second key fob, original floor mats, and the owner\'s manual.' },
      { heading: 'What doesn\'t move the needle', text: 'Aftermarket wheels, stereos, and tints rarely add value and can actually lower it. Don\'t spend on new tires or cosmetic fixes right before trading — you won\'t recoup it. Minor dings are priced in; major repairs are the dealer\'s job.' },
      { heading: 'Timing matters', text: 'Trucks and AWD SUVs appraise higher in fall and winter; convertibles in spring. If your car is approaching a mileage milestone (60k, 100k), trading just before can help.' },
      { heading: 'Carson AI tip', text: 'Our trade-in tool gives an instant AI estimate with no email required, and we pay 5% above market average. Bring the records you gathered to lock in the top of the range.' },
    ],
  },
  {
    slug: 'first-100-days-of-ownership',
    title: 'Your first 100 days with a used car',
    category: 'Ownership',
    excerpt: 'A simple plan for the first few months — fluids, paperwork, and the one thing most new owners forget.',
    readMins: 3,
    body: [
      { heading: 'Week one', text: 'Register and insure it before you drive (we handle most of the paperwork at delivery). Sync your phone, set the mirrors and seat memory, and locate the spare, jack, and wheel lock key.' },
      { heading: 'First month', text: 'Even with a fresh inspection, do a baseline oil change so you know exactly when the clock started. Note the tire brand and tread depth, and snap a photo of the odometer — useful for warranty and future resale.' },
      { heading: 'The thing people forget', text: 'Set a calendar reminder for the next service interval now, while you\'re thinking about it. Deferred maintenance is the single biggest destroyer of used-car value and reliability.' },
      { heading: 'Carson AI tip', text: 'Ask Carson AI to build a maintenance schedule for your exact year and model — it\'ll list the major intervals so nothing sneaks up on you.' },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find(g => g.slug === slug);
}
