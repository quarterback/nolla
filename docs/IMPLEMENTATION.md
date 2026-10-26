# Implementing the new design

Step by step instructions for applying `docs/GUIDELINES.md` to the web app in `src/web/`. Work through the sections in order. Run `npm run check` and `npm run check:docs` before opening the pull request, and write a closedtab record when done.

## 1. Retheme the tokens

All color lives in `:root` in `src/web/styles.css`. Replace the cobalt set with the verified palette:

```css
:root {
  --ground: #d8ff00;
  --ink: #1c0a73;
  --pale: #fdffe8;
  --dim: #4a3f8f;        /* compute and record the ratio before use */
  --rule: rgba(28, 10, 115, 0.45);
  --hair: rgba(28, 10, 115, 0.22);
}
```

Drop `--deco` and `--black`. `--dim` above is a suggestion; whatever value ships, compute its ratio against `--ground` with the script in GUIDELINES.md and record it in a comment next to the token. Secondary text must still clear 7:1 on the ground.

Inverse surfaces flip the pair: ink fill, ground or pale text. The `.sheet` band becomes `background: var(--pale); color: var(--ink)` (15.40). The `.band` becomes `background: var(--ink); color: var(--ground)` (13.60).

Dark mode uses the loud teal scheme. Add a `prefers-color-scheme: dark` block that redefines the same tokens and nothing else:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --ground: #012f2f;
    --ink: #ffcdb4;      /* 10.11 on teal */
    --pale: #5bffc8;     /* 11.44 on teal; inverse fills use teal text on mint */
    --rule: rgba(255, 205, 180, 0.45);
    --hair: rgba(255, 205, 180, 0.22);
  }
}
```

In dark mode the primary button is mint fill with teal text, and the pale sheet becomes the mint sheet. Whatever `--dim` value ships in dark, compute and record its ratio against teal the same way.

## 2. Swap the type

Replace the Archivo, Source Serif 4 and IBM Plex Mono stack:

```css
--sans: 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif;
--display: Unbounded, var(--sans);
--mono: 'Space Mono', ui-monospace, Menlo, monospace;
```

Unbounded takes the display jobs: `.headline`, `.giant`, the wordmark in `.name`, and primary button labels. Space Grotesk takes body and controls, so `body` moves off the serif onto `--sans` and `--serif` goes away. Space Mono takes every number, price, formula and source line; keep `.num` and `tabular-nums` wherever a figure updates live.

Unbounded has no `font-stretch` axis. Remove every `font-stretch` declaration (`.headline`, `.display`, `.giant`, `.code`, `.slip-desk`, `.stamp`) and let the sizes in the GUIDELINES scale carry the hierarchy instead.

Load the faces the way the repo already loads fonts. If the build swaps in Fontshare equivalents, keep that step and match weights 400, 500, 700 and 900.

## 3. Remove the invented apparatus

The desk shows real machinery only. Delete these, in components and in CSS:

- The giant classification code. In `src/web/Classification.tsx`, the `.code` element with its `data-copy` shadow goes. The sort path (`.path`) stays, because the model really sorts the call; render the path as the classification on its own. In `MachineLine`, drop `s.code` from the line and keep the call number and path.
- Every stamp. `.stamp`, `.sheet-stamp`, `.grid-stamp` and the elements that render them (ROUTED, PAID and the rest) go. A routed call shows the referral paragraph; a paid call shows the receipt. The words on the screen already say what happened.
- Every rotation. Remove each `transform: rotate(...)`. Content sits flat.
- Any caveat line. Grep for "simulated" and "game currency" in `src/web/` and delete those strings. The receipt ends at the balance row.

If `s.code` comes from `src/shared/desk.ts` or the worker prompts, leave the field in place for now and stop rendering it; removing it from the schema is a separate change.

## 4. Carry the unit

Every token figure renders with the unit: `520 tkn`, `4,480 tkn`. Audit `CallForm.tsx`, `AnswerPage.tsx`, `Refunds.tsx` and `Register.tsx` for bare numbers in price, balance, meter and receipt positions, and append the unit through one shared helper (a `tkn(n)` formatter in `store.ts` or similar) so no screen drifts. The option rows in `.optionlist` show the live price with the unit, and the primary ask button carries it in the label: `Ask · 520 tkn`.

## 5. Match the components to the flow boards

The chartreuse flow row on the canvas (ask, generate, pay) is the reference rendering. Bring each screen to it:

- **Ask** (`CallForm.tsx`): question large in Unbounded, option rows with name left and live price right, selected row at weight 700 with `aria-pressed="true"`, primary button as ink fill with ground text.
- **Generating** (`AnswerPage.tsx` streaming state): three parts stream with a block cursor (`aria-hidden="true"`), a bottom meter row with status left (`writing · 112 words`) and running spend right, balance ticking down in the top strip. When done the status reads `charged`.
- **Answered**: short answer at 21px weight 700, body at 17px, referral as a plain paragraph, question back as three equal buttons at 48px, receipt grid with 1px inner rules and a 3px rule on the total rows.
- **Refunds** (`Refunds.tsx`): same grid language; a denied line is struck, a decision receipt uses the pale sheet.

## 6. Verify

- Run the contrast script from GUIDELINES.md on every pairing the diff introduces and record each ratio in the pull request description.
- Keyboard through every screen; `:focus-visible` outlines must be 3px and visible on both ground and ink surfaces.
- Run `npm run check`, `npm run check:docs`, and `node scripts/check-copy.mjs` if present.
- Write the closedtab record with the ratios and any deviation from GUIDELINES.md.
