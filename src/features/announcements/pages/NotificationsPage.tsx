import { db } from '@/config/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Card, Container } from 'react-bootstrap';

interface Announcement {
  id?: string;
  title: string;
  body: string;
  createdAt?: any;
}

const NotificationsPage: React.FC = () => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setItems(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      } catch (e) {
        console.error(e);
        setError('Failed to load announcements');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Container className="py-5">
      <h1 className="mb-4">Notifications</h1>
      {loading && <Alert variant="secondary">Loading…</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}
      <div className="d-grid gap-3">
        {items.map(it => (
          <Card key={it.id} className="shadow-sm">
            <Card.Body>
              <Card.Title>{it.title}</Card.Title>
              <Card.Text>{it.body}</Card.Text>
              <div className="text-muted small">{it.createdAt?.toDate ? it.createdAt.toDate().toLocaleString() : ''}</div>
            </Card.Body>
          </Card>
        ))}
        {!loading && !error && items.length === 0 && (
          <Alert>No announcements yet</Alert>
        )}
      </div>
    </Container>
  );
};

export default NotificationsPage;
