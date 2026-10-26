# The model on Modal

One Python file, `serve.py`, runs vLLM with an open-weights instruct model and exposes the OpenAI-compatible chat API. The Cloudflare Worker is the only caller.

## Set up once

1. Install Modal and sign in: `pip install modal && modal setup`.
2. Make the token the Worker will use. Any long random string works:
   `modal secret create 0000th-model PROXY_TOKEN=<value>`.
3. Pull the weights into the volume: `modal run modal/serve.py`. This takes a few minutes the first time.
4. Deploy: `modal deploy modal/serve.py`. The output shows the endpoint, something like `https://you--0000th-model-serve.modal.run`.
5. Give the Worker both values:
   `wrangler secret put MODAL_BASE_URL` and `wrangler secret put MODAL_TOKEN`.

## Check it

```
curl -s $URL/v1/models -H "authorization: Bearer $TOKEN"
curl -s $URL/v1/models
```

The first returns the model list. The second returns 401.

## Cost and cold starts

- Idle: the endpoint scales to zero after 10 minutes and bills nothing.
- Cold start: one to two minutes while the container starts and vLLM loads the weights. The app shows "Model starting" until the health check passes.
- Screenshot days: set `MIN_CONTAINERS = 1` in `serve.py` and redeploy. One L4 costs about $1 an hour while warm. Set it back to 0 when done.

## Changing the model

`MODEL_NAME` in `serve.py` and `MODEL_NAME` in `wrangler.toml` must match. Qwen2.5-7B-Instruct is the default because it follows a JSON schema well and its license is Apache-2.0. For better reasoning about limits and alternatives, Qwen2.5-32B-Instruct-AWQ on an A100 works with the same file, with `GPU = "A100-80GB"`.
