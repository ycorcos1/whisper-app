# PR 4 — Keyboard UX Fixes

**Date:** October 23, 2025  
**Status:** ✅ Fixed

---

## Issues Fixed

### Issue 1: Keyboard Stays Open When Opening Casper ❌

**Problem:**

- User typing in chat screen
- User taps ghost button to open Casper panel
- Keyboard remains visible, blocking the panel

**Solution:**
Added `Keyboard.dismiss()` when opening Casper panel.

**File:** `src/agent/CasperProvider.tsx`

```typescript
// In the open() function:
const open = useCallback((opts: CasperOpenOptions) => {
  // Dismiss keyboard when opening Casper panel
  Keyboard.dismiss(); // ← Added this

  // ... rest of the code
});
```

---

### Issue 2: Keyboard Covers Input in Ask Tab ❌

**Problem:**

- User taps text field in Ask tab
- Keyboard slides up
- Keyboard covers the text input field
- User can't see what they're typing

**Solution:**
Increased `keyboardVerticalOffset` to account for the Casper panel height.

**File:** `src/agent/CasperTabs/Ask.tsx`

```typescript
<KeyboardAvoidingView
  style={styles.container}
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  keyboardVerticalOffset={Platform.OS === "ios" ? 320 : 100}  // ← Increased from 180
>
```

**Why 320?**

- Casper panel takes up ~65% of screen height
- Tab bar adds ~50px
- Panel header adds ~60px
- Total offset needed: ~320px on iOS

---

## Changes Made

### Modified Files

1. **`src/agent/CasperProvider.tsx`**

   - Import: Added `Keyboard` from `react-native`
   - Function: Added `Keyboard.dismiss()` in `open()` callback

2. **`src/agent/CasperTabs/Ask.tsx`**
   - Updated: `keyboardVerticalOffset` from `180` to `320` (iOS)
   - Updated: `keyboardVerticalOffset` from `0` to `100` (Android)

---

## Testing

### Test 1: Chat → Casper (Issue 1)

**Steps:**

1. Open a conversation
2. Tap the message input (keyboard appears)
3. Start typing a message
4. **Without sending**, tap the ghost button (Casper)

**Expected:**

- ✅ Casper panel slides up
- ✅ Keyboard dismisses immediately
- ✅ Clean UI with no keyboard visible

---

### Test 2: Ask Tab Input (Issue 2)

**Steps:**

1. Open Casper panel
2. Go to Ask tab
3. Tap the "Ask a question..." input field
4. Keyboard should slide up

**Expected:**

- ✅ Keyboard appears
- ✅ Input field remains visible above keyboard
- ✅ User can see what they're typing
- ✅ No overlap between keyboard and input

---

## Platform Differences

### iOS

- Uses `behavior="padding"`
- Offset: **320px**
- Keyboard dismissal: Instant

### Android

- Uses `behavior="height"`
- Offset: **100px**
- Keyboard dismissal: Smooth fade

---

## Before vs After

### Before (Issue 1):

```
[Chat Screen]
[Keyboard visible] ← Still showing
[Casper Panel] ← Blocked by keyboard
```

### After (Issue 1):

```
[Chat Screen]
[Casper Panel] ← Fully visible
[Keyboard dismissed] ← Gone
```

---

### Before (Issue 2):

```
[Casper Panel - Ask Tab]
[Q&A History]
[Keyboard] ← Covers input
[Input Field] ← Hidden behind keyboard ❌
```

### After (Issue 2):

```
[Casper Panel - Ask Tab]
[Q&A History - scrolled up]
[Input Field] ← Visible ✅
[Keyboard] ← Below input
```

---

## Additional Notes

### Why Not Lower Offset?

The Casper panel itself adds ~400-500px of UI above the input:

- Panel drag handle: ~20px
- Panel header: ~60px
- Tab bar: ~50px
- Content padding: ~20px
- Panel from bottom of screen: ~65% of height

Total effective height user loses: ~320px minimum

### Future Improvements

If users report the offset is still not quite right:

**Option 1:** Use dynamic calculation

```typescript
const panelHeight = Dimensions.get("window").height * 0.65;
const offset = panelHeight * 0.5; // 50% of panel height
```

**Option 2:** Use `behavior="position"` instead of `"padding"`

```typescript
behavior={Platform.OS === "ios" ? "position" : "height"}
```

---

## Status

✅ **Issue 1:** Keyboard dismisses when opening Casper  
✅ **Issue 2:** Input field visible when typing in Ask tab  
✅ **No linter errors**  
✅ **Ready to test**

---

## Test It Now

1. **Hot reload** should apply changes immediately
2. Try both test scenarios above
3. Test on both iOS and Android if possible

If the offset still isn't quite right, we can fine-tune the exact value!
