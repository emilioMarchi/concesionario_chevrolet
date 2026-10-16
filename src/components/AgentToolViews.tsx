'use client';

import React from 'react';
import { ToolCallStatus } from '@copilotkit/react-core/v2';
import { CheckCircle2, Loader2, Car as CarIcon, SlidersHorizontal, Calendar, FileText } from 'lucide-react';
import { CARS_DATA } from '@/data/cars';

// Vistas generativas para las tool calls de UI: en vez del JSON crudo, el chat
// muestra una tarjeta con el estado y el detalle de la acción ejecutada.
function isDone(status: ToolCallStatus): boolean {
  return status === ToolCallStatus.Complete;
}

function carName(id?: string): string {
  if (!id) return '';
  return CARS_DATA.find((car) => car.id === id)?.name ?? id;
}

function Shell({
  title,
  done,
  icon,
  children,
}: {
  title: string;
  done: boolean;
  icon: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="my-1 w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-zinc-400">{icon}</span>
        <span className="font-medium text-zinc-900">{title}</span>
        <span className="ml-auto">
          {done ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          )}
        </span>
      </div>
      {children}
    </div>
  );
}

export function NavigateToolView({ args, status }: { args: { section?: string }; status: ToolCallStatus }) {
  const done = isDone(status);
  return (
    <Shell title={done ? 'Sección abierta' : 'Navegando'} icon={<CarIcon className="h-4 w-4" />} done={done}>
      <p className="mt-1 text-zinc-600">
        {(args.section ?? 'home').toString().toUpperCase()}
      </p>
    </Shell>
  );
}

export function SelectCarToolView({ args, status }: { args: { carId?: string }; status: ToolCallStatus }) {
  const done = isDone(status);
  return (
    <Shell title={done ? 'Modelo en el visor' : 'Cargando modelo'} icon={<CarIcon className="h-4 w-4" />} done={done}>
      <p className="mt-1 text-zinc-600">{carName(args.carId)}</p>
    </Shell>
  );
}

export function VehicleInfoToolView({
  args,
  status,
}: {
  args: { carId?: string; detail?: string };
  status: ToolCallStatus;
}) {
  const done = isDone(status);
  const isAll = !args.carId || args.carId === 'all';
  return (
    <Shell
      title={done ? 'Ficha consultada' : 'Consultando ficha'}
      icon={<FileText className="h-4 w-4" />}
      done={done}
    >
      <div className="mt-1 space-y-0.5 text-zinc-600">
        <p>{isAll ? 'Todo el catálogo' : carName(args.carId)}</p>
        {args.detail && args.detail !== 'all' && (
          <p className="text-xs text-zinc-500">Detalle: {args.detail}</p>
        )}
      </div>
    </Shell>
  );
}

export function ChangeColorToolView({ args, status }: { args: { colorHex?: string; carId?: string }; status: ToolCallStatus }) {
  const done = isDone(status);
  return (
    <Shell title={done ? 'Color aplicado' : 'Cambiando color'} icon={<CarIcon className="h-4 w-4" />} done={done}>
      <div className="mt-1 flex items-center gap-2 text-zinc-600">
        <span
          className="inline-block h-4 w-4 rounded-full border border-zinc-300"
          style={{ backgroundColor: args.colorHex ?? 'transparent' }}
        />
        <span>{carName(args.carId)}</span>
      </div>
    </Shell>
  );
}

export function FilterToolView({
  args,
  status,
}: {
  args: { category?: string; maxPrice?: number; fuelType?: string; searchQuery?: string };
  status: ToolCallStatus;
}) {
  const done = isDone(status);
  const chips = [
    args.category && args.category !== 'ALL' ? args.category : null,
    args.fuelType && args.fuelType !== 'ALL' ? args.fuelType : null,
    args.maxPrice ? `Hasta $${(args.maxPrice / 1_000_000).toFixed(1)}M` : null,
    args.searchQuery ? `"${args.searchQuery}"` : null,
  ].filter(Boolean) as string[];

  return (
    <Shell title={done ? 'Filtros aplicados' : 'Filtrando catálogo'} icon={<SlidersHorizontal className="h-4 w-4" />} done={done}>
      {chips.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span key={chip} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
              {chip}
            </span>
          ))}
        </div>
      )}
    </Shell>
  );
}

export function OpenTestDriveToolView({
  args,
  status,
}: {
  args: { carId?: string; date?: string; name?: string };
  status: ToolCallStatus;
}) {
  const done = isDone(status);
  return (
    <Shell title={done ? 'Prueba de manejo' : 'Abriendo formulario'} icon={<Calendar className="h-4 w-4" />} done={done}>
      <div className="mt-1 space-y-0.5 text-zinc-600">
        {args.carId && <p>{carName(args.carId)}</p>}
        {args.date && <p>Fecha: {args.date}</p>}
        {args.name && <p>A nombre de {args.name}</p>}
      </div>
    </Shell>
  );
}
