import fs from 'node:fs';
import crypto from 'node:crypto';

const FILE_ID = '16-fA32CsnFx4ztWAsm9HlwoCh7vHQDHa';
const DRIVE_URL = `https://drive.google.com/uc?export=download&id=${FILE_ID}`;
const EXPECTED_SHA256 = '39073ee7c97dcee8a4f60947746b259ece4b4534a2b6545a3f066408820b661d';
const EXPECTED_BYTES = 9271284;

fs.mkdirSync('dist', { recursive: true });

const response = await fetch(DRIVE_URL, { redirect: 'follow' });
if (!response.ok) {
  throw new Error(`Google Drive download failed: ${response.status} ${response.statusText}`);
}

const bytes = Buffer.from(await response.arrayBuffer());
const sha = crypto.createHash('sha256').update(bytes).digest('hex');

if (bytes.length !== EXPECTED_BYTES) {
  throw new Error(`Rozmiar pliku z Google Drive nie zgadza się: ${bytes.length} != ${EXPECTED_BYTES}`);
}
if (sha !== EXPECTED_SHA256) {
  throw new Error(`SHA256 pliku z Google Drive nie zgadza się: ${sha}`);
}
if (!bytes.subarray(0, 200).toString('utf8').toLowerCase().includes('<!doctype html')) {
  throw new Error('Pobrany plik nie wygląda jak właściwy standalone HTML Dorszolandii.');
}

fs.writeFileSync('dist/index.html', bytes);
console.log(`Dorszolandia v16.1 z Google Drive: ${bytes.length} bytes, SHA256 ${sha}`);
