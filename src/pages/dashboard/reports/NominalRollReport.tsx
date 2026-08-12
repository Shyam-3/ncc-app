import React, { useState, useEffect, type ChangeEvent } from 'react';
import { Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { NccYear } from '@/shared/config/constants';
import { NCC_YEARS, ROMAN_YEAR_MAP } from '@/shared/config/constants';
import {
  generateNominalRollExcel,
  getNominalRollPreview,
  type NominalRollPreview,
} from '@/features/reports/nominalRollService';

/** Generate a list of academic year options like "2023-2024", "2024-2025", … */
function buildAcademicYearOptions(): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const options: string[] = [];
  // Show from 3 years ago to 2 years ahead
  for (let y = currentYear - 1; y <= currentYear + 5; y++) {
    options.push(`${y}-${y + 1}`);
  }
  return options;
}

const ACADEMIC_YEAR_OPTIONS = buildAcademicYearOptions();

/** Pick a sensible default: if month >= June → current-next, else prev-current. */
function getDefaultAcademicYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed
  if (m >= 5) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

const NominalRollReport: React.FC = () => {
  const [nccYear, setNccYear] = useState<NccYear>('1st Year');
  const [academicYear, setAcademicYear] = useState<string>(getDefaultAcademicYear());
  const [preview, setPreview] = useState<NominalRollPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      setLoadingPreview(true);
      try {
        const data = await getNominalRollPreview(nccYear);
        if (!cancelled) setPreview(data);
      } catch (e: any) {
        console.error(e);
        if (!cancelled) toast.error('Failed to load preview');
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    }

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [nccYear]);

  async function handleGenerate() {
    if (!nccYear || !academicYear) return;

    try {
      setGenerating(true);
      await generateNominalRollExcel(nccYear, academicYear);
      toast.success('Nominal Roll Excel downloaded!');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  }

  const romanYear = ROMAN_YEAR_MAP[nccYear.replace(' Year', '')] || nccYear;
  const totalCadets = (preview?.sdCadetCount || 0) + (preview?.swCadetCount || 0);

  return (
    <Container className="py-4">
      <div className="d-flex align-items-center gap-2 mb-1">
        <Link to="/admin/reports" className="text-decoration-none">
          <i className="bi bi-arrow-left fs-5"></i>
        </Link>
        <h2 className="mb-0">Nominal Roll</h2>
      </div>
      <p className="text-muted mb-4">
        Generate the Unit Nominal Roll for an NCC year in Excel format.
      </p>

      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3 mb-3">
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">NCC Year</Form.Label>
                <Form.Select
                  value={nccYear}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setNccYear(e.target.value as NccYear)
                  }
                >
                  {NCC_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">Academic Year</Form.Label>
                <Form.Select
                  value={academicYear}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setAcademicYear(e.target.value)
                  }
                >
                  {ACADEMIC_YEAR_OPTIONS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {loadingPreview && (
            <div className="text-center py-4">
              <Spinner as="span" animation="border" size="sm" className="me-2"  />
              Loading data...
            </div>
          )}

          {!loadingPreview && preview && (
            <Card className="mb-3 bg-light">
              <Card.Body>
                <h6 className="text-muted mb-3">
                  <i className="bi bi-bar-chart-line me-2"></i>
                  Preview — {romanYear} Year ({academicYear})
                </h6>
                <Row className="g-3 text-center">
                  <Col xs={4}>
                    <div className="fs-3 fw-bold text-primary">{preview.sdCadetCount}</div>
                    <div className="small text-muted">SD Cadets</div>
                  </Col>
                  <Col xs={4}>
                    <div className="fs-3 fw-bold text-warning">{preview.swCadetCount}</div>
                    <div className="small text-muted">SW Cadets</div>
                  </Col>
                  <Col xs={4}>
                    <div className="fs-3 fw-bold text-success">{totalCadets}</div>
                    <div className="small text-muted">Total</div>
                  </Col>
                </Row>

                {totalCadets === 0 && (
                  <div className="text-center text-muted mt-3">
                    <i className="bi bi-info-circle me-1"></i>
                    No cadets found for {nccYear}.
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-100"
            disabled={generating || loadingPreview || totalCadets === 0}
            onClick={handleGenerate}
          >
            {generating ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2"  />
                Generating...
              </>
            ) : (
              <>
                <i className="bi bi-file-earmark-spreadsheet me-2"></i>
                Generate & Download Excel
              </>
            )}
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default NominalRollReport;
