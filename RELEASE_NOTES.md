# Kairo Release Notes

## Local AI and Web Viewer Update — July 27, 2026

This release modernizes Kairo's AI stack and separates private, on-device AI
from the web-accessible journal experience. All AI models are free to download
and run locally; Kairo does not require a paid inference API.

### Highlights

- Replaced the original AI pipeline with five newer, purpose-specific local
  models.
- Added separate text-emotion and vocal-emotion analysis.
- Added local semantic search and grounded answers over the signed-in user's
  journal entries.
- Added a cloud-safe API and hosted-viewer mode with no model dependencies.
- Kept raw voice recordings and model inference on the user's device.
- Added a repeatable model downloader and a one-command launcher.

### New local model stack

| Capability | Model | What changed |
| --- | --- | --- |
| Speech transcription | Distil-Whisper Large v3.5 | Upgraded local English speech recognition |
| Text emotion | ModernBERT GoEmotions | Adds 28 detailed emotions while preserving broad mood filters |
| Vocal emotion | W2V-BERT Emotion | Adds a separate emotional signal derived from the recording |
| Semantic retrieval | Qwen3 Embedding 0.6B | Replaces the shared MiniLM/FAISS search path with user-scoped local retrieval |
| Journal answers | Gemma 4 E2B 4-bit | Generates grounded local answers from relevant journal entries |

The local runtime loads only one model at a time to reduce unified-memory use
on Apple silicon. Model weights are stored outside the repository and use
approximately 10 GB of disk space.

### Privacy and architecture

- `main.py` is now the model-free journal API for authentication, entries,
  notebooks, uploads, and synchronization.
- `local_ai.py` is a separate authenticated service bound to
  `127.0.0.1`.
- The browser sends raw audio only to the local service.
- Saved voice entries synchronize the transcript and derived labels, not the
  source recording.
- Journal chat receives only entries belonging to the currently signed-in
  user.
- The old process-wide shared vector index was removed.
- Hosted frontend builds default to viewer mode and do not contain a local-AI
  access token.

Journal text, images, and derived emotion labels still live in the configured
journal database. This release does not claim end-to-end encryption.

### Journal experience

- Typed entries receive detailed local emotion analysis when Kairo Local is
  available.
- Typed entries can still be saved when the local companion is unavailable.
- Voice recording now processes the completed recording instead of repeatedly
  retransmitting cumulative audio.
- A transcription can be reviewed before it is saved.
- Voice entries store both text and vocal emotion metadata.
- “Ask your journal” now performs local semantic retrieval and generates a
  grounded answer with its supporting entries.
- The interface clearly displays `Local AI` or `Viewer mode`.

### Web viewer

- The frontend can be built without AI capabilities for web deployment.
- The hosted API installs only lightweight server dependencies.
- The web version can authenticate and browse or organize synchronized journal
  data.
- AI controls explain that Kairo Local is required.

Public deployment still requires a hosted database, API address, and durable
object storage for uploaded images.

### Data changes

Journal entries now support:

- detailed emotion label and scores;
- vocal emotion label and scores;
- generated summary;
- AI model-version metadata;
- AI processing timestamp; and
- entry source type (`text` or `voice`).

The migration is additive. On the development database it preserved all
existing data: 2 users, 128 journal entries, and 7 notebooks.

A pre-migration backup was created at:

```text
~/Library/Application Support/Kairo/backups/kairo-pre-local-ai-20260727.db
```

### Setup and operations

- Added `download_models.py` to download all five model groups or selected
  capabilities.
- Split dependencies into:
  - `requirements.txt` for the model-free API; and
  - `requirements-ai.txt` for the complete local experience.
- Updated `start-kairo.sh` to start the journal API, local AI companion, and
  frontend together.
- The launcher generates an ephemeral local token, validates ports before
  starting, supports custom ports, and cleans up its child processes.
- Added automatic additive database migration during API startup.
- Updated environment examples and the README for local and hosted modes.

### Verification

The release was verified with:

- real inference through all five local models;
- exact transcription of a synthesized voice fixture;
- text and vocal emotion analysis;
- user-scoped semantic retrieval;
- a grounded Gemma journal answer with hidden reasoning removed;
- authenticated journal and metadata API tests;
- browser sign-in, journal loading, and local-AI connectivity;
- frontend unit tests, production build, and TypeScript checks;
- Python compilation and dependency compatibility checks; and
- database row-count and migration-integrity checks.

### Known limitations

- The current Gemma runtime targets Apple silicon through MLX.
- Model switching favors lower memory use over minimum latency.
- Hosted deployments need PostgreSQL or another durable database instead of
  the default local SQLite file.
- Filesystem image uploads should be replaced with object storage for a
  multi-instance deployment.
- Journal content is synchronized in plaintext unless encryption is added at a
  later stage.

