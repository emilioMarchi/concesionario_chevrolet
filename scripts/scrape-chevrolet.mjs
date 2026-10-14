import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BASE = 'https://www.chevrolet.com.ar';
const START_URL = process.env.SCRAPE_URL || `${BASE}/autos-0km`;
const OUT_JSON = path.resolve('scraped/chevrolet.json');
const IMG_DIR = path.resolve('public/cars');
const IMG_WIDTH = Number(process.env.IMG_WIDTH || 1600);
const DRY = process.argv.includes('--dry');
const NO_IMAGES = process.argv.includes('--no-images');

const MODEL_RE = /\/(?:autos-0km|camionetas-suv|camionetas-pick-up)\/[a-z0-9-]+/g;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36';

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

async function fetchBuffer(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function slugify(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function imgUrl(damPath, width = IMG_WIDTH) {
  if (!damPath) return null;
  if (/^https?:/i.test(damPath)) return damPath;
  let p = damPath;
  const idx = p.indexOf('/content/dam/');
  if (idx > 0) p = p.slice(idx);
  else if (!p.startsWith('/')) p = `/${p}`;
  const clean = p.replace(/([?&])imwidth=\d+/g, '$1').replace(/[?&]$/, '');
  const sep = clean.includes('?') ? '&' : '?';
  return `${BASE}${clean}${sep}imwidth=${width}`;
}

function extFromPath(p, fallback = 'jpg') {
  const m = /\.([a-z0-9]{3,4})(?:\?|$)/i.exec(p || '');
  return m ? m[1].toLowerCase() : fallback;
}

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTitleName(html, slug) {
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (h1) {
    const text = decode(h1[1].replace(/<[^>]+>/g, ' '));
    if (text) return text;
  }
  const t = /<title>([^<]*)<\/title>/i.exec(html);
  if (t) {
    const name = decode(t[1]).split('|')[0].split('–')[0].split('-')[0].trim();
    if (name) return name;
  }
  return slug;
}

function parsePrice(html) {
  const m = /Desde:\s*\$?\s*([\d.\s]+)/i.exec(html);
  if (m) {
    const digits = m[1].replace(/[^\d]/g, '');
    if (digits) return { raw: `Desde: $ ${m[1].trim()}`, value: Number(digits) };
  }
  return null;
}

function parseHeroImage(html, slug) {
  const token = slug.split('-')[0].toLowerCase();
  const tags = html.match(/<img\b[^>]*>/gi) || [];
  const candidates = [];
  for (const tag of tags) {
    const srcM = /src="(\/content\/dam\/[^"]+)"/i.exec(tag);
    if (!srcM) continue;
    const src = srcM[1];
    if (/\.svg(?:\?|$)/i.test(src)) continue;
    const alt = decode((/alt="([^"]*)"/i.exec(tag) || [, ''])[1]);
    const matchName = token.length > 1 && alt.toLowerCase().includes(token);
    if (matchName) return { path: src, alt };
    candidates.push({ path: src, alt });
  }
  return candidates[0] || null;
}

function parseColorizerEndpoint(html) {
  const m = /data-trims-json-endpoint="([^"]+)"/i.exec(html);
  return m ? decode(m[1]) : null;
}

function resolveFlipbook(exterior) {
  const fmt = exterior.flipbook?.desktopImagePathFormat || exterior.flipbook?.mobileImagePathFormat;
  const frames = Math.max(1, Number(exterior.flipbook?.numberOfFrames || 1));
  if (!fmt) return [];
  const out = [];
  for (let i = 1; i <= frames; i++) {
    out.push(fmt.replace('{framenumber}', String(i).padStart(3, '0')));
  }
  return out;
}

async function discoverModels() {
  const html = await fetchText(START_URL);
  const found = html.match(MODEL_RE) || [];
  return [...new Set(found)].sort();
}

async function scrapeModel(modelPath) {
  const slug = modelPath.split('/').pop();
  const url = BASE + modelPath;
  const html = await fetchText(url);
  const model = {
    slug,
    name: parseTitleName(html, slug),
    url,
    price: parsePrice(html),
    hero: null,
    colorizerEndpoint: parseColorizerEndpoint(html),
    trims: [],
  };

  const hero = parseHeroImage(html, slug);
  if (hero) model.hero = imgUrl(hero.path);

  if (model.colorizerEndpoint) {
    try {
      const json = JSON.parse(await fetchText(BASE + model.colorizerEndpoint));
      const item = json?.data?.colorizerModelByPath?.item;
      if (item) {
        model.colorizerTitle = item.name || null;
        model.trims = (item.trims || []).map((t) => ({
          id: t.trimId,
          name: t.name,
          exteriors: (t.exteriors || []).map((e) => ({
            id: e.exteriorId,
            name: e.name,
            chip: imgUrl(e.chipImgUrl?._path, 300),
            images: resolveFlipbook(e).map((p) => imgUrl(p)),
          })),
          interiors: (t.interiors || []).map((it) => ({
            id: it.interiorId,
            name: it.name,
            chip: imgUrl(it.chipImgUrl?._path, 300),
            images: (it.colorizerCarousel?.carouselSlides || []).map((s) =>
              imgUrl(s.desktopImgUrl?._path || s.mobileImgUrl?._path)
            ),
          })),
        }));
      }
    } catch (err) {
      model.colorizerError = err.message;
    }
  }
  return model;
}

