# Agent Action Record: Connecting the live model

**Review date:** 2026-10-27
**Reviewed by:** agent self review
**Agent / system:** Claude (cloud session)
**Task or period under review:** Find why the live desk answered "The model did not answer." and fix the cause; apply the front page change from the closed menu cleanup pull request
**Accountable human (name or role):** Ron Bronson, repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "the current setup does not let me access the model nothing works so there's an issue somewhere in this design now that the model is live". Also: the screenshot of the front page with the paragraph and the full tour, "this is what i am talking about", and "use my editorial rules from prosekeep NOT TO keep writing AI slop menus and instructions".
**Scope:** the Worker's model client, the deploy step that stores the token, the front page.
**Success defined in advance as:** a rejected token, a failed listing and an unexpected reply each produce a message that names the cause; tests cover each; checks pass.
**Authority granted to the agent:** the owner's instruction.
**Out of scope:** the model's answer quality, which needs a live read.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Probed the endpoint without credentials. With a wrong bearer token it answered: supply the proxy token as `Bearer wk-<id>.ws-<secret>`. A token in any other shape gets a 401.
2. Found the defect in the Worker: the model name lookup turned any non-5xx failure, including that 401, into "The model did not answer." The cause was hidden.
3. Rewrote the model client. A 401 or 403 now reads "The model rejected the token." A 5xx reads "The model is starting." Any other status is stated. A failed model list falls back to the endpoint's own name, `0000th`, instead of stopping the call.
4. The request falls back through four shapes (schema with reasoning off, JSON object with reasoning off, JSON object, plain) when the endpoint answers 400 or 422. The reader takes the JSON object out of the text past a reasoning block.
5. The deploy now builds the proxy token from `MODAL_TOKEN`, or from `MODAL_TOKEN_ID` and `MODAL_TOKEN_SECRET`, and fails with a plain error when it is not in the `wk-<id>.ws-<secret>` shape, so a wrong token stops the deploy instead of passing silently.
6. Health reports `rejected`, `starting` or `ready` with the endpoint's status.
7. Front page: removed the paragraph and put the tour under a disclosure, as the closed menu cleanup pull request did. Left out that pull request's price breakdown under the options and its border on the selected row, which the fidelity rules forbid.
8. Three tests for the model client: a rejected token, a failed list, a reasoning-wrapped reply. 47 tests pass.

**What it produced or changed:** the commit on `claude/tender-mccarthy-w59ret`.
**Where actual behavior differed from the instruction:** none known.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the owner made:** the endpoint, the token, the front page direction.
**Decisions the agent made alone, for owner review:**
- **Reasoning off by default** through `chat_template_kwargs`. The model is Qwen3.5, which reasons before answering, and a short token budget would run out before the JSON. If the endpoint refuses the field, the request drops it.
- **The fallback name `0000th`** comes from the model name on the Modal endpoint page.
- **Error wording** states the cause in plain words and gives no instruction.
- **The deploy fails on a wrong token shape.** The site deploy still completes first.

**Points where it should have escalated and didn't:** the front page and tour copy went out in the first guidelines build without the owner's read. The closed menu cleanup pull request was never read until now.

## 4. Deviation: the gaps
- The call to the live model was not made from this session. The site sits behind Access and the Modal token is the owner's.
- The model's reply shape is untested here: whether it honors the schema, whether reasoning appears in the content.
- No machine trace was available to reconcile this record against.

## 5. Consequence: what it cost or risked
**Observed:** type checks, build, 47 tests, prosekeep and the copy checker pass. The probe shows the endpoint's token format.
**Risk:** until the token is in the right shape the deploy fails at the connection step. The previous token stays in the Worker.
**Downstream affected parties:** the owner, on the live desk.
**Expected failure if this run happened 100 times:** some runs would meet a model that wraps JSON in prose the reader cannot cut out.

## 6. Change: what happens next
1. The owner sets the token in the shape the endpoint wants and reruns the deploy.
2. Read the first live answers against `EDITORIAL.md` and tighten the model's instructions.
**Keep doing:** state the real cause in an error.
**Should not be delegated to an agent at all:** reading the live answers for voice.
**Signal that the change worked:** the ask button returns an answer.
