// =============================================================
// Stage 1: official first-touch email — NO demo link.
// The demo goes out via followup.js only after a positive reply.
//
// Usage:  node send.js          (real send, respects daily warm-up cap)
//         node send.js --dry    (prints what WOULD be sent)
//         node send.js --test you@example.com  (one sample to yourself)
// =============================================================

const { loadProspects, loadLog, saveLog, createDeliver, SENDER_NAME } = require('./lib');

// Daily volume: random 5-10 per day — low, human-looking, never a pattern.
const dailyCap = () => 5 + Math.floor(Math.random() * 6);
const MIN_GAP_MIN = 3, MAX_GAP_MIN = 7;

// Honest, official category line — no claims of having visited.
const OPENERS = {
  kava: 'Kavinių ir kepyklėlių klientai dažnai grįžta kasdien ar kas savaitę — skaitmeninė antspaudų kortelė padeda paskatinti juos rinktis būtent Jus.',
  maistas: 'Greito maisto įstaigų klientai paprastai renkasi iš kelių įprastų vietų — lojalumo programa dažnai nulemia, kur jie sugrįš.',
  plovykla: 'Automobilių plovyklų klientai paslaugomis naudojasi reguliariai — lojalumo programa padeda užtikrinti, kad jie grįžtų pas Jus, o ne pas konkurentus.',
  grozis: 'Grožio paslaugų srityje nuolatiniai klientai yra pagrindinis pajamų šaltinis — aiški lojalumo programa sumažina klientų nutekėjimą.',
  grooming: 'Augintinių priežiūra — reguliari paslauga: šeimininkai grįžta kas kelias savaites, o lojalumo kortelė užtikrina, kad jie grįžtų būtent pas Jus.',
  geles: 'Gėlių perkama nuolat — šventėms, progoms, namams. Lojalumo kortelė paskatina klientus visada rinktis Jūsų saloną, o ne artimiausią pakeliui.',
  valymas: 'Valymo paslaugų klientai paslaugomis naudojasi reguliariai — lojalumo programa padeda išlaikyti nuolatinius klientus ir pritraukti naujus.',
  masazas: 'Masažo ir SPA klientai, turintys aiškią naudą už lojalumą, lankosi dažniau ir rečiau iškeičia Jus į konkurentus.',
  tattoo: 'Tatuiruočių studijos klientai dažnai grįžta naujiems darbams ir rekomenduoja draugams — lojalumo programa abu šiuos įpročius dar sustiprina.',
  servisas: 'Serviso klientai grįžta sezoniškai — lojalumo kortelė užtikrina, kad kitą kartą jie pasirinks Jus, o ne ieškos iš naujo.',
  // --- services-only types (no loyalty-card pitch) ---
  autoservisas: 'Autoservisų klientai dažniausiai ateina per rekomendacijas ir internetą — paprasti skaitmeniniai įrankiai padeda atrodyti profesionaliai ir sutaupyti administracinio darbo.',
  klinika: 'Klinikų registratūros kasdien atsakinėja į tuos pačius klausimus ir skambučius — dalį šio darbo gali atlikti paprasti skaitmeniniai sprendimai.',
  statyba: 'Statybos ir remonto įmonėms daugiausia laiko atima skambučiai, užklausos ir sąmatos — dalį šių darbų galima automatizuoti.',
  sportas: 'Sporto klubų ir studijų klientai nori paprastos registracijos ir aiškių tvarkaraščių — tai įmanoma be brangių platformų ir mėnesinių mokesčių.',
  paslaugos: 'Daugumai paslaugų verslų daugiausia laiko atima užklausos, registracijos ir rutininis administravimas — dalį šių darbų galima nebrangiai automatizuoti.',
  mokykla: 'Vairavimo mokyklų mokiniai ieško informacijos ir registruojasi internetu — patogi registracija ir aiški svetainė tiesiogiai lemia, kiek mokinių užsiregistruos pas Jus.',
  foto: 'Fotografų klientai renkasi pagal portfolio ir užsakymo patogumą — tvarkinga svetainė su rezervacijos forma padeda gauti daugiau užsakymų.',
  spauda: 'Spaustuvių klientai dažnai siunčia užklausas ir failus el. paštu — patogi užsakymų forma su failų įkėlimu sutaupo daug susirašinėjimo.',
  optika: 'Optikų klientai grįžta reguliariai — pasitikrinti regėjimo ar atsinaujinti akinių. Skaitmeniniai įrankiai padeda priminti apie Jus laiku.',
  nuoma: 'Sodybų ir pramogų nuomos užsakymai dažniausiai derinami telefonu ar žinutėmis — internetinis rezervacijų kalendorius sutaupo daug skambučių ir padeda neprarasti nė vieno kliento.',
};

