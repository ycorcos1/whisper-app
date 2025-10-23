# Whisper — Phase 2: Casper AI Agent — Task List (PR Roadmap)

> This roadmap turns **Whisper_Phase2_Casper_PRD.md** into concrete, merge‑scoped PRs. Each PR has a clear goal, branch name, acceptance criteria, and a checklist of code changes. Keep the PRs small and shippable. After each PR, run `npm run predev && npm run verify` (if present) and update `/memory/active_context.md` + `/memory/progress.md`.

---

## PR 1 — Wire Up Casper Panel & Context Plumbing
**Goal:** Turn the existing ghost bottom sheet into a functional panel with tabs, context wiring, and feature flags (no AI calls yet).  
**Branch:** `feature/pr1-casper-panel`

### Tasks
- [ ] Add **tabs** inside the panel: `Ask`, `Summary`, `Actions`, `Decisions`, `Digest`.
- [ ] Implement **panel context provider**: `src/agent/CasperContext.tsx` (selected conversation id, selection, mode, loading/error state, feature flags).
- [ ] Add **feature flags** in `.env.example`:
  - `CASPER_ENABLE_LLM=false`
  - `CASPER_ENABLE_PROACTIVE=true`
  - `CASPER_INDEX_BATCH=200`
- [ ] Provide **panel open/close** imperative API (`openCasperPanel()`, `closeCasperPanel()`), wired to the existing ghost button and swipe handle.
- [ ] Summary/Actions/Decisions/Digest tabs = placeholder views that read from provider only (no real data yet). Ask tab shows an input and disabled “Send” until PR3.
- [ ] Persist **panel last-opened tab** in AsyncStorage (`agent:lastTab`).
- [ ] Safety: rate limit (simple in-memory counter) for Ask tab while LLM disabled.

### Files to add/update
- `src/agent/CasperPanel.tsx`
- `src/agent/CasperContext.tsx`
- `src/state/featureFlags.ts`
- `src/types/agent.ts`

### Acceptance
- [ ] Panel opens/closes smoothly.
- [ ] Tabs switch with state preserved; last tab restored on reopen.
- [ ] No real AI calls; all UI responsive; no crashes.

---

## PR 2 — Data Surfaces & Memory Hooks (Read-Only)
**Goal:** Expose read-only views for summaries/actions/decisions/digest with mock data adapters that later plug into real RAG.  
**Branch:** `feature/pr2-casper-data-adapters`

### Tasks
- [ ] Define **selector hooks** that read conversation data & cached artifacts:
  - `useConversationWindow(cid)` (last N messages; Firestore cache-first)
  - `useDailyDigest(uid)` (mock stub returns empty array)
  - `useActionItems(cid)` / `useDecisionLog(cid)` (mock stub returns [])
- [ ] Prepare **model mappers** to convert messages → `AgentDocChunk` shape (no indexing yet).
- [ ] Render mock data in tabs with empty states, spinners, and skeletons.
- [ ] Add **dev toggles** in the panel header to simulate data (for demo).

### Files
- `src/agent/hooks/useConversationWindow.ts`
- `src/agent/hooks/useDailyDigest.ts`
- `src/agent/hooks/useActionItems.ts`
- `src/agent/hooks/useDecisionLog.ts`
- `src/agent/mappers.ts`

### Acceptance
- [ ] Tabs render stable empty states; no runtime errors.
- [ ] Dev toggle shows sample items and clears correctly.

---

## PR 3 — Local RAG Indexer (On-Device, Zero-Cost)
**Goal:** Build a zero-cost, on-device text chunker + vector index (SQLite + cosine) for recent messages (no external services).  
**Branch:** `feature/pr3-casper-indexer`

### Tasks
- [ ] Add **lightweight embedder** (JS): normalized bag-of-words + hashing + l2-normalization (deterministic, offline). Put behind interface `EmbeddingsAdapter`.
- [ ] Implement **MiniIndex**:
  - Store vectors in **Expo SQLite**: `agent_index.sqlite` (tables: `chunks`, `terms`, `meta`).
  - API: `upsertChunks`, `deleteByCid`, `similar(text, k)`, `stats()`.
- [ ] **Chunker**: message → markdown normalization, 512–800 char chunks, carry `cid`, `mid`, `ts`, participants.
- [ ] **Indexer worker**: run on app foreground / conversation open / nightly (app open) to (re)index last 3–7 days per conversation; batch size from `CASPER_INDEX_BATCH`.
- [ ] Background-safe: throttle; show subtle “Indexing…” status chip in Casper header.
- [ ] Add **storage management**: cap DB rows (~10k), oldest-first eviction.

### Files
- `src/agent/index/embeddings.ts`
- `src/agent/index/miniIndex.ts`
- `src/agent/index/chunker.ts`
- `src/agent/index/indexWorker.ts`
- `src/agent/index/sql/schema.sql`

### Acceptance
- [ ] `similar("test", 5)` returns stable, relevant message snippets locally.
- [ ] DB doesn’t grow unbounded; stats page shows rows/size.
- [ ] No network access required; Expo Go compatible.

---

## PR 4 — Ask Tab (Retrieval + LLM Switch + No-Spend Default)
**Goal:** Enable question answering over recent chat using MiniIndex. Default = **no LLM**, template-based responses; optional LLM via env flag.  
**Branch:** `feature/pr4-casper-ask`

### Tasks
- [ ] Controller: `answerQuery(q, cid)` → retrieves top-k chunks; formats answer:
  - Default: **template summarizer** (citation list + key sentences).
  - If `CASPER_ENABLE_LLM=true`: call provider adapter (OpenAI compatible) with system prompt from PRD; stream tokens into panel.
