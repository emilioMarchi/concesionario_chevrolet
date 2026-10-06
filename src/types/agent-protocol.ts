export interface Car {
  id: string;
  name: string;
  category: 'SUV' | 'Sedan' | 'Electric' | 'Deportivo';
  price: number;
  image: string;
  colors: string[];
  specs: {
    power: string;
    acceleration: string;
    rangeOrConsumption: string;
  };
}

export type UISection = 'home' | 'showroom' | 'test-drive' | 'contact';

export interface UIState {
  activeSection: UISection;
  selectedCarId: string | null;
  selectedColor: string;
  highlightedElementId: string | null;
  filters: {
    category: string;
    maxPrice: number;
  };
  testDriveForm: {
    isOpen: boolean;
    carId?: string;
    name?: string;
    date?: string;
  };
}

// Acciones que el Agente puede invocar en la UI
export type AgentUIAction =
  | { type: 'NAVIGATE'; section: UISection }
  | { type: 'SELECT_CAR'; carId: string }
  | { type: 'CHANGE_COLOR'; color: string }
  | { type: 'HIGHLIGHT_ELEMENT'; elementId: string | null }
  | { type: 'FILTER_CARS'; category?: string; maxPrice?: number }
  | { type: 'OPEN_TEST_DRIVE'; carId?: string }
  | { type: 'CLOSE_TEST_DRIVE' }
  | { type: 'FILL_TEST_DRIVE'; field: 'name' | 'date'; value: string };
