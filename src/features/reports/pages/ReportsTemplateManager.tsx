import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, ListGroup, Modal, Row, Spinner } from 'react-bootstrap';
import toast from 'react-hot-toast';
import {
  DEFAULT_ON_DUTY_HEADER_TEMPLATE,
  DEFAULT_ON_DUTY_TEMPLATE,
  ON_DUTY_HEADER_TEMPLATE_DOC_ID,
  ON_DUTY_TEMPLATE_DOC_ID,
  deleteReportTemplate,
  listReportTemplates,
  saveReportTemplate,
  type ReportTemplate,
} from '../templateService';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const ON_DUTY_VARIABLES = ['{{LetterDate}}', '{{Reason}}', '{{Location}}', '{{FromDate}}', '{{ToDate}}', '{{DateClause}}', '{{CadetCount}}', '{{LogoBlock}}'];

const REQUIRED_TEMPLATES: ReportTemplate[] = [
  {
    id: ON_DUTY_TEMPLATE_DOC_ID,
    title: 'On-Duty Letter Template',
    description: 'Template used by On-Duty Letter page.',
    content: DEFAULT_ON_DUTY_TEMPLATE,
    logoUrl: '',
  },
  {
    id: ON_DUTY_HEADER_TEMPLATE_DOC_ID,
    title: 'On-Duty Header Template',
    description: 'Header layout used by On-Duty Letter page.',
    content: DEFAULT_ON_DUTY_HEADER_TEMPLATE,
    logoUrl: '',
  },
];

const ensureRequiredTemplates = (items: ReportTemplate[]) => {
  const existing = new Map(items.map(item => [item.id, item]));
  REQUIRED_TEMPLATES.forEach(required => {
    if (!existing.has(required.id)) {
      existing.set(required.id, required);
    }
  });
  return Array.from(existing.values());
};

const extractVariables = (content: string) => {
  const matches = content.match(/{{\s*[^{}]+\s*}}/g) || [];
  const unique = Array.from(new Set(matches.map(item => item.replace(/\s+/g, ''))));
  return unique.sort((a, b) => a.localeCompare(b));
};

