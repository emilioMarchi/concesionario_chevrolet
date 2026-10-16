import type { InterestLevel, LeadStatus, LeadType } from '@/types/leads';

const INTEREST_STYLES: Record<InterestLevel, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-zinc-100 text-zinc-600',
};

const TYPE_STYLES: Record<LeadType, string> = {
  lead: 'bg-emerald-100 text-emerald-700',
  conversation: 'bg-zinc-100 text-zinc-600',
  support: 'bg-sky-100 text-sky-700',
};

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: 'bg-zinc-100 text-zinc-600',
  hot: 'bg-red-100 text-red-700',
  contacted: 'bg-emerald-100 text-emerald-700',
};

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>;
}

export function InterestBadge({ level }: { level: InterestLevel }) {
  return <Chip className={INTEREST_STYLES[level]}>{level}</Chip>;
}

export function TypeBadge({ type }: { type: LeadType }) {
  return <Chip className={TYPE_STYLES[type]}>{type}</Chip>;
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <Chip className={STATUS_STYLES[status]}>{status}</Chip>;
}
