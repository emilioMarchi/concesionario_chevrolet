'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { CopilotChat } from '@copilotkit/react-ui';
import { useAgentUI } from '@/context/AgentUIContext';
import { Sparkles, X, Maximize2, Minimize2 } from 'lucide-react';

const INSTRUCTIONS =
  'Eres el asesor virtual de NovaMotors, una concesionaria de autos 0km. ' +
  'Ayudás al usuario a explorar el catálogo, comparar modelos, ver versiones y colores, ' +
  'filtrar por presupuesto y simular financiación. Usá las acciones de interfaz disponibles ' +
  'para navegar secciones, mostrar vehículos en el showroom y abrir el formulario de prueba de manejo. ' +
  'Respondé en español rioplatense, breve, claro y profesional.';

export function AgentSidebar() {
  const { state, dispatch } = useAgentUI();
  const open = state.agentOpen;
  const snap = state.agentMobileSnap;

  // Montamos una sola instancia de CopilotChat (desktop o mobile) para evitar
  // que dos paneles compartan el agente y dupliquen mensajes/renders.
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const close = () => dispatch({ type: 'CLOSE_AGENT' });
  const toggleMobile = () => dispatch({ type: 'TOGGLE_AGENT_MOBILE' });
  const mobileOpen = snap !== 'closed';

  const chatEl = (
    <CopilotChat
      className="h-full"
      instructions={INSTRUCTIONS}
      labels={{
        title: 'Asesor NovaMotors',
        initial:
          '¡Hola! Soy tu asesor virtual. Puedo mostrarte modelos, comparar versiones, cambiar colores o simular tu financiación. ¿Por dónde querés empezar?',
      }}
    />
  );

  // En mobile el chat nunca supera el 40% de la pantalla; colapsado deja sólo el input.
  const mobileHeight = mobileOpen ? '40dvh' : 'auto';

  return (
    <>
      {/* Desktop: barra lateral integrada al layout */}
      {isDesktop && open && (
        <aside className="nv-agent hidden lg:flex flex-col h-full w-[384px] shrink-0 border-l border-zinc-200 bg-white">
          <div className="h-16 px-4 flex items-center justify-between border-b border-zinc-200 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900 leading-tight truncate">
                  Asesor NovaMotors
                </p>
                <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  En línea
                </p>
              </div>
            </div>
            <button
              onClick={close}
              aria-label="Cerrar asesor"
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0">{chatEl}</div>
        </aside>
      )}

      {/* Mobile: chat flotante transparente anclado abajo (máx. 40% de alto) */}
      {!isDesktop && (
        <section
          className={clsx(
            'nv-agent lg:hidden flex flex-col shrink-0 w-full transition-[height] duration-300 ease-out',
            !mobileOpen && 'nv-agent-collapsed'
          )}
          style={{ height: mobileHeight }}
          aria-label="Asesor NovaMotors"
        >
          <div className="shrink-0 pt-1.5 cursor-pointer" onClick={toggleMobile}>
            <div className="mx-auto h-1.5 w-10 rounded-full bg-zinc-400/70" />
          </div>

          <div className="shrink-0 px-3 py-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-zinc-900/90 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-3 h-3" />
              </div>
              <p className="text-xs font-semibold text-zinc-600">Asesor NovaMotors</p>
            </div>
            <button
              onClick={toggleMobile}
              aria-label={mobileOpen ? 'Minimizar asesor' : 'Abrir asesor'}
              className="p-1.5 rounded-full bg-white/70 border border-white/70 text-zinc-600 backdrop-blur-md transition-colors"
            >
              {mobileOpen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex-1 min-h-0 pb-px">{chatEl}</div>
        </section>
      )}
    </>
  );
}
