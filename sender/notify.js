// Sends a notification to the OWNER when a real human reply arrives.
// Recipient is HARDCODED — the triage agent cannot redirect it.
// Usage: node notify.js <reply-from-email> "<CLASS>" "<short note>"

const fs = require('fs');
const path = require('path');
const { createDeliver } = require('./lib');

const NOTIFY_TO = 'ig.dauksa@gmail.com';
const PENDING_FILE = path.join(__dirname, 'replies-pending.json');

const from = (process.argv[2] || '').toLowerCase();
const cls = process.argv[3] || 'REPLY';
const note = process.argv[4] || '';

if (!from.includes('@')) {
  console.error('Usage: node notify.js <reply-from-email> "<CLASS>" "<note>"'); process.exit(1);
}

(async () => {
  let entry = null;
  if (fs.existsSync(PENDING_FILE)) {
    const pending = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8').replace(/^﻿/, ''));
    entry = pending.find((e) => (e.from || '').toLowerCase() === from) || null;
  }

  const subject = `ATSAKYMAS [${cls}]: ${entry?.fromName || from}`;
  const body = `Gautas tikras atsakymas į kampanijos laišką.

Nuo: ${entry?.fromName || ''} <${from}>
Verdiktas: ${cls}
Pastaba: ${note}

--- Laiško tekstas ---
${entry?.text || '(teksto nerasta replies-pending.json — žiūrėk pašto dėžutę)'}

--- Kas toliau ---
Atsidaryk projektai777.koduojam@gmail.com ir perimk pokalbį.
Demo siuntimas: node sender\\followup.js ${from}`;

  const deliver = await createDeliver();
  await deliver({ to: NOTIFY_TO, subject, text: body });
  console.log(`Notification about ${from} (${cls}) sent to ${NOTIFY_TO}`);
})();
