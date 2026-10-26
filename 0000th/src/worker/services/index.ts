// The receiving services. All of them are fakes: a request that passes the
// permission check gets an attempt, an acknowledgment and, for some, a
// completion, each as its own attributed event. Deterministic, so the same
// scenario gives the same ledger every time.

import type { Request } from '../../shared/authority';
import { addEvent, type Event } from '../../shared/records';
import { scenarioById } from '../scenarios';
import { tick } from '../util';

export function simulate(scenarioId: string, request: Request, events: Event[], now: string): { events: Event[]; now: string } {
  const scenario = scenarioById(scenarioId);
  const service = scenario.services.find((s) => s.name === request.recipient);
  const prefix = service?.reference ?? 'REF-';
  const reference = `${prefix}${String(1000 + events.length)}`;
  const source = `${request.recipient} (simulated)`;
  let t = tick(now);
  let out = addEvent(events, 'client.attempted', 'client', t, { request_id: request.id, note: request.operation });
  t = tick(t);
  out = addEvent(out, 'provider.acknowledged', source, t, { request_id: request.id, note: `Reference ${reference}` });
  // Cancellations and city reports complete at once. A booking stays
  // acknowledged until the provider reports, which this fake never does on
  // its own, so the person sees the difference.
  if (request.operation !== 'rail.book') {
    t = tick(t);
    out = addEvent(out, 'provider.completed', source, t, { request_id: request.id, note: `Reference ${reference}` });
  }
  return { events: out, now: t };
}
