// One-time Microsoft login for the sender.
// Usage: node login.js <application-client-id from Azure portal>
const { deviceLogin } = require('./graph');

if (!process.argv[2]) {
  console.error('Usage: node login.js <application-client-id from Azure portal>');
  process.exit(1);
}

deviceLogin(process.argv[2]).catch((e) => { console.error(e.message); process.exit(1); });
