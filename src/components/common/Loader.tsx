import { Spinner } from "react-bootstrap";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

const spinnerPx: Record<NonNullable<LoaderProps["size"]>, string> = {
  sm: "1.5rem",
  md: "3rem",
  lg: "4rem",
};

export function Loader({ size = "md", fullScreen = false }: LoaderProps) {
  const spinner = (
    <Spinner
      animation="border"
      role="status"
      style={{ width: spinnerPx[size], height: spinnerPx[size] }}
    >
      <span className="visually-hidden">Loading...</span>
    </Spinner>
  );

  if (fullScreen) {
    return (
      <div
        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75"
        style={{ zIndex: 1050 }}
      >
        {spinner}
      </div>
    );
  }

  return spinner;
}
