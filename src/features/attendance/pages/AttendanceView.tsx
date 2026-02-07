import { useAuth } from '@/contexts/AuthContext';
import { getCadetByUserId, listenMarks, listenSessions } from '@/features/attendance/service';
import { AttendanceMark, AttendanceSession, Cadet } from '@/types';
import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Col, Form, ProgressBar, Row, Spinner, Table } from 'react-bootstrap';

const AttendanceView: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<(AttendanceSession & { id: string })[]>([]);
  const [cadet, setCadet] = useState<(Cadet & { id: string }) | null>(null);
  const [marks, setMarks] = useState<Record<string, AttendanceMark>>({});
  const [sessionFilter, setSessionFilter] = useState<string>('');

  useEffect(() => {
    if (!currentUser) return;
    let unsub: (() => void) | null = null;
    (async () => {
      const c = await getCadetByUserId(currentUser.uid);
      setCadet(c);
      unsub = listenSessions(items => setSessions(items));
      setLoading(false);
    })();
    return () => { if (unsub) unsub(); };
  }, [currentUser]);

  // Subscribe to marks per session to compute stats
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    sessions.forEach(s => {
      const u = listenMarks(s.id!, items => {
        const myMark = items.find(m => m.cadetId === cadet?.id);
        setMarks(prev => ({ ...prev, [s.id!]: myMark as AttendanceMark }));
      });
      unsubs.push(u);
    });
    return () => unsubs.forEach(f => f());
  }, [sessions, cadet?.id]);

  const stats = useMemo(() => {
    const all = Object.values(marks).filter(Boolean);
    const present = all.filter(m => m?.status === 'P').length;
    const late = all.filter(m => m?.status === 'L').length;
    const absent = all.filter(m => m?.status === 'A').length;
    const total = sessions.length;
    const attendanceRate = total ? Math.round(((present + late) / total) * 100) : 0;
    return { present, late, absent, total, attendanceRate };
  }, [marks, sessions.length]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => !sessionFilter || s.type === sessionFilter);
  }, [sessions, sessionFilter]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="mb-3">My Attendance</h2>
      {cadet && (
        <Card className="mb-4">
          <Card.Body>
            <Row className="g-3">
              <Col xs={12} sm={12} md={8} lg={8} xl={8}>
                <h5 className="mb-1">{cadet.registerNumber} — {cadet.rollNo}</h5>
                <div className="text-muted small">Platoon: {cadet.platoon || 'N/A'} | Dept: {cadet.department} | Year: {cadet.year}</div>
              </Col>
              <Col xs={12} sm={12} md={4} lg={4} xl={4} className="text-md-end mt-3 mt-md-0">
                <div className="fw-semibold">Attendance Rate</div>
                <ProgressBar now={stats.attendanceRate} label={`${stats.attendanceRate}%`} />
              </Col>
            </Row>
            <Row className="mt-3 text-center g-2">
              <Col xs={4} sm={4} md={4} lg={4} xl={4}>
                <Badge bg="success" className="px-3 py-2">Present: {stats.present}</Badge>
              </Col>
              <Col>
                <Badge bg="warning" text="dark" className="px-3 py-2">Late: {stats.late}</Badge>
              </Col>
              <Col>
                <Badge bg="danger" className="px-3 py-2">Absent: {stats.absent}</Badge>
              </Col>
              <Col>
                <Badge bg="secondary" className="px-3 py-2">Total: {stats.total}</Badge>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      <Form className="mb-3">
        <Form.Group controlId="filterType" className="w-auto">
          <Form.Label className="me-2">Filter by Type</Form.Label>
          <Form.Select value={sessionFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSessionFilter(e.target.value)}>
            <option value="">All Types</option>
            {[...new Set(sessions.map(s => s.type))].map(t => <option key={t} value={t}>{t}</option>)}
          </Form.Select>
        </Form.Group>
      </Form>

      <Table striped bordered hover responsive size="sm">
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Title</th>
            <th>Type</th>
            <th>Platoon</th>
            <th>Status</th>
            <th>Marked At</th>
          </tr>
        </thead>
        <tbody>
          {filteredSessions.map((s, idx) => {
            const mark = marks[s.id!];
            return (
              <tr key={s.id}>
                <td>{idx + 1}</td>
                <td>{s.date}</td>
                <td>{s.title}</td>
                <td>{s.type}</td>
                <td>{s.platoon || 'All'}</td>
                <td>{mark?.status || '-'}</td>
                <td>{mark?.timestamp ? new Date(mark.timestamp).toLocaleString() : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default AttendanceView;
