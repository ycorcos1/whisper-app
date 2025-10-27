# Translator Mode Implementation Guide

## Overview

The Translator Mode is a new feature in the Ask tab that transforms it into a live translation workspace. Users can communicate seamlessly across languages by having messages automatically translated in real-time.

## Features Implemented

### 1. **Translator Toggle**

- Located in the Ask tab header (left side)
- Icon: 🌐 Translate
- Enables/disables translator mode
- Feature flag controlled: `CASPER_ENABLE_TRANSLATOR`

### 2. **Language Selection**

- Dropdown selector with 4 supported languages:
  - 🇬🇧 English
  - 🇪🇸 Spanish
  - 🇫🇷 French
  - 🇮🇹 Italian
- Default language configurable via `TRANSLATOR_DEFAULT_LANGUAGE` flag
- Persists user's language preference using AsyncStorage

### 3. **Real-time Translation**

- **Incoming messages**: Auto-detected language → Translated to user's target language
- **Outgoing messages**: Translated from user's target language → Conversation's language
- **Optimistic UI**: Messages appear immediately while translation happens
- **Translation cache**: Avoids re-translating the same message

### 4. **Chat-like Interface**

- Mimics ChatScreen UI for familiar user experience
- Message bubbles with sender names and timestamps
- "Show/Hide Original" toggle for each message
- "Copy" button for translated text
- Translation indicators showing source language

### 5. **Conversation Language Detection**

- Automatically detects the primary language of the conversation
- Samples recent messages to determine language
- Caches detection results (5-minute TTL)
- Falls back to English if detection fails

### 6. **Error Handling**

- Graceful fallbacks when translation fails
- Shows original text if translation unavailable
- Retry mechanism with exponential backoff (3 attempts)
- User-friendly error messages

### 7. **Performance Optimizations**

- **Translation Cache**: LRU cache (max 100 entries, 1-hour TTL)
- **Rate Limiting**: 500ms delay between translations
- **Batch Processing**: Queue system for multiple translations
- **React.memo**: Memoized message components
- **Incremental Loading**: Progressive message history loading

### 8. **Accessibility**

- Full accessibility labels for screen readers
- Keyboard navigation support in language selector
- ARIA roles for all interactive elements

## Architecture

### File Structure

```
src/agent/
├── CasperTabs/
│   ├── Ask.tsx (modified)
│   └── TranslatorView.tsx (new)
├── components/
│   ├── LanguageSelector.tsx (new)
│   └── TranslatedMessage.tsx (new)
├── translation/
│   ├── types.ts (new)
│   ├── languageDetector.ts (new)
│   ├── translationCache.ts (new)
│   └── translationService.ts (new)
└── ...

src/state/
└── featureFlags.ts (modified)

src/types/
└── agent.ts (modified)
```

### Key Components

#### **TranslatorView**

Main UI component for translator mode. Handles:

- Message history loading (last 50 messages)
- Real-time message listening (Firebase onSnapshot)
- Language detection for conversation
- Translation state management
- Send functionality with auto-translation

#### **LanguageSelector**

Dropdown component for selecting target language:

- Modal-based UI with flag icons
- Accessibility support
- Visual feedback for selected language

#### **TranslatedMessage**

Individual message bubble component:

- Shows translated text by default
- Expandable original text section
- Translation indicators and badges
- Copy functionality
- Memoized for performance

#### **Translation Service Layer**

- **languageDetector.ts**: Detects language of text and conversations
- **translationCache.ts**: LRU cache manager for translations
- **translationService.ts**: High-level API with retry logic and queue

### Data Flow

1. **Enabling Translator Mode**

   ```
   User clicks "Translator" button in Ask tab
   → Ask.tsx sets translatorMode = true
   → TranslatorView renders
   → Loads message history
   → Detects conversation language
   ```

2. **Receiving a Message**

   ```
   Firebase onSnapshot detects new message
   → Detect source language
   → Check if translation needed
   → Translate to user's target language (with cache)
   → Add to message list
   → Scroll to bottom
   ```

3. **Sending a Message**

   ```
   User types in target language
   → Detects conversation's language
   → Translates message to conversation language
   → Sends to Firebase
   → Adds to local state (optimistic UI)
   → Shows "Sent in [Language]" indicator
   ```

4. **Language Change**
   ```
   User selects new target language
   → Saves preference to AsyncStorage
   → Re-translates all visible messages
   → Shows "Re-translating..." banner
   → Updates UI incrementally
   ```

## Feature Flags

### Configuration (src/state/featureFlags.ts)

```typescript
const DEFAULT_FLAGS = {
  CASPER_ENABLE_TRANSLATOR: true,
  TRANSLATOR_DEFAULT_LANGUAGE: "English",
};
```

### Usage

```typescript
const { flags } = useCasperContext();
if (flags.enableTranslator) {
  // Show translator toggle
}
```

## Performance Metrics

### Translation Cache Hit Rate

- **Expected**: 60-80% for re-translations
- **Cache Size**: Max 100 entries
- **TTL**: 1 hour per entry
- **Eviction**: LRU (Least Recently Used)

### Network Requests

