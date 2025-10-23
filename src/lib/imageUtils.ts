/**
 * Image Upload Utilities
 * Handles image picking, validation, and upload to Firebase Storage
 */

import * as ImagePicker from "expo-image-picker";
import {
  firebaseStorage,
  storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "./firebase";

const MAX_IMAGE_SIZE_MB = 10;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface ImagePickerResult {
  uri: string;
  mimeType: string;
  size: number;
}

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

/**
 * Request camera roll permissions
 * @returns true if granted, false otherwise
 */
export async function requestMediaLibraryPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === "granted";
}

/**
 * Pick an image from the device's media library
 * @returns ImagePickerResult or null if cancelled/failed
 */
export async function pickImage(): Promise<ImagePickerResult | null> {
  try {
    // Request permissions
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) {
      throw new Error(
        "Media library permission is required to send images. Please enable it in your device settings."
      );
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.9, // High quality, but with some compression
      exif: false, // Don't include EXIF data for privacy
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];

    // Get file size (estimate from URI if not provided)
    const fileSize = asset.fileSize || 0;

    // Validate MIME type
    const mimeType = getMimeTypeFromUri(asset.uri);
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(
        `Invalid image format. Allowed formats: ${ALLOWED_MIME_TYPES.join(
          ", "
        )}`
      );
    }

    // Validate file size
    if (fileSize > 0 && fileSize > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(
        `Image size exceeds ${MAX_IMAGE_SIZE_MB}MB limit. Please choose a smaller image.`
      );
    }

    return {
      uri: asset.uri,
      mimeType,
      size: fileSize,
    };
  } catch (error) {
    console.error("Error picking image:", error);
    throw error;
  }
}

/**
 * Upload an image to Firebase Storage
 * @param conversationId - The conversation ID
 * @param messageId - The message ID (used as filename)
 * @param imageUri - Local URI of the image
 * @param mimeType - MIME type of the image
 * @param onProgress - Optional callback for upload progress
 * @returns Download URL of the uploaded image
 */
export async function uploadImage(
  conversationId: string,
  messageId: string,
  imageUri: string,
  mimeType: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  try {
    // Fetch the image as a blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Validate blob size
    if (blob.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(
        `Image size exceeds ${MAX_IMAGE_SIZE_MB}MB limit. Please choose a smaller image.`
      );
    }

    // Create storage reference
    const fileExtension = getFileExtension(mimeType);
    const storagePath = `message_media/${conversationId}/${messageId}/original.${fileExtension}`;
    const imageRef = storageRef(firebaseStorage, storagePath);

    // Upload with metadata
    const metadata = {
      contentType: mimeType,
      customMetadata: {
        conversationId,
        messageId,
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
            const progress = {
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
            };
            onProgress(progress);
          }
        },
        (error) => {
          // Error callback
          console.error("Upload error:", error);
          reject(new Error(`Failed to upload image: ${error.message}`));
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
    console.error("Error uploading image:", error);
    throw error;
  }
}

/**
 * Get MIME type from file URI
 * @param uri - File URI
 * @returns MIME type
 */
function getMimeTypeFromUri(uri: string): string {
  const extension = uri.toLowerCase().split(".").pop();
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg"; // Default fallback
  }
}

/**
 * Get file extension from MIME type
 * @param mimeType - MIME type
 * @returns File extension
 */
function getFileExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

/**
 * Generate thumbnail storage path from original image path
 * @param originalPath - Original image storage path
 * @returns Thumbnail storage path
 */
export function getThumbnailPath(originalPath: string): string {
  // Convert: message_media/{cid}/{mid}/original.jpg -> message_media/{cid}/{mid}_thumb.jpg
  const parts = originalPath.split("/");
  if (parts.length >= 3) {
    const conversationId = parts[1];
    const messageId = parts[2];
    return `message_media/${conversationId}/${messageId}_thumb.jpg`;
  }
  return originalPath;
}

/**
 * Get thumbnail URL from download URL
 * Helper function to construct the expected thumbnail URL
 * @param originalUrl - Original image download URL
 * @returns Expected thumbnail URL (may not exist yet)
 */
export function getThumbnailUrl(originalUrl: string): string {
  // This is a placeholder - the actual thumbnail URL will be different
  // The Cloud Function will update the message with the real thumbnail URL
  return originalUrl.replace("/original.", "/_thumb.");
}
