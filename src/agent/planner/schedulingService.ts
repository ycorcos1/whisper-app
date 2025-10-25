/**
 * Meeting Scheduler Integration
 * Client-side service to handle meeting scheduling commands
 */

import {
  parseScheduleCommand,
  matchParticipants,
  generateMeetingTitle,
  validateScheduleCommand,
} from "./scheduleParser";
import { createMeetingEvent, checkMeetingConflicts } from "./scheduleService";
import { ConversationMember } from "../../types/casper";
import { formatDateTime } from "./dateParser";

export interface ScheduleMeetingResult {
  success: boolean;
  eventId?: string;
  title: string;
  message: string;
  details?: {
    startTime: Date;
    duration: number;
    participants: string[];
    participantNames: string[];
  };
  errors?: string[];
}

/**
 * Handle a meeting scheduling command
 */
export async function handleScheduleCommand(
  command: string,
  conversationId: string,
  currentUserId: string,
  conversationMembers: ConversationMember[],
  isDM: boolean = false,
  dmPartnerId?: string
): Promise<ScheduleMeetingResult> {
  try {
    // Parse the command
    const parsed = parseScheduleCommand(command);

    if (!parsed) {
      return {
        success: false,
        title: "Meeting",
        message:
          "I couldn't understand that scheduling command. Try something like: 'Schedule a meeting with everyone for next Friday at 3pm'",
        errors: ["Failed to parse command"],
      };
    }

    // Match participants
    const matchedUserIds = matchParticipants(
      parsed.participants,
      conversationMembers,
      currentUserId,
      isDM ? dmPartnerId : undefined
    );

    // Generate title
    const title = generateMeetingTitle(
      parsed,
      conversationMembers,
      matchedUserIds
    );

    // Validate
    const validation = validateScheduleCommand(parsed, matchedUserIds);

    if (!validation.isValid) {
      return {
        success: false,
        title,
        message: `Unable to schedule meeting:\n${validation.errors.join("\n")}`,
        errors: validation.errors,
      };
    }

    // DEBUG: Log participant matching
    // console.log("🔍 DEBUG: Participant matching", {
    //   command,
    //   parsedParticipants: parsed.participants,
    //   conversationMembers: conversationMembers.map((m) => ({
    //     userId: m.userId,
    //     displayName: m.displayName,
    //     role: m.role,
    //   })),
    //   matchedUserIds,
    //   matchedCount: matchedUserIds.length,
    //   currentUserId,
    //   conversationId,
    // });

    // Check for conflicts
    if (parsed.dateTime) {
      const conflicts = await checkMeetingConflicts(
        currentUserId,
        parsed.dateTime,
        parsed.duration
      );

      if (conflicts.hasConflict) {
        const conflictMessages = conflicts.conflictingEvents.map(
          (event) =>
            `- ${event.title} at ${formatDateTime(
              new Date(event.startTime as any)
            )}`
        );

        return {
          success: false,
          title,
          message: `You have conflicting meetings at that time:\n${conflictMessages.join(
            "\n"
          )}\n\nPlease choose a different time.`,
          errors: ["Meeting conflicts detected"],
        };
      }

      // DEBUG: Log before creating meeting
      // console.log("📅 DEBUG: Creating meeting", {
      //   currentUserId,
      //   conversationId,
      //   matchedUserIds,
      //   matchedCount: matchedUserIds.length,
      //   title,
      // });

      // Create the meeting
      const result = await createMeetingEvent(
        currentUserId,
        conversationId,
        matchedUserIds,
        title,
        parsed.dateTime,
        parsed.duration
      );

      // Get participant names
      const participantNames = conversationMembers
        .filter((m) => result.participantIds.includes(m.userId))
        .map((m) => m.displayName);

      return {
        success: true,
        eventId: result.eventId,
        title,
        message: `✅ Meeting scheduled and added to your calendar!\n\n"${title}"\n${formatDateTime(
          parsed.dateTime
        )}\nDuration: ${
          parsed.duration
        } minutes\n\nParticipants:\n${participantNames
          .map((name) => `- ${name}`)
          .join(
            "\n"
          )}\n\n💡 Note: Meeting is saved to your calendar. Participant notifications coming soon!`,
        details: {
          startTime: parsed.dateTime,
          duration: parsed.duration,
          participants: result.participantIds,
          participantNames,
        },
      };
    }

    return {
      success: false,
      title,
      message: "Unable to determine meeting time",
      errors: ["No valid date/time"],
    };
  } catch (error) {
    console.error("Error handling schedule command:", error);
    return {
      success: false,
      title: "Meeting",
      message: `Failed to schedule meeting: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Check if a message contains a scheduling command
 */
export function isScheduleCommand(message: string): boolean {
  const normalized = message.toLowerCase().trim();
  return (
    normalized.includes("schedule") &&
    normalized.includes("meeting") &&
    (normalized.includes("for") ||
      normalized.includes("with") ||
      normalized.includes("at"))
  );
}

/**
 * Extract schedule command from a message
 * Handles cases like "Can you schedule a meeting..." or "Please schedule..."
 */
export function extractScheduleCommand(message: string): string | null {
  if (!isScheduleCommand(message)) {
    return null;
  }

  // Try to find the start of the command
  const patterns = [
    /(?:please\s+)?schedule\s+(?:a\s+)?meeting.*/i,
    /(?:can\s+you\s+)?schedule\s+(?:a\s+)?meeting.*/i,
    /set\s+up\s+(?:a\s+)?meeting.*/i,
    /book\s+(?:a\s+)?meeting.*/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  return message.trim();
}
