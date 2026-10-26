import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppBindings, Env } from './env';
import { modelConfigured, scripted } from './env';
import { requireAccess } from './access';
import { completeJson } from './model';
import { answerPrompt, managerPrompt, sortPrompt } from './prompts';
import { scriptedAnswer, scriptedManager, scriptedSort } from './script';
import { fail } from './util';
import { options, price } from '../shared/desk';
import { Answer, ANSWER_JSON_SCHEMA, AnswerBody, ManagerBody, ManagerChecks, MANAGER_JSON_SCHEMA, SORT_JSON_SCHEMA, SortBody, SortResult } from '../shared/desk-schemas';

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
    return c.json({ model: res.ok ? 'ready' : 'starting' });
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
  const { text, sort, parts, earlierTurns } = body.data;
  if (sort.sort === 'desk' && parts.slips) fail(400, 'A call answered at the desk has no slip.');
  const option = { ...describe(parts), ...parts };
  const answer = await completeJson(
    c.env,
    [{ role: 'system', content: answerPrompt(option, sort.sort, sort.category, sort.place) }, { role: 'user', content: text }],
    ANSWER_JSON_SCHEMA,
    Answer,
    () => scriptedAnswer(text, parts),
  );
  const words = countWords(answer);
  const slips = answer.desks.length ? 1 : 0;
  const sources = Math.min(answer.sources.length, parts.sources);
  const charged = price({ slips, sources, words, check: parts.check }, earlierTurns);
  return c.json({ answer, words, charged });
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

function countWords(a: Answer): number {
  const text = [a.short, ...a.known.map((k) => k.text), ...a.changes_if, a.ask_someone, a.question_back?.text ?? '', ...(a.question_back?.choices.map((ch) => ch.next) ?? [])].join(' ');
  return text.split(/\s+/).filter(Boolean).length;
}

app.route('/api', api);
app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404));
// Everything else is the built interface.
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default { fetch: app.fetch } satisfies ExportedHandler<Env>;
export { app };
