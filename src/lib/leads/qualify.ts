import 'server-only';
import type {
  Conversation,
  InterestLevel,
  Lead,
  LeadClassification,
  LeadContact,
  Sentiment,
  TelemetryEvent,
} from '@/types/leads';

const INTENT_KEYWORDS: Record<string, string[]> = {
  test_drive: ['test drive', 'prueba de manejo', 'prueba manejo', 'agendar', 'agenda', 'probar'],
  pricing: ['precio', 'cuánto', 'cuanto cuesta', 'cotización', 'cotizacion', 'costo', 'vale'],
  financing: ['financiación', 'financiacion', 'financiamiento', 'crédito', 'credito', 'cuota', 'plazo', 'entrada'],
  purchase: ['comprar', 'comprá', 'compra', 'reservar', 'reserva', 'seña', 'adquirir'],
  contact: ['contacto', 'llamar', 'llámame', 'llamame', 'teléfono', 'telefono', 'whatsapp', 'email', 'correo'],
  trade_in: ['permuta', 'usado', 'parte de pago', 'entrego mi', 'mi auto'],
  availability: ['stock', 'disponible', 'disponibilidad', 'entrega'],
  service: ['service', 'mantenimiento', 'garantía', 'garantia', 'reparación', 'reparacion'],
};

const TOPIC_KEYWORDS: Record<string, string[]> = {
  suv: ['suv', 'camioneta'],
  sedan: ['sedán', 'sedan', ' berlina'],
  pickup: ['pickup', 'pick-up', 'camioneta de carga'],
  electric: ['eléctrico', 'electrico', 'eléctrica', 'ev', 'híbrido', 'hibrido'],
  luxury: ['lujo', 'premium', 'deportivo'],
};

const POSITIVE = ['gracias', 'perfecto', 'excelente', 'me interesa', 'genial', 'buenísimo', 'quiero'];
const NEGATIVE = ['no me interesa', 'caro', 'molesto', 'problema', 'queja', 'malo'];

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/;

function stringifyContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) return String((part as { text: unknown }).text ?? '');
        if (part && typeof part === 'object' && 'content' in part) return String((part as { content: unknown }).content ?? '');
        return '';
      })
      .join(' ');
  }
  if (content && typeof content === 'object') return JSON.stringify(content);
  return '';
}

function collectText(conversations: Conversation[]): string {
  const texts: string[] = [];
  for (const conversation of conversations) {
    for (const message of conversation.messages) {
      if (message.role === 'user' || message.role === 'assistant') {
        texts.push(stringifyContent(message.content));
      }
    }
  }
  return texts.join('\n').toLowerCase();
}

function extractContact(conversations: Conversation[], events: TelemetryEvent[]): LeadContact {
  const contact: LeadContact = {};
  const corpus = collectText(conversations);

  const email = corpus.match(EMAIL_RE)?.[0];
  if (email) contact.email = email;
  const phone = corpus.match(PHONE_RE)?.[0];
  if (phone) contact.phone = phone.replace(/\s+/g, ' ').trim();

  for (const event of events) {
    if (event.type !== 'FILL_TEST_DRIVE' && event.name !== 'FILL_TEST_DRIVE') continue;
    const payload = event.payload as { field?: string; value?: string } | null;
    if (!payload?.field || !payload.value) continue;
    const field = payload.field.toLowerCase();
    const value = String(payload.value);
    if (field.includes('name') || field.includes('nombre')) contact.name ??= value;
    if (field.includes('email') || field.includes('correo')) contact.email ??= value;
    if (field.includes('phone') || field.includes('tel')) contact.phone ??= value;
  }

  return contact;
}

function detectIntentions(text: string): string[] {
  const found: string[] = [];
  for (const [intent, words] of Object.entries(INTENT_KEYWORDS)) {
    if (words.some((word) => text.includes(word))) found.push(intent);
  }
  return found;
}

function detectTopics(text: string): string[] {
  const found: string[] = [];
  for (const [topic, words] of Object.entries(TOPIC_KEYWORDS)) {
    if (words.some((word) => text.includes(word))) found.push(topic);
  }
  return found;
}

function detectSentiment(text: string): Sentiment {
  const positive = POSITIVE.filter((word) => text.includes(word)).length;
  const negative = NEGATIVE.filter((word) => text.includes(word)).length;
  if (positive > negative) return 'positive';
  if (negative > positive) return 'negative';
  return 'neutral';
}

function scoreLead(input: {
  contact: LeadContact;
  intentions: string[];
  userMessages: number;
  openedTestDrive: boolean;
}): number {
  let score = 0;
  if (input.contact.email) score += 30;
  if (input.contact.phone) score += 30;
  if (input.contact.name) score += 10;
  if (input.openedTestDrive) score += 25;
  if (input.intentions.includes('purchase')) score += 25;
  if (input.intentions.includes('financing')) score += 15;
  if (input.intentions.includes('test_drive')) score += 20;
  if (input.intentions.includes('pricing')) score += 10;
  if (input.intentions.includes('contact')) score += 10;
  score += Math.min(input.userMessages, 10) * 2;
  return Math.min(score, 100);
}

function interestFromScore(score: number): InterestLevel {
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

export function qualifyLead(input: {
  visitorId: string;
  conversations: Conversation[];
  events: TelemetryEvent[];
  memories?: string[];
}): Lead {
  const text = collectText(input.conversations);
  const contact = extractContact(input.conversations, input.events);
  const intentions = detectIntentions(text);
  const topics = detectTopics(text);
  const sentiment = detectSentiment(text);
  const openedTestDrive = input.events.some(
    (event) => event.type === 'OPEN_TEST_DRIVE' || event.name === 'OPEN_TEST_DRIVE',
  );
  const userMessages = input.conversations.reduce(
    (total, conversation) => total + conversation.messages.filter((m) => m.role === 'user').length,
    0,
  );

  const leadScore = scoreLead({ contact, intentions, userMessages, openedTestDrive });
  const hasContact = Boolean(contact.email || contact.phone);
  const isSupport = intentions.includes('service') && !hasContact && leadScore < 40;

  const classification: LeadClassification = {
    type: isSupport ? 'support' : hasContact || leadScore >= 30 ? 'lead' : 'conversation',
    interestLevel: interestFromScore(leadScore),
    intentions,
    topics,
    sentiment,
  };

  const memoryHint = input.memories?.length ? ` Memorias: ${input.memories.slice(0, 3).join('; ')}` : '';
  const summary = [
    `${userMessages} mensaje(s) del usuario.`,
    intentions.length ? `Intenciones: ${intentions.join(', ')}.` : 'Sin intenciones claras.',
    topics.length ? `Temas: ${topics.join(', ')}.` : '',
    openedTestDrive ? 'Abrió el formulario de test drive.' : '',
    hasContact ? 'Dejó datos de contacto.' : 'Sin datos de contacto.',
  ]
    .filter(Boolean)
    .join(' ') + memoryHint;

  const status = leadScore >= 60 ? 'hot' : 'new';

  return {
    visitorId: input.visitorId,
    contact,
    summary,
    classification,
    leadScore,
    status,
    source: 'intelligence-etl',
    updatedAt: new Date().toISOString(),
  };
}
