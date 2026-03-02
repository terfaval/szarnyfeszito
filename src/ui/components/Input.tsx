import { InputHTMLAttributes, ReactNode } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
  trailing?: ReactNode;
};

const BASE_CLASSES =
  "bg-transparent text-white border border-zinc-800 rounded-[14px] px-4 py-2 text-sm focus:border-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

export function Input({
  label,
  helperText,
  trailing,
  className,
  ...props
}: InputProps) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
      {label && <span>{label}</span>}
      <div className="relative flex items-stretch gap-2">
        <input className={`${BASE_CLASSES} ${className ?? ""}`} {...props} />
        {trailing ? <span className="flex items-center">{trailing}</span> : null}
      </div>
      {helperText && <span className="text-[10px] text-zinc-500">{helperText}</span>}
    </label>
  );
}

export default Input;
