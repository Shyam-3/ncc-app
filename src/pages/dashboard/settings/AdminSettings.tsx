import { useAuth } from "@/features/auth/AuthContext";
import { db } from "@/shared/config/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
  Tab,
  Tabs,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AboutSettingsTab from "./AboutSettingsTab";
import "./AdminSettings.css";

// ─── Constants ────────────────────────────────────────────────────────────────



function formatDatetimeLocal(isoString: string | null | undefined): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface AppConfig {
  nextRolloverDate: string;
  rolloverCompletedForTarget: boolean;
  lastRolloverAt: string | null;
  lastRolloverSummary: RolloverSummary | null;
  alumniRetentionMonths?: number;
}

interface GithubConfig {
  token: string;
  repo: string;
}

interface RecruitmentConfig {
  sdFormUrl: string;
  swFormUrl: string;
}

interface RolloverSummary {
  incremented: number;
  alumniNcc: number;
  deletedGraduated: number;
  skipped: number;
  expiredAlumniCleaned: number;
  timestamp: string;
}



// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AppConfig = {
  nextRolloverDate: "",
  rolloverCompletedForTarget: false,
  lastRolloverAt: null,
  lastRolloverSummary: null,
};

// ─── Component ────────────────────────────────────────────────────────────────

const AdminSettings: React.FC = () => {
  useAuth(); // keep for side-effects if needed, or remove completely if not
  const navigate = useNavigate();

  // Settings state
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isDateUnlocked, setIsDateUnlocked] = useState(false);
  const [githubConfig, setGithubConfig] = useState<GithubConfig>({
    token: "",
    repo: "",
  });
  const [configLoading, setConfigLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingGithubConfig, setSavingGithubConfig] = useState(false);

  // Confirmation modals

  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isGithubUnlocked, setIsGithubUnlocked] = useState(false);
  const [showGithubUnlockModal, setShowGithubUnlockModal] = useState(false);
  const [showGithubSaveModal, setShowGithubSaveModal] = useState(false);

  // Recruitment settings state
  const [recruitmentConfig, setRecruitmentConfig] = useState<RecruitmentConfig>(
    { sdFormUrl: "", swFormUrl: "" },
  );
  const [isRecruitmentUnlocked, setIsRecruitmentUnlocked] = useState(false);
  const [savingRecruitment, setSavingRecruitment] = useState(false);
  const [showRecruitmentUnlockModal, setShowRecruitmentUnlockModal] =
    useState(false);
  const [showRecruitmentSaveModal, setShowRecruitmentSaveModal] =
    useState(false);

  // Pending auth deletions count
  const [pendingCount] = useState(0);

  // ─── Load settings ───────────────────────────────────────────────────────

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const snap = await getDoc(doc(db, "settings", "appConfig"));
      if (snap.exists()) {
        setConfig({ ...DEFAULT_CONFIG, ...snap.data() } as AppConfig);
      }
      const ghSnap = await getDoc(doc(db, "settings", "github"));
      if (ghSnap.exists()) {
        setGithubConfig(ghSnap.data() as GithubConfig);
      }
      const recruitSnap = await getDoc(doc(db, "settings", "recruitment"));
      if (recruitSnap.exists()) {
        setRecruitmentConfig(recruitSnap.data() as RecruitmentConfig);
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    } finally {
      setConfigLoading(false);
    }
  }, []);



  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // ─── Save settings ──────────────────────────────────────────────────────

  const handleSaveClick = () => {
    if (config.nextRolloverDate) {
      if (new Date(config.nextRolloverDate) < new Date()) {
        toast.error("Rollover date and time cannot be in the past");
        return;
      }
    }
    setShowSaveModal(true);
  };

  const handleSaveConfig = async () => {
    setShowSaveModal(false);
    setSavingConfig(true);
    try {
      await setDoc(
        doc(db, "settings", "appConfig"),
        {
          nextRolloverDate: config.nextRolloverDate,
          rolloverCompletedForTarget: false,
        },
        { merge: true },
      );
      setIsDateUnlocked(false);
      toast.success("Settings saved");
      loadConfig();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save settings");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveGithubClick = () => {
    setShowGithubSaveModal(true);
  };

  const handleSaveGithubConfig = async () => {
    setShowGithubSaveModal(false);
    setSavingGithubConfig(true);
    try {
      await setDoc(doc(db, "settings", "github"), githubConfig, {
        merge: true,
      });
      setIsGithubUnlocked(false);
      toast.success("GitHub Action settings saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save GitHub settings");
    } finally {
      setSavingGithubConfig(false);
    }
  };

  // ─── Save recruitment settings ───────────────────────────────────────

  const handleSaveRecruitmentClick = () => {
    setShowRecruitmentSaveModal(true);
  };

  const handleSaveRecruitmentConfig = async () => {
    setShowRecruitmentSaveModal(false);
    setSavingRecruitment(true);
    try {
      await setDoc(doc(db, "settings", "recruitment"), recruitmentConfig, {
        merge: true,
      });
      setIsRecruitmentUnlocked(false);
      toast.success("Recruitment settings saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save recruitment settings");
    } finally {
      setSavingRecruitment(false);
    }
  };

  // ─── Plan rollover (dry-run) ────────────────────────────────────────────



  if (configLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner as="span" animation="border" size="sm" />
        <p className="mt-2 text-muted">Loading settings...</p>
      </Container>
    );
  }

  return (
    <Container className="py-5 admin-settings">
      <Card className="shadow border-0">
        <Card.Header className="bg-primary text-white d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
          <div className="d-flex align-items-center">
            <i className="bi bi-gear fs-4 me-2" />
            <div>
              <h3 className="mb-0">Admin Settings</h3>
              <div className="small opacity-75">
                Configure automation and manage year rollover
              </div>
            </div>
          </div>
          <Button
            variant="light"
            size="sm"
            onClick={() => navigate("/dashboard")}
          >
            <i className="bi bi-arrow-left me-1"></i> Back
          </Button>
        </Card.Header>
        <Card.Body className="bg-light">
          <Tabs
            defaultActiveKey="about"
            id="admin-settings-tabs"
            className="mb-4"
          >
            <Tab eventKey="about" title="About Page">
              <AboutSettingsTab />
            </Tab>
            <Tab eventKey="automation" title="Automation">
              {/* ── Settings Section ──────────────────────────────────────────────── */}
              <div className="settings-section mt-3">
                <Card>
                  <Card.Header className="bg-white">
                    <i className="bi bi-sliders me-2" />
                    Rollover Configuration
                  </Card.Header>
                  <Card.Body>
                    <Row className="g-3">
                      <Col md={8}>
                        <Form.Label className="small fw-semibold">
                          Next Scheduled Rollover
                        </Form.Label>
                        <div className="d-flex gap-2">
                          <Form.Control
                            type="datetime-local"
                            size="sm"
                            value={formatDatetimeLocal(config.nextRolloverDate)}
                            disabled={
                              Boolean(config.nextRolloverDate) &&
                              !isDateUnlocked
                            }
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) =>
                              setConfig((c) => ({
                                ...c,
                                nextRolloverDate: e.target.value
                                  ? new Date(e.target.value).toISOString()
                                  : "",
                                rolloverCompletedForTarget: false,
                              }))
                            }
                          />
                          {Boolean(config.nextRolloverDate) &&
                            !isDateUnlocked && (
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                title="Modify Schedule"
                                onClick={() => setShowUnlockModal(true)}
                              >
                                <i className="bi bi-pencil" />
                              </Button>
                            )}
                        </div>
                        <Form.Text
                          className="text-muted"
                          style={{ fontSize: "0.75rem" }}
                        >
                          The background automation will run at this exact date
                          and time.
                        </Form.Text>
                      </Col>
                    </Row>
                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={handleSaveClick}
                        disabled={savingConfig}
                      >
                        {savingConfig ? (
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            className="me-1"
                          />
                        ) : (
                          <i className="bi bi-check-lg me-1" />
                        )}
                        Save Settings
                      </Button>
                    </div>
                  </Card.Body>
                </Card>

                {/* ── GitHub Automation Config ──────────────────────────────────────── */}
                <Card className="mt-4">
                  <Card.Header className="bg-white">
                    <i className="bi bi-github me-2" />
                    Instant Cleanup Config (GitHub Actions)
                  </Card.Header>
                  <Card.Body>
                    <p className="text-muted small mb-3">
                      To allow this app to instantly clean up Firebase Auth
                      accounts immediately after a user is deleted, you must
                      provide a GitHub Personal Access Token with{" "}
                      <strong>Actions: Read/Write</strong> permissions.
                    </p>
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Label className="small fw-semibold">
                          GitHub Repo
                        </Form.Label>
                        <Form.Control
                          type="text"
                          size="sm"
                          placeholder="Owner/Repository"
                          value={githubConfig.repo}
                          disabled={
                            Boolean(githubConfig.repo) && !isGithubUnlocked
                          }
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setGithubConfig({
                              ...githubConfig,
                              repo: e.target.value,
                            })
                          }
                        />
                      </Col>
                      <Col md={6}>
                        <Form.Label className="small fw-semibold">
                          GitHub Token (PAT)
                        </Form.Label>
                        <Form.Control
                          type="password"
                          size="sm"
                          placeholder="github_pat_..."
                          value={githubConfig.token}
                          disabled={
                            Boolean(githubConfig.repo) && !isGithubUnlocked
                          }
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setGithubConfig({
                              ...githubConfig,
                              token: e.target.value,
                            })
                          }
                        />
                      </Col>
                    </Row>
                    <div className="mt-3">
                      {Boolean(githubConfig.repo) && !isGithubUnlocked ? (
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={() => setShowGithubUnlockModal(true)}
                        >
                          <i className="bi bi-pencil me-1" />
                          Modify GitHub Settings
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="dark"
                          onClick={handleSaveGithubClick}
                          disabled={savingGithubConfig}
                        >
                          {savingGithubConfig ? (
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              className="me-1"
                            />
                          ) : (
                            <i className="bi bi-check-lg me-1" />
                          )}
                          Save GitHub Settings
                        </Button>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </div>

              {/* ── Last Rollover Info ────────────────────────────────────────────── */}
              {config.lastRolloverAt && (
                <div className="settings-section">
                  <Card>
                    <Card.Header className="bg-white">
                      <i className="bi bi-clock-history me-2" />
                      Last Rollover
                    </Card.Header>
                    <Card.Body>
                      <p className="mb-2">
                        <strong>Date:</strong>{" "}
                        {new Date(config.lastRolloverAt).toLocaleString(
                          "en-IN",
                          {
                            dateStyle: "long",
                            timeStyle: "short",
                          },
                        )}
                      </p>
                      {config.lastRolloverSummary && (
                        <Row className="g-2">
                          <Col xs={6} md={3}>
                            <Card className="summary-card p-2 border-primary bg-primary text-white">
                              <div className="display-6 fw-bold">
                                {config.lastRolloverSummary.incremented}
                              </div>
                              <small>Incremented</small>
                            </Card>
                          </Col>
                          <Col xs={6} md={3}>
                            <Card className="summary-card p-2 border-warning bg-warning bg-opacity-10">
                              <div className="display-6 fw-bold text-warning">
                                {config.lastRolloverSummary.alumniNcc}
                              </div>
                              <small className="text-dark">→ Alumni</small>
                            </Card>
                          </Col>
                          <Col xs={6} md={3}>
                            <Card className="summary-card p-2 border-danger bg-danger text-white">
                              <div className="display-6 fw-bold">
                                {config.lastRolloverSummary.deletedGraduated}
                              </div>
                              <small>Archived & Deleted</small>
                            </Card>
                          </Col>
                          <Col xs={6} md={3}>
                            <Card className="summary-card p-2 border-secondary bg-secondary bg-opacity-10">
                              <div className="display-6 fw-bold text-secondary">
                                {config.lastRolloverSummary.skipped}
                              </div>
                              <small className="text-dark">Skipped</small>
                            </Card>
                          </Col>
                        </Row>
                      )}
                    </Card.Body>
                  </Card>
                </div>
              )}

              {/* ── Pending Auth Deletions ────────────────────────────────────────── */}
              <div className="settings-section">
                <Card>
                  <Card.Header className="bg-white">
                    <i className="bi bi-person-x me-2" />
                    Pending Auth Deletions
                  </Card.Header>
                  <Card.Body>
                    <div className="d-flex align-items-center gap-3">
                      <div>
                        <span className="pending-queue-badge text-danger">
                          {pendingCount}
                        </span>
                        <span className="text-muted ms-2">
                          accounts queued for Auth cleanup
                        </span>
                      </div>
                    </div>
                    <p className="text-muted small mt-2 mb-0">
                      <i className="bi bi-info-circle me-1" />
                      Auth accounts are automatically cleaned up weekly via
                      GitHub Actions. You can also trigger it manually from your
                      GitHub repo → Actions → "Auth Account Cleanup" → Run
                      workflow.
                    </p>
                  </Card.Body>
                </Card>
              </div>
            </Tab>

            {/* ── Recruitment Tab ──────────────────────────────────────────────── */}
            <Tab eventKey="recruitment" title="Recruitment">
              <div className="settings-section mt-3">
                <Card>
                  <Card.Header className="bg-white">
                    <i className="bi bi-megaphone me-2" />
                    Recruitment Form Links
                  </Card.Header>
                  <Card.Body>
                    <p className="text-muted small mb-3">
                      Configure the Google Form URLs for SD and SW recruitment.
                      These URLs will be shown to applicants when they click
                      "Apply Now" on a recruitment announcement.
                    </p>
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Label className="small fw-semibold">
                          SD (Senior Division) Form URL
                        </Form.Label>
                        <div className="d-flex gap-2">
                          <Form.Control
                            type="url"
                            size="sm"
                            placeholder="https://forms.google.com/..."
                            value={recruitmentConfig.sdFormUrl}
                            disabled={
                              Boolean(
                                recruitmentConfig.sdFormUrl ||
                                recruitmentConfig.swFormUrl,
                              ) && !isRecruitmentUnlocked
                            }
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) =>
                              setRecruitmentConfig((c) => ({
                                ...c,
                                sdFormUrl: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <Form.Text
                          className="text-muted"
                          style={{ fontSize: "0.75rem" }}
                        >
                          Google Form link for male cadets (Senior Division)
                        </Form.Text>
                      </Col>
                      <Col md={6}>
                        <Form.Label className="small fw-semibold">
                          SW (Senior Wing) Form URL
                        </Form.Label>
                        <div className="d-flex gap-2">
                          <Form.Control
                            type="url"
                            size="sm"
                            placeholder="https://forms.google.com/..."
                            value={recruitmentConfig.swFormUrl}
                            disabled={
                              Boolean(
                                recruitmentConfig.sdFormUrl ||
                                recruitmentConfig.swFormUrl,
                              ) && !isRecruitmentUnlocked
                            }
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) =>
                              setRecruitmentConfig((c) => ({
                                ...c,
                                swFormUrl: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <Form.Text
                          className="text-muted"
                          style={{ fontSize: "0.75rem" }}
                        >
                          Google Form link for female cadets (Senior Wing)
                        </Form.Text>
                      </Col>
                    </Row>
                    <div className="mt-3 d-flex gap-2">
                      {Boolean(
                        recruitmentConfig.sdFormUrl ||
                        recruitmentConfig.swFormUrl,
                      ) &&
                        !isRecruitmentUnlocked && (
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => setShowRecruitmentUnlockModal(true)}
                          >
                            <i className="bi bi-pencil me-1" />
                            Modify URLs
                          </Button>
                        )}
                      {(isRecruitmentUnlocked ||
                        (!recruitmentConfig.sdFormUrl &&
                          !recruitmentConfig.swFormUrl)) && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={handleSaveRecruitmentClick}
                          disabled={savingRecruitment}
                        >
                          {savingRecruitment ? (
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              className="me-1"
                            />
                          ) : (
                            <i className="bi bi-check-lg me-1" />
                          )}
                          Save Recruitment Settings
                        </Button>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </div>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {/* ── Unlock Date Confirmation Modal ───────────────────────────────────── */}
      <Modal
        show={showUnlockModal}
        onHide={() => setShowUnlockModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil-square text-primary me-2" />
            Modify Schedule
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to modify the currently scheduled rollover date?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUnlockModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setIsDateUnlocked(true);
              setShowUnlockModal(false);
            }}
          >
            Yes, Modify
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Save Confirmation Modal ──────────────────────────────────────────── */}
      <Modal
        show={showSaveModal}
        onHide={() => setShowSaveModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-save text-success me-2" />
            Confirm Changes
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to save these rollover settings? The automation
          will run exactly according to these new parameters.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSaveModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleSaveConfig}>
            Yes, Save Settings
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── GitHub Unlock Modal ──────────────────────────────────────────── */}
      <Modal
        show={showGithubUnlockModal}
        onHide={() => setShowGithubUnlockModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil-square text-primary me-2" />
            Modify GitHub Settings
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to modify the GitHub Action credentials?
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowGithubUnlockModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setIsGithubUnlocked(true);
              setShowGithubUnlockModal(false);
            }}
          >
            Yes, Modify
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── GitHub Save Confirmation Modal ───────────────────────────────── */}
      <Modal
        show={showGithubSaveModal}
        onHide={() => setShowGithubSaveModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-save text-success me-2" />
            Confirm GitHub Settings
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to save these new GitHub credentials? The app
          will use these to trigger background cleanups.
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowGithubSaveModal(false)}
          >
            Cancel
          </Button>
          <Button variant="success" onClick={handleSaveGithubConfig}>
            Yes, Save Settings
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Recruitment Unlock Modal ───────────────────────────────────────── */}
      <Modal
        show={showRecruitmentUnlockModal}
        onHide={() => setShowRecruitmentUnlockModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil-square text-primary me-2" />
            Modify Recruitment URLs
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to modify the recruitment form URLs?
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowRecruitmentUnlockModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setIsRecruitmentUnlocked(true);
              setShowRecruitmentUnlockModal(false);
            }}
          >
            Yes, Modify
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Recruitment Save Confirmation Modal ────────────────────────────── */}
      <Modal
        show={showRecruitmentSaveModal}
        onHide={() => setShowRecruitmentSaveModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-save text-success me-2" />
            Confirm Recruitment Settings
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to save these recruitment form URLs? Applicants
          will be redirected to these links when they click "Apply Now".
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowRecruitmentSaveModal(false)}
          >
            Cancel
          </Button>
          <Button variant="success" onClick={handleSaveRecruitmentConfig}>
            Yes, Save Settings
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminSettings;
