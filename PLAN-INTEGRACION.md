# Integración: Catálogo Real Chevrolet AR → Demo NovaMotors

> **Objetivo**: reemplazar el catálogo ficticio (6 autos, imágenes Unsplash, colores "de mentira")
> por el **catálogo real de chevrolet.com.ar** (9 modelos: Onix, Onix Plus, Tracker, Spin, Sonic,
> Trailblazer, Montana, S10, Silverado), con **fotos reales por color**, **specs desde las Fichas
> Técnicas (PDF)** y **hex derivado del chip de cada color**. El agente/ CopilotKit sigue leyendo
> toda la data nueva.

## Decisiones tomadas
1. **Catálogo ampliado**: se usan los 9 modelos reales con sus nombres reales (no mapping ficticio).
2. **Hex automático**: se deriva del color dominante del chip PNG (build-time, con `sharp`).
3. **Foto real por color**: se elimina el overlay `mix-blend-color` del showroom; cada color tiene su imagen.
4. **Specs desde PDF**: las Fichas Técnicas de cada modelo se parsean a `scraped/specs.json`.
5. **Peso < 5 MB**: las imágenes referenciadas se optimizan a **WebP** y se eliminan los duplicados por trim
   (128 exteriores → 45 colores únicos; total 57 MB → **2.46 MB**).
6. **Precios reales** (ARS, solo 3 modelos publican precio); el resto muestra "Consultar".
7. Imágenes son marca Chevrolet → material de referencia/demo, no catálogo oficial.

## Pipeline (reproducible)
```bash
node scripts/scrape-chevrolet.mjs     # 1) modelos + trims/colores + imágenes (si se re-escrapea)
python scripts/scrape_specs.py        # 2) Fichas Técnicas PDF → scraped/specs.json
node scripts/build_catalog.mjs        # 3) catalog.json + hex + images.manifest.json
node scripts/optimize_images.mjs      # 4) WebP (125 imgs) + borra no referenciadas
node scripts/gen_cars_ts.mjs          # 5) src/data/cars.generated.ts
```
Nota: los 9 PDFs ya están en `scraped/fichas/` (2 MB); los pasos 1-4 son idempotentes.

## Datos
| Artefacto | Descripción |
| :--- | :--- |
| `scraped/chevrolet.json` | 9 modelos · 25 trims · 128 colores exteriores · 33 interiores (guiado) |
| `scraped/specs.json` | 9 modelos · trims + secciones + `keySpecs` (potencia, torque, motor, transmisión, dimensiones, capacidades) |
| `scraped/catalog.json` | Catálogo unificado (categoría, año, combustible, precio, colores con hex/imagen, trims, keySpecs) |
| `public/cars/**` | 125 WebP referenciadas (heroes, exteriores por color, chips, interiores) — 2.46 MB |
| `src/data/cars.generated.ts` | `CARS_DATA: Car[]` (9 modelos) generado desde catalog.json |

## Dónde vive cada cosa
| Pieza | Ubicación |
| :--- | :--- |
| Tipo `Car` (extendido) | `src/types/agent-protocol.ts` — `CarColor` con `image/chip`; `CarSpecs` con motor/potencia/torque/dimensiones/capacidades; `category` `Auto|SUV|Pick-up`; `price` nullable |
| Datos | `src/data/cars.ts` re-exporta `src/data/cars.generated.ts` |
| Catálogo | `src/components/CarCatalog.tsx` — filtros reales, precio ARS, specs reales |
| Showroom | `src/components/DealershipShowroom.tsx` — imagen por color (sin tinte), specs reales |
| Finance | `src/components/FinanceCalculator.tsx` — precio nullable → "Consultar" |
| Ficha para el agente | `src/lib/vehicle-detail.ts` — specs/colores/versiones reales |
| Agente | `src/components/CopilotIntegration.tsx` — IDs reales, categorías/motorización reales |
| Estado inicial | `src/context/AgentUIContext.tsx` — primer modelo/color real |

## Scripts
| Script | Rol |
| :--- | :--- |
| `scripts/scrape-chevrolet.mjs` | Scrapea modelos/trims/colores + descarga imágenes a `public/cars` |
| `scripts/scrape_specs.py` | Descarga y parsea Fichas Técnicas PDF → `scraped/specs.json` |
| `scripts/build_catalog.mjs` | Unifica data, deriva hex, emite catalog.json + manifest de imágenes |
| `scripts/optimize_images.mjs` | WebP (exterior/interior 1100px q72, hero 1600px q72, chip 128px) y borra duplicados |
| `scripts/gen_cars_ts.mjs` | Genera `src/data/cars.generated.ts` (subtítulo/descripción sintetizados) |

## Verificación
```bash
npx tsc --noEmit
npm run lint
npm run build
# smoke: dev server en :3000, GET / y una imagen .webp -> 200 image/webp
```

## Riesgos / pendientes
| Item | Estado |
| :--- | :--- |
| `sonic` sin colorizer → sin colores ni imagen por color (solo hero) | Ok |
| Hex derivado del chip con borde/reflejo → revisión visual | Revisar en navegador |
| `keySpecs` de algunas fichas incompletos (p.ej. onix sin `motor` explícito) | Aceptable; secciones completas |
| Precios solo en 3 modelos | UI muestra "Consultar" |