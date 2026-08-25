import { auth, db } from '@/shared/config/firebase';
import { mapFirebaseAuthError } from '@/shared/utils/firebaseErrors';
import { sendEmailVerification, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getDocs, query, updateDoc, where, doc, getDoc } from 'firebase/firestore';
import React, { FormEvent, useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const VerifyEmail: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [userStatus, setUserStatus] = useState<'authenticated' | 'pending' | 'unknown' | null>(null);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<{email?: string; password?: string}>({});

  const validateForm = (): boolean => {
    const errors: {email?: string; password?: string} = {};
    if (!email.trim()) {
      errors.email = 'Email is required';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCheckVerification = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;
    setError('');
    setVerified(null);
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await user.reload();
      const isVerified = user.emailVerified;

      let status: 'authenticated' | 'pending' | 'unknown' = 'unknown';

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const alumniDoc = await getDoc(doc(db, 'alumni', user.uid));
      
      if (userDoc.exists() || alumniDoc.exists()) {
        status = 'authenticated';
      } else {
        const pendingRef = collection(db, 'pendingCadets');
        const q = query(pendingRef, where('uid', '==', user.uid));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          status = 'pending';
          
          if (isVerified) {
            try {
              const pendingDoc = snapshot.docs[0];
              await updateDoc(doc(db, 'pendingCadets', pendingDoc.id), {
                emailVerified: true
              });
            } catch (firestoreError) {
              console.warn('Could not update pendingCadets emailVerified status:', firestoreError);
            }
          }
        }
      }

      setVerified(isVerified);
      setUserStatus(status);

      await signOut(auth);
    } catch (err: any) {
      console.error('Verification check error:', err);
      if (err?.code === 'auth/invalid-credential') {
        setError('Invalid credentials. If you forgot your password or reset it, please use the Login page instead.');
      } else {
        setError(mapFirebaseAuthError(err?.code));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!validateForm()) return;
    setError('');
    setResendLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      await signOut(auth);
      toast.success('Verification link sent! Check your inbox and spam folder.');
    } catch (err: any) {
      console.error('Resend error:', err);
      if (err?.code === 'auth/invalid-credential') {
        setError('Invalid credentials. If you forgot your password or reset it, please use the Login page instead.');
      } else if (err?.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a few minutes before trying again.');
      } else {
        setError(mapFirebaseAuthError(err?.code));
      }
    } finally {
      setResendLoading(false);
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
              {userStatus === 'authenticated' && (
                <Alert variant="success" className="mb-4">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  <strong>Already Registered!</strong>
                  <p className="mb-0 mt-1">
                    Your account is fully active and verified. You can head straight to the login page to access your dashboard.
                  </p>
                </Alert>
              )}

              {userStatus === 'pending' && verified === true && (
                <Alert variant="success" className="mb-4">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  <strong>Email Verified Successfully!</strong>
                  <p className="mb-0 mt-1">
                    Your email has been verified. Please wait for the admin to approve your registration. 
                    You'll be able to login once approved.
                  </p>
                </Alert>
              )}

              {userStatus === 'pending' && verified === false && (
                <Alert variant="warning" className="mb-4">
                  <i className="bi bi-clock-fill me-2"></i>
                  <strong>Email Not Yet Verified</strong>
                  <p className="mb-0 mt-1">
                    Your email hasn't been verified yet. Please click the verification link in the email 
                    sent to <strong>{email}</strong>. Don't forget to check your <strong>Spam / Junk folder</strong>.
                  </p>
                </Alert>
              )}

              {userStatus === 'unknown' && (
                <Alert variant="warning" className="mb-4">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  <strong>Account Not Found</strong>
                  <p className="mb-0 mt-1">
                    We couldn't find a valid registration record for this email. You may have been rejected by an admin, or your registration didn't complete. Please register again.
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
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setEmail(e.target.value);
                        if (formErrors.email) setFormErrors({ ...formErrors, email: undefined });
                      }}
                      isInvalid={!!formErrors.email}
                    />
                    <Form.Control.Feedback type="invalid">
                      {formErrors.email}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="verifyPassword">
                    <Form.Label>Password</Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setPassword(e.target.value);
                          if (formErrors.password) setFormErrors({ ...formErrors, password: undefined });
                        }}
                        className="pe-5"
                        isInvalid={!!formErrors.password}
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
                    {formErrors.password && <div className="invalid-feedback d-block">{formErrors.password}</div>}
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
                        <Spinner as="span" animation="border" size="sm" className="me-2"  />
                        Checking...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-repeat me-2"></i>
                        Check Verification Status
                      </>
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline-secondary"
                    className="w-100 mt-3"
                    size="lg"
                    onClick={handleResendEmail}
                    disabled={loading || resendLoading}
                  >
                    {resendLoading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-envelope-paper me-2"></i>
                        Resend Verification Email
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
