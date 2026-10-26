"""The model behind 0000th.ai: an open-weights instruct model served by vLLM
on Modal through the OpenAI-compatible chat API.

Deploy:   modal deploy modal/serve.py
Secret:   modal secret create nolla-model PROXY_TOKEN=<long random string>
          Give the Worker the same value: wrangler secret put MODAL_TOKEN
Warm up:  modal run modal/serve.py   (pulls the weights into the volume)

The endpoint scales to zero when idle. On screenshot days set
MIN_CONTAINERS=1 below and redeploy, then set it back to 0.
"""

import subprocess

import modal

MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct"  # Apache-2.0; must match MODEL_NAME in wrangler.toml
MODEL_REVISION = "main"
GPU = "L4"  # 24 GB is enough for a 7B model in bf16
MIN_CONTAINERS = 0  # 1 keeps one GPU warm, about $1 per hour on L4
SCALEDOWN_SECONDS = 600
PORT = 8000

app = modal.App("nolla-model")

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install("vllm==0.11.0", "huggingface_hub[hf_transfer]==0.35.3")
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1", "VLLM_USE_V1": "1"})
)

weights = modal.Volume.from_name("nolla-weights", create_if_missing=True)
vllm_cache = modal.Volume.from_name("nolla-vllm-cache", create_if_missing=True)
WEIGHTS = "/weights"
CACHE = "/root/.cache/vllm"


@app.function(
    image=image,
    gpu=GPU,
    min_containers=MIN_CONTAINERS,
    scaledown_window=SCALEDOWN_SECONDS,
    timeout=10 * 60,
    secrets=[modal.Secret.from_name("nolla-model")],
    volumes={WEIGHTS: weights, CACHE: vllm_cache},
)
@modal.concurrent(max_inputs=16)
@modal.web_server(port=PORT, startup_timeout=10 * 60)
def serve():
    """Starts vLLM's OpenAI-compatible server. vLLM checks the bearer token
    itself (--api-key), so every route needs it, including /v1/models, which
    the Worker's health check uses."""
    import os

    cmd = [
        "vllm", "serve", MODEL_NAME,
        "--revision", MODEL_REVISION,
        "--download-dir", WEIGHTS,
        "--host", "0.0.0.0",
        "--port", str(PORT),
        "--api-key", os.environ["PROXY_TOKEN"],
        "--served-model-name", MODEL_NAME,
        "--max-model-len", "8192",
        "--guided-decoding-backend", "xgrammar",
        "--enable-prefix-caching",
    ]
    subprocess.Popen(" ".join(cmd), shell=True)


@app.local_entrypoint()
def main():
    """Pulls the weights into the volume so the first real request is faster."""
    download.remote()


@app.function(image=image, volumes={WEIGHTS: weights}, timeout=60 * 60)
def download():
    from huggingface_hub import snapshot_download

    snapshot_download(MODEL_NAME, revision=MODEL_REVISION, cache_dir=WEIGHTS)
    weights.commit()
