# Carson Exports

AI-powered used car dealership website. Family-run worldwide auto sales with an AI concierge, honest pricing, and zero pressure.

Built with **Next.js 14** (App Router), React 18, and the **OpenAI API**.

## Features

- **AI Concierge** — floating chat assistant available on every page
- **AI Finder** — guided quiz that matches shoppers to vehicles
- **Smart Inventory** — natural-language search ("SUV under $30k, good on gas") parsed into filters
- **Vehicle pages** — gallery, specs, history, 142-point inspection, AI Q&A, and CTAs (book test drive, out-the-door price, request video, home delivery)
- **Trade-in estimator** — instant AI valuation
- **Financing** — payment calculator with AI affordability check
- **Buying guides** — AI-enhanced editorial content
- **Monthly payment toggle** — flip all cards between total price and estimated monthly
- Saved vehicles (localStorage), testimonials, FAQ, contact, about

## Getting started

```bash
npm install
cp .env.local.example .env.local   # add your OpenAI API key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Description |
| --- | --- |
| `OPENAI_API_KEY` | Your OpenAI API key (required for AI features) |
| `OPENAI_MODEL` | Model to use (default: `gpt-4o-mini`) |

## Project structure

```
app/            Next.js routes (home, inventory, vehicle/[id], finder, finance, tradein, guides, etc.)
app/api/ai/     Server route that proxies to OpenAI
components/     Shared UI (TopBar, Footer, VehicleCard, AIConcierge, Modal, Icon…)
context/        React contexts (saved vehicles, price-display mode)
data/           Inventory, vehicle imagery, buying guides
lib/            Formatting and AI client helpers
```
