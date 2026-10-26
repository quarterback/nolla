# Conversation content baseline

Status: proposed for Ron Bronson's review. The examples in `content-baseline/cases.json` are agent drafts. Approval fields remain empty until Ron records a decision. These files govern a proposed content workflow; the application does not load them yet.

## What a response must accomplish

Help the person answer the question or reach someone who can act on it. Put the useful fact or action first. End when the person has what they need for that step.

The latest owner instruction and `EDITORIAL.md` govern wording. `docs/SPEC.md` and the pricing code establish product behavior. The repository refers to a separate `0000th` skill that was unavailable during this review. Reconcile this baseline with that skill before adopting it as policy.

Keep prices, refund limits, allowances, and decisions in application code. Use approved fixed copy for those rules. A model may explain a recorded decision using the recorded facts; it must preserve the decision and amounts.

This guide accompanies [the current UI guidelines](GUIDELINES.md) and [implementation instructions](IMPLEMENTATION.md), including the ask, generate, and pay flow. It adds content review to that design. The front page and tour remain subject to the owner's copy review. Tour text comes from the scripted fixtures, so fixture edits also need review in the tour states.

## Response jobs

| Job | What the response supplies | When to stop |
| --- | --- | --- |
| Direct answer | The answer, then the steps or explanation needed to use it | The question is answered |
| Route | The kind of desk, what to ask, and verified preparation details | The person can make contact |
| Answer and route | A supported general answer and the part a real desk must resolve | The boundary and next step are clear |
| Missing information | One question whose answer changes the action | The person can supply that fact |
| Uncertainty | The specific missing evidence and how to obtain it | The person understands what remains unresolved |
| Correction | The incorrect statement and its supported replacement | The correction is complete |
| Complaint review | What was checked and the specific mismatch, if any | The result and its evidence are stated |

Choose the response job before writing. The current sort API supports `desk`, `route`, and `both`. Asking a clarification before pricing would require a separate application change. The examples record that desired behavior without claiming it exists.

## Rules for each answer field

| Field | Content rule |
| --- | --- |
| `short` | Give the answer or first useful action. Name a decisive uncertainty directly. |
| `known` | Add distinct facts or steps needed for this call. Remove material already stated in `short`. |
| `changes_if` | Include a condition when it changes the answer or action. Use an empty list when none applies. |
| `desks` | Explain what the desk handles and what to ask. Verify names, URLs, costs, hours, and eligibility before asserting them. |
| `ask_someone` | Include a personal contact question when that person's experience would help the call. Otherwise leave it empty. |
| `question_back` | Ask one question when the answer changes the next action. Choices must lead to distinct, supportable steps. Otherwise use `null`. |
| `sources` | List evidence actually supplied or retrieved and inspected. A remembered URL establishes no claim verification. |
| Manager `note` | Name the specific checked mismatch. State an evidence gap when the material cannot support a finding. |

Treat a purchased word allowance as a ceiling for useful content in a future prompt revision. Preserve the existing pricing and billing rules. The current prompt's approximate word target remains unchanged by this document.

## Voice in practice

Use familiar words and concrete actions. Speak as the desk. Give steps in order when order matters. Keep a necessary qualification beside the claim it qualifies.

Avoid praise, emotional reassurance, staged introductions, invented terms, formulaic contrasts, habitual groups of three, and closing offers. Follow the house rules on dashes, sentence case, and numerals. A complete one sentence answer is acceptable.

Review the whole response for repeated structure. Individually plain sentences can still become repetitive when every answer includes the same sections, follow-up question, and closing instruction. Empty optional fields are useful editorial choices.

The proposed examples demonstrate specific decisions about length, scope, and evidence. Their wording is available for revision. They are not approved public copy or verified advice.

## Establish the baseline

`content-baseline/cases.json` contains 20 cases: 18 answer cases and 2 manager cases. Each records the reader's task, evidence available, proposed response, required behavior, failure conditions, and an empty owner approval record. The proposed response is a prose reference for review, rather than an exact JSON response to copy.

