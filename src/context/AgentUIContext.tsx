'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { UIState, AgentUIAction, AgentMobileSnap } from '@/types/agent-protocol';
import { CARS_DATA } from '@/data/cars';
import { trackUIAction } from '@/lib/leads/client';

interface AgentUIContextType {
  state: UIState;
  dispatch: (action: AgentUIAction) => void;
  agentLogs: string[];
  addAgentLog: (log: string) => void;
}

const initialUIState: UIState = {
  activeSection: 'home',
  selectedCarId: CARS_DATA[0]?.id ?? null,
  selectedColor: CARS_DATA[0]?.colors[0]?.hex ?? '',
  highlightedElementId: null,
  filters: {
    category: 'ALL',
    maxPrice: 50000000,
    fuelType: 'ALL',
    searchQuery: '',
  },
  testDriveForm: {
    isOpen: false,
  },
  agentOpen: true,
  agentMobileSnap: 'peek' as AgentMobileSnap,
  pendingPrompt: null,
  aiActionNotice: null,
};

const AgentUIContext = createContext<AgentUIContextType | undefined>(undefined);

export const AgentUIProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<UIState>(initialUIState);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);

  const addAgentLog = useCallback((log: string) => {
    setAgentLogs((prev) => [log, ...prev.slice(0, 19)]);
  }, []);

  const dispatch = useCallback((action: AgentUIAction) => {
    addAgentLog(`Action: ${action.type} -> ${JSON.stringify(action)}`);
    trackUIAction({ type: action.type, name: action.type, payload: action });
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
        case 'OPEN_AGENT':
          return { ...prev, agentOpen: true, agentMobileSnap: 'peek' };
        case 'CLOSE_AGENT':
          return { ...prev, agentOpen: false, agentMobileSnap: 'closed' };
        case 'TOGGLE_AGENT':
          return {
            ...prev,
            agentOpen: !prev.agentOpen,
            agentMobileSnap: prev.agentMobileSnap === 'closed' ? 'peek' : 'closed'
          };
        case 'SET_AGENT_MOBILE_SNAP':
          return { ...prev, agentMobileSnap: action.snap };
        case 'OPEN_AGENT_MOBILE_PEAK':
          return { ...prev, agentMobileSnap: 'peek', agentOpen: true };
        case 'EXPAND_AGENT_MOBILE':
          return { ...prev, agentMobileSnap: 'expanded', agentOpen: true };
        case 'CLOSE_AGENT_MOBILE':
          return { ...prev, agentMobileSnap: 'closed', agentOpen: true };
        case 'TOGGLE_AGENT_MOBILE':
          return {
            ...prev,
            agentMobileSnap: prev.agentMobileSnap === 'closed' ? 'peek' : 'closed',
            agentOpen: true
          };
        case 'ASK_AGENT':
          return {
            ...prev,
            agentOpen: true,
            agentMobileSnap: 'expanded',
            pendingPrompt: action.message
          };
        case 'CLEAR_PENDING_PROMPT':
          return { ...prev, pendingPrompt: null };
        case 'SET_AI_NOTICE':
          return {
            ...prev,
            aiActionNotice: action.message
          };
        default:
          return prev;
      }
    });
  }, [addAgentLog]);

  const value = useMemo(
    () => ({ state, dispatch, agentLogs, addAgentLog }),
    [state, dispatch, agentLogs, addAgentLog]
  );

  return (
    <AgentUIContext.Provider value={value}>
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
