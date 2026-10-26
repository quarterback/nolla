# nolla UI guidelines

Prescriptive rules for any agent building nolla screens. Follow these exactly. Where a rule says MUST, deviation requires Ron's sign off and a note in the AAR.

The product is a Q&A desk. Every screen shows real machinery: the user's question, the live price, the streaming answer, the receipt. Nothing invented gets drawn. No classification codes, no stamps, no tilted slips, no telegraph props, no fake apparatus of any kind. If the model does it for real, show it. If it does not, leave it out.

## 1. Style

### Color

The palette is loud and verified. Every pairing below was computed with the WCAG 2.x relative luminance formula. The ratio is listed so you can see the margin.

| Role | Hex | On | Ratio | Level |
|---|---|---|---|---|
| Ground | `#d8ff00` chartreuse | n/a | n/a | n/a |
| Ink | `#1c0a73` indigo | chartreuse | 13.60 | AAA |
| Ink on pale | `#1c0a73` | `#fdffe8` | 15.40 | AAA |
| Inverse text | `#d8ff00` | indigo fill | 13.60 | AAA |
| Key tray | `#b5d400` | holds `#fdffe8` keys with indigo text | 15.40 | AAA |

**Dark mode.** The loud teal scheme is the dark mode. Ground `#012f2f` teal, ink `#ffcdb4` peach (10.11 AAA), accent and inverse fills `#5bffc8` mint on teal (11.44 AAA). The same layout, type and components apply; only the tokens swap. Respect `prefers-color-scheme: dark` and keep both schemes in the token layer so no component names a hex directly.

Verified alternates, approved for secondary boards and print pieces:

| Pair | Ratio | Level |
|---|---|---|
| `#012f2f` teal on `#ffcdb4` peach | 10.11 | AAA |
| `#5bffc8` mint on `#012f2f` teal | 11.44 | AAA |
| `#f4ff47` lemon on `#5b00e0` ultraviolet | 7.63 | AAA |
| `#cfb6ff` lilac on `#2a0a44` | 9.62 | AAA |
| `#ff8ad8` hot pink on `#1c0014` | 9.32 | AAA |
| White on `#1f2bff` cobalt | 7.37 | AAA |

Banned: vermilion `#ff3c00` as a ground (5.61 against near black, 3.56 against white, which fails for body use), any orange background, pure black `#000000`, pure white `#ffffff` as a ground.

**The compute rule.** Before any new color pairing appears in a file, compute its contrast ratio and record it. Never eyeball it, never trust a name, never ship first and check later. The target is 7:1 (AAA) for body text and 4.5:1 for large display type, with 7:1 preferred everywhere. Run this:

```python
def lum(hexc):
    h = hexc.lstrip('#')
    r, g, b = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)
```

Record the ratio in a comment or in the AAR next to the pairing. A pairing with no recorded ratio is a defect.

Color never carries meaning alone. Selected states also change weight, border, or fill. Errors also get words.

### Typography

Three faces, three jobs:

- **Unbounded** (900, 700): the user's question, primary buttons, the wordmark. The question is the biggest thing on every screen.
- **Space Grotesk** (400, 500, 700): answers, body, menu options, secondary buttons.
- **Space Mono** (400, 700): every number, every price, the balance, the receipt, source lines. Always with `font-variant-numeric: tabular-nums` where figures update live.

Scale on a 390px phone frame:

| Element | Face | Size | Weight |
|---|---|---|---|
| Question (answered screen) | Unbounded | 26–27px | 900 |
| Question (compact, during generation) | Unbounded | 21px | 900 |
| Short answer | Space Grotesk | 21px | 700 |
| Body answer | Space Grotesk | 17px | 400 |
| Menu option | Space Grotesk | 17px | 500/700 |
| Prices, balance | Space Mono | 13–18px | 400/700 |
| Wordmark | Unbounded | 16px | 900 |

Line height: 1.12 for Unbounded display, 1.3 for the short answer, 1.5 for body. Big type is the aesthetic; readability is the constraint. Never drop body below 16px.

## 2. Layout

