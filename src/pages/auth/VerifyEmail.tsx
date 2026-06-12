import { auth, db } from '@/shared/config/firebase';
import { mapFirebaseAuthError } from '@/shared/utils/firebaseErrors';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getDocs, query, updateDoc, where, doc } from 'firebase/firestore';
import React, { FormEvent, useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const VerifyEmail: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [error, setError] = useState('');

  const handleCheckVerification = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setVerified(null);
    setLoading(true);

    try {
      // Sign in to check email verification status
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Reload user to get latest emailVerified status from Firebase
      await user.reload();

      if (user.emailVerified) {
        // Update the pendingCadets document with emailVerified: true
        try {
          const pendingRef = collection(db, 'pendingCadets');
          const q = query(pendingRef, where('uid', '==', user.uid));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const pendingDoc = snapshot.docs[0];
            await updateDoc(doc(db, 'pendingCadets', pendingDoc.id), {
              emailVerified: true
            });
          }
        } catch (firestoreError) {
          console.warn('Could not update pendingCadets emailVerified status:', firestoreError);
          // Non-fatal: the email IS verified in Firebase Auth even if Firestore update fails
        }
        
        setVerified(true);
      } else {
        setVerified(false);
      }

      // Sign out immediately — user cannot access the app until admin approves
      await signOut(auth);
    } catch (err: any) {
      console.error('Verification check error:', err);
      setError(mapFirebaseAuthError(err?.code));
    } finally {
      setLoading(false);
    }
  };

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
                  <li className="mt-1">Come back here and click <strong>"Check Verification Status"</strong></li>
                </ol>
              </Alert>

              {/* Result messages */}
              {verified === true && (
                <Alert variant="success" className="mb-4">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  <strong>Email Verified Successfully!</strong>
                  <p className="mb-0 mt-1">
                    Your email has been verified. Please wait for the admin to approve your registration. 
                    You'll be able to login once approved.
                  </p>
                </Alert>
              )}

              {verified === false && (
                <Alert variant="warning" className="mb-4">
                  <i className="bi bi-clock-fill me-2"></i>
                  <strong>Email Not Yet Verified</strong>
                  <p className="mb-0 mt-1">
                    Your email hasn't been verified yet. Please click the verification link in the email 
                    sent to <strong>{email}</strong>. Don't forget to check your <strong>Spam / Junk folder</strong>.
                  </p>
                </Alert>
              )}

              {error && (
                <Alert variant="danger" className="mb-4">
                  <i className="bi bi-x-circle me-2"></i>
                  {error}
                </Alert>
              )}

              {/* Verification check form */}
              {verified !== true && (
                <Form onSubmit={handleCheckVerification}>
                  <Form.Group className="mb-3" controlId="verifyEmail">
                    <Form.Label>Email Address</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="Enter your registered email"
                      value={email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="verifyPassword">
                    <Form.Label>Password</Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                        required
                        className="pe-5"
                      />
                      <Button
                        variant="link"
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="position-absolute end-0 top-50 translate-middle-y text-muted p-0 me-2"
                      >
                        <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                      </Button>
                    </div>
                  </Form.Group>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-100"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-repeat me-2"></i>
                        Check Verification Status
                      </>
                    )}
                  </Button>
                </Form>
              )}

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
