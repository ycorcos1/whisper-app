# Polish PR #2: Contacts System Implementation

**Date:** October 23, 2025  
**Status:** ✅ Complete  
**Task:** Implement contacts system with add/remove functionality and new chat tabs

---

## Overview

This PR implements a complete contacts system for the Whisper app, allowing users to maintain a list of contacts for quick access. The implementation includes:

1. **Backend:** Contacts API with add/remove/check/list operations
2. **Security:** Firestore security rules for contacts subcollection
3. **Chat Settings:** Add/Remove contact buttons in DM conversations
4. **New Chat Screen:** Contacts and Search tabs with contact management affordances

---

## Implementation Details

### 1. Contacts API Module

**File:** `src/features/contacts/api.ts`

Created a comprehensive contacts API with the following functions:

- `addContact(contactUid)` - Add a user to contacts (one-directional)
- `removeContact(contactUid)` - Remove a user from contacts
- `isContact(contactUid)` - Check if a user is a contact
- `getUserContacts()` - Get all contact UIDs
- `subscribeToContacts(callback)` - Real-time subscription to contacts changes

**Data Structure:**

```
users/{uid}/contacts/{contactUid}
  - contactUid: string
  - addedAt: Timestamp
```

**Key Features:**

- One-directional relationships (A adding B does NOT add A to B)
- Real-time updates via Firestore subscriptions
- Proper error handling and authentication checks

### 2. Firestore Security Rules

**File:** `firestore.rules`

Added security rules for the contacts subcollection:

```javascript
// Contacts subcollection under users
match /contacts/{contactUid} {
  // Users can read their own contacts
  allow read: if isAuthenticated() && isOwner(userId);

  // Users can add contacts to their own list
  allow create: if isAuthenticated() && isOwner(userId)
    && request.resource.data.contactUid == contactUid;

  // Users can remove contacts from their own list
  allow delete: if isAuthenticated() && isOwner(userId);

  // Contacts cannot be updated (only add/remove)
  allow update: if false;
}
```

### 3. Chat Settings Screen Updates

**File:** `src/screens/ChatSettingsScreen.tsx`

Enhanced DM conversation settings with contact management:

**New State Variables:**

- `otherUserId` - Store the other user's ID
- `isContactState` - Track if the other user is a contact
- `checkingContact` - Loading state for contact check

**New Functions:**

- `handleAddContact()` - Add the other user to contacts with toast notification
- `handleRemoveContact()` - Remove the other user with confirmation dialog
- `showToast()` - Platform-specific toast/alert display

**UI Changes:**

- New section below "Delete Conversation" in DM settings
- Shows "Add Contact" button if not a contact → displays toast "Contact added"
- Shows "Remove Contact" button if is a contact → shows confirmation modal
- Loading indicator while checking contact status
- Helpful hint text explaining the action

**Styling:**

- `addContactButton` - Primary purple button
- `removeContactButton` - Secondary bordered button
- `contactHint` - Explanatory text below buttons

### 4. New Chat Screen Updates

**File:** `src/screens/NewChatScreen.tsx`

Complete redesign with tabbed interface and contact affordances:

**New State Variables:**

- `activeTab` - "contacts" or "search"
- `contactUids` - Array of current user's contact UIDs
- `contactsLoading` - Loading state for contacts subscription

**Tab System:**

- **Contacts Tab:**
  - Search filters only user's contacts
  - Shows "No contacts yet" if user has no contacts
  - Shows "Add contacts from the Search tab" helper text
- **Search Tab:**
  - Search across all registered users
  - Uses existing email-based search logic
  - Shows all users except current user

**Contact Affordances:**
Each user row now shows:

- Avatar and user info (unchanged)
- Selection checkmark (when selecting for chat)
- **NEW:** Contact affordance icon on the right:
  - **"+"** if not a contact → tap to add immediately
  - **"✓"** if is a contact → tap prompts removal confirmation

**UI Flow:**

1. User searches for someone in Search tab
2. Taps "+" to add them to contacts immediately → toast notification
3. User switches to Contacts tab
4. Can now search/find the contact quickly
5. Taps "✓" on a contact → confirmation dialog → removes from contacts

**Styling:**

