'use client';

import { useEffect, useRef } from 'react';
import { z } from 'zod';
import { useAgentUI } from '@/context/AgentUIContext';
import {
  useAgent,
  useAgentContext,
  useConfigureSuggestions,
  useFrontendTool,
  useHumanInTheLoop,
  useInterrupt,
} from '@copilotkit/react-core/v2';
import { CARS_DATA } from '@/data/cars';
import { getVehicleInfo } from '@/lib/vehicle-detail';
import type { UISection } from '@/types/agent-protocol';
import {
  ChangeColorToolView,
  FilterToolView,
  NavigateToolView,
  OpenTestDriveToolView,
  SelectCarToolView,
} from '@/components/AgentToolViews';

const SECTIONS: readonly string[] = ['home', 'showroom', 'models', 'finance', 'contact'];

function toSection(value: unknown): UISection {
  return SECTIONS.includes(String(value))
    ? (String(value) as UISection)
    : 'home';
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `msg_${Math.random().toString(36).slice(2)}`;
}

export function CopilotIntegration() {
  const { state, dispatch } = useAgentUI();
  const { agent, isReady } = useAgent();

  // CTA del sitio: abre el panel y envía UN solo prompt inicial al asesor.
  const handledPromptRef = useRef<string | null>(null);
  useEffect(() => {
    const content = state.pendingPrompt;
    if (!content) {
      handledPromptRef.current = null;
      return;
    }
    if (handledPromptRef.current === content) return;
    if (!isReady) return;
    handledPromptRef.current = content;
    dispatch({ type: 'CLEAR_PENDING_PROMPT' });
    agent.addMessage({ id: newId(), role: 'user', content });
    void agent.runAgent();
  }, [state.pendingPrompt, dispatch, agent, isReady]);

  // Sugerencias iniciales (pills) contextualizadas para NovaMotors.
  useConfigureSuggestions({
    available: 'before-first-message',
    suggestions: [
      { title: 'Financiación', message: 'Simulá la financiación de un Onix en 60 cuotas.' },
      { title: 'Prueba de manejo', message: 'Quiero agendar una prueba de manejo.' },
      { title: 'Colores', message: 'Mostrame el Onix en Rojo Jinx.' },
      { title: 'Comparar', message: 'Compará el Onix con el Tracker.' },
    ],
  });

  // Exponer el estado de la UI a la IA (UI State Exposure)
  useAgentContext({
    description: 'Estado actual de la concesionaria NovaMotors y filtros activos',
    value: {
      activeSection: state.activeSection,
      selectedCarId: state.selectedCarId,
      selectedColor: state.selectedColor,
      filters: {
        category: state.filters.category,
        maxPrice: state.filters.maxPrice,
        fuelType: state.filters.fuelType,
        searchQuery: state.filters.searchQuery,
      },
      testDriveForm: {
        isOpen: state.testDriveForm.isOpen,
        carId: state.testDriveForm.carId ?? null,
        name: state.testDriveForm.name ?? null,
        date: state.testDriveForm.date ?? null,
      },
      availableCars: CARS_DATA.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        price: c.price,
        fuelType: c.fuelType,
        year: c.year,
      })),
    },
  });

  // Frontend tools (Tool Calls de UI)
  useFrontendTool({
    name: 'getVehicleInfo',
    description: 'Trae la ficha REAL de los modelos del catálogo desde el código de la app: descripción, specs, colores, caja, precio, motor y año. Usar cuando el usuario pregunte el detalle de un modelo y esos datos no estén en el estado de pantalla. Hacé UNA sola llamada por consulta: con carId=\'all\' traés todos los modelos de una (ideal para comparar o responder cuál es el más X). No modifica la pantalla, sólo devuelve datos.',
    parameters: z.object({
      carId: z.string().optional().describe("ID del modelo: onix-auto-moderno, onix-plus, montana-pickup, s10, silverado-pickup, sonic, spin-auto-familiar, tracker-suv, trailblazer-camioneta-4x4. Para comparar varios modelos o responder sobre todo el catálogo, usá carId='all' en una única llamada."),
      detail: z.string().optional().describe("Sólo una característica si hace falta: description, specs, colors, transmission, subtitle, price, fuelType, year, category. Por defecto 'all'."),
    }),
    handler: async ({ carId, detail }) => {
      return getVehicleInfo(typeof carId === 'string' ? carId : undefined, typeof detail === 'string' ? detail : undefined);
    },
  });

  useFrontendTool({
    name: 'navigateToSection',
    description: 'Cambia la sección visible de la aplicación. Opciones: home, showroom, models, finance, contact. Usar cuando el usuario pida ir a una sección o explorar el catálogo/modelos/financiación.',
    parameters: z.object({
      section: z.string().describe('Sección a la que navegar: home, showroom, models, finance, contact'),
    }),
    handler: async ({ section }) => {
      const targetSec = toSection(section);
      dispatch({ type: 'NAVIGATE', section: targetSec });
      dispatch({ type: 'SET_AI_NOTICE', message: `Navegando a ${section.toUpperCase()}` });
      setTimeout(() => dispatch({ type: 'SET_AI_NOTICE', message: null }), 3500);
      return `Navegado exitosamente a la sección ${section}`;
    },
    render: NavigateToolView,
  });

  useFrontendTool({
    name: 'selectCarModel',
    description: 'Muestra un modelo concreto EN PANTALLA en el Visor Showroom (navega a la sección showroom y carga el auto). Usar SIEMPRE que el usuario pida ver, inspeccionar o mirar un vehículo puntual, o verlo en un color: es la única acción que hace visible el auto y su color.',
    parameters: z.object({
      carId: z.string().describe('ID del auto (onix-auto-moderno, onix-plus, montana-pickup, s10, silverado-pickup, sonic, spin-auto-familiar, tracker-suv, trailblazer-camioneta-4x4)'),
    }),
    handler: async ({ carId }) => {
      dispatch({ type: 'NAVIGATE', section: 'showroom' });
      dispatch({ type: 'SELECT_CAR', carId });
      dispatch({ type: 'SET_AI_NOTICE', message: `Modelo seleccionado: ${carId}` });
      setTimeout(() => dispatch({ type: 'SET_AI_NOTICE', message: null }), 3500);
      return `Auto ${carId} cargado en el visor del showroom`;
    },
    render: SelectCarToolView,
  });

  useFrontendTool({
    name: 'changeCarColor',
    description: 'Cambia el color exterior del vehículo y lo deja visible en el Visor Showroom (navega a la sección showroom si no estás ahí). Usar cuando el usuario quiera ver pintado un auto en un color. Elegí un color REAL del modelo: si no sabés el hex exacto, pedilo antes con getVehicleInfo (detail=\'colors\'). Si el color no existe en ese modelo, la acción no cambia nada y te devuelve los válidos.',
    parameters: z.object({
      colorHex: z.string().describe('Hex exacto del color del modelo (ej. #ad4545) o su nombre tal como figura en la ficha (ej. Rojo Jinx). No uses colores de otros modelos.'),
      carId: z.string().optional().describe('Opcional: modelo a pintar/mostrar (onix-auto-moderno, onix-plus, montana-pickup, s10, silverado-pickup, sonic, spin-auto-familiar, tracker-suv, trailblazer-camioneta-4x4). Si no llega, se usa el seleccionado actual.'),
    }),
    handler: async ({ colorHex, carId }) => {
      const target =
        (typeof carId === 'string' && carId ? CARS_DATA.find((c) => c.id === carId) : undefined) ||
        CARS_DATA.find((c) => c.id === state.selectedCarId) ||
        CARS_DATA[0];
      const norm = (s: string) =>
        s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const wanted = norm(String(colorHex ?? ''));
      const exact = target.colors.find((c) => norm(c.hex) === wanted || norm(c.name) === wanted);
      const partial = target.colors.filter((c) => norm(c.name).includes(wanted) && wanted.length >= 3);
      const match = exact ?? (partial.length === 1 ? partial[0] : undefined);
      if (!match) {
        return `Color "${colorHex}" no disponible para ${target.name}. Colores válidos: ${target.colors
          .map((c) => `${c.name} (${c.hex})`)
          .join(', ')}. Usá exactamente uno de esos.`;
      }
      dispatch({ type: 'NAVIGATE', section: 'showroom' });
      dispatch({ type: 'SELECT_CAR', carId: target.id });
      dispatch({ type: 'CHANGE_COLOR', color: match.hex });
      dispatch({ type: 'SET_AI_NOTICE', message: `Color modificado a ${match.name}` });
      setTimeout(() => dispatch({ type: 'SET_AI_NOTICE', message: null }), 3500);
      return `${target.name} cargado en el Visor Showroom con color ${match.name} (${match.hex})`;
    },
    render: ChangeColorToolView,
  }, [state.selectedCarId]);

  useFrontendTool({
    name: 'filterCatalog',
    description: 'Filtra la GRILLA de la sección models por categoría, tipo de motor, búsqueda de texto o presupuesto máximo. Usar sólo cuando el usuario quiera VER VARIAS opciones comparadas en la grilla (ej. camionetas hasta 55k). NO usar para mostrar un vehículo puntual ni su color: para eso está selectCarModel/changeCarColor, porque este filtro no muestra el auto en el showroom.',
    parameters: z.object({
      category: z.string().optional().describe('Categoría: ALL, Auto, SUV, Pick-up'),
      maxPrice: z.number().optional().describe('Presupuesto máximo en pesos'),
      fuelType: z.string().optional().describe('Motorización: ALL, Gasolina, Diesel, Hibrido'),
      searchQuery: z.string().optional().describe('Término de búsqueda por texto'),
    }),
    handler: async ({ category, maxPrice, fuelType, searchQuery }) => {
      dispatch({ type: 'NAVIGATE', section: 'models' });
      dispatch({
        type: 'FILTER_CARS',
        category,
        maxPrice,
        fuelType,
        searchQuery,
      });
      dispatch({ type: 'SET_AI_NOTICE', message: 'Filtros aplicados al catálogo por Asistente IA' });
      setTimeout(() => dispatch({ type: 'SET_AI_NOTICE', message: null }), 3500);
      return 'Filtros de catálogo aplicados exitosamente';
    },
    render: FilterToolView,
  });

  useFrontendTool({
    name: 'openTestDriveForm',
    description: 'Abre el formulario para agendar o reservar una prueba de manejo.',
    parameters: z.object({
      carId: z.string().optional().describe('ID del automovil a agendar'),
      date: z.string().optional().describe('Fecha de la cita (YYYY-MM-DD)'),
      name: z.string().optional().describe('Nombre completo del solicitante'),
    }),
    handler: async ({ carId, date, name }) => {
      dispatch({ type: 'OPEN_TEST_DRIVE', carId });
      if (date) dispatch({ type: 'FILL_TEST_DRIVE', field: 'date', value: date });
      if (name) dispatch({ type: 'FILL_TEST_DRIVE', field: 'name', value: name });
      dispatch({ type: 'SET_AI_NOTICE', message: 'Formulario de prueba de manejo activado' });
      setTimeout(() => dispatch({ type: 'SET_AI_NOTICE', message: null }), 3500);
      return 'Formulario de prueba de manejo abierto correctamente';
    },
    render: OpenTestDriveToolView,
  });

  useFrontendTool({
    name: 'closeTestDrive',
    description: 'Cierra el formulario de prueba de manejo.',
    parameters: z.object({}),
    handler: async () => {
      dispatch({ type: 'CLOSE_TEST_DRIVE' });
      dispatch({ type: 'SET_AI_NOTICE', message: 'Formulario de prueba de manejo cerrado' });
      setTimeout(() => dispatch({ type: 'SET_AI_NOTICE', message: null }), 3500);
      return 'Formulario de prueba de manejo cerrado';
    },
  });

  useHumanInTheLoop({
    name: 'confirmTestDriveBooking',
    description: 'Solicita confirmacion antes de agendar una prueba de manejo.',
    parameters: z.object({
      carId: z.string().optional().describe('Vehiculo a agendar'),
      name: z.string().optional().describe('Nombre del solicitante'),
      date: z.string().optional().describe('Fecha propuesta'),
    }),
    render: ({ respond }) => (
      <div className="space-y-2 text-sm">
        <p className="font-medium">Confirmar prueba de manejo</p>
        <p className="text-zinc-600">¿Confirmás agendar esta prueba de manejo?</p>
        <div className="flex gap-2">
          <button
            onClick={() => respond?.({ action: 'approve', approved: true })}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800"
          >
            Confirmar
          </button>
          <button
            onClick={() => respond?.({ action: 'reject', approved: false })}
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    ),
  });

  useInterrupt({
    render: ({ interrupt, resolve }) => (
      <div className="space-y-2 text-sm">
        <p className="font-medium">Confirmar prueba de manejo</p>
        <p className="text-zinc-600">
          {interrupt?.message ?? '¿Confirmás agendar esta prueba de manejo?'}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => resolve({ action: 'approve', approved: true })}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800"
          >
            Confirmar
          </button>
          <button
            onClick={() => resolve({ action: 'reject', approved: false })}
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    ),
  });

  return null;
}
