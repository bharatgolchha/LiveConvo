# 🚀 /app Performance Optimisation Checklist

> A running log of the concrete steps taken (and still planned) to speed-up the `/app` page.  Tick an item once the change is merged to `master`.

## ✅ Completed

- [x] **Dynamic import:** `SetupModal`, `TranscriptModal`, `AICoachSidebar` are now lazy-loaded (`2025-06-16`).
- [x] **Dynamic import:** `RecordingConsentModal` & `LoadingModal` switched to lazy-loading (`2025-06-16`).
- [x] **Extract persistence helpers:** Moved `saveTranscriptToDatabase`, `saveTranscriptNow`, `saveSummaryToDatabase` to `@/lib/transcriptPersistence` (~150 lines removed from page.tsx) (`2025-06-16`).
- [x] **Extract core state:** Added `useConversationCoreState` hook and migrated ~40 state lines from `page.tsx` (`2025-06-16`).
- [x] **Extract lifecycle effects:** Added `useConversationLifecycle` and removed page visibility / beforeunload logic from `page.tsx` (~90 lines) (`2025-06-16`).
- [x] **Extract localStorage persistence:** Added `useConversationLocalStorage` hook and removed save/restore effects from `page.tsx` (~60 lines) (`2025-06-16`).
- [x] **Extract file uploads:** Added `useFileUploads` hook and removed inline upload logic from `page.tsx` (~80 lines) (`2025-06-16`).
- [x] **Cache `/api/config` & provider-specific transcription init:** Added `getApiConfig` helper to cache config fetch and updated `useTranscription` hooks to avoid initializing unused providers (`2025-06-16`).

## 🔄 In-Progress / Planned

- [ ] **Dynamic per-icon imports** – replace bulk `lucide-react` import with per-icon `dynamic()` calls.
- [x] **Virtualised transcript list** – huge transcript rendering now uses `react-window` for smooth scrolling (`2025-06-16`).
- [ ] **Split Deepgram/WebRTC logic into a Web Worker** to offload heavy processing.
- [ ] **Paginate previous conversations list** in `SetupModal`.
- [ ] **Bundle analysis** – run `next build && npx nextjs-bundle-visualizer` and document findings.
- [ ] **Framer-motion trimming** – investigate replacing simple animations with CSS.

Feel free to expand this list as new optimisation opportunities are discovered. 