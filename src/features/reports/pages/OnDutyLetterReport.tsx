import { ACADEMIC_YEARS, DEPARTMENTS, ROMAN_YEAR_MAP } from '@/config/constants';
import { db } from '@/config/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { DEFAULT_ON_DUTY_TEMPLATE, getOnDutyTemplate, type OnDutyTemplate } from '../templateService';

interface CadetUser {
  uid: string;
  role?: string;
  email: string;
  name: string;
  regimentalNumber?: string;
  division?: 'SD' | 'SW';
  year?: string;
  residentialStatus?: string;
  department?: string;
  registerNumber?: string;
  nccYear?: string;
}

interface OnDutyLetterForm {
  letterDate: string;
  reason: string;
  reasonOther: string;
  location: string;
  locationOther: string;
  fromDate: string;
  toDate: string;
}

const formatYearForSort = (value?: string) => {
  if (!value) return 99;
  const lower = value.toLowerCase();
  if (lower.includes('1') || lower.includes('i ')) return 1;
  if (lower.includes('2') || lower.includes('ii')) return 2;
  if (lower.includes('3') || lower.includes('iii')) return 3;
  if (lower.includes('4') || lower.includes('iv')) return 4;
  return 99;
};

const formatAcademicYear = (value?: string) => {
  if (!value) return '-';
  const cleaned = value.replace(' Year', '').trim();
  return ROMAN_YEAR_MAP[cleaned] || cleaned;
};

