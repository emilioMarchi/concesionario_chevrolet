'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CopilotChat, useThreads } from '@copilotkit/react-core/v2';
import { useAgentUI } from '@/context/AgentUIContext';
import { MobileAgentChat } from '@/components/MobileAgentChat';
import { Sparkles, X, Plus, Clock, Archive, Trash2, Check } from 'lucide-react';

function ThreadPicker({
  latestThread,
  isLoading,
  activeThreadId,
  onSelectThread,
  startNewThread,
  deleteThread,
  disabled,
  error,
}: {
  latestThread?: import('@copilotkit/react-core/v2').Thread;
  isLoading: boolean;
  activeThreadId?: string;
  onSelectThread: (threadId: string) => void;
  startNewThread: () => void;
  deleteThread: (threadId: string) => Promise<void>;
  disabled?: boolean;
  error?: string | null;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleDelete = async (threadId: string) => {
    try {
      await deleteThread(threadId);
    } finally {
      setConfirmingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-3 border-b border-zinc-200">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <div className="w-4 h-4 border-2 border-zinc-300 border-t-emerald-500 rounded-full animate-spin" />
          Cargando hilos...
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-zinc-200 bg-zinc-50/50">
      <div className="p-3 flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-600 uppercase tracking-wider">Historial</p>
        <button
          onClick={startNewThread}
          disabled={disabled}
          aria-label="Nueva conversación"
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200 transition-colors disabled:opacity-50"
          title="Nueva conversación"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {!latestThread ? (
        <div className="px-3 pb-3 text-center text-sm text-zinc-400">
          Sin conversaciones previas
        </div>
      ) : (
        <ul className="px-2 pb-2 space-y-1 max-h-48 overflow-y-auto">
          <li
            key={latestThread.id}
            onClick={() => onSelectThread(latestThread.id)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${
              latestThread.id === activeThreadId
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate flex-1">
              {latestThread.name ?? 'Conversación sin título'}
            </span>
            {latestThread.archived && <Archive className="w-3.5 h-3.5" />}
            {confirmingId === latestThread.id ? (
              <span className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDelete(latestThread.id);
                  }}
                  disabled={disabled}
                  aria-label="Confirmar eliminación"
                  title="Confirmar eliminación"
                  className="p-1 rounded-md text-red-600 hover:bg-red-100 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmingId(null);
                  }}
                  aria-label="Cancelar eliminación"
                  title="Cancelar"
                  className="p-1 rounded-md text-zinc-500 hover:bg-zinc-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmingId(latestThread.id);
                }}
                disabled={disabled}
                aria-label="Eliminar conversación"
                title="Eliminar conversación"
                className="p-1 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </li>
        </ul>
      )}
      {error && <div className="px-3 pb-2 text-xs text-red-600">{error}</div>}
    </div>
  );
}

export function AgentSidebar() {
  const { state, dispatch } = useAgentUI();
  const open = state.agentOpen;

  const { threads, isLoading, startNewThread, deleteThread, isMutating, listError } = useThreads({
    agentId: 'default',
  });

  // Siempre arranca en la conversación más reciente. El override sólo cambia
  // cuando el usuario elige otro hilo o pide uno nuevo; si el hilo elegido se
  // borra, vuelve a caer en el más reciente (o en la bienvenida si no queda ninguno).
  const [threadOverride, setThreadOverride] = useState<
    { kind: 'thread'; id: string } | { kind: 'new' } | null
  >(null);

  const latestThread = useMemo(() => {
    const sorted = [...threads].sort(
      (a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()
    );
    return sorted[0];
  }, [threads]);

  const activeThreadId =
    threadOverride?.kind === 'new'
      ? undefined
      : threadOverride?.kind === 'thread' && threads.some((t) => t.id === threadOverride.id)
        ? threadOverride.id
        : latestThread?.id;

  const handleSelectThread = (threadId: string) =>
    setThreadOverride({ kind: 'thread', id: threadId });

  const handleStartNewThread = () => {
    setThreadOverride({ kind: 'new' });
    startNewThread();
  };

  // Montamos una sola instancia de chat (desktop nativo o mobile propio) para
  // evitar que dos paneles compartan el agente y dupliquen mensajes/renders.
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const close = () => dispatch({ type: 'CLOSE_AGENT' });

  const chatEl = (
    <CopilotChat
      className="h-full"
      threadId={activeThreadId}
      labels={{
        welcomeMessageText:
          '¡Hola! Soy tu asesor virtual. Puedo mostrarte modelos, comparar versiones, cambiar colores o simular tu financiación. ¿Por dónde querés empezar?',
      }}
    />
  );

  if (!isDesktop) return <MobileAgentChat />;

  return (
    <>
      {/* Desktop: barra lateral integrada al layout */}
      {open && (
        <aside className="nv-agent hidden lg:flex flex-col h-full w-[384px] shrink-0 border-l border-zinc-200 bg-white">
          <div className="h-16 px-4 flex items-center justify-between border-b border-zinc-200 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900 leading-tight truncate">
                  Asesor NovaMotors
                </p>
                <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  En línea
                </p>
              </div>
            </div>
            <button
              onClick={close}
              aria-label="Cerrar asesor"
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ThreadPicker
            latestThread={latestThread}
            isLoading={isLoading}
            activeThreadId={activeThreadId}
            onSelectThread={handleSelectThread}
            startNewThread={handleStartNewThread}
            deleteThread={deleteThread}
            disabled={isMutating}
            error={listError ? listError.message : null}
          />
          <div className="flex-1 min-h-0">{chatEl}</div>
        </aside>
      )}
    </>
  );
}