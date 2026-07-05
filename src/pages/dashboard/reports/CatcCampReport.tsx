import { NCC_YEARS, ROMAN_YEAR_MAP } from '@/shared/config/constants';
import { db } from '@/shared/config/firebase';
import { toISTDateInputValue } from '@/shared/utils/dateTime';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Card, Col, Container, Form, ProgressBar, Row, Spinner, Table } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { TablePaginationFooter } from '@/components';
import {
  generateCatcZip,
  DEFAULT_CAMP_LOCATION,
  type CatcCadet,
  type CatcFormData,
} from '@/features/reports/catcDocService';
import { getCatcCampTemplate } from '@/features/reports/templateService';
import './CatcCampReport.css';
import { isCadetUser } from '@/shared/utils/userType';

/* ──────────── Helpers ──────────── */

const formatYearForSort = (value?: string) => {
  if (!value) return 99;
  const lower = value.toLowerCase();
  if (lower.includes('1') || lower.includes('i ')) return 1;
  if (lower.includes('2') || lower.includes('ii')) return 2;
  if (lower.includes('3') || lower.includes('iii')) return 3;
  if (lower.includes('4') || lower.includes('iv')) return 4;
  if (lower.includes('5') || lower.includes('v')) return 5;
  return 99;
};

const formatAcademicYear = (value?: string) => {
  if (!value) return '-';
  const cleaned = value.replace(' Year', '').trim();
  return ROMAN_YEAR_MAP[cleaned] || cleaned;
};

/* ──────────── Component ──────────── */

const CAMP_LOCATIONS = [DEFAULT_CAMP_LOCATION, 'Others'];

