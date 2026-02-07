import React from 'react';
import { Card, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Alumni: React.FC = () => (
  <Container className="py-5">
    <h1 className="mb-4">Alumni Stories</h1>
    <p className="lead">Celebrating the achievements of our former cadets.</p>
    <div className="d-grid gap-3 mb-4">
      {[1,2,3].map(i => (
        <Card key={i} className="shadow-sm">
          <Card.Body>
            <Card.Title>Alumnus {i}</Card.Title>
            <Card.Text>
              Now serving in leadership and continuing the NCC values of Unity and Discipline.
            </Card.Text>
          </Card.Body>
        </Card>
      ))}
    </div>
    <div className="p-4 bg-light border rounded">
      <h5>Are you an alumnus?</h5>
      <p>Phase 2 will let you register and connect with current cadets.</p>
      <Link to="/register">Register your interest →</Link>
    </div>
  </Container>
);

export default Alumni;
