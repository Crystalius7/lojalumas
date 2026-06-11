// Marks a prospect as an ACTIVE CLIENT — the user is talking to them
// personally from the campaign inbox, so the triage agent and the
// inbox checker must skip all their future emails.
// Usage: node add-active.js <email>

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'active-clients.json');
const email = (process.argv[2] || '').toLowerCase();
if (!email.includes('@')) { console.error('Usage: node add-active.js <email>'); process.exit(1); }

const list = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8').replace(/^﻿/, '')) : {};
list[email] = { since: new Date().toISOString() };
fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
console.log(`${email} marked as active client — agent will skip their emails from now on.`);
