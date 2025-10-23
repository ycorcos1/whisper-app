/**
 * New Chat Screen
 * Browse contacts and search users for direct messaging
 * Create group chats via modal
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  ToastAndroid,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";
import {
  firebaseFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
} from "../lib/firebase";
import {
  createDirectConversationWith,
  createGroupConversation,
  getUserByEmail,
} from "../features/conversations/api";
import {
  addContact,
  removeContact,
  subscribeToContacts,
} from "../features/contacts/api";
import { useAuth } from "../state/auth/useAuth";

interface User {
  id: string;
  displayName: string;
  email: string;
  emailLower?: string;
}

type TabType = "contacts" | "search";

export default function NewChatScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { firebaseUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("contacts");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [contactUids, setContactUids] = useState<string[]>([]);
  const [contactUsers, setContactUsers] = useState<User[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);

  // Group creation modal state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedUserObjects, setSelectedUserObjects] = useState<User[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [addingByEmail, setAddingByEmail] = useState(false);

  // Subscribe to contacts and fetch their details
  useEffect(() => {
    const unsubscribe = subscribeToContacts(
      async (uids) => {
        setContactUids(uids);

        // Fetch all contact user details
        const users: User[] = [];
        for (const uid of uids) {
          const userDoc = await getDoc(doc(firebaseFirestore, "users", uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            users.push({
              id: userDoc.id,
              displayName: userData.displayName || "",
              email: userData.email || "",
              emailLower: userData.emailLower,
            });
          }
        }
        setContactUsers(users);
        setContactsLoading(false);
      },
      (error) => {
        console.error("Error loading contacts:", error);
        setContactsLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  // Search logic
  useEffect(() => {
    let isActive = true;
    const run = async () => {
      if (activeTab === "contacts") {
        // In contacts tab, filter the already-loaded contacts
        if (!searchQuery.trim()) {
          // No search query - show all contacts
          if (isActive) setResults([]);
          return;
        }

        // Filter contacts by search query
        const lowerQuery = searchQuery.toLowerCase();
        const filtered = contactUsers.filter(
          (user) =>
            user.displayName.toLowerCase().includes(lowerQuery) ||
            user.email.toLowerCase().includes(lowerQuery)
        );
        if (isActive) setResults(filtered);
      } else {
        // Search tab - search all users
        if (!searchQuery.trim()) {
          setResults([]);
          return;
        }

        // Query supports profiles with new emailLower field (preferred)
        // and falls back to email for legacy docs that may not have emailLower
        const lower = searchQuery.toLowerCase();
        const q = query(
          collection(firebaseFirestore, "users"),
          where("emailLower", ">=", lower),
          where("emailLower", "<=", lower + "\uf8ff")
        );
        const snap = await getDocs(q);
        let users: User[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((u) => u.id !== firebaseUser?.uid);

        // If no results (older profiles), try email field as a fallback
        if (users.length === 0) {
          const qEmail = query(
            collection(firebaseFirestore, "users"),
            where("email", ">=", searchQuery),
            where("email", "<=", searchQuery + "\uf8ff")
          );
          const snapEmail = await getDocs(qEmail);
          users = snapEmail.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) }))
            .filter((u) => u.id !== firebaseUser?.uid);
        }
        // Deduplicate by email to avoid showing duplicate entries if multiple
        // user documents exist with the same email (e.g., stale Firestore docs)
        const uniqueByEmail = Array.from(
          new Map(users.map((u) => [String(u.email).toLowerCase(), u])).values()
        );
        if (isActive) setResults(uniqueByEmail);
      }
    };
    run().catch(console.error);
    return () => {
      isActive = false;
    };
  }, [searchQuery, firebaseUser?.uid, activeTab, contactUsers]);

  // Determine which users to display in main screen
  const displayUsers: User[] = React.useMemo(() => {
    if (activeTab === "contacts") {
      // Show filtered results if searching, otherwise show all contacts
      if (searchQuery.trim()) {
        return results;
      }
      return contactUsers;
    } else {
      // Search tab - show search results
      return results;
    }
  }, [activeTab, searchQuery, results, contactUsers]);

  // Filtered contacts for group creation modal
  const filteredGroupContacts: User[] = React.useMemo(() => {
    if (!groupSearchQuery.trim()) {
      return contactUsers;
    }
    const lowerQuery = groupSearchQuery.toLowerCase();
    return contactUsers.filter(
      (user) =>
        user.displayName.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery)
    );
  }, [groupSearchQuery, contactUsers]);

  const showToast = (message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("", message);
    }
  };

  // Navigate directly to chat with user
  const handleUserPress = async (userId: string, userName: string) => {
    try {
      const cid = await createDirectConversationWith(userId);
      navigation.navigate("Chat", {
        conversationId: cid,
        conversationName: userName,
        fromNewChat: false,
      });
    } catch (error) {
      console.error("Error creating conversation:", error);
      Alert.alert("Error", "Failed to open chat");
    }
  };

  // Contact management functions
  const handleAddContact = async (userId: string, userName: string) => {
    try {
      await addContact(userId);
      showToast(`${userName} added to contacts`);
    } catch (error) {
      console.error("Error adding contact:", error);
      Alert.alert("Error", "Failed to add contact");
    }
  };

  const handleRemoveContact = (userId: string, userName: string) => {
    Alert.alert("Remove Contact", `Remove ${userName} from contacts?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeContact(userId);
            showToast(`${userName} removed from contacts`);
          } catch (error) {
            console.error("Error removing contact:", error);
            Alert.alert("Error", "Failed to remove contact");
          }
        },
      },
    ]);
  };

  // Group creation functions
  const toggleUserSelectionInGroup = (userId: string, user: User) => {
    if (selectedUsers.includes(userId)) {
      // Deselect
      setSelectedUsers((prev) => prev.filter((id) => id !== userId));
      setSelectedUserObjects((prev) => prev.filter((u) => u.id !== userId));
    } else {
      // Select
      setSelectedUsers((prev) => [...prev, userId]);
      setSelectedUserObjects((prev) => [...prev, user]);
    }
  };

  const handleAddByEmail = async () => {
    if (!emailInput.trim()) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }

    try {
      setAddingByEmail(true);
      const user = await getUserByEmail(emailInput.trim().toLowerCase());

      if (!user) {
        Alert.alert("Error", "User not found with that email");
        setAddingByEmail(false);
        return;
      }

      if (user.id === firebaseUser?.uid) {
        Alert.alert("Error", "You cannot add yourself to a group");
        setAddingByEmail(false);
        return;
      }

      if (selectedUsers.includes(user.id)) {
        Alert.alert("Error", "User is already selected");
        setAddingByEmail(false);
        return;
      }

      // Fetch full user details
      const userDoc = await getDoc(doc(firebaseFirestore, "users", user.id));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        const fullUser: User = {
          id: userDoc.id,
          displayName: userData.displayName || "",
          email: userData.email || "",
          emailLower: userData.emailLower,
        };
        toggleUserSelectionInGroup(user.id, fullUser);
        setEmailInput("");
        showToast(`${fullUser.displayName} added`);
      }
      setAddingByEmail(false);
    } catch (error) {
      console.error("Error adding by email:", error);
      Alert.alert("Error", "Failed to add user");
      setAddingByEmail(false);
    }
  };

  const handleCreateGroup = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert("Error", "Please select at least one person");
      return;
    }

    try {
      const cid = await createGroupConversation(selectedUsers);
      const groupName = selectedUserObjects
        .map((u) => u.displayName)
        .join(", ");

      // Reset modal state
      setShowGroupModal(false);
      setSelectedUsers([]);
      setSelectedUserObjects([]);
      setGroupSearchQuery("");
      setEmailInput("");

      navigation.navigate("Chat", {
        conversationId: cid,
        conversationName: groupName || "Group Chat",
        fromNewChat: false,
      });
    } catch (error) {
      console.error("Error creating group:", error);
      Alert.alert("Error", "Failed to create group");
    }
  };

  // Render user row for main screen (Contacts/Search tabs)
  const renderUser = ({ item }: { item: User }) => {
    const isContactUser = contactUids.includes(item.id);

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleUserPress(item.id, item.displayName)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.displayName[0]}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.displayName}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        {/* Show contact affordance only in Search tab */}
        {activeTab === "search" && (
          <TouchableOpacity
            style={[
              styles.contactAffordance,
              isContactUser && styles.contactAffordanceActive,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              if (isContactUser) {
                handleRemoveContact(item.id, item.displayName);
              } else {
                handleAddContact(item.id, item.displayName);
              }
            }}
          >
            <Text
              style={[
                styles.contactAffordanceText,
                isContactUser && styles.contactAffordanceTextActive,
              ]}
            >
              {isContactUser ? "✓" : "+"}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // Render user row for group creation modal
  const renderGroupUser = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => toggleUserSelectionInGroup(item.id, item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.displayName[0]}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text
            style={[styles.userName, isSelected && styles.userNameSelected]}
          >
            {item.displayName}
          </Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "contacts" && styles.tabActive]}
            onPress={() => {
              setActiveTab("contacts");
              setSearchQuery("");
            }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "contacts" && styles.tabTextActive,
              ]}
            >
              Contacts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "search" && styles.tabActive]}
            onPress={() => {
              setActiveTab("search");
              setSearchQuery("");
            }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "search" && styles.tabTextActive,
              ]}
            >
              Search
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === "contacts"
                ? "Filter contacts..."
                : "Search users..."
            }
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="done"
            blurOnSubmit={true}
          />
        </View>

        {/* Content */}
        {contactsLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={theme.colors.amethystGlow} />
            <Text style={styles.emptySubtext}>Loading...</Text>
          </View>
        ) : displayUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {activeTab === "contacts"
                ? contactUsers.length === 0
                  ? "No contacts yet"
                  : "No contacts found"
                : "No users found"}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? "Try a different search"
                : activeTab === "contacts"
                ? "Search users to start chatting"
                : "Search for users to start a chat"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderUser}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Create Group Button */}
        <TouchableOpacity
          style={styles.createGroupButton}
          onPress={() => setShowGroupModal(true)}
        >
          <Text style={styles.createGroupButtonText}>Create Group</Text>
        </TouchableOpacity>

        {/* Group Creation Modal */}
        <Modal
          visible={showGroupModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setShowGroupModal(false);
            setSelectedUsers([]);
            setSelectedUserObjects([]);
            setGroupSearchQuery("");
            setEmailInput("");
          }}
        >
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowGroupModal(false);
                  setSelectedUsers([]);
                  setSelectedUserObjects([]);
                  setGroupSearchQuery("");
                  setEmailInput("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Group</Text>
              <TouchableOpacity
                onPress={handleCreateGroup}
                disabled={selectedUsers.length === 0}
              >
                <Text
                  style={[
                    styles.modalCreateText,
                    selectedUsers.length === 0 &&
                      styles.modalCreateTextDisabled,
                  ]}
                >
                  Create
                </Text>
              </TouchableOpacity>
            </View>

            {/* Selected Users Chips */}
            {selectedUserObjects.length > 0 && (
              <ScrollView
                horizontal
                style={styles.selectedUsersContainer}
                contentContainerStyle={styles.selectedUsersContent}
                showsHorizontalScrollIndicator={false}
              >
                {selectedUserObjects.map((user) => (
                  <View key={user.id} style={styles.userChip}>
                    <Text style={styles.userChipText} numberOfLines={1}>
                      {user.displayName}
                    </Text>
                    <TouchableOpacity
                      onPress={() => toggleUserSelectionInGroup(user.id, user)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.userChipRemove}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Search Contacts */}
            <View style={styles.modalSearchContainer}>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search contacts..."
                placeholderTextColor={theme.colors.textSecondary}
                value={groupSearchQuery}
                onChangeText={setGroupSearchQuery}
                returnKeyType="done"
              />
            </View>

            {/* Add by Email */}
            <View style={styles.addEmailContainer}>
              <TextInput
                style={styles.emailInput}
                placeholder="Add by email..."
                placeholderTextColor={theme.colors.textSecondary}
                value={emailInput}
                onChangeText={setEmailInput}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleAddByEmail}
              />
              <TouchableOpacity
                style={[
                  styles.addEmailButton,
                  addingByEmail && styles.addEmailButtonDisabled,
                ]}
                onPress={handleAddByEmail}
                disabled={addingByEmail}
              >
                {addingByEmail ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.addEmailButtonText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Contacts List */}
            {contactsLoading ? (
              <View style={styles.modalEmptyState}>
                <ActivityIndicator
                  size="large"
                  color={theme.colors.amethystGlow}
                />
              </View>
            ) : filteredGroupContacts.length === 0 ? (
              <View style={styles.modalEmptyState}>
                <Text style={styles.emptyText}>
                  {contactUsers.length === 0
                    ? "No contacts yet"
                    : "No contacts found"}
                </Text>
                <Text style={styles.emptySubtext}>
                  Add users by email above
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredGroupContacts}
                keyExtractor={(item) => item.id}
                renderItem={renderGroupUser}
                keyboardShouldPersistTaps="handled"
              />
            )}
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: theme.colors.amethystGlow,
  },
  tabText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.amethystGlow,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  searchContainer: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  userItemSelected: {
    backgroundColor: theme.colors.lavenderHaze + "20", // 20% opacity
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.lavenderHaze,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  avatarText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: "#FFFFFF",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  userNameSelected: {
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.lavenderHaze,
  },
  userEmail: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  contactAffordance: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  contactAffordanceActive: {
    backgroundColor: theme.colors.amethystGlow,
    borderColor: theme.colors.amethystGlow,
  },
  contactAffordanceText: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },
  contactAffordanceTextActive: {
    color: "#FFFFFF",
  },
  createGroupButton: {
    backgroundColor: theme.colors.amethystGlow,
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: "center",
  },
  createGroupButtonText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalCancelText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
  },
  modalCreateText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.amethystGlow,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  modalCreateTextDisabled: {
    opacity: 0.5,
  },
  selectedUsersContainer: {
    maxHeight: 80,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectedUsersContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  userChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.lavenderHaze + "30",
    borderRadius: theme.borderRadius.full,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
    maxWidth: 150,
  },
  userChipText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.lavenderHaze,
    fontWeight: theme.typography.fontWeight.medium,
  },
  userChipRemove: {
    fontSize: 20,
    color: theme.colors.lavenderHaze,
    fontWeight: theme.typography.fontWeight.bold,
    marginLeft: theme.spacing.xs,
  },
  modalSearchContainer: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalSearchInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addEmailContainer: {
    flexDirection: "row",
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
  addEmailButton: {
    backgroundColor: theme.colors.amethystGlow,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 70,
  },
  addEmailButtonDisabled: {
    opacity: 0.6,
  },
  addEmailButtonText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  modalEmptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
});
