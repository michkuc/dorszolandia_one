import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const BUILD_VERSION = 'v24-premium-visual-redesign-production';
const FILE_ID = '1RiXybg-8NtLTiq5oyAsVrK8fujzHT62Q';
const DRIVE_URL = `https://drive.google.com/uc?export=download&id=${FILE_ID}`;
const EXPECTED_SHA256 = 'bddae2d630e4d925280101351c3f48daa53c01491feb0332647d62c80e2fbba6';
const EXPECTED_BYTES = 12033238;

const response = await fetch(DRIVE_URL, { redirect: 'follow' });
if (!response.ok) throw new Error(`Google Drive download failed: ${response.status} ${response.statusText}`);
const packed = Buffer.from(await response.arrayBuffer());
const sha = crypto.createHash('sha256').update(packed).digest('hex');
if (packed.length !== EXPECTED_BYTES) throw new Error(`Rozmiar v24 nie zgadza się: ${packed.length} != ${EXPECTED_BYTES}`);
if (sha !== EXPECTED_SHA256) throw new Error(`SHA256 v24 nie zgadza się: ${sha}`);

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
    if (normalized === '.') { offset += Math.ceil(size / 512) * 512; continue; }
    throw new Error(`Niebezpieczna ścieżka TAR: ${rawName}`);
  }
  const target = path.join('dist', ...normalized.split('/'));
  if (type === '5') fs.mkdirSync(target, { recursive: true });
  else if (type === '0' || type === '\0') {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, tar.subarray(offset, offset + size));
    files++;
  }
  offset += Math.ceil(size / 512) * 512;
}

const requiredPages = ['index.html','mapa.html','mieszkancy.html','dorszopedia.html','przygody.html','gry.html','kreator.html','materialy.html','sklep.html','piosenka.html','kontakt.html'];
for (const page of requiredPages) if (!fs.existsSync(path.join('dist', page))) throw new Error(`Brak podstrony ${page}`);
const html = fs.readFileSync('dist/index.html', 'utf8');
if (!html.includes('v24 premium visual redesign')) throw new Error('index.html nie ma markera v24 premium visual redesign.');
const premiumAssets = ['hero-home.webp','hero-world.webp','hero-bohaterowie.webp','hero-opowiesci.webp','hero-dorszopedia.webp','hero-gry.webp','hero-kreator.webp','hero-sklep.webp'];
for (const asset of premiumAssets) if (!fs.existsSync(path.join('dist','assets','premium',asset))) throw new Error(`Brak premium asset ${asset}`);
fs.writeFileSync('dist/vercel-build.txt', [
  `Dorszolandia ${BUILD_VERSION}`,
  `Drive package ${FILE_ID}`,
  `Package bytes ${packed.length}`,
  `Package SHA256 ${sha}`,
  `Extracted files ${files}`,
  `Architecture multipage`,
  `Premium artwork integrated into home and subpages`,
  `Built ${new Date().toISOString()}`,
  ''
].join('\n'));
console.log(`Dorszolandia ${BUILD_VERSION}: ${files} plików · ${packed.length} B · ${sha}`);
