import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const VERSION='v24.21-user-soccer-ball-safe-fix';
const FILE_ID='1evQPGxvfD0Lq9bfageGUhPaLKSwmcApT';
const EXPECTED_BYTES=24493414;
const EXPECTED_SHA256='6bc91892342bc3d2c112d6413c5686ca6c7a3e398d2808a7d3de42bb336e5533';
const CLASSIC_IDS=['afera-z-pecherzykiem','ksiezniczka-algorytma','algoria-powraca','operacja-koralowy-kosmos'];
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
else {const r=await fetch(`https://drive.google.com/uc?export=download&id=${FILE_ID}`,{redirect:'follow'});if(!r.ok)throw new Error(`Drive download failed: ${r.status} ${r.statusText}`);packed=Buffer.from(await r.arrayBuffer());}
if(packed.length!==EXPECTED_BYTES)throw new Error(`Package size mismatch: ${packed.length} != ${EXPECTED_BYTES}`);
const packageSha=crypto.createHash('sha256').update(packed).digest('hex');
if(packageSha!==EXPECTED_SHA256)throw new Error(`Package SHA256 mismatch: ${packageSha}`);

const tar=zlib.gunzipSync(packed);fs.rmSync('dist',{recursive:true,force:true});fs.mkdirSync('dist',{recursive:true});
const str=(b,s,l)=>b.subarray(s,s+l).toString('utf8').replace(/\0.*$/s,'');
const oct=(b,s,l)=>parseInt(str(b,s,l).trim().replace(/\0/g,'')||'0',8);
let off=0,files=0;
while(off+512<=tar.length){const h=tar.subarray(off,off+512);if(h.every(x=>x===0))break;const name=str(h,0,100),pre=str(h,345,155),raw=(pre?`${pre}/${name}`:name).replace(/^\.\//,'');const size=oct(h,124,12),type=String.fromCharCode(h[156]||48);off+=512;const n=path.posix.normalize(raw);if(!n||n==='.') {off+=Math.ceil(size/512)*512;continue}if(n.startsWith('../')||path.posix.isAbsolute(n))throw new Error(`Unsafe TAR path: ${raw}`);const dest=path.join('dist',...n.split('/'));if(type==='5')fs.mkdirSync(dest,{recursive:true});else if(type==='0'||type==='\0'){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,tar.subarray(off,off+size));files++}off+=Math.ceil(size/512)*512;}

const need=(v,m)=>{if(!v)throw new Error(m)},txt=f=>fs.readFileSync(path.join('dist',f),'utf8');
const norm=s=>String(s??'').replace(/\s+/g,' ').trim(),hash=s=>crypto.createHash('sha256').update(norm(s),'utf8').digest('hex');
const blocks=s=>(s.blocks||[]).map(x=>typeof x==='string'?x:(x?.text||'')).join('\n\n');
const body=s=>Array.isArray(s.body)?s.body.join('\n\n'):String(s.body||'');
const pages=['index.html','mapa.html','mieszkancy.html','dorszopedia.html','przygody.html','gry.html','kreator.html','materialy.html','sklep.html','piosenka.html','kontakt.html'];
for(const p of pages)need(fs.existsSync(path.join('dist',p)),`Missing ${p}`);
const app=txt('js/app.js');new Function(app);need(app.includes('blocks.map(')&&!/blocks\.slice\s*\(/.test(app),'Story reader truncation risk');

const world=JSON.parse(txt('data/stories.json')),classic=JSON.parse(txt('data/classic-stories.json')),places=JSON.parse(txt('data/map-life.json'));
need(world.length===12&&world.filter(x=>x.status==='full').length===3&&world.filter(x=>x.status==='placeholder').length===9,'World stories regression');
need(classic.length===4&&JSON.stringify(classic.map(x=>x.id))===JSON.stringify(CLASSIC_IDS)&&classic.every(x=>x.status==='full'),'Classic stories regression');
const w={};new Function('window',txt('data/przygody-data.js'))(w);const pub=w.DORSZOLANDIA_DATA;need(pub,'Public story data missing');
for(const [id,h] of Object.entries(SOURCE_HASHES)){const s=world.find(x=>x.id===id)||classic.find(x=>x.id===id);need(s&&hash(blocks(s))===h&&hash(body(s))===h,`SOURCE INTEGRITY FAIL: ${id}`);const p=(pub.stories||[]).find(x=>x.id===id)||(pub.classicStories||[]).find(x=>x.id===id);need(p&&hash(blocks(p))===h&&hash(body(p))===h,`PUBLIC SOURCE INTEGRITY FAIL: ${id}`);}
const bySlug=new Map(world.map(s=>[s.world_slug,s]));for(const p of places){const s=bySlug.get(p.slug);need(s&&p.story_id===s.id&&p.story_status===s.status&&p.story_href===s.story_href,`Map regression: ${p.slug}`);}

const gameHtml=txt('gry.html'),gameCss=txt('css/v25-games.css'),gameJs=txt('js/games-v25.js');new Function(gameJs);
need((gameHtml.match(/data-game-card=/g)||[]).length===7,'Games Hub must contain 7 games');
for(const key of ['chase','memory','quiz','treasure','puzzle','simon','goal'])need(gameHtml.includes(`data-game-card="${key}"`),`Missing game ${key}`);
need(gameHtml.includes('assets/games/pilka-nozna-user.webp'),'Uploaded soccer-ball asset not referenced');
need(!/id="goalBallV25"[^>]*>[\s\S]*?pika-futbolowa\.webp/.test(gameHtml),'American-football asset still active in goalkeeper');
need(fs.existsSync(path.join('dist','assets/games/pilka-nozna-user.webp')),'Uploaded soccer-ball asset missing');
need(gameCss.includes('width:166%')&&gameCss.includes('overflow:hidden;border-radius:50%'),'Soccer-ball render crop missing');
const residentWindow={};new Function('window',txt('data/mieszkancy-data.js'))(residentWindow);need((residentWindow.DORSZOLANDIA_DATA?.atlasCharacters||[]).length===60,'Resident source regression');

const residents=txt('mieszkancy.html');need(!residents.includes('Postacie z opowiadań'),'Removed story-cast section returned');
need(fs.readdirSync('dist/assets/characters/atlas59').filter(x=>x.endsWith('.webp')).length===60,'Resident atlas != 60');
need(txt('kreator.html').includes('Rekwizyty (51)'),'Creator regression');
for(const a of ['piosenka-dorszolandia.m4a','dorszolandia-piosenka-2.mp3','dorszolandia-piosenka-3.mp3'])need(fs.existsSync(path.join('dist/assets/media',a)),`Missing media ${a}`);
need(!/\d+,\d{2}\s*zł|\d+\s*zł/i.test(txt('sklep.html')),'Shop price regression');
const qa=JSON.parse(txt('QA_V24_21.json'));need(qa.games_total===7&&qa.goalkeeper_ball_user_supplied===true&&qa.generated_images===false&&qa.game_logic_changed===false&&qa.other_games_changed===false,'QA v24.21 invalid');

fs.writeFileSync('dist/vercel-build.txt',[`Dorszolandia ${VERSION}`,`Drive package ${FILE_ID}`,`Package bytes ${packed.length}`,`Package SHA256 ${packageSha}`,`Extracted files ${files}`,'Games Hub: 7/7 PASS','Goalkeeper: exact uploaded soccer ball PASS','Goalkeeper logic unchanged PASS','Story source integrity: 7/7 PASS','World/map/classic regression checks PASS','Residents/Creator/Songs/Shop regression checks PASS',`Built ${new Date().toISOString()}`,''].join('\n'));
console.log(`Dorszolandia ${VERSION}: ${files} files; games 7/7 PASS; uploaded soccer ball PASS; source integrity 7/7 PASS; regression checks PASS`);
