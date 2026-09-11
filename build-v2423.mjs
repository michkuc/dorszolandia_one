import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const VERSION='v24.23-map-card-consistency-safe-fix';
const FILE_ID='1bG6MsrH-Xb301Myf4aBBTTZCus6Mallg';
const EXPECTED_BYTES=25025884;
const EXPECTED_SHA256='90d1acce2a11f5efd1467b185bdc14d48772a5f078016abf9c062916241187b9';
const SOURCE_HASHES={
'zatoka-tajemnic':'dce4e116a076e981065df2d4f3521e9441ba62c6a70d6c667d5d69a8fc28142d',
'las-wodorostow':'5e2fdfbc798a40236fa8c411e7088b37c8a21fc5ab7ca9ab86fce7b4fc503c7b',
'krolewski-dwor':'ef9897b4e14f5447191ce3bac9941ab0132c49bf5bcfe17852bdc94e98e6803d',
'afera-z-pecherzykiem':'f27a065916c9c4f74c23fec3045ac0520d3a5a278abfc4a22282dd01ce3a7d7d',
'ksiezniczka-algorytma':'8f15712b663aed3446a1e7ae561b8f4ad3bb74464c8614f5be3dd5743233bfb4',
'algoria-powraca':'1b9007a9c725b128507fc6a8256f3f84038beb790cdd265ee45a4880f4f9783f',
'operacja-koralowy-kosmos':'4f9533b3cc61d0364b7fe39ff3106d7d02fba013890ff9c5b87a52fdc06064e7'};

let packed;
if(process.env.DORSZ_LOCAL_PACKAGE) packed=fs.readFileSync(process.env.DORSZ_LOCAL_PACKAGE);
else {const r=await fetch(`https://drive.google.com/uc?export=download&id=${FILE_ID}`,{redirect:'follow'});if(!r.ok)throw new Error(`Drive download failed: ${r.status}`);packed=Buffer.from(await r.arrayBuffer());}
if(packed.length!==EXPECTED_BYTES) throw new Error(`Package size mismatch: ${packed.length} != ${EXPECTED_BYTES}`);
const sha=crypto.createHash('sha256').update(packed).digest('hex');
if(sha!==EXPECTED_SHA256) throw new Error(`Package SHA mismatch: ${sha}`);

