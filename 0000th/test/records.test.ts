import { describe, expect, test } from 'vitest';
import { addEvent, exportRecord, readOutcome } from '../src/shared/records';
import { makeDecision } from '../src/shared/authority';

const at = '2026-11-02T09:00:00Z';
const request = {
  id: 'r-1',
  version: 1,
  operation: '311.create',
  recipient: 'Example City 311',
  description: 'Report a streetlight out at 700 Cedar Street.',
  amount: 0,
  fields_shared: ['700 Cedar Street'],
};

describe('records', () => {
  test('approval alone does not mean the service was called', () => {
    expect(readOutcome(addEvent([], 'person.approved', 'person', at)).key).toBe('approved');
  });
  test('a provider acknowledgment does not mean completion', () => {
    let events = addEvent([], 'client.attempted', 'client', at);
    events = addEvent(events, 'provider.acknowledged', 'simulated provider', at);
    expect(readOutcome(events).key).toBe('acknowledged');
    expect(readOutcome(events).label).toMatch(/unconfirmed/);
  });
  test('a refused check is recorded without an attempt', () => {
    const events = addEvent([], 'client.refused', 'client', at, { note: 'REVOKED' });
    expect(readOutcome(events).key).toBe('refused');
  });
  test('dispute is preserved after provider reports completion', () => {
    let events = addEvent([], 'provider.completed', 'simulated provider', at);
    events = addEvent(events, 'person.disputed', 'person', at);
    expect(readOutcome(events).key).toBe('disputed');
    expect(events[0].type).toBe('provider.completed');
  });
  test('export states evidence is synthetic and keeps the source chain', () => {
    const decision = makeDecision(request, 'approved', at);
    const events = addEvent([], 'person.approved', 'person', at, { request_id: request.id });
    const record = exportRecord({ id: 'move-my-tuesday', agent: 'Your agent' }, [], [request], [decision], events);
    expect(record.evidence_level).toBe('synthetic and unauthenticated');
    expect(record.events).toHaveLength(1);
    expect(record.outcomes[request.id].key).toBe('approved');
    expect(record.events[0].simulated).toBe(true);
  });
  test('unrecognized event types are rejected', () => {
    expect(() => addEvent([], 'fake.succeeded' as never, 'agent', at)).toThrow();
  });
});
