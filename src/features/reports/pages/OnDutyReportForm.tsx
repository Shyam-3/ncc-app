import { useAuth } from '@/contexts/AuthContext';
import { listCadets } from '@/features/attendance/service';
import { saveOnDutyReport } from '@/features/reports/service';
import { Cadet } from '@/types';
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import toast from 'react-hot-toast';

const OnDutyReportForm: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cadets, setCadets] = useState<(Cadet & { id: string })[]>([]);
  const [cadetId, setCadetId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dutyType, setDutyType] = useState('orderly');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCadets().then((items) => {
      setCadets(items);
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load cadets');
      setLoading(false);
    });
  }, []);

  const selectedCadet = useMemo(() => cadets.find(c => c.id === cadetId), [cadets, cadetId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cadetId || !date || !dutyType) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!selectedCadet || !currentUser) {
      toast.error('Invalid selection');
      return;
    }
    try {
      setSaving(true);
      const report = {
        cadetId,
        cadetName: selectedCadet.name || '',
        registerNumber: selectedCadet.registerNumber || '',
        rank: selectedCadet.rank,
        date,
        dutyType,
        location,
        startTime,
        endTime,
        observations,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
      };
      await saveOnDutyReport(report);
      toast.success('On-Duty report saved successfully');
      setCadetId('');
      setDate(new Date().toISOString().slice(0, 10));
      setDutyType('orderly');
      setLocation('');
      setStartTime('09:00');
      setEndTime('17:00');
      setObservations('');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to save report');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="mb-3">On-Duty Report Form</h2>
      <p className="text-muted">Select a cadet and fill duty details. Cadet information will be auto-filled below.</p>

      <Form onSubmit={handleSubmit}>
        <Row className="g-3">
          <Col xs={12} sm={12} md={6} lg={6} xl={6}>
            <Form.Group controlId="cadet">
              <Form.Label>Select Cadet *</Form.Label>
              <Form.Select value={cadetId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCadetId(e.target.value)} required>
                <option value="" disabled>-- Choose Cadet --</option>
                {cadets.map(c => (
                  <option key={c.id} value={c.id}>{c.registerNumber} — {c.rollNo} ({c.platoon})</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col xs={12} sm={6} md={3} lg={3} xl={3}>
            <Form.Group controlId="date">
              <Form.Label>Date *</Form.Label>
              <Form.Control type="date" value={date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)} required />
            </Form.Group>
          </Col>
          <Col xs={12} sm={6} md={3} lg={3} xl={3}>
            <Form.Group controlId="dutyType">
              <Form.Label>Duty Type *</Form.Label>
              <Form.Select value={dutyType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDutyType(e.target.value)} required>
                <option value="orderly">Orderly</option>
                <option value="office">Office</option>
                <option value="quarter_guard">Quarter Guard</option>
                <option value="flag_detail">Flag Detail</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col xs={12} sm={12} md={6} lg={6} xl={6}>
            <Form.Group controlId="location">
              <Form.Label>Location</Form.Label>
              <Form.Control value={location} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)} placeholder="e.g., Main Office" />
            </Form.Group>
          </Col>
          <Col xs={12} sm={6} md={3} lg={3} xl={3}>
            <Form.Group controlId="startTime">
              <Form.Label>Start Time</Form.Label>
              <Form.Control type="time" value={startTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartTime(e.target.value)} />
            </Form.Group>
          </Col>
          <Col xs={12} sm={6} md={3} lg={3} xl={3}>
            <Form.Group controlId="endTime">
              <Form.Label>End Time</Form.Label>
              <Form.Control type="time" value={endTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndTime(e.target.value)} />
            </Form.Group>
          </Col>
          <Col xs={12} sm={12} md={12} lg={12} xl={12}>
            <Form.Group controlId="observations">
              <Form.Label>Observations / Notes</Form.Label>
              <Form.Control as="textarea" rows={4} value={observations} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setObservations(e.target.value)} placeholder="Detail any incidents, remarks, or special notes…" />
            </Form.Group>
          </Col>
        </Row>

        {selectedCadet && (
          <Card className="mt-3 bg-light">
            <Card.Body>
              <h6 className="mb-2">Auto-Filled Cadet Information:</h6>
              <div><strong>Reg No:</strong> {selectedCadet.registerNumber}</div>
              <div><strong>Roll No:</strong> {selectedCadet.rollNo}</div>
              <div><strong>Rank:</strong> {selectedCadet.rank || 'N/A'}</div>
              <div><strong>Platoon:</strong> {selectedCadet.platoon}</div>
              <div><strong>Year:</strong> {selectedCadet.year}</div>
              <div><strong>Department:</strong> {selectedCadet.department}</div>
            </Card.Body>
          </Card>
        )}

        <div className="mt-4 d-flex gap-2">
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Report'}</Button>
          <Button variant="secondary" type="button" onClick={() => {
            if (window.confirm('Clear form?')) {
              setCadetId('');
              setDate(new Date().toISOString().slice(0, 10));
              setDutyType('orderly');
              setLocation('');
              setStartTime('09:00');
              setEndTime('17:00');
              setObservations('');
            }
          }}>Clear</Button>
        </div>
      </Form>
    </div>
  );
};

export default OnDutyReportForm;
