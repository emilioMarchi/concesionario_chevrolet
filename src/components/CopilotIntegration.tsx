'use client';

import { useAgentUI } from '@/context/AgentUIContext';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { CARS_DATA } from '@/data/cars';
import type { UISection } from '@/types/agent-protocol';

const SECTIONS: readonly string[] = ['home', 'showroom', 'test-drive', 'contact'];

function toSection(value: unknown): UISection {
  return SECTIONS.includes(String(value))
    ? (String(value) as UISection)
    : 'home';
}

export function CopilotIntegration() {
  const { state, dispatch } = useAgentUI();

  // 1. Exponer el estado de la UI a la IA (UI State Exposure)
  useCopilotReadable({
    description: "Estado actual de la interfaz de la concesionaria de autos NovaMotors",
    value: {
      activeSection: state.activeSection,
      selectedCarId: state.selectedCarId,
      selectedColor: state.selectedColor,
      filters: state.filters,
      testDriveForm: state.testDriveForm,
      availableCars: CARS_DATA.map(c => ({ id: c.id, name: c.name, category: c.category, price: c.price }))
    }
  });

  // 2. Registrar Copilot Actions (Tool Calls de UI)
  useCopilotAction({
    name: "navigateToSection",
    description: "Cambia la sección visible del sitio. Usar SOLO si el usuario pide ver, ir a o mostrar una sección concreta (ej: 'llevame a contacto', 'mostrame el showroom'). No usar para saludar ni para preguntas de conocimiento.",
    parameters: [
      { name: "section", type: "string", description: "Sección a la que navegar: home, showroom o contact", required: true }
    ],
    handler: async ({ section }) => {
      dispatch({ type: "NAVIGATE", section: toSection(section) });
      return `Navegado exitosamente a la sección ${section}`;
    }
  });

  useCopilotAction({
    name: "selectCarModel",
    description: "Muestra un auto concreto en el visor. Usar SOLO si el usuario pide ver o comparar un modelo específico.",
    parameters: [
      { name: "carId", type: "string", description: "ID del auto (apex-suv, volt-gt, luxe-sedan)", required: true }
    ],
    handler: async ({ carId }) => {
      dispatch({ type: "NAVIGATE", section: "showroom" });
      dispatch({ type: "SELECT_CAR", carId });
      return `Auto ${carId} seleccionado en el visor`;
    }
  });

  useCopilotAction({
    name: "changeCarColor",
    description: "Cambia el color del auto en pantalla. Usar SOLO si el usuario pide un color o cambiar el color del vehículo.",
    parameters: [
      { name: "colorHex", type: "string", description: "Código Hexadecimal o nombre del color (ej. #dc2626 para rojo, #0284c7 para azul)", required: true }
    ],
    handler: async ({ colorHex }) => {
      dispatch({ type: "CHANGE_COLOR", color: colorHex });
      return `Color del vehículo cambiado a ${colorHex}`;
    }
  });

  useCopilotAction({
    name: "filterCatalog",
    description: "Filtra el catálogo por categoría. Usar SOLO si el usuario pide filtrar, buscar o ver autos de un tipo (ej: 'mostrame los SUV').",
    parameters: [
      { name: "category", type: "string", description: "Categoría: ALL, SUV, Electric, Sedan", required: true }
    ],
    handler: async ({ category }) => {
      dispatch({ type: "NAVIGATE", section: "showroom" });
      dispatch({ type: "FILTER_CARS", category });
      return `Catálogo filtrado por categoría ${category}`;
    }
  });

  useCopilotAction({
    name: "openTestDriveForm",
    description: "Abre el formulario de prueba de manejo. Usar SOLO si el usuario quiere agendar o reservar una prueba de manejo.",
    parameters: [
      { name: "carId", type: "string", description: "ID del auto a probar" },
      { name: "date", type: "string", description: "Fecha en formato YYYY-MM-DD" },
      { name: "name", type: "string", description: "Nombre del cliente" }
    ],
    handler: async ({ carId, date, name }) => {
      dispatch({ type: "OPEN_TEST_DRIVE", carId });
      if (date) dispatch({ type: "FILL_TEST_DRIVE", field: "date", value: date });
      if (name) dispatch({ type: "FILL_TEST_DRIVE", field: "name", value: name });
      return `Formulario de prueba de manejo abierto y configurado`;
    }
  });

  return null;
}
