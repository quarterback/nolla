import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { streamSSE } from 'hono/streaming';
import type { AppBindings, Env } from './env';
import { modelConfigured, scripted } from './env';
import { requireAccess } from './access';
import { completeJson, streamChat, streamJson } from './model';
import { answerPrompt, managerPrompt, sortPrompt } from './prompts';
import { scriptedAnswer, scriptedManager, scriptedSort } from './script';
import { fail } from './util';
import { options, price } from '../shared/desk';
import { Answer, ANSWER_JSON_SCHEMA, AnswerBody, ChatBody, ManagerBody, ManagerChecks, MANAGER_JSON_SCHEMA, SORT_JSON_SCHEMA, SortBody, SortResult } from '../shared/desk-schemas';

const HOME = '0000th.ai';

const app = new Hono<AppBindings>();

// nollanolla.com and any other host the Worker answers on send people to the
// apex domain. Local and preview hosts are left alone.
app.use('*', async (c, next) => {
  const url = new URL(c.req.url);
  if (/nollanolla\.com$|^www\.0000th\.ai$/.test(url.hostname)) {
    return c.redirect(`https://${HOME}${url.pathname}${url.search}`, 301);
  }
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
  if (!modelConfigured(c.env)) return c.json({ model: scripted(c.env) ? 'scripted' : 'off' });
  try {
    const res = await fetch(`${c.env.MODAL_BASE_URL}/v1/models`, {
      headers: { authorization: `Bearer ${c.env.MODAL_TOKEN}` },
      signal: AbortSignal.timeout(8000),
    });
    const body = res.ok ? ((await res.json().catch(() => ({}))) as { data?: { id: string }[] }) : null;
    const state = res.ok ? 'ready' : res.status === 401 || res.status === 403 ? 'rejected' : 'starting';
    return c.json({ model: state, status: res.status, name: body?.data?.[0]?.id ?? '' });
  } catch {
    return c.json({ model: 'starting' });
  }
});

/** Step 1: sort the call. Always charged 40 tkn. Returns the options with
 * their prices so the person chooses before anything else runs. */
api.post('/sort', async (c) => {
  const body = SortBody.safeParse(await c.req.json().catch(() => null));
  if (!body.success) fail(400, 'Bad request.');
  const { text, earlierTurns } = body.data;
  const sort = await completeJson(
    c.env,
    [{ role: 'system', content: sortPrompt() }, { role: 'user', content: text }],
    SORT_JSON_SCHEMA,
    SortResult,
    () => scriptedSort(text),
  );
  const quotes = options(sort.sort).map((o) => ({ ...o, price: price(o, earlierTurns) }));
  return c.json({ sort, quotes });
});

/** Step 2 to 4: run the option the person chose. The bill is the posted
 * price with the real word count in place of the estimate. */
api.post('/answer', async (c) => {
  const body = AnswerBody.safeParse(await c.req.json().catch(() => null));
  if (!body.success) fail(400, 'Bad request.');
  const { text, sort, earlierTurns } = body.data;
  // A call answered at the desk has no slip; the menu's price always includes one.
  const parts = sort.sort === 'desk' ? { ...body.data.parts, slips: 0 } : body.data.parts;
  const option = { ...describe(parts), ...parts };
  const messages = [{ role: 'system' as const, content: answerPrompt(option, sort.sort, sort.category, sort.place) }, { role: 'user' as const, content: text }];
  const finish = (answer: Answer) => {
    const words = countWords(answer);
    const slips = answer.desks.length ? 1 : 0;
    const sources = Math.min(answer.sources.length, parts.sources);
    return { answer, words, charged: price({ slips, sources, words, check: parts.check }, earlierTurns) };
  };
  // The page asks for a stream so it can show the answer being written and
  // the meter running. Anything else gets the finished JSON.
  if (c.req.header('accept')?.includes('text/event-stream')) {
    return streamSSE(c, async (s) => {
      try {
        for await (const ev of streamJson(c.env, messages, ANSWER_JSON_SCHEMA, Answer, () => scriptedAnswer(text, parts))) {
          if (ev.type === 'delta') await s.writeSSE({ event: 'delta', data: JSON.stringify(ev.text) });
          else await s.writeSSE({ event: 'done', data: JSON.stringify(finish(ev.value)) });
        }
      } catch (err) {
        await s.writeSSE({ event: 'error', data: JSON.stringify(err instanceof HTTPException ? err.message : 'The desk did not answer.') });
      }
    });
  }
  const answer = await completeJson(c.env, messages, ANSWER_JSON_SCHEMA, Answer, () => scriptedAnswer(text, parts));
  return c.json(finish(answer));
});

