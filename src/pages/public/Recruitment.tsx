import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Container, Row, Spinner } from 'react-bootstrap';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/shared/config/firebase';
import { getActiveRecruitmentAnnouncements } from '@/features/announcements/service';
import type { Announcement } from '@/features/announcements/announcement.types';
import { formatISTDate } from '@/shared/utils/dateTime';
import { AnimatedSection } from '../../components';

interface RecruitmentSettings {
  sdFormUrl: string;
  swFormUrl: string;
}

const Recruitment: React.FC = () => {
  const [settings, setSettings] = useState<RecruitmentSettings | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsSnap, announcements] = await Promise.all([
          getDoc(doc(db, 'settings', 'recruitment')),
          getActiveRecruitmentAnnouncements(),
        ]);

        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data() as RecruitmentSettings);
        }

        if (announcements.length > 0) {
          setAnnouncement(announcements[0]);
        }
      } catch (err) {
        console.error('Failed to load recruitment data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner as="span" animation="border" variant="primary"  size="sm" />
        <p className="mt-3 text-muted">Loading recruitment details…</p>
      </Container>
    );
  }

  if (!announcement) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <i className="bi bi-info-circle text-muted" style={{ fontSize: '3rem' }} />
          <h3 className="mt-3">No Active Recruitment</h3>
          <p className="text-muted">
            There are no open recruitment drives at the moment. Please check back later or contact the NCC office for details.
          </p>
        </div>
      </Container>
    );
  }

  return (
    <div>
      {/* Header Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0a1628 0%, #0d2b5e 50%, #14396d 100%)',
          color: '#fff',
          padding: '3.5rem 0 3rem',
        }}
      >
        <Container className="text-center">
          <AnimatedSection effect="fade" delay={0.05}>
            <h1 className="fw-bold mb-3">
              📢 {announcement.title}
            </h1>
            <p
              className="lead mx-auto mb-3"
              style={{ maxWidth: 700, opacity: 0.9 }}
            >
              {announcement.body}
            </p>
            {announcement.expiresAt && (
              <p className="mb-0" style={{ opacity: 0.7 }}>
                <i className="bi bi-clock me-1" />
                Applications close on <br />
                {formatISTDate(announcement.expiresAt, {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            )}
          </AnimatedSection>
        </Container>
      </div>

      {/* Division Cards */}
      <Container className="py-5">
        <AnimatedSection effect="fade" delay={0.1}>
          <h2 className="text-center mb-2 fw-bold">Choose Your Division</h2>
          <p className="text-center text-muted mb-5">
            Select your division to access the application form
          </p>
        </AnimatedSection>

        <Row className="g-4 justify-content-center">
          {/* SD Card */}
          <Col xs={12} sm={10} md={6} lg={5}>
            <AnimatedSection effect="slide" delay={0.15}>
              <Card className="h-100 border-0 shadow text-center" style={{ borderRadius: '1rem' }}>
                <Card.Body className="p-4 p-md-5 d-flex flex-column align-items-center">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center mb-4"
                    style={{
                      width: 80,
                      height: 80,
                      background: 'linear-gradient(135deg, #0d6efd, #0a58ca)',
                      color: '#fff',
                      fontSize: '2rem',
                    }}
                  >
                    <i className="bi bi-shield-fill" />
                  </div>
                  <h3 className="fw-bold mb-2">Senior Division (SD)</h3>
                  <p className="text-muted mb-1">For male cadets</p>
                  <p className="text-muted small mb-4">
                    Army Wing — Senior Division training programme for male students enrolled in colleges/universities.
                  </p>
                  {settings?.sdFormUrl ? (
                    <Button
                      href={settings.sdFormUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="primary"
                      size="lg"
                      className="px-5 mt-auto"
                      style={{ borderRadius: '50px' }}
                    >
                      Apply Now <i className="bi bi-arrow-right ms-1" />
                    </Button>
                  ) : (
                    <Alert variant="info" className="mt-auto mb-0 w-100 text-center">
                      <i className="bi bi-info-circle me-1" />
                      Recruitment form not available yet. Contact the NCC office.
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </AnimatedSection>
          </Col>

          {/* SW Card */}
          <Col xs={12} sm={10} md={6} lg={5}>
            <AnimatedSection effect="slide" delay={0.2}>
              <Card className="h-100 border-0 shadow text-center" style={{ borderRadius: '1rem' }}>
                <Card.Body className="p-4 p-md-5 d-flex flex-column align-items-center">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center mb-4"
                    style={{
                      width: 80,
                      height: 80,
                      background: 'linear-gradient(135deg, #d63384, #ab296a)',
                      color: '#fff',
                      fontSize: '2rem',
                    }}
                  >
                    <i className="bi bi-shield-fill-check" />
                  </div>
                  <h3 className="fw-bold mb-2">Senior Wing (SW)</h3>
                  <p className="text-muted mb-1">For female cadets</p>
                  <p className="text-muted small mb-4">
                    Army Wing — Senior Wing training programme for female students enrolled in colleges/universities.
                  </p>
                  {settings?.swFormUrl ? (
                    <Button
                      href={settings.swFormUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="primary"
                      size="lg"
                      className="px-5 mt-auto"
                      style={{ borderRadius: '50px' }}
                    >
                      Apply Now <i className="bi bi-arrow-right ms-1" />
                    </Button>
                  ) : (
                    <Alert variant="info" className="mt-auto mb-0 w-100 text-center">
                      <i className="bi bi-info-circle me-1" />
                      Recruitment form not available yet. Contact the NCC office.
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </AnimatedSection>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Recruitment;
