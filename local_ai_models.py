"""Lazy, single-model-at-a-time runtime for Kairo Local.

The Mac has enough storage for all of Kairo's models but not enough unified
memory to keep every one resident comfortably. This manager retains derived
embeddings, but unloads model weights before switching capabilities.
"""

from __future__ import annotations

from datetime import datetime, timezone
import gc
import hashlib
import os
from pathlib import Path
import platform
import re
import threading
from typing import Any, Iterable

os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

import librosa
import numpy as np
import torch
import torch.nn as nn
from torch.nn import CrossEntropyLoss
from transformers import (
    AutoFeatureExtractor,
    Wav2Vec2BertForSequenceClassification,
    Wav2Vec2BertModel,
    pipeline,
)
from transformers.modeling_outputs import SequenceClassifierOutput


MODEL_NAMES = {
    "transcription": "distil-whisper-large-v3.5",
    "text_emotion": "modernbert-go-emotions",
    "voice_emotion": "w2v-bert-emotion-en",
    "embeddings": "qwen3-embedding-0.6b",
    "generation": "gemma-4-e2b-it-4bit",
}

MODEL_VERSIONS = {
    "transcription": "distil-whisper/distil-large-v3.5",
    "text_emotion": "cirimus/modernbert-base-go-emotions",
    "voice_emotion": "UMUTeam/w2v-bert-emotion-en",
    "embeddings": "Qwen/Qwen3-Embedding-0.6B",
    "generation": "mlx-community/gemma-4-e2b-it-4bit",
}

COARSE_EMOTION_MAP = {
    "admiration": "joy",
    "amusement": "joy",
    "approval": "joy",
    "caring": "joy",
    "desire": "joy",
    "excitement": "joy",
    "gratitude": "joy",
    "joy": "joy",
    "love": "joy",
    "optimism": "joy",
    "pride": "joy",
    "relief": "joy",
    "disappointment": "sadness",
    "embarrassment": "sadness",
    "grief": "sadness",
    "remorse": "sadness",
    "sadness": "sadness",
    "anger": "anger",
    "annoyance": "anger",
    "disapproval": "anger",
    "fear": "fear",
    "nervousness": "fear",
    "confusion": "surprise",
    "curiosity": "surprise",
    "realization": "surprise",
    "surprise": "surprise",
    "disgust": "disgust",
    "neutral": "neutral",
}

VOICE_ID_TO_LABEL = {
    0: "angry",
    1: "disgust",
    2: "fear",
    3: "happy",
    4: "neutral",
    5: "sad",
    6: "surprise",
}
VOICE_LABEL_TO_ID = {label: index for index, label in VOICE_ID_TO_LABEL.items()}


def default_models_dir() -> Path:
    configured = os.getenv("KAIRO_MODELS_DIR")
    if configured:
        return Path(configured).expanduser().resolve()
    if platform.system() == "Darwin":
        return Path.home() / "Library" / "Application Support" / "Kairo" / "models"
    return Path.home() / ".cache" / "kairo" / "models"


# The following inference-only head mirrors UMUTeam's MIT-licensed
# `wav2vec2_bert_en.py`. Defining it here avoids importing the toolkit's
# training/evaluation modules and keeps voice inference fully offline.
class VoiceClassificationHead(nn.Module):
    def __init__(self, config):
        super().__init__()
        total_dims = 768
        self.dense = nn.Linear(total_dims, total_dims)
        self.dropout = nn.Dropout(config.final_dropout)
        self.out_proj = nn.Linear(total_dims, config.num_labels)
        self.layernorm = nn.LayerNorm(total_dims)

    def forward(self, features, **kwargs):
        del kwargs
        value = self.dropout(features)
        value = self.dense(value)
        value = torch.tanh(value)
        value = self.dropout(value)
        return self.out_proj(value)


