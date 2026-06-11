# Supabase setup for Carson Exports

Follow these once to enable the admin + dynamic content.

## 1. Create a project
1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Name it (e.g. `carson-exports`), pick a region close to you, set a DB password.
3. Wait ~2 min for it to provision.

## 2. Run the schema
1. In the project, open **SQL Editor → New query**.
2. Paste the contents of [`schema.sql`](./schema.sql) and click **Run**.
   - Creates `vehicles`, `site_settings`, `leads`, `guides` tables, row-level security policies, and a public `media` storage bucket.

## 3. Create your admin login
1. Go to **Authentication → Users → Add user**.
2. Enter your email + a password. (Turn **Auto Confirm User** on.)
3. This is the account you'll use to log in at `/admin/login`.

> Tip: To stop random signups, leave email signups disabled — you add admins manually here.

## 4. Get your keys
1. Go to **Project Settings → API**.
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 5. Add the keys
**Local:** put them in `.env.local` (see `.env.local.example`).
**Netlify:** Site configuration → Environment variables → add both, then redeploy.

## 6. Seed starter data (optional)
In the admin, go to **Admin → Inventory → Import starter inventory** to load the
24 demo vehicles, and **Guides → Import starter guides** for the buying guides.
You can then edit or delete them.

---

That's it. Visit `/admin/login`, sign in, and manage the site.
