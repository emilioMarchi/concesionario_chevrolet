'use client';

import React, { useState } from 'react';
import { AgentUIProvider, useAgentUI } from '@/context/AgentUIContext';
import { AgentSidebar } from '@/components/AgentSidebar';
import { HeroCover } from '@/components/HeroCover';
import { DealershipShowroom } from '@/components/DealershipShowroom';
import { CarCatalog } from '@/components/CarCatalog';
import { FinanceCalculator } from '@/components/FinanceCalculator';
import { CopilotIntegration } from '@/components/CopilotIntegration';
import { CopilotKit } from '@copilotkit/react-core';
import '@copilotkit/react-ui/styles.css';
import {
  Car,
  PhoneCall,
  Home as HomeIcon,
  LayoutGrid,
  Calculator,
  Eye,
  Sparkles,
  MapPin,
  Mail,
  Phone,
  Calendar as CalendarIcon,
  Menu as MenuIcon,
  X as CloseIcon,
} from 'lucide-react';
import { CARS_DATA } from '@/data/cars';

const NAV_ITEMS: { section: 'home' | 'showroom' | 'models' | 'finance' | 'contact'; label: string; icon: React.ElementType }[] = [
  { section: 'home', label: 'Inicio', icon: HomeIcon },
  { section: 'showroom', label: 'Showroom', icon: Eye },
  { section: 'models', label: 'Modelos', icon: LayoutGrid },
  { section: 'finance', label: 'Financiación', icon: Calculator },
  { section: 'contact', label: 'Contacto', icon: PhoneCall },
];

