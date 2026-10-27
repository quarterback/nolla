// Talks to the model on Modal through its OpenAI-compatible endpoint, with
// guided JSON so every answer fits a schema, then checks it with zod. With no
// model set up in dev, each route supplies its own scripted answer.

import type { ZodType } from 'zod';
import type { Env } from './env';
import { modelConfigured, scripted as useScript } from './env';
import { fail } from './util';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/** The name the Modal endpoint serves when it does not list one. */
const DEFAULT_MODEL = '0000th';

/** What the endpoint said, in plain words. */
function refuse(status: number): never {
  if (status === 401 || status === 403) fail(502, 'The model rejected the token.');
  if (status >= 500 || status === 408 || status === 425 || status === 429) fail(503, 'The model is starting.');
  fail(502, `The model answered with status ${status}.`);
}

/** The model name: MODEL_NAME when set, else the first model the endpoint
 * lists, else the endpoint's own name. A listing that fails for a reason
 * other than the token never blocks a call. */
let discovered: string | null = null;
async function modelName(env: Env): Promise<string> {
  if (env.MODEL_NAME) return env.MODEL_NAME;
  if (discovered) return discovered;
  const res = await fetch(`${env.MODAL_BASE_URL}/v1/models`, { headers: { authorization: `Bearer ${env.MODAL_TOKEN}` } });
  if (res.status === 401 || res.status === 403) refuse(res.status);
  if (!res.ok) return DEFAULT_MODEL;
  const body = (await res.json().catch(() => ({}))) as { data?: { id: string }[] };
  discovered = body.data?.[0]?.id ?? DEFAULT_MODEL;
  return discovered;
}

/** Request shapes, strictest first. An endpoint that refuses one with 400 or
 * 422 gets the next; the first that works is kept for the isolate. */
let variant = 0;
const VARIANTS = 4;

function requestBody(model: string, messages: ChatMessage[], schema: unknown, stream: boolean, v: number) {
  const body: Record<string, unknown> = { model, messages, stream, temperature: 0.3, max_tokens: 1500 };
  if (v < 3) body.chat_template_kwargs = { enable_thinking: false };
  if (v === 0) body.response_format = { type: 'json_schema', json_schema: { name: 'reply', schema } };
  else if (v < 3) body.response_format = { type: 'json_object' };
  return JSON.stringify(body);
}

async function call(env: Env, messages: ChatMessage[], schema: unknown, stream: boolean): Promise<Response> {
  const model = await modelName(env);
  let res: Response;
  for (;;) {
    res = await fetch(`${env.MODAL_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.MODAL_TOKEN}` },
      body: requestBody(model, messages, schema, stream, variant),
    });
    if ((res.status === 400 || res.status === 422) && variant < VARIANTS - 1) {
      variant += 1;
      continue;
    }
    break;
  }
  if (!res.ok || !res.body) {
    console.error('model', res.status, (await res.text().catch(() => '')).slice(0, 300));
    refuse(res.status);
  }
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

/** The JSON object in the model's text, read past any reasoning block. */
function parse<T>(raw: string, zod: ZodType<T>): T | null {
  const text = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const from = text.indexOf('{');
  const to = text.lastIndexOf('}');
  if (from < 0 || to < from) return null;
  try {
    const r = zod.safeParse(JSON.parse(text.slice(from, to + 1)));
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

export type ChatEvent =
  | { type: 'meta'; model: string }
  | { type: 'delta'; content: string; reasoning: string }
  | { type: 'usage'; prompt: number; completion: number };

/** Plain chat: the model's own text with no schema and no change to how it
 * reasons. Yields content and reasoning as they arrive, then token counts. */
export async function* streamChat(env: Env, messages: ChatMessage[], opts: { reasoning?: boolean } = {}): AsyncGenerator<ChatEvent> {
  if (!modelConfigured(env)) fail(503, 'The model is not connected.');
  const model = await modelName(env);
  yield { type: 'meta', model };
  let res: Response | null = null;
  // Request shapes, fullest first. A 400 or 422 moves to the next.
  const shapes = opts.reasoning === false ? [[true, true], [true, false], [false, false]] : [[true, false], [false, false]];
  for (const [usage, quiet] of shapes) {
    res = await fetch(`${env.MODAL_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.MODAL_TOKEN}` },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        ...(usage ? { stream_options: { include_usage: true } } : {}),
        ...(quiet ? { chat_template_kwargs: { enable_thinking: false } } : {}),
      }),
    });
    if (res.status !== 400 && res.status !== 422) break;
  }
  if (!res || !res.ok || !res.body) {
    console.error('model chat', res?.status, (await res?.text().catch(() => ''))?.slice(0, 300));
    refuse(res?.status ?? 503);
  }
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
        const json = JSON.parse(data) as {
          choices?: { delta?: { content?: string; reasoning_content?: string; reasoning?: string } }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const d = json.choices?.[0]?.delta;
        const content = d?.content ?? '';
        const reasoning = d?.reasoning_content ?? d?.reasoning ?? '';
        if (content || reasoning) yield { type: 'delta', content, reasoning };
        if (json.usage) yield { type: 'usage', prompt: json.usage.prompt_tokens ?? 0, completion: json.usage.completion_tokens ?? 0 };
      } catch {
        // A partial line; the next chunk completes it.
      }
    }
  }
}
