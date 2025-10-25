# PR 4 — Firebase Functions Architecture Fix

**Issue:** Pinecone SDK requires Node.js and cannot run in React Native/Expo  
**Solution:** Move RAG operations to Firebase Functions (backend), call from client  
**Status:** ✅ Fixed  
**Date:** October 23, 2025

---

## What Changed

### ❌ Before (Broken)

```
React Native App (src/)
  ├── server/rag/        ← Tried to import Pinecone directly
  │   ├── index.ts       ← node:stream error!
  │   ├── embed.ts
  │   └── answer.ts
  └── agent/qa/
      └── controller.ts  ← Imported from src/server/rag
```

**Problem:** Pinecone SDK uses Node.js built-in modules (`node:stream`, `fs`, etc.) that don't exist in React Native.

### ✅ After (Fixed)

```
React Native App (src/)
  ├── services/
  │   └── casperApi.ts        ← Calls Firebase Functions
  └── agent/qa/
      └── controller.ts        ← Uses casperApi service

Firebase Functions (functions/src/)
  └── rag/
      ├── config.ts            ← Reads Firebase config
      ├── index.ts             ← Pinecone operations
      ├── embed.ts             ← OpenAI embeddings
      ├── answer.ts            ← LangChain RAG
      └── functions.ts         ← Callable functions
```

**Solution:** RAG logic runs in Firebase Functions (Node.js), client calls via `httpsCallable`.

---

## Setup Instructions

### Step 1: Install Firebase CLI (if not already)

```bash
npm install -g firebase-tools
firebase login
```

### Step 2: Initialize Firebase Project (if not already)

```bash
cd /Users/yahavcorcos/Desktop/whisper-app
firebase init

# Select:
# - Functions (already set up)
# - Use existing project
```

### Step 3: Configure Firebase Functions Environment

Firebase Functions use `firebase functions:config` instead of `.env`. Set your API keys:

```bash
# OpenAI Configuration
firebase functions:config:set openai.api_key="YOUR_OPENAI_API_KEY"
firebase functions:config:set openai.embedding_model="text-embedding-3-small"
firebase functions:config:set openai.chat_model="gpt-4o-mini"

# Pinecone Configuration
firebase functions:config:set pinecone.api_key="YOUR_PINECONE_API_KEY"
firebase functions:config:set pinecone.index="whisper-casper"
firebase functions:config:set pinecone.environment="us-east-1-aws"
firebase functions:config:set pinecone.namespace="default"

# Vector Configuration (optional)
firebase functions:config:set vector.top_k="6"
```

**Verify configuration:**

```bash
firebase functions:config:get
```

### Step 4: Deploy Firebase Functions

```bash
cd functions
npm install  # If not already done
cd ..
firebase deploy --only functions
```

This will deploy:

- `casperSearch` - Vector search function
- `casperAnswer` - Question answering function
- `generateThumbnail` - Existing image thumbnail function

**Deployment time:** ~2-3 minutes

### Step 5: Update Firebase Security Rules (if needed)

Ensure authenticated users can call these functions. The functions already check `context.auth`.

### Step 6: Test the Setup

Run your Expo app:

```bash
npm start
```

Open Casper → Ask tab → Ask a question.

**Expected behavior:**

- Template mode: Should work immediately (calls `casperSearch` + local template generation)
- LLM mode: Requires `CASPER_ENABLE_LLM=true` and calls `casperAnswer` with `useLLM: true`

---

## Architecture Details

### Client → Functions Flow

```
┌─────────────────────────────────────┐
│ React Native App                    │
│                                     │
│ User asks question                  │
│       ↓                             │
│ qa/controller.ts                    │
│       ↓                             │
│ services/casperApi.ts               │
│   - searchVectors()                 │
│   - answerQuestion()                │
│       ↓                             │
│ Firebase SDK (httpsCallable)        │
└──────────────┬──────────────────────┘
               │
               │ HTTPS
               ↓
┌──────────────────────────────────────┐
│ Firebase Functions (Node.js)         │
│                                      │
│ functions.casperSearch               │
│   ↓                                  │
│ rag/index.ts → Pinecone              │
│   ↓                                  │
│ Returns vector search results        │
│                                      │
│ functions.casperAnswer               │
│   ↓                                  │
│ rag/answer.ts → OpenAI (if useLLM)   │
│   ↓                                  │
│ Returns answer + sources             │
└──────────────────────────────────────┘
```

### Functions Exposed

#### 1. `casperSearch`

**Input:**

```typescript
{
  query: string;
  conversationId?: string;
  topK?: number;
}
```

**Output:**

```typescript
{
  success: boolean;
  results: SearchResult[];
}
```

#### 2. `casperAnswer`

**Input:**

