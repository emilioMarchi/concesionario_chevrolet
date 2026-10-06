'use client';

import React from 'react';
import { useAgentUI } from '@/context/AgentUIContext';
import { CARS_DATA } from '@/data/cars';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Gauge, Calendar, ShieldCheck, Sparkles, SlidersHorizontal } from 'lucide-react';

export function DealershipShowroom() {
  const { state, dispatch } = useAgentUI();

  const selectedCar = CARS_DATA.find((c) => c.id === state.selectedCarId) || CARS_DATA[0];

  return (
    <div className="h-full max-w-7xl mx-auto p-6 flex flex-col justify-between space-y-4 overflow-hidden">
      {/* Header Compacto & Subtítulo Sobrio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Visor Interactivo Showroom
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Inspección de alta resolución con simulación de acabados y personalización por IA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => dispatch({ type: 'NAVIGATE', section: 'models' })}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-300 transition-colors flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Ver Catálogo Completo
          </button>
        </div>
      </div>

      {/* Main Experience Grid adaptado al viewport */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center min-h-0">
        {/* Visor Principal del Auto */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-full shadow-2xl backdrop-blur-md">
          {/* Header Info Car */}
          <div className="flex items-center justify-between z-10">
            <div>
              <span className="px-2.5 py-0.5 bg-slate-950/80 border border-slate-800 text-zinc-300 rounded-md text-[10px] font-semibold tracking-wider">
                {selectedCar.category}
              </span>
              <h2 className="text-2xl font-extrabold text-white tracking-tight mt-1">{selectedCar.name}</h2>
              <p className="text-xs text-slate-400">{selectedCar.subtitle}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-mono">Precio de Lista</span>
              <span className="text-2xl font-bold text-white font-mono">${selectedCar.price.toLocaleString()}</span>
            </div>
          </div>

          {/* Render con Animación y tinte de Color */}
          <div className="relative flex-1 my-4 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedCar.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35 }}
                className="relative rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full"
              >
                <img
                  src={selectedCar.image}
                  alt={selectedCar.name}
                  className="w-full h-60 sm:h-72 object-cover rounded-2xl"
                />
                {/* Overlay dinámico con el color seleccionado */}
                <div
                  className="absolute inset-0 mix-blend-color opacity-45 transition-colors duration-500 pointer-events-none"
                  style={{ backgroundColor: state.selectedColor }}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Ficha Técnica y Selectores de Color */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80 z-10">
            {/* Specs */}
            <div className="flex items-center gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-zinc-400" /> {selectedCar.specs.power}</span>
              <span className="flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5 text-zinc-400" /> {selectedCar.specs.acceleration}</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-zinc-400" /> {selectedCar.specs.topSpeed}</span>
            </div>

            {/* Selector de Color Sobrio */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Acabado:</span>
              <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
                {selectedCar.colors.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => dispatch({ type: 'CHANGE_COLOR', color: c.hex })}
                    title={c.name}
                    className={`w-5 h-5 rounded-full border transition-transform ${
                      state.selectedColor === c.hex ? 'border-white scale-110 shadow-md' : 'border-slate-700 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Panel Lateral: Selección Rápida & Acciones */}
        <div className="space-y-3 h-full flex flex-col justify-between">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Modelos en Exhibición</h3>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                {CARS_DATA.map((car) => (
                  <div
                    key={car.id}
                    onClick={() => dispatch({ type: 'SELECT_CAR', carId: car.id })}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      state.selectedCarId === car.id
                        ? 'bg-slate-800 border-zinc-500 shadow-md'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <h4 className="font-semibold text-white text-xs">{car.name}</h4>
                      <p className="text-[11px] font-mono text-slate-400">${car.price.toLocaleString()}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-900 text-slate-300 rounded border border-slate-800">
                      {car.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones Directas */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
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
    </div>
  );
}
