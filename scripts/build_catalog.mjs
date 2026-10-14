// Construye un catálogo unificado (scraped/catalog.json) a partir de:
//   - scraped/chevrolet.json  (modelos, trims, colores, imágenes descargadas)
//   - scraped/specs.json      (fichas técnicas: trims + keySpecs)
// Deriva el hex de cada color exterior desde su "chip" PNG con sharp.
// Emite scraped/images.manifest.json con las imágenes referenciadas a optimizar a WebP.
//
// Uso:  node scripts/build_catalog.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

const chevrolet = JSON.parse(fs.readFileSync(path.join(ROOT, 'scraped', 'chevrolet.json'), 'utf8'));
const models = Array.isArray(chevrolet) ? chevrolet : chevrolet.models;

let specs = { models: [] };
const specsPath = path.join(ROOT, 'scraped', 'specs.json');
if (fs.existsSync(specsPath)) specs = JSON.parse(fs.readFileSync(specsPath, 'utf8'));
const specsById = new Map((specs.models || []).map((m) => [m.id, m]));

const CATEGORY = [
  [/autos-0km/, 'Auto'],
  [/camionetas-suv/, 'SUV'],
  [/camionetas-pick-up/, 'Pick-up'],
];

const manifest = [];

function webp(p) {
  return p ? p.replace(/\.(png|jpe?g)$/i, '.webp') : null;
}

function localPath(webPath) {
  return webPath ? path.join(PUBLIC, webPath.replace(/^\//, '')) : null;
}

function findHero(slug) {
  for (const ext of ['png', 'jpg', 'jpeg']) {
    const rel = `/cars/${slug}/hero.${ext}`;
    if (fs.existsSync(localPath(rel))) return rel;
  }
  return null;
}

// Registra una imagen raster para optimizar y devuelve su ruta .webp.
function optimize(src, kind) {
  if (!src) return null;
  const abs = localPath(src);
  if (!abs || !fs.existsSync(abs)) return null;
  const out = webp(src);
  const width = kind === 'chip' ? 128 : kind === 'hero' ? 1600 : 1100;
  const quality = kind === 'chip' ? 82 : 72;
  manifest.push({ src, out, kind, width, quality });
  return out;
}

function categoryOf(url) {
  for (const [re, cat] of CATEGORY) if (re.test(url)) return cat;
  return 'Auto';
}

function fuelOf(keySpecs = {}) {
  const c = (keySpecs.combustible || '').toLowerCase();
  if (c.includes('diesel') || (keySpecs.motor || '').toLowerCase().includes('diesel')) return 'Diesel';
  return 'Gasolina';
}

function yearOf(model) {
  const m = model.name.match(/\b(20\d{2})\b/);
  if (m) return Number(m[1]);
  const f = specsById.get(model.slug)?.fichaPdf || '';
  const my = f.match(/my\r?-?(\d{2})/i);
  return my ? 2000 + Number(my[1]) : 2026;
}

async function hexFromChip(absPath) {
  try {
    const { data, info } = await sharp(absPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const ch = info.channels;
    let r = 0, g = 0, b = 0, w = 0;
    for (let i = 0; i < data.length; i += ch) {
      const a = ch === 4 ? data[i + 3] : 255;
      if (a < 32) continue;
      const wt = a / 255;
      r += data[i] * wt;
      g += data[i + 1] * wt;
      b += data[i + 2] * wt;
      w += wt;
    }
    if (!w) return '#888888';
    return '#' + [r, g, b].map((v) => Math.round(v / w).toString(16).padStart(2, '0')).join('');
  } catch {
    return '#888888';
  }
}

async function buildModel(model) {
  const spec = specsById.get(model.slug) || {};
  const keySpecs = spec.keySpecs || {};

  const colorMap = new Map();
  for (const trim of model.trims) {
    for (const ext of trim.exteriors) {
      if (colorMap.has(ext.id)) continue;
      let hex = '#888888';
      const chipAbs = localPath(ext.downloadedChip);
      if (chipAbs && fs.existsSync(chipAbs)) hex = await hexFromChip(chipAbs);
      colorMap.set(ext.id, {
        id: ext.id,
        name: ext.name,
        hex,
        image: optimize(ext.downloadedImage, 'exterior'),
        chip: optimize(ext.downloadedChip, 'chip'),
      });
    }
  }
  const colors = [...colorMap.values()];

  const interiors = [];
  const seenInt = new Set();
  for (const trim of model.trims) {
    for (const it of trim.interiors || []) {
      if (seenInt.has(it.id)) continue;
      seenInt.add(it.id);
      interiors.push({ id: it.id, name: it.name, image: optimize(it.downloadedImage, 'interior'), chip: optimize(it.downloadedChip, 'chip') });
    }
  }

  const hero = optimize(findHero(model.slug), 'hero') || model.hero || null;
  const image = colors.find((c) => c.image)?.image || hero;

  return {
    id: model.slug,
    name: model.name,
    url: model.url,
    category: categoryOf(model.url),
    year: yearOf(model),
    fuelType: fuelOf(keySpecs),
    transmission: keySpecs.transmision || null,
    price: model.price?.value ?? null,
    priceRaw: model.price?.raw ?? null,
    hero,
    image,
    trims: model.trims.map((t) => ({ id: t.id, name: t.name })),
    colors,
    interiors,
    keySpecs,
  };
}

async function main() {
  const out = [];
  for (const model of models) {
    const built = await buildModel(model);
    out.push(built);
    console.log(`- ${built.id}: ${built.colors.length} colores, ${built.trims.length} trims, ${built.interiors.length} interiors`);
  }
  fs.writeFileSync(path.join(ROOT, 'scraped', 'catalog.json'), JSON.stringify({ source: chevrolet.source, models: out }, null, 2));

  // Manifiesto sin duplicados
  const seen = new Set();
  const unique = manifest.filter((m) => {
    if (seen.has(m.src)) return false;
    seen.add(m.src);
    return true;
  });
  fs.writeFileSync(path.join(ROOT, 'scraped', 'images.manifest.json'), JSON.stringify(unique, null, 2));
  const kindCount = unique.reduce((a, m) => ((a[m.kind] = (a[m.kind] || 0) + 1), a), {});
  console.log(`\nImágenes a optimizar: ${unique.length}`, kindCount);
}

main();
