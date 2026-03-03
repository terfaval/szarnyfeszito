import { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "accent";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "btn--primary",
  secondary: "btn--secondary",
  ghost: "btn--ghost",
  accent: "btn--accent",
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
      className={`btn ${VARIANT_CLASSES[variant]} ${className ?? ""}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
