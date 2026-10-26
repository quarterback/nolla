# Agent Action Record: First build of 0000th

**Review date:** 2026-10-26
**Reviewed by:** agent self review
**Agent / system:** Claude (cloud session)
**Task or period under review:** Build the first version of 0000th.ai from the approved plan
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "I own 0000th.ai and i was wanting to build a narrative wedge in the form of a model wrapper, i would not have many people have access to this LLM but i'd want to deploy something and build a better chat interface around it, the idea is i'd get good screenshots, could demonstrate a better modality than just chat." Later: "this is only so i can have some screenshots to tell a story, and a login to give people, it's mostly a narrative wedge that feeds into my tooling and builder persona." The owner added that it is not for sale or wide circulation, and that they want it as a test case for agent authority patterns and decision engineering, with an interface unlike other LLM products.
**Scope:** a new repo with a Cloudflare Worker and static interface, a Modal app for an open-weights model, agent-authority patterns as the interface, and Cloudflare Access for the login. Decided with the owner through four questions before the plan.
**Success defined in advance as:** the plan's verification list: type checks, build and tests pass; the seeded scenario runs the same way twice; the interface shows narrowing, a refused request after withdrawal, a grant for a service with no permission, and a dispute that keeps the original event.
**Authority granted to the agent:** build the repo locally and commit. The owner approved the plan in plan mode.
**Out of scope:** creating the GitHub repository, deploying to Modal or Cloudflare, and anything that implies a real integration.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Read the four existing repos. Took the Worker shape from voluntold and the authority and record libraries, tests, examples and audit checklist from the vloora site's agent-interaction-patterns demo.
2. Scaffolded `/home/user/0000th` with voluntold's conventions: `CLAUDE.md`, `.editorial.json`, the three skills, `scripts/check-docs.mjs`.
3. Ported `authority.mjs` and `records.mjs` to TypeScript in `src/shared/`, adding a `NO_MANDATE` code, a `mandateFor` lookup, and the event types `person.granted`, `person.withdrew` and `client.refused`. Ported the demo's tests and added cases for the additions. 20 tests pass.
4. Wrote the Worker: Access token check with jose, a streaming model client for vLLM's OpenAI-compatible API with guided JSON and one repair retry, a prompt built from the ledger, a scripted stand-in for dev, simulated services, and the `/api/turn` and `/api/act` routes.
5. Wrote the interface: thread, proposal card with allow once, allow with limits and decline, the authority ledger with withdraw, the event record, export and reset. Dark and light themes, phone layout.
6. Wrote `modal/serve.py` for Qwen2.5-7B-Instruct on an L4 with a bearer token, and its README with cost and cold-start notes.
7. Wrote one scenario, "Move my Tuesday", with a fixed clock, two seeded permissions and four scripted answers.
8. Ran the Worker locally in scripted mode and walked the scenario twice: once over the API with a script, once in a browser with Playwright at desktop and phone sizes. Took the screenshots in `docs/screens/`.

**What it produced or changed:** the whole repo. See the first commit.
**Where actual behavior differed from the instruction:** none known. The plan said streaming; it is in, with the agent's words shown as they arrive and the card drawn when the object completes.
**Stayed within granted authority?** Yes. No repository was created on GitHub and nothing was deployed.

## 3. Judgment: human in the loop
**Decisions the owner made:** open-weights model on Modal; agent-authority patterns as the interface; Cloudflare Access; a new repo shaped like voluntold.
**Decisions the agent made alone, for owner review:**
- **The browser holds all state.** The Worker is stateless and runs the permission check on the state the browser sends. Enough for a test bed; a production system would keep the ledger server-side.
- **"Allow with limits" creates a new permission** and marks the old one replaced, rather than editing it. The record then shows the narrowing as its own event.
- **"Allow once" on a withdrawn permission is refused with REVOKED** instead of quietly granting again. Granting again takes the limits form.
- **Bookings never complete on their own.** The fake rail service acknowledges and stops, so the difference between acknowledged and completed is visible. Cancellations and city reports complete at once.
- **Qwen2.5-7B-Instruct** as the default model, for its license and JSON following. Untested here.
- **The scripted stand-in** answers in dev when no model is set. The interface cannot tell the difference, and the status chip says "Scripted answers".
- **No interface-copy check** in `check-docs.mjs`. The copy is short labels, and the voluntold rules about screen text were not asked for here.
- `npm install` needed `--legacy-peer-deps` because of an npm bug resolving vitest's peers. The README says so.

**Points where it should have escalated and didn't:** none known.

## 4. Deviation: the gaps
- The real model path was never run. No GPU and no Modal account in this session. The vLLM flags, guided decoding and streaming parse are written from documentation and untested against a live server. The first deploy will likely need small fixes in `modal/serve.py` or `src/worker/model.ts`.
- The Access check was not run against a real Access application. Dev mode skips it.
- The prompt has no few-shot examples. A 7B model may propose weakly or ignore a withdrawn permission; the Worker refuses the attempt either way.
- No machine trace was available to reconcile this record against. The evidence is the API walk output and the screenshots.

## 5. Consequence: what it cost or risked
**Observed:** `npm run check` passes. The API walk produced the expected codes: `WITHIN_TERMS` after narrowing to $130, `REVOKED` after withdrawal, `WITHIN_TERMS` after a fresh grant, and a dispute appended after a completion. The browser walk produced 16 events, no page errors and no horizontal scroll at 390 px.
**Risk:** a warm GPU left on costs about $1 an hour. The Modal file defaults to scale-to-zero. If the Access audience is wrong, every `/api` call returns 401 and the interface shows the error line.
**Downstream affected parties:** none yet. Nothing is deployed.
**Expected failure if this run happened 100 times:** most runs would hit at least one mismatch between the written vLLM flags and the installed vLLM version on first deploy.

## 6. Change: what happens next
1. The owner creates the GitHub repository and pushes, or asks the agent to.
2. Deploy the model with `modal/README.md`, then run the API walk against it and fix what breaks.
3. Set up the Access application and deploy the Worker. Confirm `/api/health` returns 401 without the Access header.
4. Run the five-minute exercise from the Vloora demo's `AUDIT.md` against the live interface and record the results.
**Keep doing:** walk the scenario by script and by browser before each change to the interface.
**Should not be delegated to an agent at all:** turning keep-warm on and off, and choosing who is on the Access allowlist.
**Signal that the change worked:** the owner gets the screenshots they wanted from the live model without editing them.
