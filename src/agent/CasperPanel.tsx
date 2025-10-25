/**
 * Casper Panel
 * The main AI agent panel UI with tabs and content
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../theme";
import { useCasper } from "./useCasper";
import { CasperTab } from "../types/agent";
import { AskTab } from "./CasperTabs/Ask";
import { SummaryTab } from "./CasperTabs/Summary";
import { ActionsTab } from "./CasperTabs/Actions";
import { DecisionsTab } from "./CasperTabs/Decisions";
import { DigestTab } from "./CasperTabs/Digest";
import { PlannerTab } from "./CasperTabs/Planner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { cancelAllQueries } from "./qa/controller";

export const CasperPanel: React.FC = () => {
  const { state, heightAnim, close, setActiveTab } = useCasper();

  const handleTabChange = (tab: CasperTab) => {
    // Cancel any in-flight queries when switching tabs
    if (state.activeTab === "Ask") {
      cancelAllQueries();
    }
    setActiveTab(tab);
  };

  const tabs: CasperTab[] = [
    "Ask",
    "Summary",
    "Actions",
    "Decisions",
    "Digest",
    "Planner",
  ];

  const renderTabContent = () => {
    switch (state.activeTab) {
      case "Ask":
        return (
          <ErrorBoundary fallbackMessage="Failed to load Ask tab. Please try again.">
            <AskTab />
          </ErrorBoundary>
        );
      case "Summary":
        return (
          <ErrorBoundary fallbackMessage="Failed to load Summary tab. Please try again.">
            <SummaryTab />
          </ErrorBoundary>
        );
      case "Actions":
        return (
          <ErrorBoundary fallbackMessage="Failed to load Actions tab. Please try again.">
            <ActionsTab />
          </ErrorBoundary>
        );
      case "Decisions":
        return (
          <ErrorBoundary fallbackMessage="Failed to load Decisions tab. Please try again.">
            <DecisionsTab />
          </ErrorBoundary>
        );
      case "Digest":
        return (
          <ErrorBoundary fallbackMessage="Failed to load Digest tab. Please try again.">
            <DigestTab />
          </ErrorBoundary>
        );
      case "Planner":
        return (
          <ErrorBoundary fallbackMessage="Failed to load Planner tab. Please try again.">
            <PlannerTab />
          </ErrorBoundary>
        );
      default:
        return <DigestTab />;
    }
  };

  return (
    <Animated.View
      style={[styles.panel, { height: heightAnim }]}
      pointerEvents={state.visible ? "auto" : "none"}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <MaterialCommunityIcons
            name="ghost"
            size={24}
            color={theme.colors.amethystGlow}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.title}>Casper</Text>
        </View>
        <TouchableOpacity onPress={close} style={styles.closeButton}>
          <MaterialCommunityIcons
            name="chevron-down"
            size={24}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, state.activeTab === tab && styles.tabActive]}
            onPress={() => handleTabChange(tab)}
          >
            <Text
              style={[
                styles.tabText,
                state.activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <View style={styles.content}>{renderTabContent()}</View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    overflow: "hidden",
    ...theme.shadows.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  tabsContainer: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabsContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    gap: theme.spacing.xs,
  },
  tab: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.xs,
  },
  tabActive: {
    backgroundColor: theme.colors.amethystGlow,
  },
  tabText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontWeight: theme.typography.fontWeight.semibold,
  },
  content: {
    flex: 1,
  },
});
