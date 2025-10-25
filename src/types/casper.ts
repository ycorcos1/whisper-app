/**
 * Casper Data Types
 * Type definitions for Casper AI agent data stored in Firestore
 * Based on Whisper_Phase2_Casper_PRD.md
 */

import { Timestamp } from "firebase/firestore";

/**
 * Insight Types
 * Stored in /assist/insights/{cid}/{docId}
 */
export type InsightType = "summary" | "actions" | "decisions";

export interface TimeWindow {
  from: Timestamp;
  to: Timestamp;
}

export interface ActionItem {
  title: string;
  assignee?: string;
  due?: string;
  mid?: string; // message id reference
  type?: "action" | "meeting"; // type of action item
  meetingDetails?: {
    eventId: string;
    startTime: Date | Timestamp;
    duration: number;
    participants: string[];
    status: "pending" | "accepted" | "declined";
  };
}

export interface Insight {
  id: string; // document id
  cid: string; // conversation id
  type: InsightType;
  window: TimeWindow | null;
  content: string;
  items?: ActionItem[]; // for actions type
  createdBy: string; // uid
  createdAt: Timestamp;
}

/**
 * Task
 * Stored in /assist/tasks/{uid}/{taskId}
 */
export interface Task {
  id: string; // document id
  title: string;
  sourceCid?: string;
  sourceMid?: string;
  due?: string;
  status: "open" | "done";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Daily Digest
 * Stored in /assist/digests/{uid}/{dateId}
 */
export interface Digest {
  id: string; // dateId (e.g., "2025-10-23")
  content: string;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  decisions: string[];
  createdAt: Timestamp;
}

/**
 * Agent Preferences
 * Stored in /assist/agents/{uid}
 */
export interface AgentPreferences {
  uid: string;
  proactiveEnabled: boolean;
  lastDigestAt?: Timestamp;
  prefs?: {
    summaryLength?: "short" | "normal" | "long";
  };
  flags?: {
    [cid: string]: {
      hasAction?: boolean;
      hasDecision?: boolean;
      hasMention?: boolean;
    };
  };
}

/**
 * Semantic Chunk (for future RAG implementation)
 * Stored in /semantic_chunks/{id}
 */
export interface SemanticChunk {
  id: string;
  cid: string;
  mid: string;
  text: string;
  embedding: number[];
  createdAt: Timestamp;
}

/**
 * Multi-Step Agent Plan (PR 7)
 * Stored in /agent/{uid}/plans/{planId}
 */
export type PlanIntent =
  | "offsite_planning"
  | "meeting_scheduling"
  | "task_breakdown"
  | "unknown";

export type PlanStatus = "pending" | "running" | "completed" | "failed";

export type TaskType =
  | "summarize"
  | "find_times"
  | "generate_plan"
  | "search_context";

export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface AgentTask {
  id: string;
  type: TaskType;
  description: string;
  inputs: Record<string, any>;
  status: TaskStatus;
  result?: any;
  error?: string;
}

export interface Plan {
  id: string;
  intent: PlanIntent;
  tasks: AgentTask[];
  summary: string;
  createdAt: number;
  completedAt?: number;
  status: PlanStatus;
  userId: string;
  conversationId?: string;
  error?: string;
}

/**
 * Member Role System (Phase 1 - Meeting Scheduler)
 * Stored in /conversations/{cid}/members/{uid}
 */
export type MemberRole =
  | "Friend"
  | "PM"
  | "SE"
  | "QA"
  | "Design"
  | "Stakeholder";

export interface ConversationMember {
  userId: string;
  role: MemberRole;
  displayName: string;
  joinedAt: Timestamp;
  email?: string;
  photoURL?: string;
}

/**
 * Role Aliases for natural language parsing
 */
export const RoleAliases: Record<MemberRole, string[]> = {
  Friend: ["friend", "friends"],
  PM: [
    "pm",
    "pms",
    "project manager",
    "product manager",
    "manager",
    "managers",
  ],
  SE: [
    "se",
    "engineer",
    "engineers",
    "developer",
    "developers",
    "software engineer",
    "software engineers",
    "software developer",
    "software developers",
    "dev",
    "devs",
  ],
  QA: ["qa", "qas", "tester", "testers", "quality assurance"],
  Design: ["designer", "designers", "design", "ux", "ui"],
  Stakeholder: ["stakeholder", "stakeholders"],
};

/**
 * Schedule Event (Option A - Firestore Storage)
 * Stored in /schedules/{uid}/events/{eventId}
 */
export interface ScheduleEvent {
  id: string;
  title: string;
  startTime: Date | Timestamp;
  duration: number; // minutes
  type?: "meeting" | "busy" | "free";
  conversationId: string;
  participants: string[]; // array of user IDs
  createdBy: string;
  status?: "pending" | "accepted" | "declined" | "done";
  createdAt: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}