function TopBar() {
  const { state, dispatch } = useAgentUI();

  return (
    <header className="h-16 shrink-0 border-b border-zinc-200 bg-white/85 backdrop-blur-md z-30">
      <div className="h-full px-4 sm:px-5 lg:px-8 flex items-center justify-between gap-6">
        {/* Marca */}
        <div
          onClick={() => dispatch({ type: 'NAVIGATE', section: 'home' })}
          className="flex items-center gap-2.5 cursor-pointer shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white font-semibold text-sm tracking-tight">
            N
          </div>
          <div className="leading-none">
            <p className="font-semibold text-sm tracking-tight text-zinc-900">NovaMotors</p>
            <p className="text-[10px] text-zinc-400 tracking-widest uppercase mt-0.5">Autos 0km</p>
          </div>
        </div>

        {/* Navegación */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(({ section, label, icon: Icon }) => {
            const active = state.activeSection === section;
            return (
              <button
                key={section}
                onClick={() => dispatch({ type: 'NAVIGATE', section })}
                className={`px-3.5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  active
                    ? 'bg-zinc-100 text-zinc-900 font-medium'
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Acción del asesor */}
        <button
          onClick={() =>
            window.innerWidth >= 1024
              ? dispatch({ type: 'TOGGLE_AGENT' })
              : dispatch({ type: 'TOGGLE_AGENT_MOBILE' })
          }
          className="shrink-0 px-4 py-2 rounded-full border border-zinc-200 hover:border-zinc-300 bg-white text-sm text-zinc-800 transition-colors flex items-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Asesor IA</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${state.agentOpen || state.agentMobileSnap !== 'closed' ? 'bg-emerald-500' : 'bg-zinc-300'}`}
          />
        </button>
      </div>
    </header>
  );
}

function MainContent() {
  const { state, dispatch } = useAgentUI();

  return (
    <main className="flex-1 min-h-0 relative overflow-y-auto custom-scrollbar">
      {/* Aviso de acci��n ejecutada por el asistente */}
      {state.aiActionNotice && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 text-white px-4 py-2 rounded-full shadow-lg text-xs font-medium flex items-center gap-2 max-w-[90vw] text-center">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{state.aiActionNotice}</span>
        </div>
      )}

      {state.activeSection === 'home' && <HeroCover />}
      {state.activeSection === 'showroom' && <DealershipShowroom />}
      {state.activeSection === 'models' && <CarCatalog />}
      {state.activeSection === 'finance' && <FinanceCalculator />}

      {state.activeSection === 'contact' && (
        <div className="h-full overflow-y-auto custom-scrollbar max-w-4xl mx-auto px-6 flex flex-col justify-center">
          <div className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-zinc-900 tracking-tight">
                Atención ejecutiva
              </h2>
              <p className="text-zinc-500 text-sm max-w-md mx-auto">
                Visitanos en nuestras casas centrales o dejá que el asesor virtual coordine tu prueba de manejo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {[
                { icon: MapPin, title: 'Showroom Central', value: 'Av. Libertador 4500, CABA' },
                { icon: Phone, title: 'Ventas Directas', value: '+54 11 5555-8800' },
                { icon: Mail, title: 'Asistencia VIP', value: 'vip@novamotors.com' },
              ].map(({ icon: Icon, title, value }) => (
                <div
                  key={title}
                  className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 flex flex-col items-center text-center gap-2"
                >
                  <Icon className="w-5 h-5 text-zinc-500" />
                  <h4 className="font-medium text-sm text-zinc-900">{title}</h4>
                  <p className="text-zinc-500 text-xs">{value}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => dispatch({ type: 'OPEN_TEST_DRIVE' })}
                className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm rounded-full transition-colors inline-flex items-center gap-2"
              >
                <CalendarIcon className="w-4 h-4" /> Agendar prueba de manejo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal global de prueba de manejo */}
      {state.testDriveForm.isOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl">
            <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
              <Car className="w-5 h-5 text-zinc-500" /> Agendar cita o prueba de manejo
            </h3>
            <p className="text-xs text-zinc-500">
              Formulario sincronizado en tiempo real con el asesor virtual.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500 block mb-1.5 font-medium">Modelo</label>
                <select
                  value={state.testDriveForm.carId || state.selectedCarId || ''}
                  onChange={(e) => dispatch({ type: 'SELECT_CAR', carId: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400"
                >
                  {CARS_DATA.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.price != null ? `$${c.price.toLocaleString()}` : 'Consultar'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1.5 font-medium">Nombre completo</label>
                <input
                  type="text"
                  value={state.testDriveForm.name || ''}
                  onChange={(e) => dispatch({ type: 'FILL_TEST_DRIVE', field: 'name', value: e.target.value })}
                  placeholder="Ej. Emiliano"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1.5 font-medium">Fecha de reserva</label>
                <input
                  type="date"
                  value={state.testDriveForm.date || ''}
                  onChange={(e) => dispatch({ type: 'FILL_TEST_DRIVE', field: 'date', value: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => dispatch({ type: 'CLOSE_TEST_DRIVE' })}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-full text-sm text-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  alert(
                    `Cita confirmada para ${state.testDriveForm.name || 'Cliente'} el día ${state.testDriveForm.date || 'a definir'}`
                  );
                  dispatch({ type: 'CLOSE_TEST_DRIVE' });
                }}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-full text-sm transition-colors"
              >
                Confirmar reserva
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function MobileQuickMenu() {
  const { state, dispatch } = useAgentUI();
  const [open, setOpen] = useState(false);

  // Se apoya justo por encima del chat (que ocupa hasta el 40% inferior).
  const bottomOffset =
    state.agentMobileSnap === 'closed' ? 'calc(6rem + 1rem)' : 'calc(40dvh + 1rem)';

  const handleNav = (section: (typeof NAV_ITEMS)[number]['section']) => {
    dispatch({ type: 'NAVIGATE', section });
    setOpen(false);
  };

  return (
    <div
      className="lg:hidden fixed right-4 z-50 flex flex-col items-end gap-3"
      style={{ bottom: bottomOffset }}
    >
      {open && (
        <div className="w-48 p-1.5 bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden">
          {NAV_ITEMS.map(({ section, label, icon: Icon }) => {
            const active = state.activeSection === section;
            return (
              <button
                key={section}
                onClick={() => handleNav(section)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  active
                    ? 'bg-zinc-900 text-white font-medium'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
        className="w-14 h-14 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform"
      >
        {open ? <CloseIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
      </button>
    </div>
  );
}

export default function Home() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="default" useSingleEndpoint>
      <AgentUIProvider>
        <CopilotIntegration />
        <div className="h-[100dvh] w-screen flex flex-col lg:flex-row bg-[var(--background)] text-zinc-900 overflow-hidden relative">
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <TopBar />
            <MainContent />
          </div>
          <MobileQuickMenu />
          <AgentSidebar />
        </div>
      </AgentUIProvider>
    </CopilotKit>
  );
}
