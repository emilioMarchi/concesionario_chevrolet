import { CARS_DATA } from '@/data/cars';
import { formatPrice } from '@/lib/format';
import type { Car } from '@/types/agent-protocol';

// Segundo nivel de datos del catálogo. El estado de pantalla sólo publica un
// índice básico (id, modelo, categoría, precio, motor, año); el detalle de cada
// modelo se pide por acá, para que el modelo nunca tenga que inventarlo.
const DETAIL_GETTERS: Record<string, (car: Car) => string> = {
  description: (c) => c.description,
  specs: (c) => [
    `Motor: ${c.specs.engine || 'n/d'}`,
    `Potencia: ${c.specs.power || 'n/d'}`,
    `Torque: ${c.specs.torque || 'n/d'}`,
    `Caja: ${c.transmission || 'n/d'}`,
    `Dim: ${c.specs.dimensions?.length ? `L ${c.specs.dimensions.length}mm` : ''}${c.specs.dimensions?.width ? ` · A ${c.specs.dimensions.width}mm` : ''}${c.specs.dimensions?.height ? ` · H ${c.specs.dimensions.height}mm` : ''}${c.specs.dimensions?.wheelbase ? ` · EB ${c.specs.dimensions.wheelbase}mm` : ''}`,
    `Capacidades: ${c.specs.capacity?.fuelTank ? `Tanque ${c.specs.capacity.fuelTank}L` : ''}${c.specs.capacity?.trunk ? ` · Baúl ${c.specs.capacity.trunk}L` : ''}`,
  ].filter(Boolean).join(' | '),
  colors: (c) => c.colors.map((color) => `${color.name} (${color.hex})`).join(', '),
  transmission: (c) => c.transmission,
  subtitle: (c) => c.subtitle,
  price: (c) => formatPrice(c.price),
  fuelType: (c) => c.fuelType,
  year: (c) => String(c.year),
  category: (c) => c.category,
};

export const DETAIL_HINT = Object.keys(DETAIL_GETTERS).join(', ');

function fullSpec(car: Car): string {
  return [
    `Categoría: ${car.category} | Año: ${car.year} | Precio: ${formatPrice(car.price)} | Motor: ${car.fuelType}`,
    `Caja: ${car.transmission}`,
    `Bajada: ${car.subtitle}`,
    `Descripción: ${car.description}`,
    `Specs: ${DETAIL_GETTERS.specs(car)}`,
    `Versiones: ${(car.trims ?? []).map((t) => t.name).join(', ') || 'n/d'}`,
    `Colores: ${DETAIL_GETTERS.colors(car)}`,
  ].join('\n  ');
}

export function formatVehicleDetail(car: Car, requested: string): string {
  const head = `${car.name} [${car.id}]`;
  const wanted = (requested ?? '').trim();
  if (!wanted || wanted.toLowerCase() === 'all') return `${head}\n  ${fullSpec(car)}`;

  const getter =
    DETAIL_GETTERS[wanted] ??
    Object.entries(DETAIL_GETTERS).find(([key]) => key.toLowerCase() === wanted.toLowerCase())?.[1];

  if (!getter) {
    return `${head}\n  Característica "${wanted}" no existe. Disponibles: ${DETAIL_HINT}, all.`;
  }
  return `${head}\n  ${getter(car)}`;
}

export function getVehicleInfo(carId?: string, detail?: string): string {
  const requested = typeof carId === 'string' ? carId.trim() : '';

  if (requested && requested.toLowerCase() !== 'all') {
    const car = CARS_DATA.find((c) => c.id === requested);
    if (!car) {
      return `No existe el modelo "${requested}". IDs válidos: ${CARS_DATA.map((c) => c.id).join(', ')}`;
    }
    return formatVehicleDetail(car, detail ?? '');
  }

  return CARS_DATA.map((c) => formatVehicleDetail(c, detail ?? '')).join('\n\n');
}
