import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const VERSION='v24.12-story-worlds-final';
const FILE_ID='1CTdWZR59dlHuG0ETPSAbquzG9MCJTDvH';
const local=process.env.DORSZ_LOCAL_PACKAGE;
let packed;
if(local) packed=fs.readFileSync(local);
else {
  const r=await fetch(`https://drive.google.com/uc?export=download&id=${FILE_ID}`,{redirect:'follow'});
  if(!r.ok) throw new Error(`Drive download failed: ${r.status} ${r.statusText}`);
  packed=Buffer.from(await r.arrayBuffer());
}
if(packed.length<10_000_000) throw new Error(`Pakiet jest podejrzanie mały: ${packed.length} B`);
const sha=crypto.createHash('sha256').update(packed).digest('hex');
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
  if(!n||n==='.'||n.startsWith('../')||path.posix.isAbsolute(n)){if(n==='.'){off+=Math.ceil(size/512)*512;continue}throw new Error(`Niebezpieczna ścieżka TAR: ${raw}`)}
  const target=path.join('dist',...n.split('/'));
  if(type==='5') fs.mkdirSync(target,{recursive:true});
  else if(type==='0'||type==='\0'){fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,tar.subarray(off,off+size));files++}
  off+=Math.ceil(size/512)*512;
}
const need=(ok,msg)=>{if(!ok)throw new Error(msg)};
const txt=f=>fs.readFileSync(path.join('dist',f),'utf8');
const pages=['index.html','mapa.html','mieszkancy.html','dorszopedia.html','przygody.html','gry.html','kreator.html','materialy.html','sklep.html','piosenka.html','kontakt.html'];
for(const p of pages){need(fs.existsSync(path.join('dist',p)),`Brak ${p}`);need(txt(p).includes('href="/piosenka"'),`Brak Piosenki w ${p}`)}
const app=txt('js/app.js'),creator=txt('kreator.html'),res=txt('mieszkancy.html'),resData=txt('data/mieszkancy-data.js'),map=txt('mapa.html'),storyPage=txt('przygody.html');
for(const m of ['Rekwizyty (51)','id="fishName"','id="fishNameplate"','id="flipSelected"','id="flipFish"','id="flipAll"']) need(creator.includes(m),`Kreator: brak ${m}`);
need(!/data-name="Gitara"/.test(creator),'Kreator: aktywna Gitara');
need((res.match(/class="filter atlas-filter/g)||[]).length===8,'Mieszkańcy: filtry != 8');
need(resData.includes('"name":"Tata Dorsz"')&&resData.includes('"minimal_card":true')&&resData.includes('"all_only":true'),'Mieszkańcy: Tata Dorsz');
for(const m of ['applyAtlasFilter','style.display=show',"setAttribute('aria-pressed'"]) need(app.includes(m),`Mieszkańcy JS: brak ${m}`);
need(fs.readdirSync('dist/assets/characters/atlas59').filter(x=>x.endsWith('.webp')).length===60,'Atlas: ikony != 60');
need(map.includes('id="mapLifeDialog"')&&map.includes('id="mapLifeStory"'),'Mapa: brak dialog/story link');
need((map.match(/class="map-pin"/g)||[]).length===12,'Mapa: piny != 12');
need((map.match(/data-story-href=/g)||[]).length>=12,'Mapa: brak linków do opowieści');
const places=JSON.parse(txt('data/map-life.json')); need(places.length===12,'Mapa: miejsca != 12');
for(const p of places) need(p.slug&&p.image&&fs.existsSync(path.join('dist',p.image)),`Mapa: niepełne ${p.slug||'?'}`);
const stories=JSON.parse(txt('data/stories.json')),full=stories.filter(s=>s.status==='full'),planned=stories.filter(s=>s.status==='placeholder');
need(stories.length===12&&full.length===7&&planned.length===5,`Opowieści: ${stories.length}/${full.length}/${planned.length} zamiast 12/7/5`);
need(new Set(stories.map(s=>s.world_slug)).size===12,'Opowieści: krainy nie są unikalne');
const worldSlugs=new Set(places.map(p=>p.slug));
for(const s of stories){need(s.id&&worldSlugs.has(s.world_slug),`Opowieść ${s.id||'?'}: zła kraina`);need(s.illustration_path&&fs.existsSync(path.join('dist',s.illustration_path)),`Opowieść ${s.id}: brak grafiki`);if(s.status==='full')need(Array.isArray(s.blocks)&&s.blocks.length,`Opowieść ${s.id}: brak tekstu`)}
const expected=['Zatoka Tajemnic','Las Wodorostów','Królewski Dwór','Borys i Dorszuś i Wielka Afera z Pęcherzykiem','Księżniczka Algorytma i Zbuntowany Pomnik','Algoria Powraca, czyli Influencerzy z Głębin','Operacja Koralowy Kosmos'];
need(full.map(s=>s.title).join('|')===expected.join('|'),'Opowieści: zła kolejność pełnych tekstów');
const kosmos=full.find(s=>s.id==='operacja-koralowy-kosmos');
need(kosmos&&kosmos.blocks.filter(b=>b.type==='chapter'&&/^Rozdział\s+[1-5]:/u.test(b.text||'')).length===5,'Koralowy Kosmos: brak 5 numerowanych rozdziałów');
for(const m of ['id="storyCycleMain"','id="storyDialog"','id="storySearch"']) need(storyPage.includes(m),`Opowieści UI: brak ${m}`);
need(!/56\s+(pełnych\s+)?histor/i.test(storyPage)&&!storyPage.includes('storyCycleAtlas'),'Opowieści: stary cykl aktywny');
for(const m of ['const SD=window.DORSZ_STORIES','openWorldStory','storyCycleMain','mapLifeStory']) need(app.includes(m),`Opowieści/mapa JS: brak ${m}`);
const qa=JSON.parse(txt('QA_V24_12.json'));
need(qa.story_slots===12&&qa.full_stories===7&&qa.placeholders===5&&qa.tom_i_full===3&&qa.classic_full===4,'QA: zły układ historii');
need(qa.map_pin_story_links===12&&qa.map_location_card_story_links===12,'QA: linki mapa→opowieści');
const song=txt('piosenka.html'); need(song.includes('1QgHjP-gKDzkvbIvv-PpvE94QlFRrj_cu/preview'),'Piosenki: brak teledysku');
for(const a of ['piosenka-dorszolandia.m4a','dorszolandia-piosenka-2.mp3','dorszolandia-piosenka-3.mp3']) need(fs.existsSync(path.join('dist/assets/media',a)),`Piosenki: brak ${a}`);
need(!/\d+,\d{2}\s*zł|\d+\s*zł/i.test(txt('sklep.html')),'Sklep: nie może zawierać cen');
fs.writeFileSync('dist/vercel-build.txt',[`Dorszolandia ${VERSION}`,`Drive package ${FILE_ID}`,`Package bytes ${packed.length}`,`Package SHA256 ${sha}`,`Extracted files ${files}`,'Stories 12 worlds / 7 full / 5 planned','Tom I 3 / classics 4','Map links 12/12','Residents 60 incl. Tata Dorsz','Creator 51 props','Full video + 3 songs','Shop plan only',`Built ${new Date().toISOString()}`,''].join('\n'));
console.log(`Dorszolandia ${VERSION}: ${files} plików · ${packed.length} B · ${sha} · 7/12 pełnych`);
