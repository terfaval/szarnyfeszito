import { ReactNode } from "react";

type CardSize = "standard" | "compact";

export type CardProps = {
  children: ReactNode;
  size?: CardSize;
  className?: string;
};

const SIZE_CLASSES: Record<CardSize, string> = {
  standard: "admin-card",
  compact: "admin-card admin-card--compact",
};

export function Card({ children, size = "standard", className }: CardProps) {
  return (
    <div className={`${SIZE_CLASSES[size]} ${className ?? ""}`}>{children}</div>
  );
}

export default Card;
