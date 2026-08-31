import React from "react";
import {
  validatePassword,
  PASSWORD_POLICY,
} from "@/shared/utils/passwordPolicy";

interface PasswordStrengthProps {
  password: string;
  /** Only show the indicator after the user has started typing */
  show?: boolean;
}

/**
 * Live password strength indicator that shows check/cross marks for each requirement.
 * Place this directly below a password input field.
 */
const PasswordStrength: React.FC<PasswordStrengthProps> = ({
  password,
  show = true,
}) => {
  if (!show || !password) return null;

  const { checks } = validatePassword(password);

  const requirements = [
    {
      label: `${PASSWORD_POLICY.minLength}+ characters`,
      met: checks.minLength,
    },
    { label: "Uppercase letter (A–Z)", met: checks.hasUppercase },
    { label: "Lowercase letter (a–z)", met: checks.hasLowercase },
    { label: "Number (0–9)", met: checks.hasNumeric },
    { label: "Special character (!@#$…)", met: checks.hasSpecial },
  ];

  // Count how many are met for the strength bar
  const metCount = requirements.filter((r) => r.met).length;
  const strength = metCount / requirements.length;

  const barColor =
    strength <= 0.4
      ? "#dc3545" // red
      : strength <= 0.6
        ? "#fd7e14" // orange
        : strength <= 0.8
          ? "#ffc107" // yellow
          : "#198754"; // green

  return (
    <div className="mt-2 mb-1">
      {/* Strength bar */}
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: "#e9ecef",
          overflow: "hidden",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${strength * 100}%`,
            background: barColor,
            borderRadius: 2,
            transition: "width 0.3s ease, background 0.3s ease",
          }}
        />
      </div>

      {/* Checklist */}
      <div style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>
        {requirements.map((req) => (
          <div
            key={req.label}
            style={{ color: req.met ? "#198754" : "#6c757d" }}
          >
            <i
              className={`bi ${req.met ? "bi-check-circle-fill" : "bi-circle"} me-1`}
            />
            {req.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrength;
