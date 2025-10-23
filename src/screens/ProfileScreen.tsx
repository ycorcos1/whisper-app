/**
 * Profile Screen
 * User profile with avatar, display name, and logout
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { theme } from "../theme";
import { useAuth } from "../state/auth/useAuth";
import { Avatar } from "../components/Avatar";
import { uploadAvatar } from "../lib/avatarUtils";
import { firebaseFirestore, doc, updateDoc } from "../lib/firebase";

export default function ProfileScreen() {
  const { user, loading, logout, updateDisplayName } = useAuth();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [updatingName, setUpdatingName] = useState(false);

  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            Alert.alert("Error", "Failed to log out. Please try again.");
          }
        },
      },
    ]);
  };

  const handleUploadAvatar = async () => {
    if (!user) return;

    try {
      setUploadingAvatar(true);
      setUploadProgress(0);

      // Upload avatar image
      const avatarUrl = await uploadAvatar(user.uid, (progress) => {
        setUploadProgress(progress);
      });

      // If user cancelled, avatarUrl will be null
      if (!avatarUrl) {
        setUploadingAvatar(false);
        return; // User cancelled - no error
      }

      // Update user profile in Firestore
      const userRef = doc(firebaseFirestore, "users", user.uid);
      await updateDoc(userRef, {
        photoURL: avatarUrl,
      });

      setUploadingAvatar(false);
      Alert.alert("Success", "Profile picture updated successfully!");
    } catch (error: any) {
      setUploadingAvatar(false);
      console.error("Error uploading avatar:", error);

      Alert.alert(
        "Error",
        error?.message || "Failed to upload profile picture. Please try again."
      );
    }
  };

  const handleEditName = () => {
    setNewDisplayName(user?.displayName || "");
    setEditingName(true);
  };

  const handleSaveDisplayName = async () => {
    if (!user) return;

    const trimmedName = newDisplayName.trim();
    if (!trimmedName) {
      Alert.alert("Error", "Display name cannot be empty");
      return;
    }

    if (trimmedName === user.displayName) {
      setEditingName(false);
      return;
    }

    try {
      setUpdatingName(true);
      await updateDisplayName(trimmedName);
      setEditingName(false);
      Alert.alert("Success", "Display name updated successfully!");
    } catch (error: any) {
      console.error("Error updating display name:", error);
      Alert.alert(
        "Error",
        error?.message || "Failed to update display name. Please try again."
      );
    } finally {
      setUpdatingName(false);
    }
  };

  if (loading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.amethystGlow} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {/* <TouchableOpacity
          style={styles.avatarContainer}
          onPress={handleUploadAvatar}
          disabled={uploadingAvatar}
        > */}
        <View style={styles.avatarContainer}>
          <Avatar
            photoURL={user.photoURL}
            displayName={user.displayName}
            userId={user.uid}
            size="xl"
          />
          {uploadingAvatar && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.uploadProgressText}>
                {Math.round(uploadProgress)}%
              </Text>
            </View>
          )}
          {/* <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>✎</Text>
          </View> */}
        </View>
        {/* </TouchableOpacity> */}
        <Text style={styles.displayName}>{user.displayName}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>

        {/* <TouchableOpacity
          style={styles.button}
          onPress={handleUploadAvatar}
          disabled={uploadingAvatar}
        >
          <Text style={styles.buttonText}>
            {uploadingAvatar ? "Uploading..." : "Upload Profile Picture"}
          </Text>
        </TouchableOpacity> */}

        <TouchableOpacity
          style={styles.button}
          onPress={handleEditName}
          disabled={uploadingAvatar}
        >
          <Text style={styles.buttonText}>Edit Display Name</Text>
        </TouchableOpacity>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Member Since</Text>
          <Text style={styles.infoValue}>
            {user.createdAt?.toDate
              ? new Date(user.createdAt.toDate()).toLocaleDateString()
              : "N/A"}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={[styles.buttonText, styles.logoutButtonText]}>
            Log Out
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.sectionText}>
          Whisper v2.4.0{"\n"}
          Secure messaging with style{"\n\n"}
          Built with React Native & Firebase
        </Text>
      </View>

      {/* Display Name Edit Modal */}
      <Modal
        visible={editingName}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingName(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Display Name</Text>

            <TextInput
              style={styles.modalInput}
              value={newDisplayName}
              onChangeText={setNewDisplayName}
              placeholder="Enter new display name"
              placeholderTextColor={theme.colors.textSecondary}
              autoFocus
              maxLength={50}
              editable={!updatingName}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setEditingName(false)}
                disabled={updatingName}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonSave,
                  updatingName && styles.modalButtonDisabled,
                ]}
                onPress={handleSaveDisplayName}
                disabled={updatingName}
              >
                {updatingName ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    style={[styles.modalButtonText, styles.modalButtonSaveText]}
                  >
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  header: {
    alignItems: "center",
    paddingVertical: theme.spacing["2xl"],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: theme.spacing.md,
  },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: theme.borderRadius.full,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadProgressText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    marginTop: theme.spacing.xs,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.amethystGlow,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: theme.colors.background,
  },
  editBadgeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: theme.typography.fontWeight.bold,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.amethystGlow,
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadows.lg,
  },
  avatarText: {
    fontSize: theme.typography.fontSize["3xl"],
    fontWeight: theme.typography.fontWeight.bold,
    color: "#FFFFFF",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.border,
    borderWidth: 3,
    borderColor: theme.colors.background,
  },
  onlineIndicatorActive: {
    backgroundColor: theme.colors.success,
  },
  displayName: {
    fontSize: theme.typography.fontSize["2xl"],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  email: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  section: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  sectionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight:
      theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
  },
  button: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: "center",
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.amethystGlow,
  },
  logoutButton: {
    backgroundColor: "transparent",
    borderColor: theme.colors.error,
  },
  logoutButtonText: {
    color: theme.colors.error,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  modalButtons: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  modalButton: {
    flex: 1,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  modalButtonCancel: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalButtonSave: {
    backgroundColor: theme.colors.amethystGlow,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
  },
  modalButtonSaveText: {
    color: "#FFFFFF",
  },
});
