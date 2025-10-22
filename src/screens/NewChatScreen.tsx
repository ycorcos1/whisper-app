/**
 * New Chat Screen
 * Search and select users to start a conversation
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
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
} from "../lib/firebase";
import {
  createDirectConversationWith,
  createGroupConversation,
} from "../features/conversations/api";
import { useAuth } from "../state/auth/useAuth";

interface User {
  id: string;
  displayName: string;
  email: string;
  emailLower?: string;
}

export default function NewChatScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { firebaseUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedUserObjects, setSelectedUserObjects] = useState<User[]>([]);
  const [results, setResults] = useState<User[]>([]);

  useEffect(() => {
    let isActive = true;
    const run = async () => {
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
    };
    run().catch(console.error);
    return () => {
      isActive = false;
    };
  }, [searchQuery, firebaseUser?.uid]);

  // Combine selected users with search results, ensuring selected users are always visible
  const filteredUsers: User[] = React.useMemo(() => {
    // Start with selected users
    const selectedSet = new Set(selectedUsers);
    const combined = [...selectedUserObjects];

    // Add search results that aren't already selected
    results.forEach((user) => {
      if (!selectedSet.has(user.id)) {
        combined.push(user);
      }
    });

    return combined;
  }, [selectedUserObjects, results, selectedUsers]);

  const toggleUserSelection = (userId: string, user: User) => {
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

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) return;

    try {
      let cid: string;
      let conversationName: string;

      if (selectedUsers.length === 1) {
        // Create DM
        cid = await createDirectConversationWith(selectedUsers[0]);
        // Get the selected user's name for navigation
        const selectedUser = selectedUserObjects[0];
        conversationName = selectedUser?.displayName ?? "Chat";
      } else {
        // Create group chat
        cid = await createGroupConversation(selectedUsers);
        // Generate group name from selected users
        const selectedUserNames = selectedUserObjects
          .map((u) => u.displayName)
          .join(", ");
        conversationName = selectedUserNames || "Group Chat";
      }

      navigation.navigate("Chat", {
        conversationId: cid,
        conversationName,
      });
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const renderUser = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.includes(item.id);

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => toggleUserSelection(item.id, item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.displayName[0]}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.displayName}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        {isSelected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
      </View>

      {filteredUsers.length === 0 && selectedUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No users found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery
              ? "Try a different search"
              : "Search for users to start a chat"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
        />
      )}

      {selectedUsers.length > 0 && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateChat}
        >
          <Text style={styles.createButtonText}>
            {selectedUsers.length === 1
              ? "Create Chat"
              : `Create Group (${selectedUsers.length})`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  userEmail: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.amethystGlow,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
  },
  createButton: {
    backgroundColor: theme.colors.amethystGlow,
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: "center",
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});
