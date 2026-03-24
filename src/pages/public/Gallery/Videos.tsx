import React from 'react';
import { Container, Ratio } from 'react-bootstrap';

const Videos: React.FC = () => (
  <Container className="py-5">
    <h1 className="mb-4">Videos</h1>
    <div className="d-grid gap-4">
      <Ratio aspectRatio="16x9">
        <iframe
          src="https://www.youtube.com/embed/dQw4w9WgXcQ"
          title="NCC Parade"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </Ratio>
      <Ratio aspectRatio="16x9">
        <iframe
          src="https://www.youtube.com/embed/ysz5S6PUM-U"
          title="NCC Camp Highlights"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </Ratio>
    </div>
  </Container>
);

export default Videos;