const renderTemplate = (template: string, values: Record<string, string>) => {
  return template.replace(/{{\s*([^{}]+)\s*}}/g, (_, key: string) => values[key] ?? `{{${key}}}`);
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildDateClause = (fromDate: string, toDate: string) => {
  if (fromDate === toDate) {
    return `on ${fromDate}`;
  }
  return `from ${fromDate} to ${toDate}`;
};

const applySingleDayGrammar = (text: string, fromDate: string, toDate: string) => {
  if (!fromDate || !toDate || fromDate !== toDate) {
    return text;
  }
  const escapedFrom = escapeRegExp(fromDate);
  const escapedTo = escapeRegExp(toDate);
  return text.replace(new RegExp(`from\\s+${escapedFrom}\\s+to\\s+${escapedTo}`, 'gi'), `on ${fromDate}`);
};

const OnDutyLetterReport: React.FC = () => {
  const initialized = useRef(false);
  const [users, setUsers] = useState<CadetUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCadets, setSelectedCadets] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [template, setTemplate] = useState<OnDutyTemplate>({
    content: DEFAULT_ON_DUTY_TEMPLATE,
    logoUrl: '',
  });

  const [divisionFilter, setDivisionFilter] = useState<'ALL' | 'SD' | 'SW'>('ALL');
  const [yearFilter, setYearFilter] = useState<'ALL' | string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<'ALL' | string>('ALL');
  const [residentialFilter, setResidentialFilter] = useState<'ALL' | string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<OnDutyLetterForm>({
    letterDate: new Date().toISOString().slice(0, 10),
    reason: '',
    reasonOther: '',
    location: '',
    locationOther: '',
    fromDate: '',
    toDate: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const YEAR_OPTIONS = ACADEMIC_YEARS.filter(y => y !== '4th Year');
  const REASONS = ['Camp', 'Sports Event', 'Training', 'Duty', 'Others'];
  const LOCATIONS = ['College Premises', 'Training Center', 'Sports Ground', 'City', 'Others'];

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void fetchCadets();
    void fetchTemplate();
  }, []);

  const fetchCadets = async () => {
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const cadetUsers = snapshot.docs
        .map(d => ({ uid: d.id, ...(d.data() as any) }))
        .filter(u => u.role !== 'superadmin') as CadetUser[];
      setUsers(cadetUsers);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load cadets');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplate = async () => {
    try {
      const data = await getOnDutyTemplate();
      setTemplate(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load saved template');
    }
  };

  const filteredCadets = useMemo(() => {
    let list = [...users];

    if (divisionFilter !== 'ALL') list = list.filter(u => (u.division || '') === divisionFilter);
    if (yearFilter !== 'ALL') list = list.filter(u => (u.year || '') === yearFilter);
    if (departmentFilter !== 'ALL') list = list.filter(u => (u.department || '') === departmentFilter);
    if (residentialFilter !== 'ALL') list = list.filter(u => (u.residentialStatus || '') === residentialFilter);

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(u =>
        (u.name || '').toLowerCase().includes(term) ||
        (u.registerNumber || '').toLowerCase().includes(term)
      );
    }

    return list.sort((a, b) => {
      const yearDelta = formatYearForSort(a.nccYear || a.year) - formatYearForSort(b.nccYear || b.year);
      if (yearDelta !== 0) return yearDelta;
      return (a.registerNumber || '').localeCompare((b.registerNumber || ''), undefined, { numeric: true });
    });
  }, [users, divisionFilter, yearFilter, departmentFilter, residentialFilter, searchTerm]);

  const handleFormChange = (field: keyof OnDutyLetterForm, value: string) => {
    setFormData(prev => {
      const nextFormData = { ...prev, [field]: value };

      setFormErrors(prevErrors => {
        const nextErrors = { ...prevErrors };

        if (nextErrors[field]) {
          delete nextErrors[field];
        }

        const hasBothDates = Boolean(nextFormData.fromDate) && Boolean(nextFormData.toDate);
        if (hasBothDates) {
          const fromTime = new Date(nextFormData.fromDate).getTime();
          const toTime = new Date(nextFormData.toDate).getTime();
          if (!Number.isNaN(fromTime) && !Number.isNaN(toTime) && toTime < fromTime) {
            nextErrors.toDate = 'To date cannot be earlier than from date. Please change the date.';
          } else if (nextErrors.toDate === 'To date cannot be earlier than from date. Please change the date.') {
            delete nextErrors.toDate;
          }
        }

        return nextErrors;
      });

      return nextFormData;
    });
  };

  const toggleCadetSelection = (uid: string) => {
    setSelectedCadets(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedCadets(prev => {
      const next = new Set(prev);
      const allSelected = filteredCadets.length > 0 && filteredCadets.every(c => next.has(c.uid));

      if (allSelected) {
        filteredCadets.forEach(c => next.delete(c.uid));
      } else {
        filteredCadets.forEach(c => next.add(c.uid));
      }

      return next;
    });
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.letterDate) errors.letterDate = 'Letter date is required';
    if (!formData.reason) errors.reason = 'Reason is required';
    if (formData.reason === 'Others' && !formData.reasonOther.trim()) errors.reasonOther = 'Please enter reason';
    if (!formData.location) errors.location = 'Location is required';
    if (formData.location === 'Others' && !formData.locationOther.trim()) errors.locationOther = 'Please enter location';
    if (!formData.fromDate) errors.fromDate = 'From date is required';
    if (!formData.toDate) errors.toDate = 'To date is required';
    if (formData.fromDate && formData.toDate) {
      const fromTime = new Date(formData.fromDate).getTime();
      const toTime = new Date(formData.toDate).getTime();
      if (!Number.isNaN(fromTime) && !Number.isNaN(toTime) && toTime < fromTime) {
        errors.toDate = 'To date cannot be earlier than from date. Please change the date.';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePreview = () => {
    if (!validateForm()) {
      toast.error('Please fill all required fields');
      return;
    }
    if (selectedCadets.size === 0) {
      toast.error('Select at least one cadet');
      return;
    }
    setShowPreview(true);
  };

  const selectedCadetRows = useMemo(
    () => filteredCadets.filter(c => selectedCadets.has(c.uid)),
    [filteredCadets, selectedCadets],
  );

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p className="mt-3">Loading cadets...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-3">
        <Col>
          <h2 className="mb-1">On-Duty Letter Report Generator</h2>
          <p className="text-muted mb-0">Template is managed in Reports tab and dynamic placeholders use the inputs from this page.</p>
          <div className="mt-2">
            <Button as={Link} to="/admin/reports" variant="outline-secondary" size="sm">
              Go to Reports Template
            </Button>
          </div>
        </Col>
      </Row>

      <Row className="g-3">
        <Col lg={12}>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">Letter Meta Data</Card.Header>
            <Card.Body>
              <Form>
                <Row className="g-3">
                  <Col xs={12} md={3}>
                    <Form.Group controlId="letterDate">
                      <Form.Label>Date of On-Duty Letter *</Form.Label>
                      <Form.Control
                        type="date"
                        value={formData.letterDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange('letterDate', e.target.value)}
                        isInvalid={Boolean(formErrors.letterDate)}
                      />
                      {formErrors.letterDate && <Form.Text className="text-danger d-block">{formErrors.letterDate}</Form.Text>}
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={3}>
                    <Form.Group controlId="reason">
                      <Form.Label>Reason *</Form.Label>
                      <Form.Select
                        value={formData.reason}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFormChange('reason', e.target.value)}
                        isInvalid={Boolean(formErrors.reason)}
                      >
                        <option value="">Select reason</option>
                        {REASONS.map(item => <option key={item} value={item}>{item}</option>)}
                      </Form.Select>
                      {formErrors.reason && <Form.Text className="text-danger d-block">{formErrors.reason}</Form.Text>}
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={3}>
                    <Form.Group controlId="location">
                      <Form.Label>Location *</Form.Label>
                      <Form.Select
                        value={formData.location}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFormChange('location', e.target.value)}
                        isInvalid={Boolean(formErrors.location)}
                      >
                        <option value="">Select location</option>
                        {LOCATIONS.map(item => <option key={item} value={item}>{item}</option>)}
                      </Form.Select>
                      {formErrors.location && <Form.Text className="text-danger d-block">{formErrors.location}</Form.Text>}
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={3}>
                    <Form.Group controlId="fromDate">
                      <Form.Label>From Date *</Form.Label>
                      <Form.Control
                        type="date"
                        value={formData.fromDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange('fromDate', e.target.value)}
                        isInvalid={Boolean(formErrors.fromDate)}
                      />
                      {formErrors.fromDate && <Form.Text className="text-danger d-block">{formErrors.fromDate}</Form.Text>}
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={3}>
                    <Form.Group controlId="toDate">
                      <Form.Label>To Date *</Form.Label>
                      <Form.Control
                        type="date"
                        value={formData.toDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange('toDate', e.target.value)}
                        isInvalid={Boolean(formErrors.toDate)}
                      />
                      {formErrors.toDate && <Form.Text className="text-danger d-block">{formErrors.toDate}</Form.Text>}
                    </Form.Group>
                  </Col>
                </Row>

                {formData.reason === 'Others' && (
                  <Form.Group className="mt-3" controlId="reasonOther">
                    <Form.Label>Other Reason *</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={formData.reasonOther}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFormChange('reasonOther', e.target.value)}
                      placeholder="Enter reason"
                      isInvalid={Boolean(formErrors.reasonOther)}
                    />
                    {formErrors.reasonOther && <Form.Text className="text-danger d-block">{formErrors.reasonOther}</Form.Text>}
                  </Form.Group>
                )}

                {formData.location === 'Others' && (
                  <Form.Group className="mt-3" controlId="locationOther">
                    <Form.Label>Other Location *</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={formData.locationOther}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFormChange('locationOther', e.target.value)}
                      placeholder="Enter location"
                      isInvalid={Boolean(formErrors.locationOther)}
                    />
                    {formErrors.locationOther && <Form.Text className="text-danger d-block">{formErrors.locationOther}</Form.Text>}
                  </Form.Group>
                )}

                <Alert variant="info" className="small mt-3 mb-0">
                  <div className="fw-semibold mb-1">Template Source</div>
                  <div className="mb-1">First-page template is loaded from Reports tab.</div>
                  <div className="fw-semibold mt-2 mb-1">Supported placeholders</div>
                  <div>{'{{LetterDate}}'}, {'{{Reason}}'}, {'{{Location}}'}, {'{{FromDate}}'}, {'{{ToDate}}'}, {'{{CadetCount}}'}</div>
                </Alert>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={12}>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">Cadet Selection</Card.Header>
            <Card.Body>
              <Row className="g-2 mb-3">
                <Col xs={12} sm={6} md={3}>
                  <Form.Select size="sm" value={divisionFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDivisionFilter(e.target.value as any)}>
                    <option value="ALL">All Divisions</option>
                    <option value="SD">SD</option>
                    <option value="SW">SW</option>
                  </Form.Select>
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <Form.Select size="sm" value={departmentFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDepartmentFilter(e.target.value)}>
                    <option value="ALL">All Departments</option>
                    {DEPARTMENTS.map(item => <option key={item} value={item}>{item}</option>)}
                  </Form.Select>
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <Form.Select size="sm" value={yearFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setYearFilter(e.target.value)}>
                    <option value="ALL">All Years</option>
                    {YEAR_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                  </Form.Select>
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <Form.Select size="sm" value={residentialFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setResidentialFilter(e.target.value)}>
                    <option value="ALL">All Residential</option>
                    <option value="Day Scholar">Day Scholar</option>
                    <option value="Hosteller">Hosteller</option>
                  </Form.Select>
                </Col>
              </Row>

              <Form.Control
                className="mb-3"
                type="text"
                placeholder="Search by name or register number"
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />

              <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <Table striped hover size="sm" className="mb-0">
                  <thead style={{ position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ width: '48px' }}>
                        <Form.Check
                          type="checkbox"
                          checked={filteredCadets.length > 0 && filteredCadets.every(c => selectedCadets.has(c.uid))}
                          onChange={toggleSelectAllFiltered}
                          aria-label="Select all filtered cadets"
                        />
                      </th>
                      <th>S.No</th>
                      <th>Year</th>
                      <th>Reg. No</th>
                      <th>Name of Cadet</th>
                      <th>Residential</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCadets.map((cadet, index) => {
                      return (
                        <tr key={cadet.uid}>
                          <td>
                            <Form.Check
                              type="checkbox"
                              checked={selectedCadets.has(cadet.uid)}
                              onChange={() => toggleCadetSelection(cadet.uid)}
                              aria-label={`Select ${cadet.name || cadet.uid}`}
                            />
                          </td>
                          <td>{index + 1}</td>
                          <td><Badge bg="secondary">{formatAcademicYear(cadet.year || cadet.nccYear)}</Badge></td>
                          <td>{cadet.registerNumber || '-'}</td>
                          <td>{cadet.name || '-'}</td>
                          <td>{cadet.residentialStatus || '-'}</td>
                        </tr>
                      );
                    })}
                    {filteredCadets.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-3">No cadets found</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
            <Card.Footer className="d-flex justify-content-between align-items-center">
              <small className="text-muted">Selected: {selectedCadets.size} / {filteredCadets.length}</small>
              <Button variant="primary" onClick={handlePreview} disabled={selectedCadets.size === 0}>
                <i className="bi bi-eye me-1" />Preview
              </Button>
            </Card.Footer>
          </Card>
        </Col>
      </Row>

      <OnDutyLetterPreview
        show={showPreview}
        onHide={() => setShowPreview(false)}
        formData={formData}
        template={template}
        cadets={selectedCadetRows}
      />
    </Container>
  );
};

