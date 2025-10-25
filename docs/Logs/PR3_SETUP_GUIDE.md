# PR 3 Setup Guide — RAG Layer Configuration

**IMPORTANT:** Before you can use the Casper AI features, you must complete this setup.  
The app will show clear error messages if this setup is not completed.

---

## Step 1: Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Give it a name (e.g., "Whisper Casper Dev")
5. Copy the key (starts with `sk-...`)
6. Save it somewhere safe

**Cost:** OpenAI provides $5 free credit for new accounts, which is sufficient for development and testing.

---

## Step 2: Get Pinecone API Key

1. Go to https://app.pinecone.io
2. Sign up for a free account (Starter plan)
3. Verify your email
4. In the console, go to "API Keys"
5. Copy your API key
6. Save it somewhere safe

**Cost:** Pinecone Starter plan is free forever with 100K vectors (sufficient for MVP).

---

## Step 3: Create Pinecone Index

1. In Pinecone console, click "Create Index"
2. Configure the index:
   ```
   Name: whisper-casper
   Dimensions: 1536
   Metric: cosine
   Cloud: AWS
   Region: us-east-1
   ```
3. Click "Create Index"
4. Wait ~1 minute for index to initialize

**Why 1536 dimensions?**  
We use OpenAI's `text-embedding-3-small` model which produces 1536-dimensional embeddings. This is more cost-effective than the older Ada-002 model.

---

## Step 4: Configure Environment Variables

### Option A: Create `.env` file (Recommended)

Create a `.env` file in the project root:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-key-here

# Pinecone Configuration
PINECONE_API_KEY=your-pinecone-key-here
PINECONE_INDEX=whisper-casper
PINECONE_ENV=us-east-1-aws

# Vector Search Configuration
VECTOR_NAMESPACE=default
VECTOR_TOP_K=6
```

### Option B: Export environment variables

In your terminal:

```bash
export OPENAI_API_KEY="sk-your-key-here"
export PINECONE_API_KEY="your-pinecone-key-here"
export PINECONE_INDEX="whisper-casper"
export PINECONE_ENV="us-east-1-aws"
export VECTOR_NAMESPACE="default"
export VECTOR_TOP_K="6"
```

---

## Step 5: Restart Expo Server

```bash
# Stop the current server (Ctrl+C)
npm start
```

The app will now load the environment variables from `app.config.ts`.

---

## Step 6: Validate Setup

Run the validation script to ensure everything is configured correctly:

```bash
npm run rag:validate
```

You should see output like:

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

If any tests fail, check the error messages for troubleshooting steps.

---

## Step 7: Seed Test Data (Optional)

To test the RAG system with sample data:

```bash
npm run rag:seed
```

This will:

1. Generate embeddings for demo messages
2. Upsert them to Pinecone
3. Display index statistics

---

## Common Issues

### ❌ "Missing required environment variables"

**Problem:** Environment variables not loaded  
**Solution:**

1. Ensure `.env` file exists and is in project root
2. Restart Expo server
3. Check that `app.config.ts` is loading the variables

### ❌ "Invalid API key"

**Problem:** API key is incorrect or expired  
**Solution:**

1. Double-check the API key (no extra spaces)
2. Verify the key is active in OpenAI/Pinecone console
3. Generate a new key if needed

### ❌ "Pinecone index not found"

**Problem:** Index doesn't exist or name is wrong  
**Solution:**

1. Check index name in Pinecone console
2. Ensure it matches `PINECONE_INDEX` in `.env`
3. Wait for index initialization to complete

### ❌ "Dimension mismatch"

**Problem:** Index has wrong dimensions  
**Solution:**

1. Delete the index in Pinecone console
2. Recreate with dimensions = 1536
3. Restart validation

### ❌ "Rate limit exceeded"

**Problem:** Too many requests to OpenAI/Pinecone  
**Solution:**

1. Wait a few minutes
2. Reduce batch sizes if seeding large datasets
3. Check your API quota in provider console

---

## Verification Checklist

Before proceeding to use Casper features:

- [ ] OpenAI API key obtained and added to `.env`
- [ ] Pinecone API key obtained and added to `.env`
- [ ] Pinecone index created with correct settings
- [ ] Environment variables loaded in `app.config.ts`
- [ ] Expo server restarted
- [ ] Validation suite passing (`npm run rag:validate`)
- [ ] (Optional) Test data seeded

---

## Next Steps

Once setup is complete, you can:

1. **Use the Ask Tab:** Ask natural language questions about conversations
2. **Generate Summaries:** Get AI summaries of conversations
3. **Extract Actions:** Automatically find action items
4. **Extract Decisions:** Automatically find decisions

These features will be fully wired up in subsequent PRs (PR 4-6).

---

## Cost Monitoring

### OpenAI Usage

Check usage at: https://platform.openai.com/usage

Estimated costs:

- **Embeddings:** ~$0.02 per 1,000 messages
- **Q&A:** ~$0.15 per 1,000 questions

### Pinecone Usage

Check usage at: https://app.pinecone.io/organizations

Starter plan includes:

- **100K vectors** (enough for ~20K messages with chunking)
- **Unlimited queries**

---

## Support

If you encounter issues not covered here:

1. Check Pinecone status: https://status.pinecone.io
2. Check OpenAI status: https://status.openai.com
3. Review error messages in terminal
4. Check the validation suite output for specific failures

---

**Setup complete!** ✅  
You're now ready to use Casper AI features.
