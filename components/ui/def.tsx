import type { ReactNode } from "react";

export function Def({
  label,
  children,
  muted = false,
}: {
  label: string;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="def">
      <span className="def__label">{label}</span>
      <span className={`def__value${muted ? " def__value--muted" : ""}`}>
        {children}
      </span>
    </div>
  );
}
