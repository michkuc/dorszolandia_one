import fs from 'node:fs';
import crypto from 'node:crypto';

const FILE_ID = '17DWUXi8vUwZY8ZKqAHoCfqnXR4RnOFpc';
const DRIVE_URL = `https://drive.google.com/uc?export=download&id=${FILE_ID}`;
const EXPECTED_SHA256 = '54670fee544b61dec0a8a6fbd62fa869cdb04954723bbe58747aa33202ed01ce';
const EXPECTED_BYTES = 9910768;

fs.mkdirSync('dist', { recursive: true });
const response = await fetch(DRIVE_URL, { redirect: 'follow' });
if (!response.ok) throw new Error(`Google Drive download failed: ${response.status} ${response.statusText}`);
const bytes = Buffer.from(await response.arrayBuffer());
const sha = crypto.createHash('sha256').update(bytes).digest('hex');
if (bytes.length !== EXPECTED_BYTES) throw new Error(`Rozmiar v17.1 nie zgadza się: ${bytes.length} != ${EXPECTED_BYTES}`);
if (sha !== EXPECTED_SHA256) throw new Error(`SHA256 v17.1 nie zgadza się: ${sha}`);
if (!bytes.subarray(0, 240).toString('utf8').toLowerCase().includes('<!doctype html')) throw new Error('Pobrany plik nie wygląda jak Dorszolandia v17.1 Creator Premium.');
fs.writeFileSync('dist/index.html', bytes);
console.log(`Dorszolandia v17.1 Creator Premium: ${bytes.length} bytes, SHA256 ${sha}`);
