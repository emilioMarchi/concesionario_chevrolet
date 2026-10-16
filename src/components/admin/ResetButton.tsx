'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ResetButton() {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function reset() {
    if (
      !window.confirm(
        'Esto borra TODOS los leads, eventos y conversaciones (locales y en Intelligence). Es irreversible. ¿Continuar?',
      )
    ) {
      return;
    }
    setState('loading');
    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      if (!res.ok) throw new Error('reset failed');
      setState('done');
      router.refresh();
    } catch {
      setState('error');
    }
  }

  return (
    <button
      onClick={reset}
      disabled={state === 'loading'}
      className="rounded-xl border border-red-300 bg-surface px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {state === 'loading'
        ? 'Borrando…'
        : state === 'error'
          ? 'Error, reintentar'
          : state === 'done'
            ? 'Datos borrados'
            : 'Resetear datos'}
    </button>
  );
}
