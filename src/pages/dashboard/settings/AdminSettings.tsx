import { useAuth } from '@/features/auth/context/AuthContext';
import { db } from '@/shared/config/firebase';
import { DEPARTMENT_DEFS } from '@/shared/config/constants';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
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
  Table,
  Tab,
  Tabs,
} from 'react-bootstrap';
import toast from 'react-hot-toast';
import { triggerAuthCleanup } from '@/shared/utils/githubActions';
import './AdminSettings.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACADEMIC_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
const NCC_YEARS = ['1st Year', '2nd Year', '3rd Year'];

interface AppConfig {
  nextRolloverDate: string;
  rolloverCompletedForTarget: boolean;
  lastRolloverAt: string | null;
  lastRolloverSummary: RolloverSummary | null;
}

interface GithubConfig {
  token: string;
  repo: string;
}

interface RolloverSummary {
  incremented: number;
  alumniNcc: number;
  deletedGraduated: number;
  skipped: number;
  expiredAlumniCleaned: number;
  timestamp: string;
}

interface CadetDoc {
  id: string;
  name?: string;
  email?: string;
  year?: string;
  nccYear?: string;
  department?: string;
  division?: string;
  rank?: string;
  regimentalNumber?: string;
  dateOfEnrollment?: string;
  rollNo?: string;
  registerNumber?: string;
  phone?: string;
  bloodGroup?: string;
  fatherName?: string;
  address?: string;
  residentialStatus?: string;
  nccNo?: string;
  dateOfBirth?: string;
  [key: string]: any;
}

interface UserDoc {
  uid: string;
  role: string;
  [key: string]: any;
}

type RolloverAction = 'increment' | 'alumni_ncc' | 'delete_graduated' | 'skip' | 'increment_academic_only';

interface RolloverPlanItem {
  cadetId: string;
  cadetName: string;
  currentYear: string;
  currentNccYear: string;
  department: string;
  userRole: string;
  action: RolloverAction;
  newYear?: string;
  newNccYear?: string;
  reason: string;
}

interface RollbackSnapshot {
  id: string;
  timestamp: string;
  summary: RolloverSummary;
  cadets: Record<string, CadetDoc>;
  users: Record<string, UserDoc>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNextYear(current: string, yearList: string[]): string | null {
  const idx = yearList.indexOf(current);
  if (idx < 0 || idx >= yearList.length - 1) return null;
  return yearList[idx + 1];
}

function getMaxAcademicYear(department: string): string {
  const dept = DEPARTMENT_DEFS.find((d) => d.code === department);
  return dept?.courseTenure === 5 ? '5th Year' : '4th Year';
}

function isAcademicComplete(year: string, department: string): boolean {
  return year === getMaxAcademicYear(department);
}

function isNccComplete(nccYear: string): boolean {
  return nccYear === '3rd Year';
}

const DEFAULT_CONFIG: AppConfig = {
  nextRolloverDate: '',
  rolloverCompletedForTarget: false,
  lastRolloverAt: null,
  lastRolloverSummary: null,
};

// ─── Component ────────────────────────────────────────────────────────────────

const AdminSettings: React.FC = () => {
  const { userProfile } = useAuth();

  // Settings state
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isDateUnlocked, setIsDateUnlocked] = useState(false);
  const [githubConfig, setGithubConfig] = useState<GithubConfig>({ token: '', repo: '' });
  const [configLoading, setConfigLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingGithubConfig, setSavingGithubConfig] = useState(false);

  // Rollover state
  const [plan, setPlan] = useState<RolloverPlanItem[] | null>(null);
  const [planning, setPlanning] = useState(false);
  const [executing, setExecuting] = useState(false);

  // Rollback state
  const [snapshots, setSnapshots] = useState<{ id: string; timestamp: string; summary: RolloverSummary }[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string>('');
  const [rollingBack, setRollingBack] = useState(false);

  // Pending auth deletions count
  const [pendingCount, setPendingCount] = useState(0);

  // Confirmation modals
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isGithubUnlocked, setIsGithubUnlocked] = useState(false);
  const [showGithubUnlockModal, setShowGithubUnlockModal] = useState(false);
  const [showGithubSaveModal, setShowGithubSaveModal] = useState(false);

