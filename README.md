# nolla

A reference desk with a price list, behind 0000th.ai for a few invited people. Each call is sorted, priced before anything runs, and sent to the people who handle it. Some calls get an answer at the desk. When the desk gets something wrong, a counter refunds small amounts on the spot and a separate manager desk reviews larger ones.

Three parts:

- `src/web`: the interface. The call form and quotes, the tabloid answer page, the counter, the manager, and the register.
- `src/worker`: a Cloudflare Worker (Hono) that serves the interface, checks the Cloudflare Access login, and asks the model to sort, answer and check. Prices and refunds are arithmetic in `src/shared/desk.ts`, with tests.
- `modal/`: the model, an open-weights instruct model served by vLLM on Modal. See `modal/README.md`.

## Run it locally

```
npm install --legacy-peer-deps
cp .dev.vars.example .dev.vars
npm run dev
```

Open http://localhost:8787. With `DEV_MODE=1` and no model set, four calls answer from a script, so the whole desk works without a GPU. Put `MODAL_BASE_URL` and `MODAL_TOKEN` in `.dev.vars` to use the real model.

## Deploy

A push to `main` deploys through GitHub Actions (`.github/workflows/deploy.yml`). Add two repository secrets once: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Add `MODAL_TOKEN` as a repository secret too and the next deploy connects the model; the endpoint URL is in `wrangler.toml`. Until then the desk answers from the script. Deploying by hand works too:

1. Deploy the model on Modal and put its endpoint URL in `wrangler.toml`.
2. In Cloudflare Zero Trust, add an Access application for `0000th.ai` with an email allowlist. Copy the team domain and the application audience tag into `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` in `wrangler.toml`.
3. `wrangler secret put MODAL_BASE_URL` and `wrangler secret put MODAL_TOKEN`.
4. `npm run deploy`. With `SCRIPTED = "1"` in `wrangler.toml` the desk answers from the script until the model is up; set it to `"0"` once the Modal secrets are in.

The Worker verifies the Access token on every `/api` request, and `workers.dev` is off. `nollanolla.com` and `www.nollanolla.com` are routes on the same Worker and redirect to `0000th.ai`, the apex domain.

## Checks

`npm run check` runs the type checks, the build and the tests. `npm run check:docs` runs prosekeep and `closedtab check`.

## Content review

The [conversation guide](docs/conversation-design.md) defines proposed response rules and a review procedure alongside the current UI guidelines. The [20 example cases](docs/conversation-examples.md) pair captured scripted responses with findings and proposed wording for Ron's review. Run `node scripts/review-content.mjs content-baseline/scripted-observation.json` for the mechanical response checks. Semantic review and owner approval are recorded separately.
