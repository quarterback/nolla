// What the model may say back, what the browser keeps, and what travels over
// the API. The model's answer is constrained to the Turn schema with guided
// decoding and checked again here.

import { z } from 'zod';

export const Choice = z.object({
  selected: z.string(),
  considered: z.array(z.string()),
  basis: z.string(),
  source: z.string(),
  commercial_influence: z.string(),
});

/** An action the agent wants to take. The Worker turns it into a Request. */
export const Proposal = z.object({
  operation: z.string(),
  recipient: z.string(),
  description: z.string(),
  amount: z.number().min(0),
  fields_shared: z.array(z.string()),
  choice: Choice,
});
export type Proposal = z.infer<typeof Proposal>;

/** One model answer. */
export const Turn = z.object({
  say: z.string(),
  proposal: Proposal.nullable(),
  done: z.boolean(),
});
export type Turn = z.infer<typeof Turn>;

/** The JSON schema sent to vLLM for guided decoding. Kept by hand so it is
 * explicit about what the model may emit. */
export const TURN_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['say', 'proposal', 'done'],
  properties: {
    say: { type: 'string' },
    proposal: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          additionalProperties: false,
          required: ['operation', 'recipient', 'description', 'amount', 'fields_shared', 'choice'],
          properties: {
            operation: { type: 'string' },
            recipient: { type: 'string' },
            description: { type: 'string' },
            amount: { type: 'number', minimum: 0 },
            fields_shared: { type: 'array', items: { type: 'string' } },
            choice: {
              type: 'object',
              additionalProperties: false,
              required: ['selected', 'considered', 'basis', 'source', 'commercial_influence'],
              properties: {
                selected: { type: 'string' },
                considered: { type: 'array', items: { type: 'string' } },
                basis: { type: 'string' },
                source: { type: 'string' },
                commercial_influence: { type: 'string' },
              },
            },
          },
        },
      ],
    },
    done: { type: 'boolean' },
  },
} as const;

export const MandateSchema = z.object({
  id: z.string(),
  principal: z.string(),
  allowed_operations: z.array(z.string()),
  allowed_recipients: z.array(z.string()),
  max_amount: z.number(),
  expires_at: z.string(),
  requires_approval: z.boolean(),
  revoked: z.boolean(),
});

export const RequestSchema = z.object({
  id: z.string(),
  version: z.number(),
  operation: z.string(),
  recipient: z.string(),
  description: z.string(),
  amount: z.number(),
  fields_shared: z.array(z.string()),
  choice: Choice,
});
export type RequestWithChoice = z.infer<typeof RequestSchema>;

export const DecisionSchema = z.object({
  status: z.enum(['approved', 'declined']),
  request_id: z.string(),
  bound_request: z.string(),
  at: z.string(),
});

export const EventSchema = z.object({
  sequence: z.number(),
  type: z.string(),
  source: z.string(),
  at: z.string(),
  simulated: z.literal(true),
  request_id: z.string().optional(),
  note: z.string().optional(),
});

export const Message = z.object({
  role: z.enum(['person', 'agent', 'system']),
  text: z.string(),
  /** The request a proposal card belongs to, on agent messages. */
  request_id: z.string().optional(),
});
export type Message = z.infer<typeof Message>;

/** Everything the browser keeps between turns. The Worker holds nothing. */
export const State = z.object({
  scenario: z.string(),
  /** The scenario's fixed clock, advanced one minute per action. */
  now: z.string(),
  messages: z.array(Message),
  mandates: z.array(MandateSchema),
  requests: z.array(RequestSchema),
  decisions: z.array(DecisionSchema),
  events: z.array(EventSchema),
  /** How many model turns have happened. Picks the scripted answer in dev. */
  turns: z.number().int().min(0),
});
export type State = z.infer<typeof State>;

export const TurnBody = z.object({ state: State, text: z.string().max(4000) });

export const ActBody = z.object({
  state: State,
  request_id: z.string(),
  action: z.enum(['approve', 'decline', 'withdraw', 'dispute', 'grant']),
  /** For "approve with limits": the mandate's new limits. */
  limits: z.object({ max_amount: z.number().min(0), hours: z.number().min(1).max(720) }).optional(),
  /** For "withdraw" and "grant": the mandate. */
  mandate_id: z.string().optional(),
});
export type ActBody = z.infer<typeof ActBody>;
