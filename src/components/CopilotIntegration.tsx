'use client';

import { useAgentUI } from '@/context/AgentUIContext';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { CARS_DATA } from '@/data/cars';
import type { UISection } from '@/types/agent-protocol';

const SECTIONS: readonly string[] = ['home', 'showroom', 'models', 'finance', 'contact'];

function toSection(value: unknown): UISection {
  return SECTIONS.includes(String(value))
    ? (String(value) as UISection)
    : 'home';
}

export function CopilotIntegration() {
  const { state, dispatch } = useAgentUI();

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
    description: "Selecciona e inspecciona un modelo concreto en el Showroom visual.",
    parameters: [
      { name: "carId", type: "string", description: "ID del auto (apex-suv, volt-gt, luxe-sedan, cyber-track, starlight-cabrio, urban-pulse)", required: true }
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
    description: "Cambia el color exterior del automóvil actualmente cargado en el showroom.",
    parameters: [
      { name: "colorHex", type: "string", description: "Código Hexadecimal del color (ej. #0f172a, #991b1b, #0284c7, #b91c1c)", required: true }
    ],
    handler: async ({ colorHex }) => {
      dispatch({ type: "CHANGE_COLOR", color: colorHex });
      dispatch({ type: "SET_AI_NOTICE", message: `Color modificado a ${colorHex}` });
      setTimeout(() => dispatch({ type: "SET_AI_NOTICE", message: null }), 3500);
      return `Color exterior cambiado a ${colorHex}`;
    }
  });

  useCopilotAction({
    name: "filterCatalog",
    description: "Filtra la grilla de vehículos por categoría, tipo de motor, búsqueda de texto o presupuesto máximo.",
    parameters: [
      { name: "category", type: "string", description: "Categoría: ALL, SUV, Electric, Sedan, Deportivo, Hibrido" },
      { name: "maxPrice", type: "number", description: "Presupuesto máximo estimado" },
      { name: "fuelType", type: "string", description: "Motorización: ALL, Gasolina, Electrico, Hibrido" },
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
