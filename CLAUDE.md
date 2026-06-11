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
- Outreach is a TWO-STAGE funnel from projektai777.koduojam@gmail.com:
  stage 1 sender/send.js — official first-touch email, honest (no visit
  claims), NO demo link, warm-up ramp 8/12/18/25 per day, 3-7 min gaps,
  sent-log dedupe. Stage 2 sender/followup.js <email> — personalized demo
  link, sent only after a positive reply. Reply triage: scheduled task
  "LojalumasReplies" (daily incl. weekends, 11:15 & 17:15) runs sender/reply-agent.ps1 —
  fetches IMAP unseen via check-replies.js, and only if replies exist spawns
  headless `claude -p` (opus, ultrathink) with reply-agent-prompt.md:
  INTERESTED→followup.js, DECLINED/BOUNCE→remove-prospect.js, anything
  uncertain→stays in replies-pending.json for human review (no false
  positives). Task "LojalumasSender" sends daily incl. weekends, 09:17 + 0-40 min jitter.
- prospects-kaunas.txt: 88 Kaunas businesses (gitignored — real emails,
  never commit or publish). Short URL: https://tinyurl.com/lojalumas
  (print/verbal only — NEVER in emails, shorteners trip spam filters).
- All UI and outreach text in Lithuanian. Sender display name: Ignas.

## Hard rules
- prospects-*.txt, sender/.env, sender/sent-log.json must NEVER be committed
  (gitignored — keep it that way).
- Never raise sending volume above the ramp; never use BCC or bulk ESPs for
  cold outreach; opt-out replies ("nedomina") are removed from the prospect
  file immediately.