const tar=zlib.gunzipSync(packed);fs.rmSync('dist',{recursive:true,force:true});fs.mkdirSync('dist',{recursive:true});
const str=(b,s,l)=>b.subarray(s,s+l).toString('utf8').replace(/\0.*$/s,'');
const oct=(b,s,l)=>parseInt(str(b,s,l).trim().replace(/\0/g,'')||'0',8);
let off=0,files=0;
while(off+512<=tar.length){const h=tar.subarray(off,off+512);if(h.every(x=>x===0))break;const name=str(h,0,100),pre=str(h,345,155),raw=(pre?`${pre}/${name}`:name).replace(/^\.\//,'');const size=oct(h,124,12),type=String.fromCharCode(h[156]||48);off+=512;const n=path.posix.normalize(raw);if(!n||n==='.') {off+=Math.ceil(size/512)*512;continue}if(n.startsWith('../')||path.posix.isAbsolute(n))throw new Error(`Unsafe path ${raw}`);const d=path.join('dist',...n.split('/'));if(type==='5')fs.mkdirSync(d,{recursive:true});else if(type==='0'||type==='\0'){fs.mkdirSync(path.dirname(d),{recursive:true});fs.writeFileSync(d,tar.subarray(off,off+size));files++;}off+=Math.ceil(size/512)*512;}
const need=(v,m)=>{if(!v)throw new Error(m)},txt=f=>fs.readFileSync(path.join('dist',f),'utf8');
const norm=s=>String(s??'').replace(/\s+/g,' ').trim(),hash=s=>crypto.createHash('sha256').update(norm(s),'utf8').digest('hex');
const blocks=s=>(s.blocks||[]).map(x=>typeof x==='string'?x:(x?.text||'')).join('\n\n');
const body=s=>Array.isArray(s.body)?s.body.join('\n\n'):String(s.body||'');
const pages=['index.html','mapa.html','mieszkancy.html','dorszopedia.html','przygody.html','gry.html','kreator.html','materialy.html','sklep.html','piosenka.html','kontakt.html'];
for(const p of pages){need(fs.existsSync(path.join('dist',p)),`Missing ${p}`);need(txt(p).includes('href="/materialy"'),`Materialy nav missing ${p}`);}
for(const f of fs.readdirSync('dist',{recursive:true})) if(/plan[- ]lekcji/i.test(String(f))) throw new Error(`Private lesson plan file remains: ${f}`);
for(const p of pages) need(!/plan[- ]lekcji/i.test(txt(p)),`Private lesson plan reference in ${p}`);

const world=JSON.parse(txt('data/stories.json')),classic=JSON.parse(txt('data/classic-stories.json')),places=JSON.parse(txt('data/map-life.json'));
need(world.length===12&&world.filter(x=>x.status==='full').length===3&&world.filter(x=>x.status==='placeholder').length===9,'World stories regression');
need(classic.length===4&&classic.every(x=>x.status==='full'),'Classic stories regression');
const pubWin={};new Function('window',txt('data/przygody-data.js'))(pubWin);const pub=pubWin.DORSZOLANDIA_DATA;need(pub,'Public story data missing');
for(const [id,h] of Object.entries(SOURCE_HASHES)){const s=world.find(x=>x.id===id)||classic.find(x=>x.id===id);need(s&&hash(blocks(s))===h&&hash(body(s))===h,`Story source integrity fail ${id}`);const p=(pub.stories||[]).find(x=>x.id===id)||(pub.classicStories||[]).find(x=>x.id===id);need(p&&hash(blocks(p))===h&&hash(body(p))===h,`Public story integrity fail ${id}`);}

const mapHtml=txt('mapa.html');
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
for(const p of places){for(const cls of ['map-pin','place-card']){const re=new RegExp(`<[^>]+class="[^"]*${cls}[^"]*"[^>]*data-life="${esc(p.slug)}"[^>]*>`);const m=mapHtml.match(re);need(m,`${cls} missing ${p.slug}`);const tag=m[0];need(tag.includes(`data-story-id="${p.story_id}"`),`${cls} story_id mismatch ${p.slug}`);need(tag.includes(`data-story-title="${p.story_title.replace(/"/g,'&quot;')}"`)||tag.includes(`data-story-title="${p.story_title}"`),`${cls} story_title mismatch ${p.slug}`);need(tag.includes(`data-story-status="${p.story_status}"`),`${cls} story_status mismatch ${p.slug}`);need(tag.includes(`data-story-href="${p.story_href}"`),`${cls} story_href mismatch ${p.slug}`);}}
for(const slug of ['zamek-dorszolandii','laboratorium-babel','wieza-czarodzieja','port-muszelka']) need(places.find(x=>x.slug===slug)?.story_status==='placeholder',`${slug} must stay placeholder`);

const game=txt('gry.html');need((game.match(/data-game-card=/g)||[]).length===7,'Games regression');need(game.includes('pilka-nozna-user.webp')&&!game.includes('pika-futbolowa.webp'),'Goalkeeper ball regression');
const rw={};new Function('window',txt('data/mieszkancy-data.js'))(rw);need((rw.DORSZOLANDIA_DATA?.atlasCharacters||[]).length===60,'Residents regression');
need(txt('kreator.html').includes('Rekwizyty (51)'),'Creator regression');
for(const x of ['zegar-i-czas.webp','ortografia.webp','alfabet.webp','kalendarz-szkolny-2026-2027.webp']) need(fs.existsSync(path.join('dist/assets/materials/education',x)),`Material missing ${x}`);
for(const a of ['piosenka-dorszolandia.m4a','dorszolandia-piosenka-2.mp3','dorszolandia-piosenka-3.mp3']) need(fs.existsSync(path.join('dist/assets/media',a)),`Song missing ${a}`);
need(!/\d+[,.]\d{2}\s*zł|\d+\s*zł/i.test(txt('sklep.html')),'Shop price regression');
new Function(txt('js/app.js'));new Function(txt('js/games-v25.js'));
const qa=JSON.parse(txt('QA_V24_23.json'));need(qa.map_pins_synced===true&&qa.map_place_cards_synced===true,'QA metadata invalid');
fs.writeFileSync('dist/vercel-build.txt',[`Dorszolandia ${VERSION}`,`Drive package ${FILE_ID}`,`Package bytes ${packed.length}`,`Package SHA256 ${sha}`,`Extracted files ${files}`,'Map pins: 12/12 synchronized PASS','Map lower cards: 12/12 synchronized PASS','Four restored placeholders PASS','Story source integrity: 7/7 PASS','Materials/privacy/games/residents/creator/songs/shop regression PASS',`Built ${new Date().toISOString()}`,''].join('\n'));
console.log(`Dorszolandia ${VERSION}: ${files} files; map pins 12/12 PASS; map cards 12/12 PASS; source integrity 7/7 PASS; regression checks PASS`);
