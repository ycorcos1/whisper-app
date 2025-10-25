/**
 * Cloud Functions for Whisper
 *
 * Implements image thumbnail generation:
 * - Triggers on storage.object().onFinalize() for /message_media/{cid}/{mid}/*
 * - Generates 960px max-edge thumbnail
 * - Stores as /message_media/{cid}/{mid}_thumb.jpg
 * - MIME whitelist: image/jpeg, image/png, image/webp
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import sharp from "sharp";

// Initialize Firebase Admin
admin.initializeApp();

const THUMBNAIL_MAX_SIZE = 960; // Max width or height in pixels
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Generate thumbnail for uploaded images
 * Triggered when a file is uploaded to Storage
 */
export const generateThumbnail = functions.storage
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name;
    const contentType = object.contentType;

    // Exit if not an image or not in message_media directory
    if (!filePath || !contentType) {
      functions.logger.info("No file path or content type, skipping");
      return null;
    }

    // Only process images in message_media directory
    if (!filePath.startsWith("message_media/")) {
      functions.logger.info("Not a message media file, skipping", { filePath });
      return null;
    }

    // Skip if already a thumbnail
    if (filePath.includes("_thumb.")) {
      functions.logger.info("File is already a thumbnail, skipping", {
        filePath,
      });
      return null;
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      functions.logger.info("Invalid MIME type, skipping", { contentType });
      return null;
    }

    // Parse file path: message_media/{conversationId}/{messageId}/original.ext
    const pathParts = filePath.split("/");
    if (pathParts.length !== 4) {
      functions.logger.warn("Invalid file path structure", { filePath });
      return null;
    }

    const conversationId = pathParts[1];
    const messageId = pathParts[2];
    const fileName = pathParts[3];

    functions.logger.info("Processing image for thumbnail", {
      filePath,
      conversationId,
      messageId,
      fileName,
    });

    const bucket = admin.storage().bucket(object.bucket);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const tempThumbPath = path.join(os.tmpdir(), `thumb_${messageId}.jpg`);

    try {
      // Download file from Storage
      await bucket.file(filePath).download({ destination: tempFilePath });
      functions.logger.info("Downloaded original image", { tempFilePath });

      // Generate thumbnail using Sharp
      await sharp(tempFilePath)
        .rotate() // Auto-rotate based on EXIF orientation
        .resize(THUMBNAIL_MAX_SIZE, THUMBNAIL_MAX_SIZE, {
          fit: "inside", // Maintain aspect ratio, fit within max dimensions
          withoutEnlargement: true, // Don't upscale small images
        })
        .jpeg({
          quality: 80, // Good quality with reasonable file size
          progressive: true, // Progressive JPEG for better loading
        })
        .toFile(tempThumbPath);

      functions.logger.info("Generated thumbnail", { tempThumbPath });

      // Upload thumbnail to Storage
      const thumbnailPath = `message_media/${conversationId}/${messageId}_thumb.jpg`;
      await bucket.upload(tempThumbPath, {
        destination: thumbnailPath,
        metadata: {
          contentType: "image/jpeg",
          metadata: {
            originalImage: filePath,
            conversationId,
            messageId,
            generatedAt: new Date().toISOString(),
          },
        },
      });

      functions.logger.info("Uploaded thumbnail", { thumbnailPath });

      // Get the download URL for the thumbnail
      const thumbnailFile = bucket.file(thumbnailPath);
      await thumbnailFile.makePublic(); // Make it publicly accessible
      const publicUrl = `https://storage.googleapis.com/${object.bucket}/${thumbnailPath}`;

      functions.logger.info("Thumbnail URL", { publicUrl });

      // Update the message document with thumbnail URL
      try {
        const messageRef = admin
          .firestore()
          .collection("conversations")
          .doc(conversationId)
          .collection("messages")
          .doc(messageId);

        const messageDoc = await messageRef.get();
        if (messageDoc.exists) {
          await messageRef.update({
            "image.thumbnailUrl": publicUrl,
          });
          functions.logger.info("Updated message with thumbnail URL", {
            messageId,
          });
        } else {
          functions.logger.warn("Message document not found", { messageId });
        }
      } catch (firestoreError) {
        functions.logger.error(
          "Error updating Firestore with thumbnail URL",
          firestoreError
        );
        // Don't fail the function if Firestore update fails
      }

      // Clean up temp files
      fs.unlinkSync(tempFilePath);
      fs.unlinkSync(tempThumbPath);
      functions.logger.info("Cleaned up temp files");

      return {
        success: true,
        thumbnailPath,
        originalPath: filePath,
      };
    } catch (error) {
      functions.logger.error("Error generating thumbnail", error);

      // Clean up temp files if they exist
      try {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (fs.existsSync(tempThumbPath)) fs.unlinkSync(tempThumbPath);
      } catch (cleanupError) {
        functions.logger.error("Error cleaning up temp files", cleanupError);
      }

      throw error;
    }
  });

/**
 * Example function for testing deployment
 */
export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Whisper Cloud Functions!");
});

// Export Casper RAG functions
export { casperSearch, casperAnswer, casperSummarize } from "./rag/functions";
export { indexMessage } from "./rag/triggers";

// Export Casper Multi-Step Planner functions (PR 7)
export { casperPlan, casperGetPlan, casperListPlans } from "./rag/planner";

// Export Casper Meeting Scheduler functions
export {
  casperCreateMeeting,
  casperDeleteMeeting,
  casperUpdateMeetingStatus,
} from "./rag/meetings";

// Export Casper Translation and Message Composition functions
export {
  casperTranslate,
  casperDetectLanguage,
  casperGenerateResponse,
  casperTranslateAndSend,
} from "./rag/translationFunctions";