class VoiceEmotionModel(Wav2Vec2BertForSequenceClassification):
    def __init__(self, config, num_extra_dims=768):
        del num_extra_dims
        super().__init__(config)
        self.num_labels = config.num_labels
        self.wav2vec2_bert = Wav2Vec2BertModel(config)
        self.classifier = VoiceClassificationHead(config)
        self.projector = nn.Linear(config.hidden_size, config.classifier_proj_size)
        if config.use_weighted_layer_sum:
            layer_count = config.num_hidden_layers + 1
            self.layer_weights = nn.Parameter(
                torch.ones(layer_count) / layer_count
            )
        self.post_init()

    def forward(
        self,
        input_features,
        attention_mask=None,
        output_attentions=None,
        output_hidden_states=None,
        return_dict=None,
        labels=None,
    ):
        return_dict = (
            return_dict if return_dict is not None else self.config.use_return_dict
        )
        output_hidden_states = (
            True if self.config.use_weighted_layer_sum else output_hidden_states
        )
        outputs = self.wav2vec2_bert(
            input_features,
            attention_mask=attention_mask,
            output_attentions=output_attentions,
            output_hidden_states=output_hidden_states,
            return_dict=return_dict,
        )

        if self.config.use_weighted_layer_sum:
            hidden_states = torch.stack(outputs.hidden_states, dim=1)
            weights = nn.functional.softmax(self.layer_weights, dim=-1)
            hidden_states = (
                hidden_states * weights.view(-1, 1, 1)
            ).sum(dim=1)
        else:
            hidden_states = outputs[0]

        hidden_states = self.projector(hidden_states)
        if attention_mask is None:
            pooled_output = hidden_states.mean(dim=1)
        else:
            padding_mask = self._get_feature_vector_attention_mask(
                hidden_states.shape[1], attention_mask
            )
            hidden_states[~padding_mask] = 0.0
            pooled_output = hidden_states.sum(dim=1) / padding_mask.sum(
                dim=1
            ).view(-1, 1)

        logits = self.classifier(pooled_output)
        loss = None
        if labels is not None:
            loss = CrossEntropyLoss()(
                logits.view(-1, self.config.num_labels),
                labels.view(-1),
            )
        return SequenceClassifierOutput(
            loss=loss,
            logits=logits,
            hidden_states=outputs.hidden_states,
            attentions=outputs.attentions,
        )


