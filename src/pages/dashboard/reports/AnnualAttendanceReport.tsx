import React, { useState, useEffect, type ChangeEvent } from 'react';
import { Button, Card, Col, Container, Form, Row, Spinner, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { NccYear } from '@/shared/config/constants';
import { NCC_YEARS, ROMAN_YEAR_MAP } from '@/shared/config/constants';
import { formatISTDate } from '@/shared/utils/dateTime';
import {
  generateAnnualAttendanceExcel,
  getAnnualReportPreview,
  type AnnualReportPreview,
} from '@/features/reports/annualReportService';
import './AnnualAttendanceReport.css';

const AnnualAttendanceReport: React.FC = () => {
  const [nccYear, setNccYear] = useState<NccYear>('1st Year');
  const [officialOnly, setOfficialOnly] = useState(false);
  const [preview, setPreview] = useState<AnnualReportPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Load preview whenever NCC year changes
  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      setLoadingPreview(true);
      try {
        const data = await getAnnualReportPreview(nccYear, officialOnly);
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
  }, [nccYear, officialOnly]);

  async function handleGenerate() {
    if (!nccYear) return;

    try {
      setGenerating(true);
      await generateAnnualAttendanceExcel(nccYear, officialOnly);
      toast.success('Excel report downloaded!');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  }

  const romanYear = ROMAN_YEAR_MAP[nccYear.replace(' Year', '')] || nccYear;

  return (
    <Container className="py-4 annual-report-container">
      <div className="d-flex align-items-center gap-2 mb-1">
        <Link to="/admin/reports" className="text-decoration-none">
          <i className="bi bi-arrow-left fs-5"></i>
        </Link>
        <h2 className="mb-0">Annual Attendance Report</h2>
      </div>
      <p className="text-muted mb-4">
        Generate the overall attendance sheet for an NCC year in Excel format.
      </p>

      <Card className="mb-4">
        <Card.Body>
          <Form.Group className="mb-3">
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

          <Form.Check
            type="checkbox"
            id="official-parade-only-check"
            label="Official Parade Only"
            checked={officialOnly}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setOfficialOnly(e.target.checked)}
            className="mb-3"
          />

          {loadingPreview && (
            <div className="text-center py-4">
              <Spinner as="span" animation="border" size="sm" className="me-2"  />
              Loading data...
            </div>
          )}

          {!loadingPreview && preview && (
            <Card className="preview-card mb-3">
              <Card.Body>
                <h6 className="text-muted mb-3">
                  <i className="bi bi-bar-chart-line me-2"></i>
                  Report Preview — {romanYear} Year
                </h6>
                <Row className="g-3 text-center">
                  <Col xs={6} md={3}>
                    <div className="stat-value">{preview.sessionCount}</div>
                    <div className="stat-label">Sessions</div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="stat-value">{preview.totalParades}</div>
                    <div className="stat-label">Total Parades</div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="stat-value">{preview.sdCadetCount}</div>
                    <div className="stat-label">SD Cadets</div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="stat-value">{preview.swCadetCount}</div>
                    <div className="stat-label">SW Cadets</div>
                  </Col>
                </Row>

                {preview.dateRange && (
                  <div className="text-center mt-3">
                    <Badge bg="light" text="dark" className="date-range-badge">
                      <i className="bi bi-calendar3 me-1"></i>
                      {formatISTDate(preview.dateRange.first)} — {formatISTDate(preview.dateRange.last)}
                    </Badge>
                  </div>
                )}

                {preview.sessionCount === 0 && (
                  <div className="text-center text-muted mt-3">
                    <i className="bi bi-info-circle me-1"></i>
                    No sessions found for {nccYear}. Create attendance sessions first.
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          <Button
            variant="success"
            size="lg"
            className="w-100"
            disabled={generating || loadingPreview || (preview?.sessionCount === 0)}
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

export default AnnualAttendanceReport;
