# Whisper MVP Polish Task List

This document outlines the full list of polishing tasks to be executed before moving to the next development phase. These tasks focus on improving performance, refining user experience, and ensuring logical consistency across navigation, message flow, and UI layout. The next phase (AI Agent implementation) will use this as a foundation, so precision and cleanliness of implementation are critical.

---

## 1. UI/UX Adjustments

### 1.1 Header Layout Changes

**Current:** Floating “+” at bottom‑right opens New Chat. “Select / Done / Delete” on the right side of the header.  
**Update:**

- Move **New Chat** to the **right side of the header** using the pencil‑square icon.
- Move **Select / Done / Delete** to the **left** side of the header.
- Functionality unchanged; only reposition. Keep spacing, alignment, and colors consistent.

---

### 1.2 Repurpose Floating “+” Button

- The floating circular **+** no longer opens New Chat.
- It toggles a placeholder **AI Agent** panel (expand/minimize animation only; logic arrives next phase).

**Goal:** Prepare the UI surface for the Agent without altering current flows.

---

## 2. Navigation Logic Fix

### 2.1 New Chat Flow Back Navigation

**Issue:** After creating a new chat and sending a message, back navigates to **New Chat** instead of **Conversations**.  
**Fix:**

- If the user **sent at least one message** in the newly created chat, back goes to **Conversations list**.
- If **no message was sent**, back returns to **New Chat**.

---

## 3. Contacts System

### 3.1 Add/Remove Contacts

- Implement **Add Contact** and **Remove Contact** at the user level. Store as:
  `users/{uid}/contacts/{contactUid}`.
- One‑directional by default (A adding B does not add A to B).

### 3.2 Chat Settings Screen

- Below **Delete Conversation**, show:
  - **Add Contact** (if not a contact) → toast “Contact added”.
  - **Remove Contact** (if a contact) → confirm modal, then remove.

### 3.3 New Chat Tabs

- Add **Contacts** and **Search** tabs above the search bar.
  - **Contacts** tab: search filters only the user’s contacts.
  - **Search** tab: search across all registered users.
- Result row style matches conversation list. Right‑side affordance:
  - **+** if not a contact → add immediately.
  - **✓** if is a contact → tap prompts removal confirmation.

---

## 4. Visual Polish and Smoothness

### 4.1 Chat Scrolling and Transitions

- Optimize long‑list performance and minimize re‑renders.
- Animate message insertions cleanly; avoid flicker on updates.

### 4.2 Consistent Visuals

- Normalize fonts, paddings, and header icon alignment.
- Standardize screen transition timing.

### 4.3 Auto‑Scroll Behavior

- On entering a chat (DM or Group), **anchor to the latest message**.
- If the user scrolls up, do **not** auto‑scroll on inbound messages; only auto‑scroll when the user returns to bottom or when sending their own message.
- Re‑entering a chat starts at the bottom (fresh reading context).
- When the keyboard opens, keep anchored if already at bottom; avoid jumpy offsets.

---

## 5. Verification & Testing

- [ ] Header buttons relocated; floating **+** toggles Agent panel.
- [ ] New Chat back navigation fixed.
- [ ] Contacts add/remove persists; UI matches spec.
- [ ] Contacts/Search tabs behave as described.
- [ ] Auto‑scroll rules behave correctly across DM and Group.

---

## 6. Group Chat Read Receipts ✅

**Status:** COMPLETE — See `docs/Polish MVP Logs/POLISH_PR3_GROUP_READ_RECEIPTS.md`

**Goal:** In Group chats, show **per-user read receipts** as "seen by" labels **under messages**, showing which users have read each message.

**Behavior & Rules**

- For each participant `uid` (excluding the current user), track `lastReadMid` per conversation.
- Under messages, render a **"seen by [names]"** label for users whose `lastReadMid` equals that message's id.
- Label should be compact (left half of screen only), with expand/collapse for overflow.
- Update in real time as read cursors advance.
- DMs continue to use the existing single read receipt style (checkmark/read state), **unchanged**.

**Data**

- Firestore path: `conversations/{cid}/participants/{uid}` with field `lastReadMid` (server-timestamped updates).
- Write on view at bottom / app foreground / explicit "mark read".
- Security rule: users can only update their own `lastReadMid` in conversations they are a member of.

**Implementation Summary**

- ✅ Created `readReceipts.ts` API with `updateLastReadMessage` and `subscribeToReadReceipts`
- ✅ Created `useReadReceipts` hook for real-time subscription
- ✅ Created `ReadReceipts` component with expand/collapse functionality
- ✅ Integrated into `MessageItem` component (group chats only)
- ✅ Updated `ChatScreen` to track and update `lastReadMid`
- ✅ Updated Firestore security rules for `participants` subcollection
- ✅ Deployed to Firebase successfully

**Testing**

- See `docs/Polish MVP Logs/POLISH_PR3_TESTING_GUIDE.md` for comprehensive test scenarios

**Acceptance**

- ✅ Labels appear only beneath messages in **group chats** (not DMs).
- ✅ Shows users whose `lastReadMid` matches the message ID
- ✅ Updates in real-time as users read messages
- ✅ Expand/collapse works when names overflow one line
- ✅ Limited to left 50% of screen width
- ✅ No performance issues with multiple users

---

**End of Document**
