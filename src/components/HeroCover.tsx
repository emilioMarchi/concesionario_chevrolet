'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Car as CarIcon } from 'lucide-react';
import { useAgentUI } from '@/context/AgentUIContext';
import { CARS_DATA } from '@/data/cars';
import { formatPrice } from '@/lib/format';

const CURATED_ORDER = [
  'onix-auto-moderno',
  'tracker-suv',
  'montana-pickup',
  'onix-plus',
  's10',
];

export function HeroCover() {
  const { dispatch } = useAgentUI();

  const featured = useMemo(() => {
    const byId = new Map(CARS_DATA.map((c) => [c.id, c]));
    const ordered = CURATED_ORDER.map((id) => byId.get(id)).filter(
      (c): c is (typeof CARS_DATA)[number] => Boolean(c && c.hero)
    );
    return ordered.length > 0 ? ordered : CARS_DATA.filter((c) => c.hero);
  }, []);

  const [index, setIndex] = useState(0);
  const car = featured[index];

  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % featured.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [featured.length]);

  if (!car) return null;

  const askAgent = () => {
    dispatch({
      type: 'ASK_AGENT',
      message: `Hola, me interesa el ${car.name}. ¿Me contás sus versiones, equipamiento y opciones de financiación?`,
    });
  };

  return (
    <section className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center min-h-full">
        {/* Columna editorial */}
        <div className="space-y-6 sm:space-y-7 order-2 lg:order-1">
          <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase text-zinc-500">
            <Sparkles className="w-3.5 h-3.5" />
            Asesor experto disponible 24/7
          </span>

          <div className="space-y-4 sm:space-y-5">
            <h1 className="text-3xl sm:text-5xl lg:text-[3.4rem] font-semibold tracking-tight text-zinc-900 leading-[1.05]">
              Elegí mejor.
              <br />
              <span className="text-zinc-400">Manejá tranquilo.</span>
            </h1>
            <p className="text-zinc-500 text-sm sm:text-base leading-relaxed max-w-md">
              Compará modelos, configurá colores y simulá tu financiación en minutos.
              Nuestro asesor virtual te acompaña en cada paso.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={askAgent}
              className="group px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full font-medium text-sm transition-colors flex items-center gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              Hablá con el asesor
              <ArrowRight className="w-4 h-4 -translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </button>
            <button
              onClick={() => dispatch({ type: 'NAVIGATE', section: 'models' })}
              className="px-5 py-3 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 rounded-full font-medium text-sm transition-colors flex items-center gap-2"
            >
              <CarIcon className="w-4 h-4 text-zinc-500" />
              Explorar modelos
            </button>
          </div>

          {/* Meta del modelo destacado */}
          <div className="pt-4 border-t border-zinc-200 flex items-center gap-6 text-xs">
            <div>
              <p className="text-zinc-400 uppercase tracking-wider text-[10px]">Destacado</p>
              <p className="text-zinc-800 font-medium">{car.name}</p>
            </div>
            <div>
              <p className="text-zinc-400 uppercase tracking-wider text-[10px]">Desde</p>
              <p className="text-zinc-800 font-medium font-mono">{formatPrice(car.price)}</p>
            </div>
            <div>
              <p className="text-zinc-400 uppercase tracking-wider text-[10px]">Tipo</p>
              <p className="text-zinc-800 font-medium">{car.category}</p>
            </div>
          </div>
        </div>

        {/* Imagen de portada */}
        <div className="order-1 lg:order-2">
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-zinc-100 border border-zinc-200 shadow-sm">
            <AnimatePresence mode="wait">
              <motion.img
                key={car.id}
                src={car.hero ?? car.image}
                alt={car.name}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </AnimatePresence>

            <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/45 to-transparent">
              <p className="text-white text-sm font-medium tracking-tight">{car.name}</p>
              <p className="text-white/70 text-xs">{car.subtitle}</p>
            </div>

            {featured.length > 1 && (
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                {featured.map((c, i) => (
                  <button
                    key={c.id}
                    aria-label={`Ver ${c.name}`}
                    onClick={() => setIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
