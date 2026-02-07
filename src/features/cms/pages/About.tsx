import { useAuth } from '@/contexts/AuthContext';
import { CmsDoc, listenCms } from '@/features/cms/service';
import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Col, Container, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const About: React.FC = () => {
  const [doc, setDoc] = useState<CmsDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    const unsub = listenCms('about', (data) => {
      setDoc(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-0">{doc?.title || 'About Our NCC Unit'}</h2>
          {doc?.updatedAt && (
            <small className="text-muted">Last updated: {new Date(doc.updatedAt).toLocaleString()}</small>
          )}
        </div>
        {isAdmin() && (
          <Button as={Link} to="/admin/cms" variant="primary" size="sm">
            <i className="bi bi-pencil-square me-2" /> Edit
          </Button>
        )}
      </div>

      {(!doc || !doc.sections || doc.sections.length === 0) && (
        <Card className="border-0 shadow-sm">
          <Card.Body>
            <p className="text-muted mb-0">Content not published yet.</p>
            {isAdmin() && (
              <small className="text-muted">Use the CMS editor to add content.</small>
            )}
          </Card.Body>
        </Card>
      )}

      <Row className="g-4">
        {doc.sections.map((s, idx) => (
          <Col xs={12} sm={12} md={6} lg={6} xl={6} key={idx}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <h5 className="d-flex align-items-center">
                  <Badge bg="secondary" className="me-2">{idx + 1}</Badge>
                  {s.heading}
                </h5>
                <p className="mb-0 text-muted" style={{ whiteSpace: 'pre-wrap' }}>{s.body}</p>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
};

export default About;
