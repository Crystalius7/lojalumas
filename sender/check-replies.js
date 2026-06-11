// Fetches UNSEEN emails from the outreach inbox into replies-pending.json
// for the triage agent. Marks them seen so they're fetched only once.
// Usage: node check-replies.js   (prints the number of new replies)

const fs = require('fs');
const path = require('path');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { loadEnv } = require('./lib');

const PENDING_FILE = path.join(__dirname, 'replies-pending.json');

(async () => {
  const { user, pass } = loadEnv();
  if (!user || !pass) { console.error('Missing sender/.env'); process.exit(1); }

  const client = new ImapFlow({
    host: 'imap.gmail.com', port: 993, secure: true,
    auth: { user, pass },
    logger: false,
  });

  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  const pending = fs.existsSync(PENDING_FILE)
    ? JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8').replace(/^﻿/, ''))
    : [];
  let added = 0;

  try {
    const uids = await client.search({ seen: false });
    for (const uid of uids || []) {
      const msg = await client.fetchOne(uid, { source: true });
      const parsed = await simpleParser(msg.source);
      pending.push({
        uid,
        from: parsed.from?.value?.[0]?.address || '',
        fromName: parsed.from?.value?.[0]?.name || '',
        subject: parsed.subject || '',
        date: parsed.date || null,
        text: (parsed.text || '').slice(0, 3000),
      });
      await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
      added++;
    }
  } finally {
    lock.release();
    await client.logout();
  }

  fs.writeFileSync(PENDING_FILE, JSON.stringify(pending, null, 2));
  console.log(`${added} new, ${pending.length} pending total`);
})();
