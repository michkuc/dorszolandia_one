import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const VERSION='v24.18-classic-four-safe-ui-fix';
const FILE_ID='1s-_sDKmNEwewloFQgfAOp93r2g2Zlg1t';
const EXPECTED_BYTES=24411808;
const EXPECTED_SHA256='5303fd9f37120574089d8f1d013543a7cc0d5e67ad320f928119d5db013eb73c';
const CLASSIC_IDS=['afera-z-pecherzykiem','ksiezniczka-algorytma','algoria-powraca','operacja-koralowy-kosmos'];
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
const oct=(b,s,l)=>parseInt(str(b,s,l).trim().replace(/\0/g,'')||'0',8);
let off=0,files=0;
while(off+512<=tar.length){
  const h=tar.subarray(off,off+512); if(h.every(x=>x===0)) break;
  const name=str(h,0,100),pre=str(h,345,155),raw=(pre?`${pre}/${name}`:name).replace(/^\.\//,'');
  const size=oct(h,124,12),type=String.fromCharCode(h[156]||48); off+=512;
  const n=path.posix.normalize(raw); if(!n||n==='.') {off+=Math.ceil(size/512)*512;continue}
  if(n.startsWith('../')||path.posix.isAbsolute(n)) throw new Error(`Unsafe TAR path: ${raw}`);
  const dest=path.join('dist',...n.split('/'));
  if(type==='5') fs.mkdirSync(dest,{recursive:true});
  else if(type==='0'||type==='\0') {fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,tar.subarray(off,off+size));files++;}
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
need(app.includes('blocks.map(')&&!/blocks\.slice\s*\(/.test(app),'Story reader truncation risk');

const world=JSON.parse(txt('data/stories.json'));
const classic=JSON.parse(txt('data/classic-stories.json'));
need(world.length===12&&world.filter(x=>x.status==='full').length===3&&world.filter(x=>x.status==='placeholder').length===9,'World stories must remain 12/3/9');
need(classic.length===4,'Classic stories must be exactly 4');
need(JSON.stringify(classic.map(x=>x.id))===JSON.stringify(CLASSIC_IDS),'Unexpected classic story list/order');
need(classic.every(x=>x.status==='full'),'All 4 classic stories must be full');
for(const s of classic){
  need(Array.isArray(s.blocks)&&s.blocks.length>0,`Missing blocks: ${s.id}`);
  need(s.body&&s.body.length>0,`Missing body: ${s.id}`);
  need(fs.existsSync(path.join('dist',s.poster_path)),`Missing classic poster: ${s.id}`);
}

const w={}; new Function('window',txt('data/przygody-data.js'))(w); const pub=w.DORSZOLANDIA_DATA;
need(pub&&Array.isArray(pub.classicStories)&&pub.classicStories.length===4,'Public classic story count must be 4');
need(JSON.stringify(pub.classicStories.map(x=>x.id))===JSON.stringify(CLASSIC_IDS),'Public classic story list/order mismatch');
for(const [id,expected] of Object.entries(SOURCE_HASHES)){
  const src=world.find(x=>x.id===id)||classic.find(x=>x.id===id); need(src,`Missing story ${id}`);
  need(hash(blockText(src))===expected&&hash(bodyText(src))===expected,`SOURCE INTEGRITY FAIL: ${id}`);
  const ps=(pub.stories||[]).find(x=>x.id===id)||(pub.classicStories||[]).find(x=>x.id===id); need(ps,`Public story missing: ${id}`);
  need(hash(blockText(ps))===expected&&hash(bodyText(ps))===expected,`PUBLIC SOURCE INTEGRITY FAIL: ${id}`);
}

const adventures=txt('przygody.html');
need(adventures.includes('id="classicStoryCycle"'),'Classic story container missing');
need(adventures.includes('Cztery pełne klasyczne historie'),'Classic section copy missing');
const css=txt('css/v24-premium.css');
need(css.includes('#klasyczne-przygody .classic-story-card:first-child'),'Scoped classic first-card fix missing');
need(css.includes('grid-column:auto !important'),'Classic first-card must not span columns');
need(css.includes('content:none !important'),'Legacy recommended badge must be disabled for classic first card');

const residents=txt('mieszkancy.html');
need(!residents.includes('Postacie z opowiadań')&&residents.indexOf('main-heroes-section')>residents.indexOf('residents-premium-v22'),'Residents regression');
need(fs.readdirSync('dist/assets/characters/atlas59').filter(x=>x.endsWith('.webp')).length===60,'Resident atlas != 60');
need(txt('kreator.html').includes('Rekwizyty (51)'),'Creator regression');
for(const a of ['piosenka-dorszolandia.m4a','dorszolandia-piosenka-2.mp3','dorszolandia-piosenka-3.mp3']) need(fs.existsSync(path.join('dist/assets/media',a)),`Missing media ${a}`);
need(!/\d+,\d{2}\s*zł|\d+\s*zł/i.test(txt('sklep.html')),'Shop prices regression');
const vercel=JSON.parse(txt('vercel.json'));
need(vercel.headers?.some(h=>h.source==='/(.*)'&&h.headers?.some(x=>x.key==='Cache-Control'&&x.value==='public, max-age=0, must-revalidate')),'Cache coherence policy missing');
const qa=JSON.parse(txt('QA_V24_18.json'));
need(qa.classic_full===4&&qa.classic_text_changed===false&&qa.classic_covers_changed===false,'QA v24.18 metadata invalid');

fs.writeFileSync('dist/vercel-build.txt',[
  `Dorszolandia ${VERSION}`,
  `Drive package ${FILE_ID}`,
  `Package bytes ${packed.length}`,
  `Package SHA256 ${packageSha}`,
  `Extracted files ${files}`,
  'Classic stories: exactly 4 full stories PASS',
  'Classic source integrity: 4/4 unchanged PASS',
  'Classic covers: 4 existing posters PASS',
  'Classic first-card layout: scoped equal-card fix PASS',
  'Other site areas: regression checks PASS',
  `Built ${new Date().toISOString()}`,
  ''
].join('\n'));
console.log(`Dorszolandia ${VERSION}: ${files} files; classic 4/4 full PASS; source integrity PASS; scoped UI fix PASS`);
