import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

fs.mkdirSync('dist', { recursive: true });
const payloadDir = path.join(process.cwd(), 'payload');
if (!fs.existsSync(payloadDir)) {
  fs.copyFileSync('index.html', 'dist/index.html');
  console.log('Payload v16.1 jeszcze nie wgrany — zachowuję poprzednią stronę produkcyjną.');
  process.exit(0);
}
const parts = fs.readdirSync(payloadDir).filter(x => /^p\d+\.txt$/.test(x)).sort();
if (!parts.length) {
  fs.copyFileSync('index.html', 'dist/index.html');
  console.log('Brak części payload — zachowuję poprzednią stronę produkcyjną.');
  process.exit(0);
}
const b64 = parts.map(x => fs.readFileSync(path.join(payloadDir, x), 'utf8').trim()).join('');
const compressed = Buffer.from(b64, 'base64');
const html = zlib.brotliDecompressSync(compressed);
const sha = crypto.createHash('sha256').update(html).digest('hex');
const expected = '39073ee7c97dcee8a4f60947746b259ece4b4534a2b6545a3f066408820b661d';
if (sha !== expected) throw new Error(`SHA mismatch: ${sha}`);
fs.writeFileSync('dist/index.html', html);
console.log(`Dorszolandia v16.1: ${html.length} bytes, SHA256 ${sha}, ${parts.length} payload parts`);
