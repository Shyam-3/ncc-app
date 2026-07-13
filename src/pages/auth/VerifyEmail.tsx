import React from 'react';
import { Alert, Card, Col, Container, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const VerifyEmail: React.FC = () => {
  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={7} lg={6} xl={5}>
          <Card className="shadow">
            <Card.Body className="p-4 p-md-5">
              <div className="text-center mb-4">
                <i className="bi bi-envelope-check text-primary" style={{ fontSize: '64px' }}></i>
                <h2 className="mt-3">Verify Your Email</h2>
                <p className="text-muted">
                  A verification email has been sent to your registered email address.
                </p>
              </div>

              {/* Steps */}
              <Alert variant="info" className="mb-4">
                <h6 className="alert-heading mb-2">
                  <i className="bi bi-list-ol me-2"></i>Follow these steps:
                </h6>
                <ol className="mb-0 ps-3">
                  <li>Check your email inbox for a verification link from Firebase</li>
                  <li className="mt-1">
                    <strong>
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      Also check your Spam / Junk folder
                    </strong> — the email may land there
                  </li>
                  <li className="mt-1">Click the verification link in the email</li>
                  <li className="mt-1">
                    Come back and <strong><Link to="/login">Login</Link></strong> with your credentials
                  </li>
                </ol>
              </Alert>

              <Alert variant="success" className="mb-4">
                <i className="bi bi-info-circle-fill me-2"></i>
                <strong>After verifying your email,</strong> simply log in with your email and password.
                Your verification status will be updated automatically. Once verified, wait for admin approval to access the app.
              </Alert>

              <hr className="my-4" />

              <div className="text-center">
                <p className="mb-2">
                  <Link to="/login" className="text-decoration-none">
                    <i className="bi bi-box-arrow-in-right me-1"></i>
                    Back to Login
                  </Link>
                </p>
                <p className="mb-0">
                  <Link to="/register" className="text-decoration-none">
                    <i className="bi bi-person-plus me-1"></i>
                    Register a new account
                  </Link>
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default VerifyEmail;
