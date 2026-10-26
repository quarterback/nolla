# Agent Action Record: The desk build and the move to quarterback/nolla

**Review date:** 2026-10-26
**Reviewed by:** agent self review
**Agent / system:** Claude (cloud session)
**Task or period under review:** Rebuild the interface as the priced reference desk from the owner's design canvas and skill, rename the tool to nolla, and put it in `quarterback/nolla`
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "it's in github.com/quarterback/nolla is where the actual repo lives". Then: "that's what the name of the tool would be called rather than 0000th which no one can say and it'd just be nolla styled as /nolla/ i would replace the nolla nolla site". Then a link to the "0000th interface" design canvas, and: "I want the tabloid, deconstructed minimal editorial look that includes several of the modalities in my mockup including designing refunds." On the domain: "We need to redirect nollanolla.com to 0000th.ai but 0000th.ai is the apex domain".
**Scope:** replace the placeholder site at the root of `quarterback/nolla` with the app; rename every "0000th" in code and docs to "nolla" except the domain; rebuild the interface as the desk: sort, price, answer in the tabloid layout, counter refunds, manager decisions, register; redirect the old domain.
**Success defined in advance as:** the price examples in the `0000th` skill come out of the pricing code exactly (540 for the routed example, 190 for the toilet); the refund table and manager outcomes are reproducible in tests; the four canvas calls run end to end in scripted mode; screenshots match the tabloid board.
**Authority granted to the agent:** the owner said "do it now" to creating the repository and pushing, then named the existing repository.
**Out of scope:** the Modal deploy, the Access setup, and the DNS change for the redirect.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Tried to create a `0000th` repository three ways. All were refused: the session can only write to repositories it was started with. Asked the owner, who named `quarterback/nolla`.
2. Attached `quarterback/nolla`. It held the Nolla Nolla placeholder site. Removed it, kept its favicons in `public/`, and put the app at the root. Renamed the tool to nolla, keeping `0000th.ai` in the deploy settings.
3. Read the whole design canvas (31 boards) and the `0000th` skill. Took the desk rules from the skill and the look from the tabloid, deconstructed and refund boards.
4. Wrote `src/shared/desk.ts`: the price schedule, the options, counter refunds by reason, manager decisions from five checks, the weekly allowance. 17 tests reproduce the skill's examples.
5. Rewrote the Worker: one JSON model call per step with its own prompt (sort, answer, manager), scripted answers for the four canvas calls in dev, and a redirect from `nollanolla.com` and `www` to the apex domain. 5 Worker tests cover the redirect and the routes.
6. Rewrote the interface: call form with the sample calls, quotes with formulas, the tabloid answer page, the counter, the manager with its decision receipt, the register. Archivo condensed, Source Serif 4 and IBM Plex Mono, red masthead reading NOLLA.
7. Removed the agent-authority scenario, cards and ledger from the interface. Kept the authority and record libraries and their tests, since the owner wants them as a test case.
8. Walked the desk in a browser at phone and desktop widths and took screenshots.

**What it produced or changed:** see the commit on `claude/tender-mccarthy-w59ret`.
**Where actual behavior differed from the instruction:** the first commit on the branch put the app under `0000th/`; the owner stopped that and said to replace the site. This commit does.
**Stayed within granted authority?** Yes. Nothing was deployed and no DNS was changed.

## 3. Judgment: human in the loop
**Decisions the owner made:** the repository, the name, replacing the placeholder, the look, refunds in scope, the redirect direction.
**Decisions the agent made alone, for owner review:**
- **The bill is capped at the posted price.** The real word count is billed, but never above the quote the person accepted. The page says how many words were written when the cap applies.
- **The sort charge is taken when the call is sorted,** even if the person then edits the call. The skill says sorting is always charged.
- **The manager's checks come from a second model call;** the decision itself is arithmetic. "Did the charge match the posted price" is computed, not asked.
- **Weekly allowance of 5,000 tkn.** The skill names an allowance but not its size. The canvas shows balances around 4,000 to 4,500.
- **One look.** The canvas has four looks. The tabloid board is the answer page; the minimal board's big number is the register; the deconstructed board's price formula sits under every headline.
- **The redirect is in the Worker,** with `nollanolla.com` and `www.nollanolla.com` as routes on it, so one deploy covers both domains. A Cloudflare redirect rule would also work.
- **Footprint figures** per token are the canvas's and are marked simulated.

**Points where it should have escalated and didn't:** none known.

## 4. Deviation: the gaps
- The live model path is untested. No GPU or Modal account here. The prompts and guided JSON schemas are untested against vLLM.
- The Access check runs only in production; dev mode skips it.
- The scripted manager finds one failure per claim so every outcome is reachable; the real manager may find none.
- The earlier-turns surcharge is in the pricing code but the interface treats every call as its own thread, so it is always 0.
- No machine trace was available to reconcile this record against.

## 5. Consequence: what it cost or risked
**Observed:** type checks, build and 43 tests pass. The browser walk sorted a call, ran "Answer with sources" for 520 tkn, refunded 60 tkn at the counter for a wrong desk, and had the manager partly approve 18 tkn for a missing section. The balance moved from 5,000 to 4,480 to 4,540. No page errors, no sideways scroll at 390 px.
**Risk:** the placeholder site is gone from `main` once this merges. Its files are in the branch history.
**Downstream affected parties:** visitors to nollanolla.com will land on 0000th.ai and its login once deployed.
**Expected failure if this run happened 100 times:** the first live deploy would need a fix in the prompts or the vLLM flags in most runs.

## 6. Change: what happens next
1. Merge the branch, deploy the model and the Worker, add the Access application.
2. Point `nollanolla.com` and `www` at the Worker in Cloudflare so the redirect takes effect.
3. Run the four sample calls against the live model and compare with the scripted answers.
4. Decide whether the authority library returns as priced actions on the answer page, as the "Result and bill" board shows.
**Keep doing:** reproduce the skill's examples in tests before touching the pricing.
**Should not be delegated to an agent at all:** the allowance size, the counter limits, and who is on the Access allowlist.
**Signal that the change worked:** the owner takes the screenshots from the live desk without editing them.
