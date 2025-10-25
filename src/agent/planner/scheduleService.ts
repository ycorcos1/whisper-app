/**
 * Schedule Storage Service
 * Handles CRUD operations for meeting schedule events in Firestore
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { firebaseFirestore, functions } from "../../lib/firebase";
import { httpsCallable } from "firebase/functions";
import { ScheduleEvent } from "../../types/casper";

/**
 * Create a new meeting event for multiple participants
 * Uses Cloud Function to create events for ALL participants with admin privileges
 */
export async function createMeetingEvent(
  _createdBy: string, // Parameter kept for API compatibility, passed by callers
  conversationId: string,
  participantIds: string[],
  title: string,
  startTime: Date,
  duration: number
): Promise<{ eventId: string; participantIds: string[] }> {
  try {
    // Call Cloud Function to create meeting for all participants
    const createMeeting = httpsCallable(functions, "casperCreateMeeting");

    const result = await createMeeting({
      conversationId,
      participantIds,
      title,
      startTime: startTime.toISOString(),
      duration,
    });

    const data = result.data as {
      success: boolean;
      eventId: string;
      participantIds: string[];
      message: string;
    };

    if (!data.success) {
      throw new Error("Failed to create meeting");
    }

    return {
      eventId: data.eventId,
      participantIds: data.participantIds,
    };
  } catch (error) {
    console.error("Error creating meeting event:", error);
    throw error;
  }
}

/**
 * Get a meeting event for a specific user
 */
export async function getMeetingEvent(
  userId: string,
  eventId: string
): Promise<ScheduleEvent | null> {
  try {
    const eventRef = doc(
      firebaseFirestore,
      `schedules/${userId}/events/${eventId}`
    );
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      return null;
    }

    const data = eventSnap.data();
    return {
      id: eventSnap.id,
      title: data.title,
      startTime: data.startTime.toDate(),
      duration: data.duration,
      participants: data.participants,
      createdBy: data.createdBy,
      conversationId: data.conversationId,
      createdAt: data.createdAt.toDate(),
    };
  } catch (error) {
    console.error("Error getting meeting event:", error);
    return null;
  }
}

/**
 * Get all meeting events for a user
 */
export async function getUserMeetings(
  userId: string,
  options?: {
    conversationId?: string;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<ScheduleEvent[]> {
  try {
    const eventsRef = collection(
      firebaseFirestore,
      `schedules/${userId}/events`
    );

    let q = query(eventsRef, orderBy("startTime", "asc"));

    // Filter by conversation if specified (server-side with index)
    if (options?.conversationId) {
      q = query(
        eventsRef,
        where("conversationId", "==", options.conversationId),
        orderBy("startTime", "asc")
      );
    }

    const snapshot = await getDocs(q);
    let events: ScheduleEvent[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        startTime: data.startTime.toDate(),
        duration: data.duration,
        participants: data.participants,
        createdBy: data.createdBy,
        conversationId: data.conversationId,
        status: data.status || "pending",
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate()
          : new Date(),
      };
    });

    // Apply client-side filters
    if (options?.startDate) {
      events = events.filter((e) => e.startTime >= options.startDate!);
    }
    if (options?.endDate) {
      events = events.filter((e) => e.startTime <= options.endDate!);
    }
    if (options?.limit) {
      events = events.slice(0, options.limit);
    }

    return events;
  } catch (error) {
    console.error("Error getting user meetings:", error);
    return [];
  }
}

/**
 * Get upcoming meetings for a user
 * Note: Only returns meetings from the user's own schedule (where they are the organizer)
 * MVP limitation: Participants don't see meetings in their schedule yet (Phase 5 feature)
 */
export async function getUpcomingMeetings(
  userId: string,
  conversationId?: string
): Promise<ScheduleEvent[]> {
  const now = new Date();
  return getUserMeetings(userId, {
    conversationId,
    startDate: now,
  });
}

/**
 * Check if a user has conflicts with a proposed meeting time
 */
