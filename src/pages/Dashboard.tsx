import { collection, getDocs, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Col, Container, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { AnimatedSection } from '../components';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      if (userProfile?.role === 'admin' || userProfile?.role === 'superadmin') {
        try {
          const [pendingSnap, usersSnap] = await Promise.all([
            getDocs(query(collection(db, 'pendingCadets'))),
            getDocs(query(collection(db, 'users')))
          ]);
          
          const existingEmails = new Set(
            usersSnap.docs.map(d => d.data().email?.toLowerCase())
          );
          const actualPending = pendingSnap.docs.filter(
            d => !existingEmails.has(d.data().email?.toLowerCase())
          ).length;
          
          setPendingCount(actualPending);
        } catch (error) {
          console.error('Failed to fetch pending count:', error);
        }
      }
    };

    fetchPendingCount();
  }, [userProfile]);

  return (
    <Container className="py-5">
      <AnimatedSection effect="fade">
        <h2 className="mb-4">
          Welcome, {userProfile?.name || 'Cadet'}!
        </h2>
      </AnimatedSection>

      <AnimatedSection as={Row} className="g-4" effect="slide">
        {(userProfile?.role === 'admin' || userProfile?.role === 'superadmin') && (
          <Col xs={12} sm={6} md={4} lg={3} xl={3}>
            <Card className="text-center h-100 shadow-sm hover-lift">
              <Card.Body className="d-flex flex-column justify-content-between">
                <div>
                  <i className="bi bi-person-gear text-danger" style={{ fontSize: '48px' }}></i>
                  <h3 className="mt-3">Roles</h3>
                  <p className="text-muted small">Assign & modify</p>
                </div>
                <Button as={Link} to="/admin/roles" variant="danger" className="mt-2">
                  Manage
                </Button>
              </Card.Body>
            </Card>
          </Col>
        )}
        {(userProfile?.role === 'admin' || userProfile?.role === 'superadmin') && (
          <Col xs={12} sm={6} md={4} lg={3} xl={3}>
            <Card className="text-center h-100 shadow-sm hover-lift">
              <Card.Body className="d-flex flex-column justify-content-between">
                <div>
                  <i className="bi bi-person-badge text-danger" style={{ fontSize: '48px' }}></i>
                  <h3 className="mt-3">
                    Users
                    {pendingCount > 0 && (
                      <Badge bg="danger" className="ms-2" style={{ fontSize: '0.6em' }}>
                        {pendingCount}
                      </Badge>
                    )}
                  </h3>
                  <p className="text-muted small">Approvals & creds</p>
                </div>
                <Button as={Link} to="/admin/users" variant="danger" className="mt-2">
                  Open
                </Button>
              </Card.Body>
            </Card>
          </Col>
        )}

        {(userProfile?.role === 'admin' || userProfile?.role === 'superadmin' || userProfile?.role === 'subadmin') && (
          <>
            <Col xs={12} sm={6} md={4} lg={3} xl={3}>
              <Card className="text-center h-100 shadow-sm hover-lift">
                <Card.Body className="d-flex flex-column justify-content-between">
                  <div>
                    <i className="bi bi-people-fill text-primary" style={{ fontSize: '48px' }}></i>
                    <h3 className="mt-3">Cadets</h3>
                    <p className="text-muted small">Manage profiles</p>
                  </div>
                  <Button as={Link} to="/admin/cadets" variant="primary" className="mt-2">
                    Manage
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} md={4} lg={3} xl={3}>
              <Card className="text-center h-100 shadow-sm hover-lift">
                <Card.Body className="d-flex flex-column justify-content-between">
                  <div>
                    <i className="bi bi-clipboard-check text-success" style={{ fontSize: '48px' }}></i>
                    <h3 className="mt-3">Attendance</h3>
                    <p className="text-muted small">Mark & track</p>
                  </div>
                  <Button as={Link} to="/admin/attendance" variant="success" className="mt-2">
                    Manage
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} md={4} lg={3} xl={3}>
              <Card className="text-center h-100 shadow-sm hover-lift">
                <Card.Body className="d-flex flex-column justify-content-between">
                  <div>
                    <i className="bi bi-bell text-warning" style={{ fontSize: '48px' }}></i>
                    <h3 className="mt-3">Announcements</h3>
                    <p className="text-muted small">Publish updates</p>
                  </div>
                  <Button as={Link} to="/admin/announcements" variant="warning" className="mt-2">
                    Manage
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} md={4} lg={3} xl={3}>
              <Card className="text-center h-100 shadow-sm hover-lift">
                <Card.Body className="d-flex flex-column justify-content-between">
                  <div>
                    <i className="bi bi-clipboard-data text-danger" style={{ fontSize: '48px' }}></i>
                    <h3 className="mt-3">On-Duty</h3>
                    <p className="text-muted small">Duty reports</p>
                  </div>
                  <Button as={Link} to="/admin/reports/on-duty" variant="danger" className="mt-2">
                    Go
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} md={4} lg={3} xl={3}>
              <Card className="text-center h-100 shadow-sm hover-lift">
                <Card.Body className="d-flex flex-column justify-content-between">
                  <div>
                    <i className="bi bi-briefcase text-info" style={{ fontSize: '48px' }}></i>
                    <h3 className="mt-3">Duties</h3>
                    <p className="text-muted small">Duty rosters</p>
                  </div>
                  <Button as={Link} to="/admin/duties" variant="info" className="mt-2">
                    Manage
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </>
        )}

        {(userProfile?.role === 'admin' || userProfile?.role === 'superadmin') && (
          <>
            <Col xs={12} sm={6} md={4} lg={3} xl={3}>
              <Card className="text-center h-100 shadow-sm hover-lift">
                <Card.Body className="d-flex flex-column justify-content-between">
                  <div>
                    <i className="bi bi-file-earmark-text text-secondary" style={{ fontSize: '48px' }}></i>
                    <h3 className="mt-3">Reports</h3>
                    <p className="text-muted small">Analytics</p>
                  </div>
                  <Button as={Link} to="/admin/reports" variant="secondary" className="mt-2">
                    View
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} md={4} lg={3} xl={3}>
              <Card className="text-center h-100 shadow-sm hover-lift">
                <Card.Body className="d-flex flex-column justify-content-between">
                  <div>
                    <i className="bi bi-pencil-square text-info" style={{ fontSize: '48px' }}></i>
                    <h3 className="mt-3">CMS / About</h3>
                    <p className="text-muted small">Edit pages</p>
                  </div>
                  <Button as={Link} to="/admin/cms" variant="info" className="mt-2">
                    Edit
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </>
        )}

        {(userProfile?.role === 'admin' || userProfile?.role === 'superadmin' || userProfile?.role === 'subadmin') && (
          <Col xs={12} sm={6} md={4} lg={3} xl={3}>
            <Card className="text-center h-100 shadow-sm hover-lift">
              <Card.Body className="d-flex flex-column justify-content-between">
                <div>
                  <i className="bi bi-gear text-secondary" style={{ fontSize: '48px' }}></i>
                  <h3 className="mt-3">Settings</h3>
                  <p className="text-muted small">System config</p>
                </div>
                <Button as={Link} to="/admin/settings" variant="secondary" className="mt-2">
                  Configure
                </Button>
              </Card.Body>
            </Card>
          </Col>
        )}

        {(!userProfile?.role || (userProfile?.role !== 'admin' && userProfile?.role !== 'superadmin' && userProfile?.role !== 'subadmin')) && (
          <>
            <Col xs={12} sm={6} md={4} lg={4} xl={4}>
              <Card className="text-center h-100 shadow-sm hover-lift">
                <Card.Body className="d-flex flex-column justify-content-between">
                  <div>
                    <i className="bi bi-person-circle text-primary" style={{ fontSize: '48px' }}></i>
                    <h4 className="mt-3">My Profile</h4>
                    <p className="text-muted small">View & edit</p>
                  </div>
                  <Button as={Link} to="/profile" variant="primary" className="mt-2">
                    View Profile
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} md={4} lg={4} xl={4}>
              <Card className="text-center h-100 shadow-sm hover-lift">
                <Card.Body className="d-flex flex-column justify-content-between">
                  <div>
                    <i className="bi bi-clipboard-check text-success" style={{ fontSize: '48px' }}></i>
                    <h4 className="mt-3">Attendance</h4>
                    <p className="text-muted small">Your records</p>
                  </div>
                  <Button as={Link} to="/attendance" variant="success" className="mt-2">
                    View
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} md={4} lg={4} xl={4}>
              <Card className="text-center h-100 shadow-sm hover-lift">
                <Card.Body className="d-flex flex-column justify-content-between">
                  <div>
                    <i className="bi bi-calendar-event text-warning" style={{ fontSize: '48px' }}></i>
                    <h4 className="mt-3">Events</h4>
                    <p className="text-muted small">Upcoming</p>
                  </div>
                  <Button as={Link} to="/events" variant="warning" className="mt-2">
                    View Events
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} md={4} lg={4} xl={4}>
              <Card className="text-center h-100 shadow-sm hover-lift">
                <Card.Body className="d-flex flex-column justify-content-between">
                  <div>
                    <i className="bi bi-book text-info" style={{ fontSize: '48px' }}></i>
                    <h4 className="mt-3">Exam Prep</h4>
                    <p className="text-muted small">Study materials</p>
                  </div>
                  <Button as={Link} to="/exam-prep" variant="info" className="mt-2">
                    Start Learning
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} md={4} lg={4} xl={4}>
              <Card className="text-center h-100 shadow-sm hover-lift">
                <Card.Body className="d-flex flex-column justify-content-between">
                  <div>
                    <i className="bi bi-trophy text-danger" style={{ fontSize: '48px' }}></i>
                    <h4 className="mt-3">Achievements</h4>
                    <p className="text-muted small">Certificates</p>
                  </div>
                  <Button as={Link} to="/achievements" variant="danger" className="mt-2">
                    View
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} md={4} lg={4} xl={4}>
              <Card className="text-center h-100 shadow-sm hover-lift">
                <Card.Body className="d-flex flex-column justify-content-between">
                  <div>
                    <i className="bi bi-bell text-dark" style={{ fontSize: '48px' }}></i>
                    <h4 className="mt-3">Notifications</h4>
                    <p className="text-muted small">Announcements</p>
                  </div>
                  <Button as={Link} to="/notifications" variant="dark" className="mt-2">
                    View All
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </>
        )}
      </AnimatedSection>
    </Container>
  );
};

export default Dashboard;
