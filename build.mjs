import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const VERSION='v24.13-content-polish-final';
const FILE_ID='1CTdWZR59dlHuG0ETPSAbquzG9MCJTDvH';
const EXPECTED_BYTES=26489658;
const EXPECTED_SHA256='6657ab55e0d241d6662aac0b2df10a78074d6d9904da0a6c6b154251437148d8';
const local=process.env.DORSZ_LOCAL_PACKAGE;
let packed;
if(local) packed=fs.readFileSync(local);
else {
  const r=await fetch(`https://drive.google.com/uc?export=download&id=${FILE_ID}`,{redirect:'follow'});
  if(!r.ok) throw new Error(`Drive download failed: ${r.status} ${r.statusText}`);
  packed=Buffer.from(await r.arrayBuffer());
}
if(packed.length!==EXPECTED_BYTES) throw new Error(`Pakiet ma zły rozmiar: ${packed.length} != ${EXPECTED_BYTES}`);
const sha=crypto.createHash('sha256').update(packed).digest('hex');
if(sha!==EXPECTED_SHA256) throw new Error(`Pakiet ma zły SHA256: ${sha}`);
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
  if(n.startsWith('../')||path.posix.isAbsolute(n)) throw new Error(`Niebezpieczna ścieżka TAR: ${raw}`);
  const target=path.join('dist',...n.split('/'));
  if(type==='5') fs.mkdirSync(target,{recursive:true});
  else if(type==='0'||type==='\0'){fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,tar.subarray(off,off+size));files++}
  off+=Math.ceil(size/512)*512;
}
const need=(ok,msg)=>{if(!ok)throw new Error(msg)};
const txt=f=>fs.readFileSync(path.join('dist',f),'utf8');
const pages=['index.html','mapa.html','mieszkancy.html','dorszopedia.html','przygody.html','gry.html','kreator.html','materialy.html','sklep.html','piosenka.html','kontakt.html'];
const forbidden=['Tu możemy','Na końcu listy','Zachowaliśmy','bez przebudowy strony','z projektu','folderu multimedia','Google Drive','DRIVE HQ','Grafiki projektowe','Osobna biblioteka','0 płatności','0 zamówień','59 nazwanych','specjalny Tata Dorsz','36 rekwizytów','podstrony wizualne'];
for(const p of pages){
  need(fs.existsSync(path.join('dist',p)),`Brak ${p}`);
  const html=txt(p);
  need(html.includes('href="/piosenka"'),`Brak Piosenki w ${p}`);
  need(!/class="build-stamp"/.test(html),`Widoczny build-stamp w ${p}`);
  const visible=html.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'');
  for(const phrase of forbidden) need(!visible.toLowerCase().includes(phrase.toLowerCase()),`Publiczna notatka techniczna w ${p}: ${phrase}`);
}
const app=txt('js/app.js'); new Function(app);
const res=txt('mieszkancy.html');
need(res.includes('main-grid--duo'),'Mieszkańcy: brak sekcji głównego duetu');
need((res.match(/class="main-card main-card--hero"/g)||[]).length===2,'Mieszkańcy: głównych kart ma być 2');
need(!res.includes('premium-cast-section'),'Mieszkańcy: pozostała stara sekcja dodatkowych bohaterów');
need((res.match(/class="filter atlas-filter/g)||[]).length===8,'Mieszkańcy: filtry != 8');
const storyChars=JSON.parse(txt('data/story-characters.json'));
need(storyChars.length===2&&storyChars[0]?.name==='Dorszuś'&&storyChars[1]?.name==='Borys','Bohaterowie: wyróżniony duet != Dorszuś + Borys');
const siteData=JSON.parse(txt('data/site-data.json'));
need(siteData.meta?.story_characters_count===2,'Dane: story_characters_count != 2');
const resData=txt('data/mieszkancy-data.js');
need(resData.includes('"name":"Tata Dorsz"')&&resData.includes('"minimal_card":true')&&resData.includes('"all_only":true'),'Mieszkańcy: Tata Dorsz');
need(fs.readdirSync('dist/assets/characters/atlas59').filter(x=>x.endsWith('.webp')).length===60,'Atlas: ikony != 60');
const stories=JSON.parse(txt('data/stories.json')),full=stories.filter(s=>s.status==='full'),planned=stories.filter(s=>s.status==='placeholder');
need(stories.length===12&&full.length===7&&planned.length===5,`Opowieści: ${stories.length}/${full.length}/${planned.length} zamiast 12/7/5`);
const places=JSON.parse(txt('data/map-life.json')); need(places.length===12,'Mapa: miejsca != 12');
need(new Set(stories.map(s=>s.world_slug)).size===12,'Opowieści: krainy nie są unikalne');
const worldSlugs=new Set(places.map(p=>p.slug));
for(const s of stories) need(worldSlugs.has(s.world_slug),`Opowieść ${s.id||s.slug}: brak krainy ${s.world_slug}`);
const map=txt('mapa.html'); need((map.match(/class="map-pin"/g)||[]).length===12,'Mapa: piny != 12'); need((map.match(/data-story-href=/g)||[]).length>=12,'Mapa: brak linków do opowieści');
const creator=txt('kreator.html'); for(const m of ['Rekwizyty (51)','id="fishName"','id="fishNameplate"','id="flipSelected"','id="flipFish"','id="flipAll"']) need(creator.includes(m),`Kreator: brak ${m}`); need(!/data-name="Gitara"/.test(creator),'Kreator: aktywna Gitara');
const song=txt('piosenka.html'); need(song.includes('1QgHjP-gKDzkvbIvv-PpvE94QlFRrj_cu/preview'),'Piosenki: brak teledysku'); for(const a of ['piosenka-dorszolandia.m4a','dorszolandia-piosenka-2.mp3','dorszolandia-piosenka-3.mp3']) need(fs.existsSync(path.join('dist/assets/media',a)),`Piosenki: brak ${a}`);
need(!/\d+,\d{2}\s*zł|\d+\s*zł/i.test(txt('sklep.html')),'Sklep: nie może zawierać cen');
const qa=JSON.parse(txt('QA_V24_13.json')); need(qa.public_editorial_notes_removed===true&&qa.featured_story_characters_count===2,'QA v24.13 nie potwierdza cleanupu');
fs.writeFileSync('dist/vercel-build.txt',[`Dorszolandia ${VERSION}`,`Drive package ${FILE_ID}`,`Package bytes ${packed.length}`,`Package SHA256 ${sha}`,`Extracted files ${files}`,'Main heroes: Dorszus + Borys','Residents: 60 incl. Tata Dorsz','Stories: 12 total / 7 full / 5 planned','Map: 12 locations linked to stories','Creator: 51 props','Public editorial/developer notes: removed','Visible build stamps: removed','Shop: plan only, no prices',`Built ${new Date().toISOString()}`,''].join('\n'));
console.log(`Dorszolandia ${VERSION}: ${files} plików · ${packed.length} B · ${sha}`);
