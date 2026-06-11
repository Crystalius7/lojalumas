// Microsoft Graph mail transport for personal Outlook accounts.
// One-time: node login.js  (device-code consent in browser)
// After that send.js refreshes tokens silently — no passwords stored.

const fs = require('fs');
const path = require('path');

const TOKEN_FILE = path.join(__dirname, '.token.json');
const AUTH_BASE = 'https://login.microsoftonline.com/consumers/oauth2/v2.0';
const SCOPE = 'https://graph.microsoft.com/Mail.Send offline_access';

function loadToken() {
  return fs.existsSync(TOKEN_FILE) ? JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')) : null;
}
function saveToken(t) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(t, null, 2));
}

async function post(url, params) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  return { status: r.status, json: await r.json() };
}

// ---------- one-time interactive login (device code flow) ----------
async function deviceLogin(clientId) {
  const dc = await post(`${AUTH_BASE}/devicecode`, { client_id: clientId, scope: SCOPE });
  if (!dc.json.device_code) throw new Error('devicecode failed: ' + JSON.stringify(dc.json));

  console.log('\n==================================================');
  console.log(`Open:  ${dc.json.verification_uri}`);
  console.log(`Code:  ${dc.json.user_code}`);
  console.log('Sign in with the PROJECT Outlook account.');
  console.log('==================================================\n');
  try { require('child_process').exec(`start chrome "${dc.json.verification_uri}"`); } catch {}

  const interval = (dc.json.interval || 5) * 1000;
  for (;;) {
    await new Promise((r) => setTimeout(r, interval));
    const t = await post(`${AUTH_BASE}/token`, {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      client_id: clientId,
      device_code: dc.json.device_code,
    });
    if (t.json.access_token) {
      saveToken({ refresh_token: t.json.refresh_token, client_id: clientId });
      console.log('Login OK — token saved. Sender is now fully autonomous.');
      return;
    }
    if (t.json.error !== 'authorization_pending') {
      throw new Error('login failed: ' + t.json.error_description);
    }
    process.stdout.write('.');
  }
}

// ---------- silent token refresh for every send run ----------
async function getAccessToken() {
  const tok = loadToken();
  if (!tok) throw new Error('No token. Run: node login.js');
  const t = await post(`${AUTH_BASE}/token`, {
    grant_type: 'refresh_token',
    client_id: tok.client_id,
    refresh_token: tok.refresh_token,
    scope: SCOPE,
  });
  if (!t.json.access_token) throw new Error('refresh failed: ' + JSON.stringify(t.json));
  if (t.json.refresh_token) saveToken({ ...tok, refresh_token: t.json.refresh_token });
  return t.json.access_token;
}

async function sendMail(accessToken, { to, subject, text }) {
  const r = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'Text', content: text },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    }),
  });
  if (r.status !== 202) throw new Error(`Graph sendMail ${r.status}: ${await r.text()}`);
}

module.exports = { deviceLogin, getAccessToken, sendMail, loadToken };
