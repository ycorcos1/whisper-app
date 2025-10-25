# Phase 1: Final Implementation Steps

## ✅ Completed So Far

1. ✅ Dependencies installed (`chrono-node`, `date-fns`, `@react-native-picker/picker`)
2. ✅ Date/time parser created (`dateParser.ts`)
3. ✅ Type definitions updated (roles, schedule events)
4. ✅ Firestore rules updated
5. ✅ ChatSettingsScreen partially updated (imports, state, role handler)

## 🔧 Final UI Changes Needed

Add the role selector UI to the member row. Update the `memberDetails.map()` section in `ChatSettingsScreen.tsx`:

### Find this section (around line 498):

```typescript
{
  memberDetails.map((member) => (
    <View key={member.userId} style={styles.memberRow}>
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>
            {member.displayName}
            {member.userId === firebaseUser?.uid && " (You)"}
          </Text>
          <PresenceBadge userId={member.userId} size="small" />
        </View>
        {member.email && <Text style={styles.memberEmail}>{member.email}</Text>}
      </View>

      {member.userId !== firebaseUser?.uid && (
        <TouchableOpacity
          style={styles.removeMemberButton}
          onPress={() => handleRemoveMember(member.userId, member.displayName)}
        >
          <Text style={styles.removeMemberButtonText}>Remove</Text>
        </TouchableOpacity>
      )}
    </View>
  ));
}
```

### Replace with:

```typescript
{
  memberDetails.map((member) => (
    <View key={member.userId} style={styles.memberRow}>
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>
            {member.displayName}
            {member.userId === firebaseUser?.uid && " (You)"}
          </Text>
          <PresenceBadge userId={member.userId} size="small" />
        </View>
        {member.email && <Text style={styles.memberEmail}>{member.email}</Text>}

        {/* Role Selector */}
        <TouchableOpacity
          style={styles.roleSelector}
          onPress={() =>
            setSelectedMemberForRole({
              userId: member.userId,
              currentRole: member.role,
            })
          }
        >
          <Text style={styles.roleLabel}>Role:</Text>
          <Text style={styles.roleValue}>{member.role}</Text>
          <Text style={styles.roleArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {member.userId !== firebaseUser?.uid && (
        <TouchableOpacity
          style={styles.removeMemberButton}
          onPress={() => handleRemoveMember(member.userId, member.displayName)}
        >
          <Text style={styles.removeMemberButtonText}>Remove</Text>
        </TouchableOpacity>
      )}
    </View>
  ));
}
```

### Add Role Selector Modal

Add this after the Leave Group section (before the closing `</ScrollView>`):

```typescript
{
  /* Role Selector Modal */
}
<Modal
  visible={selectedMemberForRole !== null}
  transparent
  animationType="fade"
  onRequestClose={() => setSelectedMemberForRole(null)}
>
  <TouchableOpacity
    style={styles.modalOverlay}
    activeOpacity={1}
    onPress={() => setSelectedMemberForRole(null)}
  >
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Select Role</Text>

      {(
        ["Friend", "PM", "SE", "QA", "Design", "Stakeholder"] as MemberRole[]
      ).map((role) => (
        <TouchableOpacity
          key={role}
          style={[
            styles.roleOption,
            selectedMemberForRole?.currentRole === role &&
              styles.roleOptionSelected,
          ]}
          onPress={() => {
            if (selectedMemberForRole) {
              handleRoleChange(selectedMemberForRole.userId, role);
            }
          }}
        >
          <Text
            style={[
              styles.roleOptionText,
              selectedMemberForRole?.currentRole === role &&
                styles.roleOptionTextSelected,
            ]}
          >
            {role}
          </Text>
          {selectedMemberForRole?.currentRole === role && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.modalCancelButton}
        onPress={() => setSelectedMemberForRole(null)}
      >
        <Text style={styles.modalCancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
</Modal>;
```

### Add Styles

Add these styles to the stylesheet (before the closing `});`):

```typescript
roleSelector: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: theme.spacing.xs,
  paddingVertical: theme.spacing.xs,
  paddingHorizontal: theme.spacing.sm,
  backgroundColor: theme.colors.background,
  borderRadius: theme.borderRadius.md,
  borderWidth: 1,
  borderColor: theme.colors.border,
},
roleLabel: {
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.textSecondary,
  marginRight: theme.spacing.xs,
},
roleValue: {
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.amethystGlow,
  fontWeight: theme.typography.fontWeight.semibold,
  flex: 1,
},
roleArrow: {
  fontSize: theme.typography.fontSize.lg,
  color: theme.colors.textSecondary,
},
modalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  justifyContent: "center",
  alignItems: "center",
},
modalContent: {
  backgroundColor: theme.colors.surface,
  borderRadius: theme.borderRadius.xl,
  padding: theme.spacing.xl,
  width: "80%",
  maxWidth: 400,
},
modalTitle: {
  fontSize: theme.typography.fontSize.xl,
  fontWeight: theme.typography.fontWeight.semibold,
  color: theme.colors.text,
  marginBottom: theme.spacing.lg,
  textAlign: "center",
},
roleOption: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: theme.spacing.md,
  paddingHorizontal: theme.spacing.lg,
  borderRadius: theme.borderRadius.lg,
  marginBottom: theme.spacing.xs,
  backgroundColor: theme.colors.background,
},
roleOptionSelected: {
  backgroundColor: theme.colors.amethystGlow + "20",
  borderWidth: 2,
  borderColor: theme.colors.amethystGlow,
},
roleOptionText: {
  fontSize: theme.typography.fontSize.base,
  color: theme.colors.text,
  fontWeight: theme.typography.fontWeight.medium,
},
roleOptionTextSelected: {
  color: theme.colors.amethystGlow,
  fontWeight: theme.typography.fontWeight.semibold,
},
checkmark: {
  fontSize: theme.typography.fontSize.xl,
  color: theme.colors.amethystGlow,
  fontWeight: theme.typography.fontWeight.bold,
},
modalCancelButton: {
  marginTop: theme.spacing.lg,
  paddingVertical: theme.spacing.md,
  borderRadius: theme.borderRadius.lg,
  backgroundColor: theme.colors.background,
  borderWidth: 1,
  borderColor: theme.colors.border,
},
modalCancelButtonText: {
  fontSize: theme.typography.fontSize.base,
  fontWeight: theme.typography.fontWeight.semibold,
  color: theme.colors.text,
  textAlign: "center",
},
```

## Testing Phase 1

Once implemented:

1. Create a group chat with 3+ members
2. Navigate to Chat Settings
3. You should see a "Role:" selector under each member
4. Tap a role to open the modal
5. Select a role (PM, SE, Design, etc.)
6. Verify it saves and persists

## Next: Phase 2

Once Phase 1 is complete and tested, we'll move to Phase 2:

- Schedule command parser
- User matching system
- Intent detection updates

---

**Instructions:**  
Since we're in Ask Mode limitations, please manually apply the UI changes above to `ChatSettingsScreen.tsx`. Let me know when done and I'll help with Phase 2!

