'use client';

const Input = ({
  label,
  id,
  error,
  className = '',
  ...rest
}) => (
  <div className="form-group">
    {label && (
      <label htmlFor={id} className="form-label">
        {label}
      </label>
    )}
    <input
      id={id}
      className={`form-input ${error ? 'form-input--error' : ''} ${className}`}
      {...rest}
    />
    {error && <span className="form-error">{error}</span>}
  </div>
);

export default Input;