/** The manager desk: a separate call with a separate prompt. It checks; the
 * decision itself is arithmetic in the browser from the posted price. */
api.post('/manager', async (c) => {
  const body = ManagerBody.safeParse(await c.req.json().catch(() => null));
  if (!body.success) fail(400, 'Bad request.');
  const { text, answer, parts, claim } = body.data;
  const option = describe(parts).label;
  const checks = await completeJson(
    c.env,
    [
      { role: 'system', content: managerPrompt() },
      { role: 'user', content: `The call: ${text}\n\nThe option paid for: ${option}\n\nThe person's claim: ${claim}\n\nThe reply, as JSON:\n${JSON.stringify(answer)}` },
    ],
    MANAGER_JSON_SCHEMA,
    ManagerChecks,
    () => scriptedManager(claim),
  );
  return c.json({ checks });
});

/** The option whose parts these are, or a description of the custom form. */
function describe(parts: { slips: number; sources: number; words: number; check: boolean }): { label: string; does: string } {
  const match = options('route').find((o) => o.slips === parts.slips && o.sources === parts.sources && o.words === parts.words && o.check === parts.check) ?? options('desk').find((o) => o.sources === parts.sources && o.words === parts.words && o.check === parts.check);
  if (match) return { label: match.label, does: match.does };
  const does = [parts.slips ? 'a slip' : '', parts.sources ? `${parts.sources} sources` : '', parts.words ? `about ${parts.words} words` : '', parts.check ? 'a check' : ''].filter(Boolean).join(', ');
  return { label: 'Custom', does: `sort, ${does}` };
}

/** Plain chat: the model's own text, streamed, with nothing charged. */
api.post('/chat', async (c) => {
  const body = ChatBody.safeParse(await c.req.json().catch(() => null));
  if (!body.success) fail(400, 'Bad request.');
  return streamSSE(c, async (s) => {
    try {
      for await (const ev of streamChat(c.env, body.data.messages)) {
        if (ev.type === 'meta') await s.writeSSE({ event: 'meta', data: JSON.stringify({ model: ev.model }) });
        else if (ev.type === 'delta') await s.writeSSE({ event: 'delta', data: JSON.stringify({ c: ev.content, r: ev.reasoning }) });
        else await s.writeSSE({ event: 'usage', data: JSON.stringify({ prompt: ev.prompt, completion: ev.completion }) });
      }
      await s.writeSSE({ event: 'done', data: '{}' });
    } catch (err) {
      await s.writeSSE({ event: 'error', data: JSON.stringify(err instanceof HTTPException ? err.message : 'The model did not answer.') });
    }
  });
});

function countWords(a: Answer): number {
  const text = [a.short, ...a.known.map((k) => k.text), ...a.changes_if, a.ask_someone, a.question_back?.text ?? '', ...(a.question_back?.choices.map((ch) => ch.next) ?? [])].join(' ');
  return text.split(/\s+/).filter(Boolean).length;
}

app.route('/api', api);
app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404));
// Everything else is the built interface.
app.all('*', (c) => {
  const url = new URL(c.req.url);
  // A path with no file extension is a page of the interface, such as /chat.
  if (c.req.method === 'GET' && !/\.[a-z0-9]+$/i.test(url.pathname)) return c.env.ASSETS.fetch(new Request(new URL('/', url), c.req.raw));
  return c.env.ASSETS.fetch(c.req.raw);
});

export default { fetch: app.fetch } satisfies ExportedHandler<Env>;
export { app };
