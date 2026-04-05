import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '@/features/auth/context/AuthContext';
import { QuickSelectGrid } from './QuickSelectGrid';
import {
  getSession,
  getCadetsByDivision,
  listMarks,
  bulkSetMarks,
  lockSession,
  updateSessionStatus,
} from '@/features/attendance/service';
import type { Division, NccYear } from '@/shared/config/constants';
import type { AttendanceSession, AttendanceStatus } from '@/features/attendance/model/attendance.types';
import type { Cadet } from '@/shared/types';
import toast from 'react-hot-toast';
import { formatISTDate } from '@/shared/utils/dateTime';

interface BulkMarkerProps {
  sessionId: string;
  onClose?: () => void;
}

export function BulkMarker({ sessionId, onClose }: BulkMarkerProps) {
  const { currentUser, userProfile } = useAuth();
  const [session, setSession] = useState<(AttendanceSession & { id: string }) | null>(null);
  const [cadets, setCadets] = useState<(Cadet & { id: string })[]>([]);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load session and cadets
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const sess = await getSession(sessionId);
        if (!sess) {
          toast.error('Session not found');
          onClose?.();
          return;
        }
        setSession(sess);

        // Load cadets for this division/year
        const cadetList = await getCadetsByDivision(
          sess.divisionId as Division,
          sess.nccYear as NccYear
        );
        setCadets(cadetList);

        // Default all cadets to absent for quick draft/lock workflows.
        const marksMap: Record<string, AttendanceStatus> = {};
        cadetList.forEach((c) => {
          marksMap[c.id] = 'A';
        });

        // Load existing marks
        const existingMarks = await listMarks(sessionId);
        existingMarks.forEach((m) => {
          marksMap[m.cadetId] = m.status;
        });
        setMarks(marksMap);
      } catch (err) {
        console.error('Error loading session:', err);
        toast.error('Failed to load session');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  // Handle individual mark change
  const handleMarkChange = useCallback((cadetId: string, status: AttendanceStatus) => {
    setMarks((prev) => ({ ...prev, [cadetId]: status }));
    setHasChanges(true);
  }, []);

  // Handle bulk mark (all present/absent)
  const handleBulkMark = useCallback(
    (status: AttendanceStatus) => {
      const newMarks: Record<string, AttendanceStatus> = {};
      cadets.forEach((c) => {
        newMarks[c.id] = status;
      });
      setMarks(newMarks);
      setHasChanges(true);
    },
    [cadets]
  );

  // Save marks
  const handleSave = async (lock = false) => {
    const markerUid = currentUser?.uid || userProfile?.uid;
    if (!markerUid) {
      toast.error('Unable to identify current user. Please re-login and try again.');
      return;
    }

    setSaving(true);
    try {
      // Prepare bulk payload
      const marksList = Object.entries(marks).map(([cadetId, status]) => ({
        cadetId,
        status,
      }));

      await bulkSetMarks({
        sessionId,
        marks: marksList,
        markedBy: markerUid,
      });

      if (lock) {
        await lockSession(sessionId, markerUid);
        toast.success('Attendance saved and session locked');
        onClose?.();
      } else {
        // Just open the session if it was draft
        if (session?.status === 'draft') {
          await updateSessionStatus(sessionId, 'open');
        }
        toast.success('Attendance saved');
      }

      setHasChanges(false);
    } catch (err) {
      console.error('Error saving marks:', err);
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2">Loading session...</p>
      </div>
    );
  }

  if (!session) {
    return <Alert variant="danger">Session not found</Alert>;
  }

  const isLocked = session.status === 'locked';

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">
            {session.title}
            <span className="ms-2 fs-6 fw-normal text-muted">
              {formatISTDate(session.date, { day: '2-digit', month: '2-digit', year: '2-digit' })} | {session.divisionId} | {session.nccYear}
            </span>
          </h5>
        </div>
        <div className="d-flex gap-2">
          {onClose && (
            <Button variant="outline-secondary" size="sm" onClick={onClose}>
              <i className="bi bi-x-lg"></i> Close
            </Button>
          )}
        </div>
      </Card.Header>
      <Card.Body>
        {isLocked && (
          <Alert variant="warning" className="mb-3">
            <i className="bi bi-lock-fill me-2"></i>
            This session is locked and cannot be edited.
          </Alert>
        )}

        <QuickSelectGrid
          cadets={cadets}
          marks={marks}
          onMarkChange={handleMarkChange}
          onBulkMark={handleBulkMark}
          disabled={isLocked || saving}
        />
      </Card.Body>
      {!isLocked && (
        <Card.Footer className="d-flex justify-content-between align-items-center">
          <div>
            {hasChanges && (
              <span className="text-warning">
                <i className="bi bi-exclamation-circle me-1"></i>
                Unsaved changes
              </span>
            )}
          </div>
          <div className="d-flex gap-2">
            <Button
              variant="outline-primary"
              onClick={() => handleSave(false)}
              disabled={saving || !hasChanges}
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              variant="success"
              onClick={() => handleSave(true)}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save & Lock'}
            </Button>
          </div>
        </Card.Footer>
      )}
    </Card>
  );
}
