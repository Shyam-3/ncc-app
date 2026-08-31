import React from "react";
import { Col, Container, Row } from "react-bootstrap";
import { Link } from "react-router-dom";

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark text-light py-4 mt-5">
      <Container>
        <Row>
          <Col xs={12} className="mb-3">
            <h5>
              <i className="bi bi-shield-fill me-2"></i>
              TCE NCC Army
            </h5>
            <p className="text-white-50 mb-0">Unity and Discipline</p>
          </Col>
        </Row>
        <Row>
          <Col xs={12} sm={6} md={4}>
            <h6>Quick Links</h6>
            <ul className="list-unstyled">
              <li>
                <Link to="/" className="text-light text-decoration-none">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-light text-decoration-none">
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/events/national-days"
                  className="text-light text-decoration-none"
                >
                  Events
                </Link>
              </li>
              <li>
                <Link
                  to="/gallery/photos"
                  className="text-light text-decoration-none"
                >
                  Gallery
                </Link>
              </li>
            </ul>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <h6>Contact Info</h6>
            <p className="text-light mb-1">
              <i className="bi bi-geo-alt me-2"></i>
              TCE, Madurai
            </p>
            <p className="text-light mb-1">
              <i className="bi bi-envelope me-2"></i>
              <a
                href="mailto:tce.nccarmywing@gmail.com"
                className="text-light text-decoration-none text-break"
              >
                tce.nccarmywing@gmail.com
              </a>
            </p>
            <p className="text-light">
              <i className="bi bi-phone me-2"></i>
              <a
                href="tel:+91XXXXXXXXXX"
                className="text-light text-decoration-none"
              >
                +91 XXXXX XXXXX
              </a>
            </p>
          </Col>
        </Row>
        <hr className="border-light opacity-25" />
        <Row>
          <Col className="text-center text-white-50">
            <small>
              &copy; {currentYear} TCE NCC Army. All rights reserved.
            </small>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
