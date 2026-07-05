import { DEPARTMENT_DEFS } from '@/shared/config/constants';
import { db } from '@/shared/config/firebase';
import { addDoc, collection } from 'firebase/firestore';
import React, { ChangeEvent, FormEvent, useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const COOLDOWN_KEY = 'alumni_submit_cooldown';
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

interface FormState {
  name: string;
  division: 'SD' | 'SW' | '';
  department: string;
  passOutYear: string;
  email: string;
  phone: string;
  bloodGroup: string;
  batchYears: string;
  rank: string;
  achievements: string;
  website: string;
}

const AlumniSubmitForm: React.FC = () => {
  const [form, setForm] = useState<FormState>({
    name: '',
    division: '',
    department: '',
    passOutYear: '',
    email: '',
    phone: '',
    bloodGroup: '',
    batchYears: '',
    rank: '',
    achievements: '',
    website: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (form.website.trim()) {
      setSubmitted(true);
      return;
    }

    const lastSubmit = localStorage.getItem(COOLDOWN_KEY);
    if (lastSubmit && Date.now() - Number(lastSubmit) < COOLDOWN_MS) {
      toast.error('You can only submit one profile every 24 hours.');
      return;
    }

    if (!form.name.trim() || !form.division || !form.department || !form.passOutYear.trim()) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const rawData = {
        name: form.name.trim(),
        division: form.division,
        department: form.department,
        passOutYear: form.passOutYear.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        bloodGroup: form.bloodGroup || undefined,
        batchYears: form.batchYears.trim() || undefined,
        rank: form.rank.trim() || undefined,
        achievements: form.achievements.trim() || undefined,
        status: 'pending',
        visible: false,
        source: 'self_submit',
        createdAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
      };
      
      const data = Object.fromEntries(Object.entries(rawData).filter(([_, v]) => v !== undefined));

      await addDoc(collection(db, 'alumniProfiles'), data);

      localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      setSubmitted(true);
      toast.success('Profile submitted! It will appear after admin approval.');
    } catch (err) {
      console.error(err);
      toast.error('Submission failed. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={8}>
            <Card className="shadow text-center">
              <Card.Body className="p-5">
                <i className="bi bi-check-circle text-success display-4 mb-3"></i>
                <h3>Thank You!</h3>
                <p className="text-muted">
                  Your alumni profile has been submitted. A superadmin will review it before it appears on the public directory.
                </p>
                <Button as={Link} to="/alumni" variant="primary">View Alumni Directory</Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={9} lg={8}>
          <Card className="shadow">
            <Card.Body className="p-4 p-md-5">
              <div className="text-center mb-4">
                <h2>Alumni Profile Submission</h2>
                <p className="text-muted">Share your NCC journey with current cadets and fellow alumni.</p>
              </div>

              <Form onSubmit={handleSubmit} noValidate>
                <div className="visually-hidden" aria-hidden="true">
                  <Form.Control
                    type="text"
                    name="_contact_me_by_fax_only"
                    tabIndex={-1}
                    autoComplete="new-password"
                    value={form.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                  />
                </div>

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Name *</Form.Label>
                      <Form.Control value={form.name} onChange={(e) => handleChange('name', e.target.value)} required />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Pass-out Year *</Form.Label>
                      <Form.Control
                        type="number"
                        min="2000"
                        max="2100"
                        value={form.passOutYear}
                        onChange={(e) => handleChange('passOutYear', e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Division *</Form.Label>
                      <Form.Select value={form.division} onChange={(e) => handleChange('division', e.target.value)} required>
                        <option value="">Select</option>
                        <option value="SD">SD</option>
                        <option value="SW">SW</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Department *</Form.Label>
                      <Form.Select value={form.department} onChange={(e) => handleChange('department', e.target.value)} required>
                        <option value="">Select</option>
                        {DEPARTMENT_DEFS.map(d => (
                          <option key={d.code} value={d.code}>{d.code}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Email</Form.Label>
                      <Form.Control type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Phone</Form.Label>
                      <Form.Control value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Blood Group</Form.Label>
                      <Form.Select value={form.bloodGroup} onChange={(e) => handleChange('bloodGroup', e.target.value)}>
                        <option value="">Select</option>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Batch Years</Form.Label>
                      <Form.Control placeholder="e.g. 2020-2023" value={form.batchYears} onChange={(e) => handleChange('batchYears', e.target.value)} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Rank</Form.Label>
                      <Form.Control value={form.rank} onChange={(e) => handleChange('rank', e.target.value)} />
                    </Form.Group>
                  </Col>
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label>Achievements</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={form.achievements}
                        onChange={(e) => handleChange('achievements', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Alert variant="info" className="mt-3 small">
                  Submissions are reviewed by a superadmin before appearing publicly.
                </Alert>

                <Button type="submit" variant="primary" className="w-100 mt-2" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Profile'}
                </Button>
              </Form>

              <div className="text-center mt-3">
                <Link to="/alumni">← Back to Alumni Directory</Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AlumniSubmitForm;
