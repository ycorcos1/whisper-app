# PR #11 — Visual Reference Guide

This document provides visual descriptions and layouts for the notification banner system.

---

## Banner Component Layout

```
┌─────────────────────────────────────────────────────────┐
│  ━━━━━━  ← Swipe indicator (drag handle)               │
│ ┃                                                        │
│ ┃  Alice Johnson                              ✕         │
│ ┃  Hey! Are we still meeting at 3?                      │
│ ┃                                                        │
│ ┃                                                        │
└─────────────────────────────────────────────────────────┘
   ↑
   Purple accent border (4px)
```

### Component Structure

```
Banner (Container)
├── Indicator Line (top center)
├── Content Area
│   ├── Title (sender name)
│   └── Message (preview text)
└── Close Button (✕)
```

---

## Banner States

### 1. Slide In Animation

```
[Frame 1]          [Frame 2]          [Frame 3]
   ▲                 ▲                  ▲
   │                 │                  │
 (hidden)        (partially          (fully
  above            visible)          visible)
  screen)
```

### 2. Auto-Dismiss

```
Time: 0s ──────────────────────────── 5s
      ↓                                ↓
   [Visible]                      [Slides out]
```

### 3. Swipe Gestures

```
Swipe Up ↑
                    Banner dismisses upward

Swipe Left ←────    Banner dismisses left

Swipe Right ────→   Banner dismisses right
```

---

## Screen Positioning

### iOS (with notch)

```
┌─────────────────────────────────────┐
│  ●●●  10:23 AM         ⚡📶 100%  │ ← Status Bar
│                                     │
│  ┌─────────────────────────────┐   │ ← Safe Area Top
│  │ ━━━━ Banner appears here ━━ │   │
│  │ Purple border, glassmorphic │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Main App Content]                 │
│                                     │
```

### Android

```
┌─────────────────────────────────────┐
│  10:23 AM              ⚡📶 100%   │ ← Status Bar
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ━━━━ Banner appears here ━━ │   │
│  │ Purple border, glassmorphic │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Main App Content]                 │
│                                     │
```

---

## Color Scheme

### Banner Background

