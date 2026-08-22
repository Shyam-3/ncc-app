import { DEPARTMENT_DEFS, NCC_RANKS, BLOOD_GROUPS } from '@/shared/config/constants';
import { db } from '@/shared/config/firebase';
import type { AlumniProfile } from '@/features/alumni';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
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
  Tab,
  Table,
  Tabs,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TablePaginationFooter } from '@/components';
import ProfilePhoto from '@/components/ProfilePhoto';
import { uploadAlumniPhoto } from '@/shared/utils/cloudinary';

type AlumniRow = AlumniProfile & { id: string };

const YEAR_START = Array.from(  { length: 35 },  (_, i) => new Date().getFullYear() - 3 - i);
const YEAR_END = Array.from(  { length: 35 },  (_, i) => new Date().getFullYear() - i);

const emptyForm = {
  name: '',
  division: '' as '' | 'SD' | 'SW',
  department: '',
  email: '',
  phone: '',
  bloodGroup: '',
  acStart: '',
  acEnd: '',
  nccStart: '',
  nccEnd: '',
  rank: '',
  achievements: '',
  photoURL: '' as string,
  cloudinaryPublicId: '' as string,
};

const AlumniManagement: React.FC = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<AlumniRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<'ALL' | 'SD' | 'SW'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [showModal, setShowModal] = useState(false);
  const [viewProfile, setViewProfile] = useState<AlumniRow | null>(null);
  const [confirm, setConfirm] = useState<{ action: 'approve' | 'reject' | 'delete'; payload: AlumniRow } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const fetchProfiles = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'alumniProfiles'), orderBy('createdAt', 'desc')));
      const fetchedProfiles = snap.docs.map(d => ({ id: d.id, ...(d.data() as AlumniProfile) }));
      console.log('DEBUG - Total profiles fetched:', fetchedProfiles.length);
      console.log('DEBUG - Pending profiles:', fetchedProfiles.filter(p => p.status === 'pending'));
      setProfiles(fetchedProfiles);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load alumni profiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, divisionFilter, departmentFilter, rowsPerPage]);

  const pending = profiles.filter(p => p.status === 'pending');
  const active = profiles.filter(p => p.status === 'active');

  const filterList = (list: AlumniRow[]) => {
    let result = [...list];
    if (divisionFilter !== 'ALL') result = result.filter(p => p.division === divisionFilter);
    if (departmentFilter !== 'ALL') result = result.filter(p => p.department === departmentFilter);
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.email || '').toLowerCase().includes(term) ||
        (p.regimentalNumber || '').toLowerCase().includes(term)
      );
    }
    return result;
  };

  const filteredActive = useMemo(() => filterList(active), [active, searchTerm, divisionFilter, departmentFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredActive.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;
  const paginatedActive = filteredActive.slice(startIndex, startIndex + rowsPerPage);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setPhotoFile(null);
    setPhotoRemoved(false);
    setShowModal(true);
  };

  const openEdit = (row: AlumniRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name || '',
      division: row.division || '',
      department: row.department || '',
      email: row.email || '',
      phone: row.phone || '',
      bloodGroup: row.bloodGroup || '',
      acStart: row.academicYear ? row.academicYear.split('-')[0] : '',
      acEnd: row.academicYear ? row.academicYear.split('-')[1] : '',
      nccStart: row.nccTenure ? row.nccTenure.split('-')[0] : '',
      nccEnd: row.nccTenure ? row.nccTenure.split('-')[1] : '',
      rank: row.rank || '',
      achievements: row.achievements || '',
      photoURL: row.photoURL || '',
      cloudinaryPublicId: row.cloudinaryPublicId || '',
    });
    setPhotoFile(null);
    setPhotoRemoved(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.division || !form.department) {
      toast.error('Name, division, and department are required');
      return;
    }
    setSaving(true);
    try {
      let photoURL = form.photoURL;
      let cloudinaryPublicId = form.cloudinaryPublicId;
      
      const academicYear = form.acStart && form.acEnd ? `${form.acStart}-${form.acEnd}` : undefined;
      const nccTenure = form.nccStart && form.nccEnd ? `${form.nccStart}-${form.nccEnd}` : undefined;
      
      if (photoFile && form.division && nccTenure) {
        setPhotoUploading(true);
        try {
          const result = await uploadAlumniPhoto(
            photoFile,
            form.name,
            nccTenure,
            form.division as 'SD' | 'SW'
          );
          photoURL = result.secure_url;
          cloudinaryPublicId = result.public_id;
          
          // Queue the old photo for cleanup if one existed
          if (form.cloudinaryPublicId) {
            await addDoc(collection(db, 'cloudinary_cleanup'), {
              publicId: form.cloudinaryPublicId,
              reason: 'photo_updated',
              createdAt: new Date().toISOString(),
            });
          }
        } catch (uploadErr) {
          console.error('Photo upload failed:', uploadErr);
          toast.error('Photo upload failed, but profile will still be saved.');
        } finally {
          setPhotoUploading(false);
        }
      } else if (photoRemoved && form.cloudinaryPublicId) {
        // User explicitly removed the photo — queue old one for cleanup
        await addDoc(collection(db, 'cloudinary_cleanup'), {
          publicId: form.cloudinaryPublicId,
          reason: 'photo_removed',
          createdAt: new Date().toISOString(),
        });
        photoURL = '';
        cloudinaryPublicId = '';
      }

      const rawData: Record<string, unknown> = {
        name: form.name.trim(),
        division: form.division,
        department: form.department,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        bloodGroup: form.bloodGroup || undefined,
        academicYear: academicYear,
        nccTenure: nccTenure,
        rank: form.rank.trim() || undefined,
        achievements: form.achievements.trim() || undefined,
        photoURL: photoURL || undefined,
        cloudinaryPublicId: cloudinaryPublicId || undefined,
      };

      // If photo was removed, explicitly delete the fields from Firestore
      if (photoRemoved) {
        rawData.photoURL = null;
        rawData.cloudinaryPublicId = null;
      }
      
      const data = Object.fromEntries(
        Object.entries(rawData).filter(([_, v]) => v !== undefined)
      );

      if (editingId) {
        await updateDoc(doc(db, 'alumniProfiles', editingId), data);
        toast.success('Profile updated');
      } else {
        await addDoc(collection(db, 'alumniProfiles'), {
          ...data,
          status: 'active',
          visible: true,
          source: 'manual',
          createdAt: new Date().toISOString(),
        });
        toast.success('Alumni profile added');
      }
      setShowModal(false);
      await fetchProfiles();
    } catch (e) {
      console.error(e);
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (profile: AlumniRow) => {
    try {
      await updateDoc(doc(db, 'alumniProfiles', profile.id), { status: 'active', visible: true });
      toast.success('Profile approved');
      setConfirm(null);
      await fetchProfiles();
    } catch (e) {
      toast.error('Approve failed');
    }
  };

  const handleReject = async (profile: AlumniRow) => {
    try {
      if (profile.cloudinaryPublicId) {
        await addDoc(collection(db, 'cloudinary_cleanup'), {
          publicId: profile.cloudinaryPublicId,
          reason: 'rejected',
          createdAt: new Date().toISOString(),
        });
      }
      
      await deleteDoc(doc(db, 'alumniProfiles', profile.id));
      toast.success('Profile rejected and deleted');
      setConfirm(null);
      await fetchProfiles();
    } catch (e) {
      toast.error('Reject failed');
    }
  };

  const handleToggleVisibility = async (row: AlumniRow) => {
    try {
      await updateDoc(doc(db, 'alumniProfiles', row.id), { visible: !row.visible });
      toast.success(row.visible ? 'Profile hidden' : 'Profile visible');
      await fetchProfiles();
    } catch (e) {
      toast.error('Update failed');
    }
  };

  const handleDelete = async (profile: AlumniRow) => {
    try {
      if (profile.cloudinaryPublicId) {
        await addDoc(collection(db, 'cloudinary_cleanup'), {
          publicId: profile.cloudinaryPublicId,
          reason: 'deleted',
          createdAt: new Date().toISOString(),
        });
      }

      await deleteDoc(doc(db, 'alumniProfiles', profile.id));
      toast.success('Profile deleted');
      setConfirm(null);
      await fetchProfiles();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner as="span" animation="border"  size="sm" />
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Card className="shadow">
        <Card.Header className="bg-primary text-white d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
          <h3 className="mb-0"><i className="bi bi-mortarboard me-2"></i>Alumni Management</h3>
          <div className="d-flex gap-2">
            <Button variant="light" size="sm" onClick={openAdd}>
              <i className="bi bi-plus-lg me-1"></i> Add Alumni
            </Button>
            <Button variant="light" size="sm" onClick={() => navigate(-1)}>
              <i className="bi bi-arrow-left me-1"></i> Back
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <Tabs id="alumni-tabs" defaultActiveKey="active" className="mb-3">
            <Tab eventKey="pending" title={<span>Pending {pending.length > 0 && <Badge bg="danger" className="ms-1">{pending.length}</Badge>}</span>}>
              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Division</th>
                    <th>Department</th>
                    <th>Academic</th>
                    <th>NCC Tenure</th>
                    <th>Source</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map(p => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.division}</td>
                      <td>{p.department}</td>
                      <td>{p.academicYear}</td>
                      <td>{p.nccTenure || p.batchYears}</td>
                      <td><Badge bg="secondary">{p.source}</Badge></td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => setViewProfile(p)}
                          title="View profile details"
                        >
                          <i className="bi bi-eye-fill"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {pending.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-muted">No pending submissions</td></tr>
                  )}
                </tbody>
              </Table>
            </Tab>

            <Tab eventKey="active" title="Active">
              <Row className="g-3 mb-3">
                <Col md={3}>
                  <Form.Select value={divisionFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDivisionFilter(e.target.value as typeof divisionFilter)}>
                    <option value="ALL">All Divisions</option>
                    <option value="SD">SD</option>
                    <option value="SW">SW</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Select value={departmentFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDepartmentFilter(e.target.value)}>
                    <option value="ALL">All Departments</option>
                    {DEPARTMENT_DEFS.map(d => <option key={d.code} value={d.code}>{d.code}</option>)}
                  </Form.Select>
                </Col>
                <Col md={6}>
                  <Form.Control placeholder="Search..." value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setSearchTerm(e.target.value)} />
                </Col>
              </Row>

              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Division</th>
                    <th>Department</th>
                    <th>Academic</th>
                    <th>NCC Tenure</th>
                    <th>Source</th>
                    <th>Visible</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedActive.map(p => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.division}</td>
                      <td>{p.department}</td>
                      <td>{p.academicYear}</td>
                      <td>{p.nccTenure || p.batchYears}</td>
                      <td><Badge bg="secondary">{p.source}</Badge></td>
                      <td>
                        <Badge bg={p.visible ? 'success' : 'secondary'}>{p.visible ? 'Yes' : 'Hidden'}</Badge>
                      </td>
                      <td className="d-flex gap-1 flex-wrap">
                        <Button size="sm" variant="outline-primary" onClick={() => openEdit(p)}>Edit</Button>
                        <Button size="sm" variant="outline-warning" onClick={() => handleToggleVisibility(p)}>
                          {p.visible ? 'Hide' : 'Show'}
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => setConfirm({ action: 'delete', payload: p })}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                  {filteredActive.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-muted">No active alumni profiles</td></tr>
                  )}
                </tbody>
              </Table>
              <TablePaginationFooter
                totalItems={filteredActive.length}
                currentPage={safePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={setRowsPerPage}
                onFirstPage={() => setCurrentPage(1)}
                onPreviousPage={() => setCurrentPage(p => Math.max(1, p - 1))}
                onNextPage={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                onLastPage={() => setCurrentPage(totalPages)}
              />
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? 'Edit Alumni Profile' : 'Add Alumni Profile'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center mb-3">
            <ProfilePhoto
              photoURL={photoRemoved ? null : (form.photoURL || null)}
              size={100}
              editable={true}
              onPhotoSelected={(file) => {
                setPhotoFile(file);
                setPhotoRemoved(false);
              }}
              onPhotoRemoved={() => {
                setPhotoRemoved(true);
                setPhotoFile(null);
              }}
              uploading={photoUploading}
            />
          </div>
          <Row className="g-3">
            <Col md={6}>
              <Form.Label>Name *</Form.Label>
              <Form.Control value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, name: e.target.value }))} />
            </Col>
            <Col md={6}>
              <Form.Label>Division *</Form.Label>
              <Form.Select value={form.division} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, division: e.target.value as 'SD' | 'SW' }))}>
                <option value="">Select</option>
                <option value="SD">SD</option>
                <option value="SW">SW</option>
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label>Department *</Form.Label>
              <Form.Select value={form.department} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, department: e.target.value }))}>
                <option value="">Select</option>
                {DEPARTMENT_DEFS.map(d => <option key={d.code} value={d.code}>{d.code}</option>)}
              </Form.Select>
            </Col>
            <Col md={6}><Form.Label>Email</Form.Label><Form.Control value={form.email} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, email: e.target.value }))} /></Col>
            <Col md={6}><Form.Label>Phone</Form.Label><Form.Control value={form.phone} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, phone: e.target.value }))} /></Col>
            <Col md={6}>
              <Form.Label>Blood Group</Form.Label>
              <Form.Select value={form.bloodGroup} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, bloodGroup: e.target.value }))}>
                <option value="">Select</option>
                {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </Form.Select>
            </Col>
            <Col md={12}>
              <Form.Label>Academic Year (e.g. B.Tech Tenure)</Form.Label>
              <Row className="g-2">
                <Col>
                  <Form.Select value={form.acStart} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, acStart: e.target.value }))}>
                    <option value="" disabled>Start Year</option>
                    {YEAR_START.map(y => <option key={y} value={y}>{y}</option>)}
                  </Form.Select>
                </Col>
                <Col xs="auto" className="d-flex align-items-center">to</Col>
                <Col>
                  <Form.Select value={form.acEnd} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, acEnd: e.target.value }))}>
                    <option value="" disabled>End Year</option>
                    {YEAR_END.map(y => <option key={y} value={y}>{y}</option>)}
                  </Form.Select>
                </Col>
              </Row>
            </Col>
            <Col md={12}>
              <Form.Label>NCC Tenure</Form.Label>
              <Row className="g-2">
                <Col>
                  <Form.Select value={form.nccStart} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, nccStart: e.target.value }))}>
                    <option value="" disabled>Start Year</option>
                    {YEAR_START.map(y => <option key={y} value={y}>{y}</option>)}
                  </Form.Select>
                </Col>
                <Col xs="auto" className="d-flex align-items-center">to</Col>
                <Col>
                  <Form.Select value={form.nccEnd} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, nccEnd: e.target.value }))}>
                    <option value="" disabled>End Year</option>
                    {YEAR_END.map(y => <option key={y} value={y}>{y}</option>)}
                  </Form.Select>
                </Col>
              </Row>
            </Col>
            <Col md={6}>
              <Form.Label>Rank</Form.Label>
              <Form.Select value={form.rank} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, rank: e.target.value }))}>
                <option value="" disabled>Select Rank</option>
                {NCC_RANKS.map(r => <option key={r.code} value={r.code}>{r.name} ({r.code})</option>)}
              </Form.Select>
            </Col>
            <Col xs={12}>
              <Form.Label>Achievements</Form.Label>
              <Form.Control as="textarea" rows={3} value={form.achievements} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(f => ({ ...f, achievements: e.target.value }))} />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </Modal.Footer>
      </Modal>

      {/* Pending Alumni Detail View Modal */}
      <Modal show={!!viewProfile} onHide={() => setViewProfile(null)} centered size="lg">
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="bi bi-person-badge me-2"></i>
            Alumni Profile Review
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewProfile && (
            <>
              {/* Profile Photo & Name Header */}
              <div className="text-center mb-4">
                {viewProfile.photoURL ? (
                  <img
                    src={
                      viewProfile.photoURL?.includes('cloudinary.com') && viewProfile.photoURL.includes('/upload/')
                        ? viewProfile.photoURL.replace('/upload/', '/upload/c_fill,g_face,w_400,h_400,q_auto,f_auto/')
                        : viewProfile.photoURL
                    }
                    alt={`${viewProfile.name}'s photo`}
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid #dee2e6',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      backgroundColor: '#E8EAF6',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '3px solid #dee2e6',
                    }}
                  >
                    <i className="bi bi-person-fill" style={{ fontSize: 48, color: '#9FA8DA' }}></i>
                  </div>
                )}
                <h5 className="mt-3 mb-1 fw-bold">{viewProfile.name}</h5>
                <div className="d-flex justify-content-center gap-2">
                  {viewProfile.division && <Badge bg={viewProfile.division === 'SD' ? 'info' : 'warning'}>{viewProfile.division}</Badge>}
                  {viewProfile.department && <Badge bg="secondary">{viewProfile.department}</Badge>}
                  <Badge bg="primary">{viewProfile.source}</Badge>
                </div>
              </div>

              <hr />

              <Row>
                {/* Left column: Personal & Contact */}
                <Col md={6}>
                  <h6 className="text-primary fw-bold mb-3">
                    <i className="bi bi-person me-2"></i>Personal Details
                  </h6>
                  <div className="mb-2"><small className="text-muted">Email</small><br />{viewProfile.email || <span className="text-muted fst-italic">Not provided</span>}</div>
                  <div className="mb-2"><small className="text-muted">Phone</small><br />{viewProfile.phone || <span className="text-muted fst-italic">Not provided</span>}</div>
                  <div className="mb-2"><small className="text-muted">Blood Group</small><br />{viewProfile.bloodGroup || <span className="text-muted fst-italic">Not provided</span>}</div>
                  <div className="mb-2"><small className="text-muted">Rank</small><br />{viewProfile.rank ? NCC_RANKS.find(r => r.code === viewProfile.rank)?.name || viewProfile.rank : <span className="text-muted fst-italic">Not provided</span>}</div>
                </Col>

                {/* Right column: NCC & Academic */}
                <Col md={6}>
                  <h6 className="text-primary fw-bold mb-3">
                    <i className="bi bi-shield me-2"></i>Tenure Details
                  </h6>
                  <div className="mb-2"><small className="text-muted">Academic Year</small><br />{viewProfile.academicYear || <span className="text-muted fst-italic">Not provided</span>}</div>
                  <div className="mb-2"><small className="text-muted">NCC Tenure</small><br />{viewProfile.nccTenure || viewProfile.batchYears || <span className="text-muted fst-italic">Not provided</span>}</div>
                  {viewProfile.achievements && (
                    <>
                      <h6 className="text-primary fw-bold mb-3 mt-4">
                        <i className="bi bi-trophy me-2"></i>Achievements
                      </h6>
                      <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>{viewProfile.achievements}</p>
                    </>
                  )}
                </Col>
              </Row>

              <hr />
              <div className="text-muted small text-end">
                <i className="bi bi-clock me-1"></i>
                Submitted on: {new Date(viewProfile.createdAt).toLocaleString()}
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setViewProfile(null)}>Close</Button>
          <Button
            variant="outline-primary"
            onClick={() => {
              if (viewProfile) openEdit(viewProfile);
              setViewProfile(null);
            }}
          >
            <i className="bi bi-pencil-square me-1"></i>Edit
          </Button>
          <Button
            variant="outline-danger"
            onClick={() => {
              setViewProfile(null);
              if (viewProfile) setConfirm({ action: 'reject', payload: viewProfile });
            }}
          >
            <i className="bi bi-x-circle me-1"></i>Reject
          </Button>
          <Button
            variant="success"
            onClick={() => {
              setViewProfile(null);
              if (viewProfile) setConfirm({ action: 'approve', payload: viewProfile });
            }}
          >
            <i className="bi bi-check-circle me-1"></i>Accept
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirm modal for approve/reject/delete */}
      <Modal show={!!confirm} onHide={() => setConfirm(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm {confirm?.action}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {confirm?.action === 'approve' && (
            <p>Approve alumni profile for <strong>{confirm?.payload?.name}</strong>? It will become visible in the public directory.</p>
          )}
          {confirm?.action === 'reject' && (
            <>
              <p>Reject alumni profile for <strong>{confirm?.payload?.name}</strong>?</p>
              <Alert variant="info" className="mb-0">
                <i className="bi bi-info-circle me-2"></i>
                This will permanently delete the profile and queue any uploaded photo for cleanup. No trace will remain.
              </Alert>
            </>
          )}
          {confirm?.action === 'delete' && (
            <>
              <p>Delete alumni profile for <strong>{confirm?.payload?.name}</strong>?</p>
              <Alert variant="warning" className="mb-0">
                <i className="bi bi-exclamation-triangle me-2"></i>
                This will permanently delete the profile and cannot be undone.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
          {confirm?.action === 'approve' && (
            <Button variant="success" onClick={() => handleApprove(confirm.payload)}>Approve</Button>
          )}
          {confirm?.action === 'reject' && (
            <Button variant="danger" onClick={() => handleReject(confirm.payload)}>Reject</Button>
          )}
          {confirm?.action === 'delete' && (
            <Button variant="danger" onClick={() => handleDelete(confirm.payload)}>Delete</Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AlumniManagement;
