import React from 'react';
import { Container } from 'react-bootstrap';

const Ranks: React.FC = () => (
  <Container className="py-5">
    <h1 className="mb-4">Rank & Hierarchy</h1>
    <ul>
      <li>Senior Under Officer (SUO)</li>
      <li>Cadet Under Officer (CUO)</li>
      <li>Company Sergeant Major (CSM)</li>
      <li>Company Quartermaster Sergeant (CQMS)</li>
      <li>Sergeant (SGT)</li>
      <li>Corporal (CPL)</li>
      <li>Lance Corporal (LCPL)</li>
      <li>Cadet (CDT)</li>
    </ul>
  </Container>
);

export default Ranks;
