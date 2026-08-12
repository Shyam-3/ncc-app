import { useAuth } from '@/features/auth/AuthContext';
import { CmsDoc, listenCms } from '@/features/cms/service';
import { db } from '@/shared/config/firebase';
import { doc as firestoreDoc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Col, Container, Row, Spinner, Accordion } from 'react-bootstrap';
import ProfilePhoto from '@/components/ProfilePhoto';
import { Link } from 'react-router-dom';
import './About.css';

const About: React.FC = () => {
  const [doc, setDoc] = useState<CmsDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [anoProfiles, setAnoProfiles] = useState<any[]>([]);
  const { isSuperAdmin } = useAuth();

  useEffect(() => {
    const unsub = listenCms('about', async (data) => {
      setDoc(data);
      if (data?.anoUids && data.anoUids.length > 0) {
        try {
          const profiles = await Promise.all(
            data.anoUids.map((uid) => getDoc(firestoreDoc(db, 'users', uid)).then(snap => snap.exists() ? snap.data() : null))
          );
          setAnoProfiles(profiles.filter(p => p !== null));
        } catch (err) {
          console.error("Failed to fetch ANO profiles:", err);
        }
      } else {
        setAnoProfiles([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const getSectionBody = (heading: string) => {
    const section = doc?.sections?.find(s => s.heading.toLowerCase() === heading.toLowerCase());
    return section?.body || '';
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner as="span" animation="border"  size="sm" />
      </div>
    );
  }

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0 text-primary">About NCC</h2>
        </div>
        {isSuperAdmin() && (
          <Button as={Link} to="/admin/settings" variant="primary" size="sm">
            <i className="bi bi-pencil-square me-2" /> Edit Settings
          </Button>
        )}
      </div>

      <div className="mb-4">
        <Card className="border-0 shadow-sm">
          <Card.Body>
            <h4 className="mb-3 text-primary">About Our Unit</h4>
            <div className="mb-0 text-muted about-section-body">
              {getSectionBody('About Our Unit') || 'Information about our NCC unit will be displayed here.'}
            </div>
          </Card.Body>
        </Card>
      </div>

      <Accordion defaultActiveKey="0" className="shadow-sm">
        <Accordion.Item eventKey="0">
          <Accordion.Header className="fw-bold">ANO/CTO & Staff</Accordion.Header>
          <Accordion.Body>
            {anoProfiles.map((profile, idx) => (
              <Card key={idx} className="mb-4 border-light shadow-sm">
                <Card.Body>
                  <Row className="align-items-center">
                    <Col xs="auto">
                      <ProfilePhoto 
                        photoURL={profile.photoURL} 
                        size={64} 
                        editable={false} 
                      />
                    </Col>
                    <Col>
                      <h5 className="mb-1 fw-bold">{profile.name}</h5>
                      <Badge bg="secondary" className="mb-2">{profile.rank || 'ANO'}</Badge>
                      <div className="text-muted small d-flex flex-column gap-1">
                        <div><i className="bi bi-envelope me-2" />{profile.email}</div>
                        {profile.phone && <div><i className="bi bi-telephone me-2" />{profile.phone}</div>}
                        {profile.bloodGroup && <div><i className="bi bi-droplet-half me-2" />{profile.bloodGroup}</div>}
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            ))}

            <div className="mb-0 text-muted about-section-body">
              {getSectionBody('ANO/CTO & Staff') || 'Details about the ANO/CTO and staff members.'}
            </div>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="1">
          <Accordion.Header className="fw-bold">NCC Motto & Song</Accordion.Header>
          <Accordion.Body>
            <div className="mb-0 text-muted about-section-body">
              {getSectionBody('NCC Motto & Song') || 'Unity and Discipline. The NCC song details will be updated here.'}
            </div>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="2">
          <Accordion.Header className="fw-bold">Organizational Structure</Accordion.Header>
          <Accordion.Body>
            <div className="mb-0 text-muted about-section-body">
              {getSectionBody('Organizational Structure') || 'The organizational structure of our unit.'}
            </div>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </Container>
  );
};

export default About;

