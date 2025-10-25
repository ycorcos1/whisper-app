# PR 3 Testing Guide — RAG System

**Branch:** `feature/pr3-casper-memory-rag`  
**Prerequisites:** Complete setup (see PR3_SETUP_GUIDE.md)

---

## Automated Testing

### 1. Validation Suite

Run the comprehensive validation suite:

```bash
npm run rag:validate
```

**Expected output:**

```
============================================================
📊 RAG VALIDATION RESULTS
============================================================

✅ 1. Configuration
   All required environment variables are set

✅ 2. Embedding Generation
   Generated 1536-dimensional embedding

✅ 3. Vector Upsert
   Successfully upserted 4 test vectors

✅ 4. Vector Search
   Found 3 results, including relevant matches

✅ 5. Q&A Generation
   Successfully generated relevant answer with correct information

✅ 6. Index Stats
   Index has 4 total vectors

============================================================
✅ ALL TESTS PASSED
============================================================
```

**If any test fails:**

- Check error message for specific issue
- Verify API keys are correct
- Ensure Pinecone index exists with correct settings
- Check network connectivity

---

## Manual Testing

### 2. Seed Test Data

Populate Pinecone with sample messages:

```bash
npm run rag:seed
```

**Expected output:**

```
🌱 Starting RAG seed process...

✓ Configuration loaded
✓ Clients initialized

📝 Processing demo messages...

📤 Upserting 2 vectors to Pinecone...
   Upserted batch 1/1
✓ Vectors upserted successfully

📊 Pinecone Index Stats:
   Total vectors: 6
   Dimension: 1536

✅ Seed process complete!
```

---

### 3. Test RAG Functions

Create a test script `test-rag.ts`:

```typescript
import {
  validateRagSystem,
  printValidationResults,
} from "./src/server/rag/validation";

async function test() {
  const result = await validateRagSystem();
  printValidationResults(result);
}

test();
```

Run:

```bash
npx ts-node test-rag.ts
```

---

### 4. Test Embeddings

```typescript
import { generateEmbedding } from "./src/server/rag/embed";

const text = "This is a test message";
const embedding = await generateEmbedding(text);

console.log("Dimensions:", embedding.length); // Should be 1536
console.log("Sample values:", embedding.slice(0, 5));
```

---

### 5. Test Vector Search

```typescript
import { searchVectors } from "./src/server/rag/index";

const results = await searchVectors(
  "What are we building?",
  "test-conversation",
  3
);

console.log("Results:", results.length);
results.forEach((r, i) => {
  console.log(`${i + 1}. Score: ${r.score.toFixed(4)}`);
  console.log(`   Text: ${r.metadata.text.substring(0, 100)}...`);
});
```

---

### 6. Test Q&A

```typescript
import { answerQuestion } from "./src/server/rag/answer";

const { answer, sources } = await answerQuestion(
  "What database are we using for vectors?",
  "test-conversation"
);

console.log("Answer:", answer);
console.log("Sources:", sources.length);
```

---

### 7. Test Summarization

```typescript
import { summarizeConversation } from "./src/server/rag/answer";

const summary = await summarizeConversation(
  "test-conversation",
  undefined,
  "short"
);

console.log("Summary:", summary);
```

---

## UI Testing

### 8. Test Configuration Check

1. Start app: `npm start`
2. Open in Expo Go
3. Navigate to a conversation
4. Tap Casper ghost button
5. Go to "Ask" tab

**Expected:**

- If configured: Input box should be enabled
- If not configured: Error message with setup instructions

---

### 9. Test Rate Limiting

In Ask tab:

1. Send 10 questions rapidly
2. Try to send 11th question

**Expected:**

- First 10 go through
- 11th shows rate limit error
- Counter shows "0/10 remaining"
- After 1 minute, counter resets

---

### 10. Test Error Handling

**Test missing API key:**

1. Remove `OPENAI_API_KEY` from `.env`
2. Restart Expo
3. Try to use Ask tab

**Expected:**

- Clear error message
- Setup instructions displayed
- No crash

---

## Performance Testing

### 11. Benchmark Embedding Speed

```typescript
import { generateEmbeddings } from "./src/server/rag/embed";

const texts = Array(100).fill("Sample message for testing");
const start = Date.now();
await generateEmbeddings(texts);
const duration = Date.now() - start;

console.log(`100 embeddings in ${duration}ms`);
console.log(`Average: ${duration / 100}ms per embedding`);
```

**Target:** <500ms per embedding

---

### 12. Benchmark Search Speed

```typescript
import { searchVectors } from "./src/server/rag/index";

const start = Date.now();
const results = await searchVectors("test query", "test-conversation", 6);
const duration = Date.now() - start;

console.log(`Search completed in ${duration}ms`);
```

**Target:** <300ms for 6 results

---

### 13. Benchmark Q&A Speed

