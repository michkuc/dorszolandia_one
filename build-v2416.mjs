import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const VERSION='v24.16-source-integrity-safe-fix';
const FILE_ID='1k_hXALY-a7fSnRCpcvBLjcxkpBGif560';
const EXPECTED_BYTES=24411836;
const EXPECTED_SHA256='74c9bc5d099e626ae9779bc698456b92b72c53668a7d2aef090025f81583211a';

const SOURCE_HASHES={
  'zatoka-tajemnic':'dce4e116a076e981065df2d4f3521e9441ba62c6a70d6c667d5d69a8fc28142d',
  'las-wodorostow':'5e2fdfbc798a40236fa8c411e7088b37c8a21fc5ab7ca9ab86fce7b4fc503c7b',
  'krolewski-dwor':'ef9897b4e14f5447191ce3bac9941ab0132c49bf5bcfe17852bdc94e98e6803d',
  'afera-z-pecherzykiem':'f27a065916c9c4f74c23fec3045ac0520d3a5a278abfc4a22282dd01ce3a7d7d',
  'ksiezniczka-algorytma':'8f15712b663aed3446a1e7ae561b8f4ad3bb74464c8614f5be3dd5743233bfb4',
  'algoria-powraca':'1b9007a9c725b128507fc6a8256f3f84038beb790cdd265ee45a4880f4f9783f',
  'operacja-koralowy-kosmos':'4f9533b3cc61d0364b7fe39ff3106d7d02fba013890ff9c5b87a52fdc06064e7'
};

let packed;
if(process.env.DORSZ_LOCAL_PACKAGE) packed=fs.readFileSync(process.env.DORSZ_LOCAL_PACKAGE);
else {
  const r=await fetch(`https://drive.google.com/uc?export=download&id=${FILE_ID}`,{redirect:'follow'});
  if(!r.ok) throw new Error(`Drive download failed: ${r.status} ${r.statusText}`);
  packed=Buffer.from(await r.arrayBuffer());
}
if(packed.length!==EXPECTED_BYTES) throw new Error(`Package size mismatch: ${packed.length} != ${EXPECTED_BYTES}`);
const packageSha=crypto.createHash('sha256').update(packed).digest('hex');
if(packageSha!==EXPECTED_SHA256) throw new Error(`Package SHA256 mismatch: ${packageSha}`);

const tar=zlib.gunzipSync(packed);
fs.rmSync('dist',{recursive:true,force:true}); fs.mkdirSync('dist',{recursive:true});
const str=(b,s,l)=>b.subarray(s,s+l).toString('utf8').replace(/\0.*$/s,'');
const oct=(b,s,l)=>{const x=str(b,s,l).trim().replace(/\0/g,'');return x?parseInt(x,8):0};
let off=0,files=0;
while(off+512<=tar.length){
  const h=tar.subarray(off,off+512); if(h.every(x=>x===0)) break;
  const name=str(h,0,100),pre=str(h,345,155),raw=(pre?`${pre}/${name}`:name).replace(/^\.\//,'');
  const size=oct(h,124,12),type=String.fromCharCode(h[156]||48); off+=512;
  const n=path.posix.normalize(raw);
  if(!n||n==='.') {off+=Math.ceil(size/512)*512;continue}
  if(n.startsWith('../')||path.posix.isAbsolute(n)) throw new Error(`Unsafe TAR path: ${raw}`);
  const target=path.join('dist',...n.split('/'));
  if(type==='5') fs.mkdirSync(target,{recursive:true});
  else if(type==='0'||type==='\0'){fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,tar.subarray(off,off+size));files++}
  off+=Math.ceil(size/512)*512;
}

const need=(v,m)=>{if(!v)throw new Error(m)};
const txt=f=>fs.readFileSync(path.join('dist',f),'utf8');
const norm=s=>String(s??'').replace(/\s+/g,' ').trim();
const hash=s=>crypto.createHash('sha256').update(norm(s),'utf8').digest('hex');
const blockText=s=>(s.blocks||[]).map(x=>typeof x==='string'?x:(x?.text||'')).join('\n\n');
const bodyText=s=>Array.isArray(s.body)?s.body.join('\n\n'):String(s.body||'');

const pages=['index.html','mapa.html','mieszkancy.html','dorszopedia.html','przygody.html','gry.html','kreator.html','materialy.html','sklep.html','piosenka.html','kontakt.html'];
for(const p of pages) need(fs.existsSync(path.join('dist',p)),`Missing ${p}`);

