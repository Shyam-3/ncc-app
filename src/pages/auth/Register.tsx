import { addDoc, collection } from 'firebase/firestore';
import React, { ChangeEvent, FormEvent, useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { DEPARTMENTS, PLATOONS } from '../../config/constants';
import { db } from '../../config/firebase';

interface FormData {
  // Personal Details
  name: string;
  dateOfBirth: string;
  email: string;
  password: string;
  confirmPassword: string;
  
  // NCC Details
  division: 'SD' | 'SW' | '';
  regimentalNumber: string;
  platoon: string;
  dateOfEnrollment: string;
  
  // Academic Details
  year: '1st Year' | '2nd Year' | '';
  department: string;
  rollNo: string;
  registerNumber: string;
  
  // Additional Details
  phone: string;
  bloodGroup: string;
  address: string;
}

interface FormErrors {
  [key: string]: string;
}

const Register: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    dateOfBirth: '',
    email: '',
    password: '',
    confirmPassword: '',
    division: '',
    regimentalNumber: '',
    platoon: '',
    dateOfEnrollment: '',
    year: '',
    department: '',
    rollNo: '',
    registerNumber: '',
    phone: '',
    bloodGroup: '',
    address: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const navigate = useNavigate();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Personal Details Validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }
    
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!formData.email.includes('@') || !formData.email.includes('tce.edu')) {
      newErrors.email = 'Email must be from tce.edu domain (e.g., name@tce.edu or name@student.tce.edu)';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // NCC Details Validation
    if (!formData.division) {
      newErrors.division = 'Division is required';
    }
    
    if (!formData.regimentalNumber.trim()) {
      newErrors.regimentalNumber = 'Regimental number is required';
    }
    
    if (!formData.platoon) {
      newErrors.platoon = 'Platoon is required';
    }
    
    if (!formData.dateOfEnrollment) {
      newErrors.dateOfEnrollment = 'Date of enrollment is required';
    }

    // Academic Details Validation
    if (!formData.year) {
      newErrors.year = 'Year is required';
    }
    
    if (!formData.department) {
      newErrors.department = 'Department is required';
    }
    
    if (!formData.rollNo.trim()) {
      newErrors.rollNo = 'Roll number is required';
    }
    
    if (!formData.registerNumber) {
      newErrors.registerNumber = 'Register number is required';
    } else if (formData.registerNumber.toString().length !== 16) {
      newErrors.registerNumber = 'Register number must be exactly 16 digits';
    }

    // Additional Details Validation
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (formData.phone.toString().length !== 10) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }
    
    if (!formData.bloodGroup) {
      newErrors.bloodGroup = 'Blood group is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDivisionChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value as 'SD' | 'SW';
    if (errors.division) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.division;
        return newErrors;
      });
    }
    setFormData(prev => ({
      ...prev,
      division: value
    }));
  };

  const handleYearChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value as '1st Year' | '2nd Year';
    if (errors.year) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.year;
        return newErrors;
      });
    }
    setFormData(prev => ({
      ...prev,
      year: value
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix all validation errors');
      return;
    }

    try {
      setLoading(true);
      
      // Submit to pendingCadets collection for admin approval
      await addDoc(collection(db, 'pendingCadets'), {
        // Personal Details
        name: formData.name,
        dateOfBirth: formData.dateOfBirth,
        email: formData.email,
        tempPassword: formData.password,
        
        // NCC Details
        division: formData.division,
        regimentalNumber: formData.regimentalNumber,
        platoon: formData.platoon,
        dateOfEnrollment: formData.dateOfEnrollment,
        rank: 'CDT', // Default rank
        
        // Academic Details
        year: formData.year,
        department: formData.department,
        rollNo: formData.rollNo,
        registerNumber: formData.registerNumber,
        
        // Additional Details
        phone: formData.phone,
        bloodGroup: formData.bloodGroup,
        address: formData.address,
        
        // System fields
        createdAt: new Date().toISOString(),
        status: 'pending'
      });

      toast.success('Registration submitted! Please wait for admin approval.');
      navigate('/login');
    } catch (err: any) {
      toast.error('Failed to submit registration. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getFieldClass = (fieldName: string) => {
    return errors[fieldName] ? 'is-invalid' : '';
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col xs={12} sm={12} md={10} lg={9} xl={8}>
          <Card className="shadow">
            <Card.Body className="p-4 p-md-5">
              <div className="text-center mb-4">
                <i className="bi bi-person-plus-fill text-primary" style={{ fontSize: '64px' }}></i>
                <h2 className="mt-3">Cadet Registration</h2>
                <p className="text-muted">Join the NCC Army Wing</p>
              </div>

              <Form onSubmit={handleSubmit} noValidate>
                {/* PERSONAL DETAILS SECTION */}
                <h5 className="mb-3 text-primary">
                  <i className="bi bi-person me-2"></i>Personal Details
                </h5>
                
                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="name">
                      <Form.Label>Full Name <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={getFieldClass('name')}
                        placeholder="Enter your full name"
                      />
                      {errors.name && <Form.Text className="text-danger d-block mt-1">{errors.name}</Form.Text>}
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="dateOfBirth">
                      <Form.Label>Date of Birth <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        className={getFieldClass('dateOfBirth')}
                      />
                      {errors.dateOfBirth && <Form.Text className="text-danger d-block mt-1">{errors.dateOfBirth}</Form.Text>}
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col xs={12}>
                    <Form.Group className="mb-3" controlId="email">
                      <Form.Label>Email Address <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={getFieldClass('email')}
                        placeholder="name@tce.edu or name@student.tce.edu"
                      />
                      {errors.email && <Form.Text className="text-danger d-block mt-1">{errors.email}</Form.Text>}
                      <Form.Text className="text-muted">Use your TCE email (@tce.edu or @student.tce.edu)</Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="password">
                      <Form.Label>Password <span className="text-danger">*</span></Form.Label>
                      <div className="position-relative">
                        <Form.Control
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className={`${getFieldClass('password')} pe-5`}
                          placeholder="At least 6 characters"
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
                      {errors.password && <Form.Text className="text-danger d-block mt-1">{errors.password}</Form.Text>}
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="confirmPassword">
                      <Form.Label>Confirm Password <span className="text-danger">*</span></Form.Label>
                      <div className="position-relative">
                        <Form.Control
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className={`${getFieldClass('confirmPassword')} pe-5`}
                          placeholder="Re-enter password"
                        />
                        <Button
                          variant="link"
                          type="button"
                          onClick={() => setShowConfirmPassword(prev => !prev)}
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                          className="position-absolute end-0 top-50 translate-middle-y text-muted p-0 me-2"
                        >
                          <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                        </Button>
                      </div>
                      {errors.confirmPassword && <Form.Text className="text-danger d-block mt-1">{errors.confirmPassword}</Form.Text>}
                    </Form.Group>
                  </Col>
                </Row>

                <hr className="my-4" />

                {/* NCC DETAILS SECTION */}
                <h5 className="mb-3 text-primary">
                  <i className="bi bi-shield me-2"></i>NCC Details
                </h5>

                <Row className="g-3">
                  <Col xs={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Division <span className="text-danger">*</span></Form.Label>
                      <div>
                        <Form.Check
                          inline
                          type="radio"
                          label="Senior Division (SD)"
                          name="division"
                          value="SD"
                          checked={formData.division === 'SD'}
                          onChange={handleDivisionChange}
                          id="division_sd"
                        />
                        <Form.Check
                          inline
                          type="radio"
                          label="Senior Wing (SW)"
                          name="division"
                          value="SW"
                          checked={formData.division === 'SW'}
                          onChange={handleDivisionChange}
                          id="division_sw"
                        />
                      </div>
                      {errors.division && <Form.Text className="text-danger d-block mt-1">{errors.division}</Form.Text>}
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col xs={12} md={4}>
                    <Form.Group className="mb-3" controlId="regimentalNumber">
                      <Form.Label>Regimental Number <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="regimentalNumber"
                        value={formData.regimentalNumber}
                        onChange={handleChange}
                        className={getFieldClass('regimentalNumber')}
                        placeholder="e.g., TN-09-123"
                      />
                      {errors.regimentalNumber && <Form.Text className="text-danger d-block mt-1">{errors.regimentalNumber}</Form.Text>}
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6} md={4}>
                    <Form.Group className="mb-3" controlId="platoon">
                      <Form.Label>Platoon <span className="text-danger">*</span></Form.Label>
                      <Form.Select
                        name="platoon"
                        value={formData.platoon}
                        onChange={handleChange}
                        className={getFieldClass('platoon')}
                      >
                        <option value="" disabled>Select Platoon</option>
                        {PLATOONS.map(platoon => (
                          <option key={platoon} value={platoon}>{platoon}</option>
                        ))}
                      </Form.Select>
                      {errors.platoon && <Form.Text className="text-danger d-block mt-1">{errors.platoon}</Form.Text>}
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6} md={4}>
                    <Form.Group className="mb-3" controlId="dateOfEnrollment">
                      <Form.Label>Date of Enrollment <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="date"
                        name="dateOfEnrollment"
                        value={formData.dateOfEnrollment}
                        onChange={handleChange}
                        className={getFieldClass('dateOfEnrollment')}
                      />
                      {errors.dateOfEnrollment && <Form.Text className="text-danger d-block mt-1">{errors.dateOfEnrollment}</Form.Text>}
                    </Form.Group>
                  </Col>
                </Row>

                <hr className="my-4" />

                {/* ACADEMIC DETAILS SECTION */}
                <h5 className="mb-3 text-primary">
                  <i className="bi bi-book me-2"></i>Academic Details
                </h5>

                <Row className="g-3">
                  <Col xs={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Year <span className="text-danger">*</span></Form.Label>
                      <div>
                        <Form.Check
                          inline
                          type="radio"
                          label="1st Year"
                          name="year"
                          value="1st Year"
                          checked={formData.year === '1st Year'}
                          onChange={handleYearChange}
                          id="year_1st"
                        />
                        <Form.Check
                          inline
                          type="radio"
                          label="2nd Year"
                          name="year"
                          value="2nd Year"
                          checked={formData.year === '2nd Year'}
                          onChange={handleYearChange}
                          id="year_2nd"
                        />
                      </div>
                      {errors.year && <Form.Text className="text-danger d-block mt-1">{errors.year}</Form.Text>}
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col xs={12} md={4}>
                    <Form.Group className="mb-3" controlId="department">
                      <Form.Label>Department <span className="text-danger">*</span></Form.Label>
                      <Form.Select
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        className={getFieldClass('department')}
                      >
                        <option value="" disabled>Select Department</option>
                        {DEPARTMENTS.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </Form.Select>
                      {errors.department && <Form.Text className="text-danger d-block mt-1">{errors.department}</Form.Text>}
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6} md={4}>
                    <Form.Group className="mb-3" controlId="rollNo">
                      <Form.Label>Roll Number <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="rollNo"
                        value={formData.rollNo}
                        onChange={handleChange}
                        className={getFieldClass('rollNo')}
                        placeholder="e.g., 001"
                      />
                      {errors.rollNo && <Form.Text className="text-danger d-block mt-1">{errors.rollNo}</Form.Text>}
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6} md={4}>
                    <Form.Group className="mb-3" controlId="registerNumber">
                      <Form.Label>Register Number <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="number"
                        name="registerNumber"
                        value={formData.registerNumber}
                        onChange={handleChange}
                        className={getFieldClass('registerNumber')}
                        placeholder="16-digit number"
                        min="0"
                      />
                      {errors.registerNumber && <Form.Text className="text-danger d-block mt-1">{errors.registerNumber}</Form.Text>}
                      <Form.Text className="text-muted">Exactly 16 digits</Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <hr className="my-4" />

                {/* ADDITIONAL DETAILS SECTION */}
                <h5 className="mb-3 text-primary">
                  <i className="bi bi-info-circle me-2"></i>Additional Details
                </h5>

                <Row className="g-3">
                  <Col xs={12} sm={6} md={6}>
                    <Form.Group className="mb-3" controlId="phone">
                      <Form.Label>Phone Number <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="number"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className={getFieldClass('phone')}
                        placeholder="10-digit mobile"
                        min="0"
                      />
                      {errors.phone && <Form.Text className="text-danger d-block mt-1">{errors.phone}</Form.Text>}
                      <Form.Text className="text-muted">Exactly 10 digits</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6} md={6}>
                    <Form.Group className="mb-3" controlId="bloodGroup">
                      <Form.Label>Blood Group <span className="text-danger">*</span></Form.Label>
                      <Form.Select
                        name="bloodGroup"
                        value={formData.bloodGroup}
                        onChange={handleChange}
                        className={getFieldClass('bloodGroup')}
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
                      {errors.bloodGroup && <Form.Text className="text-danger d-block mt-1">{errors.bloodGroup}</Form.Text>}
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-4" controlId="address">
                  <Form.Label>Address <span className="text-muted">(Optional)</span></Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter your full address"
                  />
                </Form.Group>



                <Button
                  variant="primary"
                  type="submit"
                  className="w-100"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? 'Submitting Registration...' : 'Submit for Approval'}
                </Button>

                <Alert variant="info" className="mt-3 mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  Your registration will be reviewed by an admin. You'll be able to login once approved.
                </Alert>
              </Form>

              <hr className="my-4" />

              <div className="text-center">
                <p className="mb-0">
                  Already have an account?{' '}
                  <Link to="/login" className="text-decoration-none">
                    Login here
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

export default Register;
