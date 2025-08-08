# Offline Recording Upload Modal – Implementation Checklist

This checklist tracks the work to add an Upload button on the Dashboard that opens a modal to upload audio/video, transcribe + diarize with Deepgram Nova-3, let the user name speakers, auto-generate a session title via AI, and create a session with the segmented transcript.

Legend: [x] done, [ ] pending

## 0) Documentation
- [x] Architecture and flow doc created: `docs/offlineRecording.md`

## 1) Environment & Secrets
- [x] Deepgram API key configured in `.env.local` (`DEEPGRAM_API_KEY`) – confirmed by user
- [ ] OpenRouter key configured for AI title generation (`OPENROUTER_API_KEY` or equivalent)

## 2) Backend APIs
- [x] Transcription API (diarization)
  - `POST /api/transcribe/deepgram` implemented: `frontend/src/app/api/transcribe/deepgram/route.ts`
- [x] AI Title API (uses OpenRouter per project convention)
  - `POST /api/sessions/offline/title` → returns `{ title }`
- [ ] Session creation (reuse existing)
  - `POST /api/sessions` (existing) – will be used from modal Step 4
- [ ] Transcript persistence (reuse existing)
  - `POST /api/sessions/{id}/transcript` (existing) – chunk and save diarized segments

## 3) Frontend – Dashboard Integration
- [ ] Add "Upload recording" button in Dashboard header (top-right primary CTA)
- [ ] Create `UploadRecordingModal` with stepper UX
  - [ ] Step 1: Upload (dropzone + file validations)
  - [ ] Step 2: Transcribe (Deepgram Nova-3, progress states)
  - [ ] Step 3: Speakers (rename speakers, optional swap, live preview)
  - [ ] Step 4: Review & Create (AI title with regenerate; finalize fields; create session)
- [ ] On success: navigate to the new session and toast success

## 4) Frontend – Supporting Pages/Tests
- [x] Test page for offline transcription: `/test-offline` → `frontend/src/app/test-offline/page.tsx`
- [x] Unit test for test page: `frontend/tests/app/test-offline.test.tsx`
- [ ] Component tests for `UploadRecordingModal` (happy path + error states)
- [ ] Integration (optional): end-to-end through modal (Playwright) – later

## 5) Data Mapping & Utilities
- [ ] Shared mapper: Deepgram diarized segments → transcript rows
  - Fields: `content`, `speaker`, `confidence_score`, `start_time_seconds`, `end_time_seconds`, `is_final=true`, `stt_provider='deepgram'`
- [ ] Speaker name mapping logic
  - Allow user names; optional mapping to `ME`/`THEM` if supported by UI/analytics

## 6) Privacy & Security
- [ ] Auth checks on new endpoints; enforce org access
- [ ] Define original audio handling (store temporarily vs not storing)
  - If storing: record `sessions.audio_file_url` and set retention (24–48h)

## 7) Performance & Reliability
- [ ] Chunked persistence of transcript lines to avoid payload/timeouts (e.g., 200–500 per request)
- [ ] Robust error handling in modal with retry buttons and clear messages

## 8) Rollout & Docs
- [ ] Update `README.md` with feature overview and setup
- [ ] Link the modal’s “Learn more” to `docs/offlineRecording.md`
- [ ] Add tasks to `TASK.md` and mark when complete

---

## Execution Order (Proposed)
1. Title API via OpenRouter (`/api/sessions/offline/title`)
2. Modal shell + Step 1 (Upload)
3. Wire Step 2 (Transcribe via `/api/transcribe/deepgram`)
4. Step 3 (Speakers mapping + preview)
5. Step 4 (AI title + Create session + chunked transcript save + navigate)
6. Dashboard button + polish
7. Tests for modal (happy path + error states)
8. Docs & TASK.md updates

We will progress through these items and check them off as completed.
