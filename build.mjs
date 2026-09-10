import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const BUILD_VERSION = 'v24.10-map-life-production';
const FILE_ID = '1CTdWZR59dlHuG0ETPSAbquzG9MCJTDvH';
const DRIVE_URL = `https://drive.google.com/uc?export=download&id=${FILE_ID}`;
const EXPECTED_SHA256 = '8fc202931aea9d799b132337169a6137c0084fd49849868abbca96c6391663e9';
const EXPECTED_BYTES = 24668589;

const response = await fetch(DRIVE_URL, { redirect: 'follow' });
if (!response.ok) throw new Error(`Google Drive download failed: ${response.status} ${response.statusText}`);
const packed = Buffer.from(await response.arrayBuffer());
const sha = crypto.createHash('sha256').update(packed).digest('hex');
if (packed.length !== EXPECTED_BYTES) throw new Error(`Rozmiar v24.10 nie zgadza się: ${packed.length} != ${EXPECTED_BYTES}`);
if (sha !== EXPECTED_SHA256) throw new Error(`SHA256 v24.10 nie zgadza się: ${sha}`);

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
for (const page of requiredPages) {
  const full = path.join('dist', page);
  if (!fs.existsSync(full)) throw new Error(`Brak podstrony ${page}`);
  const html = fs.readFileSync(full, 'utf8');
  if (!html.includes('href="/piosenka"')) throw new Error(`Brak zakładki Piosenki w ${page}`);
  if (/neptunopol/i.test(html)) throw new Error(`Publiczny UI zawiera Neptunopol: ${page}`);
}

const creatorHtml = fs.readFileSync('dist/kreator.html', 'utf8');
for (const marker of ['Rekwizyty (51)','id="fishName"','id="fishNameplate"','id="flipSelected"','id="flipFish"','id="flipAll"']) {
  if (!creatorHtml.includes(marker)) throw new Error(`Kreator v24.10: brak ${marker}`);
}
if (/data-name="Gitara"/.test(creatorHtml)) throw new Error('Kreator v24.10 nadal zawiera aktywną Gitarę.');
const newProps = ['drive-skrzynia-skarbow.webp','drive-czapka-pilota.webp','drive-czapka-kapitana.webp','drive-beben.webp','drive-kapelusz-pirata.webp','drive-kask-strazacki.webp','drive-czapka-detektywa.webp','drive-luneta.webp','drive-mapa-skarbow.webp'];
for (const asset of newProps) {
  if (!fs.existsSync(path.join('dist','assets','creator','props',asset))) throw new Error(`Brak rekwizytu HQ ${asset}`);
}
if (!fs.existsSync(path.join('dist','QA_V24_9.json'))) throw new Error('Brak QA_V24_9.json');

const atlasDir = path.join('dist','assets','characters','atlas59');
if (fs.readdirSync(atlasDir).filter(n => n.endsWith('.webp')).length !== 59) throw new Error('Atlas nie ma 59 ikon.');
const songHtml = fs.readFileSync('dist/piosenka.html','utf8');
if (!songHtml.includes('1QgHjP-gKDzkvbIvv-PpvE94QlFRrj_cu/preview')) throw new Error('Brak pełnego teledysku.');
for (const asset of ['piosenka-dorszolandia.m4a','dorszolandia-piosenka-2.mp3','dorszolandia-piosenka-3.mp3']) {
  if (!fs.existsSync(path.join('dist','assets','media',asset))) throw new Error(`Brak multimedia ${asset}`);
}
const shopHtml = fs.readFileSync('dist/sklep.html','utf8');
if (/\d+,\d{2}\s*zł|\d+\s*zł/i.test(shopHtml)) throw new Error('Sklep nie może zawierać cen.');

const mapHtml = fs.readFileSync('dist/mapa.html','utf8');
if (!mapHtml.includes('id="mapLifeDialog"')) throw new Error('Mapa v24.10: brak galerii życia Dorszy.');
if ((mapHtml.match(/class="map-pin"/g) || []).length !== 12) throw new Error('Mapa v24.10: liczba punktów mapy != 12.');
if (!fs.existsSync(path.join('dist','data','map-life.json'))) throw new Error('Mapa v24.10: brak data/map-life.json.');
const mapLife = JSON.parse(fs.readFileSync(path.join('dist','data','map-life.json'),'utf8'));
if (mapLife.length !== 12) throw new Error(`Mapa v24.10: map-life ma ${mapLife.length} rekordów zamiast 12.`);
for (const place of mapLife) {
  if (!place.name || !place.image) throw new Error('Mapa v24.10: niepełny rekord miejsca.');
  const full = path.join('dist', place.image);
  if (!fs.existsSync(full)) throw new Error(`Mapa v24.10: brak grafiki ${place.image}`);
}
if (!fs.existsSync(path.join('dist','QA_V24_10.json'))) throw new Error('Brak QA_V24_10.json');

fs.writeFileSync('dist/vercel-build.txt', [
  `Dorszolandia ${BUILD_VERSION}`,
  `Drive package ${FILE_ID}`,
  `Package bytes ${packed.length}`,
  `Package SHA256 ${sha}`,
  `Extracted files ${files}`,
  `Map 12/12 places -> 12 life-scene graphics`,
  `Map premium modal + previous/next + mobile/keyboard`,
  `Creator 51 props / 31 Drive-HQ`,
  `9 newly added HQ props from Drive`,
  `Gitara removed; active duplicate names/paths = 0`,
  `Creator naming + mirror selected/fish/all retained`,
  `59 Atlas icons normalized`,
  `Full teledysk + 3 songs + premium covers`,
  `Shop plan only, no prices`,
  `Public UI naming Dorszolandia only`,
  `Built ${new Date().toISOString()}`,
  ''
].join('\n'));
console.log(`Dorszolandia ${BUILD_VERSION}: ${files} plików · ${packed.length} B · ${sha}`);
