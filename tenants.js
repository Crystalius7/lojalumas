// =============================================================
// VISŲ VERSLŲ KONFIGŪRACIJA — vienas įrašas = vienas klientas.
// Naujo verslo prijungimas: atsidarykite /tools/setup.html,
// užpildykite formą ir įklijuokite sugeneruotą bloką čia.
//
// pin_hash = SHA-256("slug:PIN") — pats PIN niekur nesaugomas.
// =============================================================

export default {

  demo: {
    business_name: 'Coffee Box Kaunas',
    logo_url: '',                       // tuščia = rodoma pirma raidė
    primary_color: '#FF5733',
    stamps_needed: 10,
    reward_text: 'Nemokamas didelis kapučinas',
    pin_hash: '88bf6316a604b0e00e239641f1e554ac86271ec4be44757ac87edb4269e0c331', // PIN: 1234
  },

  // kitasverslas: {
  //   business_name: 'Plovykla PRO',
  //   logo_url: '/logos/plovykla.png',
  //   primary_color: '#0ea5e9',
  //   stamps_needed: 5,
  //   reward_text: 'Nemokamas plovimas',
  //   pin_hash: '...',
  // },

};
