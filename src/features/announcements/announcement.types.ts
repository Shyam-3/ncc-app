// Announcements feature type definitions

export type AnnouncementCategory =
  "celebrations" | "camps" | "activities" | "parades" | "recruitment";
export type AnnouncementVisibility = "public" | "auth_only";

export interface Announcement {
  id?: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  visibility: AnnouncementVisibility;
  isPinned?: boolean;
  createdAt: any; // Firestore Timestamp
  expiresAt?: string; // ISO datetime string (required for recruitment, optional for others)
  theme?: "tricolor" | "ncc"; // Celebration color theme
  createdBy: string; // UID of admin who created
  createdByName?: string; // Display name of creator
}

// Stored at: announcements/{announcementId}/reads/{userId}
export interface AnnouncementRead {
  userId: string;
  userName: string;
  nccYear?: string;
  role: string; // 'member' | 'admin' | 'superadmin'
  readAt: any; // Firestore Timestamp
}

// Stored at: users/{uid}/readAnnouncements/{announcementId}
export interface UserReadAnnouncement {
  announcementId: string;
  readAt: any; // Firestore Timestamp
}

export interface AnnouncementFilter {
  category?: AnnouncementCategory;
  visibility?: AnnouncementVisibility;
  includeExpired?: boolean;
}

// Read analytics grouped by NCC year for admin view
export interface ReadAnalyticsGroup {
  label: string; // e.g., '1st Year', '2nd Year', 'ANOs'
  readers: AnnouncementRead[];
}
