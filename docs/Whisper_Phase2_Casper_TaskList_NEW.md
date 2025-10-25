# Whisper — Phase 2 (Casper) • Task List v3

**This version supersedes v2 and includes the new Multi‑Step Agent advanced feature.**  
All PRs prior to PR 6 remain unchanged and stable.

> **Environment Policy Recap**
>
> - Run **only via Expo Go**, no Firebase Hosting or emulator required.
> - Firebase used for Auth + Firestore + Storage only.
> - Vector store: **Pinecone Starter** (free plan) with optional local fallback.
> - LLM stack: **OpenAI + LangChain**, no paid extras required beyond API keys.
> - Whenever setup is required, **Cursor must pause and print exact step‑by‑step instructions.**

---

## PR 0 — Casper Shell & Panel (✅ Done)

Floating ghost button + sliding bottom sheet on Conversations / Chat screens.  
**Branch:** `feature/pr0-casper-panel`

---

## PR 1 — Shared Agent State & Wiring (✅ Done)

Context provider managing `visible`, `activeTab`, `conversationId`.  
**Branch:** `feature/pr1-casper-state`

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

## PR 3 — Memory / RAG Layer (Pinecone + OpenAI + LangChain)

**Goal:** Build full retrieval pipeline (embed → store → retrieve → ground → answer).

### Tasks

1. Add `.env` keys:
   ```bash
   OPENAI_API_KEY=...
   PINECONE_API_KEY=...
   PINECONE_INDEX=whisper-casper
   PINECONE_ENV=us-east-1-aws
   VECTOR_NAMESPACE=default
   VECTOR_TOP_K=6
   ```
2. Create `src/server/rag/`:
   - `embed.ts` – OpenAI embedding client
   - `index.ts` – Pinecone indexer/search
   - `answer.ts` – LangChain retrieval → grounding chain
   - `config.ts` – env validation + stop‑and‑ask guards
3. Add `scripts/seedRag.ts` to chunk messages → embed → upsert.
4. Add stop‑and‑ask breakpoints if keys/index missing.
5. Add validation / QA test to confirm recall quality.

**Branch:** `feature/pr3-casper-memory-rag`

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

## PR 7 — Multi‑Step Agent (Advanced Feature)

> **Goal:** Demonstrate reasoning‑based multi‑tool orchestration for planning & coordination.  
> Builds on the full RAG stack and satisfies the “Advanced Feature” rubric option.

### Tasks

1. Define orchestration flow:  
   `detectIntent → decomposeTasks → callTools → summarizePlan`  
   using **LangChain function‑calling**.
2. Implement mock “offsite planner” scenario:  
   Detects location/date/time phrases → creates schedule plan.
3. Store plans under `agent/{uid}/plans/{planId}` in Firestore.
4. Add **Planner** view inside Casper panel (or extend Decisions tab).
5. Create tool wrappers:
   - `summarizeThread`
   - `findFreeTimes` (mock)
   - `generatePlanSummary`
6. Integrate with RAG results for context recall (uses retrieval API from PR 3).
7. Add “Run Plan” button in UI → executes chain and renders steps live.
8. Implement graceful error recovery and logging.
9. QA check: output deterministic JSON plan; no external APIs beyond OpenAI / Pinecone.

**Branch:** `feature/pr6-casper-multistep-agent`

### Acceptance

- Executes 3–5 step reasoning chain correctly.
- Plan JSON visible in panel.
- All tools modular, unit‑testable.
- Handles tool failure gracefully.

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

## PR 9 — Core App Performance Optimization

**Goal:** Eliminate unnecessary re-renders, optimize data fetching, and improve scrolling performance across core chat features.  
**Branch:** `feature/pr9-core-performance`

### Tasks

- [ ] **ConversationsScreen optimizations:**
  - Add FlatList performance props (`removeClippedSubviews`, `windowSize`, `getItemLayout`)
  - Memoize `renderConversation` callback with `useCallback`
  - Reduce Firebase getDoc calls by implementing aggressive in-memory caching for user data
- [ ] **ChatScreen message tracking:**
  - Fix useEffect dependency causing re-runs on every message
  - Use ref to track last processed message ID instead of direct dependency
  - Memoize header components (`HeaderRight`, `HeaderTitle`) to prevent function recreation
- [ ] **Message rendering optimizations:**
  - Wrap `MessageItem` with `React.memo` and custom comparison function
  - Add FlatList performance props to message list
  - Memoize `renderMessage` callback
- [ ] **Avatar component optimization:**
  - Wrap `Avatar` with `React.memo`
  - Memoize expensive calculations (`initials`, `backgroundColor`, `avatarSize`)
  - Prevent unnecessary re-renders when photoURL unchanged
- [ ] **PresenceBadge subscription batching:**
  - Create `PresenceManager` singleton to batch subscriptions
  - Implement reference counting for Firebase RTDB subscriptions
  - Reduce 50+ simultaneous subscriptions to N unique users
  - Add in-memory cache layer for presence data
- [ ] **useOptimisticMessages optimization:**
  - Change `allMessages` from `useCallback` to `useMemo`
  - Pre-compute merged message array instead of computing on every render

### Files

- `src/screens/ConversationsScreen.tsx`
- `src/screens/ChatScreen.tsx`
- `src/components/MessageItem.tsx`
- `src/components/Avatar.tsx`
- `src/components/PresenceBadge.tsx`
- `src/features/presence/PresenceManager.ts` (new)
- `src/features/presence/useUserPresence.ts` (update to use manager)
- `src/features/messages/useOptimisticMessages.ts`
- `src/features/conversations/api.ts` (add caching layer)

### Acceptance

- [ ] ConversationsScreen loads instantly with cached data; no flicker on 50+ conversations
- [ ] ChatScreen header doesn't re-render on every typing indicator change
- [ ] Message list scrolling is smooth at 60fps with 100+ messages
- [ ] Firebase RTDB connection count matches unique online users (not per-badge)
- [ ] No memory leaks; presence subscriptions properly cleaned up
- [ ] Avatar images load once and cache properly; no re-renders on scroll

### Performance Targets

- [ ] **Conversations list:** First render < 100ms with cache, full load < 500ms
- [ ] **Chat screen:** Message send to display < 50ms (optimistic)
- [ ] **Scrolling:** Maintain 60fps on both iOS and Android
- [ ] **Memory:** Presence subscriptions scale O(unique users), not O(badges)
- [ ] **Network:** Reduce Firebase queries by 60%+ via aggressive caching

---

## Rollout & Manual Test Script (Quick)

- [ ] Seed two sample conversations with 50–200 messages.
- [ ] Open Casper → **Summary** shows coherent bullets.
- [ ] Ask: “What did we decide about X?” returns citations.
- [ ] Actions: at least 3 obvious action items; Mark one done, pin one.
- [ ] Digest: shows sections for Today/Yesterday + proactive cards.
- [ ] Toggle `CASPER_ENABLE_LLM=true` (optional) and verify streamed answers.

---
