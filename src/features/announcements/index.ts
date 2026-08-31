export type {
  Announcement,
  AnnouncementCategory,
  AnnouncementVisibility,
  AnnouncementFilter,
  AnnouncementRead,
  UserReadAnnouncement,
  ReadAnalyticsGroup,
} from "./announcement.types";

export {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  listPublicAnnouncements,
  getActiveRecruitmentAnnouncements,
  listAnnouncementsForUser,
  markAsRead,
  getUserReadIds,
  getReadAnalytics,
  getReadCount,
} from "./service";

// Firestore collection name constant for announcements
export const ANNOUNCEMENTS_COLLECTION = "announcements";
