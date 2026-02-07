import { ACADEMIC_YEARS, DEPARTMENTS, NCC_RANKS, PLATOONS, ROMAN_YEAR_MAP } from '@/config/constants';
import { db } from '@/config/firebase';
import { collection, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import toast from 'react-hot-toast';

type UserRole = 'member' | 'subadmin' | 'admin' | 'superadmin';

interface CadetUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  status: string;
  regimentalNumber?: string;
  division?: 'SD' | 'SW';
  platoon?: 'Alpha' | 'Bravo' | 'Charlie' | 'Delta';
  dateOfBirth?: string;
  dateOfEnrollment?: string;
  nccYear?: string;
  rank?: string;
  year?: string;
  department?: string;
  rollNo?: string;
  registerNumber?: string;
  phone?: string;
  bloodGroup?: string;
  address?: string;
  lastUpdated?: string;
}

const CadetManagement: React.FC = () => {
  const [users, setUsers] = useState<CadetUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cadetView, setCadetView] = useState<CadetUser | null>(null);
  const [cadetEditMode, setCadetEditMode] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [divisionFilter, setDivisionFilter] = useState<'ALL' | 'SD' | 'SW'>('ALL');
  const [yearFilter, setYearFilter] = useState<'ALL' | string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<'ALL' | string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [cadetEditForm, setCadetEditForm] = useState({
    division: '',
    regimentalNumber: '',
    platoon: '',
    dateOfEnrollment: '',
    nccYear: '',
    rank: 'CDT',
    year: '',
    department: '',
    rollNo: '',
    registerNumber: '',
  });
  const [cadetEditErrors, setCadetEditErrors] = useState<Record<string, string>>({});

  const YEAR_OPTIONS = ACADEMIC_YEARS.filter(y => y !== '4th Year');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setUsers(snapshot.docs.map(d => ({ uid: d.id, ...(d.data() as any) })) as CadetUser[]);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load cadets');
    } finally {
      setLoading(false);
    }
  };

  const cadetUsers = useMemo(() => {
    let list = users.filter(u => u.role === 'member' || u.role === 'subadmin');

    if (divisionFilter !== 'ALL') {
      list = list.filter(u => (u.division || '') === divisionFilter);
    }

    if (yearFilter !== 'ALL') {
      list = list.filter(u => (u.year || '') === yearFilter);
    }

    if (departmentFilter !== 'ALL') {
      list = list.filter(u => (u.department || '') === departmentFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(u =>
        (u.regimentalNumber || '').toLowerCase().includes(term) ||
        (u.name || '').toLowerCase().includes(term)
      );
    }

    return list;
  }, [users, divisionFilter, yearFilter, departmentFilter, searchTerm]);

  const clearFilters = () => {
    setDivisionFilter('ALL');
    setYearFilter('ALL');
    setDepartmentFilter('ALL');
    setSearchTerm('');
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
  };

  const formatYear = (value?: string) => {
    if (!value) return '-';
    const cleaned = value.replace(' Year', '').trim();
    return ROMAN_YEAR_MAP[cleaned] || cleaned;
  };

  const getRankName = (code?: string) => {
    if (!code) return 'Cadet';
    return NCC_RANKS.find(r => r.code === code)?.name || code;
  };

  const openCadetView = (u: CadetUser) => {
    setCadetView(u);
    setCadetEditMode(false);
    setConfirmSave(false);
    setCadetEditErrors({});
    setCadetEditForm({
      division: u.division || '',
      regimentalNumber: u.regimentalNumber || '',
      platoon: u.platoon || '',
      dateOfEnrollment: u.dateOfEnrollment || '',
      nccYear: u.nccYear || '1st Year',
      rank: u.rank || 'CDT',
      year: u.year || '1st Year',
      department: u.department || '',
      rollNo: u.rollNo || '',
      registerNumber: u.registerNumber || '',
    });
  };

  const closeCadetView = () => {
    setCadetView(null);
    setCadetEditMode(false);
  };

  const handleCadetEditChange = (name: string, value: string) => {
    if (cadetEditErrors[name]) {
      setCadetEditErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setCadetEditForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateCadetEdit = () => {
    const nextErrors: Record<string, string> = {};

    if (!cadetEditForm.division) nextErrors.division = 'Division is required';
    if (!cadetEditForm.regimentalNumber.trim()) nextErrors.regimentalNumber = 'Regimental number is required';
    if (!cadetEditForm.platoon) nextErrors.platoon = 'Platoon is required';
    if (!cadetEditForm.dateOfEnrollment) nextErrors.dateOfEnrollment = 'Date of enrollment is required';
    if (!cadetEditForm.nccYear) nextErrors.nccYear = 'Year is required';
    if (!cadetEditForm.rank) nextErrors.rank = 'Rank is required';
    if (!cadetEditForm.year) nextErrors.year = 'Academic year is required';
    if (!cadetEditForm.department) nextErrors.department = 'Department is required';
    if (!cadetEditForm.rollNo.trim()) nextErrors.rollNo = 'Roll number is required';
    if (!cadetEditForm.registerNumber.trim()) {
      nextErrors.registerNumber = 'Register number is required';
    } else if (!cadetEditForm.registerNumber.match(/^\d{16}$/)) {
      nextErrors.registerNumber = 'Register number must be exactly 16 digits';
    }

    setCadetEditErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const requestSave = () => {
    if (!validateCadetEdit()) return;
    setConfirmSave(true);
  };

  const handleUpdateCadet = async () => {
    if (!cadetView) return;
    if (!validateCadetEdit()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', cadetView.uid), {
        division: cadetEditForm.division,
        regimentalNumber: cadetEditForm.regimentalNumber,
        platoon: cadetEditForm.platoon,
        dateOfEnrollment: cadetEditForm.dateOfEnrollment,
        nccYear: cadetEditForm.nccYear,
        rank: cadetEditForm.rank,
        year: cadetEditForm.year,
        department: cadetEditForm.department,
        rollNo: cadetEditForm.rollNo,
        registerNumber: cadetEditForm.registerNumber,
        lastUpdated: new Date().toISOString(),
      });

      setUsers(prev => prev.map(u => u.uid === cadetView.uid ? {
        ...u,
        division: cadetEditForm.division as any,
        regimentalNumber: cadetEditForm.regimentalNumber,
        platoon: cadetEditForm.platoon as any,
        dateOfEnrollment: cadetEditForm.dateOfEnrollment,
        nccYear: cadetEditForm.nccYear,
        rank: cadetEditForm.rank,
        year: cadetEditForm.year,
        department: cadetEditForm.department,
        rollNo: cadetEditForm.rollNo,
        registerNumber: cadetEditForm.registerNumber,
      } : u));

      setCadetView(prev => prev ? {
        ...prev,
        division: cadetEditForm.division as any,
        regimentalNumber: cadetEditForm.regimentalNumber,
        platoon: cadetEditForm.platoon as any,
        dateOfEnrollment: cadetEditForm.dateOfEnrollment,
        nccYear: cadetEditForm.nccYear,
        rank: cadetEditForm.rank,
        year: cadetEditForm.year,
        department: cadetEditForm.department,
        rollNo: cadetEditForm.rollNo,
        registerNumber: cadetEditForm.registerNumber,
      } : prev);

      toast.success('Cadet profile updated');
      setCadetEditMode(false);
      setConfirmSave(false);
    } catch (e) {
      console.error(e);
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p className="mt-3">Loading cadet management...</p>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Card className="shadow">
        <Card.Header className="bg-primary text-white">
          <h3 className="mb-0">
            <i className="bi bi-people-fill me-2"></i>
            Cadet Management
          </h3>
        </Card.Header>
        <Card.Body>
          <Alert variant="info">
            View member and sub-admin profiles. Admins can edit NCC and academic details from the profile view.
          </Alert>
          <Row className="mb-3 g-3">
            <Col xs={12} md={3}>
              <Form.Label className="small fw-semibold">Division</Form.Label>
              <div className="btn-group w-100" role="group">
                <input
                  type="radio"
                  className="btn-check"
                  name="division-filter-cadets"
                  id="division-cadets-all"
                  checked={divisionFilter === 'ALL'}
                  onChange={() => setDivisionFilter('ALL')}
                />
                <label className="btn btn-outline-primary" htmlFor="division-cadets-all">Both</label>

                <input
                  type="radio"
                  className="btn-check"
                  name="division-filter-cadets"
                  id="division-cadets-sd"
                  checked={divisionFilter === 'SD'}
                  onChange={() => setDivisionFilter('SD')}
                />
                <label className="btn btn-outline-primary" htmlFor="division-cadets-sd">SD</label>

                <input
                  type="radio"
                  className="btn-check"
                  name="division-filter-cadets"
                  id="division-cadets-sw"
                  checked={divisionFilter === 'SW'}
                  onChange={() => setDivisionFilter('SW')}
                />
                <label className="btn btn-outline-primary" htmlFor="division-cadets-sw">SW</label>
              </div>
            </Col>
            <Col xs={12} md={3}>
              <Form.Label className="small fw-semibold">Year</Form.Label>
              <Form.Select
                value={yearFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setYearFilter(e.target.value)}
              >
                <option value="" disabled>Select Year</option>
                <option value="ALL">All Years</option>
                {YEAR_OPTIONS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={12} md={3}>
              <Form.Label className="small fw-semibold">Department</Form.Label>
              <Form.Select
                value={departmentFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDepartmentFilter(e.target.value)}
              >
                <option value="" disabled>Select Department</option>
                <option value="ALL">All Departments</option>
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={12} md={3}>
              <Form.Label className="small fw-semibold">Search</Form.Label>
              <Form.Control
                type="text"
                placeholder="Search by name or regimental number..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
            </Col>
            <Col xs={12} md={2} className="d-flex align-items-end">
              <Button variant="outline-secondary" className="w-100" onClick={clearFilters}>
                <i className="bi bi-x-circle me-1"></i>
                Clear Filters
              </Button>
            </Col>
          </Row>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>S.No</th>
                <th>Name</th>
                <th>Regimental Number</th>
                <th style={{ width: '80px' }}>SD/SW</th>
                <th style={{ width: '90px' }}>Year</th>
                <th>Department</th>
                <th style={{ width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cadetUsers.map((u, index) => (
                <tr key={u.uid}>
                  <td className="text-center">{index + 1}</td>
                  <td className="text-break" dir="ltr">{u.name || 'N/A'}</td>
                  <td>{u.regimentalNumber || '-'}</td>
                  <td className="text-center">
                    {u.division ? (
                      <Badge bg={u.division === 'SD' ? 'info' : 'warning'}>{u.division}</Badge>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="text-center">{formatYear(u.year || '1st Year')}</td>
                  <td>{u.department || '-'}</td>
                  <td>
                    <Button size="sm" variant="outline-primary" onClick={() => openCadetView(u)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
              {cadetUsers.length === 0 && (
                <tr><td colSpan={7} className="text-center text-muted">No cadets found</td></tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal show={!!cadetView} onHide={closeCadetView} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Cadet Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!cadetEditMode && cadetView && (
            <>
              <h6 className="text-primary mb-2">Personal</h6>
              <Row className="g-3 mb-3">
                <Col xs={12} md={6}>
                  <Form.Label className="fw-bold text-muted small">Name</Form.Label>
                  <p className="mb-0">{cadetView.name || '-'}</p>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Label className="fw-bold text-muted small">Email</Form.Label>
                  <p className="mb-0">{cadetView.email || '-'}</p>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Label className="fw-bold text-muted small">Date of Birth</Form.Label>
                  <p className="mb-0">{formatDate(cadetView.dateOfBirth)}</p>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Label className="fw-bold text-muted small">Role</Form.Label>
                  <p className="mb-0">{cadetView.role}</p>
                </Col>
              </Row>

              <hr />

              <h6 className="text-primary mb-2">NCC</h6>
              <Row className="g-3 mb-3">
                <Col xs={12} md={4}>
                  <Form.Label className="fw-bold text-muted small">Division</Form.Label>
                  <p className="mb-0">{cadetView.division || '-'}</p>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Label className="fw-bold text-muted small">Rank</Form.Label>
                  <p className="mb-0">{getRankName(cadetView.rank || 'CDT')}</p>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Label className="fw-bold text-muted small">Regimental Number</Form.Label>
                  <p className="mb-0">{cadetView.regimentalNumber || '-'}</p>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Label className="fw-bold text-muted small">Year</Form.Label>
                  <p className="mb-0">{formatYear(cadetView.nccYear || '1st Year')}</p>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Label className="fw-bold text-muted small">Platoon</Form.Label>
                  <p className="mb-0">{cadetView.platoon || '-'}</p>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Label className="fw-bold text-muted small">Date of Enrollment</Form.Label>
                  <p className="mb-0">{formatDate(cadetView.dateOfEnrollment)}</p>
                </Col>
              </Row>

              <hr />

              <h6 className="text-primary mb-2">Academic</h6>
              <Row className="g-3 mb-3">
                <Col xs={12} md={3}>
                  <Form.Label className="fw-bold text-muted small">Year</Form.Label>
                  <p className="mb-0">{formatYear(cadetView.year || '1st Year')}</p>
                </Col>
                <Col xs={12} md={3}>
                  <Form.Label className="fw-bold text-muted small">Department</Form.Label>
                  <p className="mb-0">{cadetView.department || '-'}</p>
                </Col>
                <Col xs={12} md={3}>
                  <Form.Label className="fw-bold text-muted small">Roll Number</Form.Label>
                  <p className="mb-0">{cadetView.rollNo || '-'}</p>
                </Col>
                <Col xs={12} md={3}>
                  <Form.Label className="fw-bold text-muted small">Register Number</Form.Label>
                  <p className="mb-0">{cadetView.registerNumber || '-'}</p>
                </Col>
              </Row>

              <hr />

              <h6 className="text-primary mb-2">Additional</h6>
              <Row className="g-3">
                <Col xs={12} md={4}>
                  <Form.Label className="fw-bold text-muted small">Phone</Form.Label>
                  <p className="mb-0">{cadetView.phone || '-'}</p>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Label className="fw-bold text-muted small">Blood Group</Form.Label>
                  <p className="mb-0">{cadetView.bloodGroup || '-'}</p>
                </Col>
                <Col xs={12} md={12}>
                  <Form.Label className="fw-bold text-muted small">Address</Form.Label>
                  <p className="mb-0">{cadetView.address || '-'}</p>
                </Col>
              </Row>
            </>
          )}

          {cadetEditMode && (
            <Form>
              <Row className="g-3">
                <Col xs={12} md={4}>
                  <Form.Group controlId="editCadetDivision">
                    <Form.Label>Division *</Form.Label>
                    <Form.Select
                      value={cadetEditForm.division}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleCadetEditChange('division', e.target.value)}
                      isInvalid={Boolean(cadetEditErrors.division)}
                    >
                      <option value="" disabled>Select Division</option>
                      <option value="SD">SD</option>
                      <option value="SW">SW</option>
                    </Form.Select>
                    {cadetEditErrors.division && <Form.Text className="text-danger">{cadetEditErrors.division}</Form.Text>}
                  </Form.Group>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Group controlId="editCadetRank">
                    <Form.Label>Rank *</Form.Label>
                    <Form.Select
                      value={cadetEditForm.rank}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleCadetEditChange('rank', e.target.value)}
                      isInvalid={Boolean(cadetEditErrors.rank)}
                    >
                      <option value="" disabled>Select Rank</option>
                      {NCC_RANKS.map(r => (
                        <option key={r.code} value={r.code}>{r.name}</option>
                      ))}
                    </Form.Select>
                    {cadetEditErrors.rank && <Form.Text className="text-danger">{cadetEditErrors.rank}</Form.Text>}
                  </Form.Group>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Group controlId="editCadetRegimental">
                    <Form.Label>Regimental Number *</Form.Label>
                    <Form.Control
                      type="text"
                      value={cadetEditForm.regimentalNumber}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCadetEditChange('regimentalNumber', e.target.value)}
                      isInvalid={Boolean(cadetEditErrors.regimentalNumber)}
                    />
                    {cadetEditErrors.regimentalNumber && <Form.Text className="text-danger">{cadetEditErrors.regimentalNumber}</Form.Text>}
                  </Form.Group>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Group controlId="editCadetNccYear">
                    <Form.Label>Year *</Form.Label>
                    <Form.Select
                      value={cadetEditForm.nccYear}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleCadetEditChange('nccYear', e.target.value)}
                      isInvalid={Boolean(cadetEditErrors.nccYear)}
                    >
                      <option value="" disabled>Select Year</option>
                      {YEAR_OPTIONS.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </Form.Select>
                    {cadetEditErrors.nccYear && <Form.Text className="text-danger">{cadetEditErrors.nccYear}</Form.Text>}
                  </Form.Group>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Group controlId="editCadetPlatoon">
                    <Form.Label>Platoon *</Form.Label>
                    <Form.Select
                      value={cadetEditForm.platoon}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleCadetEditChange('platoon', e.target.value)}
                      isInvalid={Boolean(cadetEditErrors.platoon)}
                    >
                      <option value="" disabled>Select Platoon</option>
                      {PLATOONS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </Form.Select>
                    {cadetEditErrors.platoon && <Form.Text className="text-danger">{cadetEditErrors.platoon}</Form.Text>}
                  </Form.Group>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Group controlId="editCadetEnrollment">
                    <Form.Label>Date of Enrollment *</Form.Label>
                    <Form.Control
                      type="date"
                      value={cadetEditForm.dateOfEnrollment}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCadetEditChange('dateOfEnrollment', e.target.value)}
                      isInvalid={Boolean(cadetEditErrors.dateOfEnrollment)}
                    />
                    {cadetEditErrors.dateOfEnrollment && <Form.Text className="text-danger">{cadetEditErrors.dateOfEnrollment}</Form.Text>}
                  </Form.Group>
                </Col>
                <Col xs={12} md={3}>
                  <Form.Group controlId="editCadetAcademicYear">
                    <Form.Label>Academic Year *</Form.Label>
                    <Form.Select
                      value={cadetEditForm.year}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleCadetEditChange('year', e.target.value)}
                      isInvalid={Boolean(cadetEditErrors.year)}
                    >
                      <option value="" disabled>Select Year</option>
                      {YEAR_OPTIONS.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </Form.Select>
                    {cadetEditErrors.year && <Form.Text className="text-danger">{cadetEditErrors.year}</Form.Text>}
                  </Form.Group>
                </Col>
                <Col xs={12} md={3}>
                  <Form.Group controlId="editCadetDepartment">
                    <Form.Label>Department *</Form.Label>
                    <Form.Select
                      value={cadetEditForm.department}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleCadetEditChange('department', e.target.value)}
                      isInvalid={Boolean(cadetEditErrors.department)}
                    >
                      <option value="" disabled>Select Department</option>
                      {DEPARTMENTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </Form.Select>
                    {cadetEditErrors.department && <Form.Text className="text-danger">{cadetEditErrors.department}</Form.Text>}
                  </Form.Group>
                </Col>
                <Col xs={12} md={3}>
                  <Form.Group controlId="editCadetRoll">
                    <Form.Label>Roll Number *</Form.Label>
                    <Form.Control
                      type="text"
                      value={cadetEditForm.rollNo}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCadetEditChange('rollNo', e.target.value)}
                      isInvalid={Boolean(cadetEditErrors.rollNo)}
                    />
                    {cadetEditErrors.rollNo && <Form.Text className="text-danger">{cadetEditErrors.rollNo}</Form.Text>}
                  </Form.Group>
                </Col>
                <Col xs={12} md={3}>
                  <Form.Group controlId="editCadetRegister">
                    <Form.Label>Register Number *</Form.Label>
                    <Form.Control
                      type="number"
                      value={cadetEditForm.registerNumber}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCadetEditChange('registerNumber', e.target.value)}
                      onWheel={(e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur()}
                      min="0"
                      isInvalid={Boolean(cadetEditErrors.registerNumber)}
                    />
                    {cadetEditErrors.registerNumber && <Form.Text className="text-danger">{cadetEditErrors.registerNumber}</Form.Text>}
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeCadetView} disabled={saving}>Close</Button>
          {!cadetEditMode && (
            <Button variant="primary" onClick={() => setCadetEditMode(true)}>Edit</Button>
          )}
          {cadetEditMode && (
            <>
              <Button variant="outline-secondary" onClick={() => setCadetEditMode(false)} disabled={saving}>Cancel</Button>
              <Button variant="primary" onClick={requestSave} disabled={saving}>Save</Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      <Modal show={confirmSave} onHide={() => setConfirmSave(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Save</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Save profile changes for <strong>{cadetView?.name}</strong>?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmSave(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleUpdateCadet} disabled={saving}>Save</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CadetManagement;
