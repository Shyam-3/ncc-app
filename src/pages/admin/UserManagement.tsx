import { db, FIREBASE_CONFIG } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { deleteApp, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, Modal, Row, Spinner, Tab, Table, Tabs } from 'react-bootstrap';
import toast from 'react-hot-toast';

type UserRole = 'member' | 'subadmin' | 'admin' | 'superadmin';

interface UserData {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  status: string;
  tempPassword?: string;
  regimentalNumber?: string;
  division?: 'SD' | 'SW';
  platoon?: 'Alpha' | 'Bravo' | 'Charlie' | 'Delta';
  dateOfBirth?: string;
  dateOfEnrollment?: string;
  year?: string;
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
  name: string;
  email: string;
  tempPassword?: string;
  regimentalNumber: string;
  division: 'SD' | 'SW';
  platoon: 'Alpha' | 'Bravo' | 'Charlie' | 'Delta';
  dateOfBirth: string;
  dateOfEnrollment: string;
  year: '1st Year' | '2nd Year';
  department: string;
  rollNo: string;
  registerNumber: string;
  phone: string;
  bloodGroup: string;
  address?: string;
  rank: string;
  createdAt: string;
}

const UserManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [pending, setPending] = useState<PendingCadet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{action: 'approve'|'reject'|'update'|'delete'; payload: any} | null>(null);
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [editForm, setEditForm] = useState<{email: string; tempPassword: string}>({ email: '', tempPassword: '' });

  // Filter states for pending approvals
  const [divisionFilter, setDivisionFilter] = useState<'ALL' | 'SD' | 'SW'>('ALL');
  const [platoonFilter, setPlatoonFilter] = useState<'ALL' | 'Alpha' | 'Bravo' | 'Charlie' | 'Delta'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter states for credentials tab
  const [divisionFilterUsers, setDivisionFilterUsers] = useState<'ALL' | 'SD' | 'SW'>('ALL');
  const [platoonFilterUsers, setPlatoonFilterUsers] = useState<'ALL' | 'Alpha' | 'Bravo' | 'Charlie' | 'Delta'>('ALL');
  const [searchTermUsers, setSearchTermUsers] = useState('');
  const [showPwd, setShowPwd] = useState<Record<string, boolean>>({});

  const isSelf = (uid: string) => uid === currentUser?.uid;

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

  const fetchUsers = async () => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    setUsers(snapshot.docs.map(d => ({ uid: d.id, ...(d.data() as any) })) as UserData[]);
  };

  const fetchPending = async () => {
    const ref = collection(db, 'pendingCadets');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    setPending(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as PendingCadet[]);
  };

  const openEdit = (u: UserData) => {
    setEditUser(u);
    setEditForm({ email: u.email || '', tempPassword: u.tempPassword || '' });
  };

  const togglePwdVisibility = (uid: string) => {
    setShowPwd(prev => ({ ...prev, [uid]: !prev[uid] }));
  };

  const handleApprove = async (candidate: PendingCadet) => {
    setSaving(true);
    try {
      // Create Firebase Auth account using secondary app (won't logout admin)
      let authUid = candidate.id;
      if (candidate.tempPassword) {
        try {
          // Create a secondary Firebase app instance to avoid logging out the admin
          const secondaryApp = initializeApp(FIREBASE_CONFIG, 'Secondary');
          const secondaryAuth = getAuth(secondaryApp);
          
          const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth,
            candidate.email,
            candidate.tempPassword
          );
          authUid = userCredential.user.uid;
          
          // Sign out from secondary auth immediately (doesn't affect main auth)
          await signOut(secondaryAuth);
          
          // Delete the secondary app instance
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
        platoon: candidate.platoon,
        dateOfEnrollment: candidate.dateOfEnrollment,
        rank: candidate.rank || 'CDT',
        year: candidate.year,
        department: candidate.department,
        rollNo: candidate.rollNo,
        registerNumber: candidate.registerNumber,
        phone: candidate.phone,
        bloodGroup: candidate.bloodGroup,
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
      await deleteDoc(doc(db, 'pendingCadets', candidate.id));
      toast.success('Registration rejected');
      await fetchPending();
    } catch (e) {
      console.error(e);
      toast.error('Reject failed');
    } finally {
      setSaving(false);
      setConfirm(null);
    }
  };

  const handleUpdateCredentials = async () => {
    if (!editUser) return;
    if (isSelf(editUser.uid)) {
      toast.error('You cannot modify your own credentials here');
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', editUser.uid), {
        email: editForm.email,
        tempPassword: editForm.tempPassword,
        lastUpdated: new Date().toISOString(),
      });
      toast.success('Credentials updated');
      await fetchUsers();
      setEditUser(null);
    } catch (e) {
      console.error(e);
      toast.error('Update failed');
    } finally {
      setSaving(false);
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

    // Filter by platoon
    if (platoonFilter !== 'ALL') {
      filtered = filtered.filter(c => c.platoon === platoonFilter);
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
  }, [pending, users, divisionFilter, platoonFilter, searchTerm]);

  const clearFilters = () => {
    setDivisionFilter('ALL');
    setPlatoonFilter('ALL');
    setSearchTerm('');
  };

  // Calculate actual pending count (excluding already approved users)
  const actualPendingCount = useMemo(() => {
    const existingEmails = new Set(users.map(u => u.email.toLowerCase()));
    return pending.filter(c => !existingEmails.has(c.email.toLowerCase())).length;
  }, [pending, users]);

  // Filter and sort users for credentials tab
  const filteredUsers = useMemo(() => {
    let list = [...users];

    if (divisionFilterUsers !== 'ALL') {
      list = list.filter(u => (u.division || 'ALL') === divisionFilterUsers);
    }

    if (platoonFilterUsers !== 'ALL') {
      list = list.filter(u => (u.platoon || 'ALL') === platoonFilterUsers);
    }

    if (searchTermUsers.trim()) {
      const term = searchTermUsers.toLowerCase();
      list = list.filter(u =>
        (u.regimentalNumber || '').toLowerCase().includes(term) ||
        (u.name || '').toLowerCase().includes(term)
      );
    }

    list.sort((a, b) => (a.regimentalNumber || '').localeCompare(b.regimentalNumber || '', undefined, { numeric: true }));

    return list;
  }, [users, divisionFilterUsers, platoonFilterUsers, searchTermUsers]);

  const clearUsersFilters = () => {
    setDivisionFilterUsers('ALL');
    setPlatoonFilterUsers('ALL');
    setSearchTermUsers('');
  };

  const handleDeleteUser = async (u: UserData) => {
    if (isSelf(u.uid)) {
      toast.error('You cannot delete your own account here');
      return;
    }
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'users', u.uid));
      
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
      
      toast.success('User deleted');
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
        <Col xs={12} md={3}>
          <Form.Label className="small fw-semibold">Platoon</Form.Label>
          <Form.Select
            value={platoonFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPlatoonFilter(e.target.value as any)}
          >
            <option value="" disabled>Select Platoon</option>
            <option value="ALL">All Platoons</option>
            <option value="Alpha">Alpha</option>
            <option value="Bravo">Bravo</option>
            <option value="Charlie">Charlie</option>
            <option value="Delta">Delta</option>
          </Form.Select>
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
            <th style={{ width: '60px' }}>S.No</th>
            <th>Name</th>
            <th style={{ width: '80px' }}>SD/SW</th>
            <th style={{ width: '100px' }}>Platoon</th>
            <th>Regimental Number</th>
            <th>Email</th>
            <th>Registered On</th>
            <th style={{ width: '180px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredPending.map((c, index) => (
            <tr key={c.id}>
              <td className="text-center">{index + 1}</td>
              <td>{c.name}</td>
              <td className="text-center">
                <Badge bg={c.division === 'SD' ? 'info' : 'warning'}>{c.division}</Badge>
              </td>
              <td className="text-center">
                <Badge bg="secondary">{c.platoon || 'N/A'}</Badge>
              </td>
              <td>{c.regimentalNumber || 'N/A'}</td>
              <td>{c.email}</td>
              <td>{new Date(c.createdAt).toLocaleString()}</td>
              <td className="d-flex gap-2">
                <Button variant="success" size="sm" onClick={() => setConfirm({ action: 'approve', payload: c })}>
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
    </>
  ), [filteredPending, divisionFilter, platoonFilter, searchTerm]);

  const UsersTable = useMemo(() => (
    <>
      {/* Filter controls (Credentials) */}
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
        <Col xs={12} md={3}>
          <Form.Label className="small fw-semibold">Platoon</Form.Label>
          <Form.Select
            value={platoonFilterUsers}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPlatoonFilterUsers(e.target.value as any)}
          >
            <option value="" disabled>Select Platoon</option>
            <option value="ALL">All Platoons</option>
            <option value="Alpha">Alpha</option>
            <option value="Bravo">Bravo</option>
            <option value="Charlie">Charlie</option>
            <option value="Delta">Delta</option>
          </Form.Select>
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
            <th style={{ width: '60px' }}>S.No</th>
            <th>Name</th>
            <th style={{ width: '80px' }}>SD/SW</th>
            <th style={{ width: '100px' }}>Platoon</th>
            <th>Regimental Number</th>
            <th>Email</th>
            <th>Password</th>
            <th style={{ width: '180px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((u, index) => (
            <tr key={u.uid}>
              <td className="text-center">{index + 1}</td>
              <td className="text-break" dir="ltr">{u.name || 'N/A'} {isSelf(u.uid) && <Badge bg="success" className="ms-1">You</Badge>}</td>
              <td className="text-center">
                {u.division ? (
                  <Badge bg={u.division === 'SD' ? 'info' : 'warning'}>{u.division}</Badge>
                ) : (
                  <span className="text-muted">-</span>
                )}
              </td>
              <td className="text-center">
                {u.platoon ? (
                  <Badge bg="secondary">{u.platoon}</Badge>
                ) : (
                  <span className="text-muted">-</span>
                )}
              </td>
              <td>{u.regimentalNumber || '-'}</td>
              <td>{u.email}</td>
              <td className="text-nowrap">
                {u.tempPassword ? (
                  <>
                    <span className="me-2">{showPwd[u.uid] ? u.tempPassword : '••••••'}</span>
                    <Button size="sm" variant="outline-secondary" onClick={() => togglePwdVisibility(u.uid)} aria-label="Toggle password visibility">
                      <i className={`bi ${showPwd[u.uid] ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </Button>
                  </>
                ) : (
                  <span className="text-muted">-</span>
                )}
              </td>
              <td className="d-flex gap-2">
                {!isSelf(u.uid) ? (
                  <>
                    <Button size="sm" variant="outline-primary" onClick={() => openEdit(u)}>Update</Button>
                    <Button size="sm" variant="outline-danger" onClick={() => setConfirm({ action: 'delete', payload: u })}>Delete</Button>
                  </>
                ) : (
                  <small className="text-muted">Self-managed</small>
                )}
              </td>
            </tr>
          ))}
          {filteredUsers.length === 0 && (
            <tr><td colSpan={8} className="text-center text-muted">No users match filters</td></tr>
          )}
        </tbody>
      </Table>
    </>
  ), [filteredUsers, divisionFilterUsers, platoonFilterUsers, searchTermUsers, showPwd]);


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
        <Card.Header className="bg-primary text-white">
          <h3 className="mb-0">
            <i className="bi bi-people-fill me-2"></i>
            User Management
          </h3>
        </Card.Header>
        <Card.Body>
          <Tabs defaultActiveKey="credentials" id="user-mgmt-tabs" className="mb-3">
            <Tab eventKey="credentials" title="Credentials">
              <Alert variant="info">
                Edit stored credentials (email and temporary password) for existing users. Changes require confirmation.
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

      {/* Confirm modal for approve/reject/update */}
      <Modal show={!!confirm} onHide={() => setConfirm(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm {confirm?.action}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {confirm?.action === 'approve' && (
            <p>Approve registration for <strong>{confirm?.payload?.name}</strong> ({confirm?.payload?.email})?</p>
          )}
          {confirm?.action === 'reject' && (
            <p>Reject registration for <strong>{confirm?.payload?.name}</strong> ({confirm?.payload?.email})?</p>
          )}
          {confirm?.action === 'update' && (
            <p>Apply credential changes for <strong>{editUser?.name}</strong>?</p>
          )}
          {confirm?.action === 'delete' && (
            <p>Delete user <strong>{confirm?.payload?.name}</strong> ({confirm?.payload?.email})? This cannot be undone.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirm(null)} disabled={saving}>Cancel</Button>
          {confirm?.action === 'approve' && (
            <Button variant="success" onClick={() => handleApprove(confirm.payload)} disabled={saving}>Approve</Button>
          )}
          {confirm?.action === 'reject' && (
            <Button variant="danger" onClick={() => handleReject(confirm.payload)} disabled={saving}>Reject</Button>
          )}
          {confirm?.action === 'update' && (
            <Button variant="primary" onClick={handleUpdateCredentials} disabled={saving}>Update</Button>
          )}
          {confirm?.action === 'delete' && (
            <Button variant="danger" onClick={() => handleDeleteUser(confirm.payload)} disabled={saving}>Delete</Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Edit credentials modal */}
      <Modal show={!!editUser} onHide={() => setEditUser(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Credentials</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="g-3">
              <Col xs={12}>
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={editForm.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </Col>
              <Col xs={12}>
                <Form.Label>Temporary Password</Form.Label>
                <Form.Control
                  type="text"
                  value={editForm.tempPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, tempPassword: e.target.value })}
                  placeholder="Set or update temp password"
                />
                <Form.Text className="text-muted">This value is stored in Firestore and is not the Firebase Auth password.</Form.Text>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditUser(null)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={() => setConfirm({ action: 'update', payload: editUser })} disabled={saving}>Save Changes</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default UserManagement;
