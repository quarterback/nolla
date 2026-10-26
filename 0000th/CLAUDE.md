<!-- plain-language-default:start -->
## Write in plain language

Before every user-facing response, follow `.claude/skills/plain-language-default/SKILL.md` as the default writing standard. Answer directly; use familiar words, active voice, and clear paragraphs. Do not repeat the user's input or add filler, invented jargon, or ornamental formatting. Preserve technical accuracy, sources, and user-requested formats. Quietly apply the checks in the skill before sending.
<!-- plain-language-default:end -->

## What this is

A story prop and a test bed. Start with `docs/SPEC.md`. The interface shows agent-authority patterns from Vloora's agent interaction patterns guide. Every service is simulated and the interface says so. Do not add copy that implies a real integration, customer, or confirmed outcome.

## Records and checks

At the end of each meaningful agent run, write a ClosedTab Agent Action Record in `docs/aar-<slug>.md` using `.claude/skills/closedtab/SKILL.md`. Before opening a pull request, run `npm run check` and `npm run check:docs`. `check:docs` runs prosekeep with the settings in `.editorial.json` and `closedtab check` on every record. Follow `.claude/skills/prosekeep/SKILL.md` when editing docs.
