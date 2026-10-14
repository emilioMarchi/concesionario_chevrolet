'use client';

import React from 'react';
import { useAgentUI } from '@/context/AgentUIContext';
import { CARS_DATA } from '@/data/cars';
import { formatPrice } from '@/lib/format';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Gauge, Calendar, ShieldCheck, SlidersHorizontal } from 'lucide-react';

export function DealershipShowroom() {
  const { state, dispatch } = useAgentUI();

  const selectedCar = CARS_DATA.find((c) => c.id === state.selectedCarId) || CARS_DATA[0];
  const activeColor = selectedCar.colors.find((c) => c.hex === state.selectedColor) || selectedCar.colors[0];
  const carImage = activeColor?.image || selectedCar.image;

  return (
    <div className="h-full max-w-7xl mx-auto w-full p-2 sm:p-4 md:p-6 flex flex-col overflow-hidden">
      {/* Header: sólo desktop (en mobile el auto manda) */}
      <div className="hidden lg:flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3 shrink-0">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white tracking-tight truncate">Visor Showroom</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Inspección de alta resolución con simulación de acabados y personalización por IA.
          </p>
        </div>
        <button
          onClick={() => dispatch({ type: 'NAVIGATE', section: 'models' })}
          className="shrink-0 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-300 transition-colors flex items-center gap-1.5"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" /> Ver catálogo completo
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-3 gap-3 lg:gap-6 lg:pt-4">
        {/* Visor principal: en mobile es TODO el área */}
        <div className="relative flex-1 min-h-0 lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl lg:rounded-3xl overflow-hidden lg:p-5 flex flex-col lg:gap-4 shadow-2xl backdrop-blur-md">
          {/* Info en columna superior (desktop) */}
          <div className="hidden lg:flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <span className="px-2.5 py-0.5 bg-slate-950/80 border border-slate-800 text-zinc-300 rounded-md text-[10px] font-semibold tracking-wider">
                {selectedCar.category}
              </span>
              <h2 className="text-2xl font-extrabold text-white tracking-tight mt-1 truncate">
                {selectedCar.name}
              </h2>
              <p className="text-xs text-slate-400 line-clamp-1">{selectedCar.subtitle}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs text-slate-400 block font-mono">Precio</span>
              <span className="text-2xl font-bold text-white font-mono">{formatPrice(selectedCar.price)}</span>
            </div>
          </div>

          {/* Imagen del auto: ocupa el máximo espacio disponible */}
          <div className="relative flex-1 min-h-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${selectedCar.id}-${carImage}`}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.35 }}
                className="absolute inset-0 flex items-center justify-center p-1.5 lg:p-2"
              >
                <img
                  src={carImage}
                  alt={selectedCar.name}
                  className="max-h-full max-w-full object-contain drop-shadow-2xl"
                />
              </motion.div>
            </AnimatePresence>

            {/* Overlay mobile: nombre + precio arriba */}
            <div className="lg:hidden absolute inset-x-0 top-0 p-3 bg-gradient-to-b from-slate-950/85 via-slate-950/35 to-transparent flex items-start justify-between gap-2 pointer-events-none">
              <div className="min-w-0">
                <span className="inline-block px-2 py-0.5 bg-slate-950/70 border border-slate-700 text-zinc-200 rounded-md text-[10px] font-semibold tracking-wider">
                  {selectedCar.category}
                </span>
                <h2 className="text-sm font-bold text-white tracking-tight mt-1 truncate">
                  {selectedCar.name}
                </h2>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-300 block font-mono">Precio</span>
                <span className="text-sm font-bold text-white font-mono">{formatPrice(selectedCar.price)}</span>
              </div>
            </div>

            {/* Etiqueta de color (desktop) */}
            <div className="hidden lg:block absolute bottom-3 left-3 px-2.5 py-1 bg-slate-950/85 backdrop-blur-md text-[11px] text-slate-200 rounded-lg border border-slate-800">
              {activeColor?.name ?? ''}
            </div>

            {/* Overlay mobile: acabados + acción abajo */}
            <div className="lg:hidden absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 bg-slate-950/70 p-1.5 rounded-xl border border-slate-700">
                {selectedCar.colors.length === 0 && (
                  <span className="text-[11px] text-slate-400 px-1">Sin variantes</span>
                )}
                {selectedCar.colors.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => dispatch({ type: 'CHANGE_COLOR', color: c.hex })}
                    title={c.name}
                    className={`w-5 h-5 rounded-full border transition-transform ${
                      state.selectedColor === c.hex ? 'border-white scale-110 shadow-md' : 'border-slate-600'
                    }`}
                    style={
                      c.chip
                        ? { backgroundImage: `url(${c.chip})`, backgroundSize: 'cover' }
                        : { backgroundColor: c.hex }
                    }
                  />
                ))}
              </div>
              <button
                onClick={() => dispatch({ type: 'OPEN_TEST_DRIVE', carId: selectedCar.id })}
                className="shrink-0 px-3 py-2 bg-zinc-200 hover:bg-white text-zinc-950 font-bold text-[11px] rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" /> Probar
              </button>
            </div>
          </div>

          {/* Ficha técnica + acabado (desktop) */}
          <div className="hidden lg:flex items-center justify-between gap-3 pt-3 border-t border-slate-800/80 shrink-0">
            <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-zinc-400" /> {selectedCar.specs.power || selectedCar.specs.engine || '—'}
              </span>
              <span className="flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-zinc-400" /> {selectedCar.specs.torque || '—'}
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" /> {selectedCar.transmission || selectedCar.fuelType}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Acabado:</span>
              <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
                {selectedCar.colors.length === 0 && <span className="text-xs text-slate-500 px-1">Sin variantes</span>}
                {selectedCar.colors.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => dispatch({ type: 'CHANGE_COLOR', color: c.hex })}
                    title={c.name}
                    className={`w-5 h-5 rounded-full border transition-transform ${
                      state.selectedColor === c.hex ? 'border-white scale-110 shadow-md' : 'border-slate-700 hover:scale-105'
                    }`}
                    style={
                      c.chip
                        ? { backgroundImage: `url(${c.chip})`, backgroundSize: 'cover' }
                        : { backgroundColor: c.hex }
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Panel lateral: sólo desktop */}
        <div className="hidden lg:flex flex-col gap-3 min-h-0">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 flex flex-col gap-3 flex-1 min-h-0">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
              Modelos en Exhibición
            </h3>
            <div className="flex flex-col gap-2 overflow-y-auto pr-1 custom-scrollbar min-h-0">
              {CARS_DATA.map((car) => (
                <div
                  key={car.id}
                  onClick={() => dispatch({ type: 'SELECT_CAR', carId: car.id })}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-1 ${
                    state.selectedCarId === car.id
                      ? 'bg-slate-800 border-zinc-500 shadow-md'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0 w-full">
                    <h4 className="font-semibold text-white text-xs truncate">{car.name}</h4>
                    <p className="text-[11px] font-mono text-slate-400">{formatPrice(car.price)}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-900 text-slate-300 rounded border border-slate-800 shrink-0">
                    {car.category}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 shrink-0">
            <button
              onClick={() => dispatch({ type: 'OPEN_TEST_DRIVE', carId: selectedCar.id })}
              className="w-full py-2.5 bg-zinc-200 hover:bg-white text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" /> Agendar Prueba de Manejo
            </button>
            <button
              onClick={() => dispatch({ type: 'NAVIGATE', section: 'finance' })}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
            >
              Simular Financiación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
