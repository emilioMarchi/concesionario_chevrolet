// Optimiza a WebP las imágenes referenciadas en scraped/images.manifest.json
// y elimina de public/cars todo lo que no quede referenciado (duplicados por trim).
//
// Uso:  node scripts/optimize_images.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const CARS = path.join(PUBLIC, 'cars');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'scraped', 'images.manifest.json'), 'utf8'));

const localPath = (webPath) => path.join(PUBLIC, webPath.replace(/^\//, ''));

async function toWebp(entry) {
  const src = localPath(entry.src);
  const out = localPath(entry.out);
  if (!fs.existsSync(src)) {
    console.warn(`  ! falta origen: ${entry.src}`);
    return null;
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const tmp = out + '.tmp';
  await sharp(src)
    .resize({ width: entry.width, withoutEnlargement: true })
    .webp({ quality: entry.quality, effort: 5 })
    .toFile(tmp);
  fs.renameSync(tmp, out);
  return fs.statSync(out).size;
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

async function main() {
  const keep = new Set(manifest.map((m) => path.resolve(localPath(m.out))));
  let total = 0;
  let converted = 0;
  for (const entry of manifest) {
    const size = await toWebp(entry);
    if (size != null) {
      total += size;
      converted++;
    }
  }
  console.log(`Convertidas: ${converted}/${manifest.length}  (${(total / 1048576).toFixed(2)} MB)`);

  let removed = 0;
  let removedBytes = 0;
  for (const file of walk(CARS)) {
    if (keep.has(path.resolve(file))) continue;
    removedBytes += fs.statSync(file).size;
    fs.unlinkSync(file);
    removed++;
  }
  console.log(`Eliminados ${removed} archivos no referenciados (${(removedBytes / 1048576).toFixed(1)} MB)`);

  const rest = walk(CARS);
  const restBytes = rest.reduce((a, f) => a + fs.statSync(f).size, 0);
  console.log(`public/cars final: ${rest.length} archivos, ${(restBytes / 1048576).toFixed(2)} MB`);
}

main();
