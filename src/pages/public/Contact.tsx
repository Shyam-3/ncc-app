import React from 'react';
import { Button, Col, Container, Form, Row } from 'react-bootstrap';

const Contact: React.FC = () => (
  <Container className="py-5">
    <h1 className="mb-4">Contact Us</h1>
    <Row className="g-4">
      <Col xs={12} sm={12} md={6} lg={6} xl={6}>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control placeholder="Your name" />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" placeholder="you@example.com" />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Message</Form.Label>
            <Form.Control as="textarea" rows={5} placeholder="How can we help?" />
          </Form.Group>
          <Button variant="primary">Send</Button>
        </Form>
      </Col>
      <Col xs={12} sm={12} md={6} lg={6} xl={6}>
        <div className="ratio ratio-16x9 rounded overflow-hidden shadow-sm">
          <iframe
            title="Map"
            src="https://maps.google.com/maps?q=india&t=&z=4&ie=UTF8&iwloc=&output=embed"
            loading="lazy"
          />
        </div>
        <p className="mt-3">Email: ncc@example.edu • Phone: +91-XXXXXXXXXX</p>
      </Col>
    </Row>
  </Container>
);

export default Contact;
