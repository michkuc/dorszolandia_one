import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';

const BUILD_VERSION = 'v20-two-cycles';
const DRIVE_FILE_ID = '1ewKW-QhNuDG7fhn0FP9JJ433Qv83DgvS';
const DRIVE_URL = `https://drive.google.com/uc?export=download&id=${DRIVE_FILE_ID}`;
const EXPECTED_SHA256 = '3bb0773a8c38db4b99290b3c48ac193132cf69cba12636322385f93e9dce2f44';
const EXPECTED_BYTES = 5707287;
const PACKAGE_ROOT = 'Dorszolandia_v20_TWO_CYCLES';

fs.rmSync('dist', { recursive: true, force: true });
fs.rmSync('.dorsz-build', { recursive: true, force: true });
fs.mkdirSync('dist', { recursive: true });
fs.mkdirSync('.dorsz-build', { recursive: true });

const response = await fetch(DRIVE_URL, { redirect: 'follow' });
if (!response.ok) throw new Error(`Google Drive download failed: ${response.status} ${response.statusText}`);
const bytes = Buffer.from(await response.arrayBuffer());
const sha = crypto.createHash('sha256').update(bytes).digest('hex');
if (bytes.length !== EXPECTED_BYTES) throw new Error(`ZIP size mismatch: ${bytes.length} != ${EXPECTED_BYTES}`);
if (sha !== EXPECTED_SHA256) throw new Error(`ZIP SHA256 mismatch: ${sha}`);
if (bytes.subarray(0, 2).toString('binary') !== 'PK') throw new Error('Downloaded source is not a ZIP archive.');

const zipPath = path.join('.dorsz-build', 'source.zip');
fs.writeFileSync(zipPath, bytes);
const extractDir = path.join('.dorsz-build', 'extract');
new AdmZip(zipPath).extractAllTo(extractDir, true);
const sourceDir = path.join(extractDir, PACKAGE_ROOT);
if (!fs.existsSync(path.join(sourceDir, 'index.html'))) throw new Error('index.html missing in v20 package.');
fs.cpSync(sourceDir, 'dist', { recursive: true });

const index = fs.readFileSync('dist/index.html', 'utf8');
if (!index.includes('v20 two cycles')) throw new Error('v20 build marker missing from index.html.');
if (!index.includes('storyCycleAtlas')) throw new Error('Second story cycle UI missing from index.html.');
if (!fs.existsSync('dist/data/site-data.js')) throw new Error('site-data.js missing.');
if (!fs.existsSync('dist/assets/references')) throw new Error('Mapped reference graphics missing.');

fs.writeFileSync('dist/version.txt', [
  `Dorszolandia ${BUILD_VERSION}`,
  `Drive source ${DRIVE_FILE_ID}`,
  `ZIP bytes ${bytes.length}`,
  `ZIP SHA256 ${sha}`,
  `Built ${new Date().toISOString()}`,
  ''
].join('\n'));

console.log(`Dorszolandia ${BUILD_VERSION} · ${bytes.length} bytes · SHA256 ${sha}`);
