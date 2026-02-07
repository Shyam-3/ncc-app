import { UserRole } from '@/config/constants';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { collection, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Badge, Card, Container, Form, Spinner, Table } from 'react-bootstrap';
import toast from 'react-hot-toast';

interface UserData {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  status: string;
}

// RoleManagement: focuses only on assigning and modifying roles.
// TODO(approvals): Introduce a separate CadetApproval module where newly registered cadets stay in a 'pending' collection
//   until approved by admin/superadmin. That workflow will:
//   1. Multi-step (4 page) registration storing draft data.
//   2. Admin/Superadmin review & approve -> move record into 'users' & issue credentials.
//   3. Track status transitions: pending -> approved | rejected.
//   4. Allow password resets & credential management by superadmins.
//   5. Enforce max superadmin rules same as here.

const RoleManagement: React.FC = () => {
  const { currentUser, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (userId === currentUser?.uid) {
      toast.error('You cannot change your own role');
      return;
    }
    const superAdminCount = users.filter(u => u.role === 'superadmin').length;
    const targetUser = users.find(u => u.uid === userId);
    if (newRole === 'superadmin' && superAdminCount >= 3) {
      toast.error('Maximum 3 superadmins allowed');
      return;
    }
    if (newRole === 'superadmin' && !isSuperAdmin()) {
      toast.error('Only superadmins can promote to superadmin');
      return;
    }
    if (targetUser?.role === 'superadmin' && superAdminCount === 1) {
      toast.error('Cannot demote the last superadmin');
      return;
    }
    try {
      setUpdating(userId);
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      toast.success(`Role updated to ${newRole}`);
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
      case 'subadmin': return 'info';
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
        <Card.Header className="bg-danger text-white">
          <h3 className="mb-0">
            <i className="bi bi-person-gear me-2"></i>
            Role Management
          </h3>
        </Card.Header>
        <Card.Body>
          <Alert variant="info">
            <i className="bi bi-info-circle me-2"></i>
            <strong>Rules:</strong> Max 3 superadmins. Only superadmins can promote to superadmin. You cannot change your own role.
          </Alert>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.uid}>
                  <td>{user.name || 'N/A'} {user.uid === currentUser?.uid && <Badge bg="success" className="ms-2">You</Badge>}</td>
                  <td>{user.email}</td>
                  <td><Badge bg={getRoleBadgeVariant(user.role)}>{user.role}</Badge></td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td><Badge bg={user.status === 'active' ? 'success' : 'secondary'}>{user.status}</Badge></td>
                  <td>
                    {user.uid !== currentUser?.uid ? (
                      <Form.Select
                        size="sm"
                        value={user.role}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleRoleChange(user.uid, e.target.value as UserRole)}
                        disabled={updating === user.uid}
                      >
                        <option value="" disabled>Select Role</option>
                        <option value="member">Member</option>
                        <option value="subadmin">Sub-Admin</option>
                        <option value="admin">Admin</option>
                        {isSuperAdmin() && <option value="superadmin">Super Admin</option>}
                      </Form.Select>
                    ) : (
                      <small className="text-muted">Cannot modify own role</small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {users.length === 0 && <p className="text-center text-muted py-4">No users found</p>}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default RoleManagement;