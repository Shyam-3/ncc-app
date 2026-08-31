import { doc, getDoc, updateDoc, collection } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { formatISTDate } from "@/shared/utils/dateTime";
import {
  ACADEMIC_YEARS,
  DEPARTMENT_DEFS,
  NCC_RANKS,
  NCC_YEARS,
  ROMAN_YEAR_MAP,
  BLOOD_GROUPS,
} from "../../shared/config/constants";
import { db } from "../../shared/config/firebase";
import {
  checkUniqueField,
  updateTakenNumberBatch,
} from "../../shared/utils/dbValidators";
import { useAuth } from "@/features/auth/AuthContext";
import { isAnoUser } from "@/shared/utils/userType";
import { writeBatch } from "firebase/firestore";
import ProfilePhoto from "@/components/ProfilePhoto";
import { uploadCadetPhoto, uploadAnoPhoto } from "@/shared/utils/cloudinary";

interface UserProfile {
  name: string;
  email: string;
  role: string;
  photoURL?: string | null;
  cloudinaryPublicId?: string | null;
  userType?: "ano" | "cadet";
  status?: "pending" | "active" | "inactive" | "rejected";
  dateOfBirth?: string;
  division?: "SD" | "SW";
  regimentalNumber?: string;
  dateOfEnrollment?: string;
  nccYear?: string;
  rank?: string;
  year?: string;
  residentialStatus?: string;
  department?: string;
  rollNo?: string;
  registerNumber?: string;
  phone?: string;
  bloodGroup?: string;
  fatherName?: string;
  address?: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    regimentalNumber: "",
    dateOfEnrollment: "",
    nccYear: "",
    rank: "CDT",
    year: "",
    residentialStatus: "",
    department: "",
    rollNo: "",
    registerNumber: "",
    phone: "",
    bloodGroup: "",
    fatherName: "",
    address: "",
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const isAdminEditor =
    !isAnoUser(profile) &&
    (profile?.role === "admin" || profile?.role === "superadmin");
  const isAnoProfile = isAnoUser(profile);
  const fiveYearDepartments = new Set<string>(
    DEPARTMENT_DEFS.filter((d) => d.courseTenure === 5).map((d) => d.code),
  );
  const academicYearOptions = fiveYearDepartments.has(editForm.department)
    ? ACADEMIC_YEARS
    : ACADEMIC_YEARS.filter((y) => y !== "5th Year");

