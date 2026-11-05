import type { CSSProperties, ReactNode } from "react";

export function Skeleton({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={style}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

export function SkeletonList({
  count = 3,
  height = 28,
  gap = 8,
}: {
  count?: number;
  height?: number;
  gap?: number;
}) {
  return (
    <ul
      className="skeleton-list"
      aria-busy="true"
      aria-label="Načítám"
      style={{ gap }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="skeleton" style={{ height }} />
      ))}
    </ul>
  );
}