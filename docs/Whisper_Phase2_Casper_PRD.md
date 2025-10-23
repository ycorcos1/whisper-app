# Whisper — Phase 2 (Casper) PRD
**Scope:** Build the AI Agent features **inside the existing Casper panel** (ghost button & bottom sheet already implemented). No new UI primitives—only wire up data, functions, and interactions.

## Goals
- Deliver a Team‑Professional AI agent that:
  - Summarizes conversations on demand and proactively (daily).
  - Extracts action items & final decisions.
  - Answers freeform queries over chat history using RAG.
  - Surfaces triage signals (Action/Decision/Mention) on the conversation list.
  - Stores per‑user tasks & preferences.
  - Works offline-friendly on device; Functions handle heavy lifting.
- Zero-cost infra during development (use free Firebase tier and client‑side embeddings with `@xenova/transformers`).

## Non‑Goals (Phase 2)
- No push notifications, no third‑party SaaS vector DBs, no long‑term external storage.
- No new screens beyond the Casper panel & minor conversation-list chips.
- No multi-tenant org features.

---

## Architecture (High Level)
- **Client (Expo/React Native):**
  - Uses existing Casper bottom sheet: a simple chat-like thread with tabs: *Ask*, *Summary*, *Actions*, *Decisions*, *Digest*.
  - Calls Firebase Callable Functions for heavy AI.
  - Maintains lightweight local cache in AsyncStorage for quick re-open (last agent outputs).
- **Backend (Firebase):** Firestore + Cloud Functions (Node 20) + Cloud Scheduler.
- **Embeddings:** `@xenova/transformers` (MiniLM‑L6‑v2) in Functions; vectors stored in Firestore.

### Collections (Additions)
```
/semantic_chunks/{id}
  cid: string            // conversation id
  mid: string            // message id
  text: string           // normalized content
  embedding: number[]    // 384-dim
  createdAt: Timestamp

/assist/insights/{cid}/{docId}
  type: "summary" | "actions" | "decisions"
  window: {from: Timestamp, to: Timestamp} | null
  content: string
  items?: Array<{title: string, assignee?: string, due?: string, mid?: string}>
  createdBy: string      // uid
  createdAt: Timestamp

/assist/tasks/{uid}/{taskId}
  title: string
  sourceCid?: string
  sourceMid?: string
  due?: string
  status: "open" | "done"
  createdAt: Timestamp
  updatedAt: Timestamp

/assist/digests/{uid}/{dateId}
  content: string
  tasks: Array<{id: string, title: string, status: string}>
  decisions: string[]
  createdAt: Timestamp

/assist/agents/{uid}
  proactiveEnabled: boolean
  lastDigestAt?: Timestamp
  prefs?: {summaryLength: "short"|"normal"|"long"}
```

### Security Rules (essentials)
- Users can read/write their own `/assist/tasks/{uid}` and `/assist/agents/{uid}`.
- Users can read `/assist/insights/{cid}` only if `cid` member; cannot overwrite others’ insights.
- Users can update only their own `lastReadMid` in `/conversations/{cid}/participants/{uid}`.
- `/semantic_chunks` write by Functions only; read allowed to members of `cid`.

---

## Functions (Names are descriptive; actual identifiers must be unique)
> **Important:** Avoid clashing with existing identifiers. Prefix all new functions with `cfCasper_` when implemented.

1) **Message Embedder (onCreate trigger)**
   - **When:** On new message in `conversations/{cid}/messages/{mid}`.
   - **Do:** Normalize text → generate 384‑d embedding → store a document in `/semantic_chunks`.
   - **Edge cases:** Skip empty/short attachments; chunk long texts to ≤ 800 chars with overlap 100.

2) **Vector Search (callable)**
   - **Input:** `cid`, `query`, `topK=12`.
   - **Do:** Embed query; cosine search across `/semantic_chunks` where `cid` == input; return topK snippets.
   - **Output:** Ranked snippets `{mid, text, score}`.

3) **Thread Summary (callable)**
   - **Input:** `cid`, optional `{from,to}` window, `length` ("short"|"normal"|"long").
   - **Do:** Pull latest N messages (e.g., 300) or time window; rank via vector search (optional focus); craft prompt and call LLM; store to `/assist/insights/{cid}` with type `"summary"`.
   - **Return:** `{content, refId}`.

4) **Action Item Extraction (callable)**
   - **Input:** `cid`, optional window.
   - **Do:** Heuristic prefilter (imperatives + mentions) → LLM extraction → write both to `/assist/insights/{cid}` (type `"actions"`) and to `/assist/tasks/{uid}` for assignees found (default: current user if ambiguous).

5) **Decision Extraction (callable)**
   - **Input:** `cid`, optional window.
   - **Do:** Prompt to capture “we decided/agree/let’s go with …” → store under `/assist/insights/{cid}` (type `"decisions"`).

6) **Daily Digest (scheduled)**
   - **When:** 08:00 local (approx)—Cloud Scheduler HTTP → Function iterates users with `proactiveEnabled`.
   - **Do:** For each user’s active `cid`s, gather yesterday’s summaries/actions/decisions/unread; compose daily digest via LLM; write `/assist/digests/{uid}/{dateId}`.
   - **Client:** Casper panel “Digest” tab reads the latest document; no push required.

