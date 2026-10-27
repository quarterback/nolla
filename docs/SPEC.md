# Spec: nolla

**Status:** second build, revised October 26, 2026 to `docs/GUIDELINES.md`: chartreuse light, teal dark, the flow of ask, generate, pay. A story prop and a test bed for a priced reference desk and its refunds.

## Why

The owner wants screenshots that tell a story, a login to give a few people, and a place to try interface ideas that are unlike other LLM products. The desk prices its own work in the open, sends people to real desks, and owns its mistakes with refunds. The rules are the owner's `0000th` skill and `EDITORIAL.md`. The look follows `docs/GUIDELINES.md` and the chartreuse flow row on the owner's "0000th interface" canvas: the call in Unbounded, the price menu, the answer streaming with a running meter, the receipt.

## The desk

1. **Ask.** The person types the call and picks an option from the price menu: route only, quick answer, answer with sources, look into it. Prices come from the schedule in `src/shared/desk.ts`: sort 40, slip 60, source 120, 1 per word, check 80, plus 10% per earlier turn. The ask button carries the price.
2. **Answer.** The model writes in its own words, streamed, with no schema and no sort ahead of it. The first paragraph leads and the rest follow. A meter runs as the words arrive.
3. **The desk runs after.** When the answer is finished, the desk sorts it and files it on a path, counts its words, and posts the receipt: sort 40 tkn plus the words written, capped at the posted price. The balance ticks down.
4. **Refund at the counter.** The person picks one reason. The counter refunds the line items that reason covers, up to 300 tkn per refund and 1,000 tkn a week, and flags the answer. Larger claims go to the manager.
5. **Ask for a manager.** Three questions, one at a time. A separate model call checks what can be checked. The decision is arithmetic on the posted price: approved, partly approved, or denied with a free redo. A decision receipt stays with the call.
6. **Register.** The weekly balance, 5,000 tkn refilled on Monday, every call with its price, refunds and receipts, and the choice of light or dark.
7. **Front page and tour.** The first screen holds the name, the way in, and a collapsed tour: every state of the desk from one fixed call, built in the browser from the scripted answers, without touching the balance.

The house rate is 1,000 tkn to $0.25. Footprint figures (energy, water, carbon per token) are the ones the canvas uses.

## How it works

- The browser keeps all state in localStorage: balance, week, calls. The Worker holds nothing.
- `POST /api/sort`, `POST /api/answer` and `POST /api/manager` each make one model call with guided JSON and check the result with zod. `/api/answer` streams when asked for an event stream, so the page can show the answer being written. The manager uses its own prompt, so it is a separate desk.
- With `DEV_MODE=1` and no model, four calls from the canvas answer from `src/worker/script.ts`. The interface is identical.
- Cloudflare Access gates `0000th.ai`. The Worker verifies the Access token on `/api` and redirects `nollanolla.com` to the apex domain.

## Kept for the next modality

`src/shared/authority.ts` and `src/shared/records.ts`, with their tests, port the mandate checks and the attributed event record from the Vloora agent-interaction-patterns demo. The canvas's "Result and bill" board uses them for priced actions inside a mandate. They are not wired to the interface yet.

## Growing it

- A new scripted call is an entry in `src/worker/script.ts`.
- A pricing or refund rule changes in `src/shared/desk.ts`, with a test in `test/desk.test.ts` first.
- A new board from the canvas becomes a view in `src/web`. Keep the posted price and the classification.
- Every interface string passes `scripts/check-copy.mjs`, and the owner signs off on copy.
