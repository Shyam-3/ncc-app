import React from 'react';
import { Col, Container, Row } from 'react-bootstrap';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark text-light py-4 mt-5">
      <Container>
        <Row>
          <Col xs={12} className="mb-3">
            <h5>
              <i className="bi bi-shield-fill me-2"></i>
              NCC Army Wing
            </h5>
            <p className="text-white-50 mb-0">
              Unity and Discipline
            </p>
          </Col>
        </Row>
        <Row>
          <Col xs={6} sm={6} md={4}>
            <h6>Quick Links</h6>
            <ul className="list-unstyled">
              <li><a href="/" className="text-light text-decoration-none">Home</a></li>
              <li><a href="/about" className="text-light text-decoration-none">About Us</a></li>
              <li><a href="/events/national-days" className="text-light text-decoration-none">Events</a></li>
              <li><a href="/gallery/photos" className="text-light text-decoration-none">Gallery</a></li>
            </ul>
          </Col>
          <Col xs={6} sm={6} md={4}>
            <h6>Contact Info</h6>
            <p className="text-light mb-1">
              <i className="bi bi-geo-alt me-2"></i>
              College Campus
            </p>
            <p className="text-light mb-1">
              <i className="bi bi-envelope me-2"></i>
              ncc@tce.edu
            </p>
            <p className="text-light">
              <i className="bi bi-phone me-2"></i>
              +91 XXXXX XXXXX
            </p>
          </Col>
        </Row>
        <hr className="border-light opacity-25" />
        <Row>
          <Col className="text-center text-white-50">
            <small>
              &copy; {currentYear} NCC Army Wing. All rights reserved.
            </small>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
