import { useAuth } from "@/features/auth/AuthContext";
import { mapFirebaseAuthError } from "@/shared/utils/firebaseErrors";
import React, { FormEvent, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import "./ForgotPassword.css";

const ForgotPassword: React.FC = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState<{ email?: string }>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const errors: { email?: string } = {};
    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!email.includes("@")) {
      errors.email = "Valid email is required";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;
    setError("");
    setMessage("");
    try {
      setLoading(true);
      await resetPassword(email);
      setMessage(
        "Password reset link sent! Check your inbox and Spam/Junk folder.",
      );
      setEmail("");
    } catch (err: any) {
      setError(mapFirebaseAuthError(err?.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6} lg={5}>
          <Card className="shadow">
            <Card.Body className="p-5">
              <div className="text-center mb-4">
                <i className="bi bi-envelope-paper text-primary forgot-hero-icon"></i>
                <h2 className="mt-3">Forgot Password</h2>
                <p className="text-muted">We'll email you a reset link</p>
              </div>

              {error && <Alert variant="danger">{error}</Alert>}
              {message && <Alert variant="success">{message}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="email">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setEmail(e.target.value);
                      if (formErrors.email)
                        setFormErrors({ ...formErrors, email: undefined });
                    }}
                    isInvalid={!!formErrors.email}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.email}
                  </Form.Control.Feedback>
                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-100"
                  disabled={loading}
                >
                  {loading ? "Sending…" : "Send Reset Link"}
                </Button>
              </Form>

              <hr className="my-4" />
              <div className="text-center">
                <Link to="/login">Back to Login</Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ForgotPassword;
