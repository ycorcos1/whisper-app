# Whisper — MVP Final Product Requirements Document (PRD)

> **App Overview:**  
> Whisper is a React Native + Expo Go messaging app focused on reliable real-time communication.  
> The MVP demonstrates one-on-one and group chat, message persistence, optimistic UI, presence, image sharing, and basic Firebase integration.

---

## 1. Scope & Key MVP Features

**Goal:** Deliver a functional, production-quality WhatsApp-style messaging app for mobile only (iOS/Android simulators).

**Included Features**

- One-on-one and group chat (3+ users)
- Real-time message delivery via Firestore listeners + RTDB
- Message persistence (offline-first)
- Optimistic UI (messages appear instantly)
- Online/offline indicators + typing presence
- Message delivery states (sending → sent → delivered → read)
- Image messaging with thumbnail previews
- User authentication (email/password) \*\*\*
- In-app banner notifications for foreground
- Expo Go-compatible deployment and emulator testing \*\*\*

**Not Included in MVP**

- Push notifications via FCM
- Voice messages, calls, or emojis
- Read receipts per device (multi-device sync out of scope)
- User avatars (upload or initials fallback)
- Advanced settings or theming

---

## 2. User Stories

- As a user, I can sign up and log in with email/password and stay signed in.
- I can start one-on-one or group conversations.
- I can send messages that appear instantly (optimistic UI).
- My messages persist across restarts and sync when I reconnect.
- I can see others' online/offline status and when they are typing.
- I can send images; they appear as thumbnails and expand full-screen.
- I can upload a profile picture or use a generated initials avatar.
- I can see read receipts and delivery indicators.
- When offline, I can queue messages which send automatically later.

---

## 3. Navigation Flow

```
App Launch → AuthScreen → HomeTabs (Conversations, Profile)
  Conversations → ChatScreen (1:1 or Group)
  Profile → Avatar Upload / Logout
```

Cursor must implement this exact navigation using React Navigation Stack + Bottom Tabs.

---

## 4. UI Layout Reference

| Screen                  | Layout Description                                                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **AuthScreen**          | Title "Whisper", email + password fields, login/signup toggle, submit button.                                                           |
| **ConversationsScreen** | Scrollable list of chats with last message preview, avatar, timestamp, and a floating "+" button to start a new chat.                   |
| **ChatScreen**          | Header (back button, avatar, name, presence), scrollable message list, composer at bottom with text input + image picker + send button. |
| **ProfileScreen**       | Avatar (circle crop), display name, upload button, logout button.                                                                       |
| **NewChatScreen**       | Search/select user(s), confirm to create conversation.                                                                                  |

Style: glassmorphic aesthetic, lavender/silver theme, ripple animations, consistent typography.

---

## 5. Firebase Integration

**Firebase Services Used**

- **Auth**: email/password
- **Firestore**: conversations, messages, users
- **Realtime Database**: presence & typing
- **Storage**: media & avatars
- **Functions**: image thumbnail generation

**Image Thumbnail Function**

- Trigger: `storage.object().onFinalize()` for path `/message_media/{cid}/{mid}/*`
- Logic: generate 960px max-edge thumbnail; store under `/message_media/{cid}/{mid}_thumb.jpg`
- MIME whitelist: `image/jpeg`, `image/png`, `image/webp`

---

## 6. Persistence Rules

- Firestore offline persistence enabled
- AsyncStorage used for:
  - Drafts per conversation
  - Selected convo
  - Scroll position
  - Outbound queue
  - Theme prefs
- `APP_STATE_SCHEMA_VERSION` used for migration on updates
- Clear all caches on logout, except preferences
- Retry policy: exponential backoff (1 → 2 → 4 → 8 → 16 → 32s)
- Queue survives app restarts

---

## 7. Testing Sequencing

- Tests are **added only after each feature PR merges**.
- CI should run `jest --passWithNoTests` early to avoid blocking.
- Final CI run (`npm run verify`) executes completed feature tests only.
- Unit tests (Jest) + Firebase Emulator tests for rules.

---

## 8. CI Command Clarity

- `.github/workflows/ci.yml` runs:
  ```yaml
  npm run predev
  npm run verify
  ```
- `predev`: checks environment variables
- `verify`: runs tests for merged features only
- CI must block merges failing either step

---

## 9. Cursor Memory Bank Rule

- After every PR merge, Cursor must update `/memory/active_context.md` and `/memory/progress.md`.
- Memory Bank is used to track architectural state, schema, and migration versions.

---

## 10. Data Model Appendix

**Firestore**

```json
users/{uid}:
  displayName: string
  email: string
  photoURL: string
  online: boolean
  typing: boolean
  lastActive: timestamp

conversations/{cid}:
  members: [uid]
  type: "dm" | "group"
  lastMessage: {
    text: string
    senderId: string
    timestamp: timestamp
  }
  updatedAt: timestamp

conversations/{cid}/messages/{mid}:
  senderId: string
  type: "text" | "image"
  text: string
  image: {
    url: string
    thumbnailUrl: string
  }
  timestamp: timestamp
  status: "sending" | "sent" | "delivered" | "read"
```

**RTDB**

```
presence/{uid}: { online: boolean, lastActive: timestamp }
typing/{cid}/{uid}: true | false
```

**Storage**

```
message_media/{cid}/{mid}/original.jpg
message_media/{cid}/{mid}_thumb.jpg
profile_pictures/{uid}/avatar.jpg
```

---

## 11. UI Layout Appendix

See Section 4 for summary; Cursor must match structure precisely.  
Use consistent padding, Inter or Satoshi font, and glassmorphic chat bubbles.

---

## 12. Post-MVP Expansion Preview (Out of Scope for Now)

- Voice messages and audio playback
- Emoji reactions and stickers
- Push notifications via FCM/APNs
- Message forwarding
- Custom themes and media previews
- Admin/moderation features

---

**End of Whisper MVP Final PRD**
