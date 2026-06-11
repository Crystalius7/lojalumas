// =============================================================
// Lojalumas outreach sender
// Sends ONE personalized email per prospect through Gmail SMTP,
// with a warm-up ramp, random human-like delays and a sent-log
// so nobody is ever emailed twice.
//
// Usage:  node send.js          (real send, respects daily cap)
//         node send.js --dry    (prints what WOULD be sent)
//         node send.js --test you@example.com  (sends 1 sample to you)
// =============================================================

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// ---------- config ----------
const ROOT = path.join(__dirname, '..');
const PROSPECTS_FILE = path.join(ROOT, 'prospects-kaunas.txt');
const LOG_FILE = path.join(__dirname, 'sent-log.json');
const ENV_FILE = path.join(__dirname, '.env');

const BASE_URL = 'https://projektai777.github.io/';
const SENDER_NAME = 'Ignas';
const RAMP = [8, 12, 18, 25]; // emails/day: day1, day2, day3, day4+
const MIN_GAP_MIN = 3, MAX_GAP_MIN = 7;

// ---------- tiny .env loader (no dependency) ----------
const env = {};
if (fs.existsSync(ENV_FILE)) {
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m) env[m[1]] = m[2];
  }
}
// Works with Gmail or Outlook: set EMAIL_USER + EMAIL_APP_PASSWORD in .env
// (legacy GMAIL_* keys still accepted).
const EMAIL_USER = env.EMAIL_USER || env.GMAIL_USER;
const EMAIL_APP_PASSWORD = (env.EMAIL_APP_PASSWORD || env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');
const IS_OUTLOOK = /@(outlook|hotmail|live)\./i.test(EMAIL_USER || '');

// ---------- email template (mirrors tools/outreach.html) ----------
const OPENERS = {
  kava: (biz) => `užsukęs pas Jus išgerti kavos pagalvojau: „${biz}" klientai tikrai grįžta dažnai — bet ar kas nors skaičiuoja jų apsilankymus? Popierinės kortelės pasimeta, o programėlės atsisiuntinėti niekas nenori.`,
  maistas: (biz) => `pastebėjau, kad „${biz}" turi nuolatinių klientų, kurie užsuka kelis kartus per savaitę — bet niekas jų lojalumo neapdovanoja. Popierinės kortelės pasimeta, o programėlės atsisiuntinėti niekas nenori.`,
  plovykla: (biz) => `automobilį plaunantys klientai grįžta kas kelias savaites — „${biz}" tai pastovi auditorija, kurią lengva paskatinti grįžti būtent pas Jus, o ne pas konkurentus už kampo.`,
  grozis: (biz) => `grožio paslaugų klientai — patys lojaliausi, jei juos tinkamai paskatini. „${biz}" klientė, žinanti, kad po penkto vizito laukia dovana, nesirinks kito salono.`,
};

function buildEmail(p) {
  const q = new URLSearchParams({ b: 'demo', n: p.name });
  if (/^#[0-9a-fA-F]{6}$/.test(p.color)) q.set('c', p.color);
  if (p.reward) q.set('r', p.reward);
  const link = BASE_URL + '?' + q.toString();

  const greet = p.person ? `Sveiki, ${p.person},` : 'Sveiki,';
  const opener = (OPENERS[p.tipas] || ((b) => `pastebėjau, kad „${b}" klientų lojalumui tikriausiai naudoja popierines korteles arba jų neturi visai.`))(p.name);

  const subject = `Skaitmeninė lojalumo kortelė „${p.name}" — paruošta išbandyti`;
  const body = `${greet}

esu programuotojas iš Lietuvos. ${opener}

Todėl per kelias minutes paruošiau Jums veikiančią skaitmeninę antspaudų
kortelę su Jūsų pavadinimu ir spalvomis:

${link}

Atsidarykite telefonu ir išbandykite (darbuotojo PIN demo versijoje: 1234).
Klientams nereikia jokios programėlės — kortelė atsidaro nuskenavus QR kodą
prie kasos ir „prilimpa" prie telefono ekrano.

Jei patiktų turėti tokią su tikru saugiu PIN ir atspausdintu QR stoveliu ant
kasos — įdiegiu per 48 val. už vienkartinį mokestį, be jokių mėnesinių
abonementų.

Jei nedomina — atsiprašau, kad sutrukdžiau, ir daugiau nerašysiu.

Pagarbiai,
${SENDER_NAME}`;
  return { subject, body };
}

// ---------- prospects + log ----------
function loadProspects() {
  return fs.readFileSync(PROSPECTS_FILE, 'utf8').split('\n')
    .map((l) => l.trim()).filter(Boolean)
    .map((l) => {
      const [name, email, color, reward, person, tipas] = l.split(';').map((s) => (s || '').trim());
      return { name, email, color, reward, person, tipas: (tipas || '').toLowerCase() };
    })
    .filter((p) => p.name && p.email && p.email.includes('@'));
}

function loadLog() {
  return fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')) : { sent: {}, days: {} };
}
function saveLog(log) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);

// ---------- main ----------
(async () => {
  const dry = process.argv.includes('--dry');
  const testIdx = process.argv.indexOf('--test');
  const testTo = testIdx > -1 ? process.argv[testIdx + 1] : null;

  if (!dry && (!EMAIL_USER || !EMAIL_APP_PASSWORD)) {
    console.error('Missing sender/.env with EMAIL_USER and EMAIL_APP_PASSWORD'); process.exit(1);
  }

  const transporter = dry ? null : nodemailer.createTransport(
    IS_OUTLOOK
      ? { host: 'smtp-mail.outlook.com', port: 587, secure: false,
          auth: { user: EMAIL_USER, pass: EMAIL_APP_PASSWORD } }
      : { service: 'gmail', auth: { user: EMAIL_USER, pass: EMAIL_APP_PASSWORD } }
  );

  if (testTo) {
    const sample = loadProspects()[0];
    const { subject, body } = buildEmail({ ...sample, name: 'Kavinė Aroma (TEST)' });
    await transporter.sendMail({ from: `"${SENDER_NAME}" <${EMAIL_USER}>`, to: testTo, subject, text: body });
    console.log(`Test email sent to ${testTo}`); return;
  }

  const log = loadLog();
  const dayCount = Object.keys(log.days).length + (log.days[today()] ? 0 : 1);
  const cap = RAMP[Math.min(dayCount - 1, RAMP.length - 1)];
  const sentToday = log.days[today()] || 0;
  const budget = cap - sentToday;

  if (budget <= 0) { console.log(`Daily cap (${cap}) already reached. Done.`); return; }

  const queue = loadProspects().filter((p) => !log.sent[p.email]).slice(0, budget);
  console.log(`Day ${dayCount}: cap ${cap}, sent today ${sentToday}, sending ${queue.length} now${dry ? ' (DRY RUN)' : ''}.`);

  for (const p of queue) {
    const { subject, body } = buildEmail(p);
    if (dry) {
      console.log(`--- ${p.name} <${p.email}>\n${subject}\n`);
    } else {
      try {
        await transporter.sendMail({ from: `"${SENDER_NAME}" <${EMAIL_USER}>`, to: p.email, subject, text: body });
        log.sent[p.email] = { name: p.name, at: new Date().toISOString() };
        log.days[today()] = (log.days[today()] || 0) + 1;
        saveLog(log);
        console.log(`sent: ${p.name} <${p.email}>`);
      } catch (e) {
        console.error(`FAILED: ${p.email} — ${e.message}`);
      }
      const gap = (MIN_GAP_MIN + Math.random() * (MAX_GAP_MIN - MIN_GAP_MIN)) * 60 * 1000;
      console.log(`  waiting ${Math.round(gap / 60000)} min...`);
      await sleep(gap);
    }
  }
  console.log('Batch complete.');
})();