- [ ] Add **source viewer** (tappable footnotes jump to message).
- [ ] Add **error boundaries** and retry; cancel in-flight on tab switch.
- [ ] Logs to `/assist/sessions/{sid}` (local SQLite mirror only—no Firestore writes for now).

### Files
- `src/agent/qa/controller.ts`
- `src/agent/qa/providers/openaiAdapter.ts` (env-gated)
- `src/agent/components/Sources.tsx`

### Acceptance
- [ ] With LLM off: answers show summary + 3–8 sources; completely offline.
- [ ] With LLM on: streamed answer with the same sources and guardrails.
- [ ] Performance: sub‑1.0s for template mode on mid-size chats.

---

## PR 5 — Conversation Summary & Digest
**Goal:** Generate quick summaries for the open conversation and a daily digest across all active conversations.  
**Branch:** `feature/pr5-casper-summary-digest`

### Tasks
- [ ] **Conversation Summary**: use MiniIndex top-k chunks + deterministic template; cache in AsyncStorage by `(cid, day)`.
- [ ] **Daily Digest**: collect latest messages per joined convo, create sections (Today / Yesterday), render compact bullets; cache by `(uid, day)`.
- [ ] “Copy to clipboard” & “Share” actions on both.
- [ ] Hook refresh to pull-to-refresh in the Casper panel.

### Files
- `src/agent/summarize/convSummary.ts`
- `src/agent/summarize/dailyDigest.ts`

### Acceptance
- [ ] Opening Casper → Summary tab shows a coherent summary instantly.
- [ ] Digest builds without network; refresh works and remains fast.

---

## PR 6 — Action & Decision Extraction (Template‑First, LLM Optional)
**Goal:** Surface next steps and decisions from threads.  
**Branch:** `feature/pr6-casper-actions-decisions`

### Tasks
- [ ] Rule-based extractors over retrieved chunks:
  - Action cues: “I will”, “Can you”, “Let’s”, “by EOD”, checkboxes, bullets.
  - Decision cues: “We agreed”, “Final”, “Chosen”, “Let’s go with”.
- [ ] Render sortable lists; **Mark done** and **Pin** (local only).
- [ ] Optional LLM re‑write if enabled (shorten/normalize phrasing).
- [ ] Cache lists per `(cid, day)`; expose `useActionItems` / `useDecisionLog`.

### Files
- `src/agent/extract/actions.ts`
- `src/agent/extract/decisions.ts`

### Acceptance
- [ ] Clear action/decision lists on realistic chat; no duplicates.
- [ ] Pinned items persist locally; done items collapse gracefully.

---

## PR 7 — Proactive Signals (Zero-Cost Heuristics)
**Goal:** Raise lightweight notifications/banners inside Casper based on rules (no push).  
**Branch:** `feature/pr7-casper-proactive`

### Tasks
- [ ] Heuristics:
  - Long unanswered question detected in last 24h in DM → “Follow up?”
  - Action with due-date string in the past → “Past due”
  - High-activity thread with user mention of you → “You’ve been mentioned”
- [ ] Show **Proactive** section at top of Digest; tap opens the relevant message.
- [ ] Respect user pref toggles in Profile → “Casper proactive suggestions”.

### Files
- `src/agent/proactive/rules.ts`
- `src/agent/proactive/notifier.ts`

### Acceptance
- [ ] Rules fire deterministically on test data.
- [ ] Tapping a card focuses the correct message and closes Casper.

---

## PR 8 — Panel Polish: UX, Perf, and Accessibility
**Goal:** Smooth UX and predictable performance.  
**Branch:** `feature/pr8-casper-polish`

### Tasks
- [ ] Add virtualization to source lists; memoize heavy selectors.
- [ ] Micro‑interactions: fade‑in answers, skeletons, smooth tab transitions.
- [ ] Keyboard avoidance, screen reader labels, dynamic font size support.
- [ ] Add light‑touch telemetry (in‑memory counters) for feature usage.

### Files
- `src/agent/components/*` updates
- `src/agent/utils/analytics.ts` (in‑memory only)

### Acceptance
- [ ] 60fps panel animations on emulator + device.
- [ ] No layout jumps or clipped content.

---

## PR 9 — Rules, CI, and Docs
**Goal:** Lock in rules, linters, docs.  
**Branch:** `feature/pr9-casper-ci-docs`

### Tasks
- [ ] Update **/docs** with the PRD and this task list; add usage guide: `/docs/Whisper_Casper_UserGuide.md`.
- [ ] Add basic tests (unit for chunker/indexer/extractors). No Detox.
- [ ] ESLint rules for `src/agent/**`; add `npm run agent:test` script.
- [ ] Ensure `.env.example` includes all Casper flags.

### Files
- `/docs/Whisper_Phase2_Casper_PRD.md` (ensured)
- `/docs/Whisper_Phase2_Casper_TaskList.md` (this file)
- `package.json` scripts, `eslint` config

### Acceptance
- [ ] `npm run agent:test` passes.
- [ ] README section: “How to run Casper offline”.

---

## Rollout & Manual Test Script (Quick)
- [ ] Seed two sample conversations with 50–200 messages.
- [ ] Open Casper → **Summary** shows coherent bullets.
- [ ] Ask: “What did we decide about X?” returns citations.
- [ ] Actions: at least 3 obvious action items; Mark one done, pin one.
- [ ] Digest: shows sections for Today/Yesterday + proactive cards.
- [ ] Toggle `CASPER_ENABLE_LLM=true` (optional) and verify streamed answers.

---

## Notes
- No network or paid services required by default. The optional LLM adapter is inert unless the env flag is true and keys exist.
- Everything must remain Expo Go compatible.
- Keep index sizes small; prefer recency over completeness.
- After each PR, update memory bank: `/memory/active_context.md` and `/memory/progress.md`.