- `tabsContainer` - Tab bar at the top
- `tab` / `tabActive` - Individual tabs with bottom border indicator
- `tabText` / `tabTextActive` - Tab text styling
- `rightAffordances` - Container for checkmark and contact affordance
- `contactAffordance` - Circle button for +/✓
- `contactAffordanceActive` - Purple background when is contact
- `contactAffordanceText` / `contactAffordanceTextActive` - Icon text

**Smart Search Logic:**

- In Contacts tab: Fetches contact user documents and filters by display name or email
- In Search tab: Uses Firestore queries on `emailLower` field with fallback to `email`
- Results update in real-time as user types

---

## Testing Guide

### Prerequisites

1. Have at least 2 test accounts created
2. Deploy Firestore rules: `firebase deploy --only firestore:rules`
3. Rebuild the app to include new code

### Test Case 1: Add Contact from Chat Settings

**Steps:**

1. Log in as User A
2. Start a DM conversation with User B
3. Open the conversation with User B
4. Tap the settings icon (top right)
5. Scroll down past "Delete Conversation"
6. Verify "Add Contact" button is visible
7. Tap "Add Contact"

**Expected:**

- Toast/alert shows "Contact added"
- Button changes to "Remove Contact"
- Hint text updates

### Test Case 2: Remove Contact from Chat Settings

**Steps:**

1. Continue from Test Case 1 (User B is now a contact)
2. In Chat Settings, tap "Remove Contact"

**Expected:**

- Confirmation modal appears: "Remove [Name] from your contacts?"
- Options: "Cancel" and "Remove"
- Tap "Remove"
- Toast/alert shows "Contact removed"
- Button changes back to "Add Contact"

### Test Case 3: Contacts Tab - Empty State

**Steps:**

1. Log in as a new user with no contacts
2. Tap "New Chat" (pencil icon)
3. Verify "Contacts" tab is selected by default

**Expected:**

- Empty state shows "No contacts yet"
- Subtext: "Add contacts from the Search tab"

### Test Case 4: Add Contact from Search Tab

**Steps:**

1. In New Chat screen, tap "Search" tab
2. Search for a user by typing their email
3. Locate the user in results
4. Tap the "+" icon on the right side

**Expected:**

- Toast/alert shows "[Name] added to contacts"
- "+" icon changes to "✓" icon
- Icon background changes to purple

### Test Case 5: Remove Contact from Search Tab

**Steps:**

1. Continue from Test Case 4 (user is now a contact)
2. Tap the "✓" icon

**Expected:**

- Confirmation modal appears: "Remove [Name] from contacts?"
- Options: "Cancel" and "Remove"
- Tap "Remove"
- Toast/alert shows "[Name] removed from contacts"
- "✓" icon changes back to "+" icon
- Icon background changes back to gray/surface color

### Test Case 6: Contacts Tab - Search Contacts

**Steps:**

1. Add 2-3 contacts using Search tab
2. Switch to "Contacts" tab
3. Search for one of your contacts by name or email

**Expected:**

- Results show only matching contacts
- Contact affordance shows "✓" (they are contacts)
- Can still select them for creating a chat

### Test Case 7: Real-time Contact Updates

**Steps:**

1. Open New Chat on Device A (Contacts tab)
2. Open New Chat on Device B (logged in as same user)
3. On Device B, add a contact via Search tab

**Expected:**

- Device A's Contacts tab updates automatically
- New contact appears in real-time
- Can search and find the new contact immediately

### Test Case 8: One-Directional Contacts

**Steps:**

1. Log in as User A
2. Add User B as a contact
3. Log out and log in as User B
4. Open New Chat → Contacts tab

**Expected:**

- User B's contacts list does NOT include User A
- Contacts are one-directional (A adding B ≠ B adding A)

### Test Case 9: Create Chat from Contacts

**Steps:**

1. Have at least one contact
2. Open New Chat → Contacts tab
3. Search for your contact
4. Tap on the user row (not the ✓ icon)
5. Tap "Create Chat"

**Expected:**

- Chat screen opens with the selected contact
- Can send messages normally
- Back navigation works correctly

### Test Case 10: Mixed Selection (Contacts + Search)

**Steps:**

1. Add User B as a contact
2. Open New Chat → Contacts tab
3. Select User B (checkmark appears)
4. Switch to Search tab
5. Search for User C (not a contact)
6. Select User C
7. Tap "Create Group (2)"

**Expected:**

