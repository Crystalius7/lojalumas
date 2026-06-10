# Lojalumas — multi-tenant digital stamp card (PWA)

One codebase, unlimited businesses, **€0 running cost**. Each business lives
at its own URL path (`/coffeebox`) and onboarding a new client is pasting one
config block — no build step, no database, no server.

## Two modes (same codebase)

| | FREE static mode (default) | Supabase mode (optional upgrade) |
|---|---|---|
| Cost | €0 forever | €0 (free tier) |
| Accounts needed | 1 free hosting account | + free Supabase account |
| Stamps stored | On the customer's phone (localStorage) | Central database |
| PIN security | SHA-256 hash in `tenants.js` (deters everyone but a determined techie — still safer than paper cards) | Server-side bcrypt, tamper-proof |
| Owner analytics | None | Stamps/redemptions per day |

The mode switches automatically: if `SUPABASE_URL` in `app.js` is left as the
placeholder, or the slug exists in `tenants.js`, static mode is used.
Supabase setup lives in `supabase/schema.sql` for when a client pays for it.

## Run locally

```
npx serve -s public -l 3000
```

- Customer card demo: http://localhost:3000/demo (cashier PIN: `1234`)
- New-business onboarding tool: http://localhost:3000/tools/setup.html
- Printable QR standee generator: http://localhost:3000/tools/standee.html

## Onboarding a new business (≈3 minutes, free mode)

1. Open `/tools/setup.html`, fill in name, color, stamp count, reward, PIN.
2. Copy the generated block into [public/tenants.js](public/tenants.js).
3. Redeploy (git push). The card is live at `/<slug>`.
4. Open `/tools/standee.html`, print the A6 QR standee, deliver it.

## How it works at the counter

1. Customer scans the QR on the standee → branded card opens in the browser →
   "Add to Home Screen" makes it feel like a native app.
2. On purchase, the customer taps **Gauti antspaudą** and hands the phone to
   the cashier, who types the 4-digit PIN on the customer's screen.
3. Full card → **Atsiimti prizą** flow resets it with the same PIN.

Anti-abuse in free mode: PIN stored only as a salted SHA-256 hash, 5 wrong
attempts = 10-minute lockout, 60-second cooldown between stamps (disabled on
`/demo` so you can click through a full card in sales meetings).

Note: PIN hashing uses WebCrypto, which browsers only enable on HTTPS or
localhost — testing from a phone over plain `http://<lan-ip>` won't verify
PINs. The deployed site is HTTPS, so this only affects LAN testing.

## Deploy (free)

Any static host works. Two good options:

- **Vercel**: `npx vercel --prod` — `vercel.json` already rewrites `/<slug>`
  to the app.
- **GitHub Pages**: push the `public/` folder; copy `index.html` to `404.html`
  so unknown paths like `/coffeebox` still load the app.

## Upsells per client (paid tiers you can add later)

- Supabase mode: tamper-proof stamps + owner dashboard (schema is ready)
- Email capture on first visit → marketing list
- Apple/Google Wallet pass export
- SMS "your reward is waiting" reminders
