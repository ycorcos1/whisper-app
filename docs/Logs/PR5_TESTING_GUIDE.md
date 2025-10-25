# PR 5 — Testing Guide

**Branch:** `feature/pr5-casper-summary-digest`  
**Date:** October 23, 2025

---

## Quick Start

### Prerequisites

1. Ensure you have messages indexed in Pinecone from PR3:

   ```bash
   cd /Users/yahavcorcos/Desktop/whisper-app
   npm run seed:rag
   ```

2. Ensure Firebase Functions are deployed:

   ```bash
   cd functions
   npm run build
   firebase deploy --only functions:casperSummarize
   ```

3. Start Expo:
   ```bash
   npx expo start
   ```

---

## Test Scenarios

### Scenario 1: Basic Summary Generation

**Steps:**

1. Open the app in Expo Go
2. Navigate to a conversation with at least 10 messages
3. Tap the ghost button (bottom right) to open Casper panel
4. Navigate to the "Summary" tab
5. Tap "Last 24h" button

**Expected Results:**

- Loading spinner appears
- Summary generates within 1-2 seconds
- Summary displays with:
  - Header with timestamp
  - Key points (3-5 bullet points)
  - Source count footer
  - Mode badge showing "Template"
- Copy button is visible at bottom

**Success Criteria:** ✅ Summary is relevant to recent messages

---

### Scenario 2: Different Timeframes

**Steps:**

1. From Summary tab, tap "Last 7d" button
2. Wait for summary to generate
3. Tap "All Time" button
4. Compare the three summaries

**Expected Results:**

- Each timeframe shows different content
- Longer timeframes show more comprehensive summaries
- All summaries are coherent and relevant

**Success Criteria:** ✅ Summaries reflect the selected timeframe

---

### Scenario 3: Copy to Clipboard

**Steps:**

1. Generate any summary
2. Tap the "Copy" button
3. Navigate to Messages app (or Notes)
4. Paste

**Expected Results:**

- Alert appears: "Copied!"
- Pasted content matches summary text exactly
- Formatting is preserved (bullets, line breaks)

**Success Criteria:** ✅ Clipboard contains full summary

---

### Scenario 4: Daily Digest

**Steps:**

1. From Casper panel, navigate to "Digest" tab
2. Wait for auto-load (may take 1-3 seconds)

**Expected Results:**

- Digest displays with:
  - "Daily Digest" header
  - Regenerate button
  - Today's date
  - "Active Today" section with conversation list
  - "Yesterday" section (if applicable)
  - Message counts and previews
  - Copy button at bottom

**Success Criteria:** ✅ Shows accurate conversation activity

---

### Scenario 5: Digest Regeneration

**Steps:**

1. From Digest tab, tap "Regenerate" button
2. Wait for regeneration

**Expected Results:**

- Loading spinner appears
- Digest refreshes within 2-3 seconds
- Content may update with latest data

**Success Criteria:** ✅ Digest regenerates successfully

---

### Scenario 6: Pull-to-Refresh

**Steps:**

1. On Summary tab, generate a summary
2. Pull down from top of screen
3. Release
4. Repeat for Digest tab

**Expected Results:**

- Refresh indicator appears
- Content regenerates
- New data displays

**Success Criteria:** ✅ Refresh works on both tabs

---

### Scenario 7: Offline Caching (Summary)

**Steps:**

1. Ensure you're online
2. Generate a "Last 24h" summary
3. Close Casper panel
4. Enable airplane mode on device
5. Reopen Casper panel
6. Navigate to Summary tab

**Expected Results:**

- Cached summary displays immediately
- No loading spinner
- No error messages
- Copy button still works

**Success Criteria:** ✅ Works offline with cache

---

### Scenario 8: Offline Caching (Digest)

**Steps:**

1. Ensure you're online
2. Open Digest tab and let it load
3. Close Casper panel
4. Enable airplane mode
5. Reopen Casper panel
6. Navigate to Digest tab

**Expected Results:**

- Cached digest displays immediately
- No loading spinner
- No error messages
- Copy button still works

**Success Criteria:** ✅ Works offline with cache

---

### Scenario 9: LLM Mode (Optional)

**Only if you have OpenAI API key configured**

**Setup:**

```bash
# In app.config.ts, ensure CASPER_ENABLE_LLM is set
export default {
  extra: {
    casperEnableLLM: true,
    openaiApiKey: process.env.OPENAI_API_KEY,
    // ...
  }
}
```

