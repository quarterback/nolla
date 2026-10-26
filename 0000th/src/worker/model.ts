// Talks to the model on Modal through its OpenAI-compatible endpoint, with
// guided JSON so every answer fits the Turn schema. Streams the raw text so
// the browser can show "say" as it arrives, then checks the whole answer.
// With no model set up in dev, answers come from the scenario's script.

import { Turn, TURN_JSON_SCHEMA, type State } from '../shared/turn';
import type { Env } from './env';
import { isDev, modelConfigured } from './env';
import { systemPrompt } from './prompt';
import { scenarioById } from './scenarios';
import { fail } from './util';

export type ModelEvent = { type: 'delta'; text: string } | { type: 'turn'; turn: Turn };

export async function* streamTurn(env: Env, state: State, text: string): AsyncGenerator<ModelEvent> {
  if (!modelConfigured(env)) {
    if (!isDev(env)) fail(503, 'The model is not set up.');
    yield* scripted(state);
    return;
  }
  const messages = conversation(state, text);
  let raw = '';
  for await (const chunk of complete(env, messages, true)) {
    raw += chunk;
    yield { type: 'delta', text: chunk };
  }
  let turn = parseTurn(raw);
  if (!turn) {
    // One repair pass, not streamed: tell the model what was wrong.
    const repair = [...messages, { role: 'assistant' as const, content: raw }, { role: 'user' as const, content: 'That was not valid JSON for the schema. Answer again with only the JSON object.' }];
    let fixed = '';
    for await (const chunk of complete(env, repair, false)) fixed += chunk;
    turn = parseTurn(fixed);
    if (!turn) fail(502, 'The model did not answer in the expected shape.');
    yield { type: 'delta', text: fixed };
  }
  yield { type: 'turn', turn };
}

function parseTurn(raw: string): Turn | null {
  try {
    const parsed = Turn.safeParse(JSON.parse(raw.trim()));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

function conversation(state: State, text: string): ChatMessage[] {
  const out: ChatMessage[] = [{ role: 'system', content: systemPrompt(state) }];
  for (const m of state.messages) {
    if (m.role === 'person') out.push({ role: 'user', content: m.text });
    else if (m.role === 'agent') out.push({ role: 'assistant', content: m.text });
    else out.push({ role: 'user', content: `[ledger] ${m.text}` });
  }
  out.push({ role: 'user', content: text || '[continue]' });
  return out;
}

async function* complete(env: Env, messages: ChatMessage[], stream: boolean): AsyncGenerator<string> {
  const res = await fetch(`${env.MODAL_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.MODAL_TOKEN}` },
    body: JSON.stringify({
      model: env.MODEL_NAME,
      messages,
      stream,
      temperature: 0.4,
      max_tokens: 700,
      response_format: { type: 'json_schema', json_schema: { name: 'turn', schema: TURN_JSON_SCHEMA } },
    }),
  });
  if (res.status === 401 || res.status === 403) fail(502, 'The model refused the token.');
  if (!res.ok || !res.body) fail(503, res.status >= 500 ? 'The model is starting. Try again in a minute.' : 'The model did not answer.');
  if (!stream) {
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    yield body.choices?.[0]?.message?.content ?? '';
    return;
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const json = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
        const piece = json.choices?.[0]?.delta?.content;
        if (piece) yield piece;
      } catch {
        // A partial line; the next chunk completes it.
      }
    }
  }
}

/** Dev stand-in: the scenario's script, one answer per turn, streamed in
 * small pieces so the interface behaves as it will with the model. */
async function* scripted(state: State): AsyncGenerator<ModelEvent> {
  const script = scenarioById(state.scenario).script;
  const turn = script[Math.min(state.turns, script.length - 1)];
  const raw = JSON.stringify(turn);
  for (let i = 0; i < raw.length; i += 24) {
    yield { type: 'delta', text: raw.slice(i, i + 24) };
    await new Promise((r) => setTimeout(r, 15));
  }
  yield { type: 'turn', turn };
}
