import { Car } from '@/types/agent-protocol';

export const CARS_DATA: Car[] = [
  {
    id: 'apex-suv',
    name: 'Apex Horizon SUV',
    category: 'SUV',
    price: 42000,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
    colors: ['#1e293b', '#dc2626', '#f8fafc'],
    specs: {
      power: '320 HP',
      acceleration: '0-100 km/h en 5.2s',
      rangeOrConsumption: '8.5 L/100km'
    }
  },
  {
    id: 'volt-gt',
    name: 'Volt GT Electric',
    category: 'Electric',
    price: 55000,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=800',
    colors: ['#0284c7', '#0f172a', '#10b981'],
    specs: {
      power: '450 HP',
      acceleration: '0-100 km/h en 3.5s',
      rangeOrConsumption: '520 km autonomía'
    }
  },
  {
    id: 'luxe-sedan',
    name: 'Luxe Prestige Sedan',
    category: 'Sedan',
    price: 38000,
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=800',
    colors: ['#000000', '#64748b', '#b91c1c'],
    specs: {
      power: '280 HP',
      acceleration: '0-100 km/h en 6.1s',
      rangeOrConsumption: '7.2 L/100km'
    }
  }
];
