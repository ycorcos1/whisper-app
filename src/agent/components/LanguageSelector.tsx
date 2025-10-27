/**
 * Language Selector Component
 * Dropdown for selecting target language in translator mode
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import {
  SupportedLanguage,
  AVAILABLE_LANGUAGES,
  LanguageMetadata,
} from "../translation/types";

interface LanguageSelectorProps {
  selectedLanguage: SupportedLanguage;
  onLanguageChange: (language: SupportedLanguage) => void;
  disabled?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedLangData = AVAILABLE_LANGUAGES.find(
    (l) => l.name === selectedLanguage
  );

  const handleSelectLanguage = (language: SupportedLanguage) => {
    onLanguageChange(language);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.selector, disabled && styles.disabled]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        accessible={true}
        accessibilityLabel={`Select language. Currently selected: ${selectedLanguage}`}
        accessibilityHint="Opens language selection menu"
        accessibilityRole="button"
      >
        <Text style={styles.flag}>{selectedLangData?.flag || "🌐"}</Text>
        <Text style={styles.languageName}>{selectedLanguage}</Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={20}
          color={disabled ? theme.colors.textSecondary : theme.colors.text}
        />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
                accessible={true}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
            </View>

            <FlatList
              data={AVAILABLE_LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const isSelected = item.name === selectedLanguage;
                return (
                  <TouchableOpacity
                    style={[
                      styles.languageItem,
                      isSelected && styles.languageItemSelected,
                    ]}
                    onPress={() => handleSelectLanguage(item.name)}
                    accessible={true}
                    accessibilityLabel={item.name}
                    accessibilityHint={
                      isSelected
                        ? "Currently selected"
                        : `Select ${item.name} as translation language`
                    }
                    accessibilityRole="button"
                  >
                    <Text style={styles.languageItemFlag}>{item.flag}</Text>
                    <Text
                      style={[
                        styles.languageItemName,
                        isSelected && styles.languageItemNameSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {isSelected && (
                      <MaterialCommunityIcons
                        name="check"
                        size={20}
                        color={theme.colors.amethystGlow}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selector: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  disabled: {
    opacity: 0.5,
  },
  flag: {
    fontSize: 18,
  },
  languageName: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    width: "100%",
    maxWidth: 300,
    maxHeight: 400,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  languageItemSelected: {
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },
  languageItemFlag: {
    fontSize: 24,
  },
  languageItemName: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
  },
  languageItemNameSelected: {
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.amethystGlow,
  },
});
