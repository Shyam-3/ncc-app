// Custom hook for attendance management
import { useCallback, useState } from 'react';
import * as attendanceService from '../service';
import type { AttendanceSession, AttendanceMark } from '../model/attendance.types';

export function useAttendance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      return await attendanceService.listSessions();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch sessions';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createSession = useCallback(async (session: Omit<AttendanceSession, 'createdAt' | 'locked' | 'totalCadets'>) => {
    setLoading(true);
    setError(null);
    try {
      return await attendanceService.createSession(session);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create session';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const markAttendance = useCallback(async (mark: AttendanceMark) => {
    setError(null);
    try {
      // Mark attendance implementation
      // This would call an API endpoint or service function
      return mark;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark attendance';
      setError(message);
      throw err;
    }
  }, []);

  return {
    loading,
    error,
    fetchSessions,
    createSession,
    markAttendance,
  };
}
