'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UIState, AgentUIAction } from '@/types/agent-protocol';

interface AgentUIContextType {
  state: UIState;
  dispatch: (action: AgentUIAction) => void;
  agentLogs: string[];
  addAgentLog: (log: string) => void;
}

const initialUIState: UIState = {
  activeSection: 'home',
  selectedCarId: 'apex-suv',
  selectedColor: '#0f172a',
  highlightedElementId: null,
  filters: {
    category: 'ALL',
    maxPrice: 100000,
    fuelType: 'ALL',
    searchQuery: '',
  },
  testDriveForm: {
    isOpen: false,
  },
  aiActionNotice: null,
};

const AgentUIContext = createContext<AgentUIContextType | undefined>(undefined);

export const AgentUIProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<UIState>(initialUIState);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);

  const addAgentLog = (log: string) => {
    setAgentLogs((prev) => [log, ...prev.slice(0, 19)]);
  };

  const dispatch = (action: AgentUIAction) => {
    addAgentLog(`Action: ${action.type} -> ${JSON.stringify(action)}`);
    setState((prev) => {
      switch (action.type) {
        case 'NAVIGATE':
          return { ...prev, activeSection: action.section };
        case 'SELECT_CAR':
          return { ...prev, selectedCarId: action.carId };
        case 'CHANGE_COLOR':
          return { ...prev, selectedColor: action.color };
        case 'HIGHLIGHT_ELEMENT':
          return { ...prev, highlightedElementId: action.elementId };
        case 'FILTER_CARS':
          return {
            ...prev,
            filters: {
              category: action.category ?? prev.filters.category,
              maxPrice: action.maxPrice ?? prev.filters.maxPrice,
              fuelType: action.fuelType ?? prev.filters.fuelType,
              searchQuery: action.searchQuery ?? prev.filters.searchQuery,
            }
          };
        case 'SET_PRICE_RANGE':
          return {
            ...prev,
            filters: {
              ...prev.filters,
              maxPrice: action.maxPrice,
            }
          };
        case 'OPEN_TEST_DRIVE':
          return {
            ...prev,
            testDriveForm: {
              ...prev.testDriveForm,
              isOpen: true,
              carId: action.carId || prev.selectedCarId || undefined,
            }
          };
        case 'CLOSE_TEST_DRIVE':
          return {
            ...prev,
            testDriveForm: { isOpen: false }
          };
        case 'FILL_TEST_DRIVE':
          return {
            ...prev,
            testDriveForm: {
              ...prev.testDriveForm,
              [action.field]: action.value
            }
          };
        case 'SET_AI_NOTICE':
          return {
            ...prev,
            aiActionNotice: action.message
          };
        default:
          return prev;
      }
    });
  };

  return (
    <AgentUIContext.Provider value={{ state, dispatch, agentLogs, addAgentLog }}>
      {children}
    </AgentUIContext.Provider>
  );
};

export const useAgentUI = () => {
  const context = useContext(AgentUIContext);
  if (!context) {
    throw new Error('useAgentUI must be used within an AgentUIProvider');
  }
  return context;
};
