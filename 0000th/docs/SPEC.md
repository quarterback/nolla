# Spec: 0000th

**Status:** first build, October 26, 2026. A story prop and a test bed for agent-authority patterns.

## Why

The owner wants screenshots that tell a story, a login to give a few people, and a place to try interface ideas for how a person keeps authority while an agent acts. It also lets the owner say the model is theirs: an open-weights model they host, behind their own domain.

## What it shows

One scenario, "Move my Tuesday". The person asks the agent to rebook a train, cancel a gym membership and report a broken streetlight. The agent proposes one action at a time. For each, the interface shows:

- the operation, the receiving service, the money leaving the account and the information shared
- what was chosen, what else was considered, the basis, the source and any commercial influence
- which recorded permission covers it, or that none does

The person can allow once, allow with limits (an amount and a number of hours, which becomes a new permission), or decline. The ledger on the right lists every permission with a Withdraw button, and the record below it lists every event with its source.

The patterns, from Vloora's agent interaction patterns guide:

1. Approval binds one exact request. A changed amount or recipient returns `APPROVAL_MISMATCH`.
2. A permission limits what approval can do. Withdrawn, expired, over the limit, wrong recipient and out of scope each refuse with their own code, before any attempt.
3. The client's attempt, the service's acknowledgment and its completion are separate events. A booking stays acknowledged until the service reports, which the fake rail service never does on its own.
4. A dispute is appended and the completion event remains.
5. Export writes the same JSON format as the Vloora demo, marked synthetic, so the record leaves with the person.

## How it works

- The browser keeps all state and sends it with every request. The Worker holds nothing.
- `POST /api/turn` streams the model's answer. The model answers in JSON (`say`, `proposal`, `done`) under guided decoding, and the Worker checks it with zod.
- `POST /api/act` applies a person's decision. It runs `checkPermission` from `src/shared/authority.ts` against the mandate that covers the recipient and records the result. Only a request that passes reaches the simulated service.
- With `DEV_MODE=1` and no model, answers come from the scenario's script. The interface is identical.
- Cloudflare Access gates the domain. The Worker verifies the Access token on `/api`.
- No real service is called, no outcome is verified, and Access is the only identity check. The Vloora patterns document lists these as gaps a production system must close. This build leaves them open and says so on screen.

## Growing it

- A second scenario is a new file in `scenarios/` plus a line in `src/worker/scenarios.ts`.
- A new authority rule goes in `src/shared/authority.ts` with a test in `test/authority.test.ts` first.
- Interface experiments live in `src/web`. Keep the simulated badge and the attributed sources.