Read [the examples and findings](conversation-examples.md) to review the cases without reading JSON. The JSON files retain the complete capture and the six semantic judgments for each case. When revising a case, update its JSON record and the matching example together.

`content-baseline/scripted-observation.json` records actual responses from the local scripted application. Each entry includes the request and complete response. This is evidence of the development fixture's behavior. Live model behavior remains unmeasured. The scripted examples expose keyword matching and fallback responses; they provide no evidence that a live model would produce the same errors.

For each case, Ron can approve, revise, or reject the proposed response and criteria. Record the decision, reviewer, and date in `approval`. Keep the original captured output so later edits remain comparable. An approved response establishes a reviewed example, with its evidence assumptions; it does not make claims valid in every context.

## Run a content review

From the repository root:

```sh
node scripts/review-content.mjs content-baseline/scripted-observation.json
npx --no-install prosekeep review .copy/content-review.md
npm run check:docs
```

The review command extracts reader-facing fields, runs Prosekeep, and reports missing cases, malformed responses, and invalid citation references. It exits unsuccessfully on those failures or Prosekeep findings. A successful exit leaves semantic and owner review pending.

To capture a new local run with the server already running:

```sh
node scripts/review-content.mjs --capture http://127.0.0.1:8787 .copy/content-observation.json
node scripts/review-content.mjs .copy/content-observation.json
```

Capture makes 38 application requests across the 20 cases: sort and answer for each answer case, plus 2 manager requests. Run it against a local development server. A configured live model can incur model charges. The command refuses a remote URL, records health, and labels the observed runtime. Give each live capture a distinct filename and keep its model, prompt, and code revisions with the results. Review local captures for sensitive input before sharing them.

Use the same cases and evidence assumptions when comparing model or prompt revisions. For a live comparison, capture each candidate 3 times to expose inconsistent behavior. Keep scripted and live results separate.

Read every case against these questions:

1. Does the first sentence give the answer or the next useful action?
2. Does each paragraph add something the reader needs?
3. Does the response preserve uncertainty and support consequential claims with available evidence?
4. Does a follow-up question change the next step?
5. Does the response follow `EDITORIAL.md` without sounding repetitive across cases?
6. Are the case's required behavior and failure conditions satisfied?

Record pass, fail, or unreviewed for each question, with the field and text that supports the finding. A mechanical pass alone establishes no editorial acceptance. Require every case to receive semantic review; require owner approval before adopting reference wording. Fail a candidate for invented evidence, changed product rules, an incorrect answer, or a consequential unsupported claim regardless of its prose score.

When editing an answer, save the extracted original and revision separately and run:

```sh
npx --no-install prosekeep compare .copy/original.md .copy/revised.md
```

Resolve changes to numbers, URLs, and citations against the actual sources. Complete Prosekeep's semantic review for changes that its mechanical checks cannot assess. ClosedTab records the decisions and validation from each content change; it supplies no content quality score.

## Application changes to make after review

Compile the approved response rules and a few relevant approved examples into the runtime prompt. Agent skills and repository documents are not automatically available to the model serving this application.

Replace instructions to open sources with an evidence path the runtime actually supports. The current completion request provides messages and a JSON schema, with no retrieval tool or source documents. Until retrieval exists, the model must state the evidence gap and avoid claiming a source was checked. The current manager prompt's title-based source assessment also needs revision before it can establish verification.

Keep JSON validation and add editorial evaluation of actual generated fields. A future bounded revision step must preserve claims, uncertainty, source links, and billing behavior. Review its cost and failure handling before introducing extra model calls. This change adds no runtime calls.

The current interface displays streamed answer text before the final JSON validation. Review the streaming and finished responses against the same content rules. A future editorial check applied after completion cannot prevent earlier text from reaching the reader. Decide where any preventive check runs before implementing it, and account for latency, model charges, and the running meter. Preserve the current streaming behavior while the baseline remains under review.

The visual redesign can consume the response jobs and field rules in this document. Layout, components, styling, runtime prompts, and product copy remain unchanged by this baseline.