const app=txt('js/app.js'); new Function(app);
need(app.includes('blocks.map('),'Story reader must render all blocks');
need(!/blocks\.slice\s*\(/.test(app),'Story reader must not truncate blocks with slice()');

const world=JSON.parse(txt('data/stories.json'));
const classic=JSON.parse(txt('data/classic-stories.json'));
const places=JSON.parse(txt('data/map-life.json'));
need(world.length===12&&world.filter(x=>x.status==='full').length===3&&world.filter(x=>x.status==='placeholder').length===9,'World stories must be 12/3/9');
need(classic.length===4&&classic.every(x=>x.status==='full'),'Classic stories must be 4 full');
need(places.length===12,'Map places must be 12');

const publicWindow={};
new Function('window',txt('data/przygody-data.js'))(publicWindow);
const publicData=publicWindow.DORSZOLANDIA_DATA;
need(publicData&&Array.isArray(publicData.stories)&&Array.isArray(publicData.classicStories),'Public story data missing');

for(const [id,expected] of Object.entries(SOURCE_HASHES)){
  const src=world.find(x=>x.id===id)||classic.find(x=>x.id===id);
  need(src,`Missing full story ${id}`);
  const blocks=blockText(src), body=bodyText(src);
  need(hash(blocks)===expected,`SOURCE INTEGRITY FAIL blocks: ${id}`);
  need(hash(body)===expected,`SOURCE INTEGRITY FAIL body: ${id}`);
  const pub=(publicData.stories||[]).find(x=>x.id===id)||(publicData.classicStories||[]).find(x=>x.id===id);
  need(pub,`Public data missing story ${id}`);
  need(hash(blockText(pub))===expected,`PUBLIC SOURCE INTEGRITY FAIL blocks: ${id}`);
  need(hash(bodyText(pub))===expected,`PUBLIC SOURCE INTEGRITY FAIL body: ${id}`);
}

const bySlug=new Map(world.map(s=>[s.world_slug,s]));
for(const p of places){
  const s=bySlug.get(p.slug);
  need(s,`Map place has no world story: ${p.slug}`);
  need(p.story_id===s.id,`Map story_id mismatch: ${p.slug}`);
  need(p.story_title===s.title,`Map story_title mismatch: ${p.slug}`);
  need(p.story_status===s.status,`Map story_status mismatch: ${p.slug}`);
  need(p.story_href===s.story_href,`Map story_href mismatch: ${p.slug}`);
}

for(const slug of ['zamek-dorszolandii','laboratorium-babel','wieza-czarodzieja','port-muszelka'])
  need(bySlug.get(slug)?.status==='placeholder',`${slug} must remain placeholder`);

const mapHtml=txt('mapa.html');
need((mapHtml.match(/class="map-pin"/g)||[]).length===12,'Map pins != 12');
for(const p of places){
  const re=new RegExp(`<button[^>]*class="map-pin"[^>]*data-life="${p.slug}"[^>]*>`);
  const m=mapHtml.match(re); need(m,`Map HTML pin missing: ${p.slug}`);
  const tag=m[0];
  need(tag.includes(`data-story-id="${p.story_id}"`),`Map HTML id mismatch: ${p.slug}`);
  need(tag.includes(`data-story-status="${p.story_status}"`),`Map HTML status mismatch: ${p.slug}`);
  need(tag.includes(`data-story-href="${p.story_href}"`),`Map HTML href mismatch: ${p.slug}`);
}

const adventures=txt('przygody.html');
need(adventures.includes('id="classicStoryCycle"'),'Classic story section missing');
need(!adventures.includes('7 pełnych historii i 5'),'Stale 7/5 copy remains on adventures page');
need(!txt('index.html').includes('7 pełnych i 5 w przygotowaniu'),'Stale 7/5 copy remains on home page');

const residents=txt('mieszkancy.html');
need(!residents.includes('Postacie z opowiadań'),'Story cast section still visible');
need(residents.indexOf('main-heroes-section')>residents.indexOf('residents-premium-v22'),'Main duo must remain below residents');
need((residents.match(/main-card--hero/g)||[]).length===2,'Main duo cards missing');
need((residents.match(/class="filter atlas-filter/g)||[]).length===8,'Resident filters != 8');
need(fs.readdirSync('dist/assets/characters/atlas59').filter(x=>x.endsWith('.webp')).length===60,'Resident atlas != 60');

const creator=txt('kreator.html');
for(const marker of ['Rekwizyty (51)','id="fishName"','id="flipSelected"','id="flipFish"','id="flipAll"']) need(creator.includes(marker),`Creator regression: ${marker}`);

const song=txt('piosenka.html');
for(const a of ['piosenka-dorszolandia.m4a','dorszolandia-piosenka-2.mp3','dorszolandia-piosenka-3.mp3'])
  need(fs.existsSync(path.join('dist/assets/media',a)),`Song media missing: ${a}`);
need(!/\d+,\d{2}\s*zł|\d+\s*zł/i.test(txt('sklep.html')),'Shop must not contain prices');

const qa=JSON.parse(txt('QA_V24_16.json'));
need(qa.full_text_integrity_locked===7&&qa.world_full===3&&qa.world_placeholder===9&&qa.classic_full===4,'QA v24.16 metadata invalid');

fs.writeFileSync('dist/vercel-build.txt',[
  `Dorszolandia ${VERSION}`,
  `Drive package ${FILE_ID}`,
  `Package bytes ${packed.length}`,
  `Package SHA256 ${packageSha}`,
  `Extracted files ${files}`,
  'Source integrity: 7/7 published full stories PASS',
  'World stories: 12 total / 3 full / 9 planned',
  'Classic stories: 4 full, separate from map worlds',
  'Map data: all story fields synchronized',
  'Residents: 60; Dorszus + Borys below residents; story-cast public section removed',
  'Creator: 51 props',
  'Shop: plan only, no prices',
  `Built ${new Date().toISOString()}`,
  ''
].join('\n'));
console.log(`Dorszolandia ${VERSION}: ${files} files; source integrity 7/7 PASS`);
