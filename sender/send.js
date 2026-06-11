// =============================================================
// Stage 1: official first-touch email — NO demo link.
// The demo goes out via followup.js only after a positive reply.
//
// Usage:  node send.js          (real send, respects daily warm-up cap)
//         node send.js --dry    (prints what WOULD be sent)
//         node send.js --test you@example.com  (one sample to yourself)
// =============================================================

const { loadProspects, loadLog, saveLog, createDeliver, SENDER_NAME } = require('./lib');

const RAMP = [8, 12, 18, 25]; // emails/day: day1, day2, day3, day4+
const MIN_GAP_MIN = 3, MAX_GAP_MIN = 7;

// Honest, official category line — no claims of having visited.
const OPENERS = {
  kava: 'Kavinių ir kepyklėlių klientai dažnai grįžta kasdien ar kas savaitę — skaitmeninė antspaudų kortelė padeda paskatinti juos rinktis būtent Jus.',
  maistas: 'Greito maisto įstaigų klientai paprastai renkasi iš kelių įprastų vietų — lojalumo programa dažnai nulemia, kur jie sugrįš.',
  plovykla: 'Automobilių plovyklų klientai paslaugomis naudojasi reguliariai — lojalumo programa padeda užtikrinti, kad jie grįžtų pas Jus, o ne pas konkurentus.',
  grozis: 'Grožio paslaugų srityje nuolatiniai klientai yra pagrindinis pajamų šaltinis — aiški lojalumo programa sumažina klientų nutekėjimą.',
};

function buildEmail(p) {
  const opener = OPENERS[p.tipas] || 'Skaitmeninė antspaudų kortelė padeda paskatinti klientus sugrįžti dažniau.';
  const subject = `Dėl klientų lojalumo programos „${p.name}"`;
  const body = `Laba diena,

Esu programuotojas Ignas iš Kauno, kuriu skaitmenines lojalumo korteles
smulkiajam verslui. Siūlau tokią išbandyti ir „${p.name}".

${opener}

Kaip tai veikia:
- klientas vieną kartą nuskenuoja QR kodą prie kasos — kortelė atsidaro
  naršyklėje, jokios programėlės atsisiųsti nereikia;
- pirkimo metu darbuotojas slaptu PIN kodu pažymi antspaudą kliento telefone;
- surinkęs nustatytą antspaudų skaičių, klientas gauna Jūsų pasirinktą prizą.

Kaina — vienkartinis diegimo mokestis. Jokių mėnesinių abonementų.
Papildomos funkcijos gali būti įdiegtos pagal Jūsų poreikius už papildomą
mokestį.

Jei norėtumėte pamatyti, kaip kortelė atrodytų su Jūsų pavadinimu, spalvomis
ir prizu — tiesiog atsakykite į šį laišką, ir atsiųsiu veikiančią
demonstracinę versiją.

Jei pasiūlymas neaktualus, atsiprašau už sutrukdymą — daugiau laiškų nesiųsiu.

Pagarbiai
${SENDER_NAME}.`;
  return { subject, body };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);

(async () => {
  const dry = process.argv.includes('--dry');
  const testIdx = process.argv.indexOf('--test');
  const testTo = testIdx > -1 ? process.argv[testIdx + 1] : null;

  const deliver = dry ? null : await createDeliver();

  if (testTo) {
    // node send.js --test you@x.lt [kava|maistas|plovykla|grozis]
    const tipas = process.argv[testIdx + 2] || 'kava';
    const NAMES = {
      kava: 'Kavinė Aroma (TEST)',
      maistas: 'Picerija Roma (TEST)',
      plovykla: 'Plovykla Blizgesys (TEST)',
      grozis: 'Grožio salonas Stilius (TEST)',
    };
    const { subject, body } = buildEmail({ name: NAMES[tipas] || 'Testas', tipas });
    await deliver({ to: testTo, subject, text: body });
    console.log(`Test email (${tipas}) sent to ${testTo}`); return;
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
        await deliver({ to: p.email, subject, text: body });
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
