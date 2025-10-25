# Casper RAG System

AI-powered conversation analysis using Retrieval Augmented Generation (RAG).

## Overview

The Casper RAG system provides:

- **Semantic Search**: Find relevant messages by meaning, not just keywords
- **Q&A**: Ask natural language questions about conversations
- **Summarization**: Generate structured summaries of conversations
- **Action Extraction**: Automatically identify action items and tasks
- **Decision Extraction**: Extract final decisions and agreements

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Casper UI                             │
│         (Ask, Summary, Actions, Decisions, Digest)           │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │   useCasperRag() Hook         │
         │   (React Native)              │
         └───────────┬───────────────────┘
                     │
                     ▼
         ┌───────────────────────────────┐
         │   src/server/rag/answer.ts    │
         │   (LangChain + Prompts)       │
         └───────┬───────────────┬───────┘
                 │               │
        ┌────────▼────────┐     │
        │ embed.ts        │     │
        │ (OpenAI)        │     │
        └─────────────────┘     │
                                │
                     ┌──────────▼──────────┐
                     │   index.ts          │
                     │   (Pinecone)        │
                     └─────────────────────┘
```

## Stack

- **Vector Database**: Pinecone (free Starter plan)
- **Embeddings**: OpenAI `text-embedding-3-small` (1536d, $0.00002/1K tokens)
- **LLM**: OpenAI `gpt-4o-mini` ($0.00015/1K tokens)
- **Framework**: LangChain (for prompting and chains)
- **Client**: React Native (Expo)

## Setup

### Prerequisites

1. **OpenAI API Key**

   - Get from: https://platform.openai.com/api-keys
   - Free tier: $5 credit (~25K embeddings + 30K queries)

2. **Pinecone Account**

   - Sign up: https://app.pinecone.io
   - Free tier: 100K vectors, unlimited queries, forever free

3. **Pinecone Index**
   - Name: `whisper-casper`
   - Dimensions: `1536`
   - Metric: `cosine`
   - Region: `us-east-1-aws` (or preferred)

### Installation

1. Clone and install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` file:

   ```bash
   # OpenAI
   OPENAI_API_KEY=sk-...

   # Pinecone
   PINECONE_API_KEY=...
   PINECONE_INDEX=whisper-casper
   PINECONE_ENV=us-east-1-aws

   # Vector Search
   VECTOR_NAMESPACE=default
   VECTOR_TOP_K=6
   ```

3. Restart Expo:

   ```bash
   npm start
   ```

4. Validate setup:
   ```bash
   npm run rag:validate
   ```

See `docs/MVP Logs/PR3_SETUP_GUIDE.md` for detailed instructions.

## Usage

### In React Components

```typescript
import { useCasperRag } from './agent/useCasperRag';

function MyComponent() {
  const {
    askQuestion,
    getSummary,
    loading,
    error
  } = useCasperRag();

  const handleAsk = async () => {
    const result = await askQuestion(
      "What did we decide about the API?",
      conversationId
    );

    if (result) {
      console.log(result.answer);
      console.log(result.sources); // With citations
    }
  };

  return (
    // ... UI
  );
}
```

### Direct API Calls

```typescript
import { answerQuestion } from "./server/rag/answer";

const { answer, sources } = await answerQuestion(
  "What are the next steps?",
  conversationId,
  6 // topK results
);
```

## API Reference

### `useCasperRag()` Hook

#### State

- `loading: boolean` - Request in progress
- `error: string | null` - Error message if any
- `configured: boolean` - RAG system properly configured

#### Methods

**`askQuestion(question, conversationId)`**

- Ask natural language question
- Returns: `{ question, answer, sources, timestamp }`

**`getSummary(conversationId, length?, focusQuery?)`**

- Generate conversation summary
- `length`: `'short' | 'normal' | 'long'`
- Returns: Summary text

**`getActions(conversationId)`**

- Extract action items
- Returns: `Array<{ title, assignee?, due?, context }>`

**`getDecisions(conversationId)`**

- Extract decisions
- Returns: `string[]`

**`clearError()`**

- Clear error state

### Core Functions

See `src/server/rag/answer.ts` for direct function usage.

## Data Flow

### Message → Vector Storage

1. User sends message in conversation
2. (Future: Cloud Function trigger)
3. Message text normalized and chunked
4. Chunks embedded via OpenAI
5. Vectors upserted to Pinecone with metadata:
   - `cid`: Conversation ID
   - `mid`: Message ID
   - `text`: Normalized text
   - `createdAt`: Timestamp
   - `userId`: Sender ID

