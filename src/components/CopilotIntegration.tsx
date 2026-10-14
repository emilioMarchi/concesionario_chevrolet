'use client';

import { useEffect, useRef } from 'react';
import { useAgentUI } from '@/context/AgentUIContext';
import { useCopilotAction, useCopilotReadable, useCopilotChat } from '@copilotkit/react-core';
import { TextMessage, Role } from '@copilotkit/runtime-client-gql';
import { CARS_DATA } from '@/data/cars';
import { getVehicleInfo } from '@/lib/vehicle-detail';
import type { UISection } from '@/types/agent-protocol';

const SECTIONS: readonly string[] = ['home', 'showroom', 'models', 'finance', 'contact'];

function toSection(value: unknown): UISection {
  return SECTIONS.includes(String(value))
    ? (String(value) as UISection)
    : 'home';
}

export function CopilotIntegration() {
  const { state, dispatch } = useAgentUI();
  const { appendMessage } = useCopilotChat();

  // Guardamos la última función de envío en un ref para que el efecto del CTA
  // no dependa de su identidad (cambia en cada render y reenviaría el mensaje).
  const appendMessageRef = useRef(appendMessage);
  useEffect(() => {
    appendMessageRef.current = appendMessage;
  }, [appendMessage]);

  // CTA del sitio: abre el panel y envía UN solo prompt inicial al asesor.
  const handledPromptRef = useRef<string | null>(null);
  useEffect(() => {
    const content = state.pendingPrompt;
    if (!content) {
      handledPromptRef.current = null;
      return;
    }
    if (handledPromptRef.current === content) return;
    handledPromptRef.current = content;
    dispatch({ type: 'CLEAR_PENDING_PROMPT' });
    void appendMessageRef.current(new TextMessage({ content, role: Role.User }));
  }, [state.pendingPrompt, dispatch]);

  // Exponer el estado de la UI a la IA (UI State Exposure)
  useCopilotReadable({
    description: "Estado actual de la concesionaria NovaMotors y filtros activos",
    value: {
      activeSection: state.activeSection,
      selectedCarId: state.selectedCarId,
      selectedColor: state.selectedColor,
      filters: state.filters,
      testDriveForm: state.testDriveForm,
      availableCars: CARS_DATA.map(c => ({
        id: c.id,
        name: c.name,
        category: c.category,
        price: c.price,
        fuelType: c.fuelType,
        year: c.year
      }))
    }
  });

  // Copilot Actions (Tool Calls de UI)
  useCopilotAction({
    name: "getVehicleInfo",
    description: "Trae la ficha REAL de los modelos del catálogo desde el código de la app: descripción, specs, colores, caja, precio, motor y año. Usar cuando el usuario pregunte el detalle de un modelo y esos datos no estén en el estado de pantalla. Hacé UNA sola llamada por consulta: con carId='all' traés todos los modelos de una (ideal para comparar o responder cuál es el más X). No modifica la pantalla, sólo devuelve datos.",
    parameters: [
      { name: "carId", type: "string", description: "ID del modelo: onix-auto-moderno, onix-plus, montana-pickup, s10, silverado-pickup, sonic, spin-auto-familiar, tracker-suv, trailblazer-camioneta-4x4. Para comparar varios modelos o responder sobre todo el catálogo, usá carId='all' en una única llamada.", required: false },
      { name: "detail", type: "string", description: "Sólo una característica si hace falta: description, specs, colors, transmission, subtitle, price, fuelType, year, category. Por defecto 'all'.", required: false }
    ],
    handler: async ({ carId, detail }) => {
      return getVehicleInfo(typeof carId === "string" ? carId : undefined, typeof detail === "string" ? detail : undefined);
    }
  });

  useCopilotAction({
    name: "navigateToSection",
    description: "Cambia la sección visible de la aplicación. Opciones: home, showroom, models, finance, contact. Usar cuando el usuario pida ir a una sección o explorar el catálogo/modelos/financiación.",
    parameters: [
      { name: "section", type: "string", description: "Sección a la que navegar: home, showroom, models, finance, contact", required: true }
    ],
    handler: async ({ section }) => {
      const targetSec = toSection(section);
      dispatch({ type: "NAVIGATE", section: targetSec });
      dispatch({ type: "SET_AI_NOTICE", message: `Navegando a ${section.toUpperCase()}` });
      setTimeout(() => dispatch({ type: "SET_AI_NOTICE", message: null }), 3500);
      return `Navegado exitosamente a la sección ${section}`;
    }
  });

  useCopilotAction({
    name: "selectCarModel",
    description: "Muestra un modelo concreto EN PANTALLA en el Visor Showroom (navega a la sección showroom y carga el auto). Usar SIEMPRE que el usuario pida ver, inspeccionar o mirar un vehículo puntual, o verlo en un color: es la única acción que hace visible el auto y su color.",
    parameters: [
      { name: "carId", type: "string", description: "ID del auto (onix-auto-moderno, onix-plus, montana-pickup, s10, silverado-pickup, sonic, spin-auto-familiar, tracker-suv, trailblazer-camioneta-4x4)", required: true }
    ],
    handler: async ({ carId }) => {
      dispatch({ type: "NAVIGATE", section: "showroom" });
      dispatch({ type: "SELECT_CAR", carId });
      dispatch({ type: "SET_AI_NOTICE", message: `Modelo seleccionado: ${carId}` });
      setTimeout(() => dispatch({ type: "SET_AI_NOTICE", message: null }), 3500);
      return `Auto ${carId} cargado en el visor del showroom`;
    }
  });

  useCopilotAction({
    name: "changeCarColor",
    description: "Cambia el color exterior del vehículo y lo deja visible en el Visor Showroom (navega a la sección showroom si no estás ahí). Usar cuando el usuario quiera ver pintado un auto en un color. Elegí un color REAL del modelo: si no sabés el hex exacto, pedilo antes con getVehicleInfo (detail='colors'). Si el color no existe en ese modelo, la acción no cambia nada y te devuelve los válidos.",
    parameters: [
      { name: "colorHex", type: "string", description: "Hex exacto del color del modelo (ej. #ad4545) o su nombre tal como figura en la ficha (ej. Rojo Jinx). No uses colores de otros modelos.", required: true },
      { name: "carId", type: "string", description: "Opcional: modelo a pintar/mostrar (onix-auto-moderno, onix-plus, montana-pickup, s10, silverado-pickup, sonic, spin-auto-familiar, tracker-suv, trailblazer-camioneta-4x4). Si no llega, se usa el seleccionado actual.", required: false }
    ],
    handler: async ({ colorHex, carId }) => {
      const target =
        (typeof carId === "string" && carId ? CARS_DATA.find((c) => c.id === carId) : undefined) ||
        CARS_DATA.find((c) => c.id === state.selectedCarId) ||
        CARS_DATA[0];
      const norm = (s: string) =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      const wanted = norm(String(colorHex ?? ""));
      const exact = target.colors.find((c) => norm(c.hex) === wanted || norm(c.name) === wanted);
      const partial = target.colors.filter((c) => norm(c.name).includes(wanted) && wanted.length >= 3);
      const match = exact ?? (partial.length === 1 ? partial[0] : undefined);
      if (!match) {
        return `Color "${colorHex}" no disponible para ${target.name}. Colores válidos: ${target.colors
          .map((c) => `${c.name} (${c.hex})`)
          .join(", ")}. Usá exactamente uno de esos.`;
      }
      dispatch({ type: "NAVIGATE", section: "showroom" });
      dispatch({ type: "SELECT_CAR", carId: target.id });
      dispatch({ type: "CHANGE_COLOR", color: match.hex });
      dispatch({ type: "SET_AI_NOTICE", message: `Color modificado a ${match.name}` });
      setTimeout(() => dispatch({ type: "SET_AI_NOTICE", message: null }), 3500);
      return `${target.name} cargado en el Visor Showroom con color ${match.name} (${match.hex}).`;
    }
  });

  useCopilotAction({
    name: "filterCatalog",
    description: "Filtra la GRILLA de la sección models por categoría, tipo de motor, búsqueda de texto o presupuesto máximo. Usar sólo cuando el usuario quiera VER VARIAS opciones comparadas en la grilla (ej. camionetas hasta 55k). NO usar para mostrar un vehículo puntual ni su color: para eso está selectCarModel/changeCarColor, porque este filtro no muestra el auto en el showroom.",
    parameters: [
      { name: "category", type: "string", description: "Categoría: ALL, Auto, SUV, Pick-up" },
      { name: "maxPrice", type: "number", description: "Presupuesto máximo en pesos" },
      { name: "fuelType", type: "string", description: "Motorización: ALL, Gasolina, Diesel, Hibrido" },
      { name: "searchQuery", type: "string", description: "Término de búsqueda por texto" }
    ],
    handler: async ({ category, maxPrice, fuelType, searchQuery }) => {
      dispatch({ type: "NAVIGATE", section: "models" });
      dispatch({
        type: "FILTER_CARS",
        category,
        maxPrice,
        fuelType,
        searchQuery
      });
      dispatch({ type: "SET_AI_NOTICE", message: `Filtros aplicados al catálogo por Asistente IA` });
      setTimeout(() => dispatch({ type: "SET_AI_NOTICE", message: null }), 3500);
      return `Filtros de catálogo aplicados exitosamente`;
    }
  });

  useCopilotAction({
    name: "openTestDriveForm",
    description: "Abre el formulario para agendar o reservar una prueba de manejo.",
    parameters: [
      { name: "carId", type: "string", description: "ID del automóvil a agendar" },
      { name: "date", type: "string", description: "Fecha de la cita (YYYY-MM-DD)" },
      { name: "name", type: "string", description: "Nombre completo del solicitante" }
    ],
    handler: async ({ carId, date, name }) => {
      dispatch({ type: "OPEN_TEST_DRIVE", carId });
      if (date) dispatch({ type: "FILL_TEST_DRIVE", field: "date", value: date });
      if (name) dispatch({ type: "FILL_TEST_DRIVE", field: "name", value: name });
      dispatch({ type: "SET_AI_NOTICE", message: `Formulario de prueba de manejo activado` });
      setTimeout(() => dispatch({ type: "SET_AI_NOTICE", message: null }), 3500);
      return `Formulario de prueba de manejo abierto correctamente`;
    }
  });

  return null;
}
