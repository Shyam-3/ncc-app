import { db, FIREBASE_CONFIG } from '@/shared/config/firebase';
import { useAuth } from '@/features/auth/AuthContext';
import { deleteApp, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, deleteUser, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Tab,
  Table,
  Tabs,
} from 'react-bootstrap';
import toast from 'react-hot-toast';
import { triggerAuthCleanup } from '@/shared/utils/githubActions';
import { TablePaginationFooter } from '@/components';
import { ROMAN_YEAR_MAP } from '@/shared/config/constants';
import './UserManagement.css';

type UserRole = 'member' | 'admin' | 'superadmin' | 'alumni';

interface UserData {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  status: string;
  regimentalNumber?: string;
  division?: 'SD' | 'SW';
  dateOfBirth?: string;
  dateOfEnrollment?: string;
  nccYear?: string;
  year?: string;
  residentialStatus?: string;
  department?: string;
  rollNo?: string;
  registerNumber?: string;
  phone?: string;
  bloodGroup?: string;
  address?: string;
  rank?: string;
  lastUpdated?: string;
}

interface PendingCadet {
  id: string;
  uid?: string;
  emailVerified?: boolean;
  name: string;
  email: string;
  tempPassword?: string;
  regimentalNumber: string;
  division: 'SD' | 'SW';
  dateOfBirth: string;
  dateOfEnrollment: string;
  nccYear?: string;
  year: '1st Year' | '2nd Year' | '3rd Year' | '4th Year' | '5th Year';
  residentialStatus: 'Day Scholar' | 'Hosteller';
  department: string;
  rollNo: string;
  registerNumber: string;
  phone: string;
  bloodGroup: string;
  fatherName?: string;
  address?: string;
  rank: string;
  createdAt: string;
}

const formatAcademicYear = (value?: string) => {
  if (!value) return '-';
  const cleaned = value.replace(' Year', '').trim();
  return ROMAN_YEAR_MAP[cleaned] || cleaned;
};

