// Removes a prospect from the list permanently (decline / bounce / opt-out)
// and records it in declined.json so they can never be re-added by mistake.
// Usage: node remove-prospect.js <email> "<reason>"

const fs = require('fs');
const path = require('path');
const { removeProspect } = require('./lib');

const DECLINED_FILE = path.join(__dirname, 'declined.json');
const email = (process.argv[2] || '').toLowerCase();
const reason = process.argv[3] || 'unspecified';

if (!email.includes('@')) { console.error('Usage: node remove-prospect.js <email> "<reason>"'); process.exit(1); }

const declined = fs.existsSync(DECLINED_FILE) ? JSON.parse(fs.readFileSync(DECLINED_FILE, 'utf8')) : {};
declined[email] = { reason, at: new Date().toISOString() };
fs.writeFileSync(DECLINED_FILE, JSON.stringify(declined, null, 2));

const removed = removeProspect(email);
console.log(removed
  ? `Removed ${email} from prospect list (${reason}).`
  : `${email} was not in the prospect list; recorded in declined.json (${reason}).`);
