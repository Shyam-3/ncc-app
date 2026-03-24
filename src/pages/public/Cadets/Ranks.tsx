import React from 'react';
import { Container } from 'react-bootstrap';

const Ranks: React.FC = () => (
  <Container className="py-5">
    <h1 className="mb-4">Ranks & Hierarchy</h1>
    <ul>
      <li>Senior Under Officer (SUO)</li>
      <li>Under Officer (UO)</li>
      <li>Company Sergeant Major (CSM)</li>
      <li>Company Quartermaster Sergeant (CQMS)</li>
      <li>Sergeant / Corporal / Lance Corporal / Cadet</li>
    </ul>
  </Container>
);

export default Ranks;
