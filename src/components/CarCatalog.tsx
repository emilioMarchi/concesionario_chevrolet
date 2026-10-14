'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { useAgentUI } from '@/context/AgentUIContext';
import { CARS_DATA } from '@/data/cars';
import { formatPrice } from '@/lib/format';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, Calendar, Eye, ShieldCheck, Zap } from 'lucide-react';
import type { CarCategory, FuelType } from '@/types/agent-protocol';

const CATEGORIES: { label: string; value: string }[] = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Autos', value: 'Auto' },
  { label: 'SUVs', value: 'SUV' },
  { label: 'Camionetas', value: 'Pick-up' },
];

const FUELS: { label: string; value: string }[] = [
  { label: 'Cualquier Motor', value: 'ALL' },
  { label: 'Nafta', value: 'Gasolina' },
  { label: 'Diésel', value: 'Diesel' },
  { label: 'Híbrido', value: 'Hibrido' },
];

export function CarCatalog() {
  const { state, dispatch } = useAgentUI();
  const { filters } = state;
  const [showFilters, setShowFilters] = useState(false);

  const filteredCars = CARS_DATA.filter((car) => {
    const matchesCategory = filters.category === 'ALL' || car.category === filters.category;
    const matchesFuel = filters.fuelType === 'ALL' || car.fuelType === filters.fuelType;
    const matchesPrice = car.price == null || car.price <= filters.maxPrice;
    const matchesQuery =
      !filters.searchQuery ||
      car.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      car.subtitle.toLowerCase().includes(filters.searchQuery.toLowerCase());

    return matchesCategory && matchesFuel && matchesPrice && matchesQuery;
  });

  return (
      <div className="min-h-full flex flex-col p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full gap-3 sm:gap-4">
      {/* Header & Barra de Filtros Compacta */}
      <div className="bg-slate-900/80 border border-slate-800/80 backdrop-blur-md rounded-2xl p-3 sm:p-4 flex flex-col gap-3 shadow-xl shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-white tracking-tight truncate">
              Modelos NovaMotors
            </h1>
            <p className="hidden sm:block text-xs text-slate-400 mt-0.5">
              Filtra manualmente o pídeselo al asistente por chat.
            </p>
          </div>

          {/* Búsqueda Directa */}
          <div className="relative flex-1 sm:flex-none sm:min-w-[240px] max-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar..."
              value={filters.searchQuery}
              onChange={(e) => dispatch({ type: 'FILTER_CARS', searchQuery: e.target.value })}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Categorías + toggle de filtros avanzados */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => dispatch({ type: 'FILTER_CARS', category: cat.value as CarCategory | 'ALL' })}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all whitespace-nowrap ${
                  filters.category === cat.value
                    ? 'bg-zinc-200 text-zinc-950 font-semibold shadow'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`lg:hidden shrink-0 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 transition-colors ${
              showFilters ? 'bg-zinc-200 text-zinc-950 font-semibold' : 'bg-slate-800/80 text-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros
          </button>
        </div>

        {/* Filtros avanzados: colapsables en mobile, siempre visibles en desktop */}
        <div
          className={clsx(
            'flex flex-wrap items-center gap-x-4 gap-y-2 text-xs',
            showFilters ? 'flex' : 'hidden lg:flex'
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-400 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Motor:
            </span>
            <select
              value={filters.fuelType}
              onChange={(e) => dispatch({ type: 'FILTER_CARS', fuelType: e.target.value as FuelType | 'ALL' })}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
            >
              {FUELS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <span className="text-slate-400 whitespace-nowrap">Máx. Precio:</span>
            <input
              type="range"
              min="20000000"
              max="50000000"
              step="1000000"
              value={filters.maxPrice}
              onChange={(e) => dispatch({ type: 'SET_PRICE_RANGE', maxPrice: Number(e.target.value) })}
              className="accent-zinc-300 flex-1 min-w-[80px] cursor-pointer"
            />
            <span className="text-zinc-200 font-mono text-xs font-semibold whitespace-nowrap">${filters.maxPrice.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Grilla de Autos */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {filteredCars.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl text-center p-6">
            <p className="text-slate-400 text-sm">No se encontraron vehículos que coincidan con los filtros seleccionados.</p>
            <button
              onClick={() => dispatch({ type: 'FILTER_CARS', category: 'ALL', maxPrice: 50000000, fuelType: 'ALL', searchQuery: '' })}
              className="mt-3 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-zinc-300 rounded-xl transition-colors"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
            <AnimatePresence mode="popLayout">
              {filteredCars.map((car) => (
                <motion.div
                  key={car.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 rounded-2xl overflow-hidden flex flex-col justify-between group shadow-lg hover:shadow-2xl transition-all"
                >
                  <div>
                    {/* Imagen y Badges */}
                    <div className="relative h-40 sm:h-44 overflow-hidden bg-slate-950">
                      <img
                        src={car.image}
                        alt={car.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 bg-slate-950/80 backdrop-blur-md text-zinc-300 text-[10px] font-semibold tracking-wider rounded-md border border-slate-800">
                          {car.category}
                        </span>
                        {car.featured && (
                          <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-semibold tracking-wider rounded-md border border-amber-500/30 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Destacado
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-slate-950/90 backdrop-blur-md font-mono text-xs font-bold text-white rounded-lg border border-slate-800">
                        {formatPrice(car.price)}
                      </div>
                    </div>

                    {/* Contenido Info */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-bold text-white text-base tracking-tight">{car.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{car.subtitle}</p>
                      </div>

                      {/* Micro Specs */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{car.specs.power || car.specs.engine || '—'}</span>
                        </div>
                        <div className="text-slate-400 text-right">
                          <span>{car.specs.torque || car.transmission}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Acciones de la Tarjeta */}
                  <div className="p-4 pt-0 flex items-center gap-2">
                    <button
                      onClick={() => {
                        dispatch({ type: 'SELECT_CAR', carId: car.id });
                        dispatch({ type: 'NAVIGATE', section: 'showroom' });
                      }}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-zinc-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" /> Showroom
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'OPEN_TEST_DRIVE', carId: car.id })}
                      className="flex-1 py-2 bg-zinc-200 hover:bg-white text-zinc-950 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5" /> Probar
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
