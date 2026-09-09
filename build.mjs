import fs from 'node:fs';
import crypto from 'node:crypto';

const BUILD_VERSION = 'v18.2';
const SOURCE_VERSION = 'v18.1';
const FILE_ID = '1CCPcSbiZXiL4Z0Yb6_pLYvC1DLtHiZST';
const DRIVE_URL = `https://drive.google.com/uc?export=download&id=${FILE_ID}`;
const EXPECTED_SHA256 = '787bb0e031e5e805e85e33ed95b0198afb0290a26c54ffcd70f2cd97ffa48878';
const EXPECTED_BYTES = 6134296;

fs.mkdirSync('dist', { recursive: true });
const response = await fetch(DRIVE_URL, { redirect: 'follow' });
if (!response.ok) throw new Error(`Google Drive download failed: ${response.status} ${response.statusText}`);
const bytes = Buffer.from(await response.arrayBuffer());
const sha = crypto.createHash('sha256').update(bytes).digest('hex');
if (bytes.length !== EXPECTED_BYTES) throw new Error(`Rozmiar ${SOURCE_VERSION} nie zgadza się: ${bytes.length} != ${EXPECTED_BYTES}`);
if (sha !== EXPECTED_SHA256) throw new Error(`SHA256 ${SOURCE_VERSION} nie zgadza się: ${sha}`);
if (!bytes.subarray(0, 240).toString('utf8').toLowerCase().includes('<!doctype html')) throw new Error(`Pobrany plik nie wygląda jak Dorszolandia ${SOURCE_VERSION} Full Web Premium.`);

let html = bytes.toString('utf8');

// v18.2: korekty produkcyjne bez zmiany źródłowego pliku Drive.
html = html.replaceAll('Dorsuś', 'Dorszuś');

const buildMeta = `\n<meta name="dorszolandia-build" content="${BUILD_VERSION}">\n<meta name="dorszolandia-source" content="${SOURCE_VERSION}">\n`;
if (!html.includes('name="dorszolandia-build"')) {
  html = html.replace('</head>', `${buildMeta}</head>`);
}

// Ostatnia warstwa bezpieczeństwa dla grafik osadzonych w dorszAssetStore.
// Naprawia brakujące src po dynamicznym dodaniu elementów i zabezpiecza Kreator.
const assetGuard = `\n<script id="dorsz-v182-asset-guard">\n(()=>{\n  document.documentElement.dataset.dorszBuild='${BUILD_VERSION}';\n  let assets={};\n  try{\n    const store=document.getElementById('dorszAssetStore');\n    if(store) assets=JSON.parse(store.textContent||'{}');\n  }catch(e){ assets={}; }\n\n  const hydrate=()=>{\n    document.querySelectorAll('[data-src-key]').forEach(el=>{\n      const key=el.dataset.srcKey;\n      const src=assets[key];\n      if(!src) return;\n      if(!el.getAttribute('src')) el.setAttribute('src',src);\n      if(el.tagName==='IMG'){\n        el.decoding='async';\n        if(!el.closest('.hero,.premium-duo')) el.loading='lazy';\n        if(!el.dataset.assetGuard){\n          el.dataset.assetGuard='1';\n          el.addEventListener('error',()=>{\n            if(el.getAttribute('src')!==src) el.setAttribute('src',src);\n          },{passive:true});\n        }\n      }\n    });\n  };\n\n  hydrate();\n  if(document.body){\n    const observer=new MutationObserver(()=>hydrate());\n    observer.observe(document.body,{childList:true,subtree:true});\n  }\n})();\n</script>\n`;
if (!html.includes('id="dorsz-v182-asset-guard"')) {
  html = html.replace('</body>', `${assetGuard}</body>`);
}

fs.writeFileSync('dist/index.html', html);
fs.writeFileSync('dist/version.txt', [
  `Dorszolandia ${BUILD_VERSION}`,
  `Source ${SOURCE_VERSION}`,
  `Source Drive file ${FILE_ID}`,
  `Source bytes ${bytes.length}`,
  `Source SHA256 ${sha}`,
  `Built ${new Date().toISOString()}`,
  ''
].join('\n'));

console.log(`Dorszolandia ${BUILD_VERSION} · source ${SOURCE_VERSION} · ${bytes.length} bytes · SHA256 ${sha}`);
