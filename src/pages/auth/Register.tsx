import { createUserWithEmailAndPassword, sendEmailVerification, signOut, updateProfile } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import ProfilePhoto from '@/components/ProfilePhoto';
import { collection, doc, writeBatch } from 'firebase/firestore';
import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { uploadCadetPhoto } from '@/shared/utils/cloudinary';
import { validatePassword } from '@/shared/utils/passwordPolicy';
import PasswordStrength from '@/components/common/PasswordStrength';
import { DEPARTMENT_DEFS, BLOOD_GROUPS } from '../../shared/config/constants';
import { auth, db } from '../../shared/config/firebase';
import { calculateAge, checkUniqueField } from '../../shared/utils/dbValidators';
import './Register.css';

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
  dateOfEnrollment: string;
  
  // Academic Details
  year: '1st Year' | '2nd Year' | '';
  residentialStatus: 'Day Scholar' | 'Hosteller' | '';
  department: string;
  rollNo: string;
  registerNumber: string;
  
  // Additional Details
  phone: string;
  bloodGroup: string;
  fatherName: string;
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
    dateOfEnrollment: '',
    year: '',
    residentialStatus: '',
    department: '',
    rollNo: '',
    registerNumber: '',
    phone: '',
    bloodGroup: '',
    fatherName: '',
    address: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const navigate = useNavigate();
  const { currentUser, userProfile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !currentUser || !userProfile) {
      return;
    }

    const landingPage = userProfile.role === 'admin' || userProfile.role === 'superadmin'
      ? '/admin/dashboard'
      : '/dashboard';

    navigate(landingPage, { replace: true });
  }, [authLoading, currentUser, navigate, userProfile]);

  // Calculate maximum allowed date (17 years ago today)
  const maxDobDate = new Date();
  maxDobDate.setFullYear(maxDobDate.getFullYear() - 17);
  const maxDobString = maxDobDate.toISOString().split('T')[0];

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Personal Details Validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const age = calculateAge(formData.dateOfBirth);
      if (age < 17) {
        newErrors.dateOfBirth = 'Cadets must be at least 17 years old';
      }
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!formData.email.includes('@') || !formData.email.includes('tce.edu')) {
      newErrors.email = 'Email must be from tce.edu domain (e.g., name@tce.edu or name@student.tce.edu)';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const pwdResult = validatePassword(formData.password);
      if (!pwdResult.isValid) {
        newErrors.password = pwdResult.errors[0];
      }
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

    if (!formData.dateOfEnrollment) {
      newErrors.dateOfEnrollment = 'Date of enrollment is required';
    }

    // Academic Details Validation
    if (!formData.year) {
      newErrors.year = 'Year is required';
    }
    
    if (!formData.residentialStatus) {
      newErrors.residentialStatus = 'Residential status is required';
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

    if (!formData.fatherName.trim()) {
      newErrors.fatherName = 'Father\'s / Guardian\'s name is required';
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

  const handleResidentialStatusChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value as 'Day Scholar' | 'Hosteller';
    if (errors.residentialStatus) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.residentialStatus;
        return newErrors;
      });
    }
    setFormData(prev => ({
      ...prev,
      residentialStatus: value
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix all validation errors');
      setTimeout(() => {
        document.querySelector('.is-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    setLoading(true);

    try {
      // Step 0: Check uniqueness of Regimental Number, Register Number, and Roll No
      // Unauthenticated users can query takenNumbers because it's public
      const [isRegimentalUnique, isRegisterUnique, isRollUnique] = await Promise.all([
        checkUniqueField('regimentalNumber', formData.regimentalNumber),
        checkUniqueField('registerNumber', formData.registerNumber),
        checkUniqueField('rollNo', formData.rollNo),
      ]);

      const uniqueErrors: FormErrors = {};
      if (!isRegimentalUnique) uniqueErrors.regimentalNumber = 'This Regimental Number is already in use by another cadet';
      if (!isRegisterUnique) uniqueErrors.registerNumber = 'This Register Number is already in use by another cadet';
      if (!isRollUnique) uniqueErrors.rollNo = 'This Roll Number is already in use by another cadet';

      if (Object.keys(uniqueErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...uniqueErrors }));
        toast.error('One or more identification numbers are already in use');
        setTimeout(() => {
          document.querySelector('.is-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        setLoading(false);
        return;
      }
      
      // Step 1: Create Firebase Auth account (needed for email verification)
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // Update Firebase Auth profile with name so the verification email template (%DISPLAY_NAME%) populates correctly
      await updateProfile(user, { displayName: formData.name });

      // Step 2: Send verification email
      await sendEmailVerification(user);

      let photoURL: string | null = null;
      let cloudinaryPublicId: string | null = null;

      if (profilePhoto && formData.division && formData.dateOfEnrollment) {
        try {
          const result = await uploadCadetPhoto(
            profilePhoto,
            formData.name,
            formData.dateOfEnrollment,
            formData.division as 'SD' | 'SW'
          );
          photoURL = result.secure_url;
          cloudinaryPublicId = result.public_id;
        } catch (uploadErr) {
          console.error('Photo upload failed:', uploadErr);
          // Don't block registration if photo upload fails
          toast.error('Photo upload failed, you can add it later from your profile.');
        }
      }

      // Step 3: Submit to pendingCadets and takenNumbers using a Batch Write
      const batch = writeBatch(db);
      const pendingRef = doc(collection(db, 'pendingCadets'));
      
      batch.set(pendingRef, {
        // Auth reference
        uid: user.uid,
        emailVerified: false,

        // Personal Details
        name: formData.name,
        dateOfBirth: formData.dateOfBirth,
        email: formData.email,
        tempPassword: formData.password,
        
        // NCC Details
        division: formData.division,
        regimentalNumber: formData.regimentalNumber,
        dateOfEnrollment: formData.dateOfEnrollment,
        rank: 'CDT', // Default rank
        nccYear: '1st Year',
        
        // Academic Details
        year: formData.year,
        residentialStatus: formData.residentialStatus,
        department: formData.department,
        rollNo: formData.rollNo,
        registerNumber: formData.registerNumber,
        
        // Additional Details
        phone: formData.phone,
        bloodGroup: formData.bloodGroup,
        fatherName: formData.fatherName,
        address: formData.address,
        photoURL: photoURL || null,
        cloudinaryPublicId: cloudinaryPublicId || null,
        
        // System fields
        userType: 'cadet',
        createdAt: new Date().toISOString(),
        status: 'pending'
      });

      // Add to takenNumbers registry
      const writeTaken = (field: string, value: string) => {
        const clean = value.trim();
        const safeId = clean.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (safeId) {
          batch.set(doc(db, 'takenNumbers', `${field}_${safeId}`), {
            type: field,
            uid: user.uid,
            originalValue: clean,
            createdAt: new Date().toISOString()
          });
        }
      };

      writeTaken('regimentalNumber', formData.regimentalNumber);
      writeTaken('registerNumber', formData.registerNumber);
      writeTaken('rollNo', formData.rollNo);

      await batch.commit();

      // Step 4: Sign out immediately — user cannot access the app until admin approves
      await signOut(auth);

      toast.success('Registration submitted! Please check your email to verify.');
      navigate('/verify-email');
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        if (err.code === 'auth/email-already-in-use') {
          setErrors(prev => ({ ...prev, email: 'This email is already registered' }));
          toast.error('Email is already registered. Please login instead.');
          setTimeout(() => {
            document.querySelector('.is-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        } else {
          toast.error('Failed to submit registration. ' + err.message);
        }
      } else {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        toast.error('Failed to submit registration. ' + message);
      }
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
                <i className="bi bi-person-plus-fill text-primary register-hero-icon"></i>
                <h2 className="mt-3">Cadet Registration</h2>
                <p className="text-muted">Join TCE NCC</p>
              </div>

              <Form onSubmit={handleSubmit} noValidate>
                <div className="text-center mb-4">
                  <ProfilePhoto
                    photoURL={null}
                    size={100}
                    editable={true}
                    onPhotoSelected={(file) => setProfilePhoto(file)}
                    onPhotoRemoved={() => setProfilePhoto(null)}
                    uploading={false}
                  />
                  <Form.Text className="text-muted d-block mt-1">
                    Profile Photo (Optional)
                  </Form.Text>
                </div>

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
                        placeholder="Enter your full name with initials at the end"
                        autoComplete="name"
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
                        placeholder="DD/MM/YYYY"
                        max={maxDobString}
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
                        placeholder="Use your student email"
                        autoComplete="email"
                      />
                      {errors.email && <Form.Text className="text-danger d-block mt-1">{errors.email}</Form.Text>}
                      <Form.Text className="text-muted">TCE email id (@student.tce.edu)</Form.Text>
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
                          placeholder="Min 8 chars, A-z, 0-9, special"
                          autoComplete="new-password"
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
                      <PasswordStrength password={formData.password} />
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
                          autoComplete="new-password"
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
                        placeholder="TN20XXS(D/W)IAXXXXXX"
                      />
                      {errors.regimentalNumber && <Form.Text className="text-danger d-block mt-1">{errors.regimentalNumber}</Form.Text>}
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
                  <Col xs={12} md={6}>
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
                        {DEPARTMENT_DEFS.map(dept => (
                          <option key={dept.code} value={dept.code}>{dept.code}</option>
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
                        placeholder="eg 660123"
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
                        min="2303917710321001"
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
                        placeholder="10-digit mobile number"
                        min="6000000000"
                        max="9999999999"
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
                        {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                      </Form.Select>
                      {errors.bloodGroup && <Form.Text className="text-danger d-block mt-1">{errors.bloodGroup}</Form.Text>}
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Residential Status <span className="text-danger">*</span></Form.Label>
                      <div>
                        <Form.Check
                          inline
                          type="radio"
                          label="Day Scholar"
                          name="residentialStatus"
                          value="Day Scholar"
                          checked={formData.residentialStatus === 'Day Scholar'}
                          onChange={handleResidentialStatusChange}
                          id="residential_day"
                        />
                        <Form.Check
                          inline
                          type="radio"
                          label="Hosteller"
                          name="residentialStatus"
                          value="Hosteller"
                          checked={formData.residentialStatus === 'Hosteller'}
                          onChange={handleResidentialStatusChange}
                          id="residential_hosteller"
                        />
                      </div>
                      {errors.residentialStatus && <Form.Text className="text-danger d-block mt-1">{errors.residentialStatus}</Form.Text>}
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="fatherName">
                      <Form.Label>Father's / Guardian's Name <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="fatherName"
                        value={formData.fatherName}
                        onChange={handleChange}
                        className={getFieldClass('fatherName')}
                        placeholder="Enter father's or guardian's name"
                      />
                      {errors.fatherName && <Form.Text className="text-danger d-block mt-1">{errors.fatherName}</Form.Text>}
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
                  After submitting, a verification email will be sent to your email address.
                  Please verify your email (check Spam/Junk folder too), then wait for senior's approval.
                </Alert>
              </Form>

              <hr className="my-4" />

              <div className="text-center">
                <p className="mb-0">
                  Already a cadet?{' '}
                  <Link to="/login" className="text-decoration-none">
                    Login
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

