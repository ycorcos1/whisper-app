/**
 * Avatar Utilities
 * Handles avatar upload, generation, and display logic
 */

import { pickImage } from "./imageUtils";
import {
  firebaseStorage,
  storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "./firebase";

const MAX_IMAGE_SIZE_MB = 10;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

/**
 * Generate initials from display name
 * @param name - User's display name
 * @returns Initials (max 2 characters)
 */
export function generateInitials(name: string): string {
  if (!name || name.trim().length === 0) return "?";

  return name
    .trim()
    .split(" ")
    .filter((word) => word.length > 0)
    .map((word) => word[0].toUpperCase())
    .join("")
    .slice(0, 2);
}

/**
 * Generate a consistent color for initials based on user ID
 * @param userId - User's unique ID
 * @returns Hex color string
 */
export function generateAvatarColor(userId: string): string {
  // Predefined set of pleasant colors for avatars
  const colors = [
    "#8B5CF6", // Purple (amethyst)
    "#EC4899", // Pink
    "#10B981", // Green
    "#3B82F6", // Blue
    "#F59E0B", // Orange
    "#EF4444", // Red
    "#6366F1", // Indigo
    "#14B8A6", // Teal
  ];

  // Generate consistent index from userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;

  return colors[index];
}

/**
 * Pick and upload a profile picture
 * @param userId - User's unique ID
 * @param onProgress - Optional callback for upload progress
 * @returns Download URL of uploaded avatar, or null if cancelled
 */
export async function uploadAvatar(
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string | null> {
  try {
    // Pick image from device
    const result = await pickImage();
    if (!result) {
      // User cancelled - return null without throwing error
      return null;
    }

    // Fetch the image as a blob
    const response = await fetch(result.uri);
    const blob = await response.blob();

    // Validate blob size
    if (blob.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(
        `Image size exceeds ${MAX_IMAGE_SIZE_MB}MB limit. Please choose a smaller image.`
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = result.mimeType.split("/")[1];
    const filename = `avatar_${timestamp}.${extension}`;

    // Create storage reference at /profile_pictures/{userId}/{filename}
    const storagePath = `profile_pictures/${userId}/${filename}`;
    const imageRef = storageRef(firebaseStorage, storagePath);

    // Upload with metadata
    const metadata = {
      contentType: result.mimeType,
      customMetadata: {
        userId,
        uploadedAt: new Date().toISOString(),
      },
    };

    // Create upload task for progress tracking
    const uploadTask = uploadBytesResumable(imageRef, blob, metadata);

    // Return a promise that resolves when upload completes
    return new Promise<string>((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // Progress callback
          if (onProgress) {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          }
        },
        (error) => {
          // Error callback
          console.error("Upload error:", error);
          reject(new Error(`Failed to upload avatar: ${error.message}`));
        },
        async () => {
          // Success callback
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(new Error("Failed to get download URL"));
          }
        }
      );
    });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    throw error;
  }
}

/**
 * Get avatar URL for a user
 * @param photoURL - User's photoURL from Firestore
 * @returns Avatar URL or null
 */
export function getAvatarUrl(
  photoURL: string | null | undefined
): string | null {
  if (!photoURL) return null;

  // Handle Firebase Storage URLs
  if (
    photoURL.startsWith("gs://") ||
    photoURL.startsWith("https://storage.googleapis.com")
  ) {
    return photoURL;
  }

  // Handle regular URLs
  if (photoURL.startsWith("http://") || photoURL.startsWith("https://")) {
    return photoURL;
  }

  return null;
}

/**
 * Delete old avatars for a user (cleanup)
 * Note: In production, you'd want to use a Cloud Function to clean up old avatars
 * @param userId - User's unique ID
 * @param currentAvatarUrl - Current avatar URL to preserve
 */
export async function cleanupOldAvatars(
  userId: string,
  currentAvatarUrl: string
): Promise<void> {
  // This is a placeholder for future implementation
  // In a real app, you'd want a Cloud Function to handle this
  // to avoid leaving orphaned files in Storage
  console.log("Avatar cleanup would happen here for user:", userId);
}
