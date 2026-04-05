import { type ChangeEvent } from 'react';
import { Form, Row, Col } from 'react-bootstrap';
import { DIVISIONS, DIVISION_LABELS, NCC_YEARS } from '@/shared/config/constants';
import type { Division, NccYear } from '@/shared/config/constants';

interface BatchSelectorProps {
  divisionId: Division | '';
  nccYear: NccYear | '';
  onDivisionChange: (division: Division | '') => void;
  onYearChange: (year: NccYear | '') => void;
  disabled?: boolean;
  required?: boolean;
}

export function BatchSelector({
  divisionId,
  nccYear,
  onDivisionChange,
  onYearChange,
  disabled = false,
  required = false,
}: BatchSelectorProps) {
  if (required) {
    return (
      <Row className="g-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>
              Division
            </Form.Label>
            <div className="d-flex flex-wrap gap-3">
              {DIVISIONS.map((div) => (
                <Form.Check
                  key={div}
                  type="radio"
                  id={`division-${div}`}
                  name="division"
                  label={div}
                  value={div}
                  checked={divisionId === div}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onDivisionChange(e.target.value as Division)
                  }
                  disabled={disabled}
                />
              ))}
            </div>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>
              Year
            </Form.Label>
            <div className="d-flex flex-wrap gap-3">
              {NCC_YEARS.map((year) => (
                <Form.Check
                  key={year}
                  type="radio"
                  id={`year-${year}`}
                  name="nccYear"
                  label={year.replace(' Year', '')}
                  value={year}
                  checked={nccYear === year}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onYearChange(e.target.value as NccYear)
                  }
                  disabled={disabled}
                />
              ))}
            </div>
          </Form.Group>
        </Col>
      </Row>
    );
  }

  return (
    <Row className="g-3">
      <Col md={6}>
        <Form.Group>
          <Form.Label>
            Division
          </Form.Label>
          <Form.Select
            value={divisionId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              onDivisionChange(e.target.value as Division | '')
            }
            disabled={disabled}
            required={false}
          >
            <option value="">All Divisions</option>
            {DIVISIONS.map((div) => (
              <option key={div} value={div}>
                {DIVISION_LABELS[div]} ({div})
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group>
          <Form.Label>
            Year
          </Form.Label>
          <Form.Select
            value={nccYear}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              onYearChange(e.target.value as NccYear | '')
            }
            disabled={disabled}
            required={false}
          >
            <option value="">All Years</option>
            {NCC_YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </Col>
    </Row>
  );
}
