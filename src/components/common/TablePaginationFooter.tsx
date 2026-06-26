import React from 'react';
import { Form } from 'react-bootstrap';
import './TablePaginationFooter.css';

const DEFAULT_ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

interface TablePaginationFooterProps {
  totalItems: number;
  currentPage: number;
  rowsPerPage: number;
  onRowsPerPageChange: (value: number) => void;
  onFirstPage: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onLastPage: () => void;
  rowsPerPageOptions?: number[];
}

const TablePaginationFooter: React.FC<TablePaginationFooterProps> = ({
  totalItems,
  currentPage,
  rowsPerPage,
  onRowsPerPageChange,
  onFirstPage,
  onPreviousPage,
  onNextPage,
  onLastPage,
  rowsPerPageOptions = DEFAULT_ROWS_PER_PAGE_OPTIONS,
}) => {
  if (totalItems === 0) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);

  return (
    <div className="role-pagination-footer">
      <div className="role-pagination-rpp">
        <span className="text-muted small me-2">Rows per page:</span>
        <Form.Select
          size="sm"
          value={rowsPerPage}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onRowsPerPageChange(Number(e.target.value))}
          className="role-rpp-select"
        >
          {rowsPerPageOptions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Form.Select>
      </div>

      <span className="text-muted small role-pagination-range">
        {startIndex + 1}–{endIndex} of {totalItems}
      </span>

      <div className="role-pagination-nav">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary role-page-btn"
          disabled={safePage === 1}
          onClick={onFirstPage}
          title="First page"
        >
          <i className="bi bi-chevron-double-left"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary role-page-btn"
          disabled={safePage === 1}
          onClick={onPreviousPage}
          title="Previous page"
        >
          <i className="bi bi-chevron-left"></i>
        </button>
        <span className="text-muted small mx-2">
          Page {safePage} of {totalPages}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary role-page-btn"
          disabled={safePage === totalPages}
          onClick={onNextPage}
          title="Next page"
        >
          <i className="bi bi-chevron-right"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary role-page-btn"
          disabled={safePage === totalPages}
          onClick={onLastPage}
          title="Last page"
        >
          <i className="bi bi-chevron-double-right"></i>
        </button>
      </div>
    </div>
  );
};

export default TablePaginationFooter;