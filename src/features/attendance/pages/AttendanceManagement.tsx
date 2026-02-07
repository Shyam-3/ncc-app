import { ACADEMIC_YEARS, EVENT_TYPES } from '@/config/constants';
import { createSession, deleteSession, listCadets, listMarks, listenMarks, listenSessions, lockSession, setMark } from '@/features/attendance/service';
import { AttendanceMark, AttendanceSession, Cadet } from '@/types';
import jsPDF from 'jspdf';
import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Col, Form, Row, Spinner, Tab, Table, Tabs } from 'react-bootstrap';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const BASE_YEAR_OPTIONS = ACADEMIC_YEARS.filter(y => y !== '4th Year');

const AttendanceManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [cadets, setCadets] = useState<(Cadet & { id: string })[]>([]);
  const [sessions, setSessions] = useState<(AttendanceSession & { id: string })[]>([]);
  const [activeTab, setActiveTab] = useState<string>('generator');

  // Generator form state
  const [gTitle, setGTitle] = useState('Parade');
  const [gDate, setGDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [gType, setGType] = useState<string>('parade');
  const [gYear, setGYear] = useState<string>(BASE_YEAR_OPTIONS[0] || '');
  const [gDivision, setGDivision] = useState<string>('SD');
  const [gLocation, setGLocation] = useState<string>('');
  const [creating, setCreating] = useState(false);

  // Marker state
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [marks, setMarks] = useState<Record<string, AttendanceMark>>({});
  const [locking, setLocking] = useState(false);
  const [applyLate, setApplyLate] = useState(false);
  const [reportYearFilter, setReportYearFilter] = useState<string>(BASE_YEAR_OPTIONS[0] || '');
  const [reportDivisionFilter, setReportDivisionFilter] = useState<string>('SD');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  useEffect(() => {
    let unsubSessions: (() => void) | null = null;
    async function init() {
      try {
        const cadetsList = await listCadets();
        setCadets(cadetsList);
        unsubSessions = listenSessions((items) => setSessions(items));
      } catch (e: any) {
        console.error(e);
        toast.error(e.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    init();
    return () => {
      if (unsubSessions) unsubSessions();
    };
  }, []);

  // Subscribe to marks for selected session and initialize absent marks
  useEffect(() => {
    if (!selectedSessionId) return;
    const unsub = listenMarks(selectedSessionId, (items) => {
      const dict: Record<string, AttendanceMark> = {};
      items.forEach(m => { dict[m.cadetId] = m; });
      setMarks(dict);
    });
    return () => unsub();
  }, [selectedSessionId]);

  const selectedSession = useMemo(() => sessions.find(s => s.id === selectedSessionId), [sessions, selectedSessionId]);
  const yearOptions = useMemo(() => {
    const sessionYears = sessions
      .map(s => s.year)
      .filter((y): y is string => Boolean(y))
      .filter(y => y !== '4th Year');
    return Array.from(new Set<string>([...BASE_YEAR_OPTIONS, ...sessionYears]));
  }, [sessions]);

  useEffect(() => {
    if (yearOptions.length && !yearOptions.includes(reportYearFilter)) {
      setReportYearFilter(yearOptions[0]);
    }
  }, [yearOptions, reportYearFilter]);

  // Initialize all eligible cadets as absent when session is created/selected
  useEffect(() => {
    if (!selectedSessionId || !selectedSession) return;
    const eligibleCadets = cadets.filter(c => {
      const matchesYear = !selectedSession.year || (c.year || '') === selectedSession.year;
      const matchesDivision = !selectedSession.division || (c.division || '') === selectedSession.division;
      return matchesYear && matchesDivision;
    });
    // Initialize absent marks for cadets who don't have a mark yet
    eligibleCadets.forEach(async (c) => {
      if (!marks[c.id]) {
        try {
          await setMark(selectedSessionId, c.id, 'A');
        } catch (e) {
          console.error('Failed to initialize mark:', e);
        }
      }
    });
  }, [selectedSessionId, selectedSession, cadets, marks]);

  async function onCreateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!gTitle || !gDate || !gYear) {
      toast.error('Please enter title, date, and year');
      return;
    }
    try {
      setCreating(true);
      const eligibleCadets = cadets.filter(c => {
        const matchesYear = (c.year || '') === gYear;
        const matchesDivision = (c.division || '') === gDivision;
        return matchesYear && matchesDivision;
      });
      const id = await createSession({
        title: gTitle,
        date: gDate,
        type: gType,
        year: gYear,
        division: gDivision,
        location: gLocation || undefined,
        totalCadets: eligibleCadets.length,
        createdAt: '', // will be set in service
        locked: false,
      } as any);
      toast.success('Session created');
      setActiveTab('marker');
      setSelectedSessionId(id);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to create session');
    } finally {
      setCreating(false);
    }
  }

  async function onToggleMark(cadetId: string) {
    if (!selectedSessionId) return;
    try {
      const currentMark = marks[cadetId];
      const currentStatus = currentMark?.status || 'A';
      const isPresent = currentStatus === 'P' || currentStatus === 'L';
      
      // Toggle: if absent, mark as present (or late if toggle is on), if present/late, mark as absent
      const newStatus = isPresent ? 'A' : (applyLate ? 'L' : 'P');
      await setMark(selectedSessionId, cadetId, newStatus);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to update mark');
    }
  }

  async function onMarkAllPresent() {
    if (!selectedSessionId || !selectedSession) return;
    const eligibleCadets = cadets.filter(c => {
      const matchesYear = !selectedSession.year || (c.year || '') === selectedSession.year;
      const matchesDivision = !selectedSession.division || (c.division || '') === selectedSession.division;
      return matchesYear && matchesDivision;
    });
    try {
      const status = applyLate ? 'L' : 'P';
      await Promise.all(eligibleCadets.map(c => setMark(selectedSessionId, c.id, status)));
      toast.success(`Marked all cadets as ${applyLate ? 'Late' : 'Present'}`);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to mark all present');
    }
  }

  async function onLockSession() {
    if (!selectedSessionId) return;
    try {
      setLocking(true);
      await lockSession(selectedSessionId);
      toast.success('Session locked');
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to lock session');
    } finally {
      setLocking(false);
    }
  }

  async function onDeleteSession(sessionId: string) {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) return;
    try {
      await deleteSession(sessionId);
      toast.success('Session deleted');
      if (selectedSessionId === sessionId) {
        setSelectedSessionId('');
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to delete session');
    }
  }

  const counts = useMemo(() => {
    const vals = Object.values(marks);
    const P = vals.filter(v => v.status === 'P').length;
    const L = vals.filter(v => v.status === 'L').length;
    const A = vals.filter(v => v.status === 'A').length;
    return { P, L, A, total: vals.length };
  }, [marks]);

  async function exportYearPdf() {
    if (!reportYearFilter || !reportDivisionFilter) {
      toast.error('Select both year and division to export');
      return;
    }
    const yearDivisionSessions = sessions.filter(s => (s.year || '') === reportYearFilter && (s.division || '') === reportDivisionFilter);
    if (!yearDivisionSessions.length) {
      toast.error('No sessions found for the selected year and division');
      return;
    }
    try {
      setExportingPdf(true);
      const pdf = new jsPDF();
      let yPosition = 20;
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginLeft = 15;
      const marginRight = 15;
      const pageWidth = pdf.internal.pageSize.getWidth() - marginLeft - marginRight;
      
      // Title
      pdf.setFontSize(16);
      pdf.text(`Attendance Report - ${reportYearFilter} (${reportDivisionFilter})`, marginLeft, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(10);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, marginLeft, yPosition);
      yPosition += 8;
      
      for (const session of yearDivisionSessions) {
        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 20;
        }
        
        // Session header
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${session.date} - ${session.title}`, marginLeft, yPosition);
        yPosition += 6;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Location: ${session.location || 'N/A'}`, marginLeft, yPosition);
        yPosition += 4;
        
        const marksForSession = await listMarks(session.id!);
        const markMap = new Map(marksForSession.map(m => [m.cadetId, m]));
        const cadetsForSession = cadets
          .filter(c => {
            const matchesYear = !session.year || (c.year || '') === session.year;
            const matchesDivision = !session.division || (c.division || '') === session.division;
            return matchesYear && matchesDivision;
          })
          .sort((a, b) => (a.registerNumber || '').localeCompare(b.registerNumber || ''));
        
        const tableData: string[][] = [['#', 'Name', 'Reg No', 'Platoon', 'Status']];
        cadetsForSession.forEach((c, idx) => {
          const m = markMap.get(c.id);
          const status = m?.status || 'A';
          const statusLabel = status === 'P' ? 'Present' : status === 'L' ? 'Late' : 'Absent';
          tableData.push([
            (idx + 1).toString(),
            c.name || '',
            c.registerNumber || '',
            c.platoon || '',
            statusLabel,
          ]);
        });
        
        // Create table
        const cellPadding = 2;
        const rowHeight = 6;
        const cellWidth = pageWidth / tableData[0].length;
        
        // Header row
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.setFillColor(40, 40, 40);
        tableData[0].forEach((cell, colIdx) => {
          pdf.rect(marginLeft + colIdx * cellWidth, yPosition, cellWidth, rowHeight, 'F');
          pdf.text(cell, marginLeft + colIdx * cellWidth + cellPadding, yPosition + rowHeight - 1, { maxWidth: cellWidth - 2 * cellPadding });
        });
        yPosition += rowHeight;
        
        // Data rows
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        tableData.slice(1).forEach((row) => {
          if (yPosition > pageHeight - 15) {
            pdf.addPage();
            yPosition = 20;
          }
          row.forEach((cell, colIdx) => {
            pdf.text(cell, marginLeft + colIdx * cellWidth + cellPadding, yPosition + rowHeight - 1, { maxWidth: cellWidth - 2 * cellPadding });
          });
          pdf.setDrawColor(200, 200, 200);
          pdf.line(marginLeft, yPosition + rowHeight, marginLeft + pageWidth, yPosition + rowHeight);
          yPosition += rowHeight;
        });
        
        yPosition += 4;
      }
      
      pdf.save(`${reportYearFilter}_${reportDivisionFilter}_attendance.pdf`);
      toast.success('PDF report exported');
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to export PDF report');
    } finally {
      setExportingPdf(false);
    }
  }

  async function exportYearExcel() {
    if (!reportYearFilter || !reportDivisionFilter) {
      toast.error('Select both year and division to export');
      return;
    }
    const yearDivisionSessions = sessions.filter(s => (s.year || '') === reportYearFilter && (s.division || '') === reportDivisionFilter);
    if (!yearDivisionSessions.length) {
      toast.error('No sessions found for the selected year and division');
      return;
    }
    try {
      setExportingExcel(true);
      const workbook = XLSX.utils.book_new();
      
      for (const session of yearDivisionSessions) {
        const marksForSession = await listMarks(session.id!);
        const markMap = new Map(marksForSession.map(m => [m.cadetId, m]));
        const cadetsForSession = cadets
          .filter(c => {
            const matchesYear = !session.year || (c.year || '') === session.year;
            const matchesDivision = !session.division || (c.division || '') === session.division;
            return matchesYear && matchesDivision;
          })
          .sort((a, b) => (a.registerNumber || '').localeCompare(b.registerNumber || ''));
        
        const tableData: any[] = [];
        
        cadetsForSession.forEach((c, idx) => {
          const m = markMap.get(c.id);
          const status = m?.status || 'A';
          const statusLabel = status === 'P' ? 'Present' : status === 'L' ? 'Late' : 'Absent';
          const timestamp = m?.timestamp ? new Date(m.timestamp).toLocaleString() : '-';
          tableData.push({
            '#': idx + 1,
            'Name': c.name || '',
            'Reg No': c.registerNumber || '',
            'Platoon': c.platoon || '',
            'Status': statusLabel,
            'Timestamp': timestamp,
          });
        });
        
        const worksheet = XLSX.utils.json_to_sheet(tableData);
        worksheet['!cols'] = [
          { wch: 5 },
          { wch: 20 },
          { wch: 12 },
          { wch: 12 },
          { wch: 12 },
          { wch: 20 },
        ];
        
        const sheetName = session.date.replace(/[/:*?"<>|]/g, '-');
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }
      
      XLSX.writeFile(workbook, `${reportYearFilter}_${reportDivisionFilter}_attendance.xlsx`);
      toast.success('Excel report exported');
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to export Excel report');
    } finally {
      setExportingExcel(false);
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
      <h2 className="mb-3">Attendance Management</h2>

      <Tabs id="attendance-tabs" activeKey={activeTab} onSelect={(k: string | null) => setActiveTab(k || 'generator')} className="mb-3">
        <Tab eventKey="generator" title="Generator">
          <Form onSubmit={onCreateSession} className="mt-3">
            <div className="mb-4 p-3 border rounded bg-light">
              <h6 className="mb-3">Step 1: Select Cadets</h6>
              <Row className="g-3">
                <Col xs={12} sm={6} md={4} lg={3} xl={3}>
                  <Form.Group controlId="year">
                    <Form.Label>Year</Form.Label>
                    <Form.Select value={gYear} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGYear(e.target.value)} required>
                      <option value="" disabled>Select year</option>
                      {BASE_YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6} md={4} lg={3} xl={3}>
                  <Form.Group controlId="division">
                    <Form.Label>Division</Form.Label>
                    <Form.Select value={gDivision} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGDivision(e.target.value)} required>
                      <option value="SD">SD</option>
                      <option value="SW">SW</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xs={12} sm={12} md={4} lg={6} xl={6} className="d-flex align-items-end">
                  <div className="text-muted">
                    <strong>Eligible Cadets: {
                      cadets.filter(c => {
                        const matchesYear = (c.year || '') === gYear;
                        const matchesDivision = (c.division || '') === gDivision;
                        return matchesYear && matchesDivision;
                      }).length
                    }</strong>
                  </div>
                </Col>
              </Row>
            </div>

            <div className="mb-4 p-3 border rounded bg-light">
              <h6 className="mb-3">Step 2: Session Details</h6>
              <Row className="g-3">
                <Col xs={12} sm={12} md={6} lg={4} xl={4}>
                  <Form.Group controlId="title">
                    <Form.Label>Title</Form.Label>
                    <Form.Control value={gTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGTitle(e.target.value)} placeholder="e.g., Parade" required />
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6} md={6} lg={3} xl={3}>
                  <Form.Group controlId="date">
                    <Form.Label>Date</Form.Label>
                    <Form.Control type="date" value={gDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGDate(e.target.value)} required />
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6} md={6} lg={3} xl={3}>
                  <Form.Group controlId="type">
                    <Form.Label>Type</Form.Label>
                    <Form.Select value={gType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGType(e.target.value)}>
                      {Object.entries(EVENT_TYPES).map(([k, v]) => (
                        <option key={k} value={v}>{k.toLowerCase()}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6} md={6} lg={2} xl={2}>
                  <Form.Group controlId="location">
                    <Form.Label>Location</Form.Label>
                    <Form.Control value={gLocation} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGLocation(e.target.value)} placeholder="Ground" />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            <div className="d-flex gap-2">
              <Button type="submit" disabled={creating} size="lg">
                {creating ? 'Creating…' : 'Create Session & Open Marker'}
              </Button>
            </div>
          </Form>

          <h5 className="mt-4">Recent Sessions</h5>
          <Table striped bordered hover size="sm" className="mt-2">
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Type</th>
                <th>Year</th>
                <th>Division</th>
                <th>Total Cadets</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id}>
                  <td>{s.date}</td>
                  <td>{s.title}</td>
                  <td>{s.type}</td>
                  <td>{s.year || 'N/A'}</td>
                  <td>{s.division || 'N/A'}</td>
                  <td>{s.totalCadets}</td>
                  <td>{s.locked ? <Badge bg="secondary">Locked</Badge> : <Badge bg="success">Open</Badge>}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button size="sm" variant="outline-primary" onClick={() => { setSelectedSessionId(s.id!); setActiveTab('marker'); }}>Open</Button>
                      <Button size="sm" variant="outline-danger" onClick={() => onDeleteSession(s.id!)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>

        <Tab eventKey="marker" title="Marker">
          <div className="mt-3">
            {!selectedSessionId ? (
              <div className="alert alert-info" role="alert">
                <strong>No session selected.</strong> Please create a session from the Generator tab to start marking attendance.
              </div>
            ) : selectedSession ? (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <strong>{selectedSession.title}</strong> — {selectedSession.date} {selectedSession.platoon ? `— ${selectedSession.platoon}` : ''} {selectedSession.year ? `— ${selectedSession.year}` : ''}
                  </div>
                  <div className="d-flex gap-2">
                    <Badge bg="success">P: {counts.P}</Badge>
                    <Badge bg="warning" text="dark">L: {counts.L}</Badge>
                    <Badge bg="danger">A: {counts.A}</Badge>
                  </div>
                </div>

                <div className="mb-3 p-3 border rounded bg-light">
                  <Row className="g-3 align-items-center">
                    <Col xs={12} sm={6} md={4}>
                      <Form.Check 
                        type="switch"
                        id="apply-late-switch"
                        label="Apply Late (Late marking mode)"
                        checked={applyLate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApplyLate(e.target.checked)}
                        disabled={selectedSession.locked}
                      />
                    </Col>
                    <Col xs={12} sm={6} md={4}>
                      <Button 
                        variant="success" 
                        size="sm" 
                        disabled={selectedSession.locked}
                        onClick={onMarkAllPresent}
                      >
                        Mark All {applyLate ? 'Present (Late)' : 'Present'}
                      </Button>
                    </Col>
                    <Col xs={12} sm={6} md={4} className="d-flex gap-2">
                      <Button variant="outline-secondary" size="sm" disabled={selectedSession.locked || locking} onClick={onLockSession}>
                        {locking ? 'Locking…' : 'Lock Session'}
                      </Button>
                    </Col>
                  </Row>
                </div>

                <Table striped bordered hover responsive size="sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Regimental No</th>
                      <th>Platoon</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cadets
                      .filter(c => {
                        const matchesYear = !selectedSession.year || (c.year || '') === selectedSession.year;
                        const matchesDivision = !selectedSession.division || (c.division || '') === selectedSession.division;
                        return matchesYear && matchesDivision;
                      })
                      .map((c, idx) => {
                        const mark = marks[c.id];
                        const status = mark?.status || 'A';
                        const isPresent = status === 'P' || status === 'L';
                        const isLate = status === 'L';
                        return (
                          <tr key={c.id}>
                            <td>{idx + 1}</td>
                            <td>{c.name}</td>
                            <td>{c.registerNumber}</td>
                            <td>{c.platoon}</td>
                            <td>
                              <Button 
                                variant={isPresent ? 'success' : 'danger'} 
                                size="sm"
                                disabled={selectedSession.locked}
                                onClick={() => onToggleMark(c.id)}
                              >
                                {isPresent ? (isLate ? 'Present (Late)' : 'Present') : 'Absent'}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </Table>
              </div>
            ) : null}
          </div>
        </Tab>

        <Tab eventKey="reporter" title="Reporter">
          <div className="mt-3">
            <Row className="g-3 align-items-end">
              <Col xs={12} sm={6} md={3} lg={3} xl={3}>
                <Form.Group controlId="reportYearFilter">
                  <Form.Label>Year Filter</Form.Label>
                  <Form.Select value={reportYearFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setReportYearFilter(e.target.value)}>
                    <option value="" disabled>Select year</option>
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} sm={6} md={3} lg={3} xl={3}>
                <Form.Group controlId="reportDivisionFilter">
                  <Form.Label>Division Filter</Form.Label>
                  <Form.Select value={reportDivisionFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setReportDivisionFilter(e.target.value)}>
                    <option value="SD">SD</option>
                    <option value="SW">SW</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} sm={6} md={3} lg={3} xl={3}>
                <Form.Group controlId="sessionSelect2">
                  <Form.Label>Select Session</Form.Label>
                  <Form.Select value={selectedSessionId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSessionId(e.target.value)}>
                    <option value="" disabled>Select a session</option>
                    {sessions
                      .filter(s => !reportYearFilter || (s.year || '') === reportYearFilter)
                      .map(s => <option key={s.id} value={s.id}>{s.date} — {s.title} {s.platoon ? `(${s.platoon})` : ''} {s.year ? `(${s.year})` : ''}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} sm={12} md={3} lg={3} xl={3} className="d-flex gap-2">
                <Button variant="success" size="sm" disabled={!reportYearFilter || exportingPdf} onClick={exportYearPdf} className="flex-grow-1">
                  {exportingPdf ? 'Exporting PDF…' : '📄 PDF'}
                </Button>
                <Button variant="primary" size="sm" disabled={!reportYearFilter || exportingExcel} onClick={exportYearExcel} className="flex-grow-1">
                  {exportingExcel ? 'Exporting Excel…' : '📊 Excel'}
                </Button>
              </Col>
            </Row>

            {selectedSession && (
              <div className="mt-3">
                <h5>{selectedSession.title} — {selectedSession.date} {selectedSession.platoon ? `— ${selectedSession.platoon}` : ''} {selectedSession.year ? `— ${selectedSession.year}` : ''}</h5>
                <p className="mb-1">Total Cadets: {selectedSession.totalCadets}</p>
                <div className="d-flex gap-2 mb-3">
                  <Badge bg="success">Present: {counts.P}</Badge>
                  <Badge bg="warning" text="dark">Late: {counts.L}</Badge>
                  <Badge bg="danger">Absent: {counts.A}</Badge>
                </div>
                <Table striped bordered hover responsive size="sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Reg No</th>
                      <th>Platoon</th>
                      <th>Status</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cadets
                      .filter(c => {
                        const matchesYear = !selectedSession.year || (c.year || '') === selectedSession.year;
                        const matchesDivision = !selectedSession.division || (c.division || '') === selectedSession.division;
                        return matchesYear && matchesDivision;
                      })
                      .map((c, idx) => {
                        const m = marks[c.id];
                        const status = m?.status || 'A';
                        let statusLabel: string = status;
                        if (status === 'P') statusLabel = 'Present';
                        else if (status === 'L') statusLabel = 'Late';
                        else if (status === 'A') statusLabel = 'Absent';
                        return (
                          <tr key={c.id}>
                            <td>{idx + 1}</td>
                            <td>{c.name}</td>
                            <td>{c.registerNumber}</td>
                            <td>{c.platoon}</td>
                            <td>{statusLabel}</td>
                            <td>{m?.timestamp ? new Date(m.timestamp).toLocaleString() : '-'}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        </Tab>
      </Tabs>
    </div>
  );
};

export default AttendanceManagement;
