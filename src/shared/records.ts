// An event journal that keeps the source of each claim, ported from
// vloora/demos/agent-interaction-patterns/lib/records.mjs. Every event this
// app records is simulated: no real service is called.

import type { Decision, Mandate, Request } from './authority';

export const EVENT_TYPES = [
  'agent.proposed',
  'person.granted',
  'person.approved',
  'person.declined',
  'person.withdrew',
  'client.attempted',
  'client.refused',
  'provider.acknowledged',
  'provider.completed',
  'person.disputed',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface Event {
  sequence: number;
  type: EventType;
  source: string;
  at: string;
  simulated: true;
  /** The request this event is about, when there is one. */
  request_id?: string;
  /** A short note: a refusal code, a reference number, a limit. */
  note?: string;
}

export function addEvent(
  events: Event[],
  type: EventType,
  source: string,
  at = new Date().toISOString(),
  extra: Pick<Event, 'request_id' | 'note'> = {},
): Event[] {
  if (!EVENT_TYPES.includes(type)) throw new Error('Unknown event type');
  if (!source) throw new Error('Event source required');
  return [...events, Object.freeze({ sequence: events.length + 1, type, source, at, simulated: true as const, ...extra })];
}

export type OutcomeKey = 'disputed' | 'completed' | 'acknowledged' | 'attempted' | 'refused' | 'declined' | 'approved' | 'proposed';

export function readOutcome(events: Event[]): { key: OutcomeKey; label: string } {
  const kinds = new Set(events.map((e) => e.type));
  const latestDecision = [...events].reverse().find((e) => e.type === 'person.approved' || e.type === 'person.declined');
  if (kinds.has('person.disputed')) return { key: 'disputed', label: 'The person disputes the outcome.' };
  if (kinds.has('provider.completed')) return { key: 'completed', label: 'The simulated provider reports completion.' };
  if (kinds.has('provider.acknowledged')) {
    return { key: 'acknowledged', label: 'The simulated provider accepted the request. Completion is unconfirmed.' };
  }
  if (kinds.has('client.attempted')) {
    return { key: 'attempted', label: 'The client attempted the request. No provider response is recorded.' };
  }
  if (kinds.has('client.refused')) return { key: 'refused', label: 'The check refused the request before any attempt.' };
  if (latestDecision?.type === 'person.declined') return { key: 'declined', label: 'The person declined the request.' };
  if (latestDecision?.type === 'person.approved') {
    return { key: 'approved', label: 'The person approved the request. Execution has not been attempted.' };
  }
  return { key: 'proposed', label: 'The agent proposed an action. Permission is still needed.' };
}

export interface ExportedRecord {
  format: 'vloora.agent-interaction-demo/0.1';
  evidence_level: 'synthetic and unauthenticated';
  scenario: string;
  agent: string;
  mandates: Mandate[];
  requests: Request[];
  decisions: Decision[];
  outcomes: Record<string, { key: OutcomeKey; label: string }>;
  events: Event[];
}

export function exportRecord(
  scenario: { id: string; agent: string },
  mandates: Mandate[],
  requests: Request[],
  decisions: Decision[],
  events: Event[],
): ExportedRecord {
  const outcomes: ExportedRecord['outcomes'] = {};
  for (const r of requests) outcomes[r.id] = readOutcome(events.filter((e) => e.request_id === r.id));
  return {
    format: 'vloora.agent-interaction-demo/0.1',
    evidence_level: 'synthetic and unauthenticated',
    scenario: scenario.id,
    agent: scenario.agent,
    mandates: structuredClone(mandates),
    requests: structuredClone(requests),
    decisions: structuredClone(decisions),
    outcomes,
    events: structuredClone(events),
  };
}
