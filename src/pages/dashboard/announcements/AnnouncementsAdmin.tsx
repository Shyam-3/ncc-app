import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '@/features/auth/AuthContext';
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  getReadCount,
  getReadAnalytics,
} from '@/features/announcements/service';
import type {
  Announcement,
  AnnouncementCategory,
  AnnouncementVisibility,
  ReadAnalyticsGroup,
} from '@/features/announcements/announcement.types';
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_CATEGORY_LABELS,
  ANNOUNCEMENT_CATEGORY_COLORS,
  ANNOUNCEMENT_VISIBILITY,
  ANNOUNCEMENT_VISIBILITY_LABELS,
} from '@/shared/config/constants';
import { formatISTDateTime } from '@/shared/utils/dateTime';

import './AnnouncementsAdmin.css';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const ALL_CATEGORIES = Object.values(ANNOUNCEMENT_CATEGORIES) as AnnouncementCategory[];
const ALL_VISIBILITIES = Object.values(ANNOUNCEMENT_VISIBILITY) as AnnouncementVisibility[];

/** Return a datetime-local string for the current moment (used as min for picker). */
function nowLocalDatetime(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** Max expiry = 1 year from now. */
function maxExpiryDatetime(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function isExpired(a: Announcement): boolean {
  if (!a.expiresAt) return false;
  return new Date(a.expiresAt) < new Date();
}

function truncate(text: string, max = 100): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

// ─── Component ──────────────────────────────────────────────────────────────────

const AnnouncementsAdmin: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  // ── Announcement list state ──
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [readCounts, setReadCounts] = useState<Record<string, number>>({});
  const [categoryFilter, setCategoryFilter] = useState<AnnouncementCategory | 'all'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<AnnouncementVisibility | 'all'>('all');

  // ── Read analytics expansion ──
  const [expandedReadId, setExpandedReadId] = useState<string | null>(null);
  const [readAnalytics, setReadAnalytics] = useState<ReadAnalyticsGroup[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // ── Form state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('activities');
  const [visibility, setVisibility] = useState<AnnouncementVisibility>('public');
  const [isPinned, setIsPinned] = useState(false);
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [theme, setTheme] = useState<'tricolor' | 'ncc'>('tricolor');
  const [submitting, setSubmitting] = useState(false);

  // ── Modal state ──
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);

  // Recruitment, IDC, RDC force expiration on
  const isStrictExpiry = ['recruitment', 'celebrations'].includes(category);

  // ── Data loading ──

  const loadAnnouncements = useCallback(async () => {
    try {
      const data = await listAnnouncements({ includeExpired: true });
      
      // Auto-cleanup: Delete expired announcements from Firestore
      const now = new Date();
      const activeData: Announcement[] = [];
      const deletePromises: Promise<void>[] = [];

      for (const a of data) {
        if (a.expiresAt && new Date(a.expiresAt) < now && a.id) {
          deletePromises.push(deleteAnnouncement(a.id).catch(console.error));
        } else {
          activeData.push(a);
        }
      }
      
      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
        toast.success(`Auto-deleted ${deletePromises.length} expired announcement(s)`);
      }

      setItems(activeData);
      // Fetch read counts in parallel
      const counts: Record<string, number> = {};
      await Promise.all(
        activeData.map(async (a) => {
          if (a.id) {
            counts[a.id] = await getReadCount(a.id);
          }
        }),
      );
      setReadCounts(counts);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  // ── Filtered list ──

  const filteredItems = useMemo(() => {
    let result = items;
    if (categoryFilter !== 'all') {
      result = result.filter((a) => a.category === categoryFilter);
    }
    if (visibilityFilter !== 'all') {
      result = result.filter((a) => a.visibility === visibilityFilter);
    }
    return result;
  }, [items, categoryFilter, visibilityFilter]);

  // ── Form helpers ──

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setBody('');
    setCategory('activities');
    setVisibility('public');
    setIsPinned(false);
    setHasExpiration(false);
    setExpiresAt('');
    setTheme('tricolor');
    setShowFormModal(false);
  };

  const loadIntoForm = (a: Announcement) => {
    setEditingId(a.id ?? null);
    setTitle(a.title);
    setBody(a.body);
    setCategory(a.category);
    setVisibility(a.visibility);
    setIsPinned(a.isPinned ?? false);
    setTheme(a.theme ?? 'tricolor');
    if (a.expiresAt) {
      setHasExpiration(true);
      // Convert ISO to datetime-local value
      const d = new Date(a.expiresAt);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setExpiresAt(d.toISOString().slice(0, 16));
    } else {
      setHasExpiration(false);
      setExpiresAt('');
    }
    setShowFormModal(true);
  };

  const isFormValid = (): boolean => {
    if (!title.trim() || !body.trim()) return false;
    if (isStrictExpiry && !expiresAt) return false;
    if (hasExpiration && !expiresAt) return false;
    if (hasExpiration && expiresAt) {
      const exp = new Date(expiresAt);
      if (exp <= new Date()) return false;
    }
    return true;
  };

  // ── Submit (create / update) ──

  const handleSubmit = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);

    let finalExpiresAt: string;
    if ((isStrictExpiry || hasExpiration) && expiresAt) {
      finalExpiresAt = new Date(expiresAt).toISOString();
    } else {
      // Auto-set to 1 year from now
      const expDate = new Date();
      expDate.setFullYear(expDate.getFullYear() + 1);
      finalExpiresAt = expDate.toISOString();
    }

    const payload: Omit<Announcement, 'id' | 'createdAt'> = {
      title: title.trim(),
      body: body.trim(),
      category,
      visibility,
      isPinned,
      ...(category === 'celebrations' ? { theme } : {}),
      createdBy: userProfile?.uid ?? '',
      createdByName: userProfile?.name ?? 'Admin',
      expiresAt: finalExpiresAt,
    };

    try {
      if (editingId) {
        // For update, strip createdBy/createdByName to avoid overwriting original
        const { createdBy: _cb, createdByName: _cbn, ...updatePayload } = payload;
        await updateAnnouncement(editingId, updatePayload);
        toast.success('Announcement updated');
      } else {
        await createAnnouncement(payload);
        toast.success('Announcement created');
      }
      resetForm();
      setLoading(true);
      await loadAnnouncements();
    } catch (err) {
      console.error(err);
      toast.error(editingId ? 'Failed to update announcement' : 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ──

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await deleteAnnouncement(deletingId);
      toast.success('Announcement deleted');
      if (editingId === deletingId) resetForm();
      setLoading(true);
      await loadAnnouncements();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete announcement');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setDeletingId(null);
    }
  };

  // ── Read analytics toggle ──

  const toggleReadAnalytics = async (announcementId: string) => {
    if (expandedReadId === announcementId) {
      setExpandedReadId(null);
      setReadAnalytics([]);
      return;
    }
    setExpandedReadId(announcementId);
    setAnalyticsLoading(true);
    try {
      const data = await getReadAnalytics(announcementId);
      setReadAnalytics(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load read analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // ── Render ──

  return (
    <Container className="py-5 announcements-admin">
      <Card className="shadow">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <h3 className="mb-0">
            <i className="bi bi-megaphone-fill me-2" />
            Manage Announcements
          </h3>
          <div>
            <Button variant="light" size="sm" className="me-2" onClick={() => setShowFormModal(true)}>
              <i className="bi bi-plus-lg me-1"></i> Add New
            </Button>
            <Button variant="light" size="sm" onClick={() => navigate('/dashboard')}>
              <i className="bi bi-arrow-left me-1"></i> Back
            </Button>
          </div>
        </Card.Header>
        <Card.Body>

      {/* ───── Form Modal ───── */}
      <Modal show={showFormModal} onHide={resetForm} size="lg" centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? 'Edit Announcement' : 'Create Announcement'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            onSubmit={(e: React.FormEvent) => {
              e.preventDefault();
              if (isFormValid()) setShowConfirmModal(true);
            }}
          >
            {/* Title */}
            <Form.Group className="mb-3" controlId="ann-title">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="Announcement title"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                required
              />
            </Form.Group>

            {/* Body */}
            <Form.Group className="mb-3" controlId="ann-body">
              <Form.Label>Body</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="Announcement details..."
                value={body}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
                required
              />
            </Form.Group>

              <Row>
                <Col md={6}>
                  {/* Category */}
                  <Form.Group className="mb-3" controlId="ann-category">
                    <Form.Label>Category</Form.Label>
                    <Form.Select
                      value={category}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const val = e.target.value as AnnouncementCategory;
                        setCategory(val);
                        if (['recruitment', 'celebrations'].includes(val)) {
                          setHasExpiration(true);
                          setVisibility('public');
                        }
                      }}
                    >
                      {ALL_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {ANNOUNCEMENT_CATEGORY_LABELS[cat]}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  {/* Visibility */}
                  <Form.Group className="mb-3">
                    <Form.Label>Visibility</Form.Label>
                    <div>
                      {ALL_VISIBILITIES.map((vis) => (
                        <Form.Check
                          key={vis}
                          inline
                          type="radio"
                          id={`vis-${vis}`}
                          name="visibility"
                          label={ANNOUNCEMENT_VISIBILITY_LABELS[vis]}
                          checked={visibility === vis}
                          disabled={isStrictExpiry}
                          onChange={() => setVisibility(vis)}
                        />
                      ))}
                    </div>
                  </Form.Group>
                </Col>
              </Row>
              
              {category === 'celebrations' && (
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Celebration Theme</Form.Label>
                      <div>
                        <Form.Check
                          inline
                          type="radio"
                          id="theme-tricolor"
                          name="theme"
                          label="Tricolor (IDC / RDC)"
                          checked={theme === 'tricolor'}
                          onChange={() => setTheme('tricolor')}
                        />
                        <Form.Check
                          inline
                          type="radio"
                          id="theme-ncc"
                          name="theme"
                          label="NCC Colors (NCC Day)"
                          checked={theme === 'ncc'}
                          onChange={() => setTheme('ncc')}
                        />
                      </div>
                    </Form.Group>
                  </Col>
                </Row>
              )}

            <Row>
              <Col md={6}>
                {/* Expiration */}
                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="ann-expiry-toggle"
                    label="Set Expiration"
                    checked={isStrictExpiry || hasExpiration}
                    disabled={isStrictExpiry}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setHasExpiration(e.target.checked);
                      if (!e.target.checked) setExpiresAt('');
                    }}
                  />
                  {isStrictExpiry && (
                    <Form.Text className="text-muted">
                      This category requires an expiration date.
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                {(isStrictExpiry || hasExpiration) && (
                  <Form.Group className="mb-3" controlId="ann-expires">
                    <Form.Label>Expires At</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={expiresAt}
                      min={nowLocalDatetime()}
                      max={maxExpiryDatetime()}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpiresAt(e.target.value)}
                      required
                    />
                    <Form.Text className="text-muted">Maximum 1 year from now.</Form.Text>
                  </Form.Group>
                )}
              </Col>
            </Row>

            {/* Pin */}
            <Form.Group className="mb-4">
              <Form.Check
                type="checkbox"
                id="ann-pinned"
                label={
                  <>
                    <i className="bi bi-pin-angle-fill me-1" />
                    Pin this announcement
                  </>
                }
                checked={isPinned}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsPinned(e.target.checked)}
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={editingId ? 'warning' : 'primary'}
                disabled={!isFormValid() || submitting}
              >
                {submitting ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-2"  />
                    {editingId ? 'Updating…' : 'Creating…'}
                  </>
                ) : editingId ? (
                  'Update Announcement'
                ) : (
                  'Create Announcement'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

          {/* Filter Pills */}
          <div className="d-flex flex-wrap gap-3 mb-4">
            <div className="category-filter-pills">
            <Button
              size="sm"
              variant={categoryFilter === 'all' ? 'dark' : 'outline-dark'}
              className="filter-pill"
              onClick={() => setCategoryFilter('all')}
            >
              All
            </Button>
            {ALL_CATEGORIES.map((cat) => (
              <Button
                key={cat}
                size="sm"
                variant={
                  categoryFilter === cat
                    ? ANNOUNCEMENT_CATEGORY_COLORS[cat]
                    : `outline-${ANNOUNCEMENT_CATEGORY_COLORS[cat]}`
                }
                className="filter-pill"
                onClick={() => setCategoryFilter(cat)}
              >
                {ANNOUNCEMENT_CATEGORY_LABELS[cat]}
              </Button>
            ))}
            </div>
            
            <div className="visibility-filter-pills">
              <span className="me-2 fw-semibold small text-muted">Visibility:</span>
              <Button
                size="sm"
                variant={visibilityFilter === 'all' ? 'dark' : 'outline-dark'}
                className="filter-pill"
                onClick={() => setVisibilityFilter('all')}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={visibilityFilter === 'public' ? 'success' : 'outline-success'}
                className="filter-pill"
                onClick={() => setVisibilityFilter('public')}
              >
                Public
              </Button>
              <Button
                size="sm"
                variant={visibilityFilter === 'auth_only' ? 'primary' : 'outline-primary'}
                className="filter-pill"
                onClick={() => setVisibilityFilter('auth_only')}
              >
                Auth Only
              </Button>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div className="text-center py-5">
              <Spinner as="span" animation="border"  size="sm" />
              <p className="mt-2 text-muted">Loading announcements…</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <Alert variant="info">
              <i className="bi bi-info-circle me-2" />
              {categoryFilter === 'all'
                ? 'No announcements yet. Create one using the form.'
                : `No announcements in this category.`}
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle announcements-table">
                <thead className="table-light">
                  <tr>
                    <th>Title & Preview</th>
                    <th>Category</th>
                    <th>Visibility</th>
                    <th>Posted By</th>
                    <th>Date / Expiry</th>
                    <th>Reads</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const expired = isExpired(item);
                    const id = item.id!;

                    return (
                      <React.Fragment key={id}>
                        <tr className={expired ? 'table-secondary opacity-75' : ''}>
                          <td style={{ maxWidth: '300px' }}>
                            <div className="d-flex align-items-center mb-1">
                              {item.isPinned && (
                                <Badge bg="dark" className="me-2" title="Pinned">
                                  <i className="bi bi-pin-angle-fill" />
                                </Badge>
                              )}
                              <strong className="text-truncate d-block">{item.title}</strong>
                            </div>
                            <div className="text-muted small text-truncate">
                              {truncate(item.body, 80)}
                            </div>
                          </td>
                          <td>
                            <Badge bg={ANNOUNCEMENT_CATEGORY_COLORS[item.category]}>
                              {ANNOUNCEMENT_CATEGORY_LABELS[item.category]}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg="secondary">
                              {item.visibility === 'public' ? '🌐 Public' : '🔒 Auth Only'}
                            </Badge>
                          </td>
                          <td>
                            <div className="small">
                              <i className="bi bi-person me-1 text-muted" />
                              {item.createdByName || 'Admin'}
                            </div>
                          </td>
                          <td>
                            <div className="small">
                              <div>
                                {item.createdAt?.toDate
                                  ? formatISTDateTime(item.createdAt.toDate())
                                  : item.createdAt
                                    ? formatISTDateTime(new Date(item.createdAt))
                                    : '-'}
                              </div>
                              {item.expiresAt && (
                                <div className={expired ? 'text-danger' : 'text-muted'}>
                                  <i className="bi bi-hourglass-split me-1" />
                                  {formatISTDateTime(new Date(item.expiresAt))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="small">
                              <Badge bg="info" text="dark">
                                <i className="bi bi-eye me-1" />
                                {readCounts[id] ?? 0}
                              </Badge>
                            </div>
                          </td>
                          <td className="text-end">
                            <div className="d-flex gap-2 justify-content-end">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                title="Edit"
                                onClick={() => loadIntoForm(item)}
                              >
                                <i className="bi bi-pencil" />
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                title="Delete"
                                onClick={() => {
                                  setDeletingId(id);
                                  setShowDeleteModal(true);
                                }}
                              >
                                <i className="bi bi-trash" />
                              </Button>
                              <Button
                                variant={expandedReadId === id ? 'info' : 'outline-info'}
                                size="sm"
                                title="View Readers"
                                onClick={() => toggleReadAnalytics(id)}
                              >
                                <i className="bi bi-bar-chart-steps" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* ───── Readers Analytics Modal ───── */}
      <Modal show={!!expandedReadId} onHide={() => setExpandedReadId(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Read Analytics</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {analyticsLoading ? (
            <div className="text-center py-4">
              <Spinner as="span" animation="border"  size="sm" />
              <p className="mt-2 text-muted">Loading analytics…</p>
            </div>
          ) : readAnalytics.length === 0 ? (
            <Alert variant="info" className="mb-0">
              No one has read this announcement yet.
            </Alert>
          ) : (
            <div className="read-analytics-groups">
              {readAnalytics.map((group, idx) => (
                <div key={idx} className="mb-4">
                  <h6 className="fw-bold mb-3 pb-2 border-bottom d-flex justify-content-between align-items-center">
                    {group.label}
                    <Badge bg="secondary" pill>{group.readers.length}</Badge>
                  </h6>
                  <div className="d-flex flex-wrap gap-2">
                    {group.readers.map((r, rIdx) => (
                      <Badge key={rIdx} bg="light" text="dark" className="border px-3 py-2">
                        {r.userName}
                        <span className="text-muted ms-2 fw-normal" style={{ fontSize: '0.75rem' }}>
                          {r.readAt?.toDate ? formatISTDateTime(r.readAt.toDate()) : ''}
                        </span>
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* ───── Confirm Create/Update Modal ───── */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? 'Confirm Update' : 'Confirm Create'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to {editingId ? 'update' : 'create'} this announcement?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </Button>
          <Button variant={editingId ? 'warning' : 'primary'} onClick={handleSubmit}>
            {editingId ? 'Update' : 'Create'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ───── Confirm Delete Modal ───── */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this announcement? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2"  />
                Deleting…
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AnnouncementsAdmin;
