// Talks to the model on Modal through its OpenAI-compatible endpoint, with
// guided JSON so every answer fits a schema, then checks it with zod. With no
// model set up in dev, each route supplies its own scripted answer.

import type { ZodType } from 'zod';
import type { Env } from './env';
import { modelConfigured, scripted as useScript } from './env';
import { fail } from './util';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/** The model name the endpoint serves. MODEL_NAME when set; otherwise the
 * first model the endpoint lists, remembered for the life of the isolate. */
let discovered: string | null = null;
async function modelName(env: Env): Promise<string> {
  if (env.MODEL_NAME) return env.MODEL_NAME;
  if (discovered) return discovered;
  const res = await fetch(`${env.MODAL_BASE_URL}/v1/models`, { headers: { authorization: `Bearer ${env.MODAL_TOKEN}` } });
  if (!res.ok) fail(503, res.status >= 500 ? 'The model is starting. Try again in a minute.' : 'The model did not answer.');
  const body = (await res.json()) as { data?: { id: string }[] };
  const id = body.data?.[0]?.id;
  if (!id) fail(502, 'The model endpoint lists no model.');
  discovered = id;
  return id;
}

/** Whether the endpoint takes a JSON schema. Flipped off after one refusal. */
let schemaOk = true;

function requestBody(model: string, messages: ChatMessage[], schema: unknown, stream: boolean) {
  const body: Record<string, unknown> = { model, messages, stream, temperature: 0.3, max_tokens: 1200 };
  if (schemaOk) body.response_format = { type: 'json_schema', json_schema: { name: 'reply', schema } };
  else body.response_format = { type: 'json_object' };
  return JSON.stringify(body);
}

async function call(env: Env, messages: ChatMessage[], schema: unknown, stream: boolean): Promise<Response> {
  const model = await modelName(env);
  const send = () =>
    fetch(`${env.MODAL_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.MODAL_TOKEN}` },
      body: requestBody(model, messages, schema, stream),
    });
  let res = await send();
  if (res.status === 400 && schemaOk) {
    // The endpoint refused the schema parameter: ask for a JSON object instead.
    schemaOk = false;
    res = await send();
  }
  if (res.status === 401 || res.status === 403) fail(502, 'The model refused the token.');
  if (!res.ok || !res.body) fail(503, res.status >= 500 ? 'The model is starting. Try again in a minute.' : 'The model did not answer.');
  return res;
}

export type StreamEvent<T> = { type: 'delta'; text: string } | { type: 'done'; value: T };

/** Like completeJson, but yields the raw text as it arrives. In scripted
 * mode the finished JSON is yielded in small pieces so the page behaves the
 * same way. */
export async function* streamJson<T>(
  env: Env,
  messages: ChatMessage[],
  jsonSchema: unknown,
  zod: ZodType<T>,
  scripted: () => T,
): AsyncGenerator<StreamEvent<T>> {
  if (useScript(env)) {
    const value = scripted();
    const raw = JSON.stringify(value);
    for (let i = 0; i < raw.length; i += 16) {
      yield { type: 'delta', text: raw.slice(i, i + 16) };
      await new Promise((r) => setTimeout(r, 12));
    }
    yield { type: 'done', value };
    return;
  }
  if (!modelConfigured(env)) fail(503, 'The model is not set up.');
  let raw = '';
  for await (const piece of stream(env, messages, jsonSchema)) {
    raw += piece;
    yield { type: 'delta', text: piece };
  }
  let value = parse(raw, zod);
  if (!value) {
    const repair = [...messages, { role: 'assistant' as const, content: raw }, { role: 'user' as const, content: 'That was not valid JSON for the schema. Answer again with only the JSON object.' }];
    value = parse(await complete(env, repair, jsonSchema), zod);
    if (!value) fail(502, 'The model did not answer in the expected shape.');
  }
  yield { type: 'done', value };
}

async function* stream(env: Env, messages: ChatMessage[], schema: unknown): AsyncGenerator<string> {
  const res = await call(env, messages, schema, true);
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
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

export async function completeJson<T>(
  env: Env,
  messages: ChatMessage[],
  jsonSchema: unknown,
  zod: ZodType<T>,
  scripted: () => T,
): Promise<T> {
  if (useScript(env)) return scripted();
  if (!modelConfigured(env)) fail(503, 'The model is not set up.');
  const first = await complete(env, messages, jsonSchema);
  const parsed = parse(first, zod);
  if (parsed) return parsed;
  const repair = [...messages, { role: 'assistant' as const, content: first }, { role: 'user' as const, content: 'That was not valid JSON for the schema. Answer again with only the JSON object.' }];
  const second = parse(await complete(env, repair, jsonSchema), zod);
  if (!second) fail(502, 'The model did not answer in the expected shape.');
  return second;
}

function parse<T>(raw: string, zod: ZodType<T>): T | null {
  try {
    const r = zod.safeParse(JSON.parse(raw.trim()));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

async function complete(env: Env, messages: ChatMessage[], schema: unknown): Promise<string> {
  const res = await call(env, messages, schema, false);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return body.choices?.[0]?.message?.content ?? '';
}
