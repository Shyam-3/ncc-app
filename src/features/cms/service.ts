import { db } from '@/config/firebase';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';

export interface CmsSection {
  heading: string;
  body: string;
}

export interface CmsDoc {
  title: string;
  sections: CmsSection[];
  updatedAt?: string;
  updatedBy?: string;
  visibility?: 'public' | 'private';
}

export const cmsDocRef = (key: string) => doc(db, 'cms', key);

export async function fetchCms(key: string): Promise<CmsDoc | null> {
  const snap = await getDoc(cmsDocRef(key));
  return snap.exists() ? (snap.data() as CmsDoc) : null;
}

export function listenCms(
  key: string,
  cb: (data: CmsDoc | null) => void
) {
  return onSnapshot(cmsDocRef(key), (snap: any) => {
    cb(snap.exists() ? (snap.data() as CmsDoc) : null);
  });
}

export async function saveCms(
  key: string,
  data: CmsDoc,
  userId?: string
): Promise<void> {
  const payload: CmsDoc = {
    ...data,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  };
  await setDoc(cmsDocRef(key), payload, { merge: true });
}
