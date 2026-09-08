import fs from 'node:fs';
import crypto from 'node:crypto';

const FILE_ID = '1cp0YhaeOKsqtbs2A_HgHINHGXAT3iLio';
const DRIVE_URL = `https://drive.google.com/uc?export=download&id=${FILE_ID}`;
const EXPECTED_SHA256 = '8f7ebb2af43faeda98080846e9bb86bb2936890170302d8b02a2a34c6de8d80e';
const EXPECTED_BYTES = 9280876;

fs.mkdirSync('dist', { recursive: true });
const response = await fetch(DRIVE_URL, { redirect: 'follow' });
if (!response.ok) throw new Error(`Google Drive download failed: ${response.status} ${response.statusText}`);
const bytes = Buffer.from(await response.arrayBuffer());
const sha = crypto.createHash('sha256').update(bytes).digest('hex');
if (bytes.length !== EXPECTED_BYTES) throw new Error(`Rozmiar v17 nie zgadza się: ${bytes.length} != ${EXPECTED_BYTES}`);
if (sha !== EXPECTED_SHA256) throw new Error(`SHA256 v17 nie zgadza się: ${sha}`);
if (!bytes.subarray(0, 240).toString('utf8').toLowerCase().includes('<!doctype html')) throw new Error('Pobrany plik nie wygląda jak Dorszolandia v17 Premium.');
fs.writeFileSync('dist/index.html', bytes);
console.log(`Dorszolandia v17 Premium: ${bytes.length} bytes, SHA256 ${sha}`);
