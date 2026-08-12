import {
  DEPARTMENT_DEFS,
  NCC_RANKS,
  BLOOD_GROUPS,
} from "@/shared/config/constants";
import { db } from "@/shared/config/firebase";
import { addDoc, collection } from "firebase/firestore";
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
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import ProfilePhoto from "@/components/ProfilePhoto";
import { uploadAlumniPhoto } from "@/shared/utils/cloudinary";

const COOLDOWN_KEY = "alumni_submit_cooldown";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const YEAR_START = Array.from(  { length: 35 },  (_, i) => new Date().getFullYear() - 3 - i);
const YEAR_END = Array.from(  { length: 35 },  (_, i) => new Date().getFullYear() - i);

interface FormState {
  name: string;
  division: "SD" | "SW" | "";
  department: string;
  email: string;
  phone: string;
  bloodGroup: string;
  acStart: string;
  acEnd: string;
  nccStart: string;
  nccEnd: string;
  rank: string;
  achievements: string;
  website: string;
}

const AlumniSubmitForm: React.FC = () => {
  const [form, setForm] = useState<FormState>({
    name: "",
    division: "",
    department: "",
    email: "",
    phone: "",
    bloodGroup: "",
    acStart: "",
    acEnd: "",
    nccStart: "",
    nccEnd: "",
    rank: "",
    achievements: "",
    website: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (form.website.trim()) {
      setSubmitted(true);
      return;
    }

    const lastSubmit = localStorage.getItem(COOLDOWN_KEY);
    if (lastSubmit && Date.now() - Number(lastSubmit) < COOLDOWN_MS) {
      toast.error("You can only submit one profile every 24 hours.");
      return;
    }

    if (!form.name.trim() || !form.division || !form.department) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      let photoURL: string | undefined;
      let cloudinaryPublicId: string | undefined;

      const academicYear =
        form.acStart && form.acEnd
          ? `${form.acStart}-${form.acEnd}`
          : undefined;
      const nccTenure =
        form.nccStart && form.nccEnd
          ? `${form.nccStart}-${form.nccEnd}`
          : undefined;

      if (photoFile && form.division && nccTenure) {
        setPhotoUploading(true);
        try {
          const result = await uploadAlumniPhoto(
            photoFile,
            form.name,
            nccTenure,
            form.division as "SD" | "SW",
          );
          photoURL = result.secure_url;
          cloudinaryPublicId = result.public_id;
        } catch (uploadErr) {
          console.error("Photo upload failed:", uploadErr);
          toast.error(
            "Photo upload failed, but your profile will still be submitted.",
          );
        } finally {
          setPhotoUploading(false);
        }
      }

      const rawData = {
        name: form.name.trim(),
        division: form.division,
        department: form.department,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        bloodGroup: form.bloodGroup || undefined,
        academicYear: academicYear,
        nccTenure: nccTenure,
        rank: form.rank.trim() || undefined,
        achievements: form.achievements.trim() || undefined,
        status: "pending",
        visible: false,
        source: "self_submit",
        createdAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        photoURL,
        cloudinaryPublicId,
      };

      const data = Object.fromEntries(
        Object.entries(rawData).filter(([_, v]) => v !== undefined),
      );

      await addDoc(collection(db, "alumniProfiles"), data);

      localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      setSubmitted(true);
      toast.success("Profile submitted! It will appear after admin approval.");
    } catch (err) {
      console.error(err);
      toast.error("Submission failed. Please try again later.");
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
                  Your profile has been submitted for verification. The current
                  SUO/CUO will review your profile and contact you before it
                  appears on the public directory.
                </p>
                <Button as={Link} to="/alumni" variant="primary">
                  View Alumni Directory
                </Button>
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
                <p className="text-muted">
                  Share your NCC journey with current cadets and fellow alumni.
                </p>
              </div>

              <Form onSubmit={handleSubmit} noValidate>
                <div className="text-center mb-4">
                  <ProfilePhoto
                    photoURL={null}
                    size={100}
                    editable={true}
                    onPhotoSelected={(file) => setPhotoFile(file)}
                    onPhotoRemoved={() => setPhotoFile(null)}
                    uploading={photoUploading}
                  />
                  <Form.Text className="text-muted d-block mt-1">
                    Profile photo
                  </Form.Text>
                </div>
                {/* Hidden honeypot field for spam prevention */}
                <div className="visually-hidden" aria-hidden="true">
                  <Form.Control
                    type="text"
                    name="_contact_me_by_fax_only"
                    tabIndex={-1}
                    autoComplete="new-password"
                    value={form.website}
                    onChange={(
                      e: React.ChangeEvent<
                        HTMLInputElement | HTMLTextAreaElement
                      >,
                    ) => handleChange("website", e.target.value)}
                  />
                </div>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Name *</Form.Label>
                      <Form.Control
                        placeholder="Full Name with Initials at the end"
                        value={form.name}
                        onChange={(
                          e: React.ChangeEvent<
                            HTMLInputElement | HTMLTextAreaElement
                          >,
                        ) => handleChange("name", e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Division *</Form.Label>
                      <Form.Select
                        value={form.division}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          handleChange("division", e.target.value)
                        }
                        required
                      >
                        <option value="">Select</option>
                        <option value="SD">SD</option>
                        <option value="SW">SW</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Department *</Form.Label>
                      <Form.Select
                        value={form.department}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          handleChange("department", e.target.value)
                        }
                        required
                      >
                        <option value="">Select</option>
                        {DEPARTMENT_DEFS.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.code}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        placeholder="Active Email Id"
                        type="email"
                        value={form.email}
                        onChange={(
                          e: React.ChangeEvent<
                            HTMLInputElement | HTMLTextAreaElement
                          >,
                        ) => handleChange("email", e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Phone</Form.Label>
                      <Form.Control
                        placeholder="10-Digit Phone Number"
                        value={form.phone}
                        onChange={(
                          e: React.ChangeEvent<
                            HTMLInputElement | HTMLTextAreaElement
                          >,
                        ) => handleChange("phone", e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Blood Group</Form.Label>
                      <Form.Select
                        value={form.bloodGroup}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          handleChange("bloodGroup", e.target.value)
                        }
                      >
                        <option value="">Select</option>
                        {BLOOD_GROUPS.map((bg) => (
                          <option key={bg} value={bg}>
                            {bg}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label>Academic Tenure</Form.Label>
                      <Row className="g-2">
                        <Col>
                          <Form.Select
                            value={form.acStart}
                            onChange={(
                              e: React.ChangeEvent<HTMLSelectElement>,
                            ) => handleChange("acStart", e.target.value)}
                          >
                            <option value="" disabled>
                              Start Year
                            </option>
                            {YEAR_START.map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </Form.Select>
                        </Col>
                        <Col xs="auto" className="d-flex align-items-center">
                          to
                        </Col>
                        <Col>
                          <Form.Select
                            value={form.acEnd}
                            onChange={(
                              e: React.ChangeEvent<HTMLSelectElement>,
                            ) => handleChange("acEnd", e.target.value)}
                          >
                            <option value="" disabled>
                              End Year
                            </option>
                            {YEAR_END.map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </Form.Select>
                        </Col>
                      </Row>
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label>NCC Tenure</Form.Label>
                      <Row className="g-2">
                        <Col>
                          <Form.Select
                            value={form.nccStart}
                            onChange={(
                              e: React.ChangeEvent<HTMLSelectElement>,
                            ) => handleChange("nccStart", e.target.value)}
                          >
                            <option value="" disabled>
                              Start Year
                            </option>
                            {YEAR_START.map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </Form.Select>
                        </Col>
                        <Col xs="auto" className="d-flex align-items-center">
                          to
                        </Col>
                        <Col>
                          <Form.Select
                            value={form.nccEnd}
                            onChange={(
                              e: React.ChangeEvent<HTMLSelectElement>,
                            ) => handleChange("nccEnd", e.target.value)}
                          >
                            <option value="" disabled>
                              End Year
                            </option>
                            {YEAR_END.map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </Form.Select>
                        </Col>
                      </Row>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Rank</Form.Label>
                      <Form.Select
                        value={form.rank}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          handleChange("rank", e.target.value)
                        }
                      >
                        <option value="" disabled>
                          Select Rank
                        </option>
                        {NCC_RANKS.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.name} ({r.code})
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label>Achievements</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={form.achievements}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          handleChange("achievements", e.target.value)
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Alert variant="info" className="mt-3 small">
                  Your submission will be verified by the current SUO/CUO before
                  it appears publicly.
                </Alert>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-100 mt-2"
                  disabled={loading}
                >
                  {loading ? "Submitting..." : "Submit Profile"}
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
