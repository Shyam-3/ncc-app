import { Row, Col, Card, ProgressBar } from 'react-bootstrap';
import type { CadetAttendanceStats } from '@/features/attendance/model/attendance.types';
import { ATTENDANCE_THRESHOLDS } from '@/shared/config/constants';

interface StatsOverviewProps {
  stats: CadetAttendanceStats | null;
  batchAverage?: number;
}

export function StatsOverview({ stats, batchAverage }: StatsOverviewProps) {
  if (!stats) {
    return (
      <Card className="mb-4">
        <Card.Body className="text-center text-muted py-5">
          No attendance data available yet
        </Card.Body>
      </Card>
    );
  }

  const rateVariant =
    stats.attendanceRate >= ATTENDANCE_THRESHOLDS.EXCELLENT
      ? 'success'
      : stats.attendanceRate >= ATTENDANCE_THRESHOLDS.GOOD
      ? 'info'
      : stats.attendanceRate >= ATTENDANCE_THRESHOLDS.LOW
      ? 'warning'
      : 'danger';

  return (
    <div className="stats-overview">
      {/* Summary Cards */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={4}>
          <Card className="h-100 text-center border-0 shadow-sm">
            <Card.Body>
              <h2 className="text-primary mb-1">{stats.totalSessions}</h2>
              <small className="text-muted">Total Sessions</small>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={4}>
          <Card className="h-100 text-center border-0 shadow-sm">
            <Card.Body>
              <h2 className="text-success mb-1">{stats.present}</h2>
              <small className="text-muted">Present</small>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={4}>
          <Card className="h-100 text-center border-0 shadow-sm">
            <Card.Body>
              <h2 className="text-danger mb-1">{stats.absent}</h2>
              <small className="text-muted">Absent</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Attendance Rate Card */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">Attendance Rate</h6>
            <span className={`fs-4 fw-bold text-${rateVariant}`}>
              {stats.attendanceRate}%
            </span>
          </div>
          <ProgressBar
            now={stats.attendanceRate}
            variant={rateVariant}
            style={{ height: 10 }}
          />
          {batchAverage !== undefined && (
            <div className="mt-2 small text-muted">
              <i className="bi bi-people me-1"></i>
              Batch Average: {batchAverage}%
              {stats.attendanceRate > batchAverage ? (
                <span className="text-success ms-2">
                  <i className="bi bi-arrow-up"></i>{' '}
                  {(stats.attendanceRate - batchAverage).toFixed(1)}% above
                </span>
              ) : stats.attendanceRate < batchAverage ? (
                <span className="text-danger ms-2">
                  <i className="bi bi-arrow-down"></i>{' '}
                  {(batchAverage - stats.attendanceRate).toFixed(1)}% below
                </span>
              ) : (
                <span className="text-muted ms-2">At average</span>
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Additional Stats */}
      <Row className="g-3">
        <Col md={12}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <h6 className="text-muted mb-3">Attendance Breakdown</h6>
              <div className="small">
                <div className="d-flex justify-content-between mb-1">
                  <span>Present</span>
                  <span className="text-success fw-semibold">{stats.present}</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span>Absent</span>
                  <span className="text-danger fw-semibold">{stats.absent}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Total Sessions</span>
                  <span className="text-primary fw-semibold">{stats.totalSessions}</span>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
