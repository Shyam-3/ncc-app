import React from 'react';

interface FormFieldProps {
  label: string;
  type?: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
}

export default function FormField({
  label,
  type = 'text',
  name,
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  rows,
}: FormFieldProps) {
  const inputId = `field_${name}`;
  const isTextarea = type === 'textarea';

  return (
    <div className="form-group">
      <label htmlFor={inputId}>
        {label}
        {required && <span className="required">*</span>}
      </label>
      {isTextarea ? (
        <textarea
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows || 3}
          className={error ? 'error' : ''}
        />
      ) : (
        <input
          id={inputId}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={error ? 'error' : ''}
        />
      )}
      {error && <span className="error-message">{error}</span>}
    </div>
  );
}
