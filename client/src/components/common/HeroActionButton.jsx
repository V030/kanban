import React from 'react';

export default function HeroActionButton({
  icon,
  label,
  className = '',
  onClick,
  disabled = false,
  variant = 'primary', // primary | secondary | ghost
  title,
}) {
  const base = `hero-action-button btn btn-${variant}`;

  return (
    <button
      type="button"
      className={`${base} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title || label}
    >
      {icon && <span className="hero-action-icon" aria-hidden="true">{icon}</span>}
      <span className="hero-action-label">{label}</span>
    </button>
  );
}
