import { ReactNode } from "react";

export type CardProps = {
  children: ReactNode;
  size?: "standard" | "compact";
  className?: string;
};

const SIZE_CLASSES: Record<CardProps["size"], string> = {
  standard: "rounded-[16px] border border-white/10 bg-zinc-900/50 shadow-[var(--shadow)] p-6",
  compact: "rounded-[16px] border border-white/10 bg-zinc-900/50 shadow-[var(--shadow)] p-4",
};

export function Card({ children, size = "standard", className }: CardProps) {
  return (
    <div className={`${SIZE_CLASSES[size]} ${className ?? ""}`}>{children}</div>
  );
}

export default Card;
