// Talks to the model on Modal through its OpenAI-compatible endpoint, with
// guided JSON so every answer fits a schema, then checks it with zod. With no
// model set up in dev, each route supplies its own scripted answer.

import type { ZodType } from 'zod';
import type { Env } from './env';
import { modelConfigured, scripted as useScript } from './env';
import { fail } from './util';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

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
  const res = await fetch(`${env.MODAL_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.MODAL_TOKEN}` },
    body: JSON.stringify({
      model: env.MODEL_NAME,
      messages,
      temperature: 0.3,
      max_tokens: 1200,
      response_format: { type: 'json_schema', json_schema: { name: 'reply', schema } },
    }),
  });
  if (res.status === 401 || res.status === 403) fail(502, 'The model refused the token.');
  if (!res.ok) fail(503, res.status >= 500 ? 'The model is starting. Try again in a minute.' : 'The model did not answer.');
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return body.choices?.[0]?.message?.content ?? '';
}
