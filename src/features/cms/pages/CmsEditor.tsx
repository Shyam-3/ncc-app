import { useAuth } from '@/contexts/AuthContext';
import { CmsDoc, CmsSection, fetchCms, saveCms } from '@/features/cms/service';
import React, { useEffect, useState } from 'react';
import { Button, Card, Col, Container, Form, Row } from 'react-bootstrap';

const defaultDoc: CmsDoc = {
  title: 'About Our NCC Unit',
  sections: [
    { heading: 'Mission', body: 'Unity and Discipline.' },
    { heading: 'History', body: 'Our unit has proudly served for years.' },
  ],
};

const CmsEditor: React.FC = () => {
  const [doc, setDoc] = useState<CmsDoc>(defaultDoc);
  const [saving, setSaving] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    (async () => {
      const existing = await fetchCms('about');
      if (existing) setDoc(existing);
    })();
  }, []);

  const updateSection = (idx: number, patch: Partial<CmsSection>) => {
    setDoc((d) => ({
      ...d,
      sections: d.sections.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  };

  const addSection = () => setDoc((d) => ({ ...d, sections: [...d.sections, { heading: '', body: '' }] }));

  const removeSection = (idx: number) => setDoc((d) => ({ ...d, sections: d.sections.filter((_, i) => i !== idx) }));

  const onSave = async () => {
    setSaving(true);
    try {
      await saveCms('about', doc, currentUser?.uid);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Edit About Page</h2>
        <div>
          <Button variant="outline-secondary" className="me-2" onClick={addSection}>
            <i className="bi bi-plus-circle me-1" /> Add Section
          </Button>
          <Button variant="primary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm mb-3">
        <Card.Body>
          <Form.Group className="mb-3">
            <Form.Label>Title</Form.Label>
            <Form.Control
              value={doc.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDoc({ ...doc, title: e.target.value })}
            />
          </Form.Group>
        </Card.Body>
      </Card>

      <Row className="g-3">
        {doc.sections.map((s, idx) => (
          <Col xs={12} sm={12} md={6} lg={6} xl={6} key={idx}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="mb-0">Section {idx + 1}</h5>
                  <Button variant="outline-danger" size="sm" onClick={() => removeSection(idx)}>
                    <i className="bi bi-trash" />
                  </Button>
                </div>
                <Form.Group className="mb-2">
                  <Form.Label>Heading</Form.Label>
                  <Form.Control
                    value={s.heading}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection(idx, { heading: e.target.value })}
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label>Body</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={6}
                    value={s.body}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateSection(idx, { body: e.target.value })}
                  />
                </Form.Group>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
};

export default CmsEditor;
