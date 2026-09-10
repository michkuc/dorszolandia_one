import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const BUILD_VERSION = 'v24.6-premium-atlas-icons-production';
const FILE_ID = '1RiXybg-8NtLTiq5oyAsVrK8fujzHT62Q';
const DRIVE_URL = `https://drive.google.com/uc?export=download&id=${FILE_ID}`;
const EXPECTED_SHA256 = '7ac5615b251211997225977026dc038b30f994d84788a3e24b9ff2d291531600';
const EXPECTED_BYTES = 21462403;

const response = await fetch(DRIVE_URL, { redirect: 'follow' });
if (!response.ok) throw new Error(`Google Drive download failed: ${response.status} ${response.statusText}`);
const packed = Buffer.from(await response.arrayBuffer());
const sha = crypto.createHash('sha256').update(packed).digest('hex');
if (packed.length !== EXPECTED_BYTES) throw new Error(`Rozmiar v24.6 nie zgadza się: ${packed.length} != ${EXPECTED_BYTES}`);
if (sha !== EXPECTED_SHA256) throw new Error(`SHA256 v24.6 nie zgadza się: ${sha}`);

const tar = zlib.gunzipSync(packed);
fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist', { recursive: true });

const readString = (buf, start, len) => buf.subarray(start, start + len).toString('utf8').replace(/\0.*$/s, '');
const readOctal = (buf, start, len) => {
  const s = readString(buf, start, len).trim().replace(/\0/g, '');
  return s ? parseInt(s, 8) : 0;
};

let offset = 0;
let files = 0;
while (offset + 512 <= tar.length) {
  const header = tar.subarray(offset, offset + 512);
  if (header.every(b => b === 0)) break;
  const name = readString(header, 0, 100);
  const prefix = readString(header, 345, 155);
  const rawName = (prefix ? `${prefix}/${name}` : name).replace(/^\.\//, '');
  const size = readOctal(header, 124, 12);
  const type = String.fromCharCode(header[156] || 48);
  offset += 512;

  const normalized = path.posix.normalize(rawName);
  if (!normalized || normalized === '.' || normalized.startsWith('../') || path.posix.isAbsolute(normalized)) {
    if (normalized === '.') {
      offset += Math.ceil(size / 512) * 512;
      continue;
    }
    throw new Error(`Niebezpieczna ścieżka TAR: ${rawName}`);
  }

  const target = path.join('dist', ...normalized.split('/'));
  if (type === '5') {
    fs.mkdirSync(target, { recursive: true });
  } else if (type === '0' || type === '\0') {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, tar.subarray(offset, offset + size));
    files++;
  }
  offset += Math.ceil(size / 512) * 512;
}

const requiredPages = ['index.html','mapa.html','mieszkancy.html','dorszopedia.html','przygody.html','gry.html','kreator.html','materialy.html','sklep.html','piosenka.html','kontakt.html'];
for (const page of requiredPages) {
  if (!fs.existsSync(path.join('dist', page))) throw new Error(`Brak podstrony ${page}`);
}

for (const page of requiredPages) {
  const pageHtml = fs.readFileSync(path.join('dist', page), 'utf8');
  if (!pageHtml.includes('href="/piosenka"')) throw new Error(`Brak zakładki Piosenki w ${page}`);
  if (/neptunopol/i.test(pageHtml)) throw new Error(`Publiczny UI zawiera Neptunopol: ${page}`);
}

const piosenkaHtml = fs.readFileSync('dist/piosenka.html', 'utf8');
if (!piosenkaHtml.includes('1QgHjP-gKDzkvbIvv-PpvE94QlFRrj_cu/preview')) throw new Error('Brak pełnego teledysku Google Drive.');
for (const asset of ['piosenka-dorszolandia.m4a','dorszolandia-piosenka-2.mp3','dorszolandia-piosenka-3.mp3']) {
  if (!fs.existsSync(path.join('dist','assets','media',asset))) throw new Error(`Brak multimedia ${asset}`);
}
for (const asset of ['piosenka-1.webp','piosenka-2.webp','piosenka-3.webp']) {
  if (!fs.existsSync(path.join('dist','assets','media','covers',asset))) throw new Error(`Brak okładki ${asset}`);
}

const atlasDir = path.join('dist','assets','characters','atlas59');
const atlasFiles = fs.readdirSync(atlasDir).filter(name => name.endsWith('.webp'));
if (atlasFiles.length !== 59) throw new Error(`Atlas powinien mieć 59 ikon, ma ${atlasFiles.length}`);
if (!fs.existsSync(path.join('dist','QA_V24_6.json'))) throw new Error('Brak QA_V24_6.json');

const shopHtml = fs.readFileSync('dist/sklep.html', 'utf8');
if (/\d+,\d{2}\s*zł|\d+\s*zł/i.test(shopHtml)) throw new Error('Sklep nie może zawierać cen.');

fs.writeFileSync('dist/vercel-build.txt', [
  `Dorszolandia ${BUILD_VERSION}`,
  `Drive package ${FILE_ID}`,
  `Package bytes ${packed.length}`,
  `Package SHA256 ${sha}`,
  `Extracted files ${files}`,
  `Architecture multipage`,
  `59 Atlas icons normalized`,
  `Atlas icon canvas 384x384 with equalized visible scale`,
  `Top navigation includes Piosenki`,
  `Full teledysk + 3 songs + 3 premium covers`,
  `Shop plan only, no prices`,
  `Public UI naming Dorszolandia only`,
  `Built ${new Date().toISOString()}`,
  ''
].join('\n'));

console.log(`Dorszolandia ${BUILD_VERSION}: ${files} plików · ${packed.length} B · ${sha}`);
