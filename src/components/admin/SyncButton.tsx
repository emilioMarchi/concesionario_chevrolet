'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SyncButton() {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function sync() {
    setState('loading');
    try {
      const res = await fetch('/api/admin/sync', { method: 'POST' });
      if (!res.ok) throw new Error('sync failed');
      setState('done');
      router.refresh();
    } catch {
      setState('error');
    }
  }

  return (
    <button
      onClick={sync}
      disabled={state === 'loading'}
      className="rounded-xl border border-line bg-surface px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50"
    >
      {state === 'loading' ? 'Sincronizando…' : state === 'error' ? 'Error, reintentar' : 'Sincronizar Intelligence'}
    </button>
  );
}
