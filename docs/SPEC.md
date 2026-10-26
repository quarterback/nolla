# Spec: nolla

**Status:** second build, revised October 26, 2026 to the blue minimal look. A story prop and a test bed for a priced reference desk and its refunds.

## Why

The owner wants screenshots that tell a story, a login to give a few people, and a place to try interface ideas that are unlike other LLM products. The desk prices its own work in the open, sends people to real desks, and owns its mistakes with refunds. The rules are the owner's `0000th` skill and `EDITORIAL.md`. The look is the row "The design to build: blue minimal with deconstruction" on the owner's "0000th interface" canvas: cobalt ground, white ink, the classification code and path, the tokenized call, the price as a ruled list and a form, white slips and receipts with stamps.

## The desk

1. **Sort the call.** The model decides whether the call is answered at the desk, routed, or both. Sorting costs 40 tkn and is always charged.
2. **Post the price.** The person sees each option with its formula: route only, quick answer, answer with sources, look into it. Prices come from the schedule in `src/shared/desk.ts`: sort 40, slip 60, source 120, 1 per word, check 80, plus 10% per earlier turn.
3. **Run.** The model answers in the desk's order: the call word for word, the short answer, what is known with numbered sources, this answer changes if, who handles this, one question back, sources. The bill uses the real word count, capped at the posted price.
4. **Refund at the counter.** The person picks one reason. The counter refunds the line items that reason covers, up to 300 tkn per refund and 1,000 tkn a week, and flags the answer. Larger claims go to the manager.
5. **Ask for a manager.** Three questions, one at a time. A separate model call checks what can be checked. The decision is arithmetic on the posted price: approved, partly approved, or denied with a free redo. A decision receipt stays with the call.
6. **Register.** The weekly balance, 5,000 tkn refilled on Monday, and every call with its price, refunds and receipts.

The house rate is 1,000 tkn to $0.25. It is notional. Footprint figures (energy, water, carbon per token) are the ones the canvas uses and are marked simulated.

## How it works

- The browser keeps all state in localStorage: balance, week, calls. The Worker holds nothing.
- `POST /api/sort`, `POST /api/answer` and `POST /api/manager` each make one model call with guided JSON and check the result with zod. The manager uses its own prompt, so it is a separate desk.
- With `DEV_MODE=1` and no model, four calls from the canvas answer from `src/worker/script.ts`. The interface is identical.
- Cloudflare Access gates `0000th.ai`. The Worker verifies the Access token on `/api` and redirects `nollanolla.com` to the apex domain.
- No real desk is called and no source is fetched. The model's sources are what it cites, and the manager checks them only as far as a model can.

## Kept for the next modality

`src/shared/authority.ts` and `src/shared/records.ts`, with their tests, port the mandate checks and the attributed event record from the Vloora agent-interaction-patterns demo. The canvas's "Result and bill" board uses them for priced actions inside a mandate. They are not wired to the interface yet.

## Growing it

- A new scripted call is an entry in `src/worker/script.ts`.
- A pricing or refund rule changes in `src/shared/desk.ts`, with a test in `test/desk.test.ts` first.
- A new board from the canvas becomes a view in `src/web`. Keep the posted price, the classification, and the simulated note.
- Every interface string passes `scripts/check-copy.mjs`, and the owner signs off on copy.
