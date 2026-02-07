import React from 'react';
import { Button, Card, Carousel, Col, Container, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { AnimatedSection } from '../../components';
import { useAuth } from '../../contexts/AuthContext';

const Home: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <div>
      {/* Hero Carousel */}
      <Carousel fade interval={3000} indicators>
        <Carousel.Item>
          <img
            className="d-block w-100"
            src="https://images.unsplash.com/photo-1549880338-65ddcdfd017b?q=80&w=1600&auto=format&fit=crop"
            alt="Parade training"
            style={{ maxHeight: 520, objectFit: 'cover' }}
          />
          <Carousel.Caption className="text-start">
            <h1 className="fw-bold d-none d-md-block">NCC Army Wing</h1>
            <h3 className="fw-bold d-block d-md-none">NCC Army Wing</h3>
            <p className="lead mb-3 mb-md-4 d-none d-sm-block">Unity and Discipline — shaping future leaders.</p>
            {!currentUser && (
              <div>
                <Button as={Link} to="/register" variant="light" size="md" className="me-2 mb-2 mb-sm-0">Join NCC</Button>
                <Button as={Link} to="/about" variant="outline-light" size="md" className="d-none d-sm-inline-block">Learn More</Button>
              </div>
            )}
          </Carousel.Caption>
        </Carousel.Item>
        <Carousel.Item>
          <img
            className="d-block w-100"
            src="https://images.unsplash.com/photo-1507120410856-1f35574c3b45?q=80&w=1600&auto=format&fit=crop"
            alt="Social service activity"
            style={{ maxHeight: 520, objectFit: 'cover' }}
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
            className="d-block w-100"
            src="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=1600&auto=format&fit=crop"
            alt="Camps and adventures"
            style={{ maxHeight: 520, objectFit: 'cover' }}
          />
          <Carousel.Caption className="text-start">
            <h2 className="fw-semibold d-none d-md-block">Camps & Adventures</h2>
            <h4 className="fw-semibold d-block d-md-none">Camps & Adventures</h4>
            <p className="mb-3 mb-md-4 d-none d-sm-block">Build confidence with drills, treks, and leadership exercises.</p>
            <Button as={Link} to="/activities/camps" variant="primary" size="md">View Camps</Button>
          </Carousel.Caption>
        </Carousel.Item>
      </Carousel>

      {/* Features Section */}
      <Container className="my-5">
        <AnimatedSection effect="fade" delay={0.05}>
          <h2 className="text-center mb-5">What We Offer</h2>
        </AnimatedSection>
        <Row className="g-4 stagger">
          <Col xs={12} sm={6} md={4} lg={4} xl={4}>
            <Card className="h-100 text-center border-0 shadow-sm hover-lift">
              <Card.Body>
                <i className="bi bi-calendar-event text-primary" style={{ fontSize: '48px' }}></i>
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
                <i className="bi bi-clipboard-check text-success" style={{ fontSize: '48px' }}></i>
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
                <i className="bi bi-trophy text-warning" style={{ fontSize: '48px' }}></i>
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
                <i className="bi bi-book text-info" style={{ fontSize: '48px' }}></i>
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
                <i className="bi bi-people text-danger" style={{ fontSize: '48px' }}></i>
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
                <i className="bi bi-images text-purple" style={{ fontSize: '48px' }}></i>
                <Card.Title className="mt-3">Gallery</Card.Title>
                <Card.Text>
                  Browse photos and videos from camps, parades, and special events.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

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
      {!currentUser && (
        <AnimatedSection as={Container} className="my-5 text-center" effect="slide" delay={0.05}>
          <h2 className="mb-4">Ready to Join?</h2>
          <p className="lead mb-4">
            Become part of India's largest youth organization and develop leadership, discipline, and character.
          </p>
          <Button as={Link} to="/register" variant="primary" size="lg">
            Register Now
          </Button>
        </AnimatedSection>
      )}
    </div>
  );
};

export default Home;