const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile, isAdmin, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [pending, setPending] = useState<PendingCadet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{action: 'approve'|'reject'|'delete'; payload: any} | null>(null);

  // Filter states for pending approvals
  const [divisionFilter, setDivisionFilter] = useState<'ALL' | 'SD' | 'SW'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter states for users tab
  const [divisionFilterUsers, setDivisionFilterUsers] = useState<'ALL' | 'SD' | 'SW'>('ALL');
  const [searchTermUsers, setSearchTermUsers] = useState('');
  const [usersCurrentPage, setUsersCurrentPage] = useState(1);
  const [usersRowsPerPage, setUsersRowsPerPage] = useState(10);
  const [pendingCurrentPage, setPendingCurrentPage] = useState(1);
  const [pendingRowsPerPage, setPendingRowsPerPage] = useState(10);

  const isSelf = (uid: string) => uid === currentUser?.uid;
  const canDeleteUser = (target: UserData) => {
    if (isSelf(target.uid)) return false;
    if (isSuperAdmin()) return true;
    if (isAdmin()) return target.role !== 'superadmin';
    return false;
  };

  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([fetchUsers(), fetchPending()]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    setUsersCurrentPage(1);
  }, [divisionFilterUsers, searchTermUsers, usersRowsPerPage]);

  useEffect(() => {
    setPendingCurrentPage(1);
  }, [divisionFilter, searchTerm, pendingRowsPerPage]);

  const fetchUsers = async () => {
    const usersRef = collection(db, 'users');
    const qUsers = query(usersRef, orderBy('createdAt', 'desc'));
    const snapshotUsers = await getDocs(qUsers);
    const activeUsers = snapshotUsers.docs.map(d => ({ uid: d.id, ...(d.data() as any) }));

    const alumniRef = collection(db, 'alumni');
    const qAlumni = query(alumniRef, orderBy('archivedAt', 'desc'));
    const snapshotAlumni = await getDocs(qAlumni);
    const alumniUsers = snapshotAlumni.docs.map(d => ({ uid: d.id, role: 'alumni', ...(d.data() as any) }));

    const all = [...activeUsers, ...alumniUsers];
    setUsers(all as UserData[]);
  };

  const fetchPending = async () => {
    const ref = collection(db, 'pendingCadets');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    setPending(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as PendingCadet[]);
  };

  const handleApprove = async (candidate: PendingCadet) => {
    setSaving(true);
    try {
      // Use the uid from the pending record (Auth account already created during registration)
      let authUid = candidate.uid || candidate.id;

      // If no uid stored (legacy pending record), create Auth account via secondary app
      if (!candidate.uid && candidate.tempPassword) {
        try {
          const secondaryApp = initializeApp(FIREBASE_CONFIG, 'Secondary');
          const secondaryAuth = getAuth(secondaryApp);
          
          const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth,
            candidate.email,
            candidate.tempPassword
          );
          authUid = userCredential.user.uid;
          
          await signOut(secondaryAuth);
          await deleteApp(secondaryApp);
        } catch (authError: any) {
          console.error('Firebase Auth error:', authError);
          toast.error('Failed to create Firebase Auth account: ' + authError.message);
          return;
        }
      }

      // Create user document in Firestore
      const userDoc = doc(db, 'users', authUid);
      await setDoc(userDoc, {
        name: candidate.name,
        email: candidate.email,
        role: 'member',
        status: 'active',
        createdAt: candidate.createdAt || new Date().toISOString(),
        dateOfBirth: candidate.dateOfBirth,
        regimentalNumber: candidate.regimentalNumber,
        division: candidate.division,
        dateOfEnrollment: candidate.dateOfEnrollment,
        rank: candidate.rank || 'CDT',
        nccYear: candidate.nccYear || '1st Year',
        year: candidate.year,
        residentialStatus: candidate.residentialStatus,
        department: candidate.department,
        rollNo: candidate.rollNo,
        registerNumber: candidate.registerNumber,
        phone: candidate.phone,
        bloodGroup: candidate.bloodGroup,
        fatherName: candidate.fatherName || '',
        address: candidate.address || '',
      });

      // Delete from pending collection
      await deleteDoc(doc(db, 'pendingCadets', candidate.id));
      
      toast.success('Cadet approved and account created successfully!');
      await Promise.all([fetchUsers(), fetchPending()]);
    } catch (e) {
      console.error(e);
      toast.error('Approval failed');
    } finally {
      setSaving(false);
      setConfirm(null);
    }
  };

  const handleReject = async (candidate: PendingCadet) => {
    setSaving(true);
    try {
      // Delete the Firebase Auth account if uid and tempPassword exist
      if (candidate.uid && candidate.tempPassword) {
        try {
          // Use secondary app to sign in as the user and delete their Auth account
          const secondaryApp = initializeApp(FIREBASE_CONFIG, 'SecondaryReject');
          const secondaryAuth = getAuth(secondaryApp);
          
          const userCredential = await signInWithEmailAndPassword(
            secondaryAuth,
            candidate.email,
            candidate.tempPassword
          );
          
          // Delete the Firebase Auth account
          await deleteUser(userCredential.user);
          
          // Clean up secondary app
          await deleteApp(secondaryApp);
        } catch (authError: any) {
          console.warn('Could not delete Firebase Auth account (may not exist):', authError.message);
          // Continue with Firestore cleanup even if Auth deletion fails
        }
      }

      // Delete from pending collection
      await deleteDoc(doc(db, 'pendingCadets', candidate.id));
      toast.success('Registration rejected and account removed');
      await fetchPending();
    } catch (e) {
      console.error(e);
      toast.error('Reject failed');
    } finally {
      setSaving(false);
      setConfirm(null);
    }
  };

  // Filter and sort pending cadets
  const filteredPending = useMemo(() => {
    // First, filter out cadets whose emails are already in users collection (already approved)
    const existingEmails = new Set(users.map(u => u.email.toLowerCase()));
    let filtered = pending.filter(c => !existingEmails.has(c.email.toLowerCase()));

    // Filter by division
    if (divisionFilter !== 'ALL') {
      filtered = filtered.filter(c => c.division === divisionFilter);
    }

    // Filter by search term (regimental number or name)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.regimentalNumber?.toLowerCase().includes(term) ||
        c.name?.toLowerCase().includes(term)
      );
    }

    // Sort by regimental number (default)
    filtered.sort((a, b) => {
      const regA = a.regimentalNumber || '';
      const regB = b.regimentalNumber || '';
      return regA.localeCompare(regB, undefined, { numeric: true });
    });

    return filtered;
  }, [pending, users, divisionFilter, searchTerm]);

  const clearFilters = () => {
    setDivisionFilter('ALL');
    setSearchTerm('');
  };

  // Calculate actual pending count (excluding already approved users)
  const actualPendingCount = useMemo(() => {
    const existingEmails = new Set(users.map(u => u.email.toLowerCase()));
    return pending.filter(c => !existingEmails.has(c.email.toLowerCase())).length;
  }, [pending, users]);

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let list = [...users];

    if (divisionFilterUsers !== 'ALL') {
      list = list.filter(u => (u.division || 'ALL') === divisionFilterUsers);
    }

    if (searchTermUsers.trim()) {
      const term = searchTermUsers.toLowerCase();
      list = list.filter(u =>
        (u.regimentalNumber || '').toLowerCase().includes(term) ||
        (u.name || '').toLowerCase().includes(term)
      );
    }

    list.sort((a, b) => {
      const getRank = (u: UserData) => {
        if (u.role === 'alumni') {
          const yrMatch = (u.year || '').match(/(\d+)/);
          return 10 + (yrMatch ? parseInt(yrMatch[1]) : 0);
        } else {
          const yrMatch = (u.nccYear || '').match(/(\d+)/);
          return yrMatch ? parseInt(yrMatch[1]) : 0;
        }
      };

      const rankA = getRank(a);
      const rankB = getRank(b);

      if (rankA !== rankB) return rankA - rankB;

      return (a.regimentalNumber || '').localeCompare(b.regimentalNumber || '', undefined, { numeric: true });
    });

    return list;
  }, [users, divisionFilterUsers, searchTermUsers]);

  const usersTotalPages = Math.max(1, Math.ceil(filteredUsers.length / usersRowsPerPage));
  const usersSafePage = Math.min(usersCurrentPage, usersTotalPages);
  const usersStartIndex = (usersSafePage - 1) * usersRowsPerPage;
  const usersEndIndex = Math.min(usersStartIndex + usersRowsPerPage, filteredUsers.length);
  const paginatedUsers = filteredUsers.slice(usersStartIndex, usersEndIndex);

  const pendingTotalPages = Math.max(1, Math.ceil(filteredPending.length / pendingRowsPerPage));
  const pendingSafePage = Math.min(pendingCurrentPage, pendingTotalPages);
  const pendingStartIndex = (pendingSafePage - 1) * pendingRowsPerPage;
  const pendingEndIndex = Math.min(pendingStartIndex + pendingRowsPerPage, filteredPending.length);
  const paginatedPending = filteredPending.slice(pendingStartIndex, pendingEndIndex);

  const clearUsersFilters = () => {
    setDivisionFilterUsers('ALL');
    setSearchTermUsers('');
  };

  const handleDeleteUser = async (u: UserData) => {
    if (isSelf(u.uid)) {
      toast.error('You cannot delete your own account here');
      return;
    }
    if (!canDeleteUser(u)) {
      toast.error('You do not have permission to delete this user');
      return;
    }
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'users', u.uid));
      
      // Also remove cadet profile if exists
      try {
        await deleteDoc(doc(db, 'cadets', u.uid));
      } catch (_) { /* cadet doc may not exist */ }

      // Also remove from pendingCadets if exists (by email)
      const pendingSnapshot = await getDocs(
        query(collection(db, 'pendingCadets'))
      );
      const matchingPending = pendingSnapshot.docs.find(
        d => d.data().email?.toLowerCase() === u.email.toLowerCase()
      );
      if (matchingPending) {
        await deleteDoc(doc(db, 'pendingCadets', matchingPending.id));
      }

      // Queue Firebase Auth account for automated cleanup
      await setDoc(doc(db, 'pendingAuthDeletions', u.uid), {
        email: u.email,
        deletedBy: currentUser?.uid || 'unknown',
        deletedAt: new Date().toISOString(),
      });
      
      // Trigger GitHub Action to clean up auth instantly
      triggerAuthCleanup();
      
      toast.success('User deleted. Auth account will be cleaned up automatically within moments.');
      await Promise.all([fetchUsers(), fetchPending()]);
    } catch (e) {
      console.error(e);
      toast.error('Delete failed');
    } finally {
      setSaving(false);
      setConfirm(null);
    }
  };

  const PendingTable = useMemo(() => (
    <>
      {/* Filter controls */}
      <Row className="mb-3 g-3">
        <Col xs={12} md={3}>
          <Form.Label className="small fw-semibold">Division</Form.Label>
          <div className="btn-group w-100" role="group">
            <input
              type="radio"
              className="btn-check"
              name="division-filter"
              id="division-all"
              checked={divisionFilter === 'ALL'}
              onChange={() => setDivisionFilter('ALL')}
            />
            <label className="btn btn-outline-primary" htmlFor="division-all">Both</label>

            <input
              type="radio"
              className="btn-check"
              name="division-filter"
              id="division-sd"
              checked={divisionFilter === 'SD'}
              onChange={() => setDivisionFilter('SD')}
            />
            <label className="btn btn-outline-primary" htmlFor="division-sd">SD</label>

            <input
              type="radio"
              className="btn-check"
              name="division-filter"
              id="division-sw"
              checked={divisionFilter === 'SW'}
              onChange={() => setDivisionFilter('SW')}
            />
            <label className="btn btn-outline-primary" htmlFor="division-sw">SW</label>
          </div>
        </Col>
        <Col xs={12} md={4}>
          <Form.Label className="small fw-semibold">Search</Form.Label>
          <Form.Control
            type="text"
            placeholder="Search by name or regimental number..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </Col>
        <Col xs={12} md={2} className="d-flex align-items-end">
          <Button variant="outline-secondary" className="w-100" onClick={clearFilters}>
            <i className="bi bi-x-circle me-1"></i>
            Clear Filters
          </Button>
        </Col>
      </Row>

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th className="user-col-sno">S.No</th>
            <th>Name</th>
            <th className="user-col-division">SD/SW</th>
            <th>Regimental Number</th>
            <th>Email</th>
            <th>Email Status</th>
            <th>Registered On</th>
            <th className="user-col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedPending.map((c, index) => (
            <tr key={c.id}>
              <td className="text-center">{pendingStartIndex + index + 1}</td>
              <td>{c.name}</td>
              <td className="text-center">
                <Badge bg={c.division === 'SD' ? 'info' : 'warning'}>{c.division}</Badge>
              </td>
              <td>{c.regimentalNumber || 'N/A'}</td>
              <td>{c.email}</td>
              <td className="text-center">
                {c.emailVerified ? (
                  <Badge bg="success">
                    <i className="bi bi-check-circle me-1"></i>Verified
                  </Badge>
                ) : (
                  <Badge bg="secondary">
                    <i className="bi bi-clock me-1"></i>Pending
                  </Badge>
                )}
              </td>
              <td>{new Date(c.createdAt).toLocaleString()}</td>
              <td className="d-flex gap-2">
                <Button 
                  variant="success" 
                  size="sm" 
                  onClick={() => setConfirm({ action: 'approve', payload: c })}
                  disabled={!c.emailVerified}
                  title={!c.emailVerified ? 'Email not yet verified' : 'Approve this registration'}
                >
                  Accept
                </Button>
                <Button variant="outline-danger" size="sm" onClick={() => setConfirm({ action: 'reject', payload: c })}>
                  Reject
                </Button>
              </td>
            </tr>
          ))}
          {filteredPending.length === 0 && (
            <tr><td colSpan={8} className="text-center text-muted">No pending registrations match filters</td></tr>
          )}
        </tbody>
      </Table>
      <TablePaginationFooter
        totalItems={filteredPending.length}
        currentPage={pendingSafePage}
        rowsPerPage={pendingRowsPerPage}
        onRowsPerPageChange={setPendingRowsPerPage}
        onFirstPage={() => setPendingCurrentPage(1)}
        onPreviousPage={() => setPendingCurrentPage((page) => Math.max(1, page - 1))}
        onNextPage={() => setPendingCurrentPage((page) => Math.min(pendingTotalPages, page + 1))}
        onLastPage={() => setPendingCurrentPage(pendingTotalPages)}
      />
    </>
  ), [filteredPending, pendingSafePage, pendingRowsPerPage, pendingStartIndex, pendingTotalPages]);

  const UsersTable = useMemo(() => (
    <>
      {/* Filter controls (Users) */}
      <Row className="mb-3 g-3">
        <Col xs={12} md={3}>
          <Form.Label className="small fw-semibold">Division</Form.Label>
          <div className="btn-group w-100" role="group">
            <input
              type="radio"
              className="btn-check"
              name="division-filter-users"
              id="division-users-all"
              checked={divisionFilterUsers === 'ALL'}
              onChange={() => setDivisionFilterUsers('ALL')}
            />
            <label className="btn btn-outline-primary" htmlFor="division-users-all">Both</label>

            <input
              type="radio"
              className="btn-check"
              name="division-filter-users"
              id="division-users-sd"
              checked={divisionFilterUsers === 'SD'}
              onChange={() => setDivisionFilterUsers('SD')}
            />
            <label className="btn btn-outline-primary" htmlFor="division-users-sd">SD</label>

            <input
              type="radio"
              className="btn-check"
              name="division-filter-users"
              id="division-users-sw"
              checked={divisionFilterUsers === 'SW'}
              onChange={() => setDivisionFilterUsers('SW')}
            />
            <label className="btn btn-outline-primary" htmlFor="division-users-sw">SW</label>
          </div>
        </Col>
        <Col xs={12} md={4}>
          <Form.Label className="small fw-semibold">Search</Form.Label>
          <Form.Control
            type="text"
            placeholder="Search by name or regimental number..."
            value={searchTermUsers}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTermUsers(e.target.value)}
          />
        </Col>
        <Col xs={12} md={2} className="d-flex align-items-end">
          <Button variant="outline-secondary" className="w-100" onClick={clearUsersFilters}>
            <i className="bi bi-x-circle me-1"></i>
            Clear Filters
          </Button>
        </Col>
      </Row>

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th className="user-col-sno">S.No</th>
            <th>Name</th>
            <th className="user-col-division">SD/SW</th>
            <th>Regimental Number</th>
            <th>Academic Year</th>
            <th>Email</th>
            <th className="user-col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedUsers.map((u, index) => (
            <tr key={u.uid}>
              <td className="text-center">{usersStartIndex + index + 1}</td>
              <td className="text-break" dir="ltr">
                {u.name || 'N/A'} 
                {isSelf(u.uid) && <Badge bg="success" className="ms-1">You</Badge>}
                {u.role === 'alumni' && <Badge bg="secondary" className="ms-1">Alumni</Badge>}
              </td>
              <td className="text-center">
                {u.division ? (
                  <Badge bg={u.division === 'SD' ? 'info' : 'warning'}>{u.division}</Badge>
                ) : (
                  <span className="text-muted">-</span>
                )}
              </td>
              <td>{u.regimentalNumber || '-'}</td>
              <td>{formatAcademicYear(u.year)}</td>
              <td>{u.email}</td>
              <td className="d-flex gap-2">
                {!isSelf(u.uid) ? (
                  <>
                    {canDeleteUser(u) && u.role !== 'alumni' ? (
                      <Button size="sm" variant="outline-danger" onClick={() => setConfirm({ action: 'delete', payload: u })}>Delete</Button>
                    ) : (
                      <Button size="sm" variant="outline-secondary" disabled>Delete</Button>
                    )}
                  </>
                ) : (
                  <small className="text-muted">Self-managed</small>
                )}
              </td>
            </tr>
          ))}
          {filteredUsers.length === 0 && (
            <tr><td colSpan={7} className="text-center text-muted">No users match filters</td></tr>
          )}
        </tbody>
      </Table>
      <TablePaginationFooter
        totalItems={filteredUsers.length}
        currentPage={usersSafePage}
        rowsPerPage={usersRowsPerPage}
        onRowsPerPageChange={setUsersRowsPerPage}
        onFirstPage={() => setUsersCurrentPage(1)}
        onPreviousPage={() => setUsersCurrentPage((page) => Math.max(1, page - 1))}
        onNextPage={() => setUsersCurrentPage((page) => Math.min(usersTotalPages, page + 1))}
        onLastPage={() => setUsersCurrentPage(usersTotalPages)}
      />
    </>
  ), [filteredUsers, paginatedUsers, usersSafePage, usersRowsPerPage, usersStartIndex, usersTotalPages, userProfile?.role]);


  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p className="mt-3">Loading user management...</p>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Card className="shadow">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <h3 className="mb-0">
            <i className="bi bi-people-fill me-2"></i>
            User Management
          </h3>
          <Button variant="light" size="sm" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left me-1"></i> Back
          </Button>
        </Card.Header>
        <Card.Body>
          <Tabs defaultActiveKey="users" id="user-mgmt-tabs" className="mb-3">
            <Tab eventKey="users" title="Users">
              <Alert variant="info">
                View or delete users. On Firebase Spark plan, deletion removes user data from Firestore only.
              </Alert>
              <Alert variant="warning">
                Firebase Authentication account deletion requires a privileged backend (Cloud Functions/Admin SDK), which is not available on Spark plan.
              </Alert>
              {UsersTable}
            </Tab>
            <Tab 
              eventKey="approvals" 
              title={
                <span>
                  Pending Approvals 
                  {actualPendingCount > 0 && (
                    <Badge bg="danger" className="ms-2">{actualPendingCount}</Badge>
                  )}
                </span>
              }
            >
              <Alert variant="warning">
                Approve or reject newly registered cadets. Approval will create a user record with Member role.
              </Alert>
              {PendingTable}
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {/* Confirm modal for approve/reject/delete */}
      <Modal show={!!confirm} onHide={() => setConfirm(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm {confirm?.action}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {confirm?.action === 'approve' && (
            <>
              <p>Approve registration for <strong>{confirm?.payload?.name}</strong> ({confirm?.payload?.email})?</p>
              {!confirm?.payload?.emailVerified && (
                <Alert variant="warning" className="mb-0">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  This user has <strong>not verified their email</strong> yet. Approval is only available after email verification.
                </Alert>
              )}
            </>
          )}
          {confirm?.action === 'reject' && (
            <>
              <p>Reject registration for <strong>{confirm?.payload?.name}</strong> ({confirm?.payload?.email})?</p>
              <Alert variant="info" className="mb-0">
                <i className="bi bi-info-circle me-2"></i>
                This will delete the pending registration and remove their Firebase Auth account. No trace will remain.
              </Alert>
            </>
          )}
          {confirm?.action === 'delete' && (
            <p>Delete user <strong>{confirm?.payload?.name}</strong> ({confirm?.payload?.email})? This cannot be undone.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirm(null)} disabled={saving}>Cancel</Button>
          {confirm?.action === 'approve' && (
            <Button variant="success" onClick={() => handleApprove(confirm.payload)} disabled={saving || !confirm.payload?.emailVerified}>Approve</Button>
          )}
          {confirm?.action === 'reject' && (
            <Button variant="danger" onClick={() => handleReject(confirm.payload)} disabled={saving}>Reject</Button>
          )}
          {confirm?.action === 'delete' && (
            <Button variant="danger" onClick={() => handleDeleteUser(confirm.payload)} disabled={saving}>Delete</Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default UserManagement;