class LocalModelRuntime:
    def __init__(self, models_dir: Path | None = None):
        self.models_dir = (models_dir or default_models_dir()).resolve()
        self.device = torch.device(
            "mps" if torch.backends.mps.is_available() else "cpu"
        )
        self._lock = threading.RLock()
        self._active_kind: str | None = None
        self._active_model: Any = None
        self._active_processor: Any = None
        self._embedding_cache: dict[str, np.ndarray] = {}

    @property
    def active_kind(self) -> str | None:
        return self._active_kind

    def model_path(self, kind: str) -> Path:
        return self.models_dir / MODEL_NAMES[kind]

    def capabilities(self) -> dict[str, Any]:
        models = {
            kind: {
                "available": self.model_path(kind).is_dir(),
                "path": str(self.model_path(kind)),
                "model": MODEL_VERSIONS[kind],
            }
            for kind in MODEL_NAMES
        }
        return {
            "runtime": "local",
            "device": str(self.device),
            "models_dir": str(self.models_dir),
            "models": models,
            "ready": all(item["available"] for item in models.values()),
            "active_model": self._active_kind,
        }

    def _require_path(self, kind: str) -> Path:
        path = self.model_path(kind)
        if not path.is_dir():
            raise RuntimeError(
                f"Missing {kind} model at {path}. Download the local model first."
            )
        return path

    def _release_locked(self) -> None:
        self._active_model = None
        self._active_processor = None
        self._active_kind = None
        gc.collect()
        if torch.backends.mps.is_available():
            torch.mps.empty_cache()
        try:
            import mlx.core as mx

            mx.clear_cache()
        except (ImportError, AttributeError):
            pass

    def release(self) -> None:
        with self._lock:
            self._release_locked()

    def _activate(self, kind: str) -> tuple[Any, Any]:
        if self._active_kind == kind:
            return self._active_model, self._active_processor

        self._release_locked()
        path = self._require_path(kind)

        if kind == "transcription":
            model = pipeline(
                "automatic-speech-recognition",
                model=str(path),
                device=str(self.device),
                dtype=torch.float16 if self.device.type == "mps" else torch.float32,
            )
            processor = None
        elif kind == "text_emotion":
            model = pipeline(
                "text-classification",
                model=str(path),
                device=str(self.device),
                top_k=5,
            )
            processor = None
        elif kind == "voice_emotion":
            processor = AutoFeatureExtractor.from_pretrained(str(path))
            model = VoiceEmotionModel.from_pretrained(
                str(path),
                num_labels=len(VOICE_ID_TO_LABEL),
                num_extra_dims=768,
                label2id=VOICE_LABEL_TO_ID,
                id2label=VOICE_ID_TO_LABEL,
            ).to(self.device)
            model.eval()
        elif kind == "embeddings":
            from sentence_transformers import SentenceTransformer

            model = SentenceTransformer(str(path), device=str(self.device))
            processor = None
        elif kind == "generation":
            from mlx_lm import load

            model, processor = load(str(path))
        else:
            raise ValueError(f"Unknown model kind: {kind}")

        self._active_kind = kind
        self._active_model = model
        self._active_processor = processor
        return model, processor

    def transcribe(self, audio_path: str) -> dict[str, Any]:
        with self._lock:
            transcriber, _ = self._activate("transcription")
            audio, _ = librosa.load(audio_path, sr=16000, mono=True)
            result = transcriber(
                audio,
                return_timestamps=True,
                generate_kwargs={"language": "en", "task": "transcribe"},
            )
            return {
                "text": result["text"].strip(),
                "chunks": result.get("chunks", []),
                "model": MODEL_VERSIONS["transcription"],
            }

    def analyze_text(self, text: str) -> dict[str, Any]:
        with self._lock:
            classifier, _ = self._activate("text_emotion")
            predictions = classifier(text, top_k=5)
            if predictions and isinstance(predictions[0], list):
                predictions = predictions[0]
            scores = {
                prediction["label"]: float(prediction["score"])
                for prediction in predictions
            }
            primary_emotion = predictions[0]["label"]
            return {
                "primary_emotion": primary_emotion,
                "sentiment": COARSE_EMOTION_MAP.get(primary_emotion, "neutral"),
                "scores": scores,
                "model": MODEL_VERSIONS["text_emotion"],
            }

    def analyze_voice(self, audio_path: str) -> dict[str, Any]:
        with self._lock:
            model, feature_extractor = self._activate("voice_emotion")
            audio, _ = librosa.load(audio_path, sr=16000, mono=True)
            inputs = feature_extractor(
                audio,
                sampling_rate=16000,
                max_length=16000,
                truncation=True,
                return_tensors="pt",
            )
            input_features = inputs["input_features"].to(self.device)
            attention_mask = inputs.get("attention_mask")
            if attention_mask is not None:
                attention_mask = attention_mask.to(self.device)

            with torch.no_grad():
                logits = model(
                    input_features,
                    attention_mask=attention_mask,
                ).logits
                probabilities = torch.softmax(logits, dim=-1)[0].cpu()

            scores = {
                VOICE_ID_TO_LABEL[index]: float(probabilities[index])
                for index in range(len(probabilities))
            }
            primary = max(scores, key=scores.get)
            return {
                "primary_emotion": primary,
                "scores": scores,
                "model": MODEL_VERSIONS["voice_emotion"],
            }

    def process_voice(self, audio_path: str) -> dict[str, Any]:
        transcription = self.transcribe(audio_path)
        text_emotion = self.analyze_text(transcription["text"])
        voice_emotion = self.analyze_voice(audio_path)
        return {
            "text": transcription["text"],
            "chunks": transcription["chunks"],
            "text_emotion": text_emotion,
            "voice_emotion": voice_emotion,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "models": {
                "transcription": transcription["model"],
                "text_emotion": text_emotion["model"],
                "voice_emotion": voice_emotion["model"],
            },
        }

    @staticmethod
    def _entry_cache_key(entry: dict[str, Any]) -> str:
        digest = hashlib.sha256(entry["text"].encode("utf-8")).hexdigest()
        return f"{entry['id']}:{digest}"

    def _retrieve(
        self,
        question: str,
        entries: list[dict[str, Any]],
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        with self._lock:
            embedding_model, _ = self._activate("embeddings")
            missing = [
                entry
                for entry in entries
                if self._entry_cache_key(entry) not in self._embedding_cache
            ]
            if missing:
                vectors = embedding_model.encode(
                    [entry["text"] for entry in missing],
                    prompt_name="document",
                    normalize_embeddings=True,
                    convert_to_numpy=True,
                )
                for entry, vector in zip(missing, vectors):
                    self._embedding_cache[self._entry_cache_key(entry)] = vector

            query_vector = embedding_model.encode(
                [question],
                prompt_name="query",
                normalize_embeddings=True,
                convert_to_numpy=True,
            )[0]

            ranked = []
            for entry in entries:
                vector = self._embedding_cache[self._entry_cache_key(entry)]
                ranked.append(
                    {
                        **entry,
                        "score": float(np.dot(query_vector, vector)),
                    }
                )
            ranked.sort(key=lambda item: item["score"], reverse=True)
            return ranked[: min(limit, len(ranked))]

    def _generate(self, messages: Iterable[dict[str, str]], max_tokens: int) -> str:
        with self._lock:
            model, tokenizer = self._activate("generation")
            from mlx_lm import generate

            prompt = tokenizer.apply_chat_template(
                list(messages),
                add_generation_prompt=True,
                tokenize=False,
                enable_thinking=False,
            )
            response = generate(
                model,
                tokenizer,
                prompt=prompt,
                max_tokens=max_tokens,
                verbose=False,
            )
            # Gemma 4 can emit a private thought channel even when thinking is
            # disabled. Only the final channel is suitable for the journal UI.
            if "<channel|>" in response:
                response = response.rsplit("<channel|>", 1)[-1]
            response = re.sub(r"<\|channel>[^\n]*\n?", "", response)
            response = response.replace("<turn|>", "").strip()
            return response

    def summarize(self, text: str) -> dict[str, str]:
        summary = self._generate(
            [
                {
                    "role": "system",
                    "content": (
                        "Summarize journal entries faithfully and gently. Do not "
                        "diagnose the writer or invent facts."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Write a concise one- or two-sentence summary of this "
                        f"journal entry:\n\n{text}"
                    ),
                },
            ],
            max_tokens=256,
        )
        return {"summary": summary, "model": MODEL_VERSIONS["generation"]}

    def chat(
        self,
        question: str,
        entries: list[dict[str, Any]],
    ) -> dict[str, Any]:
        if not entries:
            return {
                "answer": "I don't have any journal entries to search yet.",
                "context": [],
                "models": {},
            }

        context = self._retrieve(question, entries)
        context_text = "\n\n".join(
            (
                f"Entry {item['id']} — {item.get('date') or 'unknown date'}"
                f" — mood: {item.get('sentiment') or 'unlabeled'}\n"
                f"{item['text'][:1800]}"
            )
            for item in context
        )
        answer = self._generate(
            [
                {
                    "role": "system",
                    "content": (
                        "You are Kairo, a private journal reflection assistant. "
                        "Answer only from the supplied journal excerpts. Be warm, "
                        "specific, concise, and honest about uncertainty. Do not "
                        "diagnose mental health conditions or invent memories."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Question: {question}\n\nRelevant journal excerpts:\n"
                        f"{context_text}\n\nAnswer in two short paragraphs or fewer."
                    ),
                },
            ],
            max_tokens=512,
        )
        if not answer:
            top_entry = context[0]
            answer = (
                "The closest match I found is your entry from "
                f"{top_entry.get('date') or 'an unknown date'}: "
                f"{top_entry['text'][:240]}"
            )
        return {
            "answer": answer,
            "context": context,
            "models": {
                "embeddings": MODEL_VERSIONS["embeddings"],
                "generation": MODEL_VERSIONS["generation"],
            },
        }