interface PreviewProps {
  show: boolean;
  onHide: () => void;
  formData: OnDutyLetterForm;
  template: OnDutyTemplate;
  cadets: CadetUser[];
}

const OnDutyLetterPreview: React.FC<PreviewProps> = ({ show, onHide, formData, template, cadets }) => {
  const displayReason = formData.reason === 'Others' ? formData.reasonOther : formData.reason;
  const displayLocation = formData.location === 'Others' ? formData.locationOther : formData.location;
  const pageSize = 26;
  const totalPages = Math.ceil(cadets.length / pageSize);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const templateValues: Record<string, string> = {
    LetterDate: formatDate(formData.letterDate),
    Reason: displayReason,
    Location: displayLocation,
    FromDate: formatDate(formData.fromDate),
    ToDate: formatDate(formData.toDate),
    CadetCount: `${cadets.length}`,
    DateClause: buildDateClause(formatDate(formData.fromDate), formatDate(formData.toDate)),
  };

  const renderedLetter = applySingleDayGrammar(
    renderTemplate(template.content, templateValues),
    templateValues.FromDate,
    templateValues.ToDate,
  );

  return (
    <Modal show={show} onHide={onHide} size="xl" fullscreen="lg-down" className="od-preview-modal">
      <Modal.Header closeButton>
        <Modal.Title>On-Duty Letter Preview</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ background: '#efefef', overflowX: 'hidden' }}>
        <style>{`
          @media print {
            .od-preview-modal .modal-header,
            .od-preview-modal .modal-footer { display: none !important; }
            .od-page { page-break-after: always; }
            .od-page:last-child { page-break-after: auto; }
            body, html { overflow: visible !important; }
          }
        `}</style>

        <div id="print-content" style={{ overflowX: 'hidden' }}>
          <div className="od-page" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto 12px auto', background: '#fff', padding: '16mm 14mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #222', paddingBottom: '10px' }}>
              {template.logoUrl ? (
                <img src={template.logoUrl} alt="College Logo" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '52px', height: '52px', border: '1px solid #555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>LOGO</div>
              )}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '16px' }}>THIAGARAJAR COLLEGE OF ENGINEERING</div>
                <div style={{ fontSize: '12px' }}>Madurai - 625015</div>
                <div style={{ fontSize: '12px' }}>NCC Army Wing</div>
              </div>
              <div style={{ minWidth: '130px', textAlign: 'right', fontSize: '12px', alignSelf: 'flex-start' }}>
                Date: {formatDate(formData.letterDate)}
              </div>
            </div>

            <div style={{ marginTop: '14px', fontFamily: 'Times New Roman, serif', fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {renderedLetter}
            </div>

            <div style={{ marginTop: 'auto', textAlign: 'right', paddingTop: '28px', fontSize: '13px' }}>
              <div>COY COMMANDER</div>
            </div>
          </div>

          {Array.from({ length: totalPages }).map((_, pageIndex) => {
            const start = pageIndex * pageSize;
            const rows = cadets.slice(start, start + pageSize);
            return (
              <div key={pageIndex} className="od-page" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto 12px auto', background: '#fff', padding: '14mm 12mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                <div style={{ textAlign: 'center', fontWeight: 700, marginBottom: '8px', fontSize: '14px' }}>ON-DUTY CADET LIST</div>
                <div style={{ textAlign: 'center', fontSize: '11px', marginBottom: '10px' }}>
                  Page {pageIndex + 1} of {totalPages}
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #111', padding: '6px', width: '8%' }}>S.NO</th>
                      <th style={{ border: '1px solid #111', padding: '6px', width: '10%' }}>YEAR</th>
                      <th style={{ border: '1px solid #111', padding: '6px', width: '30%' }}>REG. NO.</th>
                      <th style={{ border: '1px solid #111', padding: '6px', width: '32%' }}>NAME OF THE CADET</th>
                      <th style={{ border: '1px solid #111', padding: '6px', width: '20%' }}>HOSTELLER / DAY SCHOLAR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((cadet, idx) => (
                      <tr key={cadet.uid}>
                        <td style={{ border: '1px solid #333', padding: '6px', textAlign: 'center' }}>{start + idx + 1}</td>
                        <td style={{ border: '1px solid #333', padding: '6px', textAlign: 'center' }}>{formatAcademicYear(cadet.year || cadet.nccYear)}</td>
                        <td style={{ border: '1px solid #333', padding: '6px', textAlign: 'center' }}>{cadet.registerNumber || '-'}</td>
                        <td style={{ border: '1px solid #333', padding: '6px' }}>{cadet.name || '-'}</td>
                        <td style={{ border: '1px solid #333', padding: '6px', textAlign: 'center' }}>{(cadet.residentialStatus || '-').toUpperCase()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: 'auto', textAlign: 'right', paddingTop: '28px', fontSize: '13px' }}>
                  <div>COY COMMANDER</div>
                </div>
              </div>
            );
          })}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
        <Button variant="primary" onClick={() => window.print()}>
          <i className="bi bi-printer me-2" />Print / Save PDF
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default OnDutyLetterReport;
