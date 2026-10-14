'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { useAgent, UseAgentUpdate } from '@copilotkit/react-core/v2';
import { useAgentUI } from '@/context/AgentUIContext';
import { ArrowUp, ChevronUp, Loader2, Mic, Minimize2, Sparkles, Square } from 'lucide-react';

// Cada burbuja transitoria permanece visible unos segundos y luego se oculta.
const BUBBLE_TTL_BASE = 5200; // ms base
const BUBBLE_TTL_PER_CHAR = 45; // ms extra por caracter
const BUBBLE_TTL_MAX = 15000; // tope
const MAX_BUBBLES = 4; // burbujas simultáneas como máximo

const GREETING =
  '¡Hola! Soy tu asesor virtual. Puedo mostrarte modelos, comparar versiones, cambiar colores o simular tu financiación. ¿Por dónde querés empezar?';

type ChatRole = 'user' | 'assistant';

interface Bubble {
  id: string;
  role: ChatRole;
  text: string;
}

// Sólo mostramos texto plano: los mensajes de tool-calls vienen vacíos.
function messageText(content: unknown): string {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === 'string'
          ? part
          : typeof (part as { text?: unknown })?.text === 'string'
            ? (part as { text: string }).text
            : ''
      )
      .join('')
      .trim();
  }
  return '';
}

function toChatRole(role: unknown): ChatRole | null {
  if (role === 'user') return 'user';
  if (role === 'assistant') return 'assistant';
  return null;
}

// `visibleMessages` viene tipado como la clase base gql `Message` (role/content
// viven en las subclases), así que normalizamos accediendo de forma segura.
function readMessage(message: unknown): { id: string; role: ChatRole | null; text: string } {
  const raw = (message ?? {}) as { id?: unknown; role?: unknown; content?: unknown };
  return {
    id: String(raw.id ?? ''),
    role: toChatRole(raw.role),
    text: messageText(raw.content),
  };
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function bubbleTtl(text: string): number {
  return Math.min(BUBBLE_TTL_MAX, BUBBLE_TTL_BASE + text.length * BUBBLE_TTL_PER_CHAR);
}

function BackgroundBubble({ role, text }: { role: ChatRole; text: string }) {
  const isUser = role === 'user';
  return (
    <div className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm',
          isUser
            ? 'bg-zinc-900 text-white rounded-br-md'
            : 'bg-white/90 backdrop-blur-md border border-white/70 text-zinc-800 rounded-bl-md'
        )}
      >
        {text}
      </div>
    </div>
  );
}

function TransientBubble({ role, text }: { role: ChatRole; text: string }) {
  const isUser = role === 'user';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={clsx(
          'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-md',
          isUser
            ? 'bg-zinc-900/90 text-white rounded-br-md'
            : 'bg-white/85 backdrop-blur-md border border-white/70 text-zinc-800 rounded-bl-md'
        )}
      >
        {text}
      </div>
    </motion.div>
  );
}

