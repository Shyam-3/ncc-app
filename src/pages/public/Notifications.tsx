import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Card,
  Container,
  Modal,
  Spinner,
  Table,
} from 'react-bootstrap';
import { useAuth } from '@/features/auth/AuthContext';
import {
  getReadAnalytics,
  getReadCount,
  getUserReadIds,
  listAnnouncementsForUser,
  listPublicAnnouncements,
  markAsRead,
} from '@/features/announcements/service';
import type { Announcement, ReadAnalyticsGroup } from '@/features/announcements/announcement.types';
import type { AnnouncementCategory } from '@/shared/config/constants';
import {
  ANNOUNCEMENT_CATEGORY_COLORS,
  ANNOUNCEMENT_CATEGORY_LABELS,
} from '@/shared/config/constants';
import { formatISTDateTime } from '@/shared/utils/dateTime';

// ─── Category filter config ──────────────────────────────────────────────────
const CATEGORY_FILTERS: { value: AnnouncementCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'celebrations', label: '🎉 Celebrations' },
  { value: 'camps', label: '⛺ Camps' },
  { value: 'activities', label: '🌳 Activities' },
  { value: 'parades', label: '🎖️ Parades' },
];

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  filterPill: (active: boolean): React.CSSProperties => ({
    display: 'inline-block',
    padding: '6px 16px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
    fontSize: '0.875rem',
    border: active ? '2px solid #0d6efd' : '1px solid #dee2e6',
    backgroundColor: active ? '#e7f1ff' : '#fff',
    color: active ? '#0d6efd' : '#495057',
    transition: 'all 0.2s ease',
    userSelect: 'none' as const,
  }),
  unreadCard: {
    borderLeft: '4px solid #0d6efd',
    backgroundColor: '#f8faff',
  } as React.CSSProperties,
  readCard: {
    borderLeft: '4px solid transparent',
  } as React.CSSProperties,
  analyticsLink: {
    cursor: 'pointer',
    color: '#6c757d',
    fontSize: '0.8rem',
    textDecoration: 'underline',
  } as React.CSSProperties,
};

const NotificationsPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const isAuthenticated = Boolean(currentUser);
  const isAdminUser =
    userProfile?.role === 'admin' || userProfile?.role === 'superadmin';

  // ─── State ────────────────────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [readCounts, setReadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<
    AnnouncementCategory | 'all'
  >('all');

  // Expand / collapse tracking for auto-mark-as-read
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Analytics modal
  const [analyticsModal, setAnalyticsModal] = useState<{
    show: boolean;
    title: string;
    groups: ReadAnalyticsGroup[];
    loading: boolean;
  }>({ show: false, title: '', groups: [], loading: false });

  // ─── Data fetching ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        if (isAuthenticated && currentUser) {
          const [items, userReadIds] = await Promise.all([
            listAnnouncementsForUser(),
            getUserReadIds(currentUser.uid),
          ]);
          if (cancelled) return;
          setAnnouncements(items);
          setReadIds(userReadIds);

          // Fetch read counts in background ONLY for admins/superadmins
          if (userProfile?.role === 'admin' || userProfile?.role === 'superadmin') {
            const counts: Record<string, number> = {};
            await Promise.all(
              items.map(async (a) => {
                if (a.id) {
                  counts[a.id] = await getReadCount(a.id);
                }
              }),
            );
            if (!cancelled) setReadCounts(counts);
          }
        } else {
          const items = await listPublicAnnouncements();
          if (cancelled) return;
          setAnnouncements(items);
        }
      } catch (e) {
        console.error('Failed to load announcements:', e);
        if (!cancelled) setError('Failed to load announcements');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, currentUser]);

  // ─── Expand & mark as read ────────────────────────────────────────────────
  const handleExpand = useCallback(
    async (announcementId: string) => {
      if (expandedId === announcementId) {
        setExpandedId(null);
        return;
      }
      setExpandedId(announcementId);

      // Mark as read if authenticated and not yet read
      if (isAuthenticated && currentUser && userProfile && !readIds.has(announcementId)) {
        try {
          await markAsRead(announcementId, {
            uid: currentUser.uid,
            name: userProfile.name,
            nccYear: (userProfile as any).nccYear || '',
            role: userProfile.role,
          });
          setReadIds((prev) => new Set(prev).add(announcementId));
          // Increment read count locally
          setReadCounts((prev) => ({
            ...prev,
            [announcementId]: (prev[announcementId] || 0) + 1,
          }));
        } catch (e) {
          console.error('Failed to mark as read:', e);
        }
      }
    },
    [expandedId, isAuthenticated, currentUser, userProfile, readIds],
  );

  // ─── View readers (admin) ────────────────────────────────────────────────
  const handleViewReaders = async (announcementId: string, title: string) => {
    setAnalyticsModal({ show: true, title, groups: [], loading: true });
    try {
      const groups = await getReadAnalytics(announcementId);
      setAnalyticsModal({ show: true, title, groups, loading: false });
    } catch (e) {
      console.error('Failed to load analytics:', e);
      setAnalyticsModal({ show: true, title, groups: [], loading: false });
    }
  };

  // ─── Filtering ────────────────────────────────────────────────────────────
  const filtered =
    categoryFilter === 'all'
      ? announcements
      : announcements.filter((a) => a.category === categoryFilter);

  const unreadCount = isAuthenticated
    ? announcements.filter((a) => a.id && !readIds.has(a.id)).length
    : 0;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Container className="py-5">
      {/* Header */}
      <div className="mb-4">
        <h1 className="mb-1">
          {isAuthenticated ? (
            <>
              <i className="bi bi-bell-fill me-2 text-warning"></i>
              Notifications
            </>
          ) : (
            <>
              <i className="bi bi-calendar-event me-2 text-primary"></i>
              Upcoming & Ongoing Events
            </>
          )}
        </h1>
        {isAuthenticated && !loading && (
          <p className="text-muted mb-0">
            {unreadCount > 0 ? (
              <>
                <Badge bg="primary" className="me-1">
                  {unreadCount}
                </Badge>
                unread notification{unreadCount !== 1 ? 's' : ''}
              </>
            ) : (
              'All caught up!'
            )}
          </p>
        )}
      </div>

      {/* Category filter pills */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        {CATEGORY_FILTERS.map((f) => (
          <span
            key={f.value}
            style={styles.filterPill(categoryFilter === f.value)}
            onClick={() => setCategoryFilter(f.value)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setCategoryFilter(f.value)}
          >
            {f.label}
          </span>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-5">
          <Spinner as="span" animation="border" variant="primary"  size="sm" />
          <p className="text-muted mt-2">Loading announcements…</p>
        </div>
      )}

      {/* Error */}
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Announcement cards */}
      {!loading && !error && (
        <div className="d-grid gap-3">
          {filtered.length === 0 && (
            <Alert variant="info">
              {categoryFilter === 'all'
                ? 'No announcements yet.'
                : `No announcements in this category.`}
            </Alert>
          )}

          {filtered.map((announcement) => {
            const id = announcement.id || '';
            const isRead = readIds.has(id);
            const isExpanded = expandedId === id;
            const categoryColor =
              ANNOUNCEMENT_CATEGORY_COLORS[announcement.category] || 'secondary';
            const categoryLabel =
              ANNOUNCEMENT_CATEGORY_LABELS[announcement.category] ||
              announcement.category;

            return (
              <Card
                key={id}
                className="shadow-sm"
                style={
                  isAuthenticated
                    ? isRead
                      ? styles.readCard
                      : styles.unreadCard
                    : undefined
                }
              >
                <Card.Body
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleExpand(id)}
                >
                  {/* Top row: category badge + pinned */}
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <Badge bg={categoryColor}>{categoryLabel}</Badge>
                      {announcement.isPinned && (
                        <Badge bg="dark">
                          <i className="bi bi-pin-angle-fill me-1"></i>Pinned
                        </Badge>
                      )}
                      {isAuthenticated && !isRead && (
                        <Badge bg="primary" pill>
                          New
                        </Badge>
                      )}
                    </div>
                    <i
                      className={`bi bi-chevron-${isExpanded ? 'up' : 'down'} text-muted`}
                    ></i>
                  </div>

                  {/* Title */}
                  <h5
                    className="mb-1"
                    style={{
                      fontWeight: isAuthenticated && !isRead ? 700 : 400,
                    }}
                  >
                    {announcement.title}
                  </h5>

                  {/* Meta row */}
                  <div className="text-muted small d-flex flex-wrap gap-3">
                    {announcement.createdByName && (
                      <span>
                        <i className="bi bi-person-fill me-1"></i>
                        {announcement.createdByName}
                      </span>
                    )}
                    <span>
                      <i className="bi bi-clock me-1"></i>
                      {announcement.createdAt?.toDate
                        ? formatISTDateTime(announcement.createdAt.toDate())
                        : ''}
                    </span>
                    {isAuthenticated && isAdminUser && readCounts[id] !== undefined && (
                      <span>
                        <i className="bi bi-eye me-1"></i>
                        {readCounts[id]} read
                      </span>
                    )}
                  </div>

                  {/* Expanded body */}
                  {isExpanded && (
                    <div className="mt-3">
                      <p style={{ whiteSpace: 'pre-wrap' }}>
                        {announcement.body}
                      </p>

                      {/* Admin: View Readers */}
                      {isAuthenticated && isAdminUser && (
                        <span
                          style={styles.analyticsLink}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewReaders(id, announcement.title);
                          }}
                        >
                          <i className="bi bi-bar-chart-line me-1"></i>
                          View Readers
                        </span>
                      )}
                    </div>
                  )}
                </Card.Body>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Analytics Modal (Admin) ──────────────────────────────────────── */}
      <Modal
        show={analyticsModal.show}
        onHide={() =>
          setAnalyticsModal({ show: false, title: '', groups: [], loading: false })
        }
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-bar-chart-line me-2"></i>
            Read Analytics
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small mb-3">
            Readers for: <strong>{analyticsModal.title}</strong>
          </p>

          {analyticsModal.loading ? (
            <div className="text-center py-4">
              <Spinner as="span" animation="border" size="sm"  />
              <span className="ms-2">Loading analytics…</span>
            </div>
          ) : analyticsModal.groups.length === 0 ? (
            <Alert variant="info">No readers yet.</Alert>
          ) : (
            analyticsModal.groups.map((group) => (
              <div key={group.label} className="mb-4">
                <h6>
                  {group.label}{' '}
                  <Badge bg="secondary" className="ms-1">
                    {group.readers.length}
                  </Badge>
                </h6>
                <Table size="sm" bordered hover responsive>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Read At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.readers.map((reader, idx) => (
                      <tr key={reader.userId}>
                        <td>{idx + 1}</td>
                        <td>{reader.userName}</td>
                        <td>
                          {reader.readAt?.toDate
                            ? formatISTDateTime(reader.readAt.toDate())
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ))
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default NotificationsPage;
