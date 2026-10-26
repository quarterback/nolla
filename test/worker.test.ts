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
