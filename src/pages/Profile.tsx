import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, Modal, Row, Spinner } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

interface UserProfile {
  name: string;
  email: string;
  role: string;
  dateOfBirth?: string;
  division?: 'SD' | 'SW';
  regimentalNumber?: string;
  platoon?: 'Alpha' | 'Bravo' | 'Charlie' | 'Delta';
  dateOfEnrollment?: string;
  year?: string;
  department?: string;
  rollNo?: string;
  registerNumber?: string;
  phone?: string;
  bloodGroup?: string;
  address?: string;
  rank?: string;
}

const Profile: React.FC = () => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const [editForm, setEditForm] = useState({
    name: '',
    platoon: '' as 'Alpha' | 'Bravo' | 'Charlie' | 'Delta' | '',
  });

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
            platoon: data.platoon || '',
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
        platoon: profile.platoon || '',
      });
      setShowEditModal(true);
    }
  };

  const handleSaveChanges = async () => {
    if (!currentUser || !profile) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name: editForm.name,
        platoon: editForm.platoon || null,
      });

      setProfile({
        ...profile,
        name: editForm.name,
        platoon: editForm.platoon as any,
      });

      toast.success('Profile updated successfully');
      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
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

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col xs={12} md={10} lg={8}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
              <h3 className="mb-0">
                <i className="bi bi-person-circle me-2"></i>
                My Profile
              </h3>
              <Button variant="light" size="sm" onClick={handleOpenEdit}>
                <i className="bi bi-pencil me-1"></i>
                Edit
              </Button>
            </Card.Header>
            <Card.Body className="p-4">
              {/* Personal Information */}
              <h5 className="mb-3 text-primary">
                <i className="bi bi-person-fill me-2"></i>
                Personal Information
              </h5>
              <Row className="mb-4">
                <Col xs={12} sm={6} className="mb-3">
                  <Form.Label className="fw-bold text-muted small">Full Name</Form.Label>
                  <div className="d-flex align-items-center">
                    <p className="mb-0">{profile.name}</p>
                    <Badge bg="success" className="ms-2">Editable</Badge>
                  </div>
                </Col>
                <Col xs={12} sm={6} className="mb-3">
                  <Form.Label className="fw-bold text-muted small">Email</Form.Label>
                  <p className="mb-0">{profile.email}</p>
                </Col>
                <Col xs={12} sm={6} className="mb-3">
                  <Form.Label className="fw-bold text-muted small">Role</Form.Label>
                  <div>
                    <Badge bg={
                      profile.role === 'superadmin' ? 'danger' :
                      profile.role === 'admin' ? 'primary' :
                      profile.role === 'subadmin' ? 'info' : 'secondary'
                    }>
                      {profile.role.toUpperCase()}
                    </Badge>
                  </div>
                </Col>
              </Row>

              <hr />

              {/* NCC Details */}
              <h5 className="mb-3 text-primary">
                <i className="bi bi-shield-fill me-2"></i>
                NCC Details
              </h5>
              <Row className="mb-4">
                <Col xs={12} sm={6} className="mb-3">
                  <Form.Label className="fw-bold text-muted small">Division</Form.Label>
                  <div>
                    {profile.division ? (
                      <Badge bg={profile.division === 'SD' ? 'info' : 'warning'}>
                        {profile.division}
                      </Badge>
                    ) : (
                      <span className="text-muted">Not set</span>
                    )}
                  </div>
                </Col>
                <Col xs={12} sm={6} className="mb-3">
                  <Form.Label className="fw-bold text-muted small">Regimental Number</Form.Label>
                  <p className="mb-0">{profile.regimentalNumber || '-'}</p>
                </Col>
                <Col xs={12} sm={6} className="mb-3">
                  <Form.Label className="fw-bold text-muted small">Platoon</Form.Label>
                  <div className="d-flex align-items-center">
                    {profile.platoon ? (
                      <Badge bg="secondary">{profile.platoon}</Badge>
                    ) : (
                      <span className="text-muted">Not set</span>
                    )}
                    <Badge bg="success" className="ms-2">Editable</Badge>
                  </div>
                </Col>
              </Row>

              {/* Cadet Data */}
              {profile.role === 'member' && (
                <>
                  <hr />
                  <h5 className="mb-3 text-primary">
                    <i className="bi bi-mortarboard-fill me-2"></i>
                    Academic Details
                  </h5>
                  <Row className="mb-4">
                    <Col xs={12} sm={6} className="mb-3">
                      <Form.Label className="fw-bold text-muted small">Register Number</Form.Label>
                      <p className="mb-0">{profile.registerNumber || '-'}</p>
                    </Col>
                    <Col xs={12} sm={6} className="mb-3">
                      <Form.Label className="fw-bold text-muted small">Roll No</Form.Label>
                      <p className="mb-0">{profile.rollNo || '-'}</p>
                    </Col>
                    <Col xs={12} sm={6} className="mb-3">
                      <Form.Label className="fw-bold text-muted small">Year</Form.Label>
                      <p className="mb-0">{profile.year || '-'}</p>
                    </Col>
                    <Col xs={12} sm={6} className="mb-3">
                      <Form.Label className="fw-bold text-muted small">Department</Form.Label>
                      <p className="mb-0">{profile.department || '-'}</p>
                    </Col>
                    <Col xs={12} sm={6} className="mb-3">
                      <Form.Label className="fw-bold text-muted small">Rank</Form.Label>
                      <p className="mb-0">{profile.rank || '-'}</p>
                    </Col>
                  </Row>

                  <hr />

                  <h5 className="mb-3 text-primary">
                    <i className="bi bi-shield me-2"></i>
                    NCC Details
                  </h5>
                  <Row className="mb-4">
                    <Col xs={12} sm={6} className="mb-3">
                      <Form.Label className="fw-bold text-muted small">Regimental Number</Form.Label>
                      <p className="mb-0">{profile.regimentalNumber || '-'}</p>
                    </Col>
                    <Col xs={12} sm={6} className="mb-3">
                      <Form.Label className="fw-bold text-muted small">Date of Enrollment</Form.Label>
                      <p className="mb-0">{profile.dateOfEnrollment ? new Date(profile.dateOfEnrollment).toLocaleDateString() : '-'}</p>
                    </Col>
                    <Col xs={12} sm={6} className="mb-3">
                      <Form.Label className="fw-bold text-muted small">Date of Birth</Form.Label>
                      <p className="mb-0">{profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : '-'}</p>
                    </Col>
                  </Row>

                  <hr />

                  <h5 className="mb-3 text-primary">
                    <i className="bi bi-telephone-fill me-2"></i>
                    Contact Information
                  </h5>
                  <Row className="mb-4">
                    <Col xs={12} sm={6} className="mb-3">
                      <Form.Label className="fw-bold text-muted small">Phone</Form.Label>
                      <p className="mb-0">{profile.phone || '-'}</p>
                    </Col>
                    <Col xs={12} sm={6} className="mb-3">
                      <Form.Label className="fw-bold text-muted small">Blood Group</Form.Label>
                      <p className="mb-0">{profile.bloodGroup || '-'}</p>
                    </Col>
                    <Col xs={12} className="mb-3">
                      <Form.Label className="fw-bold text-muted small">Address</Form.Label>
                      <p className="mb-0">{profile.address || '-'}</p>
                    </Col>
                  </Row>
                </>
              )}

              <Alert variant="info" className="mt-3">
                <i className="bi bi-info-circle me-2"></i>
                Fields marked with <Badge bg="success">Editable</Badge> can be modified. Other fields are read-only.
              </Alert>
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter your full name"
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="editPlatoon">
              <Form.Label>Platoon</Form.Label>
              <Form.Select
                value={editForm.platoon}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditForm({ ...editForm, platoon: e.target.value as any })}
              >
                <option value="">Select Platoon</option>
                <option value="Alpha">Alpha</option>
                <option value="Bravo">Bravo</option>
                <option value="Charlie">Charlie</option>
                <option value="Delta">Delta</option>
              </Form.Select>
            </Form.Group>

            <Alert variant="warning" className="small">
              <i className="bi bi-exclamation-triangle me-2"></i>
              Other fields can only be modified by administrators.
            </Alert>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveChanges} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Profile;