// Business types that get the SERVICES-ONLY letter (no loyalty card pitch).
const NO_LOYALTY = new Set(['autoservisas', 'klinika', 'statyba', 'sportas', 'paslaugos',
  'mokykla', 'foto', 'spauda', 'optika', 'nuoma']);

// Five practical extra-service ideas per business type — things we can
// build cheaply (little or zero infrastructure cost).
const SERVICES = {
  kava: `- paprasta svetainė su meniu, darbo laiku ir nuotraukomis;
- išankstinių užsakymų forma (klientai užsisako atsiėmimui be skambučio);
- Google atsiliepimų rinkimo sistema (QR kodas prie kasos: patenkinti
  klientai nukreipiami palikti viešą atsiliepimą, nepatenkintų pastabos
  atkeliauja tiesiai Jums);
- dienos pasiūlymų puslapis, kurį atnaujinate per 30 sekundžių telefonu;
- dovanų kuponų sistema šventiniam laikotarpiui.`,
  maistas: `- internetinis meniu su QR kodais ant staliukų;
- užsakymų išsinešimui forma be tarpininkų komisinių;
- Google atsiliepimų rinkimo sistema (QR kodas prie kasos);
- dienos pietų puslapis, kurį atnaujinate per 30 sekundžių telefonu;
- dovanų kuponų sistema.`,
  plovykla: `- internetinė vizitų rezervacijos sistema be mėnesinių mokesčių;
- automatiniai priminimai klientams el. paštu apie laiką pakartotiniam
  plovimui;
- kainų skaičiuoklė svetainėje (klientas pasirenka automobilį ir paslaugas
  — iškart mato kainą);
- Google atsiliepimų rinkimo sistema;
- dovanų kuponų sistema.`,
  grozis: `- vizitų rezervacijos sistema be mėnesinių mokesčių;
- automatiniai priminimai klientėms apie artėjantį vizitą;
- darbų portfolio svetainė su nuotraukomis;
- Google atsiliepimų rinkimo sistema;
- dovanų kuponų sistema.`,
};
SERVICES.grooming = `- vizitų rezervacijos sistema be mėnesinių mokesčių;
- automatiniai priminimai šeimininkams, kada laikas kitam kirpimui;
- darbų prieš/po nuotraukų galerija;
- Google atsiliepimų rinkimo sistema;
- dovanų kuponų sistema.`;
SERVICES.geles = `- paprasta svetainė su puokščių nuotraukomis ir kainomis;
- išankstinių užsakymų forma šventėms;
- priminimai klientams apie artėjančias progas (pvz., metines);
- Google atsiliepimų rinkimo sistema;
- dovanų kuponų sistema.`;
SERVICES.valymas = `- užsakymų ir atsiėmimo registracijos forma;
- automatiniai pranešimai klientui, kai užsakymas paruoštas;
- kainoraščio puslapis, kurį lengva atnaujinti;
- Google atsiliepimų rinkimo sistema;
- dovanų kuponų sistema.`;
SERVICES.masazas = `- vizitų rezervacijos sistema be mėnesinių mokesčių;
- automatiniai priminimai klientams apie artėjantį vizitą;
- paslaugų ir kainų puslapis;
- Google atsiliepimų rinkimo sistema;
- dovanų kuponų sistema.`;
SERVICES.tattoo = `- darbų portfolio svetainė;
- užklausų forma su eskizų įkėlimu;
- Google atsiliepimų rinkimo sistema;
- dovanų kuponų sistema;
- laisvų laikų kalendorius.`;
SERVICES.servisas = `- remonto užsakymų registracijos forma;
- automatiniai pranešimai klientui apie remonto būseną;
- sezoniniai priminimai (pvz., laikas paruošti dviratį pavasariui);
- Google atsiliepimų rinkimo sistema;
- dovanų kuponų sistema.`;
SERVICES.autoservisas = `- registracijos remontui forma internetu;
- automatiniai pranešimai klientui apie remonto būseną;
- priminimai klientams apie artėjančią TA ar sezoninį padangų keitimą;
- Google atsiliepimų rinkimo sistema;
- paprasta svetainė su paslaugomis ir kainomis.`;
SERVICES.klinika = `- vizitų registracijos forma internetu;
- automatiniai priminimai pacientams apie artėjantį vizitą;
- dažniausių klausimų (D.U.K.) puslapis, mažinantis skambučių skaičių;
- Google atsiliepimų rinkimo sistema;
- paprasta, tvarkinga svetainė.`;
SERVICES.statyba = `- užklausų forma su nuotraukų įkėlimu (klientas iškart parodo objektą);
- atliktų darbų portfolio svetainė;
- preliminarios sąmatos skaičiuoklė;
- Google atsiliepimų rinkimo sistema;
- automatiniai atsakymai į užklausas.`;
SERVICES.sportas = `- registracijos į treniruotes forma;
- tvarkaraščio puslapis, kurį atnaujinate telefonu;
- automatiniai priminimai klientams apie treniruotes;
- Google atsiliepimų rinkimo sistema;
- dovanų kuponų ir narysčių sistema.`;
SERVICES.paslaugos = `- paprasta svetainė Jūsų paslaugoms pristatyti;
- užklausų ar rezervacijų forma internetu;
- Google atsiliepimų rinkimo sistema;
- rutininių administracinių darbų automatizavimas;
- dovanų kuponų sistema.`;
SERVICES.mokykla = `- registracijos į kursus forma internetu;
- tvarkaraščių puslapis, kurį lengva atnaujinti;
- automatiniai priminimai mokiniams apie pamokas;
- Google atsiliepimų rinkimo sistema;
- svetainė su kainomis ir dažniausiais klausimais.`;
SERVICES.foto = `- darbų portfolio svetainė;
- fotosesijų rezervacijos forma;
- automatiniai priminimai klientams apie fotosesiją;
- patogus nuotraukų galerijų perdavimas klientams;
- Google atsiliepimų rinkimo sistema.`;
SERVICES.spauda = `- užsakymų forma su failų įkėlimu;
- automatiniai pranešimai klientui apie užsakymo būseną;
- preliminarių kainų skaičiuoklė;
- Google atsiliepimų rinkimo sistema;
- paprasta svetainė su paslaugų katalogu.`;
SERVICES.optika = `- regėjimo patikros registracijos forma;
- automatiniai priminimai klientams apie metinę patikrą;
- Google atsiliepimų rinkimo sistema;
- svetainė su prekėmis ir kainomis;
- dovanų kuponų sistema.`;
SERVICES.nuoma = `- rezervacijų kalendorius su laisvų datų rodymu (sodyboms, baidarėms);
- užklausų forma su automatiniu patvirtinimu klientui;
- dvigubų rezervacijų apsauga;
- Google atsiliepimų rinkimo sistema;
- dovanų kuponų sistema šventėms.`;

