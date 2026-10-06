import { Car } from '@/types/agent-protocol';

export const CARS_DATA: Car[] = [
  {
    id: 'apex-suv',
    name: 'Apex Horizon SUV',
    subtitle: 'Luxury All-Terrain SUV',
    category: 'SUV',
    price: 42000,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=1200',
    colors: [
      { name: 'Negro Azabache', hex: '#0f172a' },
      { name: 'Rojo Carmesí', hex: '#991b1b' },
      { name: 'Blanco Perlado', hex: '#f8fafc' },
      { name: 'Gris Titanio', hex: '#475569' }
    ],
    fuelType: 'Gasolina',
    transmission: 'Automática 8-Speed',
    year: 2026,
    featured: true,
    specs: {
      power: '320 HP',
      acceleration: '0-100 km/h en 5.2s',
      rangeOrConsumption: '8.5 L/100km',
      topSpeed: '240 km/h'
    }
  },
  {
    id: 'volt-gt',
    name: 'Volt GT Electric',
    subtitle: 'Next-Gen Performance EV',
    category: 'Electric',
    price: 55000,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=1200',
    colors: [
      { name: 'Azul Eléctrico', hex: '#0284c7' },
      { name: 'Negro Obsidiana', hex: '#020617' },
      { name: 'Verde Esmeralda', hex: '#059669' }
    ],
    fuelType: 'Electrico',
    transmission: 'Direct Drive AWD',
    year: 2026,
    featured: true,
    specs: {
      power: '450 HP',
      acceleration: '0-100 km/h en 3.5s',
      rangeOrConsumption: '520 km Autonomía',
      topSpeed: '260 km/h'
    }
  },
  {
    id: 'luxe-sedan',
    name: 'Luxe Prestige Sedan',
    subtitle: 'Executive Comfort & Elegance',
    category: 'Sedan',
    price: 38000,
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=1200',
    colors: [
      { name: 'Negro Piano', hex: '#000000' },
      { name: 'Plata Plataform', hex: '#94a3b8' },
      { name: 'Borgoña Metal', hex: '#701a75' }
    ],
    fuelType: 'Gasolina',
    transmission: 'Automática 7-Speed',
    year: 2025,
    specs: {
      power: '280 HP',
      acceleration: '0-100 km/h en 6.1s',
      rangeOrConsumption: '7.2 L/100km',
      topSpeed: '230 km/h'
    }
  },
  {
    id: 'cyber-track',
    name: 'CyberTrack All-Road EV',
    subtitle: 'Futuristic Endurance Pick-up',
    category: 'Electric',
    price: 68000,
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1200',
    colors: [
      { name: 'Gris Grafito', hex: '#334155' },
      { name: 'Negro Mate', hex: '#18181b' },
      { name: 'Plata Industrial', hex: '#cbd5e1' }
    ],
    fuelType: 'Electrico',
    transmission: 'Dual Motor AWD',
    year: 2026,
    featured: true,
    specs: {
      power: '600 HP',
      acceleration: '0-100 km/h en 4.1s',
      rangeOrConsumption: '610 km Autonomía',
      topSpeed: '210 km/h'
    }
  },
  {
    id: 'starlight-cabrio',
    name: 'Starlight V8 Cabriolet',
    subtitle: 'Pure Open-Air Sport Driving',
    category: 'Deportivo',
    price: 74000,
    image: 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&q=80&w=1200',
    colors: [
      { name: 'Rojo Ferrari', hex: '#b91c1c' },
      { name: 'Blanco Alpino', hex: '#ffffff' },
      { name: 'Azul Zafiro', hex: '#1e3a8a' }
    ],
    fuelType: 'Gasolina',
    transmission: 'Manual 6-Speed / PDK',
    year: 2026,
    specs: {
      power: '510 HP',
      acceleration: '0-100 km/h en 3.8s',
      rangeOrConsumption: '10.5 L/100km',
      topSpeed: '290 km/h'
    }
  },
  {
    id: 'urban-pulse',
    name: 'Urban Pulse Hybrid',
    subtitle: 'Efficient City Mobility',
    category: 'Hibrido',
    price: 29500,
    image: 'https://images.unsplash.com/photo-1541348263662-e082662d82da?auto=format&fit=crop&q=80&w=1200',
    colors: [
      { name: 'Gris Urbano', hex: '#64748b' },
      { name: 'Azul Marino', hex: '#0f172a' },
      { name: 'Blanco Nieve', hex: '#f1f5f9' }
    ],
    fuelType: 'Hibrido',
    transmission: 'e-CVT Automática',
    year: 2025,
    specs: {
      power: '190 HP',
      acceleration: '0-100 km/h en 7.8s',
      rangeOrConsumption: '4.1 L/100km',
      topSpeed: '195 km/h'
    }
  }
];
