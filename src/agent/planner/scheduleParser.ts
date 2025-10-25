/**
 * Schedule Command Parser for Meeting Scheduler
 * Parses natural language meeting scheduling commands
 *
 * Supported commands:
 * - "Schedule a meeting with this user for next friday at 3pm"
 * - "Schedule a meeting with everyone for next friday at 9am"
 * - "Schedule a meeting with all the designers for wednesday at 2pm"
 * - "Schedule a meeting with user a and user b for next thursday at 4pm"
 * - "Schedule a meeting at his earliest available free time starting at 9"
 */

import {
  parseDateTime,
  parseEarliestAvailable,
  parseDuration,
} from "./dateParser";
import { RoleAliases, ConversationMember } from "../../types/casper";

export interface ParsedScheduleCommand {
  participants: ParticipantSpec[];
  dateTime: Date | null;
  isEarliestAvailable: boolean;
  duration: number; // minutes
  title?: string;
  rawCommand: string;
  confidence: "high" | "medium" | "low";
}

export interface ParticipantSpec {
  type: "role" | "name" | "everyone" | "current_dm";
  value?: string; // role name, user name, or undefined for everyone/current_dm
}

/**
 * Parse a schedule command into structured data
 */
export function parseScheduleCommand(
  command: string,
  baseDate: Date = new Date()
): ParsedScheduleCommand | null {
  try {
    const normalizedCommand = command.toLowerCase().trim();

    // Check if this is a schedule command
    if (
      !normalizedCommand.includes("schedule") ||
      !normalizedCommand.includes("meeting")
    ) {
      return null;
    }

    // Extract participants
    const participants = extractParticipants(normalizedCommand);

    // DEBUG: Log extracted participants
    // console.log("🔍 DEBUG: parseScheduleCommand", {
    //   command,
    //   normalizedCommand,
    //   participants,
    // });

    if (participants.length === 0) {
      return null;
    }

    // Extract date/time
    let dateTime: Date | null = null;
    let isEarliestAvailable = false;

    if (
      normalizedCommand.includes("earliest available") ||
      normalizedCommand.includes("earliest free time")
    ) {
      isEarliestAvailable = true;
      const earliestDate = parseEarliestAvailable(normalizedCommand);
      if (earliestDate) {
        dateTime = earliestDate;
      }
    } else {
      const parsedDate = parseDateTime(normalizedCommand, baseDate);
      if (parsedDate) {
        dateTime = parsedDate.date;
      }
    }

    // Extract duration (default to 60 minutes if not specified)
    let duration = 60;
    const durationMatch = normalizedCommand.match(
      /(?:for|duration|lasting)\s+(\d+\s*(?:hour|hr|minute|min)s?)/i
    );
    if (durationMatch) {
      duration = parseDuration(durationMatch[1]) || 60;
    }

    // Extract title (optional)
    let title: string | undefined;
    const titleMatch = normalizedCommand.match(
      /(?:about|titled|regarding|re:)\s+["']?([^"']+)["']?/i
    );
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // Determine confidence
    let confidence: "high" | "medium" | "low" = "medium";
    if (dateTime && participants.length > 0) {
      confidence = "high";
    } else if (!dateTime || participants.length === 0) {
      confidence = "low";
    }

    return {
      participants,
      dateTime,
      isEarliestAvailable,
      duration,
      title,
      rawCommand: command,
      confidence,
    };
  } catch (error) {
    console.error("Error parsing schedule command:", error);
    return null;
  }
}

/**
 * Extract participant specifications from command
 */
