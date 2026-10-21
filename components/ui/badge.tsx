import type { ReactNode } from "react";

const VARIANTS = {
  neutral: "badge--neutral",
  info: "badge--info",
  success: "badge--success",
  warning: "badge--warning",
  danger: "badge--danger",
} as const;

export type BadgeVariant = keyof typeof VARIANTS;

export function Badge({
  variant = "neutral",
  dot = true,
  children,
}: {
  variant?: BadgeVariant;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={`badge ${VARIANTS[variant]}`}>
      {dot ? <span className="badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
