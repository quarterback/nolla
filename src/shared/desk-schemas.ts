// What the model may say back, as zod schemas and as the JSON schema sent to
// vLLM for guided decoding. Two desks: the one that sorts and answers, and
// the manager, which only checks.

import { z } from 'zod';

export const SortResult = z.object({
  sort: z.enum(['desk', 'route', 'both']),
  category: z.string().max(60),
  place: z.string().max(60),
});
export type SortResult = z.infer<typeof SortResult>;

export const Desk = z.object({
  name: z.string(),
  what: z.string(),
  cost: z.string(),
  bring: z.string(),
  url: z.string(),
});

export const Answer = z.object({
  short: z.string(),
  known: z.array(z.object({ text: z.string(), source: z.number().int().min(0) })),
  changes_if: z.array(z.string()),
  desks: z.array(Desk),
  ask_someone: z.string(),
  question_back: z.object({ text: z.string(), choices: z.array(z.object({ label: z.string(), next: z.string() })) }).nullable(),
  sources: z.array(z.object({ title: z.string(), site: z.string(), url: z.string() })),
});
export type Answer = z.infer<typeof Answer>;

export const ManagerChecks = z.object({
  covered: z.boolean(),
  sourcesAgree: z.boolean(),
  desksExist: z.boolean(),
  sectionsPresent: z.boolean(),
  note: z.string(),
});
export type ManagerChecks = z.infer<typeof ManagerChecks>;

const str = { type: 'string' } as const;
export const SORT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['sort', 'category', 'place'],
  properties: { sort: { type: 'string', enum: ['desk', 'route', 'both'] }, category: str, place: str },
} as const;

export const ANSWER_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['short', 'known', 'changes_if', 'desks', 'ask_someone', 'question_back', 'sources'],
  properties: {
    short: str,
    known: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['text', 'source'], properties: { text: str, source: { type: 'integer', minimum: 0 } } } },
    changes_if: { type: 'array', items: str },
    desks: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'what', 'cost', 'bring', 'url'], properties: { name: str, what: str, cost: str, bring: str, url: str } } },
    ask_someone: str,
    question_back: {
      anyOf: [
        { type: 'null' },
        { type: 'object', additionalProperties: false, required: ['text', 'choices'], properties: { text: str, choices: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['label', 'next'], properties: { label: str, next: str } } } } },
      ],
    },
    sources: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['title', 'site', 'url'], properties: { title: str, site: str, url: str } } },
  },
} as const;

export const MANAGER_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['covered', 'sourcesAgree', 'desksExist', 'sectionsPresent', 'note'],
  properties: { covered: { type: 'boolean' }, sourcesAgree: { type: 'boolean' }, desksExist: { type: 'boolean' }, sectionsPresent: { type: 'boolean' }, note: str },
} as const;

/** Bodies over the API. */
export const SortBody = z.object({ text: z.string().min(3).max(2000), earlierTurns: z.number().int().min(0).max(50) });
export const AnswerBody = z.object({
  text: z.string().min(3).max(2000),
  sort: SortResult,
  option: z.enum(['route', 'quick', 'sources', 'lookinto']),
  earlierTurns: z.number().int().min(0).max(50),
});
export const ManagerBody = z.object({
  text: z.string(),
  answer: Answer,
  option: z.enum(['route', 'quick', 'sources', 'lookinto']),
  claim: z.enum(['facts', 'desk', 'asked', 'price', 'other']),
});