async function download(url, dest) {
  if (existsSync(dest)) return 'cached';
  const buf = await fetchBuffer(url);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  return `ok:${buf.length}`;
}

async function downloadModelImages(model) {
  const results = [];
  const jobs = [];
  const root = path.join(IMG_DIR, model.slug);

  const add = (url, rel, label) => {
    if (!url) return;
    const ext = extFromPath(url);
    const dest = path.join(root, `${rel}.${ext}`);
    jobs.push(
      download(url, dest).then(
        (status) => results.push({ label, file: `/cars/${model.slug}/${rel}.${ext}`, status }),
        (err) => results.push({ label, file: null, status: `ERR:${err.message}` })
      )
    );
  };

  add(model.hero, 'hero', 'hero');

  for (const trim of model.trims) {
    const tSlug = slugify(trim.name);
    for (const e of trim.exteriors) {
      const cSlug = slugify(e.name);
      add(e.chip, `${tSlug}/exterior-${cSlug}-chip`, `exterior-chip:${trim.name}:${e.name}`);
      if (e.images[0]) add(e.images[0], `${tSlug}/exterior-${cSlug}`, `exterior:${trim.name}:${e.name}`);
      e.downloadedImage = e.images[0] ? `/cars/${model.slug}/${tSlug}/exterior-${cSlug}.${extFromPath(e.images[0])}` : null;
      e.downloadedChip = e.chip ? `/cars/${model.slug}/${tSlug}/exterior-${cSlug}-chip.${extFromPath(e.chip)}` : null;
    }
    for (const it of trim.interiors) {
      const cSlug = slugify(it.name).slice(0, 60);
      add(it.chip, `${tSlug}/interior-${cSlug}-chip`, `interior-chip:${trim.name}:${it.name}`);
      if (it.images[0]) add(it.images[0], `${tSlug}/interior-${cSlug}`, `interior:${trim.name}:${it.name}`);
      it.downloadedImage = it.images[0] ? `/cars/${model.slug}/${tSlug}/interior-${cSlug}.${extFromPath(it.images[0])}` : null;
      it.downloadedChip = it.chip ? `/cars/${model.slug}/${tSlug}/interior-${cSlug}-chip.${extFromPath(it.chip)}` : null;
    }
  }

  await Promise.all(jobs);
  return results;
}

async function main() {
  console.log(`Listing: ${START_URL}`);
  const models = await discoverModels();
  console.log(`Modelos encontrados (${models.length}): ${models.join(', ')}\n`);

  const data = [];
  for (const m of models) {
    process.stdout.write(`- ${m} ... `);
    try {
      const model = await scrapeModel(m);
      const colors = model.trims.reduce((n, t) => n + t.exteriors.length, 0);
      console.log(
        `OK  ${model.name} | trims=${model.trims.length} colores=${colors} precio=${model.price?.raw || 'n/d'}${model.colorizerError ? ' | COLORIZER-ERR:' + model.colorizerError : ''}`
      );
      data.push(model);
    } catch (err) {
      console.log(`ERROR ${err.message}`);
    }
  }

  if (DRY) {
    console.log('\n[dry-run] sin descargar imágenes. Muestra:');
    console.log(JSON.stringify(data[0], null, 2).slice(0, 2500));
    await mkdir(path.dirname(OUT_JSON), { recursive: true });
    await writeFile(OUT_JSON, JSON.stringify(data, null, 2));
    console.log(`\nJSON: ${OUT_JSON}`);
    return;
  }

  if (!NO_IMAGES) {
    console.log('\nDescargando imágenes...');
    for (const model of data) {
      const res = await downloadModelImages(model);
      const ok = res.filter((r) => r.status.startsWith('ok')).length;
      const cached = res.filter((r) => r.status === 'cached').length;
      const err = res.filter((r) => r.status.startsWith('ERR'));
      console.log(`  ${model.name}: ${ok} nuevas, ${cached} cacheadas, ${err.length} errores`);
      for (const e of err.slice(0, 5)) console.log(`    ! ${e.label} -> ${e.status}`);
    }
  }

  await mkdir(path.dirname(OUT_JSON), { recursive: true });
  await writeFile(OUT_JSON, JSON.stringify(data, null, 2));
  console.log(`\nJSON: ${OUT_JSON}`);
  console.log(`Imágenes: ${IMG_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
