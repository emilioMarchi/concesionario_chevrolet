export type CarCategory = 'Auto' | 'SUV' | 'Pick-up';
export type FuelType = 'Gasolina' | 'Diesel' | 'Electrico' | 'Hibrido';

export type AgentMobileSnap = 'closed' | 'peek' | 'expanded';

export interface CarColor {
  id?: string;
  name: string;
  hex: string;
  image?: string | null;
  chip?: string | null;
}

export interface CarTrim {
  id: string;
  name: string;
}

export interface CarSpecs {
  engine?: string | null;
  power?: string | null;
  torque?: string | null;
  transmission?: string | null;
  acceleration?: string | null;
  topSpeed?: string | null;
  rangeOrConsumption?: string | null;
  dimensions?: {
    length?: string;
    width?: string;
    height?: string;
    wheelbase?: string;
    groundClearance?: string;
  };
  capacity?: {
    fuelTank?: string;
    trunk?: string;
    seats?: string;
  };
}

export interface Car {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  category: CarCategory;
  price: number | null;
  priceRaw?: string | null;
  image: string;
  hero?: string | null;
  colors: CarColor[];
  fuelType: FuelType;
  transmission: string;
  year: number;
  featured?: boolean;
  specs: CarSpecs;
  trims?: CarTrim[];
  keySpecs?: Record<string, string>;
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
  agentOpen: boolean;
  agentMobileSnap: AgentMobileSnap;
  pendingPrompt: string | null;
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
  | { type: 'OPEN_AGENT' }
  | { type: 'CLOSE_AGENT' }
  | { type: 'TOGGLE_AGENT' }
  | { type: 'SET_AGENT_MOBILE_SNAP'; snap: AgentMobileSnap }
  | { type: 'OPEN_AGENT_MOBILE_PEAK' }
  | { type: 'EXPAND_AGENT_MOBILE' }
  | { type: 'CLOSE_AGENT_MOBILE' }
  | { type: 'TOGGLE_AGENT_MOBILE' }
  | { type: 'ASK_AGENT'; message: string }
  | { type: 'CLEAR_PENDING_PROMPT' }
  | { type: 'SET_AI_NOTICE'; message: string | null };