function extractParticipants(command: string): ParticipantSpec[] {
  const participants: ParticipantSpec[] = [];

  // Check for "everyone" or "all members"
  if (
    command.includes("everyone") ||
    command.includes("all members") ||
    command.includes("the whole team") ||
    command.includes("the entire team")
  ) {
    participants.push({ type: "everyone" });
    return participants;
  }

  // Check for "this user" (in DM context)
  if (
    command.includes("this user") ||
    command.includes("this person") ||
    command.includes("them") ||
    command.includes("him") ||
    command.includes("her")
  ) {
    participants.push({ type: "current_dm" });
    return participants;
  }

  // Check for role-based participants
  const roleParticipants = extractRoleParticipants(command);
  participants.push(...roleParticipants);

  // Check for name-based participants
  const nameParticipants = extractNameParticipants(command);
  participants.push(...nameParticipants);

  return participants;
}

/**
 * Extract role-based participant specifications
 */
function extractRoleParticipants(command: string): ParticipantSpec[] {
  const participants: ParticipantSpec[] = [];

  // Check for various role patterns:
  // - "all the designers"
  // - "the designers"
  // - "all designers"
  // - "designers"
  // - "the PMs"
  // - "all engineers"
  const rolePatterns = [
    /(?:all\s+)?(?:the\s+)?(\w+s)\b/gi, // Plural roles: "designers", "the engineers"
    /(?:all\s+)?(?:the\s+)?(pm|se|qa)\b/gi, // Short roles: "PM", "SE", "QA"
  ];

  for (const pattern of rolePatterns) {
    let match;
    while ((match = pattern.exec(command)) !== null) {
      const roleText = match[1].toLowerCase();

      // console.log("🔍 Checking role text:", roleText);

      // Match against role aliases
      for (const [role, aliases] of Object.entries(RoleAliases)) {
        if (
          aliases.some(
            (alias) => roleText.includes(alias) || alias.includes(roleText)
          )
        ) {
          // console.log(`✅ Matched role: ${roleText} → ${role}`);
          participants.push({ type: "role", value: role });
          break;
        }
      }
    }
  }

  return participants;
}

/**
 * Extract name-based participant specifications
 */
function extractNameParticipants(command: string): ParticipantSpec[] {
  const participants: ParticipantSpec[] = [];

  // Pattern: "with {name} and {name}"
  // Pattern: "with {name}, {name}, and {name}"
  // Use lookahead to stop before temporal keywords
  const withPattern =
    /with\s+((?:(?!for\s|at\s|on\s).)*?)(?:\s+for\s|\s+at\s|\s+on\s|$)/i;
  const withMatch = withPattern.exec(command);

  // console.log("🔍 DEBUG: extractNameParticipants", {
  //   command,
  //   withMatch: withMatch ? withMatch[0] : null,
  //   captured: withMatch ? withMatch[1] : null,
  // });

  if (withMatch) {
    const namesText = withMatch[1].trim();

    // Skip if empty or just whitespace
    if (!namesText) {
      // console.log("⚠️ Empty namesText, returning");
      return participants;
    }

    // Split by "and" or commas
    const names = namesText
      .split(/\s+and\s+|,\s*/)
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    // console.log("📝 DEBUG: Split names", { namesText, names });

    for (const name of names) {
      // Skip words that are likely not names
      // BUT: Allow "User X" patterns (e.g., "User A", "User B")
      const skipWords = [
        "everyone",
        "all",
        "the",
        "this",
        "person",
        "earliest",
        "available",
      ];

      const lowerName = name.toLowerCase();

      // Skip if it's just "user" alone or matches other skip words
      const shouldSkip =
        lowerName === "user" || // Just "user" alone
        skipWords.some((word) => lowerName.includes(word));

      // console.log("🔎 Checking name:", { name, lowerName, shouldSkip });

      if (!shouldSkip) {
        participants.push({ type: "name", value: name });
      }
    }
  }

  // console.log("✅ Final participants:", participants);
  return participants;
}

/**
 * Match participant specs to actual conversation members
 */
