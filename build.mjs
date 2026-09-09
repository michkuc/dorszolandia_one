import fs from 'node:fs';
import crypto from 'node:crypto';

const FILE_ID = '1CCPcSbiZXiL4Z0Yb6_pLYvC1DLtHiZST';
const DRIVE_URL = `https://drive.google.com/uc?export=download&id=${FILE_ID}`;
const EXPECTED_SHA256 = '787bb0e031e5e805e85e33ed95b0198afb0290a26c54ffcd70f2cd97ffa48878';
const EXPECTED_BYTES = 6134296;

fs.mkdirSync('dist', { recursive: true });
const response = await fetch(DRIVE_URL, { redirect: 'follow' });
if (!response.ok) throw new Error(`Google Drive download failed: ${response.status} ${response.statusText}`);
const bytes = Buffer.from(await response.arrayBuffer());
const sha = crypto.createHash('sha256').update(bytes).digest('hex');
if (bytes.length !== EXPECTED_BYTES) throw new Error(`Rozmiar v18.1 nie zgadza się: ${bytes.length} != ${EXPECTED_BYTES}`);
if (sha !== EXPECTED_SHA256) throw new Error(`SHA256 v18.1 nie zgadza się: ${sha}`);
if (!bytes.subarray(0, 240).toString('utf8').toLowerCase().includes('<!doctype html')) throw new Error('Pobrany plik nie wygląda jak Dorszolandia v18.1 Full Web Premium.');
fs.writeFileSync('dist/index.html', bytes);
console.log(`Dorszolandia v18.1 Full Web Premium · Dorsze Drive: ${bytes.length} bytes, SHA256 ${sha}`);
