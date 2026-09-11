import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const VERSION='v24.22-materials-public-safe-update';
const FILE_ID='1TXXPDyIn-PvMd-Ys92ywp271Wzhg1bYr';
const EXPECTED_BYTES=25012731;
const EXPECTED_SHA256='acf4d454353a866dd9f136e7e616b104c72f497f910a996d088cab4472196cc4';
const SOURCE_HASHES={
  'zatoka-tajemnic':'dce4e116a076e981065df2d4f3521e9441ba62c6a70d6c667d5d69a8fc28142d',
  'las-wodorostow':'5e2fdfbc798a40236fa8c411e7088b37c8a21fc5ab7ca9ab86fce7b4fc503c7b',
  'krolewski-dwor':'ef9897b4e14f5447191ce3bac9941ab0132c49bf5bcfe17852bdc94e98e6803d',
  'afera-z-pecherzykiem':'f27a065916c9c4f74c23fec3045ac0520d3a5a278abfc4a22282dd01ce3a7d7d',
  'ksiezniczka-algorytma':'8f15712b663aed3446a1e7ae561b8f4ad3bb74464c8614f5be3dd5743233bfb4',
  'algoria-powraca':'1b9007a9c725b128507fc6a8256f3f84038beb790cdd265ee45a4880f4f9783f',
  'operacja-koralowy-kosmos':'4f9533b3cc61d0364b7fe39ff3106d7d02fba013890ff9c5b87a52fdc06064e7'
};
const MATERIAL_HASHES={
  'assets/materials/education/zegar-i-czas.webp':'82ea8a2784b1bac46fbea2027558eca45a34f6499383d161b2d377c1a345c58a',
  'assets/materials/education/ortografia.webp':'3b6ae288114178d4b84c6172ae57df698af803400bf548df5abf27fa482b8035',
  'assets/materials/education/alfabet.webp':'890ec665e9c38f067fa2bbfd42e7accb5b41b77498c4bd34e78b43ffadb30932',
  'assets/materials/education/kalendarz-szkolny-2026-2027.webp':'58537eff3522a7bcefb6044e4d7b43ca2b2a3296596fca339daaa39d4dc1ea09'
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
  else if(type==='0'||type==='\0'){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,tar.subarray(off,off+size));files++;}
  off+=Math.ceil(size/512)*512;
}

const need=(v,m)=>{if(!v)throw new Error(m)};
const txt=f=>fs.readFileSync(path.join('dist',f),'utf8');
const shaFile=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join('dist',f))).digest('hex');
const norm=s=>String(s??'').replace(/\s+/g,' ').trim();
const hash=s=>crypto.createHash('sha256').update(norm(s),'utf8').digest('hex');
const blocks=s=>(s.blocks||[]).map(x=>typeof x==='string'?x:(x?.text||'')).join('\n\n');
const body=s=>Array.isArray(s.body)?s.body.join('\n\n'):String(s.body||'');
const pages=['index.html','mapa.html','mieszkancy.html','dorszopedia.html','przygody.html','gry.html','kreator.html','materialy.html','sklep.html','piosenka.html','kontakt.html'];
for(const p of pages) need(fs.existsSync(path.join('dist',p)),`Missing ${p}`);

for(const p of pages){
  const h=txt(p),m=h.match(/<nav class="menu" id="menu">([\s\S]*?)<\/nav>/);
  need(m&&m[1].includes('href="/materialy"'),`Top navigation missing Materialy: ${p}`);
}
const materials=txt('materialy.html');
for(const [f,h] of Object.entries(MATERIAL_HASHES)){
  need(materials.includes(f),`Materials page missing poster ${f}`);
  need(fs.existsSync(path.join('dist',f)),`Poster file missing ${f}`);
  need(shaFile(f)===h,`Poster asset mismatch ${f}`);
}
need(materials.includes('css/v26-materials.css'),'Materials stylesheet missing');
need(!/plan[- ]lekcji/i.test(materials),'Private lesson plan still visible on Materials page');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
for(const f of walk('dist')){
  const rel=f.replace(/^dist[\\/]/,'');
  need(!/plan-lekcji/i.test(rel),`Private lesson-plan file remains: ${rel}`);
  if(/\.(html|json|js|css|md|txt)$/i.test(f)&&path.basename(f)!=='V24_22_RELEASE.md') need(!/plan[- ]lekcji/i.test(fs.readFileSync(f,'utf8')),`Private lesson-plan reference remains: ${rel}`);
}

