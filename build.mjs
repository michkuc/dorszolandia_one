import fs from 'node:fs';
import crypto from 'node:crypto';

const FILE_ID = '1c-ACdpqDCUladTyRfKeeCLvopyYtx5LL';
const DRIVE_URL = `https://drive.google.com/uc?export=download&id=${FILE_ID}`;
const EXPECTED_SHA256 = '23829b172f7a98aa7b8033a9d8cf340f693db703208a873a8638906aa2bdc562';
const EXPECTED_BYTES = 5906565;

fs.mkdirSync('dist', { recursive: true });
const response = await fetch(DRIVE_URL, { redirect: 'follow' });
if (!response.ok) throw new Error(`Google Drive download failed: ${response.status} ${response.statusText}`);
const bytes = Buffer.from(await response.arrayBuffer());
const sha = crypto.createHash('sha256').update(bytes).digest('hex');
if (bytes.length !== EXPECTED_BYTES) throw new Error(`Rozmiar v18 nie zgadza się: ${bytes.length} != ${EXPECTED_BYTES}`);
if (sha !== EXPECTED_SHA256) throw new Error(`SHA256 v18 nie zgadza się: ${sha}`);
if (!bytes.subarray(0, 240).toString('utf8').toLowerCase().includes('<!doctype html')) throw new Error('Pobrany plik nie wygląda jak Dorszolandia v18 Full Web Premium.');
fs.writeFileSync('dist/index.html', bytes);
console.log(`Dorszolandia v18 Full Web Premium: ${bytes.length} bytes, SHA256 ${sha}`);
