import React from 'react';
import { Container, Table } from 'react-bootstrap';

const CadetList: React.FC = () => (
  <Container className="py-5">
    <h1 className="mb-4">Cadet List</h1>
    <Table striped bordered hover responsive>
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Reg No</th>
          <th>Platoon</th>
          <th>Year</th>
        </tr>
      </thead>
      <tbody>
        {[1,2,3,4,5].map(i => (
          <tr key={i}>
            <td>{i}</td>
            <td>Cadet {i}</td>
            <td>2024{i.toString().padStart(3,'0')}</td>
            <td>{['Alpha','Bravo','Charlie'][i%3]}</td>
            <td>{["1st","2nd","3rd"][i%3]} Year</td>
          </tr>
        ))}
      </tbody>
    </Table>
  </Container>
);

export default CadetList;
