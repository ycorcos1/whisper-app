# API Keys Configuration Fix - PR #7

## Issue

When trying to run a plan, you got this error:

```
FirebaseError: Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable.
```

## Root Cause

The Firebase Functions were deployed but didn't have the required API keys (OpenAI and Pinecone) configured in the Firebase Functions config.

## Fix Applied

### 1. Configured OpenAI API Key

```bash
firebase functions:config:set openai.api_key="YOUR_KEY"
```

✅ OpenAI API key configured

### 2. Configured Pinecone Credentials

```bash
firebase functions:config:set \
  pinecone.api_key="YOUR_KEY" \
  pinecone.index="whisper-casper" \
  pinecone.environment="us-east-1-aws"
```

✅ Pinecone credentials configured

### 3. Redeployed Functions

```bash
firebase deploy --only functions:casperPlan,functions:casperGetPlan,functions:casperListPlans
```

✅ All 3 functions updated successfully

## Configuration Summary

The following environment variables are now set in Firebase Functions:

| Config Key               | Value                              |
| ------------------------ | ---------------------------------- |
| `openai.api_key`         | ✅ Configured                      |
| `openai.embedding_model` | `text-embedding-3-small` (default) |
| `openai.chat_model`      | `gpt-4o-mini` (default)            |
| `pinecone.api_key`       | ✅ Configured                      |
| `pinecone.index`         | `whisper-casper`                   |
| `pinecone.environment`   | `us-east-1-aws`                    |
| `pinecone.namespace`     | `default`                          |
| `vector.top_k`           | `6` (default)                      |

## Test Now! 🚀

The Planner should work now:

1. **Reload your app** (shake → Reload)
2. Open Casper → **Planner tab**
3. Enter: `"Plan team offsite next month in San Francisco"`
4. Tap **"Run Plan"**

You should see:

- ✅ Intent detected
- ✅ Tasks executing in sequence
- ✅ Plan generated with summary

## What Happens Behind the Scenes

When you create a plan:

1. Client calls `casperPlan` function
2. Function uses **OpenAI** to:
   - Detect intent (GPT-4o-mini)
   - Generate plan summaries
   - Extract entities
3. Function uses **Pinecone** to:
   - Search conversation context
   - Retrieve relevant messages
4. Results saved to Firestore
5. UI displays the plan

## Cost Estimate

Per plan creation (approximate):

- **OpenAI API calls**: 3-5 requests (~$0.01-0.02)
- **Pinecone queries**: 2-3 searches (~$0.00)
- **Total**: ~$0.01-0.02 per plan

## Troubleshooting

If you still get errors:

1. **Check Functions Logs:**

   ```bash
   firebase functions:log
   ```

2. **Verify Config:**

   ```bash
   firebase functions:config:get
   ```

3. **Check Pinecone Index:**
   - Make sure `whisper-casper` index exists in Pinecone
   - Verify it's in `us-east-1-aws` region

## Note on Deprecation Warning

You'll see warnings about `functions.config()` being deprecated. This is non-blocking and won't affect your app until March 2026. You can migrate to dotenv later if needed.

---

**Status**: ✅ Fixed - Ready to use!  
**All functions deployed with API keys**  
**Ready for testing**

