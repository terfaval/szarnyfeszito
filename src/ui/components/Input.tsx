import { InputHTMLAttributes, ReactNode } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
  trailing?: ReactNode;
};
export function Input({
  label,
  helperText,
  trailing,
  className,
  ...props
}: InputProps) {
  return (
    <label className="form-field">
      {label && <span className="form-field__label">{label}</span>}
      <div className="form-field__row">
        <input className={`input ${className ?? ""}`} {...props} />
        {trailing ? <span className="flex items-center">{trailing}</span> : null}
      </div>
      {helperText && <span className="form-helper">{helperText}</span>}
    </label>
  );
}

export default Input;
