'use client';

import React from 'react';
import { AgentUIProvider, useAgentUI } from '@/context/AgentUIContext';
import { DealershipShowroom } from '@/components/DealershipShowroom';
import { CopilotIntegration } from '@/components/CopilotIntegration';
import { CopilotKit } from '@copilotkit/react-core';
import { CopilotPopup } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';
import { Car, PhoneCall, Home as HomeIcon } from 'lucide-react';

function NavigationBar() {
  const { state, dispatch } = useAgentUI();

  return (
    <nav className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg text-white">
          <Car className="w-6 h-6 text-indigo-500" />
          <span>NovaMotors <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full font-normal">CopilotKit Ready</span></span>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <button
            onClick={() => dispatch({ type: 'NAVIGATE', section: 'home' })}
            className={`flex items-center gap-1.5 transition-colors ${state.activeSection === 'home' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-white'}`}
          >
            <HomeIcon className="w-4 h-4" /> Inicio
          </button>
          <button
            onClick={() => dispatch({ type: 'NAVIGATE', section: 'showroom' })}
            className={`flex items-center gap-1.5 transition-colors ${state.activeSection === 'showroom' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-white'}`}
          >
            <Car className="w-4 h-4" /> Showroom
          </button>
          <button
            onClick={() => dispatch({ type: 'NAVIGATE', section: 'contact' })}
            className={`flex items-center gap-1.5 transition-colors ${state.activeSection === 'contact' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-white'}`}
          >
            <PhoneCall className="w-4 h-4" /> Contacto
          </button>
        </div>
      </div>
    </nav>
  );
}

function MainContent() {
  const { state, dispatch } = useAgentUI();

  return (
    <main className="min-h-screen">
      {state.activeSection === 'home' && (
        <div className="max-w-7xl mx-auto px-6 py-20 text-center space-y-6">
          <h1 className="text-5xl font-extrabold text-white tracking-tight sm:text-6xl">
            La Experiencia Automotriz del Futuro
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-base">
            Explora nuestro catálogo completo interactuando por voz o chat con el agente impulsado por CopilotKit.
          </p>
          <div className="pt-4">
            <button
              onClick={() => dispatch({ type: 'NAVIGATE', section: 'showroom' })}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold shadow-lg shadow-indigo-500/30 transition-all"
            >
              Ingresar al Showroom Interactivo
            </button>
          </div>
        </div>
      )}

      {state.activeSection === 'showroom' && <DealershipShowroom />}

      {state.activeSection === 'contact' && (
        <div className="max-w-3xl mx-auto px-6 py-20 text-center space-y-4">
          <h2 className="text-3xl font-bold text-white">Contacto y Asistencia</h2>
          <p className="text-slate-400 text-sm">
            Puedes solicitarle al agente de IA que agende una cita directa o responda a tus inquietudes.
          </p>
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
        <div className="bg-slate-950 text-slate-100 min-h-screen selection:bg-indigo-500 selection:text-white">
          <NavigationBar />
          <MainContent />
          <CopilotPopup
            instructions="Eres un asistente experto en ventas y asesoramiento para la concesionaria de vehículos NovaMotors. Tu objetivo es guiar al usuario por la web, cambiar colores de autos, aplicar filtros en el catálogo y ayudarlo a agendar su prueba de manejo mediante las acciones de la interfaz."
            labels={{
              title: "Asistente Copilot NovaMotors",
              initial: "¡Hola! Soy tu asistente de IA. ¿Qué auto te gustaría explorar o configurar hoy?",
            }}
          />
        </div>
      </AgentUIProvider>
    </CopilotKit>
  );
}
