export type CarCategory = 'SUV' | 'Sedan' | 'Electric' | 'Deportivo' | 'Hibrido';
export type FuelType = 'Gasolina' | 'Electrico' | 'Hibrido';

export interface Car {
  id: string;
  name: string;
  subtitle: string;
  category: CarCategory;
  price: number;
  image: string;
  colors: { name: string; hex: string }[];
  fuelType: FuelType;
  transmission: string;
  year: number;
  featured?: boolean;
  specs: {
    power: string;
    acceleration: string;
    rangeOrConsumption: string;
    topSpeed: string;
  };
}

export type UISection = 'home' | 'showroom' | 'models' | 'finance' | 'contact';

export interface UIState {
  activeSection: UISection;
  selectedCarId: string | null;
  selectedColor: string;
  highlightedElementId: string | null;
  filters: {
    category: string;
    maxPrice: number;
    fuelType: string;
    searchQuery: string;
  };
  testDriveForm: {
    isOpen: boolean;
    carId?: string;
    name?: string;
    date?: string;
  };
  aiActionNotice: string | null;
}

// Acciones que el Agente puede invocar en la UI
export type AgentUIAction =
  | { type: 'NAVIGATE'; section: UISection }
  | { type: 'SELECT_CAR'; carId: string }
  | { type: 'CHANGE_COLOR'; color: string }
  | { type: 'HIGHLIGHT_ELEMENT'; elementId: string | null }
  | { type: 'FILTER_CARS'; category?: string; maxPrice?: number; fuelType?: string; searchQuery?: string }
  | { type: 'SET_PRICE_RANGE'; maxPrice: number }
  | { type: 'OPEN_TEST_DRIVE'; carId?: string }
  | { type: 'CLOSE_TEST_DRIVE' }
  | { type: 'FILL_TEST_DRIVE'; field: 'name' | 'date'; value: string }
  | { type: 'SET_AI_NOTICE'; message: string | null };