export function MobileAgentChat() {
  const { state, dispatch } = useAgentUI();
  // `useAgent` opera sobre el store del agente AG-UI; `updates` hace que el
  // componente se re-renderice cuando cambian los mensajes o el estado de run.
  const { agent } = useAgent({
    updates: [UseAgentUpdate.OnMessagesChanged, UseAgentUpdate.OnRunStatusChanged],
  });
  const rawMessages = agent.messages;
  const isLoading = agent.isRunning;

  const expanded = state.agentMobileSnap === 'expanded';

  const [input, setInput] = useState('');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);

  const seenRef = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recTimerRef = useRef<number | null>(null);

  // Encola una burbuja transitoria con auto-ocultado independiente (respeta el orden).
  const pushBubble = useCallback((bubble: Bubble) => {
    setBubbles((prev) => {
      const next = [...prev, bubble];
      return next.length > MAX_BUBBLES ? next.slice(next.length - MAX_BUBBLES) : next;
    });
    window.setTimeout(() => {
      setBubbles((prev) => prev.filter((item) => item.id !== bubble.id));
    }, bubbleTtl(bubble.text));
  }, []);

  // Al soltar, sube el audio a `/api/transcribe` (STT de ovni-agent vía el
  // TranscriptionService de v2) y envía la transcripción como mensaje del agente.
  const handleRecordedAudio = useCallback(
    async (blob: Blob) => {
      setTranscribing(true);
      try {
        const form = new FormData();
        form.append('audio', blob, 'audio.webm');
        const response = await fetch('/api/transcribe', { method: 'POST', body: form });
        if (!response.ok) throw new Error(`STT ${response.status}`);
        const data = (await response.json()) as { transcript?: string };
        const text = (data.transcript ?? '').trim();
        if (!text) return;
        agent.addMessage({ id: crypto.randomUUID(), role: 'user', content: text });
        await agent.runAgent();
      } catch (error) {
        console.error('No se pudo transcribir el audio:', error);
      } finally {
        setTranscribing(false);
      }
    },
    [agent]
  );

  // Detecta mensajes nuevos y los muestra como burbujas. Los del asistente se
  // encolan recién cuando termina el streaming para que se lean completos.
  useEffect(() => {
    for (const message of rawMessages) {
      const { id, role, text } = readMessage(message);
      if (!id || seenRef.current.has(id)) continue;
      if (!role) {
        seenRef.current.add(id);
        continue;
      }
      if (!text) continue; // tool-calls / mensajes vacíos: esperar
      if (role === 'assistant' && isLoading) continue; // esperar fin del streaming
      seenRef.current.add(id);
      // Reaccionamos a la llegada de mensajes de un store externo (CopilotKit),
      // por eso actualizamos estado dentro del efecto.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!expanded) pushBubble({ id, role, text });
    }
  }, [rawMessages, isLoading, expanded, pushBubble]);

  const visibleMessages = useMemo(
    () =>
      rawMessages
        .map(readMessage)
        .filter((item): item is { id: string; role: ChatRole; text: string } => item.role !== null && item.text.length > 0),
    [rawMessages]
  );

  const hasConversation = visibleMessages.length > 0;

  // Auto-scroll al fondo en el modo expandido.
  useEffect(() => {
    if (!expanded || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [visibleMessages, isLoading, expanded]);

  const submit = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    agent.addMessage({ id: crypto.randomUUID(), role: 'user', content: text });
    await agent.runAgent();
  }, [input, isLoading, agent]);

  const expand = () => dispatch({ type: 'EXPAND_AGENT_MOBILE' });
  const collapse = () => dispatch({ type: 'SET_AGENT_MOBILE_SNAP', snap: 'peek' });

  // ---- Grabación (hold to record) ------------------------------------------
  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      chunksRef.current = [];
      handleRecordedAudio(blob);
    };
    if (recorder.state !== 'inactive') recorder.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    if (recTimerRef.current !== null) {
      window.clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    setRecording(false);
  }, [handleRecordedAudio]);

  const startRecording = useCallback(async () => {
    if (recorderRef.current) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      console.warn('Grabación de audio no soportada en este navegador.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecSeconds(0);
      setRecording(true);
      recTimerRef.current = window.setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch (error) {
      console.error('No se pudo acceder al micrófono:', error);
    }
  }, []);

  // Soltar en cualquier parte de la pantalla detiene la grabación.
  useEffect(() => {
    if (!recording) return;
    const stop = () => stopRecording();
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, [recording, stopRecording]);

  useEffect(() => () => stopRecording(), [stopRecording]);

  return (
    <div
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex flex-col pointer-events-none"
      style={expanded ? { height: 'min(78dvh, 620px)' } : undefined}
    >
      {/* Encabezado (solo expandido) */}
      {expanded && (
        <div className="pointer-events-auto shrink-0 flex items-center justify-between px-4 py-2.5 bg-white/95 backdrop-blur-md border-b border-zinc-200 rounded-t-2xl shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-zinc-900">Asesor NovaMotors</p>
              <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                En línea
              </p>
            </div>
          </div>
          <button
            onClick={collapse}
            aria-label="Minimizar asesor"
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Zona de mensajes: lista permanente (expandido) o burbujas transitorias */}
      {expanded ? (
        <div
          ref={scrollRef}
          className="pointer-events-auto flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-3 space-y-2 bg-white/80 backdrop-blur-md"
        >
          {!hasConversation && <BackgroundBubble role="assistant" text={GREETING} />}
          {visibleMessages.map((message) => (
            <BackgroundBubble key={message.id} role={message.role} text={message.text} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-zinc-400 text-xs pl-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Escribiendo…
            </div>
          )}
        </div>
      ) : (
        <div className="px-3 pb-2 pr-20 space-y-2 overflow-hidden">
          <button
            onClick={expand}
            className="pointer-events-auto mx-auto flex items-center gap-1 rounded-full bg-white/90 border border-zinc-200 px-3 py-1 text-[11px] font-medium text-zinc-600 shadow-sm backdrop-blur-md"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            Ver conversación
          </button>

          <AnimatePresence initial={false}>
            {!hasConversation && bubbles.length === 0 && (
              <motion.div
                key="greeting"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <BackgroundBubble role="assistant" text={GREETING} />
              </motion.div>
            )}
            {bubbles.map((bubble) => (
              <TransientBubble key={bubble.id} role={bubble.role} text={bubble.text} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Barra de input: siempre visible */}
      <div className="pointer-events-auto shrink-0 bg-white border-t border-zinc-200 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] px-2.5 py-2 pb-[max(env(safe-area-inset-bottom),8px)]">
        <div className="flex items-end gap-1.5">
          {recording ? (
            <div className="flex-1 min-w-0 h-11 flex items-center gap-2 rounded-2xl bg-red-50 px-3">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-sm font-medium text-red-600 tabular-nums shrink-0">
                {formatDuration(recSeconds)}
              </span>
              <span className="text-xs text-red-400/90 truncate">Grabando… soltá para enviar</span>
            </div>
          ) : transcribing ? (
            <div className="flex-1 min-w-0 h-11 flex items-center gap-2 rounded-2xl bg-zinc-100 px-3">
              <Loader2 className="w-4 h-4 text-zinc-500 animate-spin shrink-0" />
              <span className="text-sm text-zinc-500 truncate">Transcribiendo audio…</span>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
              rows={1}
              placeholder="Escribí tu consulta…"
              className="flex-1 min-w-0 resize-none max-h-28 overflow-y-auto rounded-2xl bg-zinc-100 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          )}

          <button
            type="button"
            onPointerDown={(event) => {
              event.preventDefault();
              void startRecording();
            }}
            onContextMenu={(event) => event.preventDefault()}
            disabled={transcribing}
            aria-label="Mantener para grabar audio"
            className={clsx(
              'shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors touch-none select-none',
              recording
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105'
                : transcribing
                  ? 'bg-zinc-100 text-zinc-300'
                  : 'bg-zinc-100 text-zinc-600 active:bg-zinc-200'
            )}
          >
            <Mic className="w-5 h-5" />
          </button>

          {!recording && !transcribing && (
            <button
              type="button"
              onClick={() => (isLoading ? agent.abortRun() : void submit())}
              disabled={!isLoading && input.trim().length === 0}
              aria-label={isLoading ? 'Detener respuesta' : 'Enviar mensaje'}
              className={clsx(
                'shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors',
                isLoading
                  ? 'bg-zinc-900 text-white'
                  : input.trim().length === 0
                    ? 'bg-zinc-100 text-zinc-300'
                    : 'bg-zinc-900 text-white active:bg-zinc-700'
              )}
            >
              {isLoading ? <Square className="w-4 h-4" /> : <ArrowUp className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
