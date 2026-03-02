import { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "accent";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "border-white/20 bg-white/10 text-white hover:border-white hover:bg-white/20",
  secondary: "border-white/20 bg-transparent text-white hover:border-white/80",
  ghost: "border-transparent bg-zinc-900/30 text-white hover:bg-zinc-900/50",
  accent: "border-amber-400/60 bg-amber-500/10 text-amber-200 hover:border-amber-300 hover:bg-amber-500/20",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[14px] border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className ?? ""}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
