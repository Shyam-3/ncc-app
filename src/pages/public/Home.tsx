import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Carousel, Col, Container, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { AnimatedSection } from '../../components';
import { getActiveRecruitmentAnnouncements, listPublicAnnouncements, listAnnouncementsForUser } from '@/features/announcements/service';
import { useAuth } from '@/features/auth/AuthContext';
import type { Announcement } from '@/features/announcements/announcement.types';
import { ANNOUNCEMENT_CATEGORY_LABELS, ANNOUNCEMENT_CATEGORY_COLORS } from '@/shared/config/constants';
import { formatISTDate } from '@/shared/utils/dateTime';
import './Home.css';

const Home: React.FC = () => {
  const { currentUser } = useAuth();
  const [recruitmentAnnouncements, setRecruitmentAnnouncements] = useState<Announcement[]>([]);
  const [latestAnnouncements, setLatestAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    getActiveRecruitmentAnnouncements()
      .then(setRecruitmentAnnouncements)
      .catch(() => { });

    const fetchAnnouncements = currentUser ? listAnnouncementsForUser() : listPublicAnnouncements();
    
    fetchAnnouncements
      .then((all) => {
        const nonRecruitment = all.filter((a) => a.category !== 'recruitment');
        setLatestAnnouncements(nonRecruitment.slice(0, 4));
      })
      .catch(() => { });
  }, [currentUser]);

  const recruitment = recruitmentAnnouncements[0];

  return (
    <div>
      {/* Hero Carousel */}
      <Carousel fade interval={3000} indicators>
        <Carousel.Item>
          <img
            className="d-block w-100 home-hero-image"
            src="https://images.unsplash.com/photo-1549880338-65ddcdfd017b?q=80&w=1600&auto=format&fit=crop"
            alt="Parade training"
          />
          <Carousel.Caption className="text-start">
            <h1 className="fw-bold d-none d-md-block">NCC Army Wing</h1>
            <h3 className="fw-bold d-block d-md-none">NCC Army Wing</h3>
            <p className="lead mb-3 mb-md-4 d-none d-sm-block">Unity and Discipline — shaping future leaders.</p>
            <div>
              <Button as={Link} to="/register" variant="light" size="md" className="me-2 mb-2 mb-sm-0">Join NCC</Button>
              <Button as={Link} to="/about" variant="outline-light" size="md" className="d-none d-sm-inline-block">Learn More</Button>
            </div>
          </Carousel.Caption>
        </Carousel.Item>
        <Carousel.Item>
          <img
            className="d-block w-100 home-hero-image"
            src="https://images.unsplash.com/photo-1507120410856-1f35574c3b45?q=80&w=1600&auto=format&fit=crop"
            alt="Social service activity"
          />
          <Carousel.Caption className="text-start">
            <h2 className="fw-semibold d-none d-md-block">Community & Social Service</h2>
            <h4 className="fw-semibold d-block d-md-none">Community & Social Service</h4>
            <p className="mb-3 mb-md-4 d-none d-sm-block">Serve society through drives, awareness camps, and outreach.</p>
            <Button as={Link} to="/activities/social-service" variant="primary" size="md">Explore Activities</Button>
          </Carousel.Caption>
        </Carousel.Item>
        <Carousel.Item>
          <img
            className="d-block w-100 home-hero-image"
            src="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=1600&auto=format&fit=crop"
            alt="Camps and adventures"
          />
          <Carousel.Caption className="text-start">
            <h2 className="fw-semibold d-none d-md-block">Camps & Adventures</h2>
            <h4 className="fw-semibold d-block d-md-none">Camps & Adventures</h4>
            <p className="mb-3 mb-md-4 d-none d-sm-block">Build confidence with drills, treks, and leadership exercises.</p>
            <Button as={Link} to="/activities/camps" variant="primary" size="md">View Camps</Button>
          </Carousel.Caption>
        </Carousel.Item>
      </Carousel>

      {/* Recruitment Banner */}
      {recruitment && (
        <AnimatedSection effect="fade" delay={0.05}>
          <div className="home-recruitment-banner">
            <Container>
              <Row className="align-items-center justify-content-center text-center text-md-start">
                <Col md={8} lg={7}>
                  <h2 className="home-recruitment-title">
                    📢 {recruitment.title}
                  </h2>
                  <p className="home-recruitment-body">
                    {recruitment.body}
                  </p>
                  {recruitment.expiresAt && (
                    <p className="home-recruitment-expiry">
                      <i className="bi bi-clock me-1" />
                      Application closes on {' '}
                      {formatISTDate(recruitment.expiresAt, {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  )}
                </Col>
                <Col md={4} lg={3} className="mt-3 mt-md-0 text-center">
                  <Link
                    to="/recruitment"
                    className="btn btn-light btn-lg home-recruitment-cta"
                  >
                    Apply Now <i className="bi bi-arrow-right ms-1" />
                  </Link>
                </Col>
              </Row>
            </Container>
          </div>
        </AnimatedSection>
      )}

      {/* Features Section */}
      <Container className="my-5">
        <AnimatedSection effect="fade" delay={0.05}>
          <h2 className="text-center mb-5">What We Offer</h2>
        </AnimatedSection>
        <Row className="g-4 stagger">
          <Col xs={12} sm={6} md={4} lg={4} xl={4}>
            <Card className="h-100 text-center border-0 shadow-sm hover-lift">
              <Card.Body>
                <i className="bi bi-calendar-event text-primary home-feature-icon"></i>
                <Card.Title className="mt-3">Events & Camps</Card.Title>
                <Card.Text>
                  Participate in training camps, national celebrations, and community service activities.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4} lg={4} xl={4}>
            <Card className="h-100 text-center border-0 shadow-sm hover-lift">
              <Card.Body>
                <i className="bi bi-clipboard-check text-success home-feature-icon"></i>
                <Card.Title className="mt-3">Attendance Tracking</Card.Title>
                <Card.Text>
                  Modern digital attendance system with real-time monitoring and reports.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4} lg={4} xl={4}>
            <Card className="h-100 text-center border-0 shadow-sm hover-lift">
              <Card.Body>
                <i className="bi bi-trophy text-warning home-feature-icon"></i>
                <Card.Title className="mt-3">Achievements</Card.Title>
                <Card.Text>
                  Track your progress, earn certificates, and showcase your NCC achievements.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4} lg={4} xl={4}>
            <Card className="h-100 text-center border-0 shadow-sm hover-lift">
              <Card.Body>
                <i className="bi bi-book text-info home-feature-icon"></i>
                <Card.Title className="mt-3">Exam Preparation</Card.Title>
                <Card.Text>
                  Access study materials, practice tests, and resources for B & C certificate exams.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4} lg={4} xl={4}>
            <Card className="h-100 text-center border-0 shadow-sm hover-lift">
              <Card.Body>
                <i className="bi bi-people text-danger home-feature-icon"></i>
                <Card.Title className="mt-3">Alumni Network</Card.Title>
                <Card.Text>
                  Connect with alumni, get mentorship, and explore career opportunities.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4} lg={4} xl={4}>
            <Card className="h-100 text-center border-0 shadow-sm hover-lift">
              <Card.Body>
                <i className="bi bi-images text-purple home-feature-icon"></i>
                <Card.Title className="mt-3">Gallery</Card.Title>
                <Card.Text>
                  Browse photos and videos from camps, parades, and special events.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Latest Updates & Announcements */}
      <div className="bg-light py-5">
        <Container>
          <AnimatedSection effect="fade" delay={0.05}>
            <h2 className="text-center mb-2">Latest Updates & Announcements</h2>
            <p className="text-center text-muted mb-4">Stay informed about upcoming events, camps, and activities</p>
          </AnimatedSection>
          
          {latestAnnouncements.length > 0 ? (
            <>
              <Row className="g-4">
                {latestAnnouncements.map((ann) => (
                  <Col key={ann.id} xs={12} sm={6} lg={3}>
                    <Card className="h-100 border-0 shadow-sm hover-lift home-announcement-card">
                      <Card.Body className="d-flex flex-column">
                        <div className="mb-2">
                          <Badge bg={ANNOUNCEMENT_CATEGORY_COLORS[ann.category] || 'secondary'}>
                            {ANNOUNCEMENT_CATEGORY_LABELS[ann.category] || ann.category}
                          </Badge>
                        </div>
                        <Card.Title className="fs-6 fw-semibold">{ann.title}</Card.Title>
                        <Card.Text className="text-muted small flex-grow-1 home-announcement-body">
                          {ann.body.length > 100 ? `${ann.body.slice(0, 100)}…` : ann.body}
                        </Card.Text>
                        <div className="text-muted small mt-2">
                          <i className="bi bi-calendar3 me-1" />
                          {ann.createdAt?.toDate
                            ? formatISTDate(ann.createdAt.toDate())
                            : formatISTDate(ann.createdAt)}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
              <div className="text-center mt-4">
                <Button as={Link} to="/notifications" variant="outline-primary">
                  View All <i className="bi bi-arrow-right ms-1" />
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4 bg-white rounded shadow-sm border border-light">
              <i className="bi bi-bell-slash text-muted mb-2" style={{ fontSize: '2.5rem' }}></i>
              <h5 className="text-muted mt-2">No active announcements</h5>
              <p className="text-muted mb-0 small">Check back later for updates on camps and activities.</p>
            </div>
          )}
        </Container>
      </div>

      {/* Stats Section - NCC by the Numbers */}
      <AnimatedSection as="div" effect="fade" className="bg-light py-5" delay={0.1}>
        <Container>
          <h3 className="text-center mb-4 fw-bold">NCC by the Numbers</h3>
          <Row className="text-center stagger g-3">
            <Col xs={6} sm={6} md={3} lg={3} xl={3}>
              <h2 className="display-4 fw-bold text-primary">500+</h2>
              <p className="text-muted">Active Cadets</p>
            </Col>
            <Col xs={6} sm={6} md={3} lg={3} xl={3}>
              <h2 className="display-4 fw-bold text-success">50+</h2>
              <p className="text-muted">Events Per Year</p>
            </Col>
            <Col xs={6} sm={6} md={3} lg={3} xl={3}>
              <h2 className="display-4 fw-bold text-warning">25+</h2>
              <p className="text-muted">Years of Excellence</p>
            </Col>
            <Col xs={6} sm={6} md={3} lg={3} xl={3}>
              <h2 className="display-4 fw-bold text-danger">1000+</h2>
              <p className="text-muted">Alumni</p>
            </Col>
          </Row>
        </Container>
      </AnimatedSection>

      {/* CTA Section */}
      <AnimatedSection as={Container} className="my-5 text-center" effect="slide" delay={0.05}>
        <h2 className="mb-4">Ready to Join?</h2>
        <p className="lead mb-4">
          Become part of India's largest youth organization and develop leadership, discipline, and character.
        </p>
        <Button as={Link} to="/register" variant="primary" size="lg">
          Register Now
        </Button>
      </AnimatedSection>
    </div>
  );
};

export default Home;
