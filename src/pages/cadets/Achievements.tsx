import React from 'react';
import { Card, Container } from 'react-bootstrap';

const Achievements: React.FC = () => (
  <Container className="py-5">
    <h1 className="mb-4">Cadet Achievements</h1>
    <div className="d-grid gap-3">
      {[1,2,3].map(i => (
        <Card key={i} className="shadow-sm">
          <Card.Body>
            <Card.Title>Best Cadet Award {2020 + i}</Card.Title>
            <Card.Text>Recognizing outstanding performance in training and leadership.</Card.Text>
          </Card.Body>
        </Card>
      ))}
    </div>
  </Container>
);

export default Achievements;
