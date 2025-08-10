### Record/Upload Flow (Dashboard Upload Modal)

This document explains the end-to-end flow for uploading a pre-recorded file or recording audio directly from the dashboard upload modal, how the file is stored, how transcription and diarization run, and how a session is created and finalized.

## Entry points

- Dashboard header and quick actions trigger the modal by toggling `showUploadModal` in `frontend/src/app/dashboard/page.tsx`.
- Visiting `/upload` redirects to the dashboard with `?action=upload`, which opens the modal automatically.

## UI Overview: `UploadRecordingModal`

Component: `frontend/src/components/dashboard/UploadRecordingModal/UploadRecordingModal.tsx`

Steps inside the modal:
- Step 1: Upload (or Record) — select input mode and provide audio/video
- Step 2: Transcribe & diarize — send audio to Deepgram and get diarized segments
- Step 3: Name speakers — assign display names, mark “You”, merge speakers if needed
- Step 4: Review & create — generate title, create session, persist transcript, finalize

State highlights:
- `inputMode`: `'upload' | 'record'`
- File handling: `file` for upload mode; `recordedBlob`/`recordedFilename`/`recordedFile` for record mode
- Progress/errors: `uploadProgress`, `loading`, `error`
- Transcription result: `segments` (speaker-labeled, timed)
- Speaker mapping: `speakerMap`, `youSpeaker`
- Usage gating: `precheck` (minutes required vs remaining)

## Direct-to-Supabase uploads (signed URL)

We bypass Vercel limits by uploading directly from the browser to Supabase Storage using a one-time signed URL.

- Signed URL creation route: `POST /api/storage/signed-upload` (server-side) returns `{ token, path, bucket }`.
- Client then calls `supabase.storage.from(bucket).uploadToSignedUrl(path, token, file)` to stream bytes directly to Supabase.
- Public URL is retrieved via `supabase.storage.from(bucket).getPublicUrl(path)`.

### Upload mode (pre-recorded file)

1) User selects a file.
2) On “Transcribe & diarize”:
   - Client requests a signed URL via `POST /api/storage/signed-upload` with a path like `offline/<timestamp>-<filename>`.
   - Client uploads the file directly to Supabase with `uploadToSignedUrl` and resolves the `publicUrl` via `getPublicUrl`.
   - Calls `POST /api/transcribe/deepgram` with JSON `{ file_url: <publicUrl> }`.
   - Receives diarized `segments`; runs usage precheck (`/api/usage/precheck-offline`) using segment timings.
3) On success, moves to the Speakers step.

## Record mode (in-browser capture)

1) Start recording:
   - Captures microphone via `getUserMedia({ audio: true })`.
   - Optionally captures tab/system audio via `getDisplayMedia({ video: true, audio: true })`; mixes mic + system tracks using Web Audio API (`createMediaStreamSource` → `MediaStreamDestination`).
   - Chooses a supported `MediaRecorder` format preferring `audio/webm;codecs=opus`, falling back to `audio/webm`, `audio/ogg`, `video/webm`, etc.
   - Chunks are buffered until stop.

2) Stop recording:
   - Builds a `Blob` from chunks and synthesizes a filename (e.g., `recording-<ts>.webm|ogg|mp4|wav`).

3) Upload recording:
   - Request signed URL via `POST /api/storage/signed-upload` for path `offline/<timestamp>-<filename>`.
   - Convert `Blob` to `File` and upload directly via `uploadToSignedUrl`.
   - Resolve `publicUrl` with `getPublicUrl`, store in state.

4) Transcribe:
   - On “Transcribe & diarize”, calls `POST /api/transcribe/deepgram` with `{ file_url: uploadedUrl }`.
   - Receives diarized `segments` and performs the same usage precheck as upload mode.

## Storage internals

