// Shared plumbing for the outreach pipeline (send.js / followup.js / check-replies.js)
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const ROOT = path.join(__dirname, '..');
const PROSPECTS_FILE = path.join(ROOT, 'prospects-kaunas.txt');
const LOG_FILE = path.join(__dirname, 'sent-log.json');
const ENV_FILE = path.join(__dirname, '.env');

const BASE_URL = 'https://projektai777.github.io/';
const SENDER_NAME = 'Ignas';

function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_FILE)) {
    for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  }
  return {
    user: env.EMAIL_USER || env.GMAIL_USER,
    pass: (env.EMAIL_APP_PASSWORD || env.GMAIL_APP_PASSWORD || '').replace(/\s/g, ''),
  };
}

// PowerShell-written files may carry a UTF-8 BOM — always strip it.
const readText = (f) => fs.readFileSync(f, 'utf8').replace(/^﻿/, '');

function loadProspects() {
  if (!fs.existsSync(PROSPECTS_FILE)) return [];
  return readText(PROSPECTS_FILE).split('\n')
    .map((l) => l.trim()).filter(Boolean)
    .map((l) => {
      const [name, email, color, reward, person, tipas] = l.split(';').map((s) => (s || '').trim());
      return { name, email, color, reward, person, tipas: (tipas || '').toLowerCase() };
    })
    .filter((p) => p.name && p.email && p.email.includes('@'));
}

function removeProspect(email) {
  if (!fs.existsSync(PROSPECTS_FILE)) return false;
  const lines = readText(PROSPECTS_FILE).split('\n');
  const kept = lines.filter((l) => !l.toLowerCase().includes(email.toLowerCase()));
  if (kept.length === lines.length) return false;
  fs.writeFileSync(PROSPECTS_FILE, kept.join('\n'));
  return true;
}

function loadLog() {
  return fs.existsSync(LOG_FILE) ? JSON.parse(readText(LOG_FILE)) : { sent: {}, days: {}, followups: {} };
}
function saveLog(log) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

function demoLink(p) {
  const q = new URLSearchParams({ b: 'demo', n: p.name });
  if (/^#[0-9a-fA-F]{6}$/.test(p.color || '')) q.set('c', p.color);
  if (p.reward) q.set('r', p.reward);
  return BASE_URL + '?' + q.toString();
}

// Transport: Microsoft Graph if a token exists, else Gmail/Outlook SMTP.
// Returns async ({to, subject, text}) => void
async function createDeliver() {
  const graph = require('./graph');
  if (graph.loadToken()) {
    const accessToken = await graph.getAccessToken();
    return (msg) => graph.sendMail(accessToken, msg);
  }
  const { user, pass } = loadEnv();
  if (!user || !pass) throw new Error('Missing sender/.env EMAIL_USER / EMAIL_APP_PASSWORD');
  const isOutlook = /@(outlook|hotmail|live)\./i.test(user);
  const transporter = nodemailer.createTransport(
    isOutlook
      ? { host: 'smtp-mail.outlook.com', port: 587, secure: false, auth: { user, pass } }
      : { service: 'gmail', auth: { user, pass } }
  );
  return (msg) => transporter.sendMail({
    from: `"${SENDER_NAME}" <${user}>`, to: msg.to, subject: msg.subject, text: msg.text,
  });
}

module.exports = {
  PROSPECTS_FILE, LOG_FILE, BASE_URL, SENDER_NAME,
  loadEnv, loadProspects, removeProspect, loadLog, saveLog, demoLink, createDeliver,
};
