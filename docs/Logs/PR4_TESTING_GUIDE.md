# PR 4 — Ask Tab Testing Guide

**Feature:** Question & Answer over conversation history  
**Modes:** Template (default) + Optional LLM  
**Date:** October 23, 2025

---

## Prerequisites

✅ PR 0-3 completed and working  
✅ RAG system configured (OpenAI + Pinecone)  
✅ At least one conversation with indexed messages  
✅ Expo Go app running

---

## Test Scenarios

### 1. Template Mode (Default, No Cost)

**Goal:** Verify template-based answering works offline and is fast

**Setup:**

```bash
# Ensure LLM is disabled (default)
echo "CASPER_ENABLE_LLM=false" >> .env
npm start
```

**Steps:**

1. Open any conversation with messages
2. Tap ghost button (Casper)
3. Panel slides up → Switch to "Ask" tab
4. Verify info box says: "LLM is disabled. Answers will be template-based."
5. Type: "What did we discuss?"
6. Tap Send

**Expected Results:**

- ✅ Answer appears in < 1 second
- ✅ Shows bulleted list of key points
- ✅ Badge says "Template" (not "AI")
- ✅ 3-8 sources listed below answer
- ✅ Each source shows:
  - Number [1], [2], etc.
  - Timestamp (e.g., "Oct 22, 10:30 AM")
  - Relevance badge (e.g., "92%")
  - Text preview (truncated)

**Screenshots:**

- Take screenshot of answer with sources
- Verify template mode badge

---

### 2. LLM Mode (Optional)

**Goal:** Verify natural language answering via OpenAI

**Setup:**

```bash
# Enable LLM
echo "CASPER_ENABLE_LLM=true" >> .env
npm start  # Must restart!
```

**Steps:**

1. Open Casper → Ask tab
2. Verify NO info box about "LLM is disabled"
3. Type: "Summarize the key decisions we made"
4. Tap Send

**Expected Results:**

- ✅ Answer in 1-3 seconds (depends on API)
- ✅ Natural language prose (not bullets)
- ✅ Badge says "AI" (not "Template")
- ✅ Still shows sources below
- ✅ May cite timestamps in answer text

**If OpenAI API fails:**

- ✅ Should automatically fall back to template mode
- ✅ Shows template answer instead
- ✅ No crash or blank screen

---

### 3. Source Citations

**Goal:** Verify source display and interaction

**Steps:**

1. Ask any question
2. Wait for answer
3. Tap "X Sources" header

**Expected Results:**

- ✅ List expands/collapses
- ✅ Each source shows:
  - Numbered badge (1, 2, 3...)
  - Relative timestamp ("Today 3:45 PM" or "Yesterday" or "Oct 21")
  - Relevance percentage (75-100% usually)
  - Message preview (first ~150 chars)
- ✅ Tapping source (currently no action, future: jump to message)

---

### 4. Q&A History

**Goal:** Verify session persistence

**Steps:**

1. Ask 3 different questions:
   - "What did we decide?"
   - "Who is working on X?"
   - "When is the deadline?"
2. Verify all 3 Q&As appear in scrollable list
3. Close Casper panel (swipe down)
4. Re-open Casper panel
5. Switch to Ask tab

**Expected Results:**

- ✅ Last 3 Q&As still visible
- ✅ Scrollable history
- ✅ Each shows question, answer, sources
- ✅ Mode badge on each

---

### 5. Rate Limiting

**Goal:** Verify 10 queries/minute limit

**Steps:**

1. Ask 10 quick questions (any text)
2. Try to ask 11th question

**Expected Results:**

- ✅ First 10 succeed normally
- ✅ 11th shows error: "Rate limit reached. Please wait..."
- ✅ Send button disabled
- ✅ Counter shows "0/10 per minute"
- ✅ Wait 60 seconds → counter resets → can ask again

---

### 6. Error Handling & Retry

**Goal:** Verify graceful failure and retry

**Steps:**

1. Enable Airplane Mode
2. Ask a question
3. Observe error
4. Disable Airplane Mode
5. Tap "Retry" button

**Expected Results:**

- ✅ Shows error message in red box
- ✅ Retry button appears
- ✅ Tapping Retry re-asks the question
- ✅ Answer appears normally

---

### 7. Query Cancellation

**Goal:** Verify in-flight queries can be cancelled

**Steps:**

1. Ask a question
2. Immediately switch to "Summary" tab (before answer appears)
3. Switch back to "Ask" tab

**Expected Results:**

- ✅ No error shown
- ✅ Query was cancelled
- ✅ Can ask new question immediately

---

### 8. Empty State

**Goal:** Verify proper empty state

**Steps:**

1. Open Casper from Conversations screen (no conversation selected)
2. Switch to Ask tab

**Expected Results:**

- ✅ Shows ghost icon
- ✅ Says "Pick a conversation"
- ✅ Subtext: "Open a conversation to ask questions..."
- ✅ Input disabled

