# PR #6: Visual Reference Guide

This document shows what the UI should look like for the Actions and Decisions tabs.

## Actions Tab

### With Action Items

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  👻 Casper                                    ⌄  ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Ask   Summary   [Actions]   Decisions   Digest  ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                            👁️‍🗨️ Hide Done          ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                   ┃
┃  ┌─────────────────────────────────────────────┐ ┃
┃  │ 📌 [✓] Update documentation by EOD        📌│ ┃  ← Pinned, done
┃  │        📅 EOD │ 📊 90%                       │ ┃
┃  └─────────────────────────────────────────────┘ ┃
┃                                                   ┃
┃  ┌─────────────────────────────────────────────┐ ┃
┃  │    [ ] Review PR #123                      📍│ ┃  ← Not pinned
┃  │        👤 @john │ 📊 85%                     │ ┃
┃  └─────────────────────────────────────────────┘ ┃
┃                                                   ┃
┃  ┌─────────────────────────────────────────────┐ ┃
┃  │    [ ] Deploy to staging tomorrow          📍│ ┃
┃  │        📅 tomorrow │ 📊 80%                  │ ┃
┃  └─────────────────────────────────────────────┘ ┃
┃                                                   ┃
┃  ┌─────────────────────────────────────────────┐ ┃
┃  │    [ ] Fix the navigation bug              📍│ ┃
┃  │        📊 75%                                 │ ┃
┃  └─────────────────────────────────────────────┘ ┃
┃                                                   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### With "Show Done" Enabled

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  👻 Casper                                    ⌄  ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Ask   Summary   [Actions]   Decisions   Digest  ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                            👁️ Show Done           ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                   ┃
┃  ┌─────────────────────────────────────────────┐ ┃
┃  │ 📌 [✓] Update documentation by EOD        📌│ ┃  ← Done & showing
┃  │        📅 EOD │ 📊 90%                       │ ┃
┃  └─────────────────────────────────────────────┘ ┃
┃                                                   ┃
┃  ┌─────────────────────────────────────────────┐ ┃
┃  │    [✓] Review the design mockups           📍│ ┃  ← Done item
┃  │        📊 88%                                 │ ┃
┃  └─────────────────────────────────────────────┘ ┃
┃                                                   ┃
┃  ┌─────────────────────────────────────────────┐ ┃
┃  │    [ ] Deploy to staging tomorrow          📍│ ┃  ← Not done
┃  │        📅 tomorrow │ 📊 80%                  │ ┃
┃  └─────────────────────────────────────────────┘ ┃
┃                                                   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Empty State

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  👻 Casper                                    ⌄  ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Ask   Summary   [Actions]   Decisions   Digest  ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                   ┃
┃                                                   ┃
┃                     📋                            ┃
┃                                                   ┃
┃              No pending actions                   ┃
┃                                                   ┃
┃   Mark items as done or toggle 'Show Done'       ┃
┃        to see completed actions.                  ┃
┃                                                   ┃
┃                                                   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## Decisions Tab

### With Decisions

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  👻 Casper                                    ⌄  ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Ask   Summary   Actions   [Decisions]   Digest  ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                   ┃
┃  ┌─────────────────────────────────────────────┐ ┃
┃  │ 📌                                          │ ┃
┃  │ 💡 Oct 24, 2:30 PM        [95%]           📌│ ┃  ← Pinned
┃  │                                             │ ┃
┃  │ We agreed: Use TypeScript for the          │ ┃
┃  │ frontend implementation                     │ ┃
┃  │                                             │ ┃
┃  └─────────────────────────────────────────────┘ ┃
┃                                                   ┃
┃  ┌─────────────────────────────────────────────┐ ┃
┃  │ 💡 Oct 24, 11:45 AM       [90%]           📍│ ┃  ← Not pinned
┃  │                                             │ ┃
┃  │ Final decision: Deploy on Friday at 3 PM    │ ┃
┃  │                                             │ ┃
┃  └─────────────────────────────────────────────┘ ┃
┃                                                   ┃
┃  ┌─────────────────────────────────────────────┐ ┃
┃  │ 💡 Oct 23, 4:15 PM        [85%]           📍│ ┃
┃  │                                             │ ┃
┃  │ Let's go with: AWS for infrastructure       │ ┃
┃  │                                             │ ┃
┃  └─────────────────────────────────────────────┘ ┃
┃                                                   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Empty State

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  👻 Casper                                    ⌄  ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Ask   Summary   Actions   [Decisions]   Digest  ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                   ┃
┃                                                   ┃
┃                     💡                            ┃
┃                                                   ┃
┃                No decisions yet                   ┃
┃                                                   ┃
┃    Final decisions and agreements from this       ┃
┃          conversation will appear here.           ┃
┃                                                   ┃
┃                                                   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## Color Guide

### Actions Tab

- **Checkbox (unchecked):** White background, gray border
- **Checkbox (checked):** Purple background (#8B5CF6), white checkmark
- **Done text:** Gray strikethrough
- **Pin icon (unpinned):** Gray outline
- **Pin icon (pinned):** Purple solid
- **Card background:** Surface color with subtle border
- **Meta info:** Gray text at 12px

### Decisions Tab

- **Lightbulb icon:** Purple (#8B5CF6)
- **Confidence badge:** Light purple background, purple text
- **Pin icon:** Same as Actions tab
- **Card background:** Surface color with subtle border
- **Timestamp:** Gray text
- **Content:** Default text color

---

## Interactive States

### Pin Button

```
Normal:   📍 (outline, gray)
Hover:    📍 (outline, darker)
Pinned:   📌 (solid, purple)
```

### Checkbox

```
Empty:     [ ] (white with border)
Hover:     [ ] (border slightly darker)
Checked:   [✓] (purple with white check)
Done text: ~~strikethrough~~ (gray)
```

### Toggle Button (Show/Hide Done)

```
Hide Done: 👁️‍🗨️ Hide Done (purple text)
Show Done: 👁️ Show Done (purple text)
```

---

## Typography

- **Action title:** 16px, medium weight
- **Decision content:** 16px, normal weight
- **Meta info:** 12px, normal weight
- **Confidence badge:** 11px, semibold
- **Empty state title:** 18px, semibold
- **Empty state subtitle:** 14px, normal

---

## Spacing

- **Card padding:** 16px
- **Card gap:** 8px between cards
- **Icon-text gap:** 4px
- **Meta items gap:** 8px
- **List padding:** 16px all sides

---

## Animations

- **Pin toggle:** Instant color change
- **Done toggle:** Instant strikethrough
- **Sorting:** 200ms ease for reordering
- **Pull-to-refresh:** Native system animation

---

## Testing Checklist

Use this visual reference to verify:

- [ ] All icons show correctly
- [ ] Colors match the theme
- [ ] Spacing is consistent
- [ ] Text is readable
- [ ] Interactive elements respond to taps
- [ ] Empty states look polished
- [ ] Cards have proper shadows/borders
- [ ] Confidence badges are visible
- [ ] Pin state is clear (outline vs solid)
- [ ] Done items have strikethrough

---

**Note:** Actual colors will depend on your theme (light/dark mode). This guide shows the intended structure and interactions.