- **Color:** `theme.colors.surface` (#2A1F3D in dark mode)
- **Opacity:** Solid (no transparency)
- **Shadow:** Large shadow (elevation 5)

### Accent Border

- **Color:** `theme.colors.amethystGlow` (#9C7AFF)
- **Width:** 4px
- **Position:** Left edge

### Text Colors

- **Title:** `theme.colors.text` (#EAEAEA)
- **Message:** `theme.colors.textSecondary` (#A0A0A0)
- **Close Button:** `theme.colors.textSecondary` (#A0A0A0)

### Indicator Line

- **Color:** `theme.colors.border` (#3D2F54)
- **Height:** 4px
- **Width:** 10% of banner width
- **Position:** Top center

---

## Typography

### Title (Sender Name)

```
Font Size: base (15px)
Weight: semibold (600)
Color: text (#EAEAEA)
Max Lines: 1
Overflow: ellipsis
```

### Message Preview

```
Font Size: sm (13px)
Weight: normal (400)
Color: textSecondary (#A0A0A0)
Line Height: normal (1.5)
Max Lines: 2
Overflow: ellipsis
```

### Close Button

```
Font Size: 18px
Weight: 600
Color: textSecondary (#A0A0A0)
Symbol: ✕
Touch Target: 44x44pt
```

---

## Spacing & Dimensions

### Banner Container

```
Padding Horizontal: md (16px)
Padding Vertical: md (16px)
Border Radius: xl (16px)
Min Height: ~80px (auto-adjusts to content)
Max Height: ~120px (with 2 lines of message)
Z-Index: 9999
```

### Internal Spacing

```
Content Area:
  ├─ Top Margin: 8px (for indicator line)
  ├─ Title to Message: xs (4px)
  └─ Right Margin: sm (8px) (for close button)

Close Button:
  ├─ Padding: xs (4px)
  └─ Margin Left: sm (8px)
```

---

## Message Timestamp Display

### In Chat Bubbles (MessageItem)

#### Own Message (Right Aligned)

```
┌────────────────────────────────┐
│                                │
│  Hey! How are you?     3:45 PM │ ← White text
│                        ✓✓      │ ← Status indicator
│                                │
└────────────────────────────────┘
  Amethyst Glow background (#9C7AFF)
```

#### Other's Message (Left Aligned)

```
┌────────────────────────────────┐
│                                │
│  I'm doing great!              │
│  3:46 PM                       │ ← Gray text
│                                │
└────────────────────────────────┘
  Surface background (#2A1F3D)
```

### Timestamp Formats

**Today's Messages:**

```
12:30 PM
3:45 PM
11:59 PM
```

**Older Messages:**

```
Oct 20
Oct 19
Sep 15
```

### Timestamp Styling

```
Font Size: xs (11px)
Opacity: 0.7
Font Weight: normal (400)

Own Messages:
  Color: white (#FFFFFF)

Other Messages:
  Color: textSecondary (#A0A0A0)
```

---

## Animation Details

### Slide In

```
Type: Spring
Duration: ~400ms
Friction: 8
Tension: 40
From: translateY(-200)
To: translateY(0)
```

### Slide Out

```
Type: Timing
Duration: 300ms
Easing: default
From: translateY(0)
To: translateY(-200)
```

### Gesture Response

```
Type: Direct manipulation
Follows finger: Yes
Spring back threshold: 50px
Dismissal threshold: 50px (up/horizontal)
```

---

## Interaction States

### Default State

```
┌─────────────────────────────────────┐
│  ━━━━━                              │
│ ┃ Alice Johnson               ✕    │
│ ┃ Hey! Are we still...              │
└─────────────────────────────────────┘
  Normal opacity, no transformation
```

### Touch Down (Pressed)

```
┌─────────────────────────────────────┐
│  ━━━━━                              │
│ ┃ Alice Johnson               ✕    │
│ ┃ Hey! Are we still...              │
└─────────────────────────────────────┘
  Active opacity: 0.9
```

### Dragging

```
┌─────────────────────────────────────┐
│  ━━━━━                              │
│ ┃ Alice Johnson               ✕    │ ←─ Follows finger
│ ┃ Hey! Are we still...              │
└─────────────────────────────────────┘
  Transform: translateX/Y follows gesture
```

### Close Button Hover

```
┌─────────────────────────────────────┐
│  ━━━━━                              │
│ ┃ Alice Johnson            [✕]     │ ← Larger touch target
│ ┃ Hey! Are we still...              │
└─────────────────────────────────────┘
  Hit slop: 10pt all sides
```

---

## Notification Flow Diagram

```
New Message Arrives
        ↓
┌───────────────────────────┐
│   Is user authenticated?  │─── No ──→ [Exit]
└───────────────────────────┘
        ↓ Yes
┌───────────────────────────┐
│   Is app in foreground?   │─── No ──→ [Exit]
└───────────────────────────┘
        ↓ Yes
┌───────────────────────────┐
│ Is message in active chat?│─── Yes ──→ [Exit]
└───────────────────────────┘
        ↓ No
┌───────────────────────────┐
│   Is message from self?   │─── Yes ──→ [Exit]
└───────────────────────────┘
        ↓ No
┌───────────────────────────┐
│    Show Banner ✨         │
└───────────────────────────┘
        ↓
┌─────────────┬─────────────┐
│   User      │  Auto-      │
│ Interacts   │  Dismiss    │
└─────────────┴─────────────┘
        ↓            ↓
   [Navigate]   [Hide Banner]
```

---

## Responsive Behavior

### Small Screens (iPhone SE)

```
Banner width: Screen width - 32px (16px margin each side)
Message lines: 2
Sender name truncates with ellipsis
```

### Medium Screens (iPhone 14)

```
Banner width: Screen width - 32px
Message lines: 2
Full sender name usually visible
```

### Large Screens (iPhone 14 Pro Max)

```
Banner width: Screen width - 32px
Message lines: 2
Ample space for content
```

### Landscape Mode

```
Banner width: Screen width - 32px
Maintains aspect ratio
Same truncation rules apply
```

---

## Accessibility Considerations

### Touch Targets

- Banner entire surface: Tappable (navigate)
- Close button: 44x44pt minimum
- Hit slop on close button: 10pt all sides

### Gesture Recognition

- Swipe distance: 50px minimum
- Velocity threshold: Medium
- Allows both quick flicks and slow drags

### Safe Areas

- Respects top safe area inset
- 10px additional margin from safe area
- Never overlaps status bar

---

## Visual Examples

### Example 1: DM Notification

```
┌─────────────────────────────────────┐
│  ━━━━━                              │
│ ┃ John Doe                     ✕   │
│ ┃ Can you review my PR?             │
└─────────────────────────────────────┘
```

### Example 2: Group Notification

```
┌─────────────────────────────────────┐
│  ━━━━━                              │
│ ┃ Design Team                  ✕   │
│ ┃ Alice: The mockups are ready!     │
└─────────────────────────────────────┘
```

### Example 3: Long Message

```
┌─────────────────────────────────────┐
│  ━━━━━                              │
│ ┃ Sarah Williams              ✕    │
│ ┃ Hey! I wanted to follow up on...  │
│ ┃ our conversation from yesterd...  │
└─────────────────────────────────────┘
```

### Example 4: Long Name

```
┌─────────────────────────────────────┐
│  ━━━━━                              │
│ ┃ Christopher Alexander J...  ✕    │
│ ┃ Meeting reminder for tomorrow     │
└─────────────────────────────────────┘
```

---

## Implementation Notes

- Banner uses `position: absolute` for overlay positioning
- `zIndex: 9999` ensures it's always on top
- Uses `useSafeAreaInsets()` for notch/island handling
- PanResponder tracks both X and Y gestures
- Spring animations use `useNativeDriver: true` for performance
- Notification state managed in Context for global access
- Banner component is presentational (no business logic)
- NotificationBanner wrapper handles navigation integration

---

**Note:** This is a visual reference. For implementation details, see the component source code in `src/components/Banner.tsx`.
