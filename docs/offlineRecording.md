# Offline Recording: Upload, Transcribe, Diarize, and Create Session

## Why this exists
Enable users to upload an audio/video file after a meeting and have the system:
- Transcribe the recording
- Generate speaker-segmented transcript (diarization)
- Create a new `session` populated with transcript lines and metadata
- Trigger downstream summary/action-items (existing pipeline)

This doc describes the end-to-end architecture, API, DB mappings, and implementation details. It references OpenAI documentation for audio transcription and also provides a production-ready diarization path.

## High-level flow
1. User uploads an audio/video file from the dashboard (offline mode)
2. Backend stores the file (temporary storage) and creates a draft `session`
3. A background job transcribes the file
   - Option A (OpenAI Whisper API) for transcription
   - Option B (Deepgram File Transcription) for transcription + diarization
4. Transcript lines are saved into `transcripts` table with timing + speaker
5. `sessions.status` moves to `completed` and post-processing triggers summary
6. UI displays the segmented transcript and summary

## Database: tables and fields used
The existing schema (see `docs/schema.md`) already supports offline ingestion.
- `sessions`
  - `audio_file_url` (string): where the uploaded file is stored
  - `recording_duration_seconds`, `recording_started_at`, `recording_ended_at`
  - `status` transitions: `draft` → `processing` → `completed`
  - `conversation_type`, `title`, `participant_me`, `participant_them`
- `transcripts`
  - `session_id`, `content`, `speaker` (store as `'ME' | 'THEM' | 'speaker_1' | 'speaker_2'`),
    `confidence_score`, `start_time_seconds`, `end_time_seconds`, `stt_provider`, `is_final`
- Optional (if desired later): `usage_records` for minute/cost tracking

No new tables are strictly required. If you want job introspection, you can add a lightweight `ingestion_jobs` table, but it’s optional.

## Storage
Use one of:
- Supabase Storage (recommended if already adopted)
- S3/R2 (if already configured; schema uses `audio_file_url` regardless)

Ensure lifecycle policies to retain originals for 24–48 hours only (privacy + cost).

## API design
### 1) Initiate offline upload + session creation
- Method: `POST /api/offline-recordings`
- Payload: multipart/form-data
  - `file`: audio/video file (mp3, wav, m4a, mp4, mkv, webm)
  - `title` (optional)
  - `conversationType` (optional)
  - `participantMe`, `participantThem` (optional; can be edited later)
- Response: `{ sessionId, status: 'processing' }`
- Behavior:
  - Auth check (user + org)
  - Create draft `session` with `status='processing'` and set `audio_file_url`
  - Enqueue background task to transcribe & diarize

### 2) Check processing status
- Method: `GET /api/offline-recordings/{sessionId}/status`
- Response: `{ status: 'processing' | 'completed' | 'failed', progress?: number, error?: string }`

### 3) (Internal) Save transcript lines
- We already have: `POST /api/sessions/{id}/transcript` which accepts an array of lines and persists them.
- Reuse it from the transcription job.

## Transcription and diarization options
You have two robust paths. Choose per environment with a feature flag.

### Option A: OpenAI (file transcription) — references
- OpenAI Audio API endpoints include `/audio/createTranscription` (Whisper). See OpenAI docs (via Context7):
  - Audio endpoints: `https://platform.openai.com/docs/guides/audio`
  - API sitemap excerpt includes: `/audio/createTranscription` and uploads lifecycle
  - Large file uploads: `/v1/uploads` to chunk, then reference in a request

Pros:
- High-quality transcription
- Simple to integrate for file-based flows

Cons:
- Native speaker diarization for file transcription is limited. If strict diarization is required, add a diarization step (see below) or prefer Deepgram for diarization.

Implementation sketch (Node/TypeScript):
- If file size is large, use the Uploads API lifecycle:
  - `POST /v1/uploads` (create)
  - `POST /v1/uploads/{upload_id}/parts/{n}` (upload parts)
  - `POST /v1/uploads/{upload_id}/complete`
- Then call transcription:
  - `POST /v1/audio/transcriptions` (Whisper) with the file or uploaded file ref
- Parse result into segments (if available) or plain text
- If diarization needed and not provided by OpenAI for the given route, run diarization (see “Diarization strategies”)

Note: Backend API routes should go through OpenRouter for LLM text generation by project convention, but for Whisper-style audio transcription you may call the provider directly. Confirm provider support on OpenRouter before proxying audio endpoints.

### Option B: Deepgram (recommended for diarization)
Deepgram’s file transcription supports `diarize: true` and returns structured words/paragraphs with `speaker` labels and timestamps. We already use Deepgram for streaming; reuse the credentials.

Flow:
- `POST https://api.deepgram.com/v1/listen?diarize=true&smart_format=true&<other params>` with the file or remote `audio_file_url`
- Parse paragraphs/words → map to our `transcripts` rows
- Map speakers to `speaker_1`, `speaker_2`, etc. Then (optional) resolve to `ME`/`THEM` in post-processing or let users flip who is “You” in the UI.

