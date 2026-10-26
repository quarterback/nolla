# 0000th

An invite-only agent behind 0000th.ai. It shows a person keeping authority while an agent acts for them. The agent proposes, the person grants, narrows, declines or withdraws, and a ledger records who said what. Every receiving service is simulated.

Three parts:

- `src/web`: the interface. A thread on the left, proposal cards inline, and an authority ledger on the right.
- `src/worker`: a Cloudflare Worker (Hono) that serves the interface, checks the Cloudflare Access login, runs the permission check, and proxies the model.
- `modal/`: the model, an open-weights instruct model served by vLLM on Modal. See `modal/README.md`.

## Run it locally

```
npm install --legacy-peer-deps
cp .dev.vars.example .dev.vars
npm run dev
```

Open http://localhost:8787. With `DEV_MODE=1` and no model set, the agent answers from the scenario's script, so the whole interface works without a GPU. Put `MODAL_BASE_URL` and `MODAL_TOKEN` in `.dev.vars` to use the real model.

## Deploy

1. Deploy the model: `modal/README.md`.
2. In Cloudflare Zero Trust, add an Access application for `0000th.ai` with an email allowlist. Copy the team domain and the application audience tag into `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` in `wrangler.toml`.
3. `wrangler secret put MODAL_BASE_URL` and `wrangler secret put MODAL_TOKEN`.
4. `npm run deploy`.

The Worker verifies the Access token on every `/api` request, and `workers.dev` is off, so the model is only reachable through the login.

## Checks

`npm run check` runs the type checks, the build and the tests. `npm run check:docs` runs prosekeep and `closedtab check`.
