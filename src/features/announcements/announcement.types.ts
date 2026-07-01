// Announcements feature type definitions

export interface Announcement {
  id?: string;
  title: string;
  body: string;
  audienceFilter: string;
  channel: string;
  sentAt: string;
  publishedAt?: string;
  expiresAt?: string;
}

export interface AnnouncementFilter {
  channel?: string;
  audienceFilter?: string;
  startDate?: string;
  endDate?: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
}
