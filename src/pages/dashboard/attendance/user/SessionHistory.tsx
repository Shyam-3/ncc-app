import { Table, Badge, Form, Card } from 'react-bootstrap';
import { useState, useMemo, type ChangeEvent } from 'react';
import type { AttendanceSession, AttendanceMark } from '@/features/attendance/model/attendance.types';
import { ATTENDANCE_STATUS_COLORS, ATTENDANCE_STATUS_LABELS } from '@/features/attendance/model/attendance.types';

interface SessionWithMark {
  session: AttendanceSession & { id: string };
  mark: AttendanceMark | null;
}

interface SessionHistoryProps {
  history: SessionWithMark[];
}

export function SessionHistory({ history }: SessionHistoryProps) {
  const [statusFilter, setStatusFilter] = useState<string>('');

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesStatus = !statusFilter || item.mark?.status === statusFilter;
      return matchesStatus;
    });
  }, [history, statusFilter]);

  return (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-white d-flex flex-wrap gap-2 align-items-center">
        <span className="fw-semibold">Session History</span>
        <div className="ms-auto d-flex gap-2">
          <Form.Select
            size="sm"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="P">Present</option>
            <option value="A">Absent</option>
          </Form.Select>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        {filteredHistory.length === 0 ? (
          <div className="text-center text-muted py-5">
            No attendance records found
          </div>
        ) : (
          <Table hover responsive className="mb-0">
            <thead className="bg-light">
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item) => (
                <tr key={item.session.id}>
                  <td>{item.session.date}</td>
                  <td>{item.session.title}</td>
                  <td>
                    <Badge bg={ATTENDANCE_STATUS_COLORS[item.mark.status]}>
                      {ATTENDANCE_STATUS_LABELS[item.mark.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}
