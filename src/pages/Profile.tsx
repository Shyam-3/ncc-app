import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, Modal, Row, Spinner } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { ACADEMIC_YEARS, DEPARTMENTS, NCC_RANKS, PLATOONS, ROMAN_YEAR_MAP } from '../config/constants';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

interface UserProfile {
  name: string;
  email: string;
  role: string;
  status?: 'pending' | 'active' | 'inactive' | 'rejected';
  dateOfBirth?: string;
  division?: 'SD' | 'SW';
  regimentalNumber?: string;
  platoon?: 'Alpha' | 'Bravo' | 'Charlie' | 'Delta';
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
}

const Profile: React.FC = () => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  
  const [editForm, setEditForm] = useState({
    name: '',
    regimentalNumber: '',
    platoon: '',
    dateOfEnrollment: '',
    nccYear: '',
    rank: 'CDT',
    year: '',
    department: '',
    rollNo: '',
    registerNumber: '',
    phone: '',
    bloodGroup: '',
    address: '',
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const isAdminEditor = profile?.role === 'admin' || profile?.role === 'superadmin';
  const YEAR_OPTIONS = ACADEMIC_YEARS.filter(y => y !== '4th Year');
  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          setProfile(data);
          setEditForm({
            name: data.name || '',
            regimentalNumber: data.regimentalNumber || '',
            platoon: data.platoon || '',
            dateOfEnrollment: data.dateOfEnrollment || '',
            nccYear: data.nccYear || '1st Year',
            rank: data.rank || 'CDT',
            year: data.year || '1st Year',
            department: data.department || '',
            rollNo: data.rollNo || '',
            registerNumber: data.registerNumber || '',
            phone: data.phone || '',
            bloodGroup: data.bloodGroup || '',
            address: data.address || '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser]);

  const handleOpenEdit = () => {
    if (profile) {
      setEditForm({
        name: profile.name || '',
        regimentalNumber: profile.regimentalNumber || '',
        platoon: profile.platoon || '',
        dateOfEnrollment: profile.dateOfEnrollment || '',
        nccYear: profile.nccYear || '1st Year',
        rank: profile.rank || 'CDT',
        year: profile.year || '1st Year',
        department: profile.department || '',
        rollNo: profile.rollNo || '',
        registerNumber: profile.registerNumber || '',
        phone: profile.phone || '',
        bloodGroup: profile.bloodGroup || '',
        address: profile.address || '',
      });
      setEditErrors({});
      setShowEditModal(true);
    }
  };

  const handleEditChange = (name: string, value: string) => {
    if (editErrors[name]) {
      setEditErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setEditForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateEditForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!editForm.name.trim()) {
      nextErrors.name = 'Full name is required';
    }

    if (!editForm.phone.trim()) {
      nextErrors.phone = 'Phone number is required';
    } else if (!editForm.phone.match(/^\d{10}$/)) {
      nextErrors.phone = 'Phone number must be exactly 10 digits';
    }

    if (!editForm.bloodGroup.trim()) {
      nextErrors.bloodGroup = 'Blood group is required';
    } else if (!editForm.bloodGroup.match(/^(A\+|A-|B\+|B-|AB\+|AB-|O\+|O-)$/)) {
      nextErrors.bloodGroup = 'Invalid blood group';
    }

    if (isAdminEditor) {
      if (!editForm.regimentalNumber.trim()) nextErrors.regimentalNumber = 'Regimental number is required';
      if (!editForm.platoon) nextErrors.platoon = 'Platoon is required';
      if (!editForm.dateOfEnrollment) nextErrors.dateOfEnrollment = 'Date of enrollment is required';
      if (!editForm.nccYear) nextErrors.nccYear = 'NCC year is required';
      if (!editForm.rank) nextErrors.rank = 'Rank is required';
      if (!editForm.year) nextErrors.year = 'Academic year is required';
      if (!editForm.department) nextErrors.department = 'Department is required';
      if (!editForm.rollNo.trim()) nextErrors.rollNo = 'Roll number is required';
      if (!editForm.registerNumber.trim()) {
        nextErrors.registerNumber = 'Register number is required';
      } else if (!editForm.registerNumber.match(/^\d{16}$/)) {
        nextErrors.registerNumber = 'Register number must be exactly 16 digits';
      }
    }

    setEditErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveChanges = async () => {
    if (!currentUser || !profile) return;
    if (!validateEditForm()) return;

    setSaving(true);
    try {
      if (isAdminEditor) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          name: editForm.name,
          regimentalNumber: editForm.regimentalNumber,
          platoon: editForm.platoon,
          dateOfEnrollment: editForm.dateOfEnrollment,
          nccYear: editForm.nccYear,
          rank: editForm.rank,
          year: editForm.year,
          department: editForm.department,
          rollNo: editForm.rollNo,
          registerNumber: editForm.registerNumber,
          phone: editForm.phone,
          bloodGroup: editForm.bloodGroup,
          address: editForm.address || '',
        });

        setProfile({
          ...profile,
          name: editForm.name,
          regimentalNumber: editForm.regimentalNumber,
          platoon: editForm.platoon as any,
          dateOfEnrollment: editForm.dateOfEnrollment,
          nccYear: editForm.nccYear,
          rank: editForm.rank,
          year: editForm.year,
          department: editForm.department,
          rollNo: editForm.rollNo,
          registerNumber: editForm.registerNumber,
          phone: editForm.phone,
          bloodGroup: editForm.bloodGroup,
          address: editForm.address || '',
        });
      } else {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          name: editForm.name,
          phone: editForm.phone,
          bloodGroup: editForm.bloodGroup,
          address: editForm.address || '',
        });

        setProfile({
          ...profile,
          name: editForm.name,
          phone: editForm.phone,
          bloodGroup: editForm.bloodGroup,
          address: editForm.address || '',
        });
      }

      toast.success('Profile updated successfully');
      setShowEditModal(false);
      setConfirmSave(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestSave = () => {
    if (!validateEditForm()) return;
    setConfirmSave(true);
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p className="mt-3">Loading profile...</p>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container className="py-5">
        <Alert variant="warning">Profile not found</Alert>
      </Container>
    );
  }

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

  const getNccYear = (value?: string) => formatYear(value || '1st Year');

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col xs={12} md={10} lg={8}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
              <h3 className="mb-0">
                <i className="bi bi-person-circle me-2"></i>
                Profile
              </h3>
              <Button variant="light" size="sm" onClick={handleOpenEdit}>
                <i className="bi bi-pencil me-1"></i>
                Edit
              </Button>
            </Card.Header>
            <Card.Body className="p-4">
              <h5 className="mb-3 text-primary">
                <i className="bi bi-person-fill me-2"></i>
                Personal
              </h5>
              <Row className="mb-4 g-3">
                <Col xs={12} md={6}>
                  <Form.Label className="fw-bold text-muted small">Name</Form.Label>
                  <p className="mb-0">{profile.name || '-'}</p>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Label className="fw-bold text-muted small">Date of Birth</Form.Label>
                  <p className="mb-0">{formatDate(profile.dateOfBirth)}</p>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Label className="fw-bold text-muted small">Email</Form.Label>
                  <p className="mb-0">{profile.email || '-'}</p>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Label className="fw-bold text-muted small">Account Status</Form.Label>
                  <div>
                    <Badge bg={profile.status === 'active' ? 'success' : profile.status === 'pending' ? 'warning' : 'secondary'}>
                      {(profile.status || 'unknown').toString().toUpperCase()}
                    </Badge>
                    <Badge
                      bg={
                        profile.role === 'superadmin' ? 'danger' :
                        profile.role === 'admin' ? 'primary' :
                        profile.role === 'subadmin' ? 'info' : 'secondary'
                      }
                      className="ms-2"
                    >
                      {profile.role.toUpperCase()}
                    </Badge>
                  </div>
                </Col>
              </Row>

              <hr />

              <h5 className="mb-3 text-primary">
                <i className="bi bi-shield-fill me-2"></i>
                NCC
              </h5>
              <Row className="mb-4 g-3">
                <Col xs={12} md={4}>
                  <Form.Label className="fw-bold text-muted small">Division</Form.Label>
                  <div>
                    {profile.division ? (
                      <Badge bg={profile.division === 'SD' ? 'info' : 'warning'}>
                        {profile.division}
                      </Badge>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </div>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Label className="fw-bold text-muted small">Rank</Form.Label>
                  <p className="mb-0">{getRankName(profile.rank || 'CDT')}</p>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Label className="fw-bold text-muted small">Regimental Number</Form.Label>
                  <p className="mb-0">{profile.regimentalNumber || '-'}</p>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Label className="fw-bold text-muted small">Year</Form.Label>
                  <p className="mb-0">{getNccYear(profile.nccYear)}</p>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Label className="fw-bold text-muted small">Platoon</Form.Label>
                  <div>
                    {profile.platoon ? (
                      <Badge bg="secondary">{profile.platoon}</Badge>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </div>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Label className="fw-bold text-muted small">Date of Enrollment</Form.Label>
                  <p className="mb-0">{formatDate(profile.dateOfEnrollment)}</p>
                </Col>
              </Row>

              <hr />

              <h5 className="mb-3 text-primary">
                <i className="bi bi-mortarboard-fill me-2"></i>
                Academic
              </h5>
              <Row className="mb-4 g-3">
                <Col xs={12} md={3}>
                  <Form.Label className="fw-bold text-muted small">Year</Form.Label>
                  <p className="mb-0">{formatYear(profile.year || '1st Year')}</p>
                </Col>
                <Col xs={12} md={3}>
                  <Form.Label className="fw-bold text-muted small">Department</Form.Label>
                  <p className="mb-0">{profile.department || '-'}</p>
                </Col>
                <Col xs={12} md={3}>
                  <Form.Label className="fw-bold text-muted small">Roll Number</Form.Label>
                  <p className="mb-0">{profile.rollNo || '-'}</p>
                </Col>
                <Col xs={12} md={3}>
                  <Form.Label className="fw-bold text-muted small">Register Number</Form.Label>
                  <p className="mb-0">{profile.registerNumber || '-'}</p>
                </Col>
              </Row>

              <hr />

              <h5 className="mb-3 text-primary">
                <i className="bi bi-telephone-fill me-2"></i>
                Additional
              </h5>
              <Row className="mb-4 g-3">
                <Col xs={12} md={4}>
                  <Form.Label className="fw-bold text-muted small">Phone Number</Form.Label>
                  <p className="mb-0">+91 {profile.phone || '-'}</p>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Label className="fw-bold text-muted small">Blood Group</Form.Label>
                  <p className="mb-0">{profile.bloodGroup || '-'}</p>
                </Col>
                <Col xs={12} md={12}>
                  <Form.Label className="fw-bold text-muted small">Address</Form.Label>
                  <p className="mb-0">{profile.address || '-'}</p>
                </Col>
              </Row>

            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="editName">
              <Form.Label>Full Name *</Form.Label>
              <Form.Control
                type="text"
                value={editForm.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleEditChange('name', e.target.value)}
                placeholder="Enter your full name"
                isInvalid={Boolean(editErrors.name)}
              />
              {editErrors.name && <Form.Text className="text-danger d-block mt-1">{editErrors.name}</Form.Text>}
            </Form.Group>

            {isAdminEditor && (
              <>
                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="editRegimentalNumber">
                      <Form.Label>Regimental Number *</Form.Label>
                      <Form.Control
                        type="text"
                        value={editForm.regimentalNumber}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleEditChange('regimentalNumber', e.target.value)}
                        isInvalid={Boolean(editErrors.regimentalNumber)}
                      />
                      {editErrors.regimentalNumber && <Form.Text className="text-danger d-block mt-1">{editErrors.regimentalNumber}</Form.Text>}
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="editPlatoon">
                      <Form.Label>Platoon *</Form.Label>
                      <Form.Select
                        value={editForm.platoon}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleEditChange('platoon', e.target.value)}
                        isInvalid={Boolean(editErrors.platoon)}
                      >
                        <option value="" disabled>Select Platoon</option>
                        {PLATOONS.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </Form.Select>
                      {editErrors.platoon && <Form.Text className="text-danger d-block mt-1">{editErrors.platoon}</Form.Text>}
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="editDateOfEnrollment">
                      <Form.Label>Date of Enrollment *</Form.Label>
                      <Form.Control
                        type="date"
                        value={editForm.dateOfEnrollment}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleEditChange('dateOfEnrollment', e.target.value)}
                        isInvalid={Boolean(editErrors.dateOfEnrollment)}
                      />
                      {editErrors.dateOfEnrollment && <Form.Text className="text-danger d-block mt-1">{editErrors.dateOfEnrollment}</Form.Text>}
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="editNccYear">
                      <Form.Label>Year *</Form.Label>
                      <Form.Select
                        value={editForm.nccYear}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleEditChange('nccYear', e.target.value)}
                        isInvalid={Boolean(editErrors.nccYear)}
                      >
                        <option value="" disabled>Select Year</option>
                        {YEAR_OPTIONS.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </Form.Select>
                      {editErrors.nccYear && <Form.Text className="text-danger d-block mt-1">{editErrors.nccYear}</Form.Text>}
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="editRank">
                      <Form.Label>Rank *</Form.Label>
                      <Form.Select
                        value={editForm.rank}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleEditChange('rank', e.target.value)}
                        isInvalid={Boolean(editErrors.rank)}
                      >
                        <option value="" disabled>Select Rank</option>
                        {NCC_RANKS.map(r => (
                          <option key={r.code} value={r.code}>{r.name}</option>
                        ))}
                      </Form.Select>
                      {editErrors.rank && <Form.Text className="text-danger d-block mt-1">{editErrors.rank}</Form.Text>}
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="editAcademicYear">
                      <Form.Label>Academic Year *</Form.Label>
                      <Form.Select
                        value={editForm.year}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleEditChange('year', e.target.value)}
                        isInvalid={Boolean(editErrors.year)}
                      >
                        <option value="" disabled>Select Year</option>
                        {YEAR_OPTIONS.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </Form.Select>
                      {editErrors.year && <Form.Text className="text-danger d-block mt-1">{editErrors.year}</Form.Text>}
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="editDepartment">
                      <Form.Label>Department *</Form.Label>
                      <Form.Select
                        value={editForm.department}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleEditChange('department', e.target.value)}
                        isInvalid={Boolean(editErrors.department)}
                      >
                        <option value="" disabled>Select Department</option>
                        {DEPARTMENTS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </Form.Select>
                      {editErrors.department && <Form.Text className="text-danger d-block mt-1">{editErrors.department}</Form.Text>}
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={3}>
                    <Form.Group className="mb-3" controlId="editRollNo">
                      <Form.Label>Roll Number *</Form.Label>
                      <Form.Control
                        type="text"
                        value={editForm.rollNo}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleEditChange('rollNo', e.target.value)}
                        isInvalid={Boolean(editErrors.rollNo)}
                      />
                      {editErrors.rollNo && <Form.Text className="text-danger d-block mt-1">{editErrors.rollNo}</Form.Text>}
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={3}>
                    <Form.Group className="mb-3" controlId="editRegisterNumber">
                      <Form.Label>Register Number *</Form.Label>
                      <Form.Control
                        type="number"
                        value={editForm.registerNumber}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleEditChange('registerNumber', e.target.value)}
                        onWheel={(e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur()}
                        min="0"
                        isInvalid={Boolean(editErrors.registerNumber)}
                      />
                      {editErrors.registerNumber && <Form.Text className="text-danger d-block mt-1">{editErrors.registerNumber}</Form.Text>}
                    </Form.Group>
                  </Col>
                </Row>
              </>
            )}

            <Form.Group className="mb-3" controlId="editPhone">
              <Form.Label>Phone Number</Form.Label>
              <Form.Control
                type="number"
                value={editForm.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleEditChange('phone', e.target.value)}
                onWheel={(e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur()}
                placeholder="10-digit mobile"
                min="0"
                isInvalid={Boolean(editErrors.phone)}
              />
              {editErrors.phone && <Form.Text className="text-danger d-block mt-1">{editErrors.phone}</Form.Text>}
            </Form.Group>

            <Form.Group className="mb-3" controlId="editBloodGroup">
              <Form.Label>Blood Group</Form.Label>
              <Form.Select
                value={editForm.bloodGroup}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleEditChange('bloodGroup', e.target.value)}
                isInvalid={Boolean(editErrors.bloodGroup)}
              >
                <option value="" disabled>Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </Form.Select>
              {editErrors.bloodGroup && <Form.Text className="text-danger d-block mt-1">{editErrors.bloodGroup}</Form.Text>}
            </Form.Group>

            <Form.Group className="mb-3" controlId="editAddress">
              <Form.Label>Address</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={editForm.address}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleEditChange('address', e.target.value)}
                placeholder="Enter your full address"
              />
            </Form.Group>

            <Alert variant="warning" className="small">
              <i className="bi bi-exclamation-triangle me-2"></i>
              Only name and additional details can be modified by cadets.
            </Alert>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleRequestSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={confirmSave} onHide={() => setConfirmSave(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Save</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Save changes to your profile?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmSave(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveChanges} disabled={saving}>Save</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Profile;