- **Initial Load**: 1 query (50 messages) + N language detections (cached)
- **New Message**: 1 detection + 1 translation (if needed)
- **Language Change**: N translations (where N = visible messages)

### Rate Limiting

- **Translation API**: 2 req/sec (500ms delay)
- **Language Detection**: Cached (5-minute TTL)

## Edge Cases Handled

### 1. Same Language Conversation

- Skips translation if source = target
- Shows "No translation needed" indicator
- Avoids unnecessary API calls

### 2. Very Short Messages

- Messages < 10 characters default to English detection
- Prevents false detections on "OK", "Hi", etc.

### 3. Network Offline

- Shows original text if translation fails
- Provides retry button
- Graceful error messages

### 4. Rapid Language Switching

- Debounces re-translation requests
- Shows loading banner during re-translation
- Cancels in-flight requests

### 5. Long Message History

- Loads only last 50 messages initially
- Pull-to-refresh for manual sync
- Progressive loading (incremental UI updates)

### 6. Conversation Switching

- Clears cache for old conversation
- Resets language detection
- Loads new conversation messages

## Testing Checklist

### Functional Testing

- [ ] Toggle translator mode on/off
- [ ] Select each language (English, Spanish, French, Italian)
- [ ] Send message in target language → translates correctly
- [ ] Receive message in foreign language → translates correctly
- [ ] Send message when languages match → no translation
- [ ] Expand/collapse original text
- [ ] Copy translated text
- [ ] Switch conversations in translator mode
- [ ] Pull to refresh message history
- [ ] Back button exits translator mode

### Edge Cases

- [ ] Very short messages (< 10 chars)
- [ ] Very long messages (500 chars)
- [ ] Emoji-only messages
- [ ] Mixed language messages
- [ ] Same language conversations
- [ ] Network offline → send fails gracefully
- [ ] Translation API fails → shows original
- [ ] Rapid language switching

### Performance

- [ ] Load 50 messages < 2 seconds
- [ ] Translation cache reduces duplicate calls
- [ ] No lag when scrolling 50+ messages
- [ ] Language change re-translates smoothly
- [ ] Memory usage stable (no leaks)

### Accessibility

- [ ] VoiceOver/TalkBack reads all elements
- [ ] Language selector keyboard navigable
- [ ] All buttons have aria labels
- [ ] Contrast ratios meet WCAG AA

## Known Limitations

1. **Language Support**: Only 4 languages currently (English, Spanish, French, Italian)
2. **Message History**: Limited to last 50 messages
3. **Translation Quality**: Depends on OpenAI API accuracy
4. **Offline Mode**: Requires network for translations
5. **Cost**: Each translation incurs OpenAI API costs

## Future Enhancements

1. **More Languages**: Add German, Portuguese, Chinese, Japanese
2. **Voice Input**: Speech-to-text in target language
3. **Translation History**: View past translations
4. **Glossary**: Custom translation dictionary
5. **Multi-turn Context**: Pass conversation context to improve translations
6. **Dialect Support**: Regional variations (e.g., Latin American Spanish)
7. **Real-time Typing Indicators**: Show when other user is typing
8. **Smart Suggestions**: Suggest common phrases in target language

## API Costs

### OpenAI API Usage

- **Language Detection**: ~$0.0001 per detection
- **Translation**: ~$0.001-0.003 per translation (depends on length)

### Optimization Strategies

- Cache language detections (5-minute TTL)
- Cache translations (1-hour TTL)
- Batch detections when possible
- Skip translation if languages match
- Rate limit to 2 req/sec

### Cost Estimation (Per User Per Day)

- **Light usage** (10 messages): ~$0.01-0.03
- **Moderate usage** (50 messages): ~$0.05-0.15
- **Heavy usage** (200 messages): ~$0.20-0.60

## Troubleshooting

### Issue: Translations not appearing

- **Check**: Network connectivity
- **Check**: OpenAI API key configured
- **Check**: Feature flag `CASPER_ENABLE_TRANSLATOR` = true
- **Solution**: Retry translation or refresh messages

### Issue: Wrong language detected

- **Cause**: Very short message or ambiguous text
- **Solution**: System defaults to English; user can manually translate

### Issue: Cache not working

- **Check**: AsyncStorage permissions
- **Check**: Cache expiration (1 hour TTL)
- **Solution**: Clear app cache and restart

### Issue: Slow performance

- **Check**: Message count (limit to 50)
- **Check**: Network speed
- **Check**: Rate limiting (500ms delay)
- **Solution**: Reduce message history or use pull-to-refresh

## Migration Notes

### Upgrading from Previous Version

1. No database schema changes required
2. New AsyncStorage key: `@translator_target_language`
3. New feature flags added (see above)
4. No breaking changes to existing Ask tab functionality

### Rollback Plan

1. Set `CASPER_ENABLE_TRANSLATOR` to `false`
2. Translator toggle disappears
3. Ask tab functions normally (Q&A mode only)
4. No data loss

## Support

For issues or questions:

1. Check this documentation
2. Review error logs in console
3. Test with feature flags disabled
4. Verify OpenAI API status

---

**Last Updated**: October 27, 2025
**Version**: 1.0.0
**Author**: AI Assistant
