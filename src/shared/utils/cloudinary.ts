/**
 * Cloudinary upload utilities for the NCC App.
 *
 * Uses Unsigned Upload Presets so the React frontend can upload
 * directly to Cloudinary without a backend server.
 */

import { envConfig } from "../config/env";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  original_filename: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

export interface CloudinaryUploadOptions {
  /** The subfolder path inside ncc_assets (e.g., 'profiles/cadets/2023-2026/SD') */
  folder: string;
  /** The filename without extension (e.g., 'john_doe') */
  publicId: string;
  /** Resource type: 'image' for photos, 'raw' for PDFs/Excel/etc. Defaults to 'image'. */
  resourceType?: "image" | "raw";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Sanitize a name for use as a Cloudinary public_id (filename).
 * - Trims whitespace
 * - Converts to lowercase
 * - Replaces spaces with underscores
 * - Removes any character that isn't alphanumeric, underscore, or hyphen
 */
export function sanitizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");
}

/**
 * Calculate NCC tenure from a dateOfEnrollment string.
 * Tenure is always 3 years from the enrollment year.
 *
 * @param dateOfEnrollment - ISO date string or YYYY-MM-DD (e.g., '2024-10-15')
 * @returns Tenure string like '2024-2027'
 */
export function calculateTenure(dateOfEnrollment: string): string {
  const date = new Date(dateOfEnrollment);
  const enrollYear = date.getFullYear();
  return `${enrollYear}-${enrollYear + 3}`;
}

/**
 * Build the Cloudinary folder path for a cadet's profile photo.
 *
 * @param dateOfEnrollment - The cadet's enrollment date (ISO string)
 * @param division - 'SD' or 'SW'
 * @returns Folder path like 'ncc_assets/profiles/cadets/2024-2027/SD'
 */
export function buildCadetPhotoPath(
  dateOfEnrollment: string,
  division: "SD" | "SW",
): string {
  const tenure = calculateTenure(dateOfEnrollment);
  return `ncc_assets/profiles/cadets/${tenure}/${division}`;
}

/**
 * Build the Cloudinary folder path for an alumni's profile photo.
 * Uses the exact nccTenure string (e.g. '2021-2024').
 *
 * @param nccTenure - The tenure string representing their NCC years
 * @param division - 'SD' or 'SW'
 * @returns Folder path like 'ncc_assets/profiles/cadets/2012-2014/SD'
 */
export function buildAlumniPhotoPath(
  nccTenure: string,
  division: "SD" | "SW",
): string {
  const sanitizedTenure = nccTenure.trim().replace(/\s+/g, "");
  return `ncc_assets/profiles/cadets/${sanitizedTenure}/${division}`;
}

/**
 * Build the Cloudinary folder path for an ANO's profile photo.
 *
 * @returns Folder path 'ncc_assets/profiles/ano'
 */
export function buildAnoPhotoPath(): string {
  return "ncc_assets/profiles/ano";
}

// ─── Upload ──────────────────────────────────────────────────────────────────

/**
 * Upload a file directly to Cloudinary using an Unsigned Upload Preset.
 * No backend server required.
 *
 * @param file - The File object to upload
 * @param options - folder, publicId, and optional resourceType
 * @returns The Cloudinary upload result with secure_url and public_id
 * @throws Error if the upload fails
 */
export async function uploadToCloudinary(
  file: File,
  options: CloudinaryUploadOptions,
): Promise<CloudinaryUploadResult> {
  const { cloudName, uploadPreset } = envConfig.cloudinaryConfig;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.",
    );
  }

  const resourceType = options.resourceType || "image";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", options.folder);
  formData.append("public_id", options.publicId);

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Cloudinary upload failed: ${errorData?.error?.message || response.statusText}`,
    );
  }

  return response.json();
}

/**
 * Upload a cadet's profile photo to Cloudinary.
 *
 * @param file - The image file
 * @param name - The cadet's full name
 * @param dateOfEnrollment - The cadet's enrollment date
 * @param division - 'SD' or 'SW'
 * @returns The Cloudinary upload result
 */
export async function uploadCadetPhoto(
  file: File,
  name: string,
  dateOfEnrollment: string,
  division: "SD" | "SW",
): Promise<CloudinaryUploadResult> {
  return uploadToCloudinary(file, {
    folder: buildCadetPhotoPath(dateOfEnrollment, division),
    publicId: `${sanitizeName(name)}_${Date.now()}`,
    resourceType: "image",
  });
}

/**
 * Upload an alumni's profile photo to Cloudinary.
 *
 * @param file - The image file
 * @param name - The alumni's full name
 * @param nccTenure - The tenure string (e.g., '2012-2014')
 * @param division - 'SD' or 'SW'
 * @returns The Cloudinary upload result
 */
export async function uploadAlumniPhoto(
  file: File,
  name: string,
  nccTenure: string,
  division: "SD" | "SW",
): Promise<CloudinaryUploadResult> {
  return uploadToCloudinary(file, {
    folder: buildAlumniPhotoPath(nccTenure, division),
    publicId: `${sanitizeName(name)}_${Date.now()}`,
    resourceType: "image",
  });
}

/**
 * Upload an ANO's profile photo to Cloudinary.
 *
 * @param file - The image file
 * @param name - The ANO's name
 * @returns The Cloudinary upload result
 */
export async function uploadAnoPhoto(
  file: File,
  name: string,
): Promise<CloudinaryUploadResult> {
  return uploadToCloudinary(file, {
    folder: buildAnoPhotoPath(),
    publicId: `${sanitizeName(name)}_${Date.now()}`,
    resourceType: "image",
  });
}
