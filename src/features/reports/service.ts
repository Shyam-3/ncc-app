import { db } from '@/config/firebase';
import { Cadet } from '@/types';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';

export interface OnDutyReport {
  cadetId: string;
  cadetName: string;
  registerNumber: string;
  rank?: string;
  date: string;
  dutyType: string;
  location: string;
  startTime: string;
  endTime: string;
  observations: string;
  createdAt: string;
  createdBy: string;
}

export async function saveOnDutyReport(report: OnDutyReport) {
  await addDoc(collection(db, 'reports'), { ...report, type: 'on-duty' });
}

export async function getCadetById(id: string): Promise<(Cadet & { id: string }) | null> {
  const q = query(collection(db, 'users'), where('__name__', '==', id));
  const snap = await getDocs(q);
  const d: any = snap.docs[0];
  return d ? { id: d.id, ...(d.data() as Cadet) } : null;
}
