import { UserRole } from '@/shared/config/constants';
import { isAnoUser } from '@/shared/utils/userType';
import { db } from '@/shared/config/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Spinner, Table } from 'react-bootstrap';
import toast from 'react-hot-toast';
import './RoleManagement.css';

interface UserData {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  userType?: 'ano' | 'cadet';
  nccYear?: string;
  regimentalNumber?: string;
  division?: 'SD' | 'SW';
  createdAt: string;
  status: string;
}

// Role hierarchy: lower number = lower rank
const ROLE_LEVEL: Record<string, number> = {
  member: 1,
  admin: 2,
  superadmin: 3,
};

// NCC year sort priority (within same role)
const NCC_YEAR_ORDER: Record<string, number> = {
  '1st Year': 1,
  '2nd Year': 2,
  '3rd Year': 3,
};

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const RoleManagement: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Filter states
  const [divisionFilter, setDivisionFilter] = useState<'ALL' | 'SD' | 'SW'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | string>('ALL');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const currentUserLevel = ROLE_LEVEL[userProfile?.role || ''] ?? 0;

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reset to page 1 when filters or rowsPerPage change
  useEffect(() => {
    setCurrentPage(1);
  }, [divisionFilter, searchTerm, roleFilter, rowsPerPage]);

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const usersList = snapshot.docs.map(d => ({ uid: d.id, ...d.data() })) as UserData[];
      setUsers(usersList);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Filtered and sorted users
  const filteredUsers = useMemo(() => {
    let list = [...users];

    if (divisionFilter !== 'ALL') {
      list = list.filter(u => (u.division || '') === divisionFilter);
    }
    if (roleFilter !== 'ALL') {
      list = list.filter(u => u.role === roleFilter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(u =>
        (u.name || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term)
      );
    }

    // Sort: nccYear first, then role (lowest→highest), then regimental number (ascending)
    list.sort((a, b) => {
      const yearA = NCC_YEAR_ORDER[a.nccYear || ''] ?? 0;
      const yearB = NCC_YEAR_ORDER[b.nccYear || ''] ?? 0;
      if (yearA !== yearB) return yearA - yearB;

      const levelA = ROLE_LEVEL[a.role] ?? 0;
      const levelB = ROLE_LEVEL[b.role] ?? 0;
      if (levelA !== levelB) return levelA - levelB;

      return (a.regimentalNumber || '').localeCompare(b.regimentalNumber || '', undefined, { numeric: true });
    });

    return list;
  }, [users, divisionFilter, roleFilter, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredUsers.length);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const clearFilters = () => {
    setDivisionFilter('ALL');
    setSearchTerm('');
    setRoleFilter('ALL');
  };

  // Determine if the current user can change a target user's role
  const canChangeRole = (targetUser: UserData): boolean => {
    if (isAnoUser(targetUser) && targetUser.role === 'superadmin') return false;
    // Can never change own role
    if (targetUser.uid === currentUser?.uid) return false;
    // Superadmins can modify anyone
    if (isSuperAdmin()) return true;
    // Admins can modify admins and members, but NOT superadmins
    const targetLevel = ROLE_LEVEL[targetUser.role] ?? 0;
    return currentUserLevel >= targetLevel && targetUser.role !== 'superadmin';
  };

  // Get the roles the current user is allowed to assign to a target
  const getAssignableRoles = (_targetUser: UserData): { value: string; label: string }[] => {
    const roles: { value: string; label: string }[] = [];

    // Both admin and superadmin can assign member and admin
    roles.push({ value: 'member', label: 'Member' });
    roles.push({ value: 'admin', label: 'Admin' });

    // Only superadmins can assign superadmin
    if (isSuperAdmin()) {
      roles.push({ value: 'superadmin', label: 'Super Admin' });
    }

    return roles;
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (userId === currentUser?.uid) {
      toast.error('You cannot change your own role');
      return;
    }

    const targetUser = users.find(u => u.uid === userId);
    if (!targetUser) return;

    // Hierarchy enforcement
    // Admins cannot touch superadmins
    if (!isSuperAdmin() && targetUser.role === 'superadmin') {
      toast.error('Only superadmins can modify superadmin roles');
      return;
    }
    // Admins cannot promote to superadmin
    if (!isSuperAdmin() && newRole === 'superadmin') {
      toast.error('Only superadmins can promote to superadmin');
      return;
    }

    if (isAnoUser(targetUser) && newRole !== 'superadmin') {
      toast.error('ANO superadmins cannot be demoted');
      return;
    }

    // Superadmin-specific rules
    const superAdminCount = users.filter(u => u.role === 'superadmin').length;
    if (newRole === 'superadmin' && superAdminCount >= 6) {
      toast.error('Maximum 6 superadmins allowed');
      return;
    }
    if (targetUser.role === 'superadmin' && superAdminCount === 1) {
      toast.error('Cannot demote the last superadmin');
      return;
    }

    try {
      setUpdating(userId);
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      toast.success(`Role updated to ${newRole.toUpperCase()}`);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setUpdating(null);
    }
  };

  const getRoleBadgeVariant = (role: UserRole): string => {
    switch (role) {
      case 'superadmin': return 'danger';
      case 'admin': return 'primary';
      case 'member': return 'secondary';
      default: return 'light';
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading roles...</p>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Card className="shadow">
        <Card.Header className="bg-danger text-white d-flex justify-content-between align-items-center">
          <h3 className="mb-0">
            <i className="bi bi-person-gear me-2"></i>
            Role Management
          </h3>
          <Button variant="light" size="sm" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left me-1"></i> Back
          </Button>
        </Card.Header>
        <Card.Body>
          <Alert variant="info">
            <i className="bi bi-info-circle me-2"></i>
            <strong>Rules:</strong> Max 6 superadmins. ANO superadmins cannot be demoted. Admins can modify admins &amp; members. Only superadmins can modify superadmin roles. You cannot change your own role.
          </Alert>

          {/* Filter controls */}
          <Row className="mb-3 g-3">
            <Col xs={12} md={3}>
              <Form.Label className="small fw-semibold">Division</Form.Label>
              <div className="btn-group w-100" role="group">
                <input type="radio" className="btn-check" name="division-filter-roles" id="division-roles-all"
                  checked={divisionFilter === 'ALL'} onChange={() => setDivisionFilter('ALL')} />
                <label className="btn btn-outline-danger" htmlFor="division-roles-all">Both</label>
                <input type="radio" className="btn-check" name="division-filter-roles" id="division-roles-sd"
                  checked={divisionFilter === 'SD'} onChange={() => setDivisionFilter('SD')} />
                <label className="btn btn-outline-danger" htmlFor="division-roles-sd">SD</label>
                <input type="radio" className="btn-check" name="division-filter-roles" id="division-roles-sw"
                  checked={divisionFilter === 'SW'} onChange={() => setDivisionFilter('SW')} />
                <label className="btn btn-outline-danger" htmlFor="division-roles-sw">SW</label>
              </div>
            </Col>
            <Col xs={12} md={3}>
              <Form.Label className="small fw-semibold">Role</Form.Label>
              <Form.Select value={roleFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRoleFilter(e.target.value)}>
                <option value="ALL">All Roles</option>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </Form.Select>
            </Col>
            <Col xs={12} md={4}>
              <Form.Label className="small fw-semibold">Search</Form.Label>
              <Form.Control type="text" placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} />
            </Col>
            <Col xs={12} md={2} className="d-flex align-items-end">
              <Button variant="outline-secondary" className="w-100" onClick={clearFilters}>
                <i className="bi bi-x-circle me-1"></i> Clear
              </Button>
            </Col>
          </Row>

          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th className="role-col-sno">S.No</th>
                <th>Name</th>
                <th>Email</th>
                <th className="role-col-role">Role</th>
                <th className="role-col-change">Change Role</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user, index) => (
                <tr key={user.uid}>
                  <td className="text-center">{startIndex + index + 1}</td>
                  <td className="text-break" dir="ltr">
                    {user.name || 'N/A'}{' '}
                    {user.uid === currentUser?.uid && <Badge bg="success" className="ms-1">You</Badge>}
                  </td>
                  <td className="text-break">{user.email}</td>
                  <td className="text-center">
                    <Badge bg={getRoleBadgeVariant(user.role)}>{user.role.toUpperCase()}</Badge>
                  </td>
                  <td>
                    {canChangeRole(user) ? (
                      <Form.Select
                        size="sm"
                        value={user.role}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleRoleChange(user.uid, e.target.value as UserRole)}
                        disabled={updating === user.uid}
                      >
                        {getAssignableRoles(user).map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </Form.Select>
                    ) : (
                      <small className="text-muted">
                        {user.uid === currentUser?.uid ? 'Own role' : 'No permission'}
                      </small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {filteredUsers.length === 0 && <p className="text-center text-muted py-4">No users found</p>}

          {/* Pagination — Material Design table footer */}
          {filteredUsers.length > 0 && (
            <div className="role-pagination-footer">
              <div className="role-pagination-rpp">
                <span className="text-muted small me-2">Rows per page:</span>
                <Form.Select
                  size="sm"
                  value={rowsPerPage}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRowsPerPage(Number(e.target.value))}
                  className="role-rpp-select"
                >
                  {ROWS_PER_PAGE_OPTIONS.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </Form.Select>
              </div>

              <span className="text-muted small role-pagination-range">
                {startIndex + 1}–{endIndex} of {filteredUsers.length}
              </span>

              <div className="role-pagination-nav">
                <button
                  className="btn btn-sm btn-outline-secondary role-page-btn"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage(1)}
                  title="First page"
                >
                  <i className="bi bi-chevron-double-left"></i>
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary role-page-btn"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  title="Previous page"
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
                <span className="text-muted small mx-2">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  className="btn btn-sm btn-outline-secondary role-page-btn"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  title="Next page"
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary role-page-btn"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  title="Last page"
                >
                  <i className="bi bi-chevron-double-right"></i>
                </button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default RoleManagement;