---

### 9. Validation

**Goal:** Verify query validation

**Test 1 - Empty:**

1. Try to send empty question
2. Expected: Send button disabled

**Test 2 - Too Short:**

1. Type: "Hi"
2. Tap Send
3. Expected: Error "Question is too short (min 3 characters)"

**Test 3 - Too Long:**

1. Type 501 characters
2. Expected: Input limited to 500, counter shows "500/500"

---

### 10. Performance

**Goal:** Verify response times

**Template Mode:**

- ✅ Answer < 1 second (target: ~0.5s)
- ✅ No visible lag when typing

**LLM Mode:**

- ✅ Answer < 3 seconds (target: ~1.5s)
- ✅ Loading spinner shows while waiting

**History Load:**

- ✅ Previous sessions appear instantly (< 0.5s)

---

## Edge Cases

### No Indexed Messages

**Steps:**

1. Create new conversation
2. Send 1 message
3. Open Casper → Ask → Ask question

**Expected:**

- Either:
  - Shows "I couldn't find relevant messages..."
  - OR waits for indexing to complete (PR3 background job)

### Very Long Conversation

**Steps:**

1. Open conversation with 500+ messages
2. Ask: "What are the main topics?"

**Expected:**

- ✅ Still responds in < 1 second (template)
- ✅ Shows most relevant 8 sources (not all 500)

### Special Characters

**Steps:**

1. Ask: "What about @user and #hashtag?"

**Expected:**

- ✅ Handles special chars gracefully
- ✅ No crash or encoding issues

---

## Visual Checklist

- [ ] Question bubbles: Gray background, left-aligned
- [ ] Answer bubbles: Purple border, left-aligned
- [ ] User icon: Circle avatar
- [ ] Casper icon: Purple ghost
- [ ] Mode badge: Small, subtle, shows "Template" or "AI"
- [ ] Sources: Collapsible, numbered, with relevance %
- [ ] Loading: Spinner + "Thinking..." text
- [ ] Retry button: Purple border, "Retry" text + icon
- [ ] Empty state: Centered, ghost icon, friendly text

---

## Common Issues

### "RAG system not configured"

**Fix:** Run PR3 setup (see `PR3_SETUP_GUIDE.md`)

### No sources returned

**Fix:** Run `npm run seed:rag` to index messages

### LLM not working

**Check:**

- `CASPER_ENABLE_LLM=true` in `.env`
- `OPENAI_API_KEY` is valid
- Expo server restarted after env change

### Rate limit stuck

**Fix (dev only):**

```javascript
// In Chrome DevTools → Console
AsyncStorage.clear();
```

### Q&A history not loading

**Fix:**

- Close/reopen app
- Check AsyncStorage size (may be full)

---

## Success Criteria

**PR 4 is complete when:**

- ✅ Template mode answers questions in < 1s
- ✅ LLM mode works when enabled (optional)
- ✅ Sources display with correct metadata
- ✅ Rate limiting prevents abuse
- ✅ Errors handled gracefully with retry
- ✅ History persists across sessions
- ✅ No crashes or blank screens
- ✅ Performance meets targets

---

## Next: PR 5

Once PR 4 testing passes, proceed to:
**PR 5 — Conversation Summary & Daily Digest**

---

## Feedback Template

```markdown
## PR 4 Test Results

**Tester:** [Your Name]
**Date:** [Date]
**Device:** [iPhone/Android + version]

### Template Mode

- [ ] Pass / [ ] Fail
- Notes: \_\_\_

### LLM Mode (optional)

- [ ] Pass / [ ] Fail / [ ] Skipped
- Notes: \_\_\_

### Sources Display

- [ ] Pass / [ ] Fail
- Notes: \_\_\_

### Rate Limiting

- [ ] Pass / [ ] Fail
- Notes: \_\_\_

### Error Handling

- [ ] Pass / [ ] Fail
- Notes: \_\_\_

### Performance

- Template response time: \_\_\_ ms
- LLM response time: \_\_\_ ms (if tested)

### Issues Found

1. ***
2. ***

### Screenshots

[Attach screenshots]

### Overall Status

- [ ] Ready for PR 5
- [ ] Needs fixes
```

---

## Developer Notes

**Key Files to Review:**

- `src/agent/qa/controller.ts` — Core QA logic
- `src/agent/CasperTabs/Ask.tsx` — UI implementation
- `src/agent/components/Sources.tsx` — Citation display

**Debug Logging:**
Check console for:

- "Error answering question:" → LLM/search failure
- "Query cancelled:" → Successful cancellation
- "Rate limit reached:" → Expected rate limit hit

**Performance Profiling:**
Use React DevTools Profiler to verify:

- Ask tab render < 16ms
- No unnecessary re-renders on typing

---

**Questions? See `PR4_ASK_TAB_COMPLETE.md` for full documentation.**