**Steps:**

1. Rebuild app with LLM enabled
2. Generate a summary
3. Check the mode badge

**Expected Results:**

- Mode badge shows "AI" instead of "Template"
- Summary is in natural language paragraphs
- Response time is 2-5 seconds
- Quality is higher than template mode

**Success Criteria:** ✅ LLM generates natural language summary

---

### Scenario 10: Error Handling

**Steps:**

1. Ensure you're offline (airplane mode)
2. Try to generate a new summary
3. Try to regenerate digest

**Expected Results:**

- Error state appears with red alert icon
- Error message is clear and helpful
- Retry button is available
- No app crashes

**Success Criteria:** ✅ Errors are handled gracefully

---

### Scenario 11: Empty Conversation

**Steps:**

1. Navigate to a conversation with no messages
2. Open Casper panel
3. Try to generate summary

**Expected Results:**

- Summary generates
- Shows "No messages found in this conversation"
- No errors or crashes

**Success Criteria:** ✅ Handles empty state

---

## Performance Benchmarks

| Operation         | Expected Time | Max Acceptable |
| ----------------- | ------------- | -------------- |
| Template Summary  | < 1s          | 2s             |
| LLM Summary       | 2-4s          | 8s             |
| Digest Generation | 1-3s          | 5s             |
| Cache Load        | < 100ms       | 500ms          |
| Copy to Clipboard | < 50ms        | 200ms          |

---

## Visual Checklist

### Summary Tab

- [ ] Action buttons are horizontally aligned
- [ ] Active button has purple background
- [ ] Loading spinner is centered
- [ ] Summary card has rounded corners
- [ ] Mode badge is visible and readable
- [ ] Copy button has icon + text
- [ ] Placeholder text is centered

### Digest Tab

- [ ] Header row with title and regenerate button
- [ ] Date is formatted correctly
- [ ] Conversation items have icons
- [ ] Message previews are truncated (1 line)
- [ ] Today/Yesterday sections are distinct
- [ ] Copy button matches Summary tab style

---

## Common Issues & Solutions

### Issue: "No messages found"

**Solution:** Ensure messages are indexed in Pinecone. Run `npm run seed:rag`.

### Issue: "Failed to generate summary"

**Solution:** Check Firebase Functions are deployed. Check network connection.

### Issue: Copy button does nothing

**Solution:** Ensure `expo-clipboard` is installed: `npm install expo-clipboard --legacy-peer-deps`

### Issue: LLM mode not working

**Solution:**

1. Check `CASPER_ENABLE_LLM` is true
2. Check `OPENAI_API_KEY` is set
3. Check Firebase Functions have access to API key

### Issue: Digest shows no conversations

**Solution:**

1. Send messages in last 24 hours
2. Ensure you're a participant in conversations
3. Check Firestore permissions

---

## Debug Commands

### Check if functions are deployed:

```bash
firebase functions:list
```

### Check function logs:

```bash
firebase functions:log --only casperSummarize
```

### Clear AsyncStorage cache:

```typescript
// In Metro console or add temporary button:
import AsyncStorage from "@react-native-async-storage/async-storage";
await AsyncStorage.clear();
```

### Check Pinecone index:

```bash
cd functions
npm run validate:rag
```

---

## Acceptance Criteria Summary

- [ ] ✅ All 11 test scenarios pass
- [ ] ✅ No console errors or warnings
- [ ] ✅ Performance within benchmarks
- [ ] ✅ Visual design matches specifications
- [ ] ✅ Offline functionality works
- [ ] ✅ Error handling is robust
- [ ] ✅ Copy to clipboard works
- [ ] ✅ Pull-to-refresh works

---

## Next Steps After Testing

1. **If all tests pass:** Ready to merge and proceed to PR6
2. **If issues found:** Document bugs and fix before merging
3. **Performance issues:** Consider reducing topK or optimizing queries
4. **UX feedback:** Iterate on design based on user testing

---

## Additional Testing (Optional)

### Stress Testing

- Test with 100+ messages in conversation
- Test with 20+ active conversations
- Test rapid button clicking
- Test during poor network conditions

### Edge Cases

- Very long messages (1000+ chars)
- Messages with special characters/emojis
- Group conversations vs DMs
- Conversations with media only (no text)

### Cross-Platform

- Test on iOS
- Test on Android
- Test different screen sizes
- Test dark mode (if implemented)
