/**
 * Conversations Screen
 * List of all user conversations with floating "+" button
 */

import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../theme";
import {
  subscribeToUserConversations,
  ConversationListItem,
  clearConversationForCurrentUser,
} from "../features/conversations/api";
import { PresenceBadge } from "../components/PresenceBadge";
import { Avatar } from "../components/Avatar";
import { GroupAvatar } from "../components/GroupAvatar";
import { useCasper } from "../agent/useCasper";

// Firestore-backed conversations

export default function ConversationsScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { open } = useCasper();

  useEffect(() => {
    const unsubscribe = subscribeToUserConversations(setItems, console.error);
    return unsubscribe;
  }, []);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => clearConversationForCurrentUser(id)));
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  useLayoutEffect(() => {
    navigation.setOptions?.({
      headerTitle: "Conversations",
      headerLeft: () => (
        <View
          style={{ flexDirection: "row", alignItems: "center", marginLeft: 12 }}
        >
          <TouchableOpacity
            onPress={() => {
              if (selectMode) {
                setSelectMode(false);
                setSelectedIds(new Set());
              } else {
                setSelectMode(true);
              }
            }}
            style={{ paddingHorizontal: 12 }}
          >
            <Text
              style={{ color: theme.colors.amethystGlow, fontWeight: "600" }}
            >
              {selectMode ? "Done" : "Select"}
            </Text>
          </TouchableOpacity>
          {selectMode && selectedIds.size > 0 && (
            <TouchableOpacity
              onPress={handleBulkDelete}
              style={{ paddingHorizontal: 12 }}
            >
              <Text style={{ color: theme.colors.error, fontWeight: "600" }}>
                Delete
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate("NewChat")}
          style={{ paddingHorizontal: 16 }}
        >
          <MaterialCommunityIcons
            name="pencil-box-outline"
            size={26}
            color={theme.colors.amethystGlow}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, selectMode, selectedIds.size]);

  const renderConversation = ({ item }: { item: ConversationListItem }) => {
    const isSelected = selectedIds.has(item.id);
    const content = (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          isSelected && styles.conversationItemSelected,
        ]}
        onPress={() =>
          selectMode
            ? toggleSelected(item.id)
            : navigation.navigate("Chat", {
                conversationId: item.id,
                conversationName: item.name,
              })
        }
        onLongPress={() => {
          if (!selectMode) {
            setSelectMode(true);
            toggleSelected(item.id);
          }
        }}
      >
        {selectMode && (
          <View
            style={[styles.checkbox, isSelected && styles.checkboxSelected]}
          >
            {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
          </View>
        )}
        <View style={styles.avatarContainer}>
          {item.type === "group" && item.members && item.members.length > 0 ? (
            <GroupAvatar members={item.members} size="medium" />
          ) : (
            <>
              <Avatar
                photoURL={item.otherUserPhotoURL}
                displayName={item.name}
                userId={item.otherUserId || item.id}
                size="medium"
                showOnline={!!item.otherUserId}
                isOnline={false} // Presence will be handled by PresenceBadge
              />
              {item.otherUserId && (
                <View style={styles.presenceBadgeContainer}>
                  <PresenceBadge userId={item.otherUserId} size="small" />
                </View>
              )}
            </>
          )}
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName}>{item.name}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.updatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <View style={styles.lastMessageRow}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessageText}
            </Text>
            {item.hasUnread && <View style={styles.unreadDot} />}
          </View>
        </View>
      </TouchableOpacity>
    );

    return content;
  };

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>Start a new chat</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
        />
      )}

      {/* Casper FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => open({ source: "conversations" })}
      >
        <MaterialCommunityIcons name="ghost" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  conversationItem: {
    flexDirection: "row",
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.amethystGlow,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: "#FFFFFF",
  },
  presenceBadgeContainer: {
    position: "absolute",
    bottom: 2,
    right: 2,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.xs,
  },
  conversationName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
  },
  timestamp: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  lastMessageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lastMessage: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.amethystGlow,
    flexShrink: 0,
  },
  unreadBadge: {
    backgroundColor: theme.colors.amethystGlow,
    borderRadius: theme.borderRadius.full,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xs,
  },
  unreadText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: "#FFFFFF",
  },
  fab: {
    position: "absolute",
    bottom: theme.spacing.lg,
    right: theme.spacing.lg,
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.amethystGlow,
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadows.lg,
  },
  fabIcon: {
    fontSize: 32,
    color: "#FFFFFF",
    fontWeight: theme.typography.fontWeight.regular,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.sm,
  },
  checkboxSelected: {
    backgroundColor: theme.colors.amethystGlow,
    borderColor: theme.colors.amethystGlow,
  },
  checkboxTick: {
    color: "#FFFFFF",
    fontWeight: theme.typography.fontWeight.bold,
  },
  conversationItemSelected: {
    backgroundColor: theme.colors.surface,
  },
});
