import { DEPARTMENT_DEFS } from '@/shared/config/constants';
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
import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
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

type AlumniRow = AlumniProfile & { id: string };

const emptyForm = {
  name: '',
  division: '' as '' | 'SD' | 'SW',
  department: '',
  passOutYear: '',
  email: '',
  phone: '',
  bloodGroup: '',
  batchYears: '',
  rank: '',
  achievements: '',
};

const AlumniManagement: React.FC = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<AlumniRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<'ALL' | 'SD' | 'SW'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchProfiles = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'alumniProfiles'), orderBy('createdAt', 'desc')));
      setProfiles(snap.docs.map(d => ({ id: d.id, ...(d.data() as AlumniProfile) })));
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
  }, [searchTerm, divisionFilter, departmentFilter, yearFilter, rowsPerPage]);

  const pending = profiles.filter(p => p.status === 'pending');
  const active = profiles.filter(p => p.status === 'active');

  const filterList = (list: AlumniRow[]) => {
    let result = [...list];
    if (divisionFilter !== 'ALL') result = result.filter(p => p.division === divisionFilter);
    if (departmentFilter !== 'ALL') result = result.filter(p => p.department === departmentFilter);
    if (yearFilter !== 'ALL') result = result.filter(p => p.passOutYear === yearFilter);
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

  const filteredActive = useMemo(() => filterList(active), [active, searchTerm, divisionFilter, departmentFilter, yearFilter]);
  const passOutYears = useMemo(() => {
    const years = new Set(profiles.map(p => p.passOutYear).filter(Boolean) as string[]);
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [profiles]);

  const totalPages = Math.max(1, Math.ceil(filteredActive.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;
  const paginatedActive = filteredActive.slice(startIndex, startIndex + rowsPerPage);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (row: AlumniRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name || '',
      division: row.division || '',
      department: row.department || '',
      passOutYear: row.passOutYear || '',
      email: row.email || '',
      phone: row.phone || '',
      bloodGroup: row.bloodGroup || '',
      batchYears: row.batchYears || '',
      rank: row.rank || '',
      achievements: row.achievements || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.division || !form.department || !form.passOutYear.trim()) {
      toast.error('Name, division, department, and pass-out year are required');
      return;
    }
    setSaving(true);
    try {
      const rawData = {
        name: form.name.trim(),
        division: form.division,
        department: form.department,
        passOutYear: form.passOutYear.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        bloodGroup: form.bloodGroup || undefined,
        batchYears: form.batchYears.trim() || undefined,
        rank: form.rank.trim() || undefined,
        achievements: form.achievements.trim() || undefined,
      };
      
      const data = Object.fromEntries(Object.entries(rawData).filter(([_, v]) => v !== undefined));

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

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, 'alumniProfiles', id), { status: 'active', visible: true });
      toast.success('Profile approved');
      await fetchProfiles();
    } catch (e) {
      toast.error('Approve failed');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateDoc(doc(db, 'alumniProfiles', id), { status: 'rejected', visible: false });
      toast.success('Profile rejected');
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Permanently delete this alumni profile?')) return;
    try {
      await deleteDoc(doc(db, 'alumniProfiles', id));
      toast.success('Profile deleted');
      await fetchProfiles();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Card className="shadow">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
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
          <Tabs defaultActiveKey="active" className="mb-3">
            <Tab eventKey="pending" title={<span>Pending {pending.length > 0 && <Badge bg="danger" className="ms-1">{pending.length}</Badge>}</span>}>
              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Division</th>
                    <th>Department</th>
                    <th>Pass-out</th>
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
                      <td>{p.passOutYear}</td>
                      <td><Badge bg="secondary">{p.source}</Badge></td>
                      <td className="d-flex gap-1 flex-wrap">
                        <Button size="sm" variant="success" onClick={() => handleApprove(p.id)}>Approve</Button>
                        <Button size="sm" variant="outline-danger" onClick={() => handleReject(p.id)}>Reject</Button>
                        <Button size="sm" variant="outline-primary" onClick={() => openEdit(p)}>Edit</Button>
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
                  <Form.Select value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value as typeof divisionFilter)}>
                    <option value="ALL">All Divisions</option>
                    <option value="SD">SD</option>
                    <option value="SW">SW</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                    <option value="ALL">All Departments</option>
                    {DEPARTMENT_DEFS.map(d => <option key={d.code} value={d.code}>{d.code}</option>)}
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Form.Select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                    <option value="ALL">All Years</option>
                    {passOutYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Form.Control placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </Col>
              </Row>

              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Division</th>
                    <th>Department</th>
                    <th>Pass-out</th>
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
                      <td>{p.passOutYear}</td>
                      <td><Badge bg="secondary">{p.source}</Badge></td>
                      <td>
                        <Badge bg={p.visible ? 'success' : 'secondary'}>{p.visible ? 'Yes' : 'Hidden'}</Badge>
                      </td>
                      <td className="d-flex gap-1 flex-wrap">
                        <Button size="sm" variant="outline-primary" onClick={() => openEdit(p)}>Edit</Button>
                        <Button size="sm" variant="outline-warning" onClick={() => handleToggleVisibility(p)}>
                          {p.visible ? 'Hide' : 'Show'}
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => handleDelete(p.id)}>Delete</Button>
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
          <Row className="g-3">
            <Col md={6}>
              <Form.Label>Name *</Form.Label>
              <Form.Control value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </Col>
            <Col md={6}>
              <Form.Label>Pass-out Year *</Form.Label>
              <Form.Control value={form.passOutYear} onChange={(e) => setForm(f => ({ ...f, passOutYear: e.target.value }))} />
            </Col>
            <Col md={6}>
              <Form.Label>Division *</Form.Label>
              <Form.Select value={form.division} onChange={(e) => setForm(f => ({ ...f, division: e.target.value as 'SD' | 'SW' }))}>
                <option value="">Select</option>
                <option value="SD">SD</option>
                <option value="SW">SW</option>
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label>Department *</Form.Label>
              <Form.Select value={form.department} onChange={(e) => setForm(f => ({ ...f, department: e.target.value }))}>
                <option value="">Select</option>
                {DEPARTMENT_DEFS.map(d => <option key={d.code} value={d.code}>{d.code}</option>)}
              </Form.Select>
            </Col>
            <Col md={6}><Form.Label>Email</Form.Label><Form.Control value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} /></Col>
            <Col md={6}><Form.Label>Phone</Form.Label><Form.Control value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} /></Col>
            <Col md={6}>
              <Form.Label>Blood Group</Form.Label>
              <Form.Select value={form.bloodGroup} onChange={(e) => setForm(f => ({ ...f, bloodGroup: e.target.value }))}>
                <option value="">Select</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </Form.Select>
            </Col>
            <Col md={6}><Form.Label>Batch Years</Form.Label><Form.Control value={form.batchYears} onChange={(e) => setForm(f => ({ ...f, batchYears: e.target.value }))} /></Col>
            <Col md={6}><Form.Label>Rank</Form.Label><Form.Control value={form.rank} onChange={(e) => setForm(f => ({ ...f, rank: e.target.value }))} /></Col>
            <Col xs={12}>
              <Form.Label>Achievements</Form.Label>
              <Form.Control as="textarea" rows={3} value={form.achievements} onChange={(e) => setForm(f => ({ ...f, achievements: e.target.value }))} />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AlumniManagement;
