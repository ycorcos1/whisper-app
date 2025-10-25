/**
 * Chat Settings Screen
 * Dynamic settings based on conversation type (DM vs Group)
 */

import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  ToastAndroid,
  Platform,
  Modal,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { AuthContext } from "../state/auth/AuthContext";
import {
  // getConversation,
  getUserDisplayName,
  ConversationDoc,
  updateGroupName,
  addMembersToGroup,
  removeMemberFromGroup,
  leaveGroup,
  getUserByEmail,
  subscribeToConversation,
} from "../features/conversations/api";
import { addContact, removeContact, isContact } from "../features/contacts/api";
import {
  firebaseFirestore,
  getDoc,
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot,
} from "../lib/firebase";
import { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";
import { PresenceBadge } from "../components/PresenceBadge";
import { MemberRole } from "../types/casper";

type ChatSettingsRouteProp = RouteProp<RootStackParamList, "ChatSettings">;
type ChatSettingsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ChatSettings"
>;

export default function ChatSettingsScreen() {
  const route = useRoute<ChatSettingsRouteProp>();
  const navigation = useNavigation<ChatSettingsNavigationProp>();
  const { conversationId } = route.params;
  const { firebaseUser } = useContext(AuthContext);

  const [conversation, setConversation] = useState<ConversationDoc | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [otherUserDisplayName, setOtherUserDisplayName] = useState("");
  const [otherUserEmail, setOtherUserEmail] = useState("");
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [isContactState, setIsContactState] = useState(false);
  const [checkingContact, setCheckingContact] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [memberDetails, setMemberDetails] = useState<
    Array<{
      userId: string;
      displayName: string;
      email: string;
      role: MemberRole;
    }>
  >([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<{
    userId: string;
    currentRole: MemberRole;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToConversation(
      conversationId,
      async (conv) => {
        try {
          setLoading(true);

          if (!conv) {
            Alert.alert("Error", "Conversation not found");
            navigation.goBack();
            return;
          }

          setConversation(conv);

          if (conv.type === "dm") {
            // Load other user's details
            const otherUserId = conv.members.find(
              (m) => m !== firebaseUser?.uid
            );
            if (otherUserId) {
              setOtherUserId(otherUserId);
              const displayName = await getUserDisplayName(otherUserId);
              const userDoc = await getDoc(
                doc(firebaseFirestore, "users", otherUserId)
              );

              if (userDoc.exists()) {
                const userData = userDoc.data() as {
                  displayName?: string;
                  email?: string;
                };
                setOtherUserDisplayName(userData.displayName || displayName);
                setOtherUserEmail(userData.email || "");
              } else {
                setOtherUserDisplayName(displayName);
              }

              // Check if this user is a contact
              setCheckingContact(true);
              const contactStatus = await isContact(otherUserId);
              setIsContactState(contactStatus);
              setCheckingContact(false);
            }
          } else if (conv.type === "group") {
            // Check if current user is still a member
            const isCurrentUserMember = conv.members.includes(
              firebaseUser?.uid || ""
            );

            if (!isCurrentUserMember) {
              // User is no longer a member, navigate back
              Alert.alert("Info", "You are no longer a member of this group");
              navigation.goBack();
              return;
            }

            // Load group name
            setGroupName(conv.groupName || "Group Chat");

            // Load all member details
            const details = await Promise.all(
              conv.members.map(async (memberId) => {
                const displayName = await getUserDisplayName(memberId);
                const userDoc = await getDoc(
                  doc(firebaseFirestore, "users", memberId)
                );

                let email = "";
                if (userDoc.exists()) {
                  const userData = userDoc.data() as {
                    email?: string;
                  };
                  email = userData.email || "";
                }

                // Load member role from Firestore
                let role: MemberRole = "Friend"; // Default
                try {
                  const memberDoc = await getDoc(
                    doc(
                      firebaseFirestore,
                      `conversations/${conversationId}/members/${memberId}`
                    )
                  );
                  if (memberDoc.exists()) {
                    const memberData = memberDoc.data() as {
                      role?: MemberRole;
                    };
                    role = memberData.role || "Friend";
                  }
                } catch (error) {
                  console.error("Error loading member role:", error);
                }

                return { userId: memberId, displayName, email, role };
              })
            );
            setMemberDetails(details);
          }

          setLoading(false);
        } catch (error) {
          console.error("Error loading conversation details:", error);
          Alert.alert("Error", "Failed to load conversation details");
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error subscribing to conversation:", error);
        Alert.alert("Error", "Failed to load conversation details");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [conversationId, firebaseUser?.uid, navigation]);

  // Subscribe to real-time user document updates for display names
  useEffect(() => {
    if (!conversation) return;

    const unsubscribers: (() => void)[] = [];

    // Subscribe to each member's user document
    for (const memberId of conversation.members) {
      const userDocRef = doc(firebaseFirestore, "users", memberId);

      const unsubscribe = onSnapshot(
        userDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.data() as {
              displayName?: string;
              email?: string;
            };
            const displayName =
              userData.displayName || userData.email || memberId;

            // For DM, update other user's display name (only if changed)
            if (
              conversation.type === "dm" &&
              memberId !== firebaseUser?.uid &&
              memberId === otherUserId
            ) {
              setOtherUserDisplayName((prev) => {
                if (prev !== displayName) {
                  return displayName;
                }
                return prev;
              });
              setOtherUserEmail((prev) => {
                const newEmail = userData.email || "";
                if (prev !== newEmail) {
                  return newEmail;
                }
                return prev;
              });
            }

            // For group chat, update member details (only if changed)
            if (conversation.type === "group") {
              setMemberDetails((prev) => {
                const member = prev.find((m) => m.userId === memberId);
                if (
                  member &&
                  (member.displayName !== displayName ||
                    member.email !== (userData.email || member.email))
                ) {
                  return prev.map((m) =>
                    m.userId === memberId
                      ? {
                          ...m,
                          displayName,
                          email: userData.email || m.email,
                        }
                      : m
                  );
                }
                return prev;
              });
            }
          }
        },
        (error) => {
          console.error(`Error listening to user ${memberId}:`, error);
        }
      );

      unsubscribers.push(unsubscribe);
    }

    // Cleanup all listeners
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [conversation, firebaseUser?.uid, otherUserId]);

  const showToast = (message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("", message);
    }
  };

  const handleAddContact = async () => {
    if (!otherUserId) return;

    try {
      await addContact(otherUserId);
      setIsContactState(true);
      showToast("Contact added");
    } catch (error) {
      console.error("Error adding contact:", error);
      Alert.alert("Error", "Failed to add contact");
    }
  };

  const handleRemoveContact = () => {
    if (!otherUserId) return;

    Alert.alert(
      "Remove Contact",
      `Remove ${otherUserDisplayName} from your contacts?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeContact(otherUserId);
              setIsContactState(false);
              showToast("Contact removed");
            } catch (error) {
              console.error("Error removing contact:", error);
              Alert.alert("Error", "Failed to remove contact");
            }
          },
        },
      ]
    );
  };

  const handleDeleteConversation = () => {
    Alert.alert(
      "Delete Conversation",
      "This will remove the conversation for you only. Other participants will still see it. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Per-user clear: do not delete shared conversation
              const { clearConversationForCurrentUser } = await import(
                "../features/conversations/api"
              );
              await clearConversationForCurrentUser(conversationId);
              navigation.navigate("Home", { screen: "Conversations" });
            } catch (error) {
              console.error("Error deleting conversation:", error);
              Alert.alert("Error", "Failed to delete conversation");
            }
          },
        },
      ]
    );
  };

  const handleSaveGroupName = async () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Group name cannot be empty");
      return;
    }

    try {
      await updateGroupName(conversationId, groupName.trim());
      setIsEditingName(false);
      Alert.alert("Success", "Group name updated");
      // Data will update automatically via subscription
    } catch (error) {
      console.error("Error updating group name:", error);
      Alert.alert("Error", "Failed to update group name");
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }

    try {
      setAddingMember(true);
      const user = await getUserByEmail(newMemberEmail.trim().toLowerCase());

      if (!user) {
        Alert.alert("Error", "User not found with that email");
        setAddingMember(false);
        return;
      }

      if (conversation?.members.includes(user.id)) {
        Alert.alert("Error", "User is already a member of this group");
        setAddingMember(false);
        return;
      }

      await addMembersToGroup(conversationId, [user.id]);
      setNewMemberEmail("");
      Alert.alert("Success", "Member added to group");
      // Data will update automatically via subscription
      setAddingMember(false);
    } catch (error) {
      console.error("Error adding member:", error);
      Alert.alert("Error", "Failed to add member");
      setAddingMember(false);
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert("Remove Member", `Remove ${memberName} from this group?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeMemberFromGroup(conversationId, memberId);
            Alert.alert("Success", "Member removed from group");
            // Data will update automatically via subscription
          } catch (error) {
            console.error("Error removing member:", error);
            Alert.alert("Error", "Failed to remove member");
          }
        },
      },
    ]);
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      "Leave Group",
      "Are you sure you want to leave this group? You'll be removed from the members list.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveGroup(conversationId);
              navigation.navigate("Home", { screen: "Conversations" });
            } catch (error) {
              console.error("Error leaving group:", error);
              Alert.alert("Error", "Failed to leave group");
            }
          },
        },
      ]
    );
  };

  const handleRoleChange = async (userId: string, newRole: MemberRole) => {
    try {
      const member = memberDetails.find((m) => m.userId === userId);
      if (!member) return;

      // Update in Firestore
      await setDoc(
        doc(
          firebaseFirestore,
          `conversations/${conversationId}/members/${userId}`
        ),
        {
          userId,
          role: newRole,
          displayName: member.displayName,
          joinedAt: serverTimestamp(),
          email: member.email || "",
        },
        { merge: true }
      );

      // Update local state
      setMemberDetails((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, role: newRole } : m))
      );

      showToast(`Role updated to ${newRole}`);
      setSelectedMemberForRole(null);
    } catch (error) {
      console.error("Error updating role:", error);
      Alert.alert("Error", "Failed to update member role");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.amethystGlow} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Conversation not found</Text>
      </View>
    );
  }

  // Render DM settings
  if (conversation.type === "dm") {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Display Name</Text>
            <Text style={styles.infoValue}>{otherUserDisplayName}</Text>
          </View>

          {otherUserEmail && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{otherUserEmail}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteConversation}
          >
            <Text style={styles.deleteButtonText}>Delete Conversation</Text>
          </TouchableOpacity>
          <Text style={styles.deleteHint}>
            This will only remove the conversation for you. The other person
            will still have access to the chat.
          </Text>
        </View>

        {/* Add/Remove Contact Section */}
        <View style={styles.section}>
          {checkingContact ? (
            <ActivityIndicator size="small" color={theme.colors.amethystGlow} />
          ) : isContactState ? (
            <>
              <TouchableOpacity
                style={styles.removeContactButton}
                onPress={handleRemoveContact}
              >
                <Text style={styles.removeContactButtonText}>
                  Remove Contact
                </Text>
              </TouchableOpacity>
              <Text style={styles.contactHint}>
                Remove {otherUserDisplayName} from your contacts list
              </Text>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.addContactButton}
                onPress={handleAddContact}
              >
                <Text style={styles.addContactButtonText}>Add Contact</Text>
              </TouchableOpacity>
              <Text style={styles.contactHint}>
                Add {otherUserDisplayName} to your contacts for quick access
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    );
  }

  // Render Group settings
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Group Name Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Group Name</Text>

        {isEditingName ? (
          <View style={styles.editNameContainer}>
            <TextInput
              style={styles.nameInput}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Enter group name"
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={100}
            />
            <View style={styles.editNameButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setGroupName(conversation.groupName || "Group Chat");
                  setIsEditingName(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveGroupName}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.nameDisplayContainer}>
            <Text style={styles.groupNameText}>{groupName}</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditingName(true)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Members Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Members ({memberDetails.length})
        </Text>

        {memberDetails.map((member) => (
          <View key={member.userId} style={styles.memberRow}>
            <View style={styles.memberInfo}>
              <View style={styles.memberNameRow}>
                <Text style={styles.memberName}>
                  {member.displayName}
                  {member.userId === firebaseUser?.uid && " (You)"}
                </Text>
                <PresenceBadge userId={member.userId} size="small" />
              </View>
              {member.email && (
                <Text style={styles.memberEmail}>{member.email}</Text>
              )}

              {/* Role Selector - Only editable for current user */}
              {member.userId === firebaseUser?.uid ? (
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
              ) : (
                <View style={styles.roleSelectorDisabled}>
                  <Text style={styles.roleLabel}>Role:</Text>
                  <Text style={styles.roleValueDisabled}>{member.role}</Text>
                </View>
              )}
            </View>

            {member.userId !== firebaseUser?.uid && (
              <TouchableOpacity
                style={styles.removeMemberButton}
                onPress={() =>
                  handleRemoveMember(member.userId, member.displayName)
                }
              >
                <Text style={styles.removeMemberButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* Add Member Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Member</Text>

        <View style={styles.addMemberContainer}>
          <TextInput
            style={styles.emailInput}
            value={newMemberEmail}
            onChangeText={setNewMemberEmail}
            placeholder="Enter email address"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.addButton, addingMember && styles.addButtonDisabled]}
            onPress={handleAddMember}
            disabled={addingMember}
          >
            {addingMember ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.addButtonText}>Add</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Delete Conversation Section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteConversation}
        >
          <Text style={styles.deleteButtonText}>Delete Conversation</Text>
        </TouchableOpacity>
        <Text style={styles.deleteHint}>
          This will only remove the conversation for you. Other members will
          still have access to the group.
        </Text>
      </View>

      {/* Leave Group Section */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGroup}>
          <Text style={styles.leaveButtonText}>Leave Group</Text>
        </TouchableOpacity>
        <Text style={styles.leaveHint}>
          You will be removed from the group and won't receive any more
          messages.
        </Text>
      </View>

      {/* Role Selector Modal */}
      <Modal
        visible={selectedMemberForRole !== null}
        transparent={true}
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
              [
                "Friend",
                "PM",
                "SE",
                "QA",
                "Design",
                "Stakeholder",
              ] as MemberRole[]
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
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: theme.spacing.lg,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  errorText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.error,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    marginBottom: theme.spacing.md,
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  infoValue: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    fontWeight: theme.typography.fontWeight.medium,
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  deleteHint: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  editNameContainer: {
    gap: theme.spacing.md,
  },
  nameInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editNameButtons: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  button: {
    flex: 1,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
  },
  saveButton: {
    backgroundColor: theme.colors.amethystGlow,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  nameDisplayContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  groupNameText: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    fontWeight: theme.typography.fontWeight.medium,
  },
  editButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  editButtonText: {
    color: theme.colors.amethystGlow,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  memberName: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    fontWeight: theme.typography.fontWeight.medium,
  },
  memberEmail: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  removeMemberButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  removeMemberButtonText: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  addMemberContainer: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  emailInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addButton: {
    backgroundColor: theme.colors.amethystGlow,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 70,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  leaveButton: {
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: "center",
  },
  leaveButtonText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  leaveHint: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  addContactButton: {
    backgroundColor: theme.colors.amethystGlow,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: "center",
  },
  addContactButtonText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  removeContactButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  removeContactButtonText: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  contactHint: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  // Role Selector Styles
  roleSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    alignSelf: "flex-start",
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
    marginRight: theme.spacing.xs,
  },
  roleArrow: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  roleSelectorDisabled: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    alignSelf: "flex-start",
    opacity: 0.6,
  },
  roleValueDisabled: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    width: "100%",
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  roleOption: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  roleOptionSelected: {
    backgroundColor: theme.colors.amethystGlow,
    borderColor: theme.colors.amethystGlow,
  },
  roleOptionText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    textAlign: "center",
    fontWeight: theme.typography.fontWeight.medium,
  },
  roleOptionTextSelected: {
    color: "#FFFFFF",
    fontWeight: theme.typography.fontWeight.semibold,
  },
  modalCancelButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalCancelButtonText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    textAlign: "center",
    fontWeight: theme.typography.fontWeight.medium,
  },
});
