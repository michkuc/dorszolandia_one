import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const FILE_ID='1oZOzEzSQoRUM4xj9XujFZP2vJcqoP3f7';
const BYTES=24405506;
const SHA='b71fabe2a042bc2a4a34211b7921111a21531785c548d7b428b6fef135adfd79';
let buf;
if(process.env.DORSZ_LOCAL_PACKAGE) buf=fs.readFileSync(process.env.DORSZ_LOCAL_PACKAGE);
else {
  const r=await fetch(`https://drive.google.com/uc?export=download&id=${FILE_ID}`,{redirect:'follow'});
  if(!r.ok) throw new Error(`Drive download failed: ${r.status}`);
  buf=Buffer.from(await r.arrayBuffer());
}
if(buf.length!==BYTES) throw new Error(`Bad package size: ${buf.length}`);
if(crypto.createHash('sha256').update(buf).digest('hex')!==SHA) throw new Error('Bad package SHA256');
const tar=zlib.gunzipSync(buf);
fs.rmSync('dist',{recursive:true,force:true}); fs.mkdirSync('dist',{recursive:true});
const s=(b,a,n)=>b.subarray(a,a+n).toString('utf8').replace(/\0.*$/s,'');
const o=(b,a,n)=>parseInt(s(b,a,n).trim().replace(/\0/g,'')||'0',8);
let off=0,count=0;
while(off+512<=tar.length){
  const h=tar.subarray(off,off+512); if(h.every(x=>x===0)) break;
  const name=s(h,0,100),pre=s(h,345,155),raw=(pre?`${pre}/${name}`:name).replace(/^\.\//,'');
  const size=o(h,124,12),type=String.fromCharCode(h[156]||48); off+=512;
  const n=path.posix.normalize(raw); if(n.startsWith('../')||path.posix.isAbsolute(n)) throw new Error('Unsafe TAR path');
  const dest=path.join('dist',...n.split('/'));
  if(type==='5') fs.mkdirSync(dest,{recursive:true});
  else if((type==='0'||type==='\0')&&n&&n!=='.'){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,tar.subarray(off,off+size));count++;}
  off+=Math.ceil(size/512)*512;
}
const read=f=>fs.readFileSync(path.join('dist',f),'utf8');
const need=(v,m)=>{if(!v)throw new Error(m)};
const pages=['index.html','mapa.html','mieszkancy.html','dorszopedia.html','przygody.html','gry.html','kreator.html','materialy.html','sklep.html','piosenka.html','kontakt.html'];
for(const p of pages) need(fs.existsSync(path.join('dist',p)),`Missing ${p}`);
new Function(read('js/app.js'));
const world=JSON.parse(read('data/stories.json'));
const classic=JSON.parse(read('data/classic-stories.json'));
const map=JSON.parse(read('data/map-life.json'));
need(world.length===12&&world.filter(x=>x.status==='full').length===3&&world.filter(x=>x.status==='placeholder').length===9,'World stories must be 12/3/9');
need(classic.length===4&&classic.every(x=>x.status==='full'&&x.blocks?.length&&x.poster_path),'Classic stories invalid');
for(const slug of ['zamek-dorszolandii','laboratorium-babel','wieza-czarodzieja','port-muszelka']) need(world.find(x=>x.world_slug===slug)?.status==='placeholder',`${slug} must be placeholder`);
for(const p of map){const story=world.find(x=>x.world_slug===p.slug);need(story&&story.story_href===p.story_href,`Bad map link ${p.slug}`);}
const residents=read('mieszkancy.html');
need(!residents.includes('Postacie z opowiadań'),'Story cast section still visible');
need(residents.indexOf('main-heroes-section')>residents.indexOf('residents-premium-v22'),'Main duo must be below residents');
need((residents.match(/main-card--hero/g)||[]).length===2,'Main duo cards missing');
need((read('mapa.html').match(/class="map-pin"/g)||[]).length===12,'Map pins != 12');
need(read('przygody.html').includes('id="classicStoryCycle"'),'Classic section missing');
need(read('kreator.html').includes('Rekwizyty (51)'),'Creator props changed');
fs.writeFileSync('dist/vercel-build.txt',`Dorszolandia v24.15-safe-cleanup\nPackage ${FILE_ID}\nFiles ${count}\nSHA256 ${SHA}\n`);
console.log(`Dorszolandia v24.15-safe-cleanup: ${count} files`);
