// Announcements service - Full CRUD + read tracking + analytics
import { db } from '@/shared/config/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import type {
  Announcement,
  AnnouncementFilter,
  AnnouncementRead,
  ReadAnalyticsGroup,
} from './announcement.types';

const announcementsCol = collection(db, 'announcements');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isExpired(announcement: Announcement): boolean {
  if (!announcement.expiresAt) return false;
  return new Date(announcement.expiresAt) < new Date();
}

function filterExpired(announcements: Announcement[], includeExpired = false): Announcement[] {
  if (includeExpired) return announcements;
  return announcements.filter((a) => !isExpired(a));
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createAnnouncement(
  data: Omit<Announcement, 'id' | 'createdAt'>,
): Promise<string> {
  const docRef = await addDoc(announcementsCol, {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateAnnouncement(
  id: string,
  data: Partial<Omit<Announcement, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'announcements', id), data);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  // Delete all reads subcollection docs first
  const readsSnap = await getDocs(collection(db, 'announcements', id, 'reads'));
  const deletePromises = readsSnap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletePromises);

  // Delete the announcement itself
  await deleteDoc(doc(db, 'announcements', id));
}

// ─── List / Query ─────────────────────────────────────────────────────────────

export async function listAnnouncements(filter?: AnnouncementFilter): Promise<Announcement[]> {
  const q = query(announcementsCol, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement));

  if (filter?.category) {
    items = items.filter((a) => a.category === filter.category);
  }
  if (filter?.visibility) {
    items = items.filter((a) => a.visibility === filter.visibility);
  }
  return filterExpired(items, filter?.includeExpired ?? true);
}

/** Public announcements only (visibility === 'public'), not expired */
export async function listPublicAnnouncements(): Promise<Announcement[]> {
  const q = query(announcementsCol, where('visibility', '==', 'public'));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement));
  
  // Sort client-side to avoid requiring a composite index
  items.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  
  return filterExpired(items);
}

/** Active recruitment announcements (public, not expired) for homepage banner */
export async function getActiveRecruitmentAnnouncements(): Promise<Announcement[]> {
  // Only query by visibility to satisfy security rules, filter category and sort client-side
  const q = query(announcementsCol, where('visibility', '==', 'public'));
  const snap = await getDocs(q);
  
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement));
  items = items.filter((a) => a.category === 'recruitment');
  items.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  
  return filterExpired(items);
}

/** All announcements visible to an authenticated user (public + auth_only), not expired */
export async function listAnnouncementsForUser(): Promise<Announcement[]> {
  const q = query(announcementsCol, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement));
  items = items.filter((a) => a.category !== 'recruitment');
  return filterExpired(items);
}

// ─── Read Tracking ────────────────────────────────────────────────────────────

/** Mark an announcement as read by a user (dual-write) */
export async function markAsRead(
  announcementId: string,
  user: { uid: string; name: string; nccYear?: string; role: string },
): Promise<void> {
  const readData: AnnouncementRead = {
    userId: user.uid,
    userName: user.name,
    nccYear: user.nccYear || '',
    role: user.role,
    readAt: serverTimestamp(),
  };

  // Write 1: announcements/{id}/reads/{uid} (for admin analytics)
  await setDoc(doc(db, 'announcements', announcementId, 'reads', user.uid), readData);

  // Write 2: users/{uid}/readAnnouncements/{announcementId} (for user's unread count)
  await setDoc(doc(db, 'users', user.uid, 'readAnnouncements', announcementId), {
    announcementId,
    readAt: serverTimestamp(),
  });
}

/** Get all announcement IDs that a user has read */
export async function getUserReadIds(uid: string): Promise<Set<string>> {
  const snap = await getDocs(collection(db, 'users', uid, 'readAnnouncements'));
  return new Set(snap.docs.map((d) => d.id));
}

/** Get read count for an announcement */
export async function getReadCount(announcementId: string): Promise<number> {
  const snap = await getDocs(collection(db, 'announcements', announcementId, 'reads'));
  return snap.size;
}

/** Get read analytics grouped by NCC year (for admin view) */
export async function getReadAnalytics(announcementId: string): Promise<ReadAnalyticsGroup[]> {
  const snap = await getDocs(collection(db, 'announcements', announcementId, 'reads'));
  const reads = snap.docs.map((d) => d.data() as AnnouncementRead);

  // Group by category
  const groups: Record<string, AnnouncementRead[]> = {};
  const anoGroup: AnnouncementRead[] = [];

  for (const read of reads) {
    if (read.role === 'superadmin' || read.role === 'admin') {
      anoGroup.push(read);
    } else {
      const key = read.nccYear || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(read);
    }
  }

  const result: ReadAnalyticsGroup[] = [];

  // NCC years in order
  const yearOrder = ['1st Year', '2nd Year', '3rd Year'];
  for (const year of yearOrder) {
    if (groups[year]) {
      result.push({ label: year, readers: groups[year] });
      delete groups[year];
    }
  }

  // Any remaining groups (Unknown, etc.)
  for (const [label, readers] of Object.entries(groups)) {
    result.push({ label, readers });
  }

  // ANOs at the end
  if (anoGroup.length > 0) {
    result.push({ label: 'ANOs', readers: anoGroup });
  }

  return result;
}
