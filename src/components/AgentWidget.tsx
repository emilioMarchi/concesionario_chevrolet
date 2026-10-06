'use client';

import React, { useState } from 'react';
import { useAgentUI } from '@/context/AgentUIContext';
import { Bot, Send, Sparkles, Loader2 } from 'lucide-react';
import { useCopilotChatInternal } from '@copilotkit/react-core';

function toText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object' && 'text' in part) {
        return typeof (part as { text?: unknown }).text === 'string'
          ? (part as { text: string }).text
          : '';
      }
      return '';
    })
    .join('');
}

export function AgentWidget() {
  const { dispatch, agentLogs, addAgentLog } = useAgentUI();
  const [input, setInput] = useState('');

  const { messages, sendMessage, isLoading } = useCopilotChatInternal();

  const visibleMessages = (messages ?? [])
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .map((msg) => ({ id: msg.id, role: msg.role, text: toText(msg.content) }))
    .filter((msg) => msg.text.length > 0);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    addAgentLog(`Usuario: "${userText}"`);

    try {
      await sendMessage({
        id: crypto.randomUUID(),
        role: 'user',
        content: userText,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de conexión';
      console.error('Error al enviar mensaje a CopilotKit:', err);
      addAgentLog(`[Error]: ${message}`);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 z-40 max-h-[80vh]">
      {/* Header */}
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-400" />
          <span className="font-semibold text-sm">Agente Copilot (Voz / Chat)</span>
        </div>
        <span className="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-300 rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> {isLoading ? 'Procesando...' : 'Live Protocol'}
        </span>
      </div>

      {/* Visor de Conversación y Acciones del Agente */}
      <div className="p-3 bg-slate-950 text-xs font-mono h-48 overflow-y-auto space-y-2 border-b border-slate-800">
        {visibleMessages.length === 0 && (agentLogs || []).length === 0 && (
          <div className="text-slate-600">{'// Conectado a ovni-agent (8080). Escribe una orden...'}</div>
        )}

        {/* Historial de Mensajes Reales de CopilotKit */}
        {visibleMessages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`p-2 rounded-lg ${isUser ? 'bg-indigo-950/60 text-indigo-200 border border-indigo-800/40' : 'bg-slate-900 text-emerald-300 border border-slate-800'}`}>
              <span className="font-bold">{isUser ? 'Tú: ' : 'Agente: '}</span>
              <span className="whitespace-pre-wrap">{msg.text}</span>
            </div>
          );
        })}

        {/* Protocol Logs */}
        {(agentLogs || []).map((log, index) => (
          <div key={`log-${index}`} className="text-slate-500 italic text-[11px]">
            {log}
          </div>
        ))}
      </div>

      {/* Atajos Rápidos de Prueba */}
      <div className="p-2 bg-slate-900 border-b border-slate-800 flex flex-wrap gap-1 text-xs">
        <button
          onClick={() => {
            dispatch({ type: 'NAVIGATE', section: 'showroom' });
            dispatch({ type: 'FILTER_CARS', category: 'Electric' });
          }}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
        >
          ⚡ Filtrar Eléctricos
        </button>
        <button
          onClick={() => dispatch({ type: 'CHANGE_COLOR', color: '#dc2626' })}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
        >
          🎨 Color Rojo
        </button>
        <button
          onClick={() => dispatch({ type: 'OPEN_TEST_DRIVE' })}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
        >
          📅 Prueba de Manejo
        </button>
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 bg-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          placeholder={isLoading ? 'El agente está respondiendo...' : 'Ej: "Cámbialo a rojo y muestra el eléctrico"'}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