- Frame: 390px wide. Content gutter: 18px.
- Reading order, top to bottom: balance strip, question, price line, answer, question back, sources, receipt, actions. The question stays above the fold at every step.
- Rules are 3px solid ink for major breaks (receipt top, question-back top), 1px for rows inside a receipt.
- Corners are square. `border-radius: 0` everywhere.
- No cards, no shadows, no rotation, no decorative tilt. Content sits flat on the ground color.

## 3. Components

### Balance strip
Wordmark left, balance right. Balance is Space Mono and always carries the unit: `4,480 tkn`. A bare number reads as a character count. Every token figure in the product carries ` tkn`.

### Price menu (ask screen)
Options are named by what they do, never by a model name: Route only, Quick answer, Answer with sources, Look into it. Each row shows name left, live price right (`520 tkn`). Prices recompute as the question grows, from the schedule in `src/shared/desk.ts` (sort 40, slip 60, source 120, 1 tkn per word, check 80, +10% per earlier turn). The selected row is weight 700 with `aria-pressed="true"`.

### Primary button
Indigo fill, chartreuse text, Unbounded 700, min height 54px, full width on the ask screen. The label carries the price: `Ask · 520 tkn`.

### Streaming answer (generation screen)
Three parts stream in order: short answer, what is known, where to go. A block cursor (solid ink rectangle, `aria-hidden="true"`) sits at the write point. A meter row pins to the bottom: status left (`writing · 112 words`), running spend right (`452 tkn`), both tabular. The balance ticks down in the strip as the meter rises. When done, status reads `charged` and the meter settles on the final figure.

### Receipt
A two column grid: line item left, amount right, every amount in ` tkn`. Final rows (Charged, Balance) get the 3px rule and weight 700. The receipt states what happened. No caveat line follows it: no "simulated", no "game currency", nothing. The price sits on the screen the way a sandwich price sits on a menu.

### Referral
A plain paragraph inside the answer. Name the kind of source (a librarian, a tenants hotline, a pharmacist) and what to ask and bring. Never invent a named person or presume the user's neighbors. "If you know someone who has disputed a deposit, ask them" is the pattern.

### Question back
One verifiable question with Yes / No / Not sure buttons, 48px min height, equal width. The selected button inverts (ink fill, ground text). The answer that follows depends on the choice.

### Refund entry
A text link, `Something was wrong`, next to `New call`. It opens the counter (≤300 tkn per call, ≤1,000 per week, line item by reason) and the manager desk above that, per the 0000th skill.

## 4. Accessibility

- Every pairing meets the recorded ratio; 7:1 is the working floor for body text.
- Focus visible on every interactive element: `outline: 3px solid` in ink (or ground on ink fills), `outline-offset: 2px`.
- Touch targets 48px minimum.
- Toggle state via `aria-pressed`, decorative cursors and ornaments via `aria-hidden="true"`.
- Live figures use `tabular-nums` so the layout holds while they tick.
- Semantic order matches visual order; the question is the first heading level content after the strip.

## 5. Interaction and states

- **Ask**: prices update per keystroke. The ask key on the drawn keyboard is the inverse key.
- **Generating**: text streams, meter counts up, balance counts down, cursor moves part to part. Streaming speed reads as writing, around 5 characters per 60ms.
- **Charged**: meter freezes, status changes to `charged`, receipt appears.
- **Wrong**: refund counter, then manager desk over the threshold, then decision receipt (approved, partly, denied) with a 7 day appeal to a person.
- Nothing animates for decoration. Motion exists only where the machine is doing something: typing, generating, tallying.

## Copy

For answer content and its review cases, use [the conversation guide](conversation-design.md). Its proposed wording awaits Ron's approval. These UI guidelines continue to govern layout, components, and states.

Ron owns the prose. Everything written on a screen is placeholder until he approves it. Run every string through prosekeep (vloora profile) and `scripts/check-copy.mjs`, which also scans the .ts/.tsx interface strings prosekeep skips. Banned frames are listed in EDITORIAL.md; the caveat sentence is banned outright.

## Process

After each build segment, write an AAR with closedtab (`closedtab new`, then `closedtab reconcile` at the end). Record every computed contrast ratio and every deviation from this document in the AAR. The chat transcript is a decision record, never a copy source.
