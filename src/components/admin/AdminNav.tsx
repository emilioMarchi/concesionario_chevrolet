'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Resumen' },
  { href: '/admin/leads', label: 'Leads' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <span className="text-sm font-semibold">NovaMotors · Leads</span>
        <nav className="flex gap-1">
          {LINKS.map((link) => {
            const active = link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm ${active ? 'bg-accent text-white' : 'text-muted hover:bg-black/5'}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={logout} className="ml-auto text-sm text-muted hover:text-foreground">
          Salir
        </button>
      </div>
    </header>
  );
}
