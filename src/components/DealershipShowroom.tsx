'use client';

import React from 'react';
import { useAgentUI } from '@/context/AgentUIContext';
import { CARS_DATA } from '@/data/cars';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Gauge, Calendar, Car as CarIcon } from 'lucide-react';

export function DealershipShowroom() {
  const { state, dispatch } = useAgentUI();

  const filteredCars = CARS_DATA.filter((car) => {
    const { category, maxPrice } = state.filters;
    const matchesCategory = !category || category === 'ALL' || car.category === category;
    const matchesPrice = car.price <= maxPrice;
    return matchesCategory && matchesPrice;
  });

  const selectedCar = CARS_DATA.find((c) => c.id === state.selectedCarId) || CARS_DATA[0];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Showroom Interactivo</h1>
          <p className="text-slate-400 text-sm mt-1">
            Navega o pídele al agente de IA que configure tu vehículo ideal.
          </p>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2">
          {['ALL', 'SUV', 'Electric', 'Sedan'].map((cat) => (
            <button
              key={cat}
              onClick={() => dispatch({ type: 'FILTER_CARS', category: cat })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                (state.filters.category === cat || (cat === 'ALL' && state.filters.category === 'ALL'))
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {cat === 'ALL' ? 'Todos' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Experience Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Visor Principal del Auto */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[420px]">
          {/* Tag de Categoría */}
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 bg-slate-800 text-indigo-400 rounded-full text-xs font-semibold tracking-wide">
              {selectedCar.category}
            </span>
            <span className="text-2xl font-bold text-white">${selectedCar.price.toLocaleString()}</span>
          </div>

          {/* Render con Animación y tinte de Color */}
          <div className="relative my-8 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedCar.id}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ duration: 0.4 }}
                className="relative rounded-2xl overflow-hidden shadow-2xl group max-w-lg"
              >
                <img
                  src={selectedCar.image}
                  alt={selectedCar.name}
                  className="w-full h-64 object-cover rounded-2xl"
                />
                {/* Overlay dinámico con el color seleccionado por el agente */}
                <div
                  className="absolute inset-0 mix-blend-color opacity-40 transition-colors duration-500 pointer-events-none"
                  style={{ backgroundColor: state.selectedColor }}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Información y Selector de Colores */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
            <div>
              <h2 className="text-xl font-semibold text-white">{selectedCar.name}</h2>
              <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-indigo-400" /> {selectedCar.specs.power}</span>
                <span className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5 text-indigo-400" /> {selectedCar.specs.acceleration}</span>
              </div>
            </div>

            {/* Selector de Color */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Color:</span>
              {selectedCar.colors.map((color: string) => (
                <button
                  key={color}
                  onClick={() => dispatch({ type: 'CHANGE_COLOR', color })}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    state.selectedColor === color ? 'border-indigo-500 scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Catálogo y Selección */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Modelos Disponibles</h3>
          <div className="space-y-3">
            {filteredCars.map((car) => (
              <div
                key={car.id}
                onClick={() => dispatch({ type: 'SELECT_CAR', carId: car.id })}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  state.selectedCarId === car.id
                    ? 'bg-slate-800/90 border-indigo-500/80 shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <h4 className="font-semibold text-white text-sm">{car.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">${car.price.toLocaleString()}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'OPEN_TEST_DRIVE', carId: car.id });
                  }}
                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3" /> Agenda
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Prueba de Manejo Formulario */}
      {state.testDriveForm.isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CarIcon className="w-5 h-5 text-indigo-400" /> Agendar Prueba de Manejo
            </h3>
            <p className="text-xs text-slate-400">
              Formulario operable interactivamente por el usuario o el agente de IA.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={state.testDriveForm.name || ''}
                  onChange={(e) => dispatch({ type: 'FILL_TEST_DRIVE', field: 'name', value: e.target.value })}
                  placeholder="Ej. Emi"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Fecha de la Prueba</label>
                <input
                  type="date"
                  value={state.testDriveForm.date || ''}
                  onChange={(e) => dispatch({ type: 'FILL_TEST_DRIVE', field: 'date', value: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => dispatch({ type: 'CLOSE_TEST_DRIVE' })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-300"
              >
                Cerrar
              </button>
              <button
                onClick={() => alert(`Prueba agendada para ${state.testDriveForm.name || 'Cliente'} el día ${state.testDriveForm.date}`)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs text-white font-semibold"
              >
                Confirmar Cita
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
