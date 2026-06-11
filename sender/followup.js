// =============================================================
// Stage 2: demo follow-up — sent ONLY after a positive reply.
// Usage:  node followup.js prospect@email.lt          (send)
//         node followup.js prospect@email.lt --dry    (preview)
// =============================================================

const { loadProspects, loadLog, saveLog, createDeliver, demoLink, SENDER_NAME } = require('./lib');

const email = (process.argv[2] || '').toLowerCase();
const dry = process.argv.includes('--dry');

if (!email || !email.includes('@')) {
  console.error('Usage: node followup.js <prospect-email> [--dry]'); process.exit(1);
}

function buildFollowup(p) {
  const link = demoLink(p);
  const subject = `Demonstracinė „${p.name}" lojalumo kortelė`;
  const body = `Laba diena,

Ačiū už atsakymą. Paruošiau demonstracinę „${p.name}" lojalumo
kortelės versiją:

${link}

Atsidarykite nuorodą telefonu — pamatysite kortelę su Jūsų pavadinimu ir
spalvomis. Antspaudą galite pažymėti patys: demonstracinės versijos
darbuotojo PIN — 1234.

Galutinėje versijoje būtų Jūsų logotipas, tikras saugus PIN, Jūsų
pasirinktas prizas ir atspausdinti QR kodai prie kasos. Įdiegiu per 48
valandas nuo patvirtinimo. Papildomos funkcijos pagal Jūsų poreikius —
už papildomą mokestį.

Mielai atsakysiu į klausimus.

Pagarbiai
${SENDER_NAME}.`;
  return { subject, body };
}

(async () => {
  const p = loadProspects().find((x) => x.email.toLowerCase() === email);
  if (!p) { console.error(`Prospect not found in list: ${email}`); process.exit(1); }

  const log = loadLog();
  log.followups = log.followups || {};
  if (log.followups[email] && !dry) {
    console.log(`Follow-up already sent to ${email} on ${log.followups[email].at}. Skipping.`); return;
  }

  const { subject, body } = buildFollowup(p);
  if (dry) { console.log(`--- ${p.name} <${p.email}>\n${subject}\n\n${body}`); return; }

  const deliver = await createDeliver();
  await deliver({ to: p.email, subject, text: body });
  log.followups[email] = { name: p.name, at: new Date().toISOString() };
  saveLog(log);
  console.log(`Follow-up with demo sent to ${p.name} <${p.email}>`);
})();
