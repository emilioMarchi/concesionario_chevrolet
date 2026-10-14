// Genera src/data/cars.generated.ts a partir de scraped/catalog.json
//
// Uso:  node scripts/gen_cars_ts.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'scraped', 'catalog.json'), 'utf8'));

const FUEL_LABEL = { Gasolina: 'Nafta', Diesel: 'Diésel', Electrico: 'Eléctrico', Hibrido: 'Híbrido' };

function shortTransmission(t) {
  if (!t) return null;
  return t
    .replace(/\s+de\s+/g, ' ')
    .replace(/velocidades/gi, 'vel.')
    .trim();
}

function buildSubtitle(m) {
  const parts = [m.category, FUEL_LABEL[m.fuelType] || m.fuelType, shortTransmission(m.transmission)];
  return parts.filter(Boolean).join(' · ');
}

function buildDescription(m) {
  const k = m.keySpecs || {};
  const bits = [];
  const fuel = FUEL_LABEL[m.fuelType] || m.fuelType;
  bits.push(`${m.name}: ${m.category.toLowerCase()} del año ${m.year}${fuel ? ` a ${fuel}` : ''}${k.motor ? ` con motor ${k.motor}` : ''}.`);
  const dyn = [];
  if (k.potencia) dyn.push(`potencia ${k.potencia}`);
  if (k.torque) dyn.push(`torque ${k.torque}`);
  if (k.transmision) dyn.push(`transmisión ${k.transmision}`);
  if (dyn.length) bits.push(`Ofrece ${dyn.join(', ')}.`);
  const dims = [];
  if (k.largo) dims.push(`largo ${k.largo} mm`);
  if (k.ancho) dims.push(`ancho ${k.ancho} mm`);
  if (k.altura) dims.push(`alto ${k.altura} mm`);
  if (k.entreEjes) dims.push(`distancia entre ejes ${k.entreEjes} mm`);
  if (dims.length) bits.push(`Dimensiones: ${dims.join(', ')}.`);
  const cap = [];
  if (k.tanque) cap.push(`tanque de ${k.tanque} L`);
  if (k.baul) cap.push(`baúl/caja de ${k.baul} L`);
  if (cap.length) bits.push(`Capacidades: ${cap.join(', ')}.`);
  if (m.colors.length) bits.push(`${m.colors.length} colores disponibles.`);
  if (m.trims.length) bits.push(`Versiones: ${m.trims.map((t) => t.name).join(', ')}.`);
  return bits.join(' ');
}

function buildSpecs(m) {
  const k = m.keySpecs || {};
  const specs = {
    engine: k.motor ?? null,
    power: k.potencia ?? null,
    torque: k.torque ?? null,
    transmission: k.transmision ?? null,
  };
  const dims = {
    length: k.largo,
    width: k.ancho,
    height: k.altura,
    wheelbase: k.entreEjes,
    groundClearance: k.despeje,
  };
  const cap = { fuelTank: k.tanque, trunk: k.baul, seats: k.plazas };
  if (Object.values(dims).some(Boolean)) specs.dimensions = dims;
  if (Object.values(cap).some(Boolean)) specs.capacity = cap;
  return specs;
}

const cars = catalog.models.map((m) => ({
  id: m.id,
  name: m.name,
  subtitle: buildSubtitle(m),
  description: buildDescription(m),
  category: m.category,
  price: m.price,
  priceRaw: m.priceRaw ?? null,
  image: m.image || m.hero || '',
  hero: m.hero ?? null,
  colors: m.colors.map((c) => ({ id: c.id, name: c.name, hex: c.hex, image: c.image ?? null, chip: c.chip ?? null })),
  fuelType: m.fuelType,
  transmission: m.transmission || '',
  year: m.year,
  featured: m.price != null,
  specs: buildSpecs(m),
  trims: m.trims.map((t) => ({ id: t.id, name: t.name })),
  keySpecs: m.keySpecs ?? {},
}));

const banner = `// ARCHIVO GENERADO por scripts/gen_cars_ts.mjs — no editar a mano.\n// Fuente: scraped/catalog.json\n\n`;
const content =
  banner +
  `import type { Car } from '@/types/agent-protocol';\n\n` +
  `export const CARS_DATA: Car[] = ${JSON.stringify(cars, null, 2)};\n`;

const dest = path.join(ROOT, 'src', 'data', 'cars.generated.ts');
fs.writeFileSync(dest, content, 'utf8');
console.log(`Generado ${path.relative(ROOT, dest)} con ${cars.length} modelos`);
