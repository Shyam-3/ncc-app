import { useState, useMemo } from 'react';
import { Card, Button, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
} from 'date-fns';
import type { AttendanceStatus } from '@/features/attendance/model/attendance.types';
import { ATTENDANCE_STATUS_COLORS, ATTENDANCE_STATUS_LABELS } from '@/features/attendance/model/attendance.types';
import './AttendanceCalendar.css';

interface CalendarEntry {
  date: string;
  sessionId: string;
  title: string;
  status: AttendanceStatus | null;
}

interface AttendanceCalendarProps {
  entries: CalendarEntry[];
  onDateClick?: (date: string, entry?: CalendarEntry) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AttendanceCalendar({ entries, onDateClick }: AttendanceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Build entries map for quick lookup
  const entriesMap = useMemo(() => {
    const map = new Map<string, CalendarEntry>();
    entries.forEach((e) => map.set(e.date, e));
    return map;
  }, [entries]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Add padding days at the beginning
    const startPadding = getDay(start);
    const paddingDays: (Date | null)[] = Array(startPadding).fill(null);

    return [...paddingDays, ...days];
  }, [currentMonth]);

  // Navigate months
  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <Card className="attendance-calendar border-0 shadow-sm">
      <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center">
        <Button variant="link" className="p-0" onClick={goToPrevMonth}>
          <i className="bi bi-chevron-left"></i>
        </Button>
        <div className="text-center">
          <h5 className="mb-0">{format(currentMonth, 'MMMM yyyy')}</h5>
          <Button
            variant="link"
            size="sm"
            className="p-0 text-muted"
            onClick={goToToday}
          >
            Today
          </Button>
        </div>
        <Button variant="link" className="p-0" onClick={goToNextMonth}>
          <i className="bi bi-chevron-right"></i>
        </Button>
      </Card.Header>
      <Card.Body className="p-2">
        {/* Weekday headers */}
        <div className="calendar-grid calendar-header">
          {WEEKDAYS.map((day) => (
            <div key={day} className="calendar-cell text-muted small fw-semibold">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="calendar-grid">
          {calendarDays.map((day, index) => {
            if (!day) {
              return <div key={`pad-${index}`} className="calendar-cell empty" />;
            }

            const dateStr = format(day, 'yyyy-MM-dd');
            const entry = entriesMap.get(dateStr);
            const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

            return (
              <OverlayTrigger
                key={dateStr}
                placement="top"
                overlay={
                  entry ? (
                    <Tooltip>
                      {entry.title}: {entry.status ? ATTENDANCE_STATUS_LABELS[entry.status] : 'Unmarked'}
                    </Tooltip>
                  ) : (
                    <></>
                  )
                }
              >
                <div
                  className={`calendar-cell day ${isToday ? 'today' : ''} ${
                    entry ? 'has-session' : ''
                  }`}
                  onClick={() => onDateClick?.(dateStr, entry)}
                >
                  <span className="day-number">{format(day, 'd')}</span>
                  {entry && (
                    <Badge
                      bg={
                        entry.status
                          ? ATTENDANCE_STATUS_COLORS[entry.status]
                          : 'secondary'
                      }
                      className="day-badge"
                    >
                      {entry.status || '?'}
                    </Badge>
                  )}
                </div>
              </OverlayTrigger>
            );
          })}
        </div>

        {/* Legend */}
        <div className="calendar-legend mt-3 pt-3 border-top d-flex flex-wrap gap-3 justify-content-center small">
          <span>
            <Badge bg="success">P</Badge> Present
          </span>
          <span>
            <Badge bg="danger">A</Badge> Absent
          </span>
        </div>
      </Card.Body>
    </Card>
  );
}
