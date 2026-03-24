// Announcements service - API layer for announcements
import { db } from '@/shared/config/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { Announcement, AnnouncementFilter } from './model/announcement.types';

const announcementsCol = collection(db, 'announcements');

export async function listAnnouncements(filter?: AnnouncementFilter): Promise<Announcement[]> {
  let q = query(announcementsCol, orderBy('sentAt', 'desc'));
  
  if (filter?.channel) {
    q = query(announcementsCol, where('channel', '==', filter.channel), orderBy('sentAt', 'desc'));
  }
  
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement));
}

export async function getAnnouncement(id: string): Promise<Announcement | null> {
  const snap = await getDocs(query(announcementsCol, where('__name__', '==', id)));
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Announcement;
}
