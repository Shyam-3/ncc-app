import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 px-3 text-center">
      {icon && <div className="mb-3 fs-1">{icon}</div>}
      <h3 className="fs-5 fw-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-muted small mb-3" style={{ maxWidth: "24rem" }}>
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