7) **Conversation Flags (onWrite or scheduled)**
   - **Do:** Compute lightweight labels for each `cid` per user: `hasAction`, `hasDecision`, `hasMention` since last open; store small computed map in `/assist/agents/{uid}.flags[cid]`.
   - **Client:** Show tiny chips on conversation rows; tap opens Casper in triage mode for that `cid`.

> **LLM Access:** Use a single environment-driven provider; wrap with timeouts/retry/backoff. During demos, you can optionally stub with a rule-based summarizer to avoid spend.

---

## Casper Panel — Client Behavior
- **Ask Tab:** Freeform question box → calls Vector Search → crafts context window → calls `Thread Summary`‑style LLM answer → displays streaming text (or full chunk). Cache last 10 Q/A pairs in AsyncStorage.
- **Summary Tab:** Buttons: *Last 24h*, *Last 7d*, *All unread*. Each triggers `Thread Summary` and displays the result (and saves to Firestore for collaboration).
- **Actions Tab:** Lists `/assist/tasks/{uid}` with checkbox; toggling updates status.
- **Decisions Tab:** Lists `/assist/insights/{cid}` where type `"decisions"`.
- **Digest Tab:** Shows the latest `/assist/digests/{uid}/{dateId}`; “Regenerate” calls the daily digest callable variant for today only.

### Conversation List Chips (client)
- Reads `/assist/agents/{uid}.flags[cid]`.
- Shows up to 2 chips: `Action`, `Decision`, `@You`.
- Tapping opens Casper pre-filtered to that conversation.

---

## Prompts (LLM)
> Keep prompts small and deterministic; pass conversation snippets, not entire threads.

**Summary Prompt (system):**
“You are a concise project assistant. Summarize the provided chat excerpts for a software team. Output sections: *What happened*, *Decisions*, *Open questions*, *Next actions (bullets)*. Keep it {length}.”

**Action Extract Prompt (system):**
“From the excerpts, extract actionable todos as JSON `{title, assignee?:emailOrName, due?:date, mid}`. No commentary.”

**Decision Extract Prompt (system):**
“List final decisions agreed in the excerpts as bullet points. Be strict—only items with clear consensus.”

**Q/A Prompt (user):**
“Context snippets: … 
Question: {query}
Answer succinctly, citing message times if present.”

---

## Acceptance Criteria (Feature-by-Feature)

### RAG & Vector Search
- Query returns relevant snippets for realistic queries in < 1.5s median.
- No embeddings stored for non-text messages (images only).

### Thread Summary
- Clicking *Last 24h* yields a coherent 5–10 sentence output with decisions and actions highlighted.
- Output persisted under `/assist/insights/{cid}` and re-openable.

### Action Items
- At least 80% of imperative statements are captured as tasks; toggling checkboxes updates instantly and persists.

### Decisions
- Clear end-state choices appear in the list; regenerating should not duplicate exact items.

### Daily Digest
- Appears by 8:05 local. Manual regenerate works. Includes: highlights, top tasks, decisions.

### Conversation Chips
- Chips appear only when there is content newer than last open; tapping opens Casper with pre-filter.

### Offline
- Casper panel opens and shows last results from AsyncStorage; actions queue until back online.

---

## Tasks & Files (Delta Only — UI already exists)

### 1) Data & Rules
- [ ] Update Firestore rules to include `/assist/**` and `/semantic_chunks/**` scopes.
- [ ] Add indexes: `semantic_chunks(cid)` and any composite queries used by lookups.

### 2) Functions
- [ ] `functions/src/embeddings.ts` (MiniLM loader, cosine search)
- [ ] `functions/src/triggers/onMessageCreate.ts` (embed new messages)
- [ ] `functions/src/callables/vectorSearch.ts`
- [ ] `functions/src/callables/summarize.ts`
- [ ] `functions/src/callables/actions.ts`
- [ ] `functions/src/callables/decisions.ts`
- [ ] `functions/src/scheduled/dailyDigest.ts`
- [ ] `functions/src/flagging/convoFlags.ts`
- [ ] Export from `functions/src/index.ts` with **unique** names prefixed `cfCasper_…`

### 3) Client
- [ ] `src/agent/useCasper.ts` (hook to call functions, cache, and map tabs)
- [ ] `src/agent/CasperPanel.tsx` (wire buttons to callables; render lists)
- [ ] `src/features/conversations/flags.ts` (read chips; open Casper with filters)
- [ ] `src/config/ai.ts` (provider key handling; timeouts; environment guard)

### 4) Env & Scripts
- [ ] `.env.example` → `LLM_PROVIDER=openai|anthropic|stub`, `LLM_API_KEY=...`
- [ ] `npm run embeddings:rebuild` (optional backfill script via Admin SDK)
- [ ] `README_Casper.md` with usage instructions

---

## Test Plan (manual, quick)
- Seed two test users, 3 conversations (1 busy).
- Verify: summary/actions/decisions/digest outputs populate; chips show for unread actionable threads; offline open shows last cached agent response; reconnect triggers queued calls.

---

## Rollout
- Phase A: Local emulator + two devices (Expo Go + Android emulator).
- Phase B: Connect to real Firebase project, rate-limit scheduled digest to user list.
- Phase C: Demo script: send flurry of msgs → run summary → mark tasks → show digest & chips.
