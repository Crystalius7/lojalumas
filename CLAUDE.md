# Lojalumas — project instructions

## Autonomy policy (user directive)
Be as autonomous as possible. Do everything yourself without asking — installs,
config, git, deploys, research, file changes. Only stop and ask the user when a
step is genuinely impossible for Claude: interactive web logins, captchas, SMS
codes, payments, or decisions that spend money. Never ask for confirmation on
reversible work. When blocked on a human-only step, batch ALL such steps into
one short numbered list instead of asking one at a time.

## Project facts
- Product: multi-tenant digital loyalty stamp-card PWA sold to Lithuanian SMEs.
- Live site: https://projektai777.github.io/ (org repo Projektai777/projektai777.github.io,
  source repo Crystalius7/lojalumas). Deploy with `.\publish.ps1 "msg"` —
  pushes main + rebuilds gh-pages subtree from public/ to both remotes.
- Free static mode: tenants in public/tenants.js (slug -> branding + SHA-256
  "slug:PIN" hash). Supabase schema in supabase/ is the future paid tier.
- Tenant URLs: /?b=slug. Sales demos: /?b=demo&n=Name&c=%23hex&r=reward (PIN 1234).
- Tools: /tools/setup.html (onboard client), /tools/standee.html (print QR
  standee), /tools/outreach.html (mail-merge with per-category openers).
- Outreach: prospects-kaunas.txt (88 Kaunas businesses; gitignored — contains
  real emails, never commit or publish). Sender: sender/send.js (Node +
  nodemailer, Gmail or Outlook via sender/.env, warm-up ramp 8/12/18/25 per day,
  3-7 min random gaps, sent-log dedupe). Scheduled task "LojalumasSender" runs
  it weekday mornings.
- All UI and outreach text in Lithuanian. Sender display name: Ignas.

## Hard rules
- prospects-*.txt, sender/.env, sender/sent-log.json must NEVER be committed
  (gitignored — keep it that way).
- Never raise sending volume above the ramp; never use BCC or bulk ESPs for
  cold outreach; opt-out replies ("nedomina") are removed from the prospect
  file immediately.