```typescript
{
  question: string;
  conversationId: string;
  topK?: number;
  useLLM?: boolean;
}
```

**Output:**

```typescript
{
  success: boolean;
  answer: string;
  sources: SearchResult[];
  mode: "template" | "llm";
}
```

---

## Local Development

### Using Firebase Emulator

For local development without deploying:

```bash
# Start emulators
firebase emulators:start

# In another terminal
npm start
```

**Configure client to use emulator:**

```typescript
// src/lib/firebase.ts
import { connectFunctionsEmulator } from "firebase/functions";

const functions = getFunctions(app);

if (__DEV__) {
  connectFunctionsEmulator(functions, "localhost", 5001);
}
```

### Local Functions Config

For emulator, create `functions/.runtimeconfig.json`:

```json
{
  "openai": {
    "api_key": "YOUR_OPENAI_API_KEY",
    "embedding_model": "text-embedding-3-small",
    "chat_model": "gpt-4o-mini"
  },
  "pinecone": {
    "api_key": "YOUR_PINECONE_API_KEY",
    "index": "whisper-casper",
    "environment": "us-east-1-aws",
    "namespace": "default"
  },
  "vector": {
    "top_k": "6"
  }
}
```

**Note:** Add `.runtimeconfig.json` to `.gitignore`!

---

## Cost Implications

### Firebase Functions (Free Tier)

- **Invocations:** 2M/month free
- **Compute:** 400K GB-seconds/month free
- **Network:** 5GB/month free

**Estimated usage (PR 4):**

- 10 questions/minute rate limit per user
- ~1 second per question (template mode)
- ~2-3 seconds per question (LLM mode)

**Conservative estimate:** < 100K invocations/month for 10 active users

### OpenAI Costs (LLM Mode Only)

**Only if `CASPER_ENABLE_LLM=true`:**

- **Embeddings:** `text-embedding-3-small` - $0.00002/1K tokens
- **Chat:** `gpt-4o-mini` - $0.00015/1K input, $0.0006/1K output

**Estimated per question:**

- Embedding: ~$0.0001
- Chat (with 8 sources): ~$0.001-0.002

**Monthly (100 questions/user, 10 users):** ~$10-20

**Recommendation:** Keep `CASPER_ENABLE_LLM=false` (template mode) for development.

---

## Troubleshooting

### "Function not found: casperSearch"

**Fix:** Deploy functions

```bash
firebase deploy --only functions
```

### "Missing required Firebase Functions config"

**Fix:** Set environment variables

```bash
firebase functions:config:set openai.api_key="YOUR_KEY"
# ... etc
```

### "unauthenticated" error

**Fix:** Ensure user is logged in. Functions check `context.auth`.

### Slow responses

- **Template mode:** Should be < 1 second
- **LLM mode:** 2-3 seconds normal (OpenAI API latency)
- **First call (cold start):** May take 5-10 seconds (Firebase spins up container)

**Solution for cold starts:** Keep functions warm with scheduled pings (future enhancement)

### CORS errors

**Should not occur** with `httpsCallable`. If you see CORS errors, you're likely using `fetch()` instead of Firebase SDK.

---

## Migration Checklist

- [x] Delete `src/server/` directory
- [x] Move RAG logic to `functions/src/rag/`
- [x] Create `casperApi.ts` client service
- [x] Update `qa/controller.ts` to use `casperApi`
- [x] Delete `useCasperRag.ts` (obsolete)
- [ ] Set Firebase Functions config (Step 3)
- [ ] Deploy Functions (Step 4)
- [ ] Test Ask tab with deployed functions
- [ ] Update `.env` if enabling LLM mode

---

## Files Modified

### Created

- `functions/src/rag/config.ts` - Functions environment config
- `functions/src/rag/functions.ts` - Callable functions
- `src/services/casperApi.ts` - Client-side API wrapper

### Modified

- `functions/src/index.ts` - Export RAG functions
- `src/agent/qa/controller.ts` - Use casperApi instead of direct imports

### Deleted

- `src/server/` (entire directory)
- `src/agent/useCasperRag.ts` (obsolete)

---

## Next Steps

1. **Deploy Functions** (Step 4 above)
2. **Test Ask tab** - Should work with template mode immediately
3. **Optional:** Enable LLM mode with `CASPER_ENABLE_LLM=true`
4. Continue to **PR 5** - Summary & Digest

---

## Summary

The architecture is now **correct for React Native**:

✅ React Native client calls Firebase Functions  
✅ Firebase Functions handle Pinecone/OpenAI (Node.js)  
✅ No Node.js modules in React Native code  
✅ Clean separation of concerns

**The `node:stream` error is resolved!**

Deploy the functions and you're ready to test PR 4.
