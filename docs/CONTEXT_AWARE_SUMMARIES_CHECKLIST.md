# Context-Aware Summaries – Implementation Checklist

_Date created: 2025-06-17_

Follow the tasks below sequentially. Mark each item with **[x]** once completed and committed.

## A. Backend – Data & API

- [x] **DB Migration:** Add `conversation_links` junction table (session_id ↔ linked_session_id).
- [x] **API – Create Session:** Accept `linkedConversationIds` and insert rows into `conversation_links`.
- [x] **API – Transcript Endpoint:** Support `includeLinked=true`, returning `{ current, linked[] }`.
- [x] **API – Summary Endpoint:** Support `includeLinked=true` and build prompt with memory summaries.
- [x] **Memory Summary Storage:** Add column/table + cron/back-fill to persist condensed summaries.

## B. AI Prompt Logic

- [x] **Prompt Builder Update:** Combine current transcript with up to _N_ memory summaries (≤3 k tokens).

## C. Front-End Wiring

- [x] **NewConversationModal:** Pass `linkedConversationIds` when creating sessions.
- [x] **Conversation Loader:** Fetch transcript with `includeLinked` and merge into text sent to `useRealtimeSummary`.
- [x] **Summary UI Accordion:** Show expandable list of previous conversation TL;DRs.

## D. Testing

- [ ] **API Unit Test:** Verify summary route includes memory summaries when `includeLinked=true`.
- [ ] **Component Test:** Ensure accordion renders linked summaries correctly.

## E. Project House-Keeping

- [ ] **Documentation:** Update README / docs to describe context-aware summary feature.
- [ ] **TASK.md:** When each major section completes, reflect status in main tracker. 