```typescript
import { answerQuestion } from "./src/server/rag/answer";

const start = Date.now();
const result = await answerQuestion("test question", "test-conversation");
const duration = Date.now() - start;

console.log(`Q&A completed in ${duration}ms`);
```

**Target:** <3000ms end-to-end

---

## Quality Testing

### 14. Test Recall Quality

```bash
npm run rag:validate
```

Check "Recall Quality" section of output.

**Target:**

- Precision: >80%
- Recall: >70%

---

### 15. Test Answer Relevance

Ask these test questions (after seeding):

1. "What vector database are we using?"

   - **Expected:** Mentions Pinecone

2. "What is the deadline for PR 3?"

   - **Expected:** Mentions Friday

3. "Which OpenAI model are we using?"
   - **Expected:** Mentions text-embedding-3-small

---

### 16. Test Summary Quality

Generate summary for test conversation.

**Check for:**

- ✓ Key points covered
- ✓ Decisions highlighted
- ✓ Action items mentioned
- ✓ Appropriate length
- ✓ No hallucinations

---

## Edge Cases

### 17. Empty Conversation

Test with conversation that has no messages:

```typescript
const result = await answerQuestion("test", "empty-conversation");
// Should return "No relevant context found" gracefully
```

---

### 18. Very Long Message

Test chunking with long text (>800 chars):

```typescript
import { chunkText } from "./src/server/rag/index";

const longText = "A".repeat(2000);
const chunks = chunkText(longText);

console.log("Chunks:", chunks.length);
console.log(
  "Sizes:",
  chunks.map((c) => c.length)
);
```

**Expected:**

- Multiple chunks created
- Each <800 chars
- Overlap present

---

### 19. Special Characters

Test with messages containing emojis, URLs, code:

```typescript
const text = "Check this 🚀 https://example.com and `code block`";
const embedding = await generateEmbedding(text);

console.log("Success:", embedding.length === 1536);
```

---

### 20. Concurrent Requests

Test rate limiter with concurrent requests:

```typescript
const promises = Array(20)
  .fill(null)
  .map((_, i) => askQuestion(`Question ${i}`, "test-conversation"));

const results = await Promise.allSettled(promises);
const succeeded = results.filter((r) => r.status === "fulfilled").length;
const failed = results.filter((r) => r.status === "rejected").length;

console.log("Succeeded:", succeeded);
console.log("Failed:", failed);
```

**Expected:**

- First 10 succeed
- Remaining 10 rate-limited

---

## Integration Testing

### 21. End-to-End Flow

1. Send message in conversation
2. (Manually) Index message: `npm run rag:seed`
3. Open Casper panel
4. Ask question about the message
5. Verify answer is correct

---

### 22. Multi-Conversation

Test that search respects conversation boundaries:

1. Seed data for conversation A
2. Seed data for conversation B
3. Search in conversation A
4. Verify results only from A

---

## Regression Testing

### 23. After Code Changes

After modifying RAG code:

```bash
# Run full validation
npm run rag:validate

# Check no TypeScript errors
npm run type-check

# Check no linter errors
npm run lint

# Run Jest tests
npm test
```

---

## Production Readiness Checklist

Before merging PR 3:

- [ ] All validation tests pass
- [ ] Seed script works
- [ ] Q&A returns relevant answers
- [ ] Summaries are coherent
- [ ] Actions extracted correctly
- [ ] Decisions extracted correctly
- [ ] Rate limiting works
- [ ] Error handling graceful
- [ ] Performance within targets
- [ ] No TypeScript errors
- [ ] No linter errors
- [ ] Documentation complete
- [ ] Setup guide clear
- [ ] Cost estimates verified

---

## Known Limitations

1. **No auto-indexing yet** - Messages must be manually seeded
2. **No caching** - Every query hits OpenAI + Pinecone
3. **Rate limits** - Free tiers have usage caps
4. **No streaming** - Answers appear all at once
5. **English only** - Not tested with other languages

These will be addressed in future PRs.

---

## Troubleshooting Test Failures

### Validation fails on Step 1 (Configuration)

- Check `.env` file exists
- Verify all required variables present
- Restart Expo server

### Validation fails on Step 2 (Embeddings)

- Check OpenAI API key is valid
- Verify API key has credits remaining
- Check network connectivity

### Validation fails on Step 3 (Upsert)

- Check Pinecone API key is valid
- Verify index exists and is initialized
- Check index has correct dimensions (1536)

### Validation fails on Step 4 (Search)

- Ensure vectors were upserted successfully
- Check index is not empty
- Verify namespace matches

### Validation fails on Step 5 (Q&A)

- Check all previous steps passed
- Verify OpenAI chat API is accessible
- Check query not triggering safety filters

---

## Success Criteria

✅ All automated tests pass  
✅ Manual testing covers all features  
✅ Performance within targets  
✅ Error handling works  
✅ Documentation accurate  
✅ No regressions introduced

---

**Next:** Proceed to PR 4 (Proactive Signal Detection)