### Query → Answer

1. User asks question in Ask tab
2. Question embedded via OpenAI
3. Pinecone returns top-K similar vectors
4. Context formatted with message text + timestamps
5. LangChain prompts OpenAI with context
6. Answer generated with citations
7. Result displayed in UI

## Performance

Benchmarks (on free tiers):

- **Embedding**: ~200-500ms per message
- **Search**: ~100-300ms for 6 results
- **Q&A**: ~1-3s total (embed + search + generate)
- **Summary**: ~2-5s depending on length
- **Batch upsert**: ~500ms per 100 vectors

## Cost Analysis

### Development (per month)

**OpenAI:**

- 1,000 messages indexed: ~$0.20
- 500 Q&A queries: ~$0.75
- **Monthly total**: ~$1.00

**Pinecone:**

- Storage: Free (up to 100K vectors)
- Queries: Free (unlimited)
- **Monthly total**: $0.00

### Production (per 10K users)

**OpenAI:**

- 100K messages/day: ~$20/day
- 10K queries/day: ~$15/day
- **Monthly total**: ~$1,050

**Pinecone:**

- Need paid plan for scale
- Standard: $70/month (5M vectors)

## Validation & Testing

### Automated Validation

```bash
npm run rag:validate
```

Runs 6-step validation:

1. ✅ Configuration check
2. ✅ Embedding generation
3. ✅ Vector upsert
4. ✅ Vector search
5. ✅ Q&A generation
6. ✅ Index stats

### Manual Testing

1. Seed test data:

   ```bash
   npm run rag:seed
   ```

2. Open app in Expo Go

3. Navigate to conversation

4. Tap Casper ghost button

5. Go to Ask tab

6. Type question and send

7. Verify answer appears with sources

### Quality Metrics

- **Precision**: % of retrieved messages relevant to query
- **Recall**: % of relevant messages successfully retrieved
- **Latency**: Time from query to answer
- **Cost**: $ per query

Target metrics:

- Precision: >80%
- Recall: >70%
- Latency: <3s
- Cost: <$0.01 per query

## Troubleshooting

### Common Issues

**"Missing required environment variables"**

- Ensure `.env` exists in project root
- Restart Expo server
- Check `app.config.ts` loading vars

**"Invalid API key"**

- Verify key in OpenAI/Pinecone console
- Check for extra spaces in `.env`
- Generate new key if needed

**"Index not found"**

- Create index in Pinecone console
- Verify name matches `PINECONE_INDEX`
- Wait for initialization (~1 min)

**"Dimension mismatch"**

- Delete and recreate index with dim=1536
- Ensure using `text-embedding-3-small`

**"Rate limit exceeded"**

- Wait a few minutes
- Check API quotas
- Reduce request frequency

**Poor answer quality**

- Ensure messages are indexed (run seed script)
- Try more specific questions
- Check that topK is sufficient (6-12)

### Debug Mode

Set environment variable:

```bash
DEBUG=rag:*
```

Logs will show:

- Embedding requests
- Search queries and scores
- LLM prompts and responses
- Error details

## Roadmap

### PR 3 (Current)

- ✅ Core RAG infrastructure
- ✅ OpenAI embeddings
- ✅ Pinecone integration
- ✅ LangChain Q&A
- ✅ Validation suite

### PR 4 (Next)

- [ ] Proactive signal detection
- [ ] Priority thread identification
- [ ] Digest generation

### PR 5

- [ ] Wire Ask tab to RAG
- [ ] Q&A history UI
- [ ] Source citation display

### PR 6

- [ ] Multi-step agent orchestration
- [ ] Tool calling
- [ ] Plan generation

### Future

- [ ] Auto-indexing on message create
- [ ] Background embedding jobs
- [ ] Query caching
- [ ] Incremental updates
- [ ] Multi-language support

## Resources

- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Pinecone Quickstart](https://docs.pinecone.io/docs/quickstart)
- [LangChain RAG Tutorial](https://js.langchain.com/docs/tutorials/rag)
- [PR3 Setup Guide](./docs/MVP%20Logs/PR3_SETUP_GUIDE.md)
- [PR3 Complete Log](./docs/MVP%20Logs/PR3_MEMORY_RAG_COMPLETE.md)

## Support

Questions or issues?

1. Check validation output: `npm run rag:validate`
2. Review setup guide: `docs/MVP Logs/PR3_SETUP_GUIDE.md`
3. Check provider status pages
4. Review error logs in terminal

---

**Status**: ✅ PR 3 Complete  
**Next**: PR 4 - Proactive Signal Detection
