# PR 4 — Quick Fix Guide

**Issue:** `Unable to resolve module node:stream` error  
**Cause:** Pinecone SDK doesn't work in React Native  
**Solution:** Use Firebase Functions

---

## Quick Fix (5 minutes)

### 1. Configure Firebase Functions

Run these commands to set your API keys:

```bash
cd /Users/yahavcorcos/Desktop/whisper-app

# Set OpenAI key
firebase functions:config:set openai.api_key="YOUR_OPENAI_API_KEY_HERE"

# Set Pinecone keys
firebase functions:config:set pinecone.api_key="YOUR_PINECONE_API_KEY_HERE"
firebase functions:config:set pinecone.index="whisper-casper"
firebase functions:config:set pinecone.environment="us-east-1-aws"

# Verify
firebase functions:config:get
```

### 2. Deploy Functions

```bash
firebase deploy --only functions
```

**Wait:** ~2-3 minutes for deployment

### 3. Test

```bash
npm start
```

Open Casper → Ask tab → Ask a question

---

## What if I don't have API keys yet?

### Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create new key
3. Copy the `sk-...` key

### Get Pinecone API Key

1. Go to https://app.pinecone.io
2. Sign up (free tier)
3. Create index:
   - Name: `whisper-casper`
   - Dimensions: `1536`
   - Metric: `cosine`
   - Environment: `us-east-1-aws` (Starter free)
4. Copy API key from dashboard

---

## Detailed Guide

See `PR4_FIREBASE_FUNCTIONS_FIX.md` for complete architecture explanation.

---

## Status

✅ Code fixed - RAG moved to Firebase Functions  
⏳ Waiting for you to:

1. Set Firebase config (API keys)
2. Deploy functions
3. Test

---

## One-Line Deploy

Once keys are set:

```bash
firebase deploy --only functions && npm start
```

That's it!

