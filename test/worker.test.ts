import { describe, expect, test } from 'vitest';
import { app } from '../src/worker/index';

const ASSETS = { fetch: async () => new Response('page', { status: 200 }) } as unknown as Fetcher;
const env = { DEV_MODE: '1', ACCESS_TEAM_DOMAIN: '', ACCESS_AUD: '', MODEL_NAME: 'x', ASSETS };

describe('worker', () => {
  test('the old domain redirects to the apex domain, path and query kept', async () => {
    for (const host of ['nollanolla.com', 'www.nollanolla.com', 'www.0000th.ai']) {
      const res = await app.request(`https://${host}/a/b?y=1`, {}, env);
      expect(res.status).toBe(301);
      expect(res.headers.get('location')).toBe('https://0000th.ai/a/b?y=1');
    }
  });
  test('a page on the apex domain comes from the assets', async () => {
    const res = await app.request('https://0000th.ai/', {}, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('page');
  });
  test('the apex domain is served', async () => {
    const res = await app.request('https://0000th.ai/api/health', {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ model: 'scripted' });
  });
  test('sorting a call returns options priced from the schedule', async () => {
    const res = await app.request('https://0000th.ai/api/sort', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'My toilet keeps running. How do I fix it?', earlierTurns: 0 }) }, env);
    const body = (await res.json()) as { sort: { sort: string }; quotes: { key: string; price: { total: number } }[] };
    expect(body.sort.sort).toBe('desk');
    expect(body.quotes.map((q) => q.key)).toEqual(['quick', 'sources', 'lookinto']);
    expect(body.quotes[0].price.total).toBe(140);
  });
  test('an answer is billed at its real word count', async () => {
    const res = await app.request('https://0000th.ai/api/answer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'My toilet keeps running. How do I fix it?', sort: { sort: 'desk', category: 'Home repair', place: '', code: 'HOM 2.3', path: ['Home repair', 'Plumbing'] }, parts: { slips: 0, sources: 0, words: 100, check: false }, earlierTurns: 0 }) }, env);
    const body = (await res.json()) as { words: number; charged: { total: number } };
    expect(body.charged.total).toBe(40 + body.words);
  });
  test('a bad body is refused', async () => {
    const res = await app.request('https://0000th.ai/api/sort', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }, env);
    expect(res.status).toBe(400);
  });
});

describe('the model', () => {
  const modelEnv = { ...env, MODEL_NAME: '', DEV_MODE: '0', SCRIPTED: '0', MODAL_BASE_URL: 'https://model.test', MODAL_TOKEN: 'wk-a.ws-b' };
  const sortBody = JSON.stringify({ text: 'My toilet keeps running. How do I fix it?', earlierTurns: 0 });
  const post = () => app.request('https://0000th.ai/api/sort', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-access-jwt-assertion': 'x' }, body: sortBody }, { ...modelEnv, DEV_MODE: '1' });
  const reply = (content: string) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  const sorted = JSON.stringify({ sort: 'desk', category: 'Home repair', place: '', code: 'HOM 2.3', path: ['Home repair', 'Plumbing'] });
  const realFetch = globalThis.fetch;
  const stub = (fn: (url: string, init?: RequestInit) => Response) => {
    globalThis.fetch = (async (url: string, init?: RequestInit) => fn(String(url), init)) as typeof fetch;
  };
  const restore = () => {
    globalThis.fetch = realFetch;
  };

  test('a rejected token is reported as a rejected token', async () => {
    stub(() => new Response('{"error":"proxy auth required"}', { status: 401 }));
    const res = await post();
    restore();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'The model rejected the token.' });
  });

  test('a model list that fails for another reason does not block the call', async () => {
    const seen: string[] = [];
    stub((url, init) => {
      if (url.endsWith('/v1/models')) return new Response('missing', { status: 404 });
      seen.push((JSON.parse(String(init?.body)) as { model: string }).model);
      return reply(sorted);
    });
    const res = await post();
    restore();
    expect(res.status).toBe(200);
    expect(seen[0]).toBe('0000th');
  });

  test('an answer wrapped in a reasoning block is read', async () => {
    stub((url) => (url.endsWith('/v1/models') ? new Response('{"data":[{"id":"m"}]}') : reply(`<think>hmm</think>\n${sorted}`)));
    const res = await post();
    restore();
    expect(res.status).toBe(200);
    expect(((await res.json()) as { sort: { sort: string } }).sort.sort).toBe('desk');
  });
});
