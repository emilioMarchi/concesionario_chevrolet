'use client';

import React, { useState } from 'react';
import { useAgentUI } from '@/context/AgentUIContext';
import { CARS_DATA } from '@/data/cars';
import { formatPrice } from '@/lib/format';
import { Calculator, Calendar, CheckCircle2 } from 'lucide-react';

export function FinanceCalculator() {
  const { state, dispatch } = useAgentUI();
  const selectedCar = CARS_DATA.find((c) => c.id === state.selectedCarId) || CARS_DATA[0];

  const [months, setMonths] = useState<number>(36);
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(20);

  const price = selectedCar.price ?? 0;
  const downPayment = (price * downPaymentPercent) / 100;
  const loanAmount = price - downPayment;

  // Interés anual aproximado 8.5%
  const monthlyInterestRate = 0.085 / 12;
  const monthlyPayment =
    (loanAmount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, months)) /
    (Math.pow(1 + monthlyInterestRate, months) - 1);

  return (
    <div className="h-full max-w-5xl mx-auto p-3 sm:p-6 flex flex-col justify-center overflow-y-auto custom-scrollbar">
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-4 sm:p-8 shadow-2xl backdrop-blur-md grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 items-center">
        {/* Columna Izquierda: Configuración */}
        <div className="space-y-6">
          <div>
            <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-zinc-400" /> Plan de Financiación NovaMotors
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight mt-1">{selectedCar.name}</h2>
            <p className="text-xs text-slate-400 mt-1">
              Calcula tus cuotas personalizadas. Pídele al asistente que simule tu presupuesto o ajuste el plazo.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Pie / Entrega Inicial */}
            <div className="space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Entrega Inicial ({downPaymentPercent}%):</span>
                <span className="font-mono font-semibold text-white">${Math.round(downPayment).toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={downPaymentPercent}
                onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                className="w-full accent-zinc-200 cursor-pointer"
              />
            </div>

            {/* Plazo en Meses */}
            <div className="space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Plazo de Financiación:</span>
                <span className="font-mono font-semibold text-white">{months} Meses</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[12, 24, 36, 48].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMonths(m)}
                    className={`py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                      months === m
                        ? 'bg-zinc-200 text-zinc-950 border-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Resultado Sobrio de Cuota */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-6 relative overflow-hidden">
          <div className="space-y-4">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Estimación Mensual</span>
            {selectedCar.price == null ? (
              <div className="py-3 text-sm text-slate-300">Precio a consultar con asesoramiento.</div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white font-mono tracking-tight">
                  ${Math.round(monthlyPayment).toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">/ mes</span>
              </div>
            )}

<div className="space-y-2 pt-4 border-t border-slate-800 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Precio de Lista:</span>
                  <span className="font-mono">{formatPrice(selectedCar.price)}</span>
                </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Monto a Financiar:</span>
                <span className="font-mono">${Math.round(loanAmount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-medium">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Tasa Preferencial IA:</span>
                <span>8.5% TNA</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => dispatch({ type: 'OPEN_TEST_DRIVE', carId: selectedCar.id })}
            className="w-full py-3 bg-zinc-200 hover:bg-white text-zinc-950 text-xs font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" /> Solicitar Asesoramiento Financiero
          </button>
        </div>
      </div>
    </div>
  );
}