const world=JSON.parse(txt('data/stories.json')),classic=JSON.parse(txt('data/classic-stories.json')),places=JSON.parse(txt('data/map-life.json'));
need(world.length===12&&world.filter(x=>x.status==='full').length===3&&world.filter(x=>x.status==='placeholder').length===9,'World stories regression');
need(classic.length===4&&classic.every(x=>x.status==='full'),'Classic stories regression');
const w={};new Function('window',txt('data/przygody-data.js'))(w);const pub=w.DORSZOLANDIA_DATA;need(pub,'Public story data missing');
for(const [id,h] of Object.entries(SOURCE_HASHES)){
  const s=world.find(x=>x.id===id)||classic.find(x=>x.id===id); need(s,`Missing story ${id}`);
  need(hash(blocks(s))===h&&hash(body(s))===h,`SOURCE INTEGRITY FAIL: ${id}`);
  const p=(pub.stories||[]).find(x=>x.id===id)||(pub.classicStories||[]).find(x=>x.id===id); need(p,`Public story missing ${id}`);
  need(hash(blocks(p))===h&&hash(body(p))===h,`PUBLIC SOURCE INTEGRITY FAIL: ${id}`);
}
const bySlug=new Map(world.map(s=>[s.world_slug,s]));for(const p of places){const s=bySlug.get(p.slug);need(s&&p.story_id===s.id&&p.story_status===s.status&&p.story_href===s.story_href,`Map regression: ${p.slug}`);}

const gameHtml=txt('gry.html'),gameJs=txt('js/games-v25.js');new Function(gameJs);
need((gameHtml.match(/data-game-card=/g)||[]).length===7,'Games Hub must contain 7 games');
need(gameHtml.includes('assets/games/pilka-nozna-user.webp'),'Goalkeeper soccer ball regression');
const rw={};new Function('window',txt('data/mieszkancy-data.js'))(rw);need((rw.DORSZOLANDIA_DATA?.atlasCharacters||[]).length===60,'Resident data regression');
need(fs.readdirSync('dist/assets/characters/atlas59').filter(x=>x.endsWith('.webp')).length===60,'Resident atlas != 60');
need(txt('kreator.html').includes('Rekwizyty (51)'),'Creator regression');
for(const a of ['piosenka-dorszolandia.m4a','dorszolandia-piosenka-2.mp3','dorszolandia-piosenka-3.mp3'])need(fs.existsSync(path.join('dist/assets/media',a)),`Missing media ${a}`);
need(!/\d+,\d{2}\s*zł|\d+\s*zł/i.test(txt('sklep.html')),'Shop price regression');
const qa=JSON.parse(txt('QA_V24_22.json'));need(qa.new_public_posters===4&&qa.private_lesson_plan_assets_removed===true&&qa.top_nav_materials_all_pages===true,'QA v24.22 metadata invalid');

fs.writeFileSync('dist/vercel-build.txt',[
  `Dorszolandia ${VERSION}`,`Drive package ${FILE_ID}`,`Package bytes ${packed.length}`,`Package SHA256 ${packageSha}`,`Extracted files ${files}`,
  'Top navigation: Materialy 11/11 PASS','Educational posters: 4/4 user-supplied poster web copies PASS','Private Plan lekcji: public files/references NONE','Story source integrity: 7/7 PASS','Games/residents/creator/songs/shop regression checks PASS',`Built ${new Date().toISOString()}`,''].join('\n'));
console.log(`Dorszolandia ${VERSION}: ${files} files; Materialy nav 11/11 PASS; posters 4/4 PASS; private plan removed PASS; source integrity 7/7 PASS; regression checks PASS`);
