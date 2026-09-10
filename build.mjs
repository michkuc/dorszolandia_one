import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const BUILD_VERSION = 'v24.12-story-worlds-final';
const FILE_ID = '1CTdWZR59dlHuG0ETPSAbquzG9MCJTDvH';
const DRIVE_URL = `https://drive.google.com/uc?export=download&id=${FILE_ID}`;
const EXPECTED_SHA256 = '881143eea25cecc4649846494e29feb35cf7528bd359c1797b374104dc28fa26';
const EXPECTED_BYTES = 26488061;

let packed;
const localPackage = process.env.DORSZ_LOCAL_PACKAGE;
if (localPackage) {
  packed = fs.readFileSync(localPackage);
} else {
  const response = await fetch(DRIVE_URL, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Google Drive download failed: ${response.status} ${response.statusText}`);
  packed = Buffer.from(await response.arrayBuffer());
}

const sha = crypto.createHash('sha256').update(packed).digest('hex');
if (packed.length !== EXPECTED_BYTES) throw new Error(`Rozmiar v24.12 nie zgadza się: ${packed.length} != ${EXPECTED_BYTES}`);
if (sha !== EXPECTED_SHA256) throw new Error(`SHA256 v24.12 nie zgadza się: ${sha}`);

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

const requiredPages = [
  'index.html','mapa.html','mieszkancy.html','dorszopedia.html','przygody.html',
  'gry.html','kreator.html','materialy.html','sklep.html','piosenka.html','kontakt.html'
];
for (const page of requiredPages) {
  const full = path.join('dist', page);
  if (!fs.existsSync(full)) throw new Error(`Brak podstrony ${page}`);
  const html = fs.readFileSync(full, 'utf8');
  if (!html.includes('href="/piosenka"')) throw new Error(`Brak zakładki Piosenki w ${page}`);
}

const appJs = fs.readFileSync('dist/js/app.js', 'utf8');

const creatorHtml = fs.readFileSync('dist/kreator.html', 'utf8');
for (const marker of ['Rekwizyty (51)','id="fishName"','id="fishNameplate"','id="flipSelected"','id="flipFish"','id="flipAll"']) {
  if (!creatorHtml.includes(marker)) throw new Error(`Kreator v24.12: brak ${marker}`);
}
if (/data-name="Gitara"/.test(creatorHtml)) throw new Error('Kreator nadal zawiera aktywną Gitarę.');

const residentsHtml = fs.readFileSync('dist/mieszkancy.html', 'utf8');
const residentsData = fs.readFileSync('dist/data/mieszkancy-data.js', 'utf8');
if ((residentsHtml.match(/class="filter atlas-filter/g) || []).length !== 8) throw new Error('Mieszkańcy: liczba filtrów != 8.');
if (!residentsData.includes('"name":"Tata Dorsz"')) throw new Error('Mieszkańcy: brak Tata Dorsz.');
if (!residentsData.includes('"minimal_card":true') || !residentsData.includes('"all_only":true')) throw new Error('Tata Dorsz nie jest minimal/all-only.');
for (const marker of ['applyAtlasFilter','style.display=show',"setAttribute('aria-pressed'"]) {
  if (!appJs.includes(marker)) throw new Error(`Mieszkańcy: brak filtra ${marker}`);
}
const atlasDir = path.join('dist', 'assets', 'characters', 'atlas59');
if (fs.readdirSync(atlasDir).filter(n => n.endsWith('.webp')).length !== 60) throw new Error('Mieszkańcy: katalog atlas59 nie ma 60 ikon.');

const mapHtml = fs.readFileSync('dist/mapa.html', 'utf8');
if (!mapHtml.includes('id="mapLifeDialog"') || !mapHtml.includes('id="mapLifeStory"')) throw new Error('Mapa: brak galerii lub linku do opowieści.');
if ((mapHtml.match(/class="map-pin"/g) || []).length !== 12) throw new Error('Mapa: liczba punktów != 12.');
if ((mapHtml.match(/data-story-href=/g) || []).length < 12) throw new Error('Mapa: nie wszystkie miejsca mają link do opowieści.');
const mapLife = JSON.parse(fs.readFileSync('dist/data/map-life.json', 'utf8'));
if (mapLife.length !== 12) throw new Error(`Mapa: map-life ma ${mapLife.length} rekordów.`);
for (const place of mapLife) {
  if (!place.slug || !place.image || !fs.existsSync(path.join('dist', place.image))) throw new Error(`Mapa: niepełne miejsce ${place.slug || '?'}`);
}

const stories = JSON.parse(fs.readFileSync('dist/data/stories.json', 'utf8'));
if (stories.length !== 12) throw new Error(`Opowieści v24.12: ${stories.length} zamiast 12.`);
const fullStories = stories.filter(s => s.status === 'full');
const pendingStories = stories.filter(s => s.status === 'placeholder');
if (fullStories.length !== 7 || pendingStories.length !== 5) throw new Error(`Opowieści: pełne ${fullStories.length}, placeholders ${pendingStories.length}.`);
if (new Set(stories.map(s => s.world_slug)).size !== 12) throw new Error('Opowieści: miejsca mapy nie są unikalne 12/12.');
const mapSlugs = new Set(mapLife.map(x => x.slug));
for (const story of stories) {
  if (!story.id || !mapSlugs.has(story.world_slug)) throw new Error(`Opowieść ${story.id || '?'}: brak właściwego miejsca mapy ${story.world_slug || '?'}`);
  if (!story.illustration_path || !fs.existsSync(path.join('dist', story.illustration_path))) throw new Error(`Opowieść ${story.id}: brak grafiki krainy.`);
  if (story.status === 'full' && (!Array.isArray(story.blocks) || !story.blocks.length)) throw new Error(`Opowieść ${story.id}: brak pełnego tekstu.`);
}

const expectedFullTitles = [
  'Zatoka Tajemnic',
  'Las Wodorostów',
  'Królewski Dwór',
  'Borys i Dorszuś i Wielka Afera z Pęcherzykiem',
  'Księżniczka Algorytma i Zbuntowany Pomnik',
  'Algoria Powraca, czyli Influencerzy z Głębin',
  'Operacja Koralowy Kosmos'
];
if (fullStories.map(s => s.title).join('|') !== expectedFullTitles.join('|')) throw new Error('Opowieści: kolejność 7 pełnych historii jest niezgodna.');

const kosmos = fullStories.find(s => s.id === 'operacja-koralowy-kosmos');
const kosmosChapters = kosmos?.blocks.filter(b => b.type === 'chapter' && /^Rozdział\s+[1-5]:/u.test(b.text || '')) || [];
if (kosmosChapters.length !== 5) throw new Error(`Koralowy Kosmos: liczba właściwych rozdziałów ${kosmosChapters.length} zamiast 5.`);

const storyHtml = fs.readFileSync('dist/przygody.html', 'utf8');
for (const marker of ['id="storyCycleMain"','id="storyDialog"','id="storySearch"']) {
  if (!storyHtml.includes(marker)) throw new Error(`Opowieści: brak ${marker}`);
}
if (/56\s+(pełnych\s+)?histor/i.test(storyHtml) || storyHtml.includes('storyCycleAtlas')) throw new Error('Opowieści: pozostał stary cykl 56/Atlas.');
if (fs.existsSync('dist/data/story-cycle-01-borys-dorszus.json') || fs.existsSync('dist/data/story-cycle-02-atlas-legends.json')) throw new Error('Opowieści: pozostały stare pliki cykli.');
for (const marker of ['const SD=window.DORSZ_STORIES','openWorldStory','storyCycleMain','mapLifeStory']) {
  if (!appJs.includes(marker)) throw new Error(`Opowieści/mapa: brak integracji ${marker}`);
}

const qa = JSON.parse(fs.readFileSync('dist/QA_V24_12.json', 'utf8'));
if (qa.story_slots !== 12 || qa.full_stories !== 7 || qa.placeholders !== 5) throw new Error('QA_V24_12 nie potwierdza układu 12 / 7 / 5.');
if (qa.tom_i_full !== 3 || qa.classic_full !== 4) throw new Error('QA_V24_12: Tom I / klasyczne historie nie są 3 / 4.');
if (qa.map_pin_story_links !== 12 || qa.map_location_card_story_links !== 12) throw new Error('QA_V24_12: brak kompletu linków mapa → opowieści.');

const songHtml = fs.readFileSync('dist/piosenka.html', 'utf8');
if (!songHtml.includes('1QgHjP-gKDzkvbIvv-PpvE94QlFRrj_cu/preview')) throw new Error('Brak pełnego teledysku.');
for (const asset of ['piosenka-dorszolandia.m4a','dorszolandia-piosenka-2.mp3','dorszolandia-piosenka-3.mp3']) {
  if (!fs.existsSync(path.join('dist', 'assets', 'media', asset))) throw new Error(`Brak multimedia ${asset}`);
}
const shopHtml = fs.readFileSync('dist/sklep.html', 'utf8');
if (/\d+,\d{2}\s*zł|\d+\s*zł/i.test(shopHtml)) throw new Error('Sklep nie może zawierać cen.');

fs.writeFileSync('dist/vercel-build.txt', [
  `Dorszolandia ${BUILD_VERSION}`,
  `Drive package ${FILE_ID}`,
  `Package bytes ${packed.length}`,
  `Package SHA256 ${sha}`,
  `Extracted files ${files}`,
  `Stories: 12 krain / 12 opowieści`,
  `Stories full 7 / placeholders 5`,
  `Tom I full 3 / classic full 4`,
  `Map -> story deep links 12/12`,
  `Residents: 60 incl. Tata Dorsz`,
  `Creator: 51 props`,
  `Full teledysk + 3 songs retained`,
  `Shop plan only, no prices`,
  `Built ${new Date().toISOString()}`,
  ''
].join('\n'));

console.log(`Dorszolandia ${BUILD_VERSION}: ${files} plików · ${packed.length} B · ${sha} · stories 7/12 full`);
