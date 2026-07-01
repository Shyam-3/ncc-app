import React from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => (
  <Container className="py-5 text-center">
    <h1 className="display-4">404</h1>
    <p className="lead">Sorry, the page you're looking for doesn't exist.</p>
    <Link to="/">Go back home</Link>
  </Container>
);

export default NotFound;
