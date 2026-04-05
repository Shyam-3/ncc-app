import { useMemo } from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import { AttendanceTrendChart, AttendanceBarChart } from '@/components/charts';
import type { CadetAttendanceStats } from '@/features/attendance/model/attendance.types';
import { format, subMonths } from 'date-fns';

interface PerformanceGraphsProps {
  stats: CadetAttendanceStats | null;
  batchTrend?: { label: string; value: number }[];
}

export function PerformanceGraphs({ stats, batchTrend }: PerformanceGraphsProps) {
  // Generate monthly trend data
  const trendData = useMemo(() => {
    if (!stats?.monthly) return [];

    const now = new Date();
    const months: { label: string; value: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthKey = format(monthDate, 'yyyy-MM');
      const monthLabel = format(monthDate, 'MMM');

      const monthData = stats.monthly[monthKey];
      if (monthData && monthData.total > 0) {
        const rate = (monthData.present / monthData.total) * 100;
        months.push({ label: monthLabel, value: Math.round(rate * 10) / 10 });
      } else {
        months.push({ label: monthLabel, value: 0 });
      }
    }

    return months;
  }, [stats]);

  // Monthly breakdown for stacked bar
  const monthlyBreakdown = useMemo(() => {
    if (!stats?.monthly) return [];

    const now = new Date();
    const months: { label: string; present: number; absent: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthKey = format(monthDate, 'yyyy-MM');
      const monthLabel = format(monthDate, 'MMM');

      const monthData = stats.monthly[monthKey];
      if (monthData) {
        months.push({
          label: monthLabel,
          present: monthData.present,
          absent: monthData.absent,
        });
      } else {
        months.push({ label: monthLabel, present: 0, absent: 0 });
      }
    }

    return months;
  }, [stats]);

  if (!stats) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center text-muted py-5">
          No attendance data available for charts
        </Card.Body>
      </Card>
    );
  }

  return (
    <Row className="g-3">
      {/* Attendance Rate Trend */}
      <Col lg={12}>
        <Card className="border-0 shadow-sm">
          <Card.Body>
            <AttendanceTrendChart
              data={trendData}
              comparisonData={batchTrend}
              title="Your Attendance Trend (Last 6 Months)"
              height={280}
            />
          </Card.Body>
        </Card>
      </Col>

      {/* Monthly Breakdown */}
      <Col lg={12}>
        <Card className="border-0 shadow-sm">
          <Card.Body>
            <AttendanceBarChart
              data={monthlyBreakdown}
              title="Monthly Breakdown"
              height={250}
              stacked
            />
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
