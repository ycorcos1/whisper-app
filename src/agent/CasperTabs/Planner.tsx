/**
 * Planner Tab
 * PR 7: Multi-step agent orchestration UI
 * Allows users to create and view multi-step plans
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useCasper } from "../useCasper";
import { Plan, AgentTask, ConversationMember } from "../../types/casper";
import { createPlan, listPlans } from "../planner/plannerService";
import {
  handleScheduleCommand,
  isScheduleCommand,
  ScheduleMeetingResult,
} from "../planner/schedulingService";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { firebaseFirestore, firebaseAuth } from "../../lib/firebase";
import {
  deleteMeetingEvent,
  updateMeetingStatus,
} from "../planner/scheduleService";
import { ScheduleEvent } from "../../types/casper";
import { formatDateTime } from "../planner/dateParser";

export const PlannerTab: React.FC = () => {
  const { state } = useCasper();

  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [meetingResult, setMeetingResult] =
    useState<ScheduleMeetingResult | null>(null);
  const [meetings, setMeetings] = useState<ScheduleEvent[]>([]);
  const [completedMeetings, setCompletedMeetings] = useState<ScheduleEvent[]>(
    []
  );

  // Load plans for this conversation (or all plans if no conversation context)
  const loadPlans = async () => {
    setIsLoadingPlans(true);
    setError(null);

    try {
      // Note: Temporarily not filtering by conversationId until Firestore index is built
      // Once index is ready (usually 5-10 minutes), you can uncomment the conversationId filter
      const result = await listPlans({
        limit: 20,
        conversationId: state.context.cid, // Will be undefined for global view
      });

      if (result.success && result.plans) {
        setPlans(result.plans);
      } else {
        setError(result.error || "Failed to load plans");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setIsLoadingPlans(false);
    }
  };

  // Handle delete meeting
  const handleDeleteMeeting = async (eventId: string) => {
    try {
      await deleteMeetingEvent(eventId);
      // Real-time listener will update automatically!
    } catch (err) {
      console.error("Error deleting meeting:", err);
      setError("Failed to delete meeting");
    }
  };

  // Handle mark as done
  const handleMarkAsDone = async (eventId: string) => {
    try {
      await updateMeetingStatus(eventId, "done");
      // Real-time listener will update automatically!
    } catch (err) {
      console.error("Error marking meeting as done:", err);
      setError("Failed to mark meeting as done");
    }
  };

  // Handle meeting scheduling
  const handleScheduling = async () => {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      setError("You must be logged in to schedule meetings");
      return;
    }

    if (!state.context.cid) {
      setError("No conversation selected");
      return;
    }

    setIsCreating(true);
    setError(null);
    setMeetingResult(null);
    setCurrentPlan(null);

    try {
      // Check if this is a DM
      const conversationDoc = await getDoc(
        doc(firebaseFirestore, `conversations/${state.context.cid}`)
      );

      if (!conversationDoc.exists()) {
        setError("Conversation not found");
        return;
      }

      const conversationData = conversationDoc.data();
      const isDM = conversationData?.isDM || false;
      const dmPartnerId = isDM
        ? conversationData?.participants?.find(
            (p: string) => p !== currentUser.uid
          )
        : undefined;

      // Ensure current user is still a member before attempting privileged reads
      const convMembers: string[] = conversationData?.members || [];
      if (!convMembers.includes(currentUser.uid)) {
        setIsCreating(false);
        setError("You are no longer a member of this conversation.");
        return;
      }

      // Get conversation members with roles
      const membersRef = collection(
        firebaseFirestore,
        `conversations/${state.context.cid}/members`
      );
      const membersSnap = await getDocs(membersRef);

      let freshMembers: ConversationMember[] = [];

      // If no members subcollection exists, create from conversation participants
      if (membersSnap.empty && conversationData?.members) {
        // Get user details for each participant
        for (const participantId of conversationData.members) {
          try {
            const userDoc = await getDoc(
              doc(firebaseFirestore, `users/${participantId}`)
            );
            if (userDoc.exists()) {
              const userData = userDoc.data();
              freshMembers.push({
                userId: participantId,
                displayName: userData.displayName || "Unknown",
                role: "Friend", // Default role
                joinedAt: conversationData.updatedAt,
                email: userData.email,
                photoURL: userData.photoURL,
              });
            }
          } catch (err) {
            console.error("Error loading user:", participantId, err);
          }
        }
      } else {
        // Use existing members subcollection, but fetch fresh user data
        const batch = writeBatch(firebaseFirestore);
        let needsUpdate = false;

        for (const memberDoc of membersSnap.docs) {
          const data = memberDoc.data();
          const userId = data.userId || memberDoc.id;

          try {
            // Always fetch fresh user data for current display name
            const userDoc = await getDoc(
              doc(firebaseFirestore, `users/${userId}`)
            );

            let displayName = "Unknown";
            let email = "";
            let photoURL = null;

            if (userDoc.exists()) {
              const userData = userDoc.data();
              displayName = userData.displayName || userData.email || "Unknown";
              email = userData.email || "";
              photoURL = userData.photoURL || null;

              // Check if we need to update the members subcollection
              if (
                data.displayName !== displayName ||
                data.email !== email ||
                data.photoURL !== photoURL
              ) {
                // console.log("🔄 Updating member data in subcollection", {
                //   userId,
                //   oldDisplayName: data.displayName,
                //   newDisplayName: displayName,
                // });

                // Update the member document with fresh data
                batch.update(memberDoc.ref, {
                  displayName,
                  email,
                  photoURL,
                  updatedAt: serverTimestamp(),
                });
                needsUpdate = true;
              }
            }

            freshMembers.push({
              userId,
              displayName,
              role: data.role || "Friend",
              joinedAt: data.joinedAt,
              email,
              photoURL,
            });
          } catch (err) {
            console.error("Error loading fresh user data:", userId, err);
            // Fallback to cached data
            freshMembers.push({
              userId,
              displayName: data.displayName || "Unknown",
              role: data.role || "Friend",
              joinedAt: data.joinedAt,
              email: data.email,
              photoURL: data.photoURL,
            });
          }
        }

        // Commit updates to members subcollection if needed
        if (needsUpdate) {
          try {
            await batch.commit();
            // console.log(
            //   "✅ Updated members subcollection with fresh display names"
            // );
          } catch (err) {
            console.error("Error updating members subcollection:", err);
            // Continue anyway - we still have fresh data for this operation
          }
        }
      }

      // Ensure member list aligns with canonical conversation members so "everyone" always works
      if (
        conversationData?.members &&
        Array.isArray(conversationData.members)
      ) {
        const idToMember = new Map<string, ConversationMember>();
        freshMembers.forEach((m) => idToMember.set(m.userId, m));
        const aligned: ConversationMember[] = [];
        for (const uid of conversationData.members as string[]) {
          const found = idToMember.get(uid);
          if (found) {
            aligned.push(found);
          } else {
            try {
              const userDoc = await getDoc(
                doc(firebaseFirestore, `users/${uid}`)
              );
              if (userDoc.exists()) {
                const u = userDoc.data() as any;
                aligned.push({
                  userId: uid,
                  displayName: u.displayName || u.email || "Unknown",
                  role: "Friend",
                  joinedAt: conversationData.updatedAt,
                  email: u.email,
                  photoURL: u.photoURL,
                });
              }
            } catch (e) {
              console.warn("Alignment fetch failed for", uid, e);
            }
          }
        }
        freshMembers = aligned;
      }

      if (freshMembers.length === 0) {
        setError("No conversation members found");
        return;
      }

      // DEBUG: Log fresh member data
      //   console.log("🔍 DEBUG: Fresh member data loaded", {
      //     conversationId: state.context.cid,
      //     membersCount: freshMembers.length,
      //     members: freshMembers.map((m) => ({
      //       userId: m.userId,
      //       displayName: m.displayName,
      //       role: m.role,
      //       email: m.email,
      //     })),
      //   });

      const result = await handleScheduleCommand(
        query,
        state.context.cid,
        currentUser.uid,
        freshMembers,
        isDM,
        dmPartnerId
      );

      setMeetingResult(result);

      if (result.success) {
        setQuery(""); // Clear input on success
      } else {
        setError(result.errors?.join("\n") || "Failed to schedule meeting");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to schedule meeting"
      );
    } finally {
      setIsCreating(false);
    }
  };

  // Create a new plan (or schedule meeting)
  const handleCreatePlan = async () => {
    if (!query.trim()) {
      setError("Please enter a query");
      return;
    }

    // Check if this is a schedule command
    if (isScheduleCommand(query)) {
      await handleScheduling();
      // Real-time listener will show new meeting automatically!
      return;
    }

    if (query.length < 10) {
      setError("Query is too short (min 10 characters)");
      return;
    }

    setIsCreating(true);
    setError(null);
    setCurrentPlan(null);
    setMeetingResult(null);

    try {
      const result = await createPlan(query, state.context.cid);

      if (result.success && result.plan) {
        setCurrentPlan(result.plan);
        setQuery(""); // Clear input
        // Reload plans list
        await loadPlans();
      } else {
        setError(result.error || "Failed to create plan");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create plan");
    } finally {
      setIsCreating(false);
    }
  };

  // Load plans and meetings on mount (always load plans and meetings)
  // Set up real-time listener for meetings
  React.useEffect(() => {
    // Always load plans (global or conversation-specific)
    loadPlans();

    // Set up real-time listener for meetings
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) return;

    const meetingsRef = collection(
      firebaseFirestore,
      `schedules/${currentUser.uid}/events`
    );

    // Real-time listener - updates automatically when meetings change!
    const unsubscribe = onSnapshot(
      meetingsRef,
      (snapshot) => {
        try {
          // Check if user is still authenticated
          if (!firebaseAuth.currentUser) {
            return;
          }

          const now = new Date();
          const allMeetings = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title,
              startTime: data.startTime.toDate(),
              duration: data.duration,
              participants: data.participants,
              createdBy: data.createdBy,
              conversationId: data.conversationId,
              status: data.status,
              createdAt: data.createdAt.toDate(),
            };
          });

          // Separate upcoming and completed meetings
          const upcomingMeetings = allMeetings
            .filter((meeting) => {
              // Upcoming: not done, in the future
              // Show all meetings if no conversation context, otherwise filter by conversation
              return (
                meeting.status !== "done" &&
                meeting.startTime >= now &&
                (!state.context.cid ||
                  meeting.conversationId === state.context.cid)
              );
            })
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

          const completedMeetings = allMeetings
            .filter((meeting) => {
              // Completed: marked as done
              // Show all meetings if no conversation context, otherwise filter by conversation
              return (
                meeting.status === "done" &&
                (!state.context.cid ||
                  meeting.conversationId === state.context.cid)
              );
            })
            .sort((a, b) => b.startTime.getTime() - a.startTime.getTime()); // Most recent first

          setMeetings(upcomingMeetings);
          setCompletedMeetings(completedMeetings);
        } catch (err) {
          console.error("Error processing meetings snapshot:", err);
        }
      },
      (error) => {
        // Only log error if user is still authenticated
        if (firebaseAuth.currentUser) {
          console.error("Error listening to meetings:", error);
        }
      }
    );

    // Cleanup listener on unmount or conversation change
    return () => unsubscribe();
  }, [state.context.cid]);

  // Helper: Get task icon
  const getTaskIcon = (type: string) => {
    switch (type) {
      case "summarize":
        return "text-box-outline";
      case "find_times":
        return "calendar-clock";
      case "generate_plan":
        return "lightbulb-outline";
      case "search_context":
        return "magnify";
      default:
        return "cog-outline";
    }
  };

  // Helper: Get task status color
  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return theme.colors.success || "#4CAF50";
      case "running":
        return theme.colors.amethystGlow;
      case "failed":
        return "#C62828";
      case "pending":
      default:
        return theme.colors.textSecondary;
    }
  };

  // Helper: Get intent display name
  const getIntentName = (intent: string) => {
    switch (intent) {
      case "offsite_planning":
        return "Offsite Planning";
      case "meeting_scheduling":
        return "Meeting Scheduling";
      case "task_breakdown":
        return "Task Breakdown";
      default:
        return "General Planning";
    }
  };

  // Helper: Render task
  const renderTask = (task: AgentTask) => (
    <View key={task.id} style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <MaterialCommunityIcons
          name={getTaskIcon(task.type) as any}
          size={20}
          color={getTaskStatusColor(task.status)}
        />
        <Text style={styles.taskDescription}>{task.description}</Text>
      </View>

      <View style={styles.taskStatus}>
        <MaterialCommunityIcons
          name={
            task.status === "completed"
              ? "check-circle"
              : task.status === "running"
              ? "loading"
              : task.status === "failed"
              ? "alert-circle"
              : "circle-outline"
          }
          size={16}
          color={getTaskStatusColor(task.status)}
        />
        <Text
          style={[
            styles.taskStatusText,
            { color: getTaskStatusColor(task.status) },
          ]}
        >
          {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
        </Text>
      </View>

      {task.error && (
        <View style={styles.taskError}>
          <Text style={styles.taskErrorText}>{task.error}</Text>
        </View>
      )}

      {task.result && task.status === "completed" && (
        <TouchableOpacity
          style={styles.viewResultButton}
          onPress={() => {
            // Could expand to show full result
            // console.log("Task result:", task.result);
          }}
        >
          <Text style={styles.viewResultButtonText}>View Result</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={16}
            color={theme.colors.amethystGlow}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  // Helper: Render plan
  const renderPlan = (plan: Plan) => (
    <View key={plan.id} style={styles.planCard}>
      <View style={styles.planHeader}>
        <View style={styles.planHeaderLeft}>
          <MaterialCommunityIcons
            name="robot-outline"
            size={24}
            color={theme.colors.amethystGlow}
          />
          <View style={styles.planHeaderText}>
            <Text style={styles.planIntent}>{getIntentName(plan.intent)}</Text>
            <Text style={styles.planDate}>
              {new Date(plan.createdAt).toLocaleDateString()} at{" "}
              {new Date(plan.createdAt).toLocaleTimeString()}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.planStatusBadge,
            {
              backgroundColor:
                plan.status === "completed"
                  ? theme.colors.success || "#4CAF50"
                  : plan.status === "running"
                  ? theme.colors.amethystGlow
                  : plan.status === "failed"
                  ? "#C62828"
                  : theme.colors.textSecondary,
            },
          ]}
        >
          <Text style={styles.planStatusText}>{plan.status}</Text>
        </View>
      </View>

      {/* Tasks */}
      <View style={styles.tasksContainer}>
        <Text style={styles.tasksTitle}>Execution Steps:</Text>
        {plan.tasks.map(renderTask)}
      </View>

      {/* Summary */}
      {plan.summary && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Plan Summary:</Text>
          <ScrollView
            style={styles.summaryScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.summaryText}>{plan.summary}</Text>
          </ScrollView>
        </View>
      )}

      {/* Error */}
      {plan.error && (
        <View style={styles.planError}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={20}
            color="#C62828"
          />
          <Text style={styles.planErrorText}>{plan.error}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Multi-Step Planner</Text>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => setShowHistory(!showHistory)}
        >
          <MaterialCommunityIcons
            name={showHistory ? "arrow-left" : "history"}
            size={20}
            color={theme.colors.amethystGlow}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingPlans}
            onRefresh={loadPlans}
            tintColor={theme.colors.amethystGlow}
          />
        }
      >
        {!showHistory ? (
          <>
            {/* Input Section - Only show when in a specific conversation */}
            {state.context.cid && (
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>
                  What would you like to plan?
                </Text>
                <Text style={styles.inputHint}>
                  Examples: "Plan team offsite next month", "Schedule meeting
                  with design team", "Break down Q4 roadmap"
                </Text>

                <TextInput
                  style={styles.input}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Enter your planning query..."
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  editable={!isCreating}
                />

                <TouchableOpacity
                  style={[
                    styles.runButton,
                    (!query.trim() || isCreating) && styles.runButtonDisabled,
                  ]}
                  onPress={handleCreatePlan}
                  disabled={!query.trim() || isCreating}
                >
                  {isCreating ? (
                    <>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={styles.runButtonText}>Creating Plan...</Text>
                    </>
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name="play-circle"
                        size={20}
                        color="#FFFFFF"
                      />
                      <Text style={styles.runButtonText}>Run Plan</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Error Display */}
            {error && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={20}
                  color="#C62828"
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Meeting Result */}
            {meetingResult && (
              <View style={styles.meetingResultContainer}>
                <View style={styles.meetingResultHeader}>
                  <MaterialCommunityIcons
                    name={
                      meetingResult.success ? "check-circle" : "alert-circle"
                    }
                    size={24}
                    color={
                      meetingResult.success
                        ? theme.colors.success || "#4CAF50"
                        : "#C62828"
                    }
                  />
                  <Text
                    style={[
                      styles.meetingResultTitle,
                      meetingResult.success && styles.meetingResultTitleSuccess,
                    ]}
                  >
                    {meetingResult.success
                      ? "Meeting Scheduled!"
                      : "Scheduling Failed"}
                  </Text>
                </View>

                <Text style={styles.meetingResultMessage}>
                  {meetingResult.message}
                </Text>

                {meetingResult.success && meetingResult.details && (
                  <View style={styles.meetingDetails}>
                    <View style={styles.meetingDetailRow}>
                      <MaterialCommunityIcons
                        name="calendar"
                        size={16}
                        color={theme.colors.textSecondary}
                      />
                      <Text style={styles.meetingDetailText}>
                        {new Date(
                          meetingResult.details.startTime
                        ).toLocaleDateString()}{" "}
                        at{" "}
                        {new Date(
                          meetingResult.details.startTime
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>

                    <View style={styles.meetingDetailRow}>
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={16}
                        color={theme.colors.textSecondary}
                      />
                      <Text style={styles.meetingDetailText}>
                        {meetingResult.details.duration} minutes
                      </Text>
                    </View>

                    <View style={styles.meetingDetailRow}>
                      <MaterialCommunityIcons
                        name="account-multiple"
                        size={16}
                        color={theme.colors.textSecondary}
                      />
                      <Text style={styles.meetingDetailText}>
                        {meetingResult.details.participantNames.length}{" "}
                        participant(s)
                      </Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={() => setMeetingResult(null)}
                >
                  <Text style={styles.dismissButtonText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Global Mode Info */}
            {!state.context.cid && (
              <View style={styles.globalModeInfo}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={24}
                  color={theme.colors.amethystGlow}
                />
                <Text style={styles.globalModeText}>
                  Viewing all your scheduled meetings across conversations. To
                  create new plans, open a specific conversation.
                </Text>
              </View>
            )}

            {/* Upcoming Meetings */}
            {meetings.length > 0 && (
              <View style={styles.meetingsSection}>
                <Text style={styles.sectionTitle}>
                  📅 Your Scheduled Meetings ({meetings.length})
                </Text>
                {meetings.map((meeting) => (
                  <View key={meeting.id} style={styles.meetingCard}>
                    <View style={styles.meetingHeader}>
                      <MaterialCommunityIcons
                        name="calendar-clock"
                        size={20}
                        color={theme.colors.amethystGlow}
                      />
                      <Text style={styles.meetingTitle}>{meeting.title}</Text>
                      {meeting.status && (
                        <View
                          style={[
                            styles.statusBadge,
                            meeting.status === "done" && styles.statusBadgeDone,
                            meeting.status === "accepted" &&
                              styles.statusBadgeAccepted,
                            meeting.status === "declined" &&
                              styles.statusBadgeDeclined,
                          ]}
                        >
                          <Text style={styles.statusBadgeText}>
                            {meeting.status}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.meetingDetails}>
                      <View style={styles.meetingDetailRow}>
                        <MaterialCommunityIcons
                          name="clock-outline"
                          size={16}
                          color={theme.colors.textSecondary}
                        />
                        <Text style={styles.meetingDetailText}>
                          {formatDateTime(
                            meeting.startTime instanceof Date
                              ? meeting.startTime
                              : meeting.startTime.toDate()
                          )}
                        </Text>
                      </View>

                      <View style={styles.meetingDetailRow}>
                        <MaterialCommunityIcons
                          name="timer-outline"
                          size={16}
                          color={theme.colors.textSecondary}
                        />
                        <Text style={styles.meetingDetailText}>
                          {meeting.duration} minutes
                        </Text>
                      </View>

                      <View style={styles.meetingDetailRow}>
                        <MaterialCommunityIcons
                          name="account-multiple"
                          size={16}
                          color={theme.colors.textSecondary}
                        />
                        <Text style={styles.meetingDetailText}>
                          {meeting.participants.length} participant(s)
                        </Text>
                      </View>
                    </View>

                    <View style={styles.meetingActions}>
                      {/* Only show buttons if current user is the organizer */}
                      {meeting.createdBy === firebaseAuth.currentUser?.uid && (
                        <>
                          {meeting.status !== "done" && (
                            <TouchableOpacity
                              style={[
                                styles.meetingActionButton,
                                styles.doneButton,
                              ]}
                              onPress={() => handleMarkAsDone(meeting.id)}
                            >
                              <MaterialCommunityIcons
                                name="check-circle-outline"
                                size={16}
                                color="#FFFFFF"
                              />
                              <Text style={styles.meetingActionButtonText}>
                                Mark Done
                              </Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={[
                              styles.meetingActionButton,
                              styles.deleteButton,
                            ]}
                            onPress={() => handleDeleteMeeting(meeting.id)}
                          >
                            <MaterialCommunityIcons
                              name="delete-outline"
                              size={16}
                              color="#FFFFFF"
                            />
                            <Text style={styles.meetingActionButtonText}>
                              Delete
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Completed meetings are shown only in Plan History */}

            {/* Current Plan - Only show when in a specific conversation */}
            {state.context.cid && currentPlan && (
              <View style={styles.currentPlanSection}>
                <Text style={styles.sectionTitle}>Current Plan</Text>
                {renderPlan(currentPlan)}
              </View>
            )}

            {/* Recent Plans Preview - Only show when in a specific conversation */}
            {state.context.cid && !currentPlan && plans.length > 0 && (
              <View style={styles.recentPlansSection}>
                <Text style={styles.sectionTitle}>Recent Plans</Text>
                {plans.slice(0, 3).map(renderPlan)}
                {plans.length > 3 && (
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => setShowHistory(true)}
                  >
                    <Text style={styles.viewAllButtonText}>
                      View all {plans.length} plans
                    </Text>
                    <MaterialCommunityIcons
                      name="arrow-right"
                      size={16}
                      color={theme.colors.amethystGlow}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Empty State - Only show when in a specific conversation */}
            {state.context.cid &&
              !currentPlan &&
              plans.length === 0 &&
              !isLoadingPlans && (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="robot-outline"
                    size={64}
                    color={theme.colors.amethystGlow}
                  />
                  <Text style={styles.emptyText}>Create Your First Plan</Text>
                  <Text style={styles.emptySubtext}>
                    Use multi-step reasoning to plan offsites, schedule
                    meetings, or break down complex tasks.
                  </Text>
                </View>
              )}
          </>
        ) : (
          // History View
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Plan History</Text>
            {plans.length === 0 && completedMeetings.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="history"
                  size={64}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.emptyText}>No Plans Yet</Text>
                <Text style={styles.emptySubtext}>
                  Your created plans and completed meetings will appear here.
                </Text>
              </View>
            ) : (
              <>
                {/* Plans history */}
                {plans.map(renderPlan)}

                {/* Completed meetings history */}
                {completedMeetings.length > 0 && (
                  <View
                    style={[
                      styles.meetingsSection,
                      { marginTop: theme.spacing.lg },
                    ]}
                  >
                    <Text style={styles.sectionTitle}>
                      Completed Meetings ({completedMeetings.length})
                    </Text>
                    {completedMeetings.map((meeting) => (
                      <View
                        key={meeting.id}
                        style={styles.completedMeetingCard}
                      >
                        <View style={styles.meetingHeader}>
                          <MaterialCommunityIcons
                            name="check-circle"
                            size={20}
                            color={theme.colors.success || "#4CAF50"}
                          />
                          <Text style={styles.meetingTitle}>
                            {meeting.title}
                          </Text>
                          <View
                            style={[styles.statusBadge, styles.statusBadgeDone]}
                          >
                            <Text style={styles.statusBadgeText}>done</Text>
                          </View>
                        </View>

                        <View style={styles.meetingDetails}>
                          <View style={styles.meetingDetailRow}>
                            <MaterialCommunityIcons
                              name="clock-outline"
                              size={16}
                              color={theme.colors.textSecondary}
                            />
                            <Text style={styles.meetingDetailText}>
                              {formatDateTime(
                                meeting.startTime instanceof Date
                                  ? meeting.startTime
                                  : meeting.startTime.toDate()
                              )}
                            </Text>
                          </View>

                          <View style={styles.meetingDetailRow}>
                            <MaterialCommunityIcons
                              name="timer-outline"
                              size={16}
                              color={theme.colors.textSecondary}
                            />
                            <Text style={styles.meetingDetailText}>
                              {meeting.duration} minutes
                            </Text>
                          </View>

                          <View style={styles.meetingDetailRow}>
                            <MaterialCommunityIcons
                              name="account-multiple"
                              size={16}
                              color={theme.colors.textSecondary}
                            />
                            <Text style={styles.meetingDetailText}>
                              {meeting.participants.length} participant(s)
                            </Text>
                          </View>
                        </View>

                        {/* Only organizer can delete completed meetings */}
                        {meeting.createdBy ===
                          firebaseAuth.currentUser?.uid && (
                          <View style={styles.meetingActions}>
                            <TouchableOpacity
                              style={[
                                styles.meetingActionButton,
                                styles.deleteButton,
                              ]}
                              onPress={() => handleDeleteMeeting(meeting.id)}
                            >
                              <MaterialCommunityIcons
                                name="delete-outline"
                                size={16}
                                color="#FFFFFF"
                              />
                              <Text style={styles.meetingActionButtonText}>
                                Delete
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  globalModeInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.amethystGlow,
  },
  globalModeText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
    lineHeight: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
  },
  historyButton: {
    padding: theme.spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
  },
  inputSection: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  inputHint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: theme.spacing.md,
  },
  runButton: {
    backgroundColor: theme.colors.amethystGlow,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
  },
  runButtonDisabled: {
    opacity: 0.5,
  },
  runButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: "#FFFFFF",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: "#FFEBEE",
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: "#C62828",
  },
  meetingResultContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  meetingResultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  meetingResultTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: "#C62828",
  },
  meetingResultTitleSuccess: {
    color: theme.colors.success || "#4CAF50",
  },
  meetingResultMessage: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    lineHeight: 22,
  },
  meetingDetails: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  meetingDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  meetingDetailText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text,
  },
  dismissButton: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dismissButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  currentPlanSection: {
    marginBottom: theme.spacing.lg,
  },
  recentPlansSection: {
    marginBottom: theme.spacing.lg,
  },
  historySection: {
    flex: 1,
  },
  planCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  planHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flex: 1,
  },
  planHeaderText: {
    flex: 1,
  },
  planIntent: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
  },
  planDate: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  planStatusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.md,
  },
  planStatusText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  tasksContainer: {
    marginBottom: theme.spacing.md,
  },
  tasksTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  taskCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: 4,
  },
  taskDescription: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text,
  },
  taskStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  taskStatusText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  taskError: {
    marginTop: 4,
    padding: theme.spacing.xs,
    backgroundColor: "#FFEBEE",
    borderRadius: theme.borderRadius.sm,
  },
  taskErrorText: {
    fontSize: theme.typography.fontSize.xs,
    color: "#C62828",
  },
  viewResultButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: theme.spacing.xs,
    paddingVertical: 4,
  },
  viewResultButtonText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.amethystGlow,
    fontWeight: theme.typography.fontWeight.medium,
  },
  summaryContainer: {
    marginBottom: theme.spacing.md,
  },
  summaryTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  summaryScroll: {
    maxHeight: 200,
  },
  summaryText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  planError: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    backgroundColor: "#FFEBEE",
    borderRadius: theme.borderRadius.md,
  },
  planErrorText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: "#C62828",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.sm,
  },
  viewAllButtonText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.amethystGlow,
    fontWeight: theme.typography.fontWeight.medium,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: theme.spacing.xl * 2,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
  meetingsSection: {
    marginBottom: theme.spacing.xl,
  },
  meetingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  completedMeetingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    opacity: 0.8, // Slightly dimmed to show it's completed
  },
  meetingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  meetingTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.textSecondary,
  },
  statusBadgeDone: {
    backgroundColor: theme.colors.success || "#4CAF50",
  },
  statusBadgeAccepted: {
    backgroundColor: theme.colors.amethystGlow,
  },
  statusBadgeDeclined: {
    backgroundColor: "#C62828",
  },
  statusBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: "#FFFFFF",
    textTransform: "capitalize",
  },
  meetingActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  meetingActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  doneButton: {
    backgroundColor: theme.colors.success || "#4CAF50",
  },
  deleteButton: {
    backgroundColor: "#C62828",
  },
  meetingActionButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: "#FFFFFF",
  },
});
