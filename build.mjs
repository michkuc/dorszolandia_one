import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const payloadDir = path.join(process.cwd(), 'payload');
const parts = fs.readdirSync(payloadDir).filter(x => /^p\d+\.txt$/.test(x)).sort();
if (!parts.length) throw new Error('Brak payload v16.1');
const b64 = parts.map(x => fs.readFileSync(path.join(payloadDir, x), 'utf8').trim()).join('');
const compressed = Buffer.from(b64, 'base64');
const html = zlib.brotliDecompressSync(compressed);
const sha = crypto.createHash('sha256').update(html).digest('hex');
const expected = '39073ee7c97dcee8a4f60947746b259ece4b4534a2b6545a3f066408820b661d';
if (sha !== expected) throw new Error(`SHA mismatch: ${sha}`);
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', html);
console.log(`Dorszolandia v16.1: ${html.length} bytes, SHA256 ${sha}, ${parts.length} payload parts`);