  const handlePhotoUpload = async (file: File) => {
    if (!currentUser || !profile) return;
    setPhotoUploading(true);
    try {
      let result;
      if (isAnoUser(profile)) {
        result = await uploadAnoPhoto(file, profile.name);
      } else {
        if (!profile.dateOfEnrollment || !profile.division) {
          toast.error("Missing enrollment date or division. Contact admin.");
          return;
        }
        result = await uploadCadetPhoto(
          file,
          profile.name,
          profile.dateOfEnrollment,
          profile.division as "SD" | "SW",
        );
      }

      const batch = writeBatch(db);
      const userRef = doc(db, "users", currentUser.uid);

      // Update user document
      batch.update(userRef, {
        photoURL: result.secure_url,
        cloudinaryPublicId: result.public_id,
      });

      // If they had an old photo, queue it for deletion
      if (profile.cloudinaryPublicId) {
        batch.set(doc(collection(db, "cloudinary_cleanup")), {
          publicId: profile.cloudinaryPublicId,
          reason: "photo_updated",
          createdAt: new Date().toISOString(),
        });
      }

      await batch.commit();

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              photoURL: result.secure_url,
              cloudinaryPublicId: result.public_id,
            }
          : prev,
      );
      toast.success("Profile photo updated!");
    } catch (err) {
      console.error("Photo upload failed:", err);
      toast.error("Failed to upload photo. Please try again.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handlePhotoRemove = async () => {
    if (!currentUser || !profile) return;
    setPhotoUploading(true);
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, "users", currentUser.uid);

      // Clear photo fields from user document
      batch.update(userRef, {
        photoURL: null,
        cloudinaryPublicId: null,
      });

      // Queue old photo for cleanup if it existed
      if (profile.cloudinaryPublicId) {
        batch.set(doc(collection(db, "cloudinary_cleanup")), {
          publicId: profile.cloudinaryPublicId,
          reason: "photo_removed",
          createdAt: new Date().toISOString(),
        });
      }

      await batch.commit();

      setProfile((prev) =>
        prev
          ? { ...prev, photoURL: undefined, cloudinaryPublicId: undefined }
          : prev,
      );
      toast.success("Profile photo removed");
    } catch (err) {
      console.error("Photo removal failed:", err);
      toast.error("Failed to remove photo. Please try again.");
    } finally {
      setPhotoUploading(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          setProfile(data);
          setEditForm({
            name: data.name || "",
            regimentalNumber: data.regimentalNumber || "",
            dateOfEnrollment: data.dateOfEnrollment || "",
            nccYear: data.nccYear || "1st Year",
            rank: data.rank || "CDT",
            year: data.year || "1st Year",
            residentialStatus: data.residentialStatus || "",
            department: data.department || "",
            rollNo: data.rollNo || "",
            registerNumber: data.registerNumber || "",
            phone: data.phone || "",
            bloodGroup: data.bloodGroup || "",
            fatherName: data.fatherName || "",
            address: data.address || "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser]);

  const handleOpenEdit = () => {
    if (profile) {
      setEditForm({
        name: profile.name || "",
        regimentalNumber: profile.regimentalNumber || "",
        dateOfEnrollment: profile.dateOfEnrollment || "",
        nccYear: profile.nccYear || "1st Year",
        rank: profile.rank || "CDT",
        year: profile.year || "1st Year",
        residentialStatus: profile.residentialStatus || "",
        department: profile.department || "",
        rollNo: profile.rollNo || "",
        registerNumber: profile.registerNumber || "",
        phone: profile.phone || "",
        bloodGroup: profile.bloodGroup || "",
        fatherName: profile.fatherName || "",
        address: profile.address || "",
      });
      setEditErrors({});
      setShowEditModal(true);
    }
  };

  const handleEditChange = (name: string, value: string) => {
    if (editErrors[name]) {
      setEditErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setEditForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "department") {
        const dept = DEPARTMENT_DEFS.find((d) => d.code === value);
        if (dept && dept.courseTenure !== 5 && prev.year === "5th Year") {
          next.year = "4th Year";
        }
      }
      return next;
    });
  };

  const validateEditForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!editForm.name.trim()) {
      nextErrors.name = "Full name is required";
    }

    if (!editForm.phone.trim()) {
      nextErrors.phone = "Phone number is required";
    } else if (!editForm.phone.match(/^\d{10}$/)) {
      nextErrors.phone = "Phone number must be exactly 10 digits";
    }

    if (!editForm.bloodGroup.trim()) {
      nextErrors.bloodGroup = "Blood group is required";
    } else if (!BLOOD_GROUPS.includes(editForm.bloodGroup as any)) {
      nextErrors.bloodGroup = "Invalid blood group";
    }

    if (!isAnoProfile && !editForm.residentialStatus.trim()) {
      nextErrors.residentialStatus = "Residential status is required";
    }

    if (isAdminEditor) {
      if (!editForm.regimentalNumber.trim())
        nextErrors.regimentalNumber = "Regimental number is required";
      if (!editForm.dateOfEnrollment)
        nextErrors.dateOfEnrollment = "Date of enrollment is required";
      if (!editForm.nccYear) nextErrors.nccYear = "Year is required";
      if (!editForm.rank) nextErrors.rank = "Rank is required";
      if (!editForm.year) nextErrors.year = "Academic year is required";
      if (!editForm.department)
        nextErrors.department = "Department is required";
      if (!editForm.rollNo.trim())
        nextErrors.rollNo = "Roll number is required";
      if (!editForm.registerNumber.trim()) {
        nextErrors.registerNumber = "Register number is required";
      } else if (!editForm.registerNumber.match(/^\d{16}$/)) {
        nextErrors.registerNumber = "Register number must be exactly 16 digits";
      }
    }

    setEditErrors(nextErrors);
    const isValid = Object.keys(nextErrors).length === 0;
    if (!isValid) {
      setTimeout(() => {
        document
          .querySelector(".is-invalid")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
    return isValid;
  };

  const handleSaveChanges = async () => {
    if (!currentUser || !profile) return;
    if (!validateEditForm()) return;

    setSaving(true);
    try {
      if (isAdminEditor) {
        const [isRegimentalUnique, isRegisterUnique, isRollUnique] =
          await Promise.all([
            checkUniqueField(
              "regimentalNumber",
              editForm.regimentalNumber,
              currentUser.uid,
            ),
            checkUniqueField(
              "registerNumber",
              editForm.registerNumber,
              currentUser.uid,
            ),
            checkUniqueField("rollNo", editForm.rollNo, currentUser.uid),
          ]);

        const uniqueErrors: Record<string, string> = {};
        if (!isRegimentalUnique) {
          uniqueErrors.regimentalNumber =
            "This Regimental Number is already in use";
        }
        if (!isRegisterUnique) {
          uniqueErrors.registerNumber =
            "This Register Number is already in use";
        }
        if (!isRollUnique) {
          uniqueErrors.rollNo = "This Roll Number is already in use";
        }

        if (Object.keys(uniqueErrors).length > 0) {
          setEditErrors((prev) => ({ ...prev, ...uniqueErrors }));
          toast.error("One or more identification numbers are already in use");
          setTimeout(() => {
            document
              .querySelector(".is-invalid")
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 100);
          setSaving(false);
          return;
        }

        const batch = writeBatch(db);
        const userRef = doc(db, "users", currentUser.uid);

        batch.update(userRef, {
          name: editForm.name,
          regimentalNumber: editForm.regimentalNumber,
          dateOfEnrollment: editForm.dateOfEnrollment,
          nccYear: editForm.nccYear,
          rank: editForm.rank,
          year: editForm.year,
          residentialStatus: editForm.residentialStatus,
          department: editForm.department,
          rollNo: editForm.rollNo,
          registerNumber: editForm.registerNumber,
          phone: editForm.phone,
          bloodGroup: editForm.bloodGroup,
          fatherName: editForm.fatherName || "",
          address: editForm.address || "",
        });

        // Update the taken numbers registry
        updateTakenNumberBatch(
          batch,
          "regimentalNumber",
          profile.regimentalNumber,
          editForm.regimentalNumber,
          currentUser.uid,
        );
        updateTakenNumberBatch(
          batch,
          "registerNumber",
          profile.registerNumber,
          editForm.registerNumber,
          currentUser.uid,
        );
        updateTakenNumberBatch(
          batch,
          "rollNo",
          profile.rollNo,
          editForm.rollNo,
          currentUser.uid,
        );

        await batch.commit();

        setProfile({
          ...profile,
          name: editForm.name,
          regimentalNumber: editForm.regimentalNumber,
          dateOfEnrollment: editForm.dateOfEnrollment,
          nccYear: editForm.nccYear,
          rank: editForm.rank,
          year: editForm.year,
          residentialStatus: editForm.residentialStatus,
          department: editForm.department,
          rollNo: editForm.rollNo,
          registerNumber: editForm.registerNumber,
          phone: editForm.phone,
          bloodGroup: editForm.bloodGroup,
          fatherName: editForm.fatherName || "",
          address: editForm.address || "",
        });
      } else {
        const updatePayload: Record<string, string> = {
          name: editForm.name,
          phone: editForm.phone,
          bloodGroup: editForm.bloodGroup,
        };
        if (isAnoProfile) {
          updatePayload.rank = editForm.rank;
        }
        if (!isAnoProfile) {
          updatePayload.fatherName = editForm.fatherName || "";
          updatePayload.residentialStatus = editForm.residentialStatus;
          updatePayload.address = editForm.address || "";
        }
        await updateDoc(doc(db, "users", currentUser.uid), updatePayload);

        setProfile({
          ...profile,
          name: editForm.name,
          phone: editForm.phone,
          bloodGroup: editForm.bloodGroup,
          ...(isAnoProfile
            ? { rank: editForm.rank }
            : {
                fatherName: editForm.fatherName || "",
                residentialStatus: editForm.residentialStatus,
                address: editForm.address || "",
              }),
        });
      }

      toast.success("Profile updated successfully");
      setShowEditModal(false);
      setConfirmSave(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestSave = () => {
    if (!validateEditForm()) return;
    setConfirmSave(true);
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner as="span" animation="border" size="sm" />
        <p className="mt-3">Loading profile...</p>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container className="py-5">
        <Alert variant="warning">Profile not found</Alert>
      </Container>
    );
  }

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "-" : formatISTDate(d);
  };

  const formatYear = (value?: string) => {
    if (!value) return "-";
    const cleaned = value.replace(" Year", "").trim();
    return ROMAN_YEAR_MAP[cleaned] || cleaned;
  };

  const getRankName = (code?: string) => {
    if (!code) return "Cadet";
    return NCC_RANKS.find((r) => r.code === code)?.name || code;
  };

  const getNccYear = (value?: string) => formatYear(value || "1st Year");

  const getDepartmentFullName = (code?: string) => {
    if (!code) return "-";
    const dept = DEPARTMENT_DEFS.find((d) => d.code === code);
    return dept ? dept.name : code;
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col xs={12} md={10} lg={8}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
              <h3 className="mb-0">
                <i className="bi bi-person-circle me-2"></i>
                Profile
              </h3>
              <div>
                <Button
                  variant="light"
                  size="sm"
                  onClick={handleOpenEdit}
                  className="me-2"
                >
                  <i className="bi bi-pencil me-1"></i>
                  Edit
                </Button>
                <Button variant="light" size="sm" onClick={() => navigate(-1)}>
                  <i className="bi bi-arrow-left me-1"></i> Back
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <ProfilePhoto
                  photoURL={profile.photoURL}
                  size={150}
                  editable={true}
                  onPhotoSelected={handlePhotoUpload}
                  onPhotoRemoved={handlePhotoRemove}
                  uploading={photoUploading}
                />
                <h4 className="mt-2 mb-0">{profile.name}</h4>
                <small className="text-muted">{profile.email}</small>
              </div>
              <hr />
              <h5 className="mb-3 text-primary">
                <i className="bi bi-person-fill me-2"></i>
                Personal
              </h5>
              <Row className="mb-4 g-3">
                <Col xs={12} md={6}>
                  <Form.Label className="fw-bold text-muted small">
                    Name
                  </Form.Label>
                  <p className="mb-0">{profile.name || "-"}</p>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Label className="fw-bold text-muted small">
                    Email
                  </Form.Label>
                  <p className="mb-0">{profile.email || "-"}</p>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Label className="fw-bold text-muted small">
                    Phone
                  </Form.Label>
                  <p className="mb-0">+91 {profile.phone || "-"}</p>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Label className="fw-bold text-muted small">
                    Blood Group
                  </Form.Label>
                  <p className="mb-0">{profile.bloodGroup || "-"}</p>
                </Col>
                {!isAnoProfile && (
                  <Col xs={12} md={6}>
                    <Form.Label className="fw-bold text-muted small">
                      Date of Birth
                    </Form.Label>
                    <p className="mb-0">{formatDate(profile.dateOfBirth)}</p>
                  </Col>
                )}
                <Col xs={12} md={6}>
                  <Form.Label className="fw-bold text-muted small">
                    Role
                  </Form.Label>
                  <div>
                    <Badge
                      bg={
                        profile.role === "superadmin"
                          ? "danger"
                          : profile.role === "admin"
                            ? "primary"
                            : "secondary"
                      }
                    >
                      {profile.role.toUpperCase()}
                    </Badge>
                    {isAnoProfile && (
                      <Badge bg="dark" className="ms-2">
                        ANO
                      </Badge>
                    )}
                  </div>
                </Col>
                {isAnoProfile && profile.rank && (
                  <Col xs={12} md={6}>
                    <Form.Label className="fw-bold text-muted small">
                      Rank / Designation
                    </Form.Label>
                    <p className="mb-0">{profile.rank}</p>
                  </Col>
                )}
              </Row>

              {!isAnoProfile && (
                <>
                  <hr />

                  <h5 className="mb-3 text-primary">
                    <i className="bi bi-shield-fill me-2"></i>
                    NCC
                  </h5>
                  <Row className="mb-4 g-3">
                    <Col xs={12} md={4}>
                      <Form.Label className="fw-bold text-muted small">
                        Division
                      </Form.Label>
                      <div>
                        {profile.division ? (
                          <Badge
                            bg={profile.division === "SD" ? "info" : "warning"}
                          >
                            {profile.division}
                          </Badge>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </div>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Label className="fw-bold text-muted small">
                        Rank
                      </Form.Label>
                      <p className="mb-0">
                        {getRankName(profile.rank || "CDT")}
                      </p>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Label className="fw-bold text-muted small">
                        Regimental Number
                      </Form.Label>
                      <p className="mb-0">{profile.regimentalNumber || "-"}</p>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Label className="fw-bold text-muted small">
                        Year
                      </Form.Label>
                      <p className="mb-0">{getNccYear(profile.nccYear)}</p>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Label className="fw-bold text-muted small">
                        Date of Enrollment
                      </Form.Label>
                      <p className="mb-0">
                        {formatDate(profile.dateOfEnrollment)}
                      </p>
                    </Col>
                  </Row>

                  <hr />

                  <h5 className="mb-3 text-primary">
                    <i className="bi bi-mortarboard-fill me-2"></i>
                    Academic
                  </h5>
                  <Row className="mb-4 g-3">
                    <Col xs={12} md={6}>
                      <Form.Label className="fw-bold text-muted small">
                        Year
                      </Form.Label>
                      <p className="mb-0">
                        {formatYear(profile.year || "1st Year")}
                      </p>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Label className="fw-bold text-muted small">
                        Department
                      </Form.Label>
                      <p className="mb-0">
                        {getDepartmentFullName(profile.department)}
                      </p>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Label className="fw-bold text-muted small">
                        Roll Number
                      </Form.Label>
                      <p className="mb-0">{profile.rollNo || "-"}</p>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Label className="fw-bold text-muted small">
                        Register Number
                      </Form.Label>
                      <p className="mb-0">{profile.registerNumber || "-"}</p>
                    </Col>
                  </Row>

                  <hr />

                  <h5 className="mb-3 text-primary">
                    <i className="bi bi-telephone-fill me-2"></i>
                    Additional
                  </h5>
                  <Row className="mb-4 g-3">
                    <Col xs={12} md={4}>
                      <Form.Label className="fw-bold text-muted small">
                        Father's / Guardian's Name
                      </Form.Label>
                      <p className="mb-0">{profile.fatherName || "-"}</p>
                    </Col>
                    <Col xs={12} md={12}>
                      <Form.Label className="fw-bold text-muted small">
                        Address
                      </Form.Label>
                      <p className="mb-0">{profile.address || "-"}</p>
                    </Col>
                  </Row>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Edit Modal */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="editName">
              <Form.Label>Full Name *</Form.Label>
              <Form.Control
                type="text"
                value={editForm.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleEditChange("name", e.target.value)
                }
                placeholder="Enter your full name"
                isInvalid={Boolean(editErrors.name)}
              />
              {editErrors.name && (
                <Form.Text className="text-danger d-block mt-1">
                  {editErrors.name}
                </Form.Text>
              )}
            </Form.Group>

            {isAdminEditor && (
              <>
                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Form.Group
                      className="mb-3"
                      controlId="editRegimentalNumber"
                    >
                      <Form.Label>Regimental Number *</Form.Label>
                      <Form.Control
                        type="text"
                        value={editForm.regimentalNumber}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleEditChange("regimentalNumber", e.target.value)
                        }
                        isInvalid={Boolean(editErrors.regimentalNumber)}
                      />
                      {editErrors.regimentalNumber && (
                        <Form.Text className="text-danger d-block mt-1">
                          {editErrors.regimentalNumber}
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Form.Group
                      className="mb-3"
                      controlId="editDateOfEnrollment"
                    >
                      <Form.Label>Date of Enrollment *</Form.Label>
                      <Form.Control
                        type="date"
                        value={editForm.dateOfEnrollment}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleEditChange("dateOfEnrollment", e.target.value)
                        }
                        isInvalid={Boolean(editErrors.dateOfEnrollment)}
                      />
                      {editErrors.dateOfEnrollment && (
                        <Form.Text className="text-danger d-block mt-1">
                          {editErrors.dateOfEnrollment}
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="editNccYear">
                      <Form.Label>Year *</Form.Label>
                      <Form.Select
                        value={editForm.nccYear}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          handleEditChange("nccYear", e.target.value)
                        }
                        isInvalid={Boolean(editErrors.nccYear)}
                      >
                        <option value="" disabled>
                          Select Year
                        </option>
                        {NCC_YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </Form.Select>
                      {editErrors.nccYear && (
                        <Form.Text className="text-danger d-block mt-1">
                          {editErrors.nccYear}
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="editRank">
                      <Form.Label>Rank *</Form.Label>
                      <Form.Select
                        value={editForm.rank}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          handleEditChange("rank", e.target.value)
                        }
                        isInvalid={Boolean(editErrors.rank)}
                      >
                        <option value="" disabled>
                          Select Rank
                        </option>
                        {NCC_RANKS.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.name}
                          </option>
                        ))}
                      </Form.Select>
                      {editErrors.rank && (
                        <Form.Text className="text-danger d-block mt-1">
                          {editErrors.rank}
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="editAcademicYear">
                      <Form.Label>Academic Year *</Form.Label>
                      <Form.Select
                        value={editForm.year}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          handleEditChange("year", e.target.value)
                        }
                        isInvalid={Boolean(editErrors.year)}
                      >
                        <option value="" disabled>
                          Select Year
                        </option>
                        {academicYearOptions.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </Form.Select>
                      {editErrors.year && (
                        <Form.Text className="text-danger d-block mt-1">
                          {editErrors.year}
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="editDepartment">
                      <Form.Label>Department *</Form.Label>
                      <Form.Select
                        value={editForm.department}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          handleEditChange("department", e.target.value)
                        }
                        isInvalid={Boolean(editErrors.department)}
                      >
                        <option value="" disabled>
                          Select Department
                        </option>
                        {DEPARTMENT_DEFS.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.code}
                          </option>
                        ))}
                      </Form.Select>
                      {editErrors.department && (
                        <Form.Text className="text-danger d-block mt-1">
                          {editErrors.department}
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="editRollNo">
                      <Form.Label>Roll Number *</Form.Label>
                      <Form.Control
                        type="text"
                        value={editForm.rollNo}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleEditChange("rollNo", e.target.value)
                        }
                        isInvalid={Boolean(editErrors.rollNo)}
                      />
                      {editErrors.rollNo && (
                        <Form.Text className="text-danger d-block mt-1">
                          {editErrors.rollNo}
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="editRegisterNumber">
                      <Form.Label>Register Number *</Form.Label>
                      <Form.Control
                        type="number"
                        value={editForm.registerNumber}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleEditChange("registerNumber", e.target.value)
                        }
                        onWheel={(e: React.WheelEvent<HTMLInputElement>) =>
                          e.currentTarget.blur()
                        }
                        min="0"
                        isInvalid={Boolean(editErrors.registerNumber)}
                      />
                      {editErrors.registerNumber && (
                        <Form.Text className="text-danger d-block mt-1">
                          {editErrors.registerNumber}
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                </Row>
              </>
            )}

            <Form.Group className="mb-3" controlId="editPhone">
              <Form.Label>Phone Number</Form.Label>
              <Form.Control
                type="number"
                value={editForm.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleEditChange("phone", e.target.value)
                }
                onWheel={(e: React.WheelEvent<HTMLInputElement>) =>
                  e.currentTarget.blur()
                }
                placeholder="10-digit mobile"
                min="0"
                isInvalid={Boolean(editErrors.phone)}
              />
              {editErrors.phone && (
                <Form.Text className="text-danger d-block mt-1">
                  {editErrors.phone}
                </Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3" controlId="editBloodGroup">
              <Form.Label>Blood Group</Form.Label>
              <Form.Select
                value={editForm.bloodGroup}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  handleEditChange("bloodGroup", e.target.value)
                }
                isInvalid={Boolean(editErrors.bloodGroup)}
              >
                <option value="" disabled>
                  Select Blood Group
                </option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </Form.Select>
              {editErrors.bloodGroup && (
                <Form.Text className="text-danger d-block mt-1">
                  {editErrors.bloodGroup}
                </Form.Text>
              )}
            </Form.Group>

            {isAnoProfile && (
              <Form.Group className="mb-3" controlId="editAnoRank">
                <Form.Label>Rank / Designation</Form.Label>
                <Form.Control
                  type="text"
                  value={editForm.rank}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleEditChange("rank", e.target.value)
                  }
                  placeholder="e.g., Major, Captain, Lieutenant"
                />
              </Form.Group>
            )}

            {!isAnoProfile && (
              <Form.Group className="mb-3" controlId="editResidentialStatus">
                <Form.Label>Residential Status</Form.Label>
                <Form.Select
                  value={editForm.residentialStatus}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    handleEditChange("residentialStatus", e.target.value)
                  }
                  isInvalid={Boolean(editErrors.residentialStatus)}
                >
                  <option value="" disabled>
                    Select Status
                  </option>
                  <option value="Day Scholar">Day Scholar</option>
                  <option value="Hosteller">Hosteller</option>
                </Form.Select>
                {editErrors.residentialStatus && (
                  <Form.Text className="text-danger d-block mt-1">
                    {editErrors.residentialStatus}
                  </Form.Text>
                )}
              </Form.Group>
            )}

            {!isAnoProfile && (
              <>
                <Form.Group className="mb-3" controlId="editFatherName">
                  <Form.Label>Father's / Guardian's Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={editForm.fatherName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleEditChange("fatherName", e.target.value)
                    }
                    placeholder="Enter father's or guardian's name"
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="editAddress">
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={editForm.address}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      handleEditChange("address", e.target.value)
                    }
                    placeholder="Enter your full address"
                  />
                </Form.Group>
              </>
            )}

            <Alert variant="warning" className="small">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {isAnoProfile
                ? "ANO profiles can update name, rank, phone, and blood group."
                : "Only name, residential status, and additional details can be modified by cadets."}
            </Alert>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowEditModal(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleRequestSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={confirmSave} onHide={() => setConfirmSave(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Save</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Save changes to your profile?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setConfirmSave(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveChanges}
            disabled={saving}
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Profile;
