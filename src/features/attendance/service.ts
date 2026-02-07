import { db } from '@/config/firebase';
import { AttendanceMark, AttendanceSession, Cadet } from '@/types';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';

const sessionsCol = collection(db, 'attendanceSessions');

export async function listSessions(): Promise<(AttendanceSession & { id: string })[]> {
	const q = query(sessionsCol, orderBy('date', 'desc'));
	const snap = await getDocs(q);
	return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as AttendanceSession) }));
}

export function listenSessions(cb: (items: (AttendanceSession & { id: string })[]) => void) {
	const q = query(sessionsCol, orderBy('date', 'desc'));
	return onSnapshot(q, (snap: any) => {
		cb(snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as AttendanceSession) })));
	});
}

export async function createSession(data: Omit<AttendanceSession, 'createdAt' | 'locked' | 'totalCadets'> & { totalCadets?: number }): Promise<string> {
	const payload: AttendanceSession = {
		...data,
		createdAt: new Date().toISOString(),
		locked: false,
		totalCadets: data.totalCadets ?? 0,
	};
	
	// Remove undefined fields to avoid Firestore errors
	const cleanPayload = Object.fromEntries(
		Object.entries(payload).filter(([_, v]) => v !== undefined)
	);
	
	const ref = await addDoc(sessionsCol, cleanPayload as any);
	return ref.id;
}

export async function listCadets(): Promise<(Cadet & { id: string })[]> {
	const snap = await getDocs(collection(db, 'users'));
	console.log('Total users found:', snap.docs.length);
	
	const cadets = snap.docs
		.filter((d: any) => {
			const data = d.data();
			// All users except superadmins are cadets (member, admin, subadmin)
			const isEligible = data.role !== 'superadmin' && data.status === 'active';
			if (isEligible) {
				console.log('Eligible cadet:', data.name, '| Role:', data.role, '| Status:', data.status);
			}
			return isEligible;
		})
		.map((d: any) => {
			const data = d.data();
			return {
				id: d.id,
				userId: d.id,
				name: data.name || '',
				dateOfBirth: data.dateOfBirth || '',
				email: data.email || '',
				division: data.division || undefined,
				regimentalNumber: data.regimentalNumber || '',
				platoon: data.platoon || '',
				dateOfEnrollment: data.dateOfEnrollment || '',
				rank: data.rank || 'CDT',
				year: data.year || '',
				department: data.department || '',
				rollNo: data.rollNo || '',
				registerNumber: data.registerNumber || '',
				phone: data.phone || '',
				bloodGroup: data.bloodGroup || '',
				address: data.address || '',
				joinDate: data.createdAt || '',
			} as Cadet & { id: string };
		});
	
	console.log('Eligible cadets count:', cadets.length);
	return cadets;
}

export async function getCadetByUserId(userId: string): Promise<(Cadet & { id: string }) | null> {
	const userDoc = await getDoc(doc(db, 'users', userId));
	if (!userDoc.exists()) return null;
	
	const data = userDoc.data();
	// All users except superadmins are cadets
	if (data.role === 'superadmin' || data.status !== 'active') return null;
	
	return {
		id: userId,
		userId: userId,
		name: data.name || '',
		dateOfBirth: data.dateOfBirth || '',
		email: data.email || '',
		division: data.division || undefined,
		regimentalNumber: data.regimentalNumber || '',
		platoon: data.platoon || '',
		dateOfEnrollment: data.dateOfEnrollment || '',
		rank: data.rank || 'CDT',
		year: data.year || '',
		department: data.department || '',
		rollNo: data.rollNo || '',
		registerNumber: data.registerNumber || '',
		phone: data.phone || '',
		bloodGroup: data.bloodGroup || '',
		address: data.address || '',
		joinDate: data.createdAt || '',
	} as Cadet & { id: string };
}

export async function listMarks(sessionId: string): Promise<(AttendanceMark & { id: string })[]> {
	const col = collection(db, 'attendanceSessions', sessionId, 'marks');
	const snap = await getDocs(col);
	return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as AttendanceMark) }));
}

export function listenMarks(sessionId: string, cb: (items: (AttendanceMark & { id: string })[]) => void) {
	const col = collection(db, 'attendanceSessions', sessionId, 'marks');
	return onSnapshot(col, (snap: any) => cb(snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as AttendanceMark) }))));
}

export async function getMark(sessionId: string, cadetId: string): Promise<AttendanceMark | null> {
	const ref = doc(db, 'attendanceSessions', sessionId, 'marks', cadetId);
	const snap: any = await getDoc(ref);
	return snap.exists() ? (snap.data() as AttendanceMark) : null;
}

export async function setMark(sessionId: string, cadetId: string, status: 'P' | 'L' | 'A') {
	const markRef = doc(db, 'attendanceSessions', sessionId, 'marks', cadetId);
	await setDoc(markRef, {
		sessionId,
		cadetId,
		status,
		timestamp: new Date().toISOString(),
	}, { merge: true });
}

export async function lockSession(sessionId: string) {
	await updateDoc(doc(db, 'attendanceSessions', sessionId), { locked: true });
}

export async function deleteSession(sessionId: string) {
	await deleteDoc(doc(db, 'attendanceSessions', sessionId));
}