## Diarization strategies
1) Provider-native diarization (Deepgram): preferred. Map speakers to `speaker_1`, `speaker_2`, etc., then post-map to `ME`/`THEM` based on heuristics or user choice.
2) If using OpenAI only:
   - If diarization is not included in the response, run a second diarization pass with a dedicated diarization model (e.g., service like Deepgram diarization-only or an on-prem solution) and then align segments to transcripts by timestamps.
   - As a pragmatic alternative, segment by pauses and attribute speakers heuristically is possible but not recommended for production.

## Background job: implementation details
- Triggered by `POST /api/offline-recordings`
- Steps:
  1) Fetch `session` + `audio_file_url`
  2) Transcribe using selected provider
  3) Build transcript payload for `POST /api/sessions/{id}/transcript`
     - Fields per line: `content`, `speaker`, `confidence_score`, `start_time_seconds`, `end_time_seconds`, `is_final=true`, `stt_provider`
  4) Update `sessions`:
     - `status='completed'`, set `recording_duration_seconds`
  5) Trigger summary pipeline if configured (existing logic)

- Error handling:
  - On failure, set `status='draft'` or `'failed'` and store error in logs; expose error via status endpoint

## Mapping external results → transcripts rows
Example mapping (Deepgram-like paragraphs):
- For each paragraph or utterance:
  - `content`: concatenated words
  - `speaker`: e.g., `speaker_1`/`speaker_2` (later remap to `ME`/`THEM`)
  - `confidence_score`: avg of word confidences or provided paragraph confidence
  - `start_time_seconds`: paragraph start
  - `end_time_seconds`: paragraph end
  - `stt_provider`: `'deepgram'` or `'openai_whisper'`

For OpenAI Whisper (plain text):
- If only text returned without segments, create a single transcript block from 0s to duration. For better UX, split by sentence and estimate timestamps (not ideal) or use a diarization service to get accurate segments.

## UI/UX
- New entry point on dashboard: “Upload recording (offline)”
- Show file drag-and-drop + metadata fields (title, participants)
- After upload, route to the new session view with a processing spinner and status polling
- When transcription completes, show segmented transcript using existing components (`TranscriptMessage.tsx`, virtualized list, etc.)
- Provide an optional toggle/UI control to swap which diarized speaker is “You” vs “Participant” if diarization cannot infer roles

## Environment & secrets
- Deepgram: `DEEPGRAM_API_KEY`
- OpenAI: `OPENAI_API_KEY` (or OpenRouter equivalent if they support audio transcription proxy)
- Storage: credentials for Supabase Storage or S3/R2

Ensure these are injected into the backend environment for API routes.

## Rate limits & file limits
- Enforce client-side max size (e.g., 200MB) and server-side checks
- Preferred formats: `wav` (PCM), `mp3`, `m4a`, `mp4`/`webm` (audio-only tracks ok)
- For very large files, prefer remote URL transcription (provider streams from `audio_file_url`) to avoid double-uploading

## Cost controls
- Track usage in `usage_records` with `usage_type='audio_processing'` and unit `minutes` or `hours`
- Consider downsampling to 16kHz mono before upload (server-side) to reduce provider cost if supported without hurting accuracy

## Security & privacy
- Only allow org members to access their own uploads (RLS already in place)
- Delete original audio after 24–48 hours post summary generation (`sessions.audio_deleted_at`)
- Ensure signed URLs for temporary access when providers pull from storage

## OpenAI docs (Context7 references)
From the OpenAI docs sitemap (via Context7), useful entries:
- Audio endpoints: `/audio/createTranscription` (Whisper)
- Upload management: `/v1/uploads` (create/add parts/complete)
- Realtime audio events and transcript delta/done events (if you choose a realtime route instead)

See OpenAI’s guides for audio: `https://platform.openai.com/docs/guides/audio`.

## Minimal implementation plan (incremental)
1) Backend route `POST /api/offline-recordings` (multipart), save file to storage, create `session(status='processing')`
2) Background job function `processOfflineRecording(sessionId)` that:
   - Calls Deepgram file transcription with `diarize=true` (recommended first ship)
   - Saves transcript lines via existing `POST /api/sessions/{id}/transcript`
   - Updates `sessions.status='completed'`
3) Status route + UI polling
4) Optional: Add OpenAI path (feature flag) and diarization fallback

## Testing
- Unit tests: mock provider responses → ensure correct transcript row mapping
- Integration test: upload small sample file → expect session created, status to completed, transcript rows present, and summary triggered
- Edge cases: very short recordings, long silences, single speaker, non-English language

## Supabase MCP usage
- For DB admin tasks and quick checks, we use Supabase MCP.
- Configure MCP token in `.cursor/mcp.json` by replacing `<SUPABASE_PERSONAL_ACCESS_TOKEN>` and ensure the correct project ID.
  - Development project: `ucvfgfbjcrxbzppwjpuu`
  - Production project: confirm the correct ID (the repo mentions both `juuysuamfoteblrqqdnu` and `xkxjycccifwyxgtvflxz`). Pick the right one and keep only that in your team notes.

---

Questions or migration needs? If we decide to add an `ingestion_jobs` table for richer observability, document it here and add a migration in `supabase/migrations/`.
