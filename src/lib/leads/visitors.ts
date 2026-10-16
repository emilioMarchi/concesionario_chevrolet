import 'server-only';
import { leadsStore } from './store';

export async function recordVisitor(input: {
  userId: string;
  agentId: string;
  threadIds?: string[];
}): Promise<void> {
  if (!input.userId) return;
  await leadsStore.recordVisitor(input);
}