const CatcCampReport: React.FC = () => {
  const navigate = useNavigate();
  const initialized = useRef(false);

  /* ---- State ---- */
  const [users, setUsers] = useState<CatcCadet[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [selectedCadets, setSelectedCadets] = useState<Set<string>>(new Set());

  // Filters
  const [divisionFilter, setDivisionFilter] = useState<'ALL' | 'SD' | 'SW'>('ALL');
  const [nccYearFilter, setNccYearFilter] = useState<'ALL' | string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Form
  const [formData, setFormData] = useState<CatcFormData>({
    fromDate: toISTDateInputValue(),
    toDate: toISTDateInputValue(),
    campLocation: DEFAULT_CAMP_LOCATION,
    campLocationOther: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  /* ---- Data fetching ---- */
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void fetchCadets();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [divisionFilter, nccYearFilter, searchTerm, rowsPerPage]);

  const fetchCadets = async () => {
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const cadetUsers = snapshot.docs
        .map((d) => ({ uid: d.id, ...(d.data() as Record<string, unknown>) }))
        .filter((u) => isCadetUser(u as { userType?: string })) as CatcCadet[];
      setUsers(cadetUsers);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load cadets');
    } finally {
      setLoading(false);
    }
  };

  /* ---- Filtering ---- */
  const filteredCadets = useMemo(() => {
    let list = [...users];

    if (divisionFilter !== 'ALL') list = list.filter((u) => (u.division || '') === divisionFilter);
    if (nccYearFilter !== 'ALL') list = list.filter((u) => (u.nccYear || u.year || '') === nccYearFilter);

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (u) =>
          (u.name || '').toLowerCase().includes(term) ||
          (u.registerNumber || '').toLowerCase().includes(term),
      );
    }

    return list.sort((a, b) => {
      const yearDelta = formatYearForSort(a.nccYear || a.year) - formatYearForSort(b.nccYear || b.year);
      if (yearDelta !== 0) return yearDelta;
      return (a.registerNumber || '').localeCompare(b.registerNumber || '', undefined, { numeric: true });
    });
  }, [users, divisionFilter, nccYearFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredCadets.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredCadets.length);
  const paginatedCadets = filteredCadets.slice(startIndex, endIndex);

  const clearFilters = () => {
    setDivisionFilter('ALL');
    setNccYearFilter('ALL');
    setSearchTerm('');
  };

  /* ---- Selection ---- */
  const toggleCadetSelection = (uid: string) => {
    setSelectedCadets((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedCadets((prev) => {
      const next = new Set(prev);
      const allSelected = filteredCadets.length > 0 && filteredCadets.every((c) => next.has(c.uid));
      if (allSelected) {
        filteredCadets.forEach((c) => next.delete(c.uid));
      } else {
        filteredCadets.forEach((c) => next.add(c.uid));
      }
      return next;
    });
  };

  /* ---- Form handling ---- */
  const handleFormChange = (field: keyof CatcFormData, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      setFormErrors((prevErrors) => {
        const nextErrors = { ...prevErrors };
        delete nextErrors[field];

        if (field === 'fromDate' || field === 'toDate') {
          const from = new Date(next.fromDate).getTime();
          const to = new Date(next.toDate).getTime();
          if (!isNaN(from) && !isNaN(to) && to < from) {
            nextErrors.toDate = 'To date cannot be earlier than from date.';
          } else {
            delete nextErrors.toDate;
          }
        }

        return nextErrors;
      });
      return next;
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.fromDate) errors.fromDate = 'From date is required';
    if (!formData.toDate) errors.toDate = 'To date is required';
    if (!formData.campLocation) errors.campLocation = 'Camp location is required';
    if (formData.campLocation === 'Others' && !formData.campLocationOther.trim()) {
      errors.campLocationOther = 'Please enter camp location';
    }
    if (formData.fromDate && formData.toDate) {
      const from = new Date(formData.fromDate).getTime();
      const to = new Date(formData.toDate).getTime();
      if (!isNaN(from) && !isNaN(to) && to < from) {
        errors.toDate = 'To date cannot be earlier than from date.';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ---- Generate ---- */
  const handleGenerate = async () => {
    if (!validateForm()) {
      toast.error('Please fill all required fields');
      return;
    }
    if (selectedCadets.size === 0) {
      toast.error('Select at least one cadet');
      return;
    }

    const selectedList = users.filter((u) => selectedCadets.has(u.uid));
    if (selectedList.length === 0) {
      toast.error('No cadets found for the selection');
      return;
    }

    setGenerating(true);
    setProgress({ current: 0, total: selectedList.length });

    try {
      const template = await getCatcCampTemplate();
      await generateCatcZip(selectedList, formData, (current, total) => {
        setProgress({ current, total });
      }, template);
      toast.success(`${selectedList.length} CATC camp document(s) generated and downloaded!`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate documents');
    } finally {
      setGenerating(false);
    }
  };

  /* ---- Render ---- */
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
      {/* Header */}
      <Row className="mb-3">
        <Col>
          <h2 className="mb-1">CATC Camp Document Generator</h2>
          <p className="text-muted mb-0">
            Generate individual CATC camp PDF documents per selected cadet, bundled as a single ZIP download.
          </p>
        </Col>
      </Row>

      <Row className="g-3">
        {/* ──── Camp Details Form ──── */}
        <Col lg={12}>
          <Card className="shadow-sm">
            <Card.Header className="bg-info text-white d-flex justify-content-between align-items-center">
              <span>Camp Details</span>
              <Button variant="light" size="sm" onClick={() => navigate(-1)}>
                <i className="bi bi-arrow-left me-1" /> Back
              </Button>
            </Card.Header>
            <Card.Body>
              <Form>
                <Row className="g-3">
                  <Col xs={12} md={4}>
                    <Form.Group controlId="catcFromDate">
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

                  <Col xs={12} md={4}>
                    <Form.Group controlId="catcToDate">
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

                  <Col xs={12} md={4}>
                    <Form.Group controlId="catcCampLocation">
                      <Form.Label>Camp Location *</Form.Label>
                      <Form.Select
                        value={formData.campLocation}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFormChange('campLocation', e.target.value)}
                        isInvalid={Boolean(formErrors.campLocation)}
                      >
                        {CAMP_LOCATIONS.map((loc) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </Form.Select>
                      {formErrors.campLocation && <Form.Text className="text-danger d-block">{formErrors.campLocation}</Form.Text>}
                    </Form.Group>
                  </Col>

                  {formData.campLocation === 'Others' && (
                    <Col xs={12}>
                      <Form.Group controlId="catcCampLocationOther">
                        <Form.Label>Custom Camp Location *</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.campLocationOther}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange('campLocationOther', e.target.value)}
                          placeholder="Enter camp location"
                          isInvalid={Boolean(formErrors.campLocationOther)}
                        />
                        {formErrors.campLocationOther && (
                          <Form.Text className="text-danger d-block">{formErrors.campLocationOther}</Form.Text>
                        )}
                      </Form.Group>
                    </Col>
                  )}
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* ──── Cadet Selection ──── */}
        <Col lg={12}>
          <Card className="shadow-sm">
            <Card.Header className="bg-info text-white">Cadet Selection</Card.Header>
            <Card.Body>
              {/* Filters */}
              <Row className="g-2 mb-3">
                <Col xs={12} sm={6} md={3}>
                  <Form.Select
                    size="sm"
                    value={divisionFilter}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDivisionFilter(e.target.value as 'ALL' | 'SD' | 'SW')}
                  >
                    <option value="ALL">All Divisions</option>
                    <option value="SD">SD</option>
                    <option value="SW">SW</option>
                  </Form.Select>
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <Form.Select
                    size="sm"
                    value={nccYearFilter}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNccYearFilter(e.target.value)}
                  >
                    <option value="ALL">All NCC Years</option>
                    {NCC_YEARS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <Form.Control
                    size="sm"
                    type="text"
                    placeholder="Search by name or register number"
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  />
                </Col>
              </Row>

              <div className="d-flex justify-content-end mb-3">
                <Button variant="outline-secondary" size="sm" onClick={clearFilters}>
                  <i className="bi bi-x-circle me-1"></i>
                  Clear Filters
                </Button>
              </div>

              {/* Cadet table */}
              <div className="table-responsive catc-cadet-table-wrap">
                <Table striped hover size="sm" className="mb-0">
                  <thead className="catc-cadet-table-head">
                    <tr>
                      <th className="catc-select-col">
                        <Form.Check
                          type="checkbox"
                          checked={filteredCadets.length > 0 && filteredCadets.every((c) => selectedCadets.has(c.uid))}
                          onChange={toggleSelectAllFiltered}
                          aria-label="Select all filtered cadets"
                        />
                      </th>
                      <th>S.No</th>
                      <th>NCC Year</th>
                      <th>Name</th>
                      <th>Regimental No</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCadets.map((cadet, index) => (
                      <tr key={cadet.uid}>
                        <td>
                          <Form.Check
                            type="checkbox"
                            checked={selectedCadets.has(cadet.uid)}
                            onChange={() => toggleCadetSelection(cadet.uid)}
                            aria-label={`Select ${cadet.name || cadet.uid}`}
                          />
                        </td>
                        <td>{startIndex + index + 1}</td>
                        <td>
                          <Badge bg="secondary">{formatAcademicYear(cadet.nccYear || cadet.year)}</Badge>
                        </td>
                        <td>{cadet.name || '-'}</td>
                        <td>{cadet.regimentalNumber || '-'}</td>
                      </tr>
                    ))}
                    {filteredCadets.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-muted py-3">
                          No cadets found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
              <TablePaginationFooter
                totalItems={filteredCadets.length}
                currentPage={safePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={setRowsPerPage}
                onFirstPage={() => setCurrentPage(1)}
                onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
                onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                onLastPage={() => setCurrentPage(totalPages)}
              />
            </Card.Body>
            <Card.Footer className="d-flex justify-content-between align-items-center">
              <small className="text-muted">
                Selected: {selectedCadets.size} / {filteredCadets.length}
              </small>
              <Button
                variant="info"
                onClick={handleGenerate}
                disabled={selectedCadets.size === 0 || generating}
              >
                {generating ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-file-earmark-zip me-1" />
                    Generate & Download ZIP
                  </>
                )}
              </Button>
            </Card.Footer>
          </Card>
        </Col>
      </Row>

      {/* ──── Generating Progress Overlay ──── */}
      {generating && (
        <div className="catc-progress-overlay">
          <div className="catc-progress-card">
            <Spinner animation="border" variant="info" className="mb-3" />
            <h5>Generating CATC Documents</h5>
            <p className="text-muted mb-2">
              Processing {progress.current} of {progress.total} cadet{progress.total !== 1 ? 's' : ''}...
            </p>
            <ProgressBar
              now={progress.total > 0 ? (progress.current / progress.total) * 100 : 0}
              variant="info"
              animated
              className="mb-2"
            />
            <small className="text-muted">Please wait, do not close this page.</small>
          </div>
        </div>
      )}
    </Container>
  );
};

export default CatcCampReport;
