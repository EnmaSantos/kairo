"""Download Kairo's free local model weights to the app data directory."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import platform

from huggingface_hub import snapshot_download


MODELS = {
    "transcription": (
        "distil-whisper/distil-large-v3.5",
        "distil-whisper-large-v3.5",
    ),
    "text-emotion": (
        "cirimus/modernbert-base-go-emotions",
        "modernbert-go-emotions",
    ),
    "voice-emotion": (
        "UMUTeam/w2v-bert-emotion-en",
        "w2v-bert-emotion-en",
    ),
    "embeddings": (
        "Qwen/Qwen3-Embedding-0.6B",
        "qwen3-embedding-0.6b",
    ),
    "generation": (
        "mlx-community/gemma-4-e2b-it-4bit",
        "gemma-4-e2b-it-4bit",
    ),
}


def default_models_dir() -> Path:
    configured = os.getenv("KAIRO_MODELS_DIR")
    if configured:
        return Path(configured).expanduser().resolve()
    if platform.system() == "Darwin":
        return Path.home() / "Library" / "Application Support" / "Kairo" / "models"
    return Path.home() / ".cache" / "kairo" / "models"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download the free model weights used by Kairo Local."
    )
    parser.add_argument(
        "models",
        nargs="*",
        choices=MODELS,
        default=list(MODELS),
        help="Optional model groups to download; the default is all five.",
    )
    parser.add_argument(
        "--models-dir",
        type=Path,
        default=default_models_dir(),
        help="Destination directory (defaults to KAIRO_MODELS_DIR or app data).",
    )
    args = parser.parse_args()

    models_dir = args.models_dir.expanduser().resolve()
    models_dir.mkdir(parents=True, exist_ok=True)

    for model_name in args.models:
        repository, directory_name = MODELS[model_name]
        destination = models_dir / directory_name
        print(f"Downloading {model_name}: {repository}")
        snapshot_download(
            repo_id=repository,
            local_dir=destination,
        )
        print(f"Ready: {destination}")

    print(f"All requested models are ready in {models_dir}")


if __name__ == "__main__":
    main()