export function matchParticipants(
  specs: ParticipantSpec[],
  conversationMembers: ConversationMember[],
  currentUserId: string,
  dmPartnerId?: string
): string[] {
  const matchedUserIds = new Set<string>();

  for (const spec of specs) {
    switch (spec.type) {
      case "everyone":
        // Add ALL members including current user
        conversationMembers.forEach((member) => {
          matchedUserIds.add(member.userId);
        });
        break;

      case "current_dm":
        // Add the DM partner AND current user
        if (dmPartnerId) {
          matchedUserIds.add(dmPartnerId);
          matchedUserIds.add(currentUserId);
        }
        break;

      case "role":
        // Add all members with this role (including current user if they match)
        if (spec.value) {
          conversationMembers.forEach((member) => {
            if (member.role === spec.value) {
              matchedUserIds.add(member.userId);
            }
          });
        }
        break;

      case "name":
        // Match by display name (fuzzy match, including current user)
        if (spec.value) {
          const normalizedName = spec.value.toLowerCase();

          // console.log("🔍 Matching name:", {
          //   searchFor: spec.value,
          //   normalizedName,
          //   conversationMembers: conversationMembers.map((m) => ({
          //     displayName: m.displayName,
          //     userId: m.userId,
          //   })),
          // });

          conversationMembers.forEach((member) => {
            const memberName = member.displayName.toLowerCase();
            const includes1 = memberName.includes(normalizedName);
            const includes2 = normalizedName.includes(memberName);

            // console.log("  Checking member:", {
            //   displayName: member.displayName,
            //   memberName,
            //   includes1,
            //   includes2,
            //   match: includes1 || includes2,
            // });

            if (includes1 || includes2) {
              matchedUserIds.add(member.userId);
            }
          });
        }
        break;
    }
  }

  return Array.from(matchedUserIds);
}

/**
 * Generate a meeting title from the command if not explicitly provided
 */
export function generateMeetingTitle(
  command: ParsedScheduleCommand,
  conversationMembers: ConversationMember[],
  matchedUserIds: string[]
): string {
  // If title was explicitly provided, use it
  if (command.title) {
    return command.title;
  }

  // Generate based on participants
  const participants = command.participants;

  if (participants.some((p) => p.type === "everyone")) {
    return "Team Meeting";
  }

  if (participants.some((p) => p.type === "current_dm")) {
    const partner = conversationMembers.find((m) =>
      matchedUserIds.includes(m.userId)
    );
    return partner ? `Meeting with ${partner.displayName}` : "Meeting";
  }

  // Role-based
  const roleParticipants = participants.filter((p) => p.type === "role");
  if (roleParticipants.length > 0) {
    const roleNames = roleParticipants
      .map((p) => p.value)
      .filter((v) => v !== undefined)
      .join(" & ");
    return `${roleNames} Meeting`;
  }

  // Name-based
  const nameParticipants = participants.filter((p) => p.type === "name");
  if (nameParticipants.length > 0) {
    const names = nameParticipants
      .map((p) => p.value)
      .filter((v) => v !== undefined);
    if (names.length === 1) {
      return `Meeting with ${names[0]}`;
    } else if (names.length === 2) {
      return `Meeting with ${names[0]} & ${names[1]}`;
    } else {
      return `Meeting with ${names[0]} & ${names.length - 1} others`;
    }
  }

  return "Meeting";
}

/**
 * Validate a parsed schedule command
 */
export function validateScheduleCommand(
  command: ParsedScheduleCommand,
  matchedUserIds: string[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if we have participants
  if (matchedUserIds.length === 0) {
    errors.push("No participants could be identified for the meeting");
  }

  // Check if we have a valid date/time
  if (!command.dateTime) {
    errors.push("No valid date/time could be parsed from the command");
  } else {
    // Check if date is in the past
    const now = new Date();
    if (command.dateTime < now) {
      errors.push("The meeting date/time is in the past");
    }
  }

  // Check duration
  if (command.duration <= 0 || command.duration > 480) {
    errors.push("Meeting duration must be between 1 and 480 minutes");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