- Group chat created with both User B and User C
- Group name shows both users
- Can send messages in group

---

## Visual Reference

### Chat Settings - DM Contact Buttons

```
┌─────────────────────────────────────┐
│ Contact Information                 │
│                                     │
│ Display Name: Bob Smith             │
│ Email: bob@example.com              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐   │
│  │   Delete Conversation       │   │
│  └─────────────────────────────┘   │
│  This will only remove...           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐   │  ← If NOT a contact
│  │      Add Contact            │   │
│  └─────────────────────────────┘   │
│  Add Bob Smith to your contacts...  │
└─────────────────────────────────────┘

OR

┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐   │  ← If IS a contact
│  │    Remove Contact           │   │
│  └─────────────────────────────┘   │
│  Remove Bob Smith from your...      │
└─────────────────────────────────────┘
```

### New Chat Screen - Tabs and Affordances

```
┌─────────────────────────────────────┐
│  Contacts  │  Search                │  ← Tabs
│  ─────────                          │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Search contacts...               │ │  ← Search bar
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│  ┌───┐  Alice Johnson          ✓  │  ← Contact (checkmark)
│  │ A │  alice@example.com          │
│  └───┘                              │
├─────────────────────────────────────┤
│  ┌───┐  Bob Smith              +  │  ← Not a contact (plus)
│  │ B │  bob@example.com            │
│  └───┘                              │
└─────────────────────────────────────┘

When user is selected for chat:
├─────────────────────────────────────┤
│  ┌───┐  Alice Johnson      [✓]    │  ← Selection checkmark
│  │ A │  alice@example.com          │     (contact affordance hidden)
│  └───┘                              │
└─────────────────────────────────────┘
```

---

## Files Modified

### New Files

- `src/features/contacts/api.ts` - Contacts API module

### Modified Files

- `firestore.rules` - Added contacts subcollection rules
- `src/screens/ChatSettingsScreen.tsx` - Added Add/Remove Contact buttons for DMs
- `src/screens/NewChatScreen.tsx` - Complete redesign with tabs and affordances

---

## Data Model

### Firestore Structure

```
/users/{userId}/contacts/{contactUid}
  - contactUid: string (matches document ID)
  - addedAt: Timestamp

Example:
/users/user_A_uid/contacts/user_B_uid
  - contactUid: "user_B_uid"
  - addedAt: Timestamp(2025-10-23 10:30:00)
```

### Characteristics

- One-directional: A can add B without B adding A
- Real-time: Changes propagate via Firestore subscriptions
- Secure: Rules enforce users can only manage their own contacts
- Immutable: Contacts can only be added or deleted, not updated

---

## Known Behaviors

1. **One-Directional by Design:** If User A adds User B, User B will NOT see User A in their contacts. This is intentional and allows for one-way following patterns.

2. **Contact Affordance Hidden When Selected:** When a user is selected for creating a chat (checkmark visible), the contact affordance (+/✓) is hidden to avoid confusion and save space.

3. **Platform-Specific Toasts:**

   - Android: Uses native `ToastAndroid`
   - iOS: Uses `Alert.alert` with empty title

4. **Real-time Updates:** Contacts list updates in real-time across all screens and devices when contacts are added/removed.

5. **Search Performance:** In Contacts tab, search fetches all contact documents individually. For apps with many contacts (>50), consider implementing batch fetching or indexing.

---

## Next Steps

- **PR #3:** Will address navigation logic fix (back from chat → conversations)
- **Future Enhancement:** Consider adding contact requests for mutual contacts
- **Future Enhancement:** Add contact sync with phone contacts (native integration)
- **Future Enhancement:** Batch fetch optimization for large contact lists

---

## Success Criteria

✅ Contacts can be added/removed from Chat Settings (DM only)  
✅ Contacts can be added/removed from New Chat Screen (both tabs)  
✅ Contacts are one-directional (A adding B ≠ B adding A)  
✅ Contacts/Search tabs work correctly  
✅ Search filters correctly in each tab  
✅ Contact affordances (+/✓) display and function correctly  
✅ Toast notifications appear for add/remove actions  
✅ Confirmation modals appear for removal  
✅ Real-time updates work across devices  
✅ Firestore security rules enforce proper permissions  
✅ No TypeScript or linter errors

---

**Implementation Complete:** PR #2 - Contacts System ✅