const ReportsTemplateManager: React.FC = () => {
  const initialized = useRef(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [templates, setTemplates] = useState<ReportTemplate[]>([]);

  const [editor, setEditor] = useState<ReportTemplate>({
    ...REQUIRED_TEMPLATES[0],
  });
  const [editingSourceId, setEditingSourceId] = useState<string>(ON_DUTY_TEMPLATE_DOC_ID);

  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateId, setNewTemplateId] = useState('');
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [isDraftTemplate, setIsDraftTemplate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      if (a.id === ON_DUTY_TEMPLATE_DOC_ID) return -1;
      if (b.id === ON_DUTY_TEMPLATE_DOC_ID) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [templates]);

  const availableVariables = useMemo(() => {
    const dynamic = extractVariables(editor.content || '');
    return Array.from(new Set([...ON_DUTY_VARIABLES, ...dynamic]));
  }, [editor.content]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const loadTemplates = async () => {
      try {
        setLoadError('');
        const items = await listReportTemplates();

        const merged = ensureRequiredTemplates(items);

        if (merged.length === 0) {
          const fallback = REQUIRED_TEMPLATES[0];
          setTemplates([fallback]);
          setEditor(fallback);
          setEditingSourceId(fallback.id);
          setIsDraftTemplate(false);
          return;
        }

        setTemplates(merged);
        const selected = merged.find(t => t.id === ON_DUTY_TEMPLATE_DOC_ID) || merged[0];
        setEditor(selected);
        setEditingSourceId(selected.id);
        setIsDraftTemplate(false);
        setView('list');
      } catch (error) {
        console.error(error);
        setLoadError('Failed to load templates. Ensure Firestore rules allow access to reportTemplates for admin/superadmin.');
        toast.error('Failed to load report templates');
      } finally {
        setLoading(false);
      }
    };

    void loadTemplates();
  }, []);

  const handleSelectTemplate = (template: ReportTemplate) => {
    setEditor(template);
    setEditingSourceId(template.id);
    setIsDraftTemplate(false);
    setView('editor');
  };

  const handleCreateTemplate = () => {
    const title = newTemplateTitle.trim();
    const id = slugify(newTemplateId.trim() || title);

    if (!title) {
      toast.error('Template title is required');
      return;
    }

    if (!id) {
      toast.error('Template key is invalid');
      return;
    }

    if (templates.some(t => t.id === id)) {
      toast.error('Template key already exists');
      return;
    }

    const created: ReportTemplate = {
      id,
      title,
      description: '',
      content: DEFAULT_ON_DUTY_TEMPLATE,
      logoUrl: '',
    };

    setTemplates(prev => [...prev, created]);
    setEditor(created);
    setEditingSourceId(created.id);
    setIsDraftTemplate(true);
    setView('editor');
    setNewTemplateTitle('');
    setNewTemplateId('');
  };

  const handleInsertVariable = (variable: string) => {
    const textarea = contentRef.current;
    if (!textarea) {
      setEditor(prev => ({ ...prev, content: `${prev.content}${prev.content.endsWith('\n') ? '' : '\n'}${variable}` }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = editor.content || '';
    const next = `${current.slice(0, start)}${variable}${current.slice(end)}`;
    setEditor(prev => ({ ...prev, content: next }));

    requestAnimationFrame(() => {
      textarea.focus();
      const position = start + variable.length;
      textarea.setSelectionRange(position, position);
    });
  };

  const handleSave = async () => {
    try {
      if (!editor.id.trim()) {
        toast.error('Template key is required');
        return;
      }
      if (!editor.title.trim()) {
        toast.error('Template title is required');
        return;
      }
      if (!editor.content.trim()) {
        toast.error('Template content is required');
        return;
      }

      const normalizedId = isDraftTemplate
        ? (editor.id === ON_DUTY_TEMPLATE_DOC_ID || editor.id === ON_DUTY_HEADER_TEMPLATE_DOC_ID
          ? editor.id
          : slugify(editor.id))
        : editingSourceId;

      if (!isDraftTemplate && normalizedId !== editingSourceId) {
        toast.error('Template key cannot be changed for an existing template');
        return;
      }

      const duplicate = templates.some(template => template.id === normalizedId && template.id !== editingSourceId);
      if (duplicate) {
        toast.error('Template key already exists. Use a unique key.');
        return;
      }

      setSaving(true);

      await saveReportTemplate({
        ...editor,
        id: normalizedId,
      });

      const refreshed = await listReportTemplates();
      const merged = ensureRequiredTemplates(refreshed);
      setTemplates(merged);
      const selected = merged.find(t => t.id === normalizedId);
      if (selected) {
        setEditor(selected);
        setEditingSourceId(selected.id);
        setIsDraftTemplate(false);
      }

      toast.success('Template saved');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    const templateTitle = editor.title?.trim() || editor.id;

    try {
      setSaving(true);
      await deleteReportTemplate(editor.id);
      const refreshed = await listReportTemplates();
      const merged = ensureRequiredTemplates(refreshed);
      setTemplates(merged);

      if (merged.length > 0) {
        const next = merged.find(t => t.id === ON_DUTY_TEMPLATE_DOC_ID) || merged[0];
        setEditor(next);
        setEditingSourceId(next.id);
      } else {
        const fallback: ReportTemplate = REQUIRED_TEMPLATES[0];
        setEditor(fallback);
        setEditingSourceId(fallback.id);
      }

      setIsDraftTemplate(false);
      setView('list');
      toast.success(`Template "${templateTitle}" deleted`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete template');
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p className="mt-3">Loading templates...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-3">
        <Col>
          <h2 className="mb-1">Reports Template</h2>
          <p className="text-muted mb-0">Create and manage custom templates. On-Duty tab uses the On-Duty template and injects dynamic values into placeholders.</p>
        </Col>
      </Row>

      {loadError && (
        <Alert variant="warning" className="mb-3">{loadError}</Alert>
      )}

      {view === 'list' && (
        <Row className="g-3">
          <Col lg={12}>
            <Card className="shadow-sm mb-3">
              <Card.Header className="bg-primary text-white">Add Template</Card.Header>
              <Card.Body>
                <Row className="g-2 align-items-end">
                  <Col md={5}>
                    <Form.Group>
                      <Form.Label>Title</Form.Label>
                      <Form.Control
                        type="text"
                        value={newTemplateTitle}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTemplateTitle(e.target.value)}
                        placeholder="e.g., Camp Approval"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={5}>
                    <Form.Group>
                      <Form.Label>Key (optional)</Form.Label>
                      <Form.Control
                        type="text"
                        value={newTemplateId}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTemplateId(e.target.value)}
                        placeholder="e.g., camp-approval-template"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={2}>
                    <Button className="w-100" variant="outline-primary" onClick={handleCreateTemplate}>Create</Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="shadow-sm">
              <Card.Header className="bg-primary text-white">Available Templates</Card.Header>
              <ListGroup variant="flush">
                {sortedTemplates.map(template => (
                  <ListGroup.Item
                    key={template.id}
                    action
                    onClick={() => handleSelectTemplate(template)}
                    className="d-flex justify-content-between align-items-center py-3"
                  >
                    <div>
                      <div className="fw-semibold">{template.title}</div>
                      <div className="text-muted small">{template.description || 'No description provided'}</div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      {template.id === ON_DUTY_TEMPLATE_DOC_ID && <Badge bg="secondary">ON-DUTY</Badge>}
                      {template.id === ON_DUTY_HEADER_TEMPLATE_DOC_ID && <Badge bg="dark">ON-DUTY HEADER</Badge>}
                      <i className="bi bi-chevron-right" />
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card>
          </Col>
        </Row>
      )}

      {view === 'editor' && (
        <Row className="g-3">
          <Col lg={12}>
            <Card className="shadow-sm">
              <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
                <span>Template Editor</span>
                <Button size="sm" variant="light" onClick={() => setView('list')}>
                  Back to Templates
                </Button>
              </Card.Header>
              <Card.Body>
                <Form>
                  <Row className="g-2 mb-2">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Template Title</Form.Label>
                        <Form.Control
                          type="text"
                          value={editor.title}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditor(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Template Key</Form.Label>
                        <Form.Control
                          type="text"
                          value={editor.id}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditor(prev => ({ ...prev, id: e.target.value }))}
                          disabled={editor.id === ON_DUTY_TEMPLATE_DOC_ID || editor.id === ON_DUTY_HEADER_TEMPLATE_DOC_ID || !isDraftTemplate}
                        />
                        {!isDraftTemplate && editor.id !== ON_DUTY_TEMPLATE_DOC_ID && editor.id !== ON_DUTY_HEADER_TEMPLATE_DOC_ID && (
                          <Form.Text className="text-muted">Key is locked after creation.</Form.Text>
                        )}
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-2">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      type="text"
                      value={editor.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditor(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label>Logo URL (optional)</Form.Label>
                    <Form.Control
                      type="text"
                      value={editor.logoUrl || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditor(prev => ({ ...prev, logoUrl: e.target.value }))}
                    />
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label>Template Content</Form.Label>
                    {editor.id === ON_DUTY_HEADER_TEMPLATE_DOC_ID && (
                      <Alert variant="info" className="small py-2">
                        Edit only the top header area here (logo + college lines). Do not add date or letter body in this template.
                      </Alert>
                    )}
                    {editor.id === ON_DUTY_TEMPLATE_DOC_ID && (
                      <Alert variant="info" className="small py-2">
                        This template starts below the header. Keep date on the right and "To" block on the left using HTML styles (for example, a flex row).
                      </Alert>
                    )}
                    <Form.Control
                      as="textarea"
                      rows={16}
                      value={editor.content}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditor(prev => ({ ...prev, content: e.target.value }))}
                      ref={contentRef}
                    />
                  </Form.Group>

                  <div className="small text-muted mb-2">Variables</div>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {availableVariables.map(variable => (
                      <Button
                        key={variable}
                        size="sm"
                        variant="outline-secondary"
                        onClick={() => handleInsertVariable(variable)}
                      >
                        {variable}
                      </Button>
                    ))}
                  </div>

                  <div className="d-flex gap-2">
                    <Button variant="primary" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save changes'}
                    </Button>
                    <Button variant="outline-danger" onClick={handleDelete} disabled={saving}>
                      Delete Template
                    </Button>
                    <Button
                      variant="outline-secondary"
                      onClick={() => setEditor(prev => ({
                        ...prev,
                        content: editor.id === ON_DUTY_HEADER_TEMPLATE_DOC_ID ? DEFAULT_ON_DUTY_HEADER_TEMPLATE : DEFAULT_ON_DUTY_TEMPLATE,
                      }))}
                      disabled={saving}
                    >
                      Reset Content
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Template</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete <strong>{editor.title || editor.id}</strong>? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete} disabled={saving}>
            {saving ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ReportsTemplateManager;