- Bucket: `offline-recordings` (public)
- Paths: `offline/<timestamp>-<sanitized-filename>`
- The server route sanitizes provided paths by stripping leading slashes and allowing only `[a-zA-Z0-9._-]` in the filename segment.

## Transcription & diarization: `/api/transcribe/deepgram`

Location: `frontend/src/app/api/transcribe/deepgram/route.ts`

- Preferred usage is JSON `{ file_url }` pointing to a Supabase public file URL.
  - If the URL is a Supabase public storage URL, the server downloads the file using the service client to get raw bytes and a reliable content-type.
  - If remote URL fetch is required, it infers content-type by extension, header, or magic bytes.
- Calls Deepgram’s pre-recorded transcription endpoint with parameters:
  - `model=nova-3`, `language=multi`, `diarize=true`, `smart_format=true`, `punctuate=true`, `utterances=true`.
- Maps Deepgram output to `segments` shaped as `{ text, speaker, start, end, confidence? }`, preferring `results.utterances` and falling back to paragraphs.
- Error handling includes detailed diagnostics (status code, request URL, headers, first bytes) to aid debugging.

## Usage precheck: `/api/usage/precheck-offline`

Location: `frontend/src/app/api/usage/precheck-offline/route.ts`

- Auth required. Accepts either `seconds` or `segments` to compute duration.
- Computes `requiredMinutes = ceil(seconds/60)` and checks remaining minutes via `check_usage_limit_v2` (Supabase RPC).
- Returns `{ allowed, requiredMinutes, remainingMinutes, isUnlimited }`. The modal blocks progression if not allowed.

## Speakers step

- Displays unique diarized speakers with counts and durations.
- Allows editing display names, marking “You”, and merging speakers.
- Optional “Show full transcript” to preview all lines.

## Review & create

1) Title:
   - Heuristic title generation based on detected speaker names and early transcript content. Users can edit.

2) Create session:
   - `POST /api/sessions` with auth; sets `source = 'offline_upload'`, `conversation_type = 'meeting'`, `participant_me`, `participant_them`, and `title`.
   - Receives `session.id`.

3) Persist transcript:
   - Batches transcript rows (chunks of 250) to `POST /api/sessions/{id}/transcript`.
   - Each row includes `content`, `speaker` (user label), timing, `is_final`, and `stt_provider='deepgram'`.

4) Finalize:
   - Non-blocking call to `POST /api/sessions/{id}/finalize` with metadata (conversation type, title, participants, computed duration). Backend can generate summaries/reports.
   - On success (or even if finalize fails), navigates to `/meeting/{id}`.

## Error handling & UX notes

- Direct-to-Supabase upload progress shown at the client; path sanitation reduces storage errors.
- Transcription and precheck errors surface detailed messages; user can retry.
- Recording compatibility uses multiple MIME fallbacks for `MediaRecorder`; informs when unsupported.

## Authentication & security

- Session creation and transcript persistence use the authenticated user token via `authenticatedFetch`.
- Precheck and finalize also require auth; RLS ensures data is scoped to the user’s organization.

## Buckets & paths

- Bucket: `offline-recordings` (public)
- Paths: `offline/<timestamp>-<sanitized-filename>[.mp3|.<original-ext>]`

## Related files

- Modal UI and flow: `frontend/src/components/dashboard/UploadRecordingModal/UploadRecordingModal.tsx`
- Dashboard page (modal trigger): `frontend/src/app/dashboard/page.tsx`
- Signed upload (server): `frontend/src/app/api/storage/signed-upload/route.ts`
- Transcription (server): `frontend/src/app/api/transcribe/deepgram/route.ts`
- Usage precheck (server): `frontend/src/app/api/usage/precheck-offline/route.ts`
- Session creation (server): `frontend/src/app/api/sessions/route.ts`
- Transcript persistence (server): `frontend/src/app/api/sessions/[id]/transcript/route.ts`
- Finalize (server): `frontend/src/app/api/sessions/[id]/finalize/route.ts`