export async function checkMeetingConflicts(
  userId: string,
  proposedStart: Date,
  duration: number
): Promise<{ hasConflict: boolean; conflictingEvents: ScheduleEvent[] }> {
  try {
    const proposedEnd = new Date(proposedStart.getTime() + duration * 60000);

    // Get all meetings around the proposed time (1 day buffer)
    const startBuffer = new Date(proposedStart.getTime() - 24 * 60 * 60000);
    const endBuffer = new Date(proposedEnd.getTime() + 24 * 60 * 60000);

    const meetings = await getUserMeetings(userId, {
      startDate: startBuffer,
      endDate: endBuffer,
    });

    // Ignore meetings that are completed
    const activeMeetings = meetings.filter((m) => m.status !== "done");

    // Check for overlaps against active meetings only
    const conflictingEvents = activeMeetings.filter((meeting) => {
      const startTime =
        meeting.startTime instanceof Date
          ? meeting.startTime
          : meeting.startTime.toDate();
      const meetingEnd = new Date(
        startTime.getTime() + meeting.duration * 60000
      );

      // Check if meetings overlap
      return (
        (proposedStart >= startTime && proposedStart < meetingEnd) ||
        (proposedEnd > startTime && proposedEnd <= meetingEnd) ||
        (proposedStart <= startTime && proposedEnd >= meetingEnd)
      );
    });

    return {
      hasConflict: conflictingEvents.length > 0,
      conflictingEvents,
    };
  } catch (error) {
    console.error("Error checking meeting conflicts:", error);
    return { hasConflict: false, conflictingEvents: [] };
  }
}

/**
 * Find free time slots for a user
 */
export async function findFreeTimeSlots(
  userId: string,
  startDate: Date,
  endDate: Date,
  duration: number,
  workingHours: { start: number; end: number } = { start: 9, end: 17 }
): Promise<Date[]> {
  try {
    // Only consider active (non-done) meetings for availability
    const meetings = (
      await getUserMeetings(userId, {
        startDate,
        endDate,
      })
    ).filter((m) => m.status !== "done");

    const freeSlots: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate < endDate) {
      // Check if this is a working day (Mon-Fri)
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Check each hour within working hours
      for (let hour = workingHours.start; hour < workingHours.end; hour++) {
        const slotStart = new Date(currentDate);
        slotStart.setHours(hour, 0, 0, 0);

        const slotEnd = new Date(slotStart.getTime() + duration * 60000);

        // Check if this slot conflicts with any existing meetings
        const hasConflict = meetings.some((meeting) => {
          const startTime =
            meeting.startTime instanceof Date
              ? meeting.startTime
              : meeting.startTime.toDate();
          const meetingEnd = new Date(
            startTime.getTime() + meeting.duration * 60000
          );
          return (
            (slotStart >= startTime && slotStart < meetingEnd) ||
            (slotEnd > startTime && slotEnd <= meetingEnd) ||
            (slotStart <= startTime && slotEnd >= meetingEnd)
          );
        });

        if (!hasConflict && slotStart > new Date()) {
          freeSlots.push(slotStart);
          if (freeSlots.length >= 10) {
            // Return max 10 slots
            return freeSlots;
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return freeSlots;
  } catch (error) {
    console.error("Error finding free time slots:", error);
    return [];
  }
}

/**
 * Delete a meeting event
 * Uses Cloud Function to delete the meeting from user's schedule
 */
export async function deleteMeetingEvent(eventId: string): Promise<boolean> {
  try {
    // console.log("🗑️ DEBUG: Attempting to delete meeting", { eventId });

    const deleteMeeting = httpsCallable(functions, "casperDeleteMeeting");

    const result = await deleteMeeting({ eventId });

    const data = result.data as {
      success: boolean;
      message: string;
    };

    // console.log("🗑️ DEBUG: Delete meeting result", {
    //   eventId,
    //   success: data.success,
    //   message: data.message,
    // });

    return data.success;
  } catch (error) {
    console.error("🗑️ DEBUG: Error deleting meeting event:", error);
    throw error;
  }
}

/**
 * Update meeting status (mark as done, accepted, declined)
 */
export async function updateMeetingStatus(
  eventId: string,
  status: "pending" | "accepted" | "declined" | "done"
): Promise<boolean> {
  try {
    const updateStatus = httpsCallable(functions, "casperUpdateMeetingStatus");

    const result = await updateStatus({ eventId, status });

    const data = result.data as {
      success: boolean;
      status: string;
      message: string;
    };

    return data.success;
  } catch (error) {
    console.error("Error updating meeting status:", error);
    throw error;
  }
}
