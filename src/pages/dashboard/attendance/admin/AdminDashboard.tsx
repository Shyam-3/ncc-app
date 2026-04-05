import { useState, useMemo } from 'react';
import { Row, Col, Card, Table, Spinner, Alert } from 'react-bootstrap';
import { AttendanceTrendChart, AttendanceBarChart, AttendancePieChart } from '@/components/charts';
import { chartColors } from '@/components/charts/ChartConfig';
import { BatchSelector } from './BatchSelector';
import {
  DIVISIONS,
  ATTENDANCE_THRESHOLDS,
  normalizeNccYear,
} from '@/shared/config/constants';
import type { Division, NccYear } from '@/shared/config/constants';
import type { AttendanceSession } from '@/features/attendance/model/attendance.types';
import type { Cadet } from '@/shared/types';
import { format, subMonths } from 'date-fns';

interface CadetAttendanceRate {
  cadet: Cadet & { id: string };
  rate: number;
  present: number;
  total: number;
}

interface AdminDashboardProps {
  sessions: (AttendanceSession & { id: string })[];
  cadets: (Cadet & { id: string })[];
  loading?: boolean;
}

export function AdminDashboard({ sessions, cadets, loading = false }: AdminDashboardProps) {
  const [divisionFilter, setDivisionFilter] = useState<Division | ''>('');
  const [yearFilter, setYearFilter] = useState<NccYear | ''>('');

  const filteredSessions = useMemo(
    () =>
      sessions.filter((s) => {
        const matchesDivision = !divisionFilter || s.divisionId === divisionFilter;
        const matchesYear = !yearFilter || s.nccYear === yearFilter;
        return matchesDivision && matchesYear;
      }),
    [sessions, divisionFilter, yearFilter]
  );

  const filteredLockedSessions = useMemo(
    () => filteredSessions.filter((s) => s.status === 'locked'),
    [filteredSessions]
  );

  const filteredCadets = useMemo(
    () =>
      cadets.filter((c) => {
        const normalizedCadetYear = normalizeNccYear(c.nccYear);
        const hasValidNccYear = normalizedCadetYear !== '';
        const matchesDivision = !divisionFilter || c.division === divisionFilter;
        const matchesYear = !yearFilter || normalizedCadetYear === yearFilter;
        return hasValidNccYear && matchesDivision && matchesYear;
      }),
    [cadets, divisionFilter, yearFilter]
  );

  // Summary stats
  const summaryStats = useMemo(() => {
    let totalPresent = 0,
      totalMarks = 0;
    filteredLockedSessions.forEach((s) => {
      if (s.stats) {
        totalPresent += s.stats.present;
        totalMarks += s.stats.total;
      }
    });

    const avgRate = totalMarks > 0 ? (totalPresent / totalMarks) * 100 : 0;

    return {
      totalSessions: filteredLockedSessions.length,
      avgAttendanceRate: Math.round(avgRate * 10) / 10,
      totalCadets: filteredCadets.length,
    };
  }, [filteredLockedSessions, filteredCadets]);

  // Monthly trend data (last 6 months)
  const trendData = useMemo(() => {
    const months: { label: string; value: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthKey = format(monthDate, 'yyyy-MM');
      const monthLabel = format(monthDate, 'MMM yyyy');

      const monthSessions = filteredLockedSessions.filter(
        (s) => s.date.startsWith(monthKey)
      );

      let present = 0,
        total = 0;
      monthSessions.forEach((s) => {
        if (s.stats) {
          present += s.stats.present;
          total += s.stats.total;
        }
      });

      months.push({
        label: monthLabel,
        value: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
      });
    }

    return months;
  }, [filteredLockedSessions]);

  // Division comparison data
  const divisionData = useMemo(() => {
    return DIVISIONS.map((div) => {
      const divSessions = filteredLockedSessions.filter((s) => s.divisionId === div);
      let present = 0,
        total = 0;
      divSessions.forEach((s) => {
        if (s.stats) {
          present += s.stats.present;
          total += s.stats.total;
        }
      });
      return {
        label: div,
        value: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
        color: chartColors[div as keyof typeof chartColors],
      };
    });
  }, [filteredLockedSessions]);

  // Session title keyword distribution
  const titleDistribution = useMemo(() => {
    const titleCounts: Record<string, number> = {};
    filteredLockedSessions.forEach((s) => {
      const keyword = s.title.trim().split(/\s+/)[0] || 'Session';
      titleCounts[keyword] = (titleCounts[keyword] || 0) + 1;
    });
    return Object.entries(titleCounts).map(([label, value]) => ({
      label,
      value,
    }));
  }, [filteredLockedSessions]);

  // Low attendance cadets (placeholder - would need full marks data for accuracy)
  const lowAttendanceCadets = useMemo<CadetAttendanceRate[]>(() => {
    // This is a simplified version - in production, use cadetAttendanceStats collection
    return [];
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <BatchSelector
            divisionId={divisionFilter}
            nccYear={yearFilter}
            onDivisionChange={setDivisionFilter}
            onYearChange={setYearFilter}
          />
        </Card.Body>
      </Card>

      {/* Summary Cards */}

      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="h-100 text-center">
            <Card.Body>
              <h3 className="text-primary mb-1">{summaryStats.totalSessions}</h3>
              <small className="text-muted">Total Sessions</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 text-center">
            <Card.Body>
              <h3
                className={`mb-1 ${
                  summaryStats.avgAttendanceRate >= ATTENDANCE_THRESHOLDS.GOOD
                    ? 'text-success'
                    : summaryStats.avgAttendanceRate >= ATTENDANCE_THRESHOLDS.LOW
                    ? 'text-warning'
                    : 'text-danger'
                }`}
              >
                {summaryStats.avgAttendanceRate}%
              </h3>
              <small className="text-muted">Avg Attendance</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 text-center">
            <Card.Body>
              <h3 className="text-secondary mb-1">{summaryStats.totalCadets}</h3>
              <small className="text-muted">Total Cadets</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row className="g-3 mb-4">
        <Col lg={8}>
          <Card className="h-100">
            <Card.Body>
              {filteredLockedSessions.length === 0 ? (
                <Alert variant="light" className="mb-0 text-center">
                  No locked sessions available to plot trend data for the selected filters.
                </Alert>
              ) : (
                <AttendanceTrendChart
                  data={trendData}
                  title="Attendance Trend (Last 6 Months)"
                  height={300}
                />
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="h-100">
            <Card.Body>
              {filteredLockedSessions.length === 0 ? (
                <Alert variant="light" className="mb-0 text-center">
                  No locked sessions available to show session title distribution.
                </Alert>
              ) : (
                <AttendancePieChart
                  data={titleDistribution}
                  title="Sessions by Title"
                  height={300}
                />
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Division Comparison */}
      <Row className="g-3 mb-4">
        <Col lg={6}>
          <Card className="h-100">
            <Card.Body>
              {filteredLockedSessions.length === 0 ? (
                <Alert variant="light" className="mb-0 text-center">
                  No locked sessions available to compare division attendance.
                </Alert>
              ) : (
                <AttendanceBarChart
                  data={divisionData}
                  title="Attendance by Division"
                  height={250}
                />
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header>
              <h6 className="mb-0">
                <i className="bi bi-exclamation-triangle text-warning me-2"></i>
                Low Attendance Alerts
              </h6>
            </Card.Header>
            <Card.Body style={{ maxHeight: 300, overflowY: 'auto' }}>
              {lowAttendanceCadets.length === 0 ? (
                <p className="text-muted text-center py-4">
                  No cadets below {ATTENDANCE_THRESHOLDS.LOW}% attendance threshold
                </p>
              ) : (
                <Table size="sm" hover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Division</th>
                      <th>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowAttendanceCadets.map((item) => (
                      <tr key={item.cadet.id}>
                        <td>{item.cadet.name}</td>
                        <td>{item.cadet.division || '-'}</td>
                        <td>
                          <Badge bg="danger">{item.rate}%</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Sessions */}
      <Card>
        <Card.Header>
          <h6 className="mb-0">Recent Locked Sessions</h6>
        </Card.Header>
        <Card.Body>
          {filteredLockedSessions.length === 0 ? (
            <Alert variant="light" className="mb-0 text-center">
              No locked sessions found for the selected filters.
            </Alert>
          ) : (
            <Table responsive hover>
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Division</th>
                <th>Year</th>
                <th>Present</th>
              </tr>
            </thead>
            <tbody>
              {filteredLockedSessions.slice(0, 10).map((session) => (
                <tr key={session.id}>
                  <td>{session.date}</td>
                  <td>{session.title}</td>
                  <td>{session.divisionId}</td>
                  <td>{session.nccYear}</td>
                  <td>
                    {session.stats &&
                      `${session.stats.present}/${session.stats.total}`}
                  </td>
                </tr>
              ))}
            </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
