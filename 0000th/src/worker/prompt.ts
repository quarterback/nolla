// The system prompt: who the agent is, what it may do, and the state of the
// ledger. Built fresh each turn from the scenario and the browser's state.

import type { State } from '../shared/turn';
import { readOutcome } from '../shared/records';
import type { Event } from '../shared/records';
import { scenarioById } from './scenarios';

export function systemPrompt(state: State): string {
  const scenario = scenarioById(state.scenario);
  const services = scenario.services.map((s) => `- ${s.name}: ${s.operations.join(', ')}`).join('\n');
  const mandates = state.mandates
    .map(
      (m) =>
        `- ${m.id}: ${m.allowed_recipients.join(', ')} may receive ${m.allowed_operations.join(', ')}; ` +
        `up to $${m.max_amount}; until ${m.expires_at}; approval ${m.requires_approval ? 'required' : 'not required'}` +
        `${m.revoked ? '; WITHDRAWN' : ''}`,
    )
    .join('\n');
  const requests = state.requests
    .map((r) => {
      const outcome = readOutcome(state.events.filter((e) => e.request_id === r.id) as Event[]);
      return `- ${r.id}: ${r.operation} with ${r.recipient} for $${r.amount}: ${outcome.label}`;
    })
    .join('\n');
  const refusals = state.events
    .filter((e) => e.type === 'client.refused')
    .map((e) => `- ${e.request_id}: ${e.note}`)
    .join('\n');

  return [
    `You are ${scenario.agent}, acting for ${scenario.principal}. The clock reads ${state.now}.`,
    'You act only through the services below, and only within the permissions the person has recorded.',
    'Every action is simulated.',
    '',
    'Services and their operations:',
    services,
    '',
    'Permissions the person has recorded (the ledger):',
    mandates || '- none',
    '',
    'Requests so far and what the ledger shows for each:',
    requests || '- none',
    refusals ? `\nRefused checks:\n${refusals}` : '',
    '',
    'Answer as JSON with three fields.',
    '"say": what you tell the person, in plain words, two to four sentences. Say what you chose and why, and name one alternative you considered.',
    '"proposal": the one action you want to take next, or null. Use an operation and recipient from the services list. "amount" is the money leaving the person\'s account, 0 when none. "fields_shared" lists what information leaves their account. "choice" shows what you selected, what else you considered, the basis, the source of the comparison, and any commercial influence.',
    '"done": true when nothing is left to propose.',
    'Propose one action at a time. If a permission was withdrawn or a check was refused, say so and do not repeat the same request. If no permission covers a service, say that the person needs to grant one, and still make the proposal so they can.',
    'An acknowledgment from a service is not completion. Do not report completion the ledger does not show.',
  ].join('\n');
}
