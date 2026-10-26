import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { streamSSE } from 'hono/streaming';
import type { AppBindings, Env } from './env';
import { modelConfigured, isDev } from './env';
import { requireAccess } from './access';
import { streamTurn } from './model';
import { freshState, listScenarios, scenarioById } from './scenarios';
import { simulate } from './services';
import { fail, tick } from './util';
import { ActBody, TurnBody, type State, type Turn } from '../shared/turn';
import { checkPermission, makeDecision, mandateFor, type Mandate, type Request } from '../shared/authority';
import { addEvent, type Event } from '../shared/records';

const app = new Hono<AppBindings>();

app.use('*', async (c, next) => {
  await next();
  c.header('x-content-type-options', 'nosniff');
  c.header('x-frame-options', 'DENY');
  if (c.req.path.startsWith('/api/')) c.header('cache-control', 'no-store');
});
app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  console.error('unhandled', err instanceof Error ? err.message : err);
  return c.json({ error: 'Something went wrong. Try again.' }, 500);
});

const api = new Hono<AppBindings>();
api.use('*', requireAccess);

api.get('/me', (c) => c.json({ email: c.get('email') }));

api.get('/health', async (c) => {
  if (!modelConfigured(c.env)) return c.json({ model: isDev(c.env) ? 'scripted' : 'off' });
  try {
    const res = await fetch(`${c.env.MODAL_BASE_URL}/v1/models`, {
      headers: { authorization: `Bearer ${c.env.MODAL_TOKEN}` },
      signal: AbortSignal.timeout(8000),
    });
    return c.json({ model: res.ok ? 'ready' : 'starting' });
  } catch {
    return c.json({ model: 'starting' });
  }
});

api.get('/scenarios', (c) => c.json(listScenarios()));
api.get('/scenarios/:id', (c) => {
  const s = scenarioById(c.req.param('id'));
  return c.json({ id: s.id, name: s.name, agent: s.agent, opening: s.opening, services: s.services, state: freshState(s.id) });
});

api.post('/turn', async (c) => {
  const body = TurnBody.safeParse(await c.req.json().catch(() => null));
  if (!body.success) fail(400, 'Bad request.');
  const { text } = body.data;
  let state: State = body.data.state;
  if (text.trim()) state = { ...state, messages: [...state.messages, { role: 'person', text: text.trim() }] };

  return streamSSE(c, async (stream) => {
    try {
      for await (const ev of streamTurn(c.env, state, text)) {
        if (ev.type === 'delta') {
          await stream.writeSSE({ event: 'delta', data: JSON.stringify(ev.text) });
          continue;
        }
        const next = applyTurn(state, ev.turn);
        await stream.writeSSE({ event: 'turn', data: JSON.stringify({ state: next }) });
      }
    } catch (err) {
      const message = err instanceof HTTPException ? err.message : 'The model did not answer.';
      await stream.writeSSE({ event: 'error', data: JSON.stringify(message) });
    }
  });
});

/** Records the agent's words and, when it proposed an action, the request. */
function applyTurn(state: State, turn: Turn): State {
  let now = tick(state.now);
  const requests = [...state.requests];
  let events = state.events as Event[];
  let request_id: string | undefined;
  if (turn.proposal) {
    request_id = `r-${requests.length + 1}`;
    requests.push({ id: request_id, version: 1, ...turn.proposal });
    events = addEvent(events, 'agent.proposed', 'agent', now, { request_id, note: `${turn.proposal.operation} with ${turn.proposal.recipient}` });
    now = tick(now);
  }
  return {
    ...state,
    now,
    messages: [...state.messages, { role: 'agent', text: turn.say, request_id }],
    requests,
    events,
    turns: state.turns + 1,
  };
}

api.post('/act', async (c) => {
  const body = ActBody.safeParse(await c.req.json().catch(() => null));
  if (!body.success) fail(400, 'Bad request.');
  const { action, request_id, limits, mandate_id } = body.data;
  let state: State = body.data.state;
  let events = state.events as Event[];
  let now = tick(state.now);
  const found = state.requests.find((r) => r.id === request_id);

  if (action === 'withdraw') {
    const m = state.mandates.find((x) => x.id === mandate_id);
    if (!m) fail(404, 'No such permission.');
    const mandates = state.mandates.map((x) => (x.id === m.id ? { ...x, revoked: true } : x));
    events = addEvent(events, 'person.withdrew', 'person', now, { note: m.id });
    return c.json({ state: ledgerNote({ ...state, now, mandates, events }, `Withdrew permission for ${m.allowed_recipients.join(', ')}.`) });
  }

  if (!found) fail(404, 'No such request.');
  const request: Request = found;

  if (action === 'dispute') {
    events = addEvent(events, 'person.disputed', 'person', now, { request_id });
    return c.json({ state: ledgerNote({ ...state, now, events }, `Disputed the reported result of ${request.operation} with ${request.recipient}.`) });
  }

  if (action === 'decline') {
    const decision = makeDecision(request, 'declined', now);
    events = addEvent(events, 'person.declined', 'person', now, { request_id });
    return c.json({ state: ledgerNote({ ...state, now, events, decisions: [...state.decisions, decision] }, `Declined ${request.operation} with ${request.recipient}.`) });
  }

  // Approve. "Allow with limits" narrows or creates the mandate first, so the
  // approval binds this exact request and the limits outlive it.
  let mandates = [...state.mandates];
  let mandate = mandateFor(request, mandates);
  if (limits) {
    const granted: Mandate = {
      id: mandate ? `${mandate.id}-${state.events.length + 1}` : `m-${request.recipient.toLowerCase().replace(/\W+/g, '-')}-${state.events.length + 1}`,
      principal: scenarioById(state.scenario).principal,
      allowed_operations: mandate ? mandate.allowed_operations : [request.operation],
      allowed_recipients: [request.recipient],
      max_amount: limits.max_amount,
      expires_at: new Date(Date.parse(now) + limits.hours * 3_600_000).toISOString(),
      requires_approval: true,
      revoked: false,
    };
    if (mandate) mandates = mandates.map((m) => (m.id === mandate!.id ? { ...m, revoked: true } : m));
    mandates.push(granted);
    mandate = granted;
    events = addEvent(events, 'person.granted', 'person', now, { request_id, note: `${granted.id}: up to $${granted.max_amount} for ${limits.hours}h` });
    now = tick(now);
  }
  const decision = makeDecision(request, 'approved', now);
  events = addEvent(events, 'person.approved', 'person', now, { request_id });
  const check = checkPermission(request, mandate, decision, now);
  let next: State = { ...state, now, mandates, events, decisions: [...state.decisions, decision] };
  if (!check.allowed) {
    next.events = addEvent(next.events as Event[], 'client.refused', 'client', tick(now), { request_id, note: check.code });
    next.now = tick(now);
    return c.json({ state: ledgerNote(next, `Check refused ${request.operation} with ${request.recipient}: ${check.code}.`), check });
  }
  const sim = simulate(state.scenario, request, next.events as Event[], now);
  next = { ...next, events: sim.events, now: sim.now };
  return c.json({ state: ledgerNote(next, `Approved ${request.operation} with ${request.recipient} for $${request.amount}.`), check });
});

/** A system line in the thread so the model sees what the person did. */
function ledgerNote(state: State, text: string): State {
  return { ...state, messages: [...state.messages, { role: 'system', text }] };
}

app.route('/api', api);
app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404));

export default { fetch: app.fetch } satisfies ExportedHandler<Env>;
export { app };
