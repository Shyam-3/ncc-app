import React from 'react';
import { Col, Container, Row } from 'react-bootstrap';

// Simple responsive grid with lazy loading; replace with dynamic data later
const sampleImages = Array.from({ length: 12 }).map((_, i) => `https://picsum.photos/seed/ncc-${i}/600/400`);

const Photos: React.FC = () => (
  <Container className="py-5">
    <h1 className="mb-4">Photo Gallery</h1>
    <Row className="g-3">
      {sampleImages.map((src, idx) => (
        <Col key={idx} xs={12} sm={6} md={4} lg={4} xl={3}>
          <img src={src} alt={`NCC ${idx + 1}`} className="img-fluid rounded shadow-sm" loading="lazy" />
        </Col>
      ))}
    </Row>
  </Container>
);

export default Photos;
