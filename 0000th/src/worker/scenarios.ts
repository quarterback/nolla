import moveMyTuesday from '../../scenarios/move-my-tuesday.json';
import type { Mandate } from '../shared/authority';
import type { State, Turn } from '../shared/turn';
import { fail } from './util';

export interface Scenario {
  id: string;
  name: string;
  agent: string;
  principal: string;
  now: string;
  opening: string;
  services: { name: string; operations: string[]; reference: string }[];
  mandates: Mandate[];
  /** Scripted answers used when no model is set up in dev. */
  script: Turn[];
}

const scenarios: Scenario[] = [moveMyTuesday as Scenario];

export function scenarioById(id: string): Scenario {
  const s = scenarios.find((x) => x.id === id);
  if (!s) fail(404, 'No such scenario.');
  return s;
}

export function listScenarios() {
  return scenarios.map(({ id, name, opening }) => ({ id, name, opening }));
}

/** A fresh state for a scenario: fixed clock, seeded mandates, no messages. */
export function freshState(id: string): State {
  const s = scenarioById(id);
  return {
    scenario: s.id,
    now: s.now,
    messages: [],
    mandates: structuredClone(s.mandates),
    requests: [],
    decisions: [],
    events: [],
    turns: 0,
  };
}
