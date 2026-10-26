<!-- plain-language-default:start -->
## Write in plain language

Before every user-facing response, follow `.claude/skills/plain-language-default/SKILL.md` as the default writing standard. Answer directly; use familiar words, active voice, and clear paragraphs. Do not repeat the user's input or add filler, invented jargon, or ornamental formatting. Preserve technical accuracy, sources, and user-requested formats. Quietly apply the checks in the skill before sending.
<!-- plain-language-default:end -->

## What this is

nolla is a reference desk with a price list, built as a story prop and a test bed. Start with `docs/SPEC.md`. The desk sorts each call, posts its price as a formula before any work runs, routes to the people and places that handle the call, answers the calls that belong at the desk, and refunds line by line at a counter or through a manager. Tokens are a game currency. It is a demo and reads as one; add no placeholder tags, caveats or hedges to the interface or the docs.

The desk's rules are the `0000th` skill and `EDITORIAL.md`, both the owner's. The look follows `docs/GUIDELINES.md` and the chartreuse flow row (ask, generate, pay) on the owner's "0000th interface" design canvas.

## Content work

Read `docs/conversation-design.md` and `docs/conversation-examples.md` before changing response prompts, scripted answers, or answer presentation. The baseline contains proposed examples with pending owner approval. Preserve their status until Ron records a decision. Keep the visual requirements in `docs/GUIDELINES.md`; review answer content independently with Prosekeep and the baseline cases. The guide and agent skills are not loaded automatically by the runtime model.

## Records and checks

At the end of each meaningful agent run, write a ClosedTab Agent Action Record in `docs/aar-<slug>.md` using `.claude/skills/closedtab/SKILL.md`. Before opening a pull request, run `npm run check` and `npm run check:docs`. `check:docs` runs prosekeep with the settings in `.editorial.json` and `closedtab check` on every record. Follow `.claude/skills/prosekeep/SKILL.md` when editing docs.