const SERVICES_DEFAULT = `- paprasta svetainė Jūsų paslaugoms pristatyti;
- internetinė rezervacijos ar užsakymų forma;
- Google atsiliepimų rinkimo sistema;
- dovanų kuponų sistema;
- kasdienių rutininių darbų automatizavimas.`;

function buildEmail(p) {
  const opener = OPENERS[p.tipas] || 'Skaitmeninė antspaudų kortelė padeda paskatinti klientus sugrįžti dažniau.';
  const services = SERVICES[p.tipas] || SERVICES_DEFAULT;

  // Services-only letter for business types where a loyalty card doesn't fit.
  if (NO_LOYALTY.has(p.tipas)) {
    const subject = `Dėl skaitmeninių sprendimų „${p.name}"`;
    const body = `Laba diena,

Esu programuotojas Ignas iš Kauno, kuriu skaitmeninius sprendimus
smulkiajam verslui.

${opener}

„${p.name}" galėtume padėti, pavyzdžiui:
${services}
- ir daug kitų — pagal Jūsų poreikius.

Esame nauja įmonė, todėl siūlome ženkliai palankesnes kainas nei rinkoje
nusistovėjusios alternatyvos — dažniausiai vienkartinis mokestis, jokių
mėnesinių abonementų.

Jei kas nors iš to atrodo aktualu — tiesiog atsakykite į šį laišką, ir
aptarsime Jūsų poreikius be jokių įsipareigojimų.

Pagarbiai
${SENDER_NAME}.`;
    return { subject, body };
  }

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

Esame nauja įmonė, todėl siūlome ženkliai palankesnes kainas nei rinkoje
nusistovėjusios alternatyvos — vienkartinis diegimo mokestis, jokių mėnesinių
abonementų. Papildomos funkcijos gali būti įdiegtos pagal Jūsų poreikius už
papildomą mokestį.

Taip pat kuriame ir kitus sprendimus, palengvinančius kasdienius verslo
darbus — taip pat už itin konkurencingą kainą. Pavyzdžiui:
${services}
- ir daug kitų — pagal Jūsų poreikius.

Jei norėtumėte pamatyti, kaip kortelė atrodytų su Jūsų pavadinimu, spalvomis
ir prizu — tiesiog atsakykite į šį laišką, ir atsiųsiu veikiančią
demonstracinę versiją.

Pagarbiai
${SENDER_NAME}.`;
  return { subject, body };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);

// ---------- wake-from-sleep support (mirrors RobloxModelsProject) ----------
// The scheduled task has WakeToRun: it can wake the PC from sleep to send the
// daily batch. At startup we check whether THIS run woke the machine; if so,
// we return it to sleep afterwards (unless the user is actively at the desk).
const { execFileSync } = require('child_process');
const POWER_PS1 = require('path').join(__dirname, 'power.ps1');

function wokeFromSleep() {
  try {
    const out = execFileSync('powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', POWER_PS1, 'woke'],
      { timeout: 30000 }).toString().trim();
    return out === 'YES';
  } catch {
    console.log("couldn't read wake history; treating PC as already-awake.");
    return false;
  }
}

function maybeSleep(woke) {
  if (!woke) { console.log('PC was already awake before this run - leaving it awake.'); return; }
  console.log('batch done; PC was woken from sleep - returning to sleep.');
  try {
    execFileSync('powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', POWER_PS1, 'sleep'],
      { timeout: 60000, stdio: 'inherit' });
  } catch (e) {
    console.error(`sleep attempt failed: ${e.message}`);
  }
}

(async () => {
  const dry = process.argv.includes('--dry');
  const testIdx = process.argv.indexOf('--test');
  const testTo = testIdx > -1 ? process.argv[testIdx + 1] : null;

  const deliver = dry ? null : await createDeliver();

  // node send.js --preview <prospect-email> <your-email> — the EXACT letter
  // a specific prospect would receive, sent to you instead.
  const prevIdx = process.argv.indexOf('--preview');
  if (prevIdx > -1) {
    const pEmail = (process.argv[prevIdx + 1] || '').toLowerCase();
    const to = process.argv[prevIdx + 2];
    const p = loadProspects().find((x) => x.email.toLowerCase() === pEmail);
    if (!p || !to) { console.error('Usage: --preview <prospect-email> <send-to>'); process.exit(1); }
    const { subject, body } = buildEmail(p);
    await deliver({ to, subject, text: body });
    console.log(`Preview of "${p.name}" letter sent to ${to}`); return;
  }

  // node send.js --first you@x.lt — the EXACT email the first queued real
  // prospect would receive (their name, their opener), sent to you instead.
  const firstIdx = process.argv.indexOf('--first');
  if (firstIdx > -1) {
    const to = process.argv[firstIdx + 1];
    const log0 = loadLog();
    const p = loadProspects().find((x) => !log0.sent[x.email]);
    if (!p) { console.error('Queue is empty.'); process.exit(1); }
    const { subject, body } = buildEmail(p);
    await deliver({ to, subject, text: body });
    console.log(`Exact first-prospect email (${p.name} <${p.email}>) sent to ${to}`); return;
  }

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

  // Detect wake-state FIRST (the resume event must be fresh), before the
  // batch spends an hour sending. Only relevant for real scheduled runs.
  const woke = !dry && wokeFromSleep();
  if (woke) console.log('PC was woken from sleep by this scheduled run.');

  const log = loadLog();
  const dayCount = Object.keys(log.days).length + (log.days[today()] ? 0 : 1);
  const cap = dailyCap();
  const sentToday = log.days[today()] || 0;
  const budget = cap - sentToday;

  if (budget <= 0) {
    console.log(`Daily cap (${cap}) already reached. Done.`);
    maybeSleep(woke);
    return;
  }

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
  // Deliverability canary: ONE-TIME — a random real email also goes to an
  // independent test inbox (different person/IP) to verify inbox placement.
  // Runs only once ever (flag stored in the log).
  const SPAM_TEST = 'deivisxxl@gmail.com';
  if (!dry && queue.length && !log.spamTestDone) {
    const p = queue[Math.floor(Math.random() * queue.length)];
    const { subject, body } = buildEmail(p);
    try {
      await deliver({ to: SPAM_TEST, subject, text: body });
      log.spamTestDone = { name: p.name, at: new Date().toISOString() };
      saveLog(log);
      console.log(`One-time spam-test copy ("${p.name}") sent to ${SPAM_TEST}`);
    } catch (e) {
      console.error(`spam-test copy failed: ${e.message}`);
    }
  }

  console.log('Batch complete.');
  maybeSleep(woke);
})();