  // ─── Load settings ───────────────────────────────────────────────────────

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const snap = await getDoc(doc(db, 'settings', 'appConfig'));
      if (snap.exists()) {
        setConfig({ ...DEFAULT_CONFIG, ...snap.data() } as AppConfig);
      }
      const ghSnap = await getDoc(doc(db, 'settings', 'github'));
      if (ghSnap.exists()) {
        setGithubConfig(ghSnap.data() as GithubConfig);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const loadSnapshots = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'rollbackSnapshots'));
      const list = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            timestamp: data.timestamp || d.id,
            summary: data.summary as RolloverSummary,
          };
        })
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setSnapshots(list);
    } catch (e) {
      console.error('Failed to load snapshots:', e);
    }
  }, []);

  const loadPendingCount = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'pendingAuthDeletions'));
      setPendingCount(snap.size);
    } catch (e) {
      console.error('Failed to load pending count:', e);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadSnapshots();
    loadPendingCount();
  }, [loadConfig, loadSnapshots, loadPendingCount]);

  // ─── Save settings ──────────────────────────────────────────────────────

  const handleSaveClick = () => {
    if (config.nextRolloverDate) {
      if (new Date(config.nextRolloverDate) < new Date()) {
        toast.error('Rollover date and time cannot be in the past');
        return;
      }
    }
    setShowSaveModal(true);
  };

  const handleSaveConfig = async () => {
    setShowSaveModal(false);
    setSavingConfig(true);
    try {
      await setDoc(doc(db, 'settings', 'appConfig'), config, { merge: true });
      setIsDateUnlocked(false);
      toast.success('Settings saved');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save settings');
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
      await setDoc(doc(db, 'settings', 'github'), githubConfig, { merge: true });
      setIsGithubUnlocked(false);
      toast.success('GitHub Action settings saved');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save GitHub settings');
    } finally {
      setSavingGithubConfig(false);
    }
  };

  // ─── Plan rollover (dry-run) ────────────────────────────────────────────

  const handleDryRun = async () => {
    setPlanning(true);
    setPlan(null);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const items: RolloverPlanItem[] = [];

      for (const userDoc of usersSnap.docs) {
        const cadet = { id: userDoc.id, ...userDoc.data() } as CadetDoc;
        const cadetId = cadet.id;

        const userRole = cadet.role || 'member';

        const year = cadet.year || '';
        const nccYear = cadet.nccYear || '';
        const dept = cadet.department || '';

        // Skip superadmins
        if (userRole === 'superadmin') {
          items.push({
            cadetId,
            cadetName: cadet.name || cadetId,
            currentYear: year,
            currentNccYear: nccYear,
            department: dept,
            userRole,
            action: 'skip',
            reason: 'Superadmin — not touched',
          });
          continue;
        }

        const isAcademicDone = isAcademicComplete(year, dept);
        const isNccDone = isNccComplete(nccYear);
        const newYear = getNextYear(year, ACADEMIC_YEARS) || year;
        const newNccYear = getNextYear(nccYear, NCC_YEARS) || nccYear;

        // RULE 1: If Academic tenure is complete, delete from app
        if (isAcademicDone) {
          items.push({
            cadetId,
            cadetName: cadet.name || cadetId,
            currentYear: year,
            currentNccYear: nccYear,
            department: dept,
            userRole,
            action: 'delete_graduated',
            reason: `Academic ${year} complete → delete from app`,
          });
          continue;
        }

        // RULE 2: If NCC tenure is complete
        if (isNccDone) {
          if (userRole !== 'alumni') {
            items.push({
              cadetId,
              cadetName: cadet.name || cadetId,
              currentYear: year,
              currentNccYear: nccYear,
              department: dept,
              userRole,
              action: 'alumni_ncc',
              newYear,
              reason: `NCC complete → change to alumni, promote to ${newYear}`,
            });
          } else {
            items.push({
              cadetId,
              cadetName: cadet.name || cadetId,
              currentYear: year,
              currentNccYear: nccYear,
              department: dept,
              userRole,
              action: 'increment_academic_only',
              newYear,
              reason: `Already alumni → promote to ${newYear}`,
            });
          }
          continue;
        }

        // RULE 3: Still active in both
        items.push({
          cadetId,
          cadetName: cadet.name || cadetId,
          currentYear: year,
          currentNccYear: nccYear,
          department: dept,
          userRole,
          action: 'increment',
          newYear,
          newNccYear,
          reason: `${year} → ${newYear}, NCC ${nccYear} → ${newNccYear}`,
        });
      }

      setPlan(items);
      toast.success(`Dry run complete — ${items.length} cadets analyzed`);
    } catch (e) {
      console.error(e);
      toast.error('Dry run failed');
    } finally {
      setPlanning(false);
    }
  };

  // ─── Execute rollover ───────────────────────────────────────────────────

  const handleExecuteRollover = async () => {
    if (!plan) return;
    setShowExecuteModal(false);
    setExecuting(true);

    try {
      // 1. Collect all current user data for snapshot
      const snapshotUsers: Record<string, UserDoc> = {};

      const usersSnap = await getDocs(collection(db, 'users'));
      for (const d of usersSnap.docs) {
        snapshotUsers[d.id] = { uid: d.id, ...d.data() } as UserDoc;
      }


      // 2. Save rollback snapshot
      const snapshotId = new Date().toISOString().replace(/[:.]/g, '-');
      const summary: RolloverSummary = {
        incremented: plan.filter((p) => p.action === 'increment').length,
        alumniNcc: plan.filter((p) => p.action === 'alumni_ncc').length,
        deletedGraduated: plan.filter((p) => p.action === 'delete_graduated').length,
        skipped: plan.filter((p) => p.action === 'skip').length,
        expiredAlumniCleaned: 0,
        timestamp: new Date().toISOString(),
      };

      await setDoc(doc(db, 'rollbackSnapshots', snapshotId), {
        timestamp: new Date().toISOString(),
        summary,
        users: snapshotUsers,
      });

      // 3. Execute in batches (Firestore limit: 500 ops per batch)
      const actionItems = plan.filter((p) => p.action !== 'skip');
      const BATCH_SIZE = 450; // leave some room

      for (let i = 0; i < actionItems.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = actionItems.slice(i, i + BATCH_SIZE);

        for (const item of chunk) {
          const userRef = doc(db, 'users', item.cadetId);
          const alumniRef = doc(db, 'alumni', item.cadetId);

          switch (item.action) {
            case 'alumni_ncc': {
              const userData = snapshotUsers[item.cadetId] || {};
              const { uid: _uid, ...alumniData } = userData;
              batch.set(alumniRef, {
                ...alumniData,
                reasonForArchival: 'ncc_tenure_complete',
                archivedAt: new Date().toISOString(),
                retentionExpiresAt: getRetentionExpiry(config.alumniRetentionMonths),
              });
              batch.update(userRef, { 
                role: 'alumni',
                year: item.newYear 
              });
              break;
            }

            case 'increment_academic_only': {
              batch.update(userRef, {
                year: item.newYear
              });
              break;
            }

            case 'delete_graduated': {
              const userData = snapshotUsers[item.cadetId] || {};
              // Only archive if they weren't already an alumni
              if (item.userRole !== 'alumni') {
                const { uid: _uid, ...alumniData } = userData;
                batch.set(alumniRef, {
                  ...alumniData,
                  reasonForArchival: 'academic_complete',
                  archivedAt: new Date().toISOString(),
                  retentionExpiresAt: getRetentionExpiry(config.alumniRetentionMonths),
                });
              }
              batch.delete(userRef);
              batch.set(doc(db, 'pendingAuthDeletions', item.cadetId), {
                email: snapshotUsers[item.cadetId]?.email || '',
                deletedBy: userProfile?.uid || 'rollover-script',
                deletedAt: new Date().toISOString(),
                reason: 'academic_complete_rollover',
              });
              break;
            }

            case 'increment': {
              batch.update(userRef, {
                year: item.newYear,
                nccYear: item.newNccYear,
              });
              break;
            }
          }
        }

        await batch.commit();
      }

      // 4. Clean up expired alumni
      let expiredCleaned = 0;
      try {
        const alumniSnap = await getDocs(collection(db, 'alumni'));
        const now = new Date();
        const expiredBatch = writeBatch(db);
        let batchCount = 0;

        for (const alumniDoc of alumniSnap.docs) {
          const data = alumniDoc.data();
          if (data.retentionExpiresAt && new Date(data.retentionExpiresAt) < now) {
            expiredBatch.delete(doc(db, 'alumni', alumniDoc.id));
            expiredCleaned++;
            batchCount++;
            if (batchCount >= 450) {
              await expiredBatch.commit();
              batchCount = 0;
            }
          }
        }
        if (batchCount > 0) await expiredBatch.commit();
      } catch (e) {
        console.warn('Alumni cleanup error:', e);
      }

      summary.expiredAlumniCleaned = expiredCleaned;

      // 5. Update settings with last rollover info
      await setDoc(doc(db, 'settings', 'appConfig'), {
        ...config,
        lastRolloverAt: new Date().toISOString(),
        lastRolloverSummary: summary,
      }, { merge: true });

      // 6. Write audit log
      await setDoc(doc(db, 'auditLogs', `rollover-${snapshotId}`), {
        type: 'year_rollover',
        performedBy: userProfile?.uid || 'unknown',
        performedAt: new Date().toISOString(),
        summary,
        snapshotId,
      });

      toast.success(
        `Rollover complete! Incremented: ${summary.incremented}, Alumni: ${summary.alumniNcc}, Deleted: ${summary.deletedGraduated}`
      );

      // Trigger instant auth cleanup
      toast.success('Cleaning up auth accounts...');
      triggerAuthCleanup();

      // Refresh
      setPlan(null);
      await loadConfig();
      await loadSnapshots();
      await loadPendingCount();
    } catch (e) {
      console.error('Rollover execution failed:', e);
      toast.error('Rollover failed! Check console for details.');
    } finally {
      setExecuting(false);
    }
  };

  // ─── Rollback ───────────────────────────────────────────────────────────

  const handleRollback = async () => {
    if (!selectedSnapshot) return;
    setShowRollbackModal(false);
    setRollingBack(true);

    try {
      const snapDoc = await getDoc(doc(db, 'rollbackSnapshots', selectedSnapshot));
      if (!snapDoc.exists()) {
        toast.error('Snapshot not found');
        return;
      }

      const data = snapDoc.data() as RollbackSnapshot;
      const userEntries = Object.entries(data.users || {});

      // Restore in batches
      const BATCH_SIZE = 450;

      // Restore users
      for (let i = 0; i < userEntries.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = userEntries.slice(i, i + BATCH_SIZE);
        for (const [userId, userData] of chunk) {
          const { uid: _uid, ...rest } = userData;
          batch.set(doc(db, 'users', userId), { uid: userId, ...rest }, { merge: true });
          
          // Also delete from alumni if they were moved there
          batch.delete(doc(db, 'alumni', userId));
          // Remove from pending auth deletions if queued
          batch.delete(doc(db, 'pendingAuthDeletions', userId));
        }
        await batch.commit();
      }

      // Write audit log
      await setDoc(doc(db, 'auditLogs', `rollback-${Date.now()}`), {
        type: 'year_rollover_rollback',
        performedBy: userProfile?.uid || 'unknown',
        performedAt: new Date().toISOString(),
        snapshotId: selectedSnapshot,
        restoredUsers: userEntries.length,
      });

      toast.success(`Rollback complete! Restored ${userEntries.length} users`);
      setPlan(null);
      setSelectedSnapshot('');

      // 6. Reload Data
      await loadConfig();
      await loadSnapshots();
      await loadPendingCount();
    } catch (e) {
      console.error('Rollback failed:', e);
      toast.error('Rollback failed! Check console for details.');
    } finally {
      setRollingBack(false);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────

  function formatDatetimeLocal(isoString: string): string {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }



  function getActionBadge(action: RolloverAction) {
    switch (action) {
      case 'increment':
        return <Badge bg="primary" className="action-badge">Increment</Badge>;
      case 'alumni_ncc':
        return <Badge bg="warning" text="dark" className="action-badge">→ Alumni (NCC)</Badge>;
      case 'delete_graduated':
        return <Badge bg="danger" className="action-badge">Archive & Delete</Badge>;
      case 'skip':
        return <Badge bg="secondary" className="action-badge">Skip</Badge>;
    }
  }

  const planCounts = plan
    ? {
        increment: plan.filter((p) => p.action === 'increment').length,
        alumniNcc: plan.filter((p) => p.action === 'alumni_ncc').length,
        deleteGraduated: plan.filter((p) => p.action === 'delete_graduated').length,
        skip: plan.filter((p) => p.action === 'skip').length,
      }
    : null;

  // ─── Render ─────────────────────────────────────────────────────────────

  if (configLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p className="mt-2 text-muted">Loading settings...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4 admin-settings">
      <h2 className="mb-1">
        <i className="bi bi-gear me-2" />
        Admin Settings
      </h2>
      <p className="text-muted mb-4">Configure automation and manage year rollover</p>

      <Tabs defaultActiveKey="automation" id="admin-settings-tabs" className="mb-4">
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
                <Form.Label className="small fw-semibold">Next Scheduled Rollover</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="datetime-local"
                    size="sm"
                    value={formatDatetimeLocal(config.nextRolloverDate)}
                    disabled={Boolean(config.nextRolloverDate) && !isDateUnlocked}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setConfig((c) => ({
                        ...c,
                        nextRolloverDate: e.target.value ? new Date(e.target.value).toISOString() : '',
                        rolloverCompletedForTarget: false,
                      }))
                    }
                  />
                  {Boolean(config.nextRolloverDate) && !isDateUnlocked && (
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
                <Form.Text className="text-muted" style={{ fontSize: '0.75rem' }}>
                  The background automation will run at this exact date and time.
                </Form.Text>
              </Col>
            </Row>
            <div className="mt-3">
              <Button size="sm" variant="success" onClick={handleSaveClick} disabled={savingConfig}>
                {savingConfig ? <Spinner animation="border" size="sm" className="me-1" /> : <i className="bi bi-check-lg me-1" />}
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
              To allow this app to instantly clean up Firebase Auth accounts immediately after a user is deleted, you must provide a GitHub Personal Access Token with <strong>Actions: Read/Write</strong> permissions.
            </p>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label className="small fw-semibold">GitHub Repo (e.g. Shyam-3/ncc-app)</Form.Label>
                <Form.Control
                  type="text"
                  size="sm"
                  placeholder="Owner/Repository"
                  value={githubConfig.repo}
                  disabled={Boolean(githubConfig.repo) && !isGithubUnlocked}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGithubConfig({ ...githubConfig, repo: e.target.value })}
                />
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-semibold">GitHub Token (PAT)</Form.Label>
                <Form.Control
                  type="password"
                  size="sm"
                  placeholder="github_pat_..."
                  value={githubConfig.token}
                  disabled={Boolean(githubConfig.repo) && !isGithubUnlocked}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGithubConfig({ ...githubConfig, token: e.target.value })}
                />
              </Col>
            </Row>
            <div className="mt-3">
              {Boolean(githubConfig.repo) && !isGithubUnlocked ? (
                <Button size="sm" variant="outline-secondary" onClick={() => setShowGithubUnlockModal(true)}>
                  <i className="bi bi-pencil me-1" />
                  Modify GitHub Settings
                </Button>
              ) : (
                <Button size="sm" variant="dark" onClick={handleSaveGithubClick} disabled={savingGithubConfig}>
                  {savingGithubConfig ? <Spinner animation="border" size="sm" className="me-1" /> : <i className="bi bi-check-lg me-1" />}
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
                <strong>Date:</strong>{' '}
                {new Date(config.lastRolloverAt).toLocaleString('en-IN', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}
              </p>
              {config.lastRolloverSummary && (
                <Row className="g-2">
                  <Col xs={6} md={3}>
                    <Card className="summary-card p-2 bg-light">
                      <div className="display-6 text-primary">{config.lastRolloverSummary.incremented}</div>
                      <small className="text-muted">Incremented</small>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="summary-card p-2 bg-light">
                      <div className="display-6 text-warning">{config.lastRolloverSummary.alumniNcc}</div>
                      <small className="text-muted">→ Alumni</small>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="summary-card p-2 bg-light">
                      <div className="display-6 text-danger">{config.lastRolloverSummary.deletedGraduated}</div>
                      <small className="text-muted">Archived & Deleted</small>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="summary-card p-2 bg-light">
                      <div className="display-6 text-secondary">{config.lastRolloverSummary.skipped}</div>
                      <small className="text-muted">Skipped</small>
                    </Card>
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>
        </div>
      )}

      {/* ── Year Rollover Actions ─────────────────────────────────────────── */}
      <div className="settings-section">
        <Card>
          <Card.Header className="bg-white">
            <i className="bi bi-arrow-repeat me-2" />
            Year Rollover
          </Card.Header>
          <Card.Body>
            <p className="text-muted small mb-3">
              Preview what will happen to each cadet before applying changes. This is safe — no data is modified until you click "Apply Rollover".
            </p>

            <div className="d-flex gap-2 mb-3">
              <Button
                variant="outline-primary"
                onClick={handleDryRun}
                disabled={planning || executing}
              >
                {planning ? (
                  <><Spinner animation="border" size="sm" className="me-1" /> Analyzing...</>
                ) : (
                  <><i className="bi bi-search me-1" /> Preview Rollover (Dry Run)</>
                )}
              </Button>

              {plan && plan.some((p) => p.action !== 'skip') && (
                <Button
                  variant="danger"
                  onClick={() => setShowExecuteModal(true)}
                  disabled={executing}
                >
                  {executing ? (
                    <><Spinner animation="border" size="sm" className="me-1" /> Applying...</>
                  ) : (
                    <><i className="bi bi-play-fill me-1" /> Apply Rollover</>
                  )}
                </Button>
              )}

              {plan && (
                <Button variant="outline-secondary" onClick={() => setPlan(null)} disabled={executing}>
                  <i className="bi bi-x-lg me-1" /> Clear Preview
                </Button>
              )}
            </div>

            {/* Summary cards */}
            {planCounts && (
              <Row className="g-2 mb-3">
                <Col xs={6} md={3}>
                  <Card className="summary-card p-2 border-primary bg-primary bg-opacity-10">
                    <div className="display-6 text-primary">{planCounts.increment}</div>
                    <small>Will Increment</small>
                  </Card>
                </Col>
                <Col xs={6} md={3}>
                  <Card className="summary-card p-2 border-warning bg-warning bg-opacity-10">
                    <div className="display-6 text-warning">{planCounts.alumniNcc}</div>
                    <small>→ Alumni (NCC)</small>
                  </Card>
                </Col>
                <Col xs={6} md={3}>
                  <Card className="summary-card p-2 border-danger bg-danger bg-opacity-10">
                    <div className="display-6 text-danger">{planCounts.deleteGraduated}</div>
                    <small>Archive & Delete</small>
                  </Card>
                </Col>
                <Col xs={6} md={3}>
                  <Card className="summary-card p-2 border-secondary bg-secondary bg-opacity-10">
                    <div className="display-6 text-secondary">{planCounts.skip}</div>
                    <small>Skipped</small>
                  </Card>
                </Col>
              </Row>
            )}

            {/* Preview table */}
            {plan && (
              <div className="table-responsive">
                <Table striped size="sm" className="preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Current Year</th>
                      <th>NCC Year</th>
                      <th>Role</th>
                      <th>Action</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.map((item, idx) => (
                      <tr key={item.cadetId}>
                        <td>{idx + 1}</td>
                        <td>{item.cadetName}</td>
                        <td>{item.department}</td>
                        <td>{item.currentYear}</td>
                        <td>{item.currentNccYear}</td>
                        <td>
                          <Badge bg={item.userRole === 'admin' ? 'info' : item.userRole === 'superadmin' ? 'dark' : 'light'} text={item.userRole === 'member' ? 'dark' : undefined}>
                            {item.userRole}
                          </Badge>
                        </td>
                        <td>{getActionBadge(item.action)}</td>
                        <td className="text-muted small">{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>

      {/* ── Rollback ──────────────────────────────────────────────────────── */}
      <div className="settings-section">
        <Card>
          <Card.Header className="bg-white">
            <i className="bi bi-arrow-counterclockwise me-2" />
            Rollback
          </Card.Header>
          <Card.Body>
            {snapshots.length === 0 ? (
              <p className="text-muted small mb-0">No rollback snapshots available. Snapshots are created automatically when you apply a rollover.</p>
            ) : (
              <>
                <p className="text-muted small mb-2">Select a snapshot to restore cadets to their previous state.</p>
                <div className="rollback-list mb-3">
                  {snapshots.map((s) => (
                    <div
                      key={s.id}
                      className={`rollback-item border rounded p-2 mb-1 ${selectedSnapshot === s.id ? 'active' : ''}`}
                      onClick={() => setSelectedSnapshot(s.id)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <i className={`bi ${selectedSnapshot === s.id ? 'bi-record-circle' : 'bi-circle'} me-2`} />
                          <strong>
                            {new Date(s.timestamp).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </strong>
                        </div>
                        {s.summary && (
                          <div>
                            <Badge bg="primary" className="me-1">{s.summary.incremented} inc</Badge>
                            <Badge bg="warning" text="dark" className="me-1">{s.summary.alumniNcc} alumni</Badge>
                            <Badge bg="danger">{s.summary.deletedGraduated} del</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline-warning"
                  disabled={!selectedSnapshot || rollingBack}
                  onClick={() => setShowRollbackModal(true)}
                >
                  {rollingBack ? (
                    <><Spinner animation="border" size="sm" className="me-1" /> Rolling back...</>
                  ) : (
                    <><i className="bi bi-arrow-counterclockwise me-1" /> Rollback to Selected Snapshot</>
                  )}
                </Button>
              </>
            )}
          </Card.Body>
        </Card>
      </div>

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
                <span className="pending-queue-badge text-danger">{pendingCount}</span>
                <span className="text-muted ms-2">accounts queued for Auth cleanup</span>
              </div>
            </div>
            <p className="text-muted small mt-2 mb-0">
              <i className="bi bi-info-circle me-1" />
              Auth accounts are automatically cleaned up weekly via GitHub Actions.
              You can also trigger it manually from your GitHub repo → Actions → "Auth Account Cleanup" → Run workflow.
            </p>
          </Card.Body>
        </Card>
      </div>
      </Tab>
      </Tabs>

      {/* ── Execute Confirmation Modal ────────────────────────────────────── */}
      <Modal show={showExecuteModal} onHide={() => setShowExecuteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-exclamation-triangle text-danger me-2" />
            Confirm Year Rollover
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <strong>This will modify live data!</strong> Please ensure you have reviewed the dry-run preview carefully.
          </Alert>
          {planCounts && (
            <ul className="mb-3">
              <li><strong>{planCounts.increment}</strong> cadets will have their years incremented</li>
              <li><strong>{planCounts.alumniNcc}</strong> cadets will be moved to alumni (NCC tenure complete)</li>
              <li><strong>{planCounts.deleteGraduated}</strong> cadets will be archived & deleted (academic complete)</li>
              <li><strong>{planCounts.skip}</strong> superadmin(s) will be skipped</li>
            </ul>
          )}
          <p className="text-muted small mb-0">
            A rollback snapshot will be saved automatically. You can undo this operation from the Rollback section.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExecuteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleExecuteRollover}>
            <i className="bi bi-play-fill me-1" /> Yes, Apply Rollover
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Rollback Confirmation Modal ───────────────────────────────────── */}
      <Modal show={showRollbackModal} onHide={() => setShowRollbackModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-arrow-counterclockwise text-warning me-2" />
            Confirm Rollback
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <strong>This will restore all cadets to their state at the time of the selected snapshot.</strong>
          </Alert>
          <p>
            Snapshot:{' '}
            <strong>
              {selectedSnapshot &&
                new Date(snapshots.find((s) => s.id === selectedSnapshot)?.timestamp || '').toLocaleString('en-IN', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}
            </strong>
          </p>
          <p className="text-muted small mb-0">
            Note: Firebase Auth accounts that were already deleted cannot be restored from the client.
            Those users will need to re-register.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRollbackModal(false)}>Cancel</Button>
          <Button variant="warning" onClick={handleRollback}>
            <i className="bi bi-arrow-counterclockwise me-1" /> Yes, Rollback
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Unlock Date Confirmation Modal ───────────────────────────────────── */}
      <Modal show={showUnlockModal} onHide={() => setShowUnlockModal(false)} centered>
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
          <Button variant="secondary" onClick={() => setShowUnlockModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => {
            setIsDateUnlocked(true);
            setShowUnlockModal(false);
          }}>
            Yes, Modify
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Save Confirmation Modal ──────────────────────────────────────────── */}
      <Modal show={showSaveModal} onHide={() => setShowSaveModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-save text-success me-2" />
            Confirm Changes
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to save these rollover settings? The automation will run exactly according to these new parameters.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSaveModal(false)}>Cancel</Button>
          <Button variant="success" onClick={handleSaveConfig}>
            Yes, Save Settings
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── GitHub Unlock Modal ──────────────────────────────────────────── */}
      <Modal show={showGithubUnlockModal} onHide={() => setShowGithubUnlockModal(false)} centered>
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
          <Button variant="secondary" onClick={() => setShowGithubUnlockModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => {
            setIsGithubUnlocked(true);
            setShowGithubUnlockModal(false);
          }}>
            Yes, Modify
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── GitHub Save Confirmation Modal ───────────────────────────────── */}
      <Modal show={showGithubSaveModal} onHide={() => setShowGithubSaveModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-save text-success me-2" />
            Confirm GitHub Settings
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to save these new GitHub credentials? The app will use these to trigger background cleanups.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGithubSaveModal(false)}>Cancel</Button>
          <Button variant="success" onClick={handleSaveGithubConfig}>
            Yes, Save Settings
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminSettings;
