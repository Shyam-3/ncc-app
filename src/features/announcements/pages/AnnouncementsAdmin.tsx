import { db } from '@/config/firebase';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row, Table } from 'react-bootstrap';
import toast from 'react-hot-toast';

interface Announcement {
  id?: string;
  title: string;
  body: string;
  createdAt?: any;
  author?: string;
}

const AnnouncementsAdmin: React.FC = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setItems(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'announcements'), {
        title: title.trim(),
        body: body.trim(),
        createdAt: serverTimestamp(),
      });
      setTitle(''); setBody('');
      toast.success('Announcement created');
      await load();
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to create');
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'announcements', id));
      toast.success('Deleted');
      await load();
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to delete');
    }
  };

  return (
    <Container className="py-5">
      <Row className="g-4">
        <Col xs={12} sm={12} md={12} lg={5} xl={5}>
          <Card className="shadow-sm">
            <Card.Header>Create Announcement</Card.Header>
            <Card.Body>
              <Form onSubmit={create}>
                <Form.Group className="mb-3" controlId="title">
                  <Form.Label>Title</Form.Label>
                  <Form.Control value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} required />
                </Form.Group>
                <Form.Group className="mb-3" controlId="body">
                  <Form.Label>Message</Form.Label>
                  <Form.Control as="textarea" rows={4} value={body} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)} required />
                </Form.Group>
                <Button type="submit" disabled={!title.trim() || !body.trim()}>Publish</Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={12} lg={7} xl={7}>
          <Card className="shadow-sm">
            <Card.Header>All Announcements</Card.Header>
            <Card.Body>
              {loading ? (
                <Alert variant="secondary">Loading…</Alert>
              ) : items.length === 0 ? (
                <Alert>No announcements yet</Alert>
              ) : (
                <Table hover responsive size="sm">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Message</th>
                      <th>Created</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(it => (
                      <tr key={it.id}>
                        <td>{it.title}</td>
                        <td style={{maxWidth: 480}}>{it.body}</td>
                        <td>{it.createdAt?.toDate ? it.createdAt.toDate().toLocaleString() : '-'}</td>
                        <td className="text-end">
                          <Button variant="outline-danger" size="sm" onClick={() => it.id && remove(it.id)}>Delete</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AnnouncementsAdmin;
