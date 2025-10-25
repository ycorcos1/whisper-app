/**
 * Meeting Scheduler Cloud Functions
 * Handles server-side meeting creation for all participants
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface CreateMeetingData {
  conversationId: string;
  participantIds: string[];
  title: string;
  startTime: Date;
  duration: number;
}

/**
 * Create a meeting event for all participants
 * Server-side function with admin privileges to write to all users' schedules
 */
export const casperCreateMeeting = functions.https.onCall(
  async (data: CreateMeetingData, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const { conversationId, participantIds, title, startTime, duration } = data;

    // Validate inputs
    if (!conversationId || !participantIds || participantIds.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields"
      );
    }

    if (!title || !startTime || !duration) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Meeting details incomplete"
      );
    }

    const createdBy = context.auth.uid;

    try {
      // Generate unique event ID
      const eventId = `meeting_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Ensure creator is in participants
      const allParticipants = [...new Set([...participantIds, createdBy])];

      functions.logger.info("Creating meeting for participants", {
        eventId,
        createdBy,
        receivedParticipantIds: participantIds,
        allParticipants,
        totalCount: allParticipants.length,
        conversationId,
      });

      // Convert startTime to Timestamp
      const startTimeTimestamp = admin.firestore.Timestamp.fromDate(
        new Date(startTime)
      );

      // Create event for each participant (server has admin privileges!)
      const batch = admin.firestore().batch();

      for (const userId of allParticipants) {
        const eventRef = admin
          .firestore()
          .doc(`schedules/${userId}/events/${eventId}`);

        functions.logger.info(`Creating event for user: ${userId}`, {
          eventId,
          userId,
          path: `schedules/${userId}/events/${eventId}`,
        });

        batch.set(eventRef, {
          title,
          startTime: startTimeTimestamp,
          duration,
          participants: allParticipants,
          createdBy,
          conversationId,
          status: userId === createdBy ? "accepted" : "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // DEBUG: Log what's being stored
        functions.logger.info(`Storing meeting data for ${userId}`, {
          eventId,
          userId,
          participants: allParticipants,
          participantCount: allParticipants.length,
          createdBy,
        });
      }

      // Commit all writes atomically
      await batch.commit();

      functions.logger.info("Meeting created successfully", {
        eventId,
        createdBy,
        participants: allParticipants.length,
        conversationId,
        allParticipants,
      });

      return {
        success: true,
        eventId,
        participantIds: allParticipants,
        message: `Meeting created for ${allParticipants.length} participant(s)`,
      };
    } catch (error) {
      functions.logger.error("Error creating meeting", {
        error,
        conversationId,
        createdBy,
      });

      throw new functions.https.HttpsError(
        "internal",
        "Failed to create meeting",
        error
      );
    }
  }
);

/**
 * Delete a meeting event for ALL participants
 */
export const casperDeleteMeeting = functions.https.onCall(
  async (data: { eventId: string }, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const { eventId } = data;

    if (!eventId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Event ID required"
      );
    }

    const userId = context.auth.uid;

    try {
      // First, get the meeting from the user's schedule to find all participants
      const userEventRef = admin
        .firestore()
        .doc(`schedules/${userId}/events/${eventId}`);

      functions.logger.info("Attempting to delete meeting", {
        eventId,
        userId,
        path: `schedules/${userId}/events/${eventId}`,
      });

      const userEventSnap = await userEventRef.get();

      if (!userEventSnap.exists) {
        functions.logger.error("Meeting not found in user's schedule", {
          eventId,
          userId,
          path: `schedules/${userId}/events/${eventId}`,
        });
        throw new functions.https.HttpsError("not-found", "Meeting not found");
      }

      const meetingData = userEventSnap.data();
      const participants = meetingData?.participants || [userId];

      functions.logger.info("Found meeting data", {
        eventId,
        userId,
        meetingData: {
          title: meetingData?.title,
          participants: meetingData?.participants,
          createdBy: meetingData?.createdBy,
        },
      });

      functions.logger.info("Deleting meeting for all participants", {
        eventId,
        deletedBy: userId,
        participants,
        totalCount: participants.length,
      });

      // Delete the meeting from ALL participants' schedules
      const batch = admin.firestore().batch();

      for (const participantId of participants) {
        const eventRef = admin
          .firestore()
          .doc(`schedules/${participantId}/events/${eventId}`);

        functions.logger.info(`Deleting event for user: ${participantId}`, {
          eventId,
          userId: participantId,
        });

        batch.delete(eventRef);
      }

      // Commit all deletions atomically
      try {
        await batch.commit();

        functions.logger.info("Meeting deleted successfully for all", {
          eventId,
          deletedBy: userId,
          participantCount: participants.length,
        });

        return {
          success: true,
          message: "Meeting deleted for all participants",
        };
      } catch (batchError) {
        functions.logger.error("Batch delete failed", {
          eventId,
          userId,
          participants,
          batchError,
        });
        throw batchError;
      }
    } catch (error) {
      functions.logger.error("Error deleting meeting", {
        error,
        eventId,
        userId,
      });

      throw new functions.https.HttpsError(
        "internal",
        "Failed to delete meeting",
        error
      );
    }
  }
);

/**
 * Update meeting status (mark as done, accepted, declined)
 */
export const casperUpdateMeetingStatus = functions.https.onCall(
  async (data: { eventId: string; status: string }, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const { eventId, status } = data;

    if (!eventId || !status) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Event ID and status required"
      );
    }

    // Validate status
    const validStatuses = ["pending", "accepted", "declined", "done"];
    if (!validStatuses.includes(status)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      );
    }

    const userId = context.auth.uid;

    try {
      const userEventRef = admin
        .firestore()
        .doc(`schedules/${userId}/events/${eventId}`);

      const userEventSnap = await userEventRef.get();
      if (!userEventSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Meeting not found");
      }

      const meetingData = userEventSnap.data() as any;
      const participants: string[] = meetingData?.participants || [userId];
      const createdBy: string | undefined = meetingData?.createdBy;

      // If organizer marks as done, propagate to ALL participants so it moves to history for everyone
      if (status === "done" && createdBy && createdBy === userId) {
        const batch = admin.firestore().batch();
        for (const participantId of participants) {
          const ref = admin
            .firestore()
            .doc(`schedules/${participantId}/events/${eventId}`);
          batch.update(ref, {
            status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        await batch.commit();

        functions.logger.info("Organizer marked meeting done for all", {
          eventId,
          organizer: userId,
          participantCount: participants.length,
        });

        return {
          success: true,
          status,
          message: `Meeting marked as ${status} for all participants`,
        };
      }

      // Otherwise, update only this user's copy
      await userEventRef.update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info("Meeting status updated (single user)", {
        eventId,
        userId,
        status,
      });

      return {
        success: true,
        status,
        message: `Meeting marked as ${status}`,
      };
    } catch (error) {
      functions.logger.error("Error updating meeting status", {
        error,
        eventId,
        userId,
        status,
      });

      throw new functions.https.HttpsError(
        "internal",
        "Failed to update meeting status",
        error
      );
    }
  }
);
