'use client';

import React from 'react';
import { AgentUIProvider, useAgentUI } from '@/context/AgentUIContext';
import { DealershipShowroom } from '@/components/DealershipShowroom';
import { CarCatalog } from '@/components/CarCatalog';
import { FinanceCalculator } from '@/components/FinanceCalculator';
import { CopilotIntegration } from '@/components/CopilotIntegration';
import { CopilotKit } from '@copilotkit/react-core';
import { CopilotPopup } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';
import { Car, PhoneCall, Home as HomeIcon, LayoutGrid, Calculator, Eye, Sparkles, MapPin, Mail, Phone, Calendar as CalendarIcon } from 'lucide-react';
import { CARS_DATA } from '@/data/cars';

function NavigationBar() {
  const { state, dispatch } = useAgentUI();

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md shrink-0 z-40">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & Tag */}
        <div
          onClick={() => dispatch({ type: 'NAVIGATE', section: 'home' })}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-950 font-black tracking-tighter group-hover:bg-white transition-colors shadow-md">
            NV
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white flex items-center gap-2">
              NOVAMOTORS
              <span className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-zinc-400 rounded-full font-mono font-medium">
                LUXURY EV & HYBRID
              </span>
            </span>
          </div>
        </div>

        {/* Navigation Tabs Sobrias */}
        <nav className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800/80 text-xs">
          <button
            onClick={() => dispatch({ type: 'NAVIGATE', section: 'home' })}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
              state.activeSection === 'home'
                ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <HomeIcon className="w-3.5 h-3.5" /> Inicio
          </button>
          <button
            onClick={() => dispatch({ type: 'NAVIGATE', section: 'showroom' })}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
              state.activeSection === 'showroom'
                ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Showroom
          </button>
          <button
            onClick={() => dispatch({ type: 'NAVIGATE', section: 'models' })}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
              state.activeSection === 'models'
                ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Modelos
          </button>
          <button
            onClick={() => dispatch({ type: 'NAVIGATE', section: 'finance' })}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
              state.activeSection === 'finance'
                ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" /> Financiación
          </button>
          <button
            onClick={() => dispatch({ type: 'NAVIGATE', section: 'contact' })}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
              state.activeSection === 'contact'
                ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" /> Contacto
          </button>
        </nav>
      </div>
    </header>
  );
}

