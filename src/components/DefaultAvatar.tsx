import React from 'react';

interface DefaultAvatarProps {
  /** Size in pixels. Defaults to 80. */
  size?: number;
  /** Additional CSS class names. */
  className?: string;
}

/**
 * A "bitten donut" default avatar displayed when a user hasn't uploaded a photo.
 * Renders as an inline SVG so it works without any external dependencies.
 */
const DefaultAvatar: React.FC<DefaultAvatarProps> = ({ size = 80, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Default profile avatar"
      role="img"
    >
      {/* Background circle */}
      <circle cx="60" cy="60" r="60" fill="#E8EAF6" />

      {/* Head */}
      <circle cx="60" cy="45" r="22" fill="#9FA8DA" />

      {/* Body/shoulders */}
      <ellipse cx="60" cy="100" rx="35" ry="22" fill="#9FA8DA" />

      {/* Bite mark (the "bitten" part of the donut) */}
      <circle cx="95" cy="25" r="18" fill="#E8EAF6" />
    </svg>
  );
};

export default DefaultAvatar;
