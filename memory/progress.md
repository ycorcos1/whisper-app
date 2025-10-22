# Whisper — Development Progress

**Project Start Date:** October 20, 2025  
**Current Status:** PR #12 Complete — Persistence Hardening + Logout Hygiene

---

## Milestone Tracking

### Phase 1: Foundation (PRs #1-#2)

- [x] **PR #1** — Repo Scaffolding + Navigation + Env Protocol ✅
- [x] **PR #2** — Firebase Wiring (Auth/Firestore/RTDB/Storage) ✅

### Phase 2: Core Features (PRs #3-#5)

- [x] **PR #3** — Authentication (Email/Password) ✅
- [x] **PR #4** — Conversations (Create + List) ✅
- [x] **PR #5** — Messaging Core + Optimistic UI + Persistence ✅

### Phase 3: Real-time Features (PRs #6-#7)

- [x] **PR #6** — Presence & Typing (RTDB) ✅
- [x] **PR #7** — Delivery States + Read Receipts ✅

### Phase 4: Media & Profiles (PRs #8-#9)

- [ ] **PR #8** — Image Messaging + Thumbnail Function
- [ ] **PR #9** — User Profiles + Avatars

### Phase 5: Advanced Features (PRs #10-#12)

- [x] **PR #10** — Group Chats (3+ Users) ✅
- [x] **PR #11** — In-App Notifications + Timestamps ✅
- [x] **PR #12** — Persistence Hardening + Logout Hygiene ✅

### Phase 6: Quality & Documentation (PRs #13-#14)

- [ ] **PR #13** — Testing & CI Verification
- [ ] **PR #14** — Emulator Runbook + Final QA

---

## PR #1 — Repo Scaffolding ✅

**Completed:** October 20, 2025  
**Duration:** Initial setup  
**Files Changed:** 30+ files created

### What Was Built

1. **Project Configuration**

   - Expo TypeScript app with strict mode
   - ESLint, Jest, and TypeScript configurations
   - Environment variable system with validation script
   - CI/CD pipeline with GitHub Actions

2. **Design System**

   - Complete theme implementation (colors, typography, spacing)
   - Purple/silver color palette
   - Dark mode as default
   - Glassmorphic design tokens

3. **Navigation Structure**

   - Root navigator with auth flow
   - Bottom tab navigation (Conversations, Profile)
   - Stack navigation for Chat and NewChat screens
   - Type-safe navigation parameters

4. **Core Screens**

   - AuthScreen (login/signup UI)
   - ConversationsScreen (chat list)
   - ProfileScreen (user profile)
   - ChatScreen (message view)
   - NewChatScreen (user selection)

5. **Infrastructure**
   - Environment validation script
   - GitHub Actions CI workflow
   - Memory Bank structure
   - Documentation folder with all specs

### Technical Decisions

- **Navigation:** React Navigation v6 (Stack + Bottom Tabs)
- **Styling:** StyleSheet API with centralized theme
- **Type Safety:** Strict TypeScript with no implicit any
- **Testing:** Jest with React Native Testing Library
- **CI/CD:** GitHub Actions with predev + verify commands

### Blockers / Notes

- Firebase configuration required before PR #2
- User needs to create Firebase project and populate .env
- Asset files (icon.png, splash.png) need to be added manually

---

## PR #2 — Firebase Wiring ✅

**Completed:** October 20, 2025  
**Duration:** Same day  
**Files Changed:** 10+ files created

### What Was Built

1. **Firebase Integration**

   - Complete Firebase service initialization in `src/lib/firebase.ts`
   - Auth, Firestore, Realtime Database, and Storage configured
   - Environment variable loading via `app.config.ts`
   - Type-safe Firebase SDK exports for easy importing

2. **Security Rules**

   - Firestore rules (`firestore.rules`) for users, conversations, messages
   - Storage rules (`storage.rules`) for profile pictures and message media
   - Realtime Database rules (`database.rules.json`) for presence and typing
   - Member-based access control for conversations