function MainContent() {
  const { state, dispatch } = useAgentUI();

  return (
    <main className="flex-1 relative overflow-hidden">
      {/* Banner de Acción ejecutada por Asistente de IA */}
      {state.aiActionNotice && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-zinc-500/50 text-zinc-200 px-4 py-2 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2 backdrop-blur-md animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{state.aiActionNotice}</span>
        </div>
      )}

      {state.activeSection === 'home' && (
        <div className="h-full max-w-6xl mx-auto px-6 flex flex-col items-center justify-center text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-zinc-300" /> Experiencia Guiada por Inteligencia Artificial CopilotKit
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight max-w-3xl leading-tight">
            Ingeniería Automotriz de Clase Mundial.
          </h1>
          
          <p className="text-slate-400 max-w-2xl text-sm sm:text-base leading-relaxed">
            Explora nuestra flota ejecutiva. Configura colores en tiempo real, filtra por presupuesto o calcula tu plan de cuotas interactuando por voz o chat.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => dispatch({ type: 'NAVIGATE', section: 'showroom' })}
              className="px-6 py-3 bg-zinc-100 hover:bg-white text-zinc-950 rounded-xl font-bold text-xs shadow-xl transition-all flex items-center gap-2"
            >
              <Eye className="w-4 h-4" /> Visor Showroom 3D
            </button>
            <button
              onClick={() => dispatch({ type: 'NAVIGATE', section: 'models' })}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl font-bold text-xs transition-all flex items-center gap-2"
            >
              <LayoutGrid className="w-4 h-4 text-slate-400" /> Explorar Inventario Completo
            </button>
          </div>
        </div>
      )}

      {state.activeSection === 'showroom' && <DealershipShowroom />}
      {state.activeSection === 'models' && <CarCatalog />}
      {state.activeSection === 'finance' && <FinanceCalculator />}

      {state.activeSection === 'contact' && (
        <div className="h-full max-w-4xl mx-auto px-6 flex flex-col justify-center">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Atención Ejecutiva NovaMotors</h2>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                Visítanos en nuestras casas centrales o deja que nuestro Asistente de IA reserve tu agenda de prueba.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center text-center space-y-2">
                <MapPin className="w-5 h-5 text-zinc-400" />
                <h4 className="font-bold text-white">Showroom Central</h4>
                <p className="text-slate-400">Av. Libertador 4500, CABA</p>
              </div>
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center text-center space-y-2">
                <Phone className="w-5 h-5 text-zinc-400" />
                <h4 className="font-bold text-white">Ventas Directas</h4>
                <p className="text-slate-400">+54 11 5555-8800</p>
              </div>
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center text-center space-y-2">
                <Mail className="w-5 h-5 text-zinc-400" />
                <h4 className="font-bold text-white">Asistencia VIP</h4>
                <p className="text-slate-400">vip@novamotors.com</p>
              </div>
            </div>

            <div className="pt-4 text-center">
              <button
                onClick={() => dispatch({ type: 'OPEN_TEST_DRIVE' })}
                className="px-6 py-3 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs rounded-xl shadow-lg transition-all inline-flex items-center gap-2"
              >
                <CalendarIcon className="w-4 h-4" /> Agendar Prueba con Asistente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal global de Prueba de Manejo Formulario */}
      {state.testDriveForm.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Car className="w-5 h-5 text-zinc-300" /> Agendar Cita o Prueba de Manejo
            </h3>
            <p className="text-xs text-slate-400">
              Formulario interactivo sincronizado en tiempo real con el Asistente IA.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Modelo Seleccionado</label>
                <select
                  value={state.testDriveForm.carId || state.selectedCarId || 'apex-suv'}
                  onChange={(e) => dispatch({ type: 'SELECT_CAR', carId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  {CARS_DATA.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} (${c.price.toLocaleString()})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Nombre Completo</label>
                <input
                  type="text"
                  value={state.testDriveForm.name || ''}
                  onChange={(e) => dispatch({ type: 'FILL_TEST_DRIVE', field: 'name', value: e.target.value })}
                  placeholder="Ej. Emiliano"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Fecha de Reserva</label>
                <input
                  type="date"
                  value={state.testDriveForm.date || ''}
                  onChange={(e) => dispatch({ type: 'FILL_TEST_DRIVE', field: 'date', value: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => dispatch({ type: 'CLOSE_TEST_DRIVE' })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  alert(`Cita confirmada para ${state.testDriveForm.name || 'Cliente'} el día ${state.testDriveForm.date || 'a definir'}`);
                  dispatch({ type: 'CLOSE_TEST_DRIVE' });
                }}
                className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl text-xs shadow-md transition-all"
              >
                Confirmar Reserva
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="default" useSingleEndpoint>
      <AgentUIProvider>
        <CopilotIntegration />
        <div className="bg-slate-950 text-slate-100 h-screen w-screen flex flex-col overflow-hidden selection:bg-zinc-200 selection:text-zinc-950">
          <NavigationBar />
          <MainContent />
          <CopilotPopup
            instructions="Eres un asesor ejecutivo en ventas para la concesionaria de lujo NovaMotors. Tu objetivo es ayudar al usuario a navegar por la app (home, showroom, models, finance, contact), filtrar el catálogo de autos, cambiar colores en vivo y agendar pruebas de manejo usando las acciones de interfaz disponibles."
            labels={{
              title: "Asesor Virtual NovaMotors",
              initial: "¡Bienvenido a NovaMotors! Soy tu asesor virtual. ¿Deseas explorar los modelos, filtrar por presupuesto o simular una financiación?",
            }}
          />
        </div>
      </AgentUIProvider>
    </CopilotKit>
  );
}
