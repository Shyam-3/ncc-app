import React from 'react';
import { Button, Card, Col, Container, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const ReportsWorkspace: React.FC = () => {
  return (
    <Container className="py-4">
      <h2 className="mb-1">Reports</h2>
      <p className="text-muted mb-3">Choose a reports task.</p>

      <Row className="g-3 mb-1">
        <Col xs={12} sm={6} md={4} lg={3} xl={3}>
          <Card className="text-center h-100 shadow-sm hover-lift">
            <Card.Body className="d-flex flex-column justify-content-between">
              <div>
                <i className="bi bi-file-earmark-text text-danger" style={{ fontSize: '48px' }}></i>
                <h3 className="mt-3">On-Duty</h3>
                <p className="text-muted small">Generate letters</p>
              </div>
              <Button as={Link} to="/admin/reports/generators/on-duty-letter" variant="danger" className="mt-2">
                Open
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} md={4} lg={3} xl={3}>
          <Card className="text-center h-100 shadow-sm hover-lift">
            <Card.Body className="d-flex flex-column justify-content-between">
              <div>
                <i className="bi bi-journal-text text-secondary" style={{ fontSize: '48px' }}></i>
                <h3 className="mt-3">Templates</h3>
                <p className="text-muted small">Manage report templates</p>
              </div>
              <Button as={Link} to="/admin/reports/templates" variant="secondary" className="mt-2">
                Open
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ReportsWorkspace;
