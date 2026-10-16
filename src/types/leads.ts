export interface Visitor {
  userId: string;
  agentId: string;
  firstSeen: string;
  lastSeen: string;
  threadIds: string[];
}

export type TelemetrySource = 'ui' | 'agent' | 'annotate';

export interface TelemetryEvent {
  id: string;
  visitorId: string;
  threadId: string | null;
  runId: string | null;
  type: string;
  name: string | null;
  payload: unknown;
  source: TelemetrySource;
  ts: string;
}

export interface ChatMessage {
  id: string;
  role: string;
  content: unknown;
  createdAt: string | null;
}

export interface Conversation {
  threadId: string;
  userId: string;
  agentId: string;
  name: string | null;
  messages: ChatMessage[];
  lastRunAt: string | null;
  syncedAt: string;
}

export type LeadType = 'lead' | 'conversation' | 'support';
export type InterestLevel = 'high' | 'medium' | 'low';
export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface LeadClassification {
  type: LeadType;
  interestLevel: InterestLevel;
  intentions: string[];
  topics: string[];
  sentiment: Sentiment;
}

export interface LeadContact {
  name?: string;
  email?: string;
  phone?: string;
}

export type LeadStatus = 'new' | 'hot' | 'contacted';

export interface Lead {
  visitorId: string;
  contact: LeadContact;
  summary: string;
  classification: LeadClassification;
  leadScore: number;
  status: LeadStatus;
  source: string;
  notes?: string;
  notifiedAt?: string;
  updatedAt: string;
}