3. **Cloud Functions Structure**

   - Functions directory with TypeScript configuration
   - Placeholder for thumbnail generation (PR #8)
   - Ready for deployment with `firebase deploy --only functions`

4. **Firebase Configuration**

   - `firebase.json` with all services configured
   - `firestore.indexes.json` for composite indexes
   - `FIREBASE_SETUP.md` with deployment instructions
   - Emulator configuration for local testing

5. **Code Quality**
   - All TypeScript type checks pass
   - ESLint validation successful
   - Proper error handling in Firebase initialization
   - Offline persistence enabled for Firestore

### Technical Decisions

- **Firestore Persistence:** Using `experimentalForceLongPolling` for React Native compatibility
- **Auth Persistence:** Handled automatically by Firebase SDK in React Native
- **Error Handling:** Graceful fallbacks for already-initialized services
- **Security:** Member-based access control in all rules

### Documentation Created

- `FIREBASE_SETUP.md` — Comprehensive guide for deploying rules and functions
- Inline code documentation in `src/lib/firebase.ts`
- Security rule comments explaining each permission

## PR #3 — Authentication ✅

**Completed:** October 20, 2025  
**Duration:** Same day  
**Files Changed:** 3 new files, 4 modified

### What Was Built

1. **User Type Definitions**

   - User interface with all profile fields
   - SignupData and LoginData interfaces
   - Proper TypeScript typing throughout

2. **Authentication Context**

   - Complete auth state management
   - Signup with email/password/displayName
   - Login with email/password
   - Logout with confirmation
   - Auth state persistence (automatic)
   - Error handling with friendly messages
   - Loading states for all operations

3. **Auth Hooks**

   - `useAuth()` — Full auth context access
   - `useIsAuthenticated()` — Check auth status
   - `useCurrentUser()` — Get user profile

4. **Functional Auth Screen**

   - Toggle between login/signup modes
   - Form validation (email, password, name)
   - Loading states with spinner
   - Error display with alerts
   - Keyboard handling
   - Disabled states during submission

5. **Route Guarding**

   - Dynamic navigation based on auth state
   - Loading screen while checking auth
   - Smooth transitions between screens
   - Auth screen for logged out users
   - Home tabs for logged in users

6. **User Profile Integration**

   - Create Firestore profile on signup
   - Load profile on login
   - Display real user data in Profile screen
   - Last seen timestamp updates
   - Online status tracking
   - Logout functionality

### Technical Decisions

- **Auth Persistence:** Handled automatically by Firebase SDK
- **User Profiles:** Stored in Firestore `/users/{uid}` collection
- **Error Messages:** User-friendly, no sensitive info exposed
- **Validation:** Client-side validation before Firebase calls
- **Loading States:** Global loading state in AuthContext

### Data Structure

```typescript
/users/{uid}
{
  uid: string,
  email: string,
  displayName: string,
  photoURL: null,
  createdAt: Timestamp,
  lastSeen: Timestamp,
  isOnline: boolean
}
```

### Testing Checklist

- [ ] Sign up with new email/password
- [ ] Verify Firestore user document created
- [ ] Logout and confirm navigation
- [ ] Login with same credentials
- [ ] Close and reopen app (persistence test)
- [ ] Test form validation errors
- [ ] Test Firebase error messages

---

## PR #4 — Conversations (Create + List) ✅

**Completed:** October 21, 2025  
**Duration:** Same day  
**Files Changed:** 1 new API file, 2 screens modified

### What Was Built

1. **Conversations API**

   - Real-time conversation subscription with Firestore
   - Create direct message conversations
   - Delete conversations
   - Sort by `updatedAt` descending
   - User lookup by email
   - Automatic member list resolution

2. **NewChatScreen**

   - User search by email
   - Create direct conversations
   - Navigate to chat on creation
   - Input validation
   - Loading states

3. **ConversationsScreen Enhancements**

   - Real-time conversation list
   - Swipe-to-delete gestures
   - Bulk delete with select mode
   - Avatar fallbacks (first letter)
   - Last message preview
   - Timestamp display
   - Empty state handling

### Technical Decisions

- **Conversation Structure:** Members array for access control
- **Real-time Sync:** Firestore `onSnapshot` listener
- **User Lookup:** Async email-to-UID resolution
- **Sort Order:** `updatedAt` timestamp (most recent first)
- **Limit:** 50 conversations max (configurable)

### Data Structure

```typescript
/conversations/{cid}
{
  members: [uid1, uid2],
  type: "dm" | "group",
  lastMessage: {
    text: string,
    senderId: string,
    timestamp: Timestamp
  },
  updatedAt: Timestamp
}
```

---

## PR #5 — Messaging Core + Optimistic UI + Persistence ✅

**Completed:** October 21, 2025  
**Duration:** Same day  
**Files Changed:** 4 new files, 3 modified

### What Was Built

1. **Messages API** (`src/features/messages/api.ts`)

   - Real-time message subscription with 30-message pagination
   - Send text messages with optimistic UI support
   - Send image messages (prepared for PR #8)
   - Update message status (prepared for PR #7)
   - Automatic conversation updates on new messages
   - Proper timestamp handling

2. **Persistence Layer** (`src/features/messages/persistence.ts`)

   - Schema versioning with `APP_STATE_SCHEMA_VERSION = 1`
   - Migration runner for future schema changes
   - Draft management (save/load/clear per conversation)
   - Scroll position persistence per conversation
   - Outbound queue for offline messages
   - Retry logic with exponential backoff
   - Theme preferences storage
   - Cache clearing on logout (preserves prefs)

3. **Optimistic UI Hook** (`src/features/messages/useOptimisticMessages.ts`)

   - Instant message display on send
   - Automatic queue processing
   - Retry failed messages (up to 6 attempts)
   - Message deduplication by tempId
   - Server confirmation detection
   - Error state management

4. **ChatScreen Enhancements**

   - Real-time message subscription
   - Optimistic UI with visual feedback
   - Draft auto-save (500ms debounce)
   - Draft restoration on open
   - Scroll position restoration
   - Loading spinner for initial load
   - Message status indicators
   - Proper keyboard handling
   - Activity indicators for sending state
   - Error messages for failed sends

5. **App Integration**

   - Migration runner in `App.tsx` on startup
   - Cache clearing in logout flow
   - Proper cleanup on unmount

### Technical Decisions

- **Optimistic UI:** Reduced opacity (0.7) + spinner for sending messages
- **Retry Logic:** Exponential backoff (1s → 2s → 4s → 8s → 16s → 32s), max 6 retries
- **Queue Processing:** Every 5 seconds + on-demand
- **Draft Debounce:** 500ms to reduce writes
- **Scroll Throttle:** 400ms to reduce storage writes
- **Pagination:** 30 messages (configurable)
- **Schema Version:** Tracked in AsyncStorage for migrations

### Data Flow

**Sending:**

1. User presses send → input cleared
2. Optimistic message added (tempId)
3. Message queued in AsyncStorage
4. Queue processor attempts send
5. On success: remove from queue, server replaces optimistic
6. On failure: retry with backoff

**Receiving:**

1. Firestore listener fires on new message
2. Message converted to local format
3. Merged with optimistic messages
4. Deduplicated by tempId
5. Sorted by timestamp
6. Rendered in FlatList

### Data Structure

```typescript
/conversations/{cid}/messages/{mid}
{
  senderId: string,
  type: "text" | "image",
  text?: string,
  image?: {
    url: string,
    thumbnailUrl?: string
  },
  timestamp: Timestamp,
  status: "sending" | "sent" | "delivered" | "read",
  tempId?: string  // For optimistic UI
}
```

### AsyncStorage Keys

- `@whisper:schema_version` — Current schema version
- `@whisper:drafts` — Draft messages by conversation ID
- `@whisper:scroll_positions` — Scroll positions by conversation ID
- `@whisper:outbound_queue` — Queued messages for retry
- `@whisper:selected_conversation` — Last opened conversation
- `@whisper:theme_prefs` — User theme preferences (survives logout)

### Testing Checklist

- [x] Message appears instantly on send (optimistic UI)
- [x] Draft survives app restart
- [x] Scroll position restored on reopen
- [x] Messages sync in real-time
- [x] Offline messages queued and sent later
- [x] Failed messages show error state
- [x] Retry logic with exponential backoff
- [x] No duplicate sends on reconnect
- [x] Cache cleared on logout (except prefs)

---

## PR #6 — Presence & Typing Indicators ✅

**Status:** Complete  
**Branch:** `feature/pr06-presence`  
**Completed:** October 21, 2025

### Summary

Implemented real-time presence tracking and typing indicators using Firebase Realtime Database (RTDB). Users can now see online/offline status and know when others are typing in real-time.

### Features Implemented

#### 1. Presence Management (`src/features/presence/usePresence.ts`)

- **Heartbeat System:** Sends presence update every 25 seconds
- **Idle Detection:** Marks user offline after 60 seconds of inactivity
- **Auto Disconnect:** Uses RTDB onDisconnect to handle app crashes/disconnections
- **AppState Integration:** Detects when app goes to background/foreground
- **Activity Tracking:** Maintains last activity timestamp

#### 2. User Presence Subscription (`src/features/presence/useUserPresence.ts`)

- Real-time subscription to another user's presence status
- Returns online status and last active timestamp
- Cleans up subscriptions on unmount

#### 3. Typing Indicators (`src/features/presence/useTypingIndicator.ts`)

- **Debounced Typing:** 250ms debounce before showing "typing"
- **Auto-clear TTL:** Typing status cleared after 2s of inactivity
- **Multi-user Support:** Tracks typing status for all users in a conversation
- **Clean Lifecycle:** Properly clears typing on send/unmount

#### 4. UI Components

**PresenceBadge Component** (`src/components/PresenceBadge.tsx`)

- Shows green dot for online users
- Shows gray dot for offline users
- Supports three sizes: small, medium, large
- Positioned on avatars in conversation list

**TypingIndicator Component** (`src/components/TypingIndicator.tsx`)

- Animated three-dot indicator
- Shows user name when typing (for DM conversations)
- Smooth fade-in/fade-out animations
- Positioned above message composer

### Integration

1. **App.tsx:** Added `AppWithPresence` wrapper to initialize presence tracking for authenticated users
2. **ChatScreen:** Integrated typing indicators with message composer
3. **ConversationsScreen:** Added presence badges to conversation list items
4. **Conversations API:** Extended `ConversationListItem` to include `otherUserId` for DM presence tracking

### Files Created

- `src/features/presence/usePresence.ts`
- `src/features/presence/useUserPresence.ts`
- `src/features/presence/useTypingIndicator.ts`
- `src/features/presence/index.ts`
- `src/components/PresenceBadge.tsx`
- `src/components/TypingIndicator.tsx`

### Files Modified

- `App.tsx`
- `src/screens/ChatScreen.tsx`
- `src/screens/ConversationsScreen.tsx`
- `src/features/conversations/api.ts`

### RTDB Structure

```
presence/{uid}:
  online: boolean
  lastActive: timestamp

typing/{conversationId}/{uid}: boolean
```

### Testing Checklist

- [x] Presence status updates in real-time
- [x] User marked offline after 60s idle
- [x] Presence cleared on disconnect
- [x] AppState changes update presence correctly
- [x] Typing indicator shows with 250ms debounce
- [x] Typing indicator clears after 2s
- [x] Typing indicator clears on message send
- [x] Presence badge displays on conversation list
- [x] No linter errors

---

## PR #7 — Delivery States + Read Receipts ✅

**Completed:** October 21, 2025  
**Duration:** ~1 hour  
**Files Changed:** 5 files modified, 1 new component

### What Was Built

1. **Message Delivery Tracking**

   - `markMessagesAsDelivered()` — Marks messages as delivered when conversation loads
   - `markMessagesAsRead()` — Marks messages as read after 1 second viewing delay
   - Status transitions: sending → sent → delivered → read

2. **MessageItem Component**

   - Displays messages with delivery status indicators
   - Shows checkmarks for delivery states:
     - ⏱ Sending (clock icon)
     - ✓ Sent (single checkmark)
     - ✓✓ Delivered (double checkmark)
     - ✓✓ Read (blue double checkmark)
   - Includes timestamp formatting (time for today, date for older)
   - Error state handling for failed messages

3. **ChatScreen Updates**

   - Integrated MessageItem component
   - Automatic delivery marking when messages load
   - Automatic read marking after 1 second of viewing
   - Replaced inline message rendering with MessageItem

4. **Firestore Rules & Indexes**

   - Updated message update rules to allow members to update status field
   - Sender can still update all fields of their messages
   - Added composite index for senderId + status queries
   - Ensures efficient delivery/read receipt queries

### Technical Implementation

**API Functions (messages/api.ts):**

```typescript
markMessagesAsDelivered(conversationId)
  - Finds all messages from other users with status "sent"
  - Updates them to "delivered"
  - Runs when conversation loads

markMessagesAsRead(conversationId)
  - Finds all messages from other users with status "sent" or "delivered"
  - Updates them to "read"
  - Runs after 1 second of viewing the conversation
```

**Firestore Rules:**

- Members can update message status (for delivery/read receipts)
- Sender retains full update rights
- All other message fields remain immutable by non-senders

**UI Indicators:**

- Own messages show status on bottom right
- Other users' messages don't show status indicators
- Timestamps shown for all messages
- Optimistic messages show loading spinner

### Files Modified

- `src/features/messages/api.ts` — Added delivery tracking functions
- `src/features/messages/index.ts` — Exported new functions
- `src/components/MessageItem.tsx` — New component for message display
- `src/screens/ChatScreen.tsx` — Integrated MessageItem and delivery tracking
- `firestore.rules` — Updated message update permissions
- `firestore.indexes.json` — Added composite index for delivery queries

### Testing Checklist

- [x] Messages transition through status states correctly
- [x] Delivered status updates when recipient opens conversation
- [x] Read status updates after 1 second of viewing
- [x] Status indicators display correctly for own messages
- [x] No status indicators shown for others' messages
- [x] Timestamps format correctly (time vs date)
- [x] Optimistic messages show loading indicator
- [x] TypeScript compiles without errors
- [x] No linter errors
- [x] Firestore rules allow status updates by members
- [x] Composite indexes support delivery queries

### Known Limitations

- Delivery/read receipts update for all messages at once (not per-message)
- Read receipts don't support multi-device sync (out of MVP scope)
- No "delivered to X of Y users" for group chats (future enhancement)
- 1 second delay before marking as read (configurable)

---

## PR #10 — Group Chats (3+ Users) ✅

**Completed:** October 21, 2025  
**Duration:** 1 session  
**Files Changed:** 5 files

### What Was Built

1. **Group Conversation Creation**

   - `createGroupConversation()` function in conversations API
   - Supports 3+ users (current user + 2+ others)
   - Creates conversation with `type: "group"` in Firestore

2. **Multi-User Selection UI**

   - Enhanced NewChatScreen to support selecting multiple users
   - Dynamic button: "Create Chat" for DM, "Create Group (N)" for groups
   - Auto-generates group name from member display names

3. **Sender Attribution**

   - Messages in group chats show sender name above text
   - Only displayed for messages from other users (not own messages)
   - Styled in amethyst color for clear visibility

4. **Conversation Display**

   - Group chats show comma-separated list of member names
   - No presence badge for groups (DM only)
   - Existing typing indicators work for groups

5. **Helper Functions**
   - `getConversation()` - Retrieves conversation details
   - `getUserDisplayName()` - Resolves user display names
   - Enhanced `subscribeToUserConversations()` to handle group naming

### Technical Implementation

**Conversation Type Detection:**

```typescript
// ChatScreen fetches conversation on mount
const conv = await getConversation(conversationId);
if (conv?.type === "group") {
  // Load all member names
  // Enrich messages with sender names
}
```

**Message Enrichment:**

```typescript
// Messages enriched with sender names for groups
const enrichedMsgs = msgs.map((msg) => ({
  ...msg,
  senderName:
    conversation?.type === "group" ? senderNames[msg.senderId] : undefined,
}));
```

**Sender Attribution in UI:**

```typescript
// MessageItem shows sender if it's a group chat
<MessageItem message={item} isOwn={isOwn} showSender={isGroupChat && !isOwn} />
```

### Data Model Updates

**Conversation Document:**

```typescript
{
  members: string[]           // All member UIDs (sorted)
  type: "dm" | "group"        // Distinguishes DM from group
  lastMessage?: {...}
  updatedAt: Timestamp
}
```

**Message Interface:**

```typescript
interface Message {
  // ... existing fields
  senderName?: string; // For group chat sender attribution
}
```

### Files Modified

- `src/features/conversations/api.ts` (+51 lines)

  - Added `createGroupConversation()`
  - Added `getConversation()`
  - Added `getUserDisplayName()`
  - Enhanced `subscribeToUserConversations()` for group naming

- `src/screens/NewChatScreen.tsx` (+24 lines)

  - Multi-user selection support
  - Group vs DM creation logic
  - Dynamic button text

- `src/screens/ChatScreen.tsx` (+39 lines)

  - Conversation type detection
  - Member name loading for groups
  - Message enrichment with sender names

- `src/components/MessageItem.tsx` (+12 lines)

  - Added `showSender` prop
  - Displays sender name for group messages
  - Styled sender attribution

- `src/features/messages/api.ts` (+1 line)
  - Added `senderName` field to Message interface

### Testing Checklist

- [x] Create group with exactly 3 users (minimum)
- [x] Create group with 5+ users
- [x] Send messages in group - verify sender names appear
- [x] Verify own messages don't show sender name
- [x] Check conversations list shows all member names
- [x] Confirm no presence badge for groups
- [x] Test that typing indicators work in groups
- [x] Verify delivery states work in groups
- [x] Confirm optimistic UI works in groups
- [x] TypeScript compilation passes (`npx tsc --noEmit`)

### Known Limitations

- No custom group name field (uses member names)
- No group avatar support
- No member management (add/remove after creation)
- No admin/moderator roles
- All members have equal privileges

### Next Steps

**PR #8** will add image messaging with thumbnails.  
**PR #9** will add user profiles and avatars (including group avatars potentially).

---

## PR #11 — Notifications + Message Timestamps

**Status:** ✅ Complete  
**Date:** October 21, 2025

### Implementation Summary

Implemented in-app banner notifications for foreground messages and verified timestamp display in message UI:

1. **Banner Component** (`src/components/Banner.tsx`)

   - Animated notification banner with slide-in/out effects
   - Swipe-to-dismiss gesture support (up, left, right)
   - Auto-dismiss after 5 seconds (configurable)
   - Safe area aware positioning
   - Purple accent border matching design system

2. **Notification System** (`src/state/NotificationContext.tsx`)

   - Global notification management context
   - Subscribes to all user conversations
   - Detects new messages via timestamp and content comparison
   - Filters notifications for:
     - Active conversation (no notification)
     - User's own messages (no notification)
     - Background app state (no notification)
   - Tracks last seen messages per conversation

3. **Notification Banner Wrapper** (`src/components/NotificationBanner.tsx`)

   - Bridges Banner component with navigation
   - Handles tap-to-navigate to conversation
   - Manages banner visibility and dismissal

4. **Integration**

   - Updated `App.tsx` with NotificationProvider and NotificationBanner
   - Updated `ChatScreen.tsx` to track active conversation
   - Prevents notifications for messages in current chat

5. **Message Timestamps**
   - Already implemented in `MessageItem.tsx` (verified)
   - Shows time for today's messages
   - Shows date for older messages
   - Displayed alongside delivery status indicators

### Technical Details

- **Animation**: React Native Animated API with spring physics
- **Gestures**: PanResponder for swipe detection
- **Positioning**: Absolute with z-index 9999, safe area insets
- **State Management**: Context API for global notification state
- **Performance**: Efficient client-side message tracking

### Files Created

- `src/components/Banner.tsx`
- `src/components/NotificationBanner.tsx`
- `src/state/NotificationContext.tsx`
- `PR11_SUMMARY.md`

### Files Modified

- `App.tsx` - Added notification provider and banner
- `src/screens/ChatScreen.tsx` - Active conversation tracking

---

## PR #12 — Persistence Hardening + Logout Hygiene ✅

**Completed:** October 21, 2025  
**Duration:** 1 day  
**Files Changed:** 4 files created/modified

### What Was Built

#### 1. Global Queue Processor (`src/features/messages/queueProcessor.ts`)

**New module** that ensures queued messages survive app restarts:

- **Automatic Processing**: Runs on app startup and every 30 seconds
- **Retry Logic**: Exponential backoff (1s → 2s → 4s → 8s → 16s → 32s)
- **Max Retries**: 6 attempts before marking as failed
- **Background Processing**: Works even if user doesn't open chat screen
- **Queue Status**: Debug function to inspect queue state

**Key Functions:**

- `processGlobalQueue()` - Processes all queued messages
- `startGlobalQueueProcessor()` - Initializes processor on app launch
- `stopGlobalQueueProcessor()` - Cleanup on app unmount
- `getQueueStatus()` - Returns queue statistics for debugging

**Example:**

```typescript
// Queue status check
const status = await getQueueStatus();
console.log(status);
// { totalMessages: 3, readyToRetry: 2, failedMessages: 0 }
```

#### 2. App Startup Integration (`App.tsx`)

Added queue processor initialization to app startup:

```typescript
useEffect(() => {
  runMigrations(); // Schema migrations
  startGlobalQueueProcessor(); // Queue processing
  return () => {
    stopGlobalQueueProcessor(); // Cleanup
  };
}, []);
```

#### 3. Comprehensive Test Suite (`src/features/messages/__tests__/persistence.test.ts`)

**25 test cases** covering all persistence behaviors:

**Schema Migrations** (3 tests):

- ✅ Initialize schema version on first run
- ✅ Skip migrations if already on current version
- ✅ Run migrations from old to new version

**Outbound Queue** (5 tests):

- ✅ Add message to queue
- ✅ Get queue from storage
- ✅ Return empty array if queue is empty
- ✅ Remove message from queue by tempId
- ✅ Update queue item with retry count

**Retry Logic** (5 tests):

- ✅ Calculate exponential backoff delay
- ✅ Retry message on first attempt
- ✅ Don't retry after max retries (6)
- ✅ Don't retry if delay hasn't elapsed
- ✅ Retry if delay has elapsed

**Drafts** (3 tests):

- ✅ Save, get, and clear drafts

**Scroll Position** (2 tests):

- ✅ Save and get scroll position

**Selected Conversation** (2 tests):

- ✅ Save and get selected conversation

**Theme Preferences** (2 tests):

- ✅ Save and get theme preferences

**Logout Hygiene** (1 test) - **PR #12 Requirement #2**:

- ✅ Clear all caches except theme preferences on logout
- ✅ Verify theme preferences are NOT cleared

**Queue Survival** (2 tests) - **PR #12 Requirement #1**:

- ✅ Persist queue across app restarts
- ✅ Restore and process queue on app restart

**Test Results:**

```
Test Suites: 1 passed, 1 total
Tests:       25 passed, 25 total
Time:        0.298 s
```

#### 4. Existing Implementation (Already in Place)

**Logout Cache Clearing** (`src/state/auth/AuthContext.tsx` lines 115-139):

```typescript
const logout = async () => {
  await firebaseSignOut(firebaseAuth);
  await clearAllCachesExceptPrefs(); // ✅ Clears all except prefs
};
```

**Cache Clearing Function** (`src/features/messages/persistence.ts` lines 248-260):

```typescript
export async function clearAllCachesExceptPrefs(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEYS.DRAFTS,
    KEYS.SCROLL_POSITIONS,
    KEYS.OUTBOUND_QUEUE,
    KEYS.SELECTED_CONVERSATION,
    // ✅ KEYS.THEME_PREFS intentionally NOT included
  ]);
}
```

### Technical Details

#### Queue Survival Mechanism

1. **Message Queue Storage**: All queued messages stored in AsyncStorage under `@whisper:outbound_queue`
2. **Restart Behavior**:
   - App restarts → `App.tsx` useEffect runs
   - Calls `startGlobalQueueProcessor()`
   - Processor calls `processGlobalQueue()`
   - Reads queue from AsyncStorage
   - Processes messages ready for retry
3. **Retry Logic**:
   - Uses `shouldRetryMessage()` to check if ready
   - Respects exponential backoff delays
   - Max 6 retries (32s max delay)
   - Automatic cleanup after success

#### Logout Hygiene Mechanism

**Cleared on Logout:**

- ✅ Drafts (`@whisper:drafts`)
- ✅ Scroll positions (`@whisper:scroll_positions`)
- ✅ Outbound queue (`@whisper:outbound_queue`)
- ✅ Selected conversation (`@whisper:selected_conversation`)

**Preserved on Logout:**

- ✅ Theme preferences (`@whisper:theme_prefs`)
- ✅ Schema version (`@whisper:schema_version`)

### Files Created

1. ✅ `src/features/messages/queueProcessor.ts` (130 lines)
2. ✅ `src/features/messages/__tests__/persistence.test.ts` (459 lines)
3. ✅ `PR12_COMPLETION_SUMMARY.md` (Testing guide + documentation)

### Files Modified

1. ✅ `App.tsx` - Added global queue processor initialization
2. ✅ `src/features/messages/index.ts` - Exported queue processor functions

### Verification Performed

#### Automated Testing

- ✅ All 25 unit tests pass
- ✅ Test coverage for queue survival scenarios
- ✅ Test coverage for logout hygiene
- ✅ Schema migration tests

#### Manual Testing Scenarios

Documented in `PR12_COMPLETION_SUMMARY.md`:

- **Test 1**: Queue survival after restart (offline → send → restart → online)
- **Test 2**: Logout clears all caches except preferences
- **Test 3**: Exponential backoff retry logic
- **Test 4**: Schema migrations on first run

### Key Features Delivered

1. ✅ **Queue Survival After Restart**

   - Messages queued while offline persist in AsyncStorage
   - Global processor runs on app startup
   - Automatic retry with exponential backoff
   - Works even if user doesn't navigate to chat

2. ✅ **Logout Clears All Caches (Keep Prefs)**

   - `clearAllCachesExceptPrefs()` called on logout
   - Clears: drafts, scroll positions, queue, selected conversation
   - Preserves: theme preferences, schema version
   - Verified with unit tests

3. ✅ **State Restores Smoothly Post-Restart**
   - Schema migrations run on startup
   - Queue processor initializes automatically
   - AsyncStorage persistence for all state
   - Comprehensive error handling

### Performance Considerations

- **Queue Check Interval**: 30 seconds (vs. 5 seconds per-conversation)
- **Exponential Backoff**: Reduces server load during network issues
- **Max Retries**: Prevents infinite retry loops
- **AsyncStorage**: Lightweight, efficient persistence

### Merge Criteria - Verified ✅

✅ **Task 1: Validate queue survival after restart**

- Implementation: Global queue processor + AsyncStorage
- Tests: 25 test cases with 100% pass rate
- Manual testing guide provided

✅ **Task 2: Ensure logout clears all caches (keep prefs)**

- Implementation: `clearAllCachesExceptPrefs()` in AuthContext
- Tests: Unit tests verify selective clearing
- Manual testing guide provided

✅ **State restores smoothly post-restart**

- Schema migrations on startup
- Global queue processor on startup
- Comprehensive test coverage
- All tests passing

### Blockers / Notes

- None. PR #12 is fully complete and tested.
- Queue processor logs to console for debugging (can be removed in production)
- Theme preferences include dark mode and accent color settings
- Max 6 retries ensures failed messages don't retry indefinitely

---

## Metrics

**Lines of Code:** ~9,000+  
**Components:** 6 screens, 4 feature modules, auth system, 5 shared components  
**Configuration Files:** 15+  
**Documentation Pages:** 13+ (added PR12_COMPLETION_SUMMARY.md)  
**Firebase Rules:** 3 files  
**Schema Version:** 1  
**Test Suites:** 1 (persistence tests)  
**Total Tests:** 25 (all passing)

---

## References

- **PRD:** `/docs/Whisper_MVP_Final_PRD.md`
- **Task List:** `/docs/Whisper_MVP_Final_Task_List.md`
- **Design Spec:** `/docs/Whisper_App_Design_Spec.md`
- **Active Context:** `/memory/active_context.md`
- **PR #7 Summary:** `/PR7_SUMMARY.md`
- **PR #10 Summary:** `/PR10_SUMMARY.md`
- **PR #11 Summary:** `/PR11_SUMMARY.md`
- **PR #12 Summary:** `/PR12_COMPLETION_SUMMARY.md`

---

**Last Updated:** PR #12 completion — October 21, 2025